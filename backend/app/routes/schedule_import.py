from __future__ import annotations

from pathlib import Path
from typing import Any
import csv
import io
import os
import re
import tempfile
import xml.etree.ElementTree as ET

from .projectlibre_pod import parse_projectlibre_pod


def _date(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    text = text.replace('T', ' ')
    return text[:10] if re.match(r'^\d{4}-\d{2}-\d{2}', text) else None


def _num(value: Any, default: float | None = None) -> float | None:
    try:
        return float(str(value).strip()) if value not in (None, '') else default
    except (TypeError, ValueError):
        return default


def _int(value: Any, default: int | None = None) -> int | None:
    try:
        return int(float(str(value).strip())) if value not in (None, '') else default
    except (TypeError, ValueError):
        return default


def parse_mspdi_xml(data: bytes, filename: str) -> dict:
    root = ET.fromstring(data)

    def local(tag: str) -> str:
        return tag.rsplit('}', 1)[-1]

    def child(el: ET.Element | None, name: str):
        if el is None:
            return None
        for x in list(el):
            if local(x.tag) == name:
                return x
        return None

    def text(el: ET.Element | None, name: str, default=None):
        x = child(el, name)
        return x.text if x is not None and x.text is not None else default

    def iso(v):
        return v

    project = {
        'name': text(root, 'Name'), 'title': text(root, 'Title'), 'manager': text(root, 'Manager'),
        'start': iso(text(root, 'StartDate')), 'finish': iso(text(root, 'FinishDate')),
    }
    tasks_el = child(root, 'Tasks')
    tasks: list[dict] = []
    raw_tasks = []
    if tasks_el is not None:
        raw_tasks = [x for x in list(tasks_el) if local(x.tag) == 'Task']
    for t in raw_tasks:
        duration = text(t, 'Duration') or ''
        m = re.fullmatch(r'PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?', duration)
        hours = round(float(m.group(1) or 0) + float(m.group(2) or 0)/60 + float(m.group(3) or 0)/3600, 4) if m else None
        tasks.append({
            'uid': _int(text(t, 'UID')), 'outline_number': text(t, 'OutlineNumber'), 'outline_level': _int(text(t, 'OutlineLevel')),
            'name': text(t, 'Name', ''), 'start': iso(text(t, 'Start')), 'finish': iso(text(t, 'Finish')),
            'duration_hours': hours, 'percent_complete': _num(text(t, 'PercentComplete'), 0),
            'is_summary': str(text(t, 'Summary', '0')).lower() in {'1','true'},
            'is_milestone': str(text(t, 'Milestone', '0')).lower() in {'1','true'},
            'calendar_uid': _int(text(t, 'CalendarUID')), 'predecessors': [],
        })
    for raw, task in zip(raw_tasks, tasks):
        for link in [x for x in list(raw) if local(x.tag) == 'PredecessorLink']:
            uid = _int(text(link, 'PredecessorUID'))
            if uid is not None:
                task['predecessors'].append({'predecessor_uid': uid, 'type': _int(text(link, 'Type'), 1), 'lag': _int(text(link, 'LinkLag'), 0)})

    calendars = []
    ce = child(root, 'Calendars')
    if ce is not None:
        for c in list(ce):
            if local(c.tag) == 'Calendar': calendars.append({'uid': _int(text(c,'UID')), 'name': text(c,'Name','')})
    resources = []
    relem = child(root, 'Resources')
    if relem is not None:
        for r in list(relem):
            if local(r.tag) == 'Resource':
                resources.append({'uid': _int(text(r,'UID')), 'name': text(r,'Name',''), 'resource_type': _int(text(r,'Type')), 'calendar_uid': _int(text(r,'CalendarUID'))})
    assignments = []
    ae = child(root, 'Assignments')
    if ae is not None:
        for a in list(ae):
            if local(a.tag) == 'Assignment':
                assignments.append({'uid': _int(text(a,'UID')), 'task_uid': _int(text(a,'TaskUID')), 'resource_uid': _int(text(a,'ResourceUID')), 'units': _num(text(a,'Units'),1)})
    return {'format':'Microsoft Project MSPDI XML', 'filename':filename, 'project':project, 'tasks':tasks, 'calendars':calendars, 'resources':resources, 'assignments':assignments}


def parse_primavera_xer(data: bytes, filename: str) -> dict:
    text = data.decode('utf-8-sig', errors='replace')
    rows: dict[str, list[dict[str,str]]] = {}
    current = None
    for raw in io.StringIO(text):
        raw = raw.rstrip('\r\n')
        if not raw: continue
        parts = raw.split('\t')
        if parts[0] == '%T':
            current = parts[1] if len(parts) > 1 else None
            rows[current] = []
        elif parts[0] == '%F' and current:
            headers = parts[1:]
            rows[current + '.__headers__'] = headers
        elif parts[0] == '%R' and current:
            headers = rows.get(current + '.__headers__', [])
            vals = parts[1:]
            rows[current].append({h: vals[i] if i < len(vals) else '' for i,h in enumerate(headers)})

    proj = (rows.get('PROJECT') or [{}])[0]
    project = {'name': proj.get('proj_short_name') or proj.get('proj_name'), 'title': proj.get('proj_name'), 'manager': None,
               'start': proj.get('plan_start_date'), 'finish': proj.get('plan_end_date')}
    wbs = {r.get('wbs_id'): r for r in rows.get('PROJWBS', []) if r.get('wbs_id')}
    task_rows = rows.get('TASK', [])
    task_id_to_uid: dict[str,int] = {}
    tasks=[]
    for idx, r in enumerate(task_rows, start=1):
        uid = idx
        task_id_to_uid[r.get('task_id','')] = uid
        wbs_row = wbs.get(r.get('wbs_id'), {})
        parent = wbs_row.get('parent_wbs_id')
        outline = wbs_row.get('wbs_short_name') or str(idx)
        level = _int(r.get('clndr_id'), None)  # replaced below; P6 has no outline level in TASK
        is_summary = str(r.get('task_type','')).upper() in {'WBS SUMMARY','LOE'} or r.get('task_type') == 'TT_WBS'
        tasks.append({'uid':uid, 'source_id':r.get('task_id'), 'outline_number':outline, 'outline_level':None, 'name':r.get('task_name',''),
                      'start':r.get('target_start_date'), 'finish':r.get('target_end_date'), 'duration_hours':_num(r.get('target_drtn_hr_cnt')),
                      'percent_complete':_num(r.get('phys_complete_pct'),0), 'is_summary':is_summary, 'is_milestone':r.get('task_type') in {'TT_FinMile','TT_Mile'},
                      'calendar_uid':_int(r.get('clndr_id')), 'predecessors':[]})
    # Build stable WBS-derived levels and outlines where possible.
    wbs_children={}
    for w in wbs.values(): wbs_children.setdefault(w.get('parent_wbs_id') or None, []).append(w)
    wbs_outline={}
    def walk(parent, prefix=''):
        children=sorted(wbs_children.get(parent,[]), key=lambda x: (_int(x.get('seq_num'),0), x.get('wbs_id','')))
        for i,w in enumerate(children,1):
            code=f'{prefix}.{i}' if prefix else str(i)
            wbs_outline[w.get('wbs_id')]=(code, code.count('.')+1)
            walk(w.get('wbs_id'), code)
    walk(None)
    for task in tasks:
        source=task.get('source_id')
        raw=next((r for r in task_rows if r.get('task_id')==source), {})
        code,level=wbs_outline.get(raw.get('wbs_id'), (task['outline_number'],1))
        task['outline_number']=f'{code}.{task["uid"]}' if code else str(task['uid'])
        task['outline_level']=level+1
    # XER stores WBS separately rather than marking WBS rows as TASK summaries.
    # Materialize those WBS nodes as summary tasks so the normalized model remains
    # identical to the POD/MSPDI path.
    summary_uid = -1
    for wid, w in sorted(wbs.items(), key=lambda kv: wbs_outline.get(kv[0], ('999999', 999))[0]):
        code, level = wbs_outline.get(wid, (str(abs(summary_uid)), 1))
        tasks.append({'uid': summary_uid, 'outline_number': code, 'outline_level': level,
                      'name': w.get('wbs_name') or w.get('wbs_short_name') or code,
                      'start': None, 'finish': None, 'duration_hours': None, 'percent_complete': 0,
                      'is_summary': True, 'is_milestone': False, 'calendar_uid': None, 'predecessors': []})
        summary_uid -= 1

    task_lookup={r.get('task_id'): tasks[i] for i,r in enumerate(task_rows)}
    for pred in rows.get('TASKPRED', []):
        successor=task_lookup.get(pred.get('task_id')); predecessor=task_lookup.get(pred.get('pred_task_id'))
        if successor and predecessor:
            successor['predecessors'].append({'predecessor_uid':predecessor['uid'], 'type':_int(pred.get('pred_type'),1), 'lag':_int(pred.get('lag_hr_cnt'),0) * 60})
    calendars=[{'uid':_int(r.get('clndr_id')), 'name':r.get('clndr_name','')} for r in rows.get('CALENDAR',[]) if r.get('clndr_id')]
    resources=[{'uid':_int(r.get('rsrc_id')), 'name':r.get('rsrc_name',''), 'resource_type':None, 'calendar_uid':_int(r.get('clndr_id'))} for r in rows.get('RSRC',[]) if r.get('rsrc_id')]
    resource_ids={r.get('rsrc_id'): _int(r.get('rsrc_id')) for r in rows.get('RSRC',[]) if r.get('rsrc_id')}
    assignments=[]
    for i,r in enumerate(rows.get('TASKRSRC',[]),1):
        t=task_lookup.get(r.get('task_id'))
        if t:
            assignments.append({'uid':i,'task_uid':t['uid'],'resource_uid':resource_ids.get(r.get('rsrc_id')),'units':_num(r.get('target_qty'),1)})
    return {'format':'Primavera P6 XER', 'filename':filename, 'project':project, 'tasks':tasks, 'calendars':calendars, 'resources':resources, 'assignments':assignments}


def parse_mpp_with_mpxj(data: bytes, filename: str) -> dict:
    try:
        import jpype
        import mpxj  # noqa: F401
        from org.mpxj.reader import UniversalProjectReader
    except Exception as exc:
        raise ValueError('Microsoft Project .mpp support requires the optional mpxj Python package and Java runtime. Install the backend requirements and retry.') from exc
    with tempfile.NamedTemporaryFile(suffix='.mpp', delete=False) as tmp:
        tmp.write(data); path=tmp.name
    started=False
    try:
        if not jpype.isJVMStarted():
            jpype.startJVM(); started=True
        project=UniversalProjectReader().read(path)
        # MPXJ exposes a Java object model. Keep this adapter deliberately conservative.
        props=project.getProjectProperties()
        project_meta={'name':str(project.getName() or ''), 'title':str(project.getName() or ''), 'manager':str(props.getManager() or '') if props else None,
                      'start':str(props.getStartDate()) if props and props.getStartDate() else None, 'finish':str(props.getFinishDate()) if props and props.getFinishDate() else None}
        tasks=[]; task_objects=list(project.getTasks())
        uid_map={}
        for idx,t in enumerate(task_objects,1):
            uid=int(t.getUniqueID() or idx); uid_map[uid]=t
            outline=str(t.getOutlineNumber() or idx)
            tasks.append({'uid':uid,'outline_number':outline,'outline_level':int(t.getOutlineLevel() or outline.count('.')+1),'name':str(t.getName() or ''),
                          'start':str(t.getStart()) if t.getStart() else None,'finish':str(t.getFinish()) if t.getFinish() else None,
                          'duration_hours':float(t.getDuration().getDuration()/3600000) if t.getDuration() else None,
                          'percent_complete':float(t.getPercentageComplete() or 0),'is_summary':bool(t.getSummary()),'is_milestone':bool(t.getMilestone()),
                          'calendar_uid':None,'predecessors':[]})
        by_id={t['uid']:t for t in tasks}
        for t in task_objects:
            cur=by_id.get(int(t.getUniqueID()))
            if not cur: continue
            for rel in list(t.getPredecessors() or []):
                pred=rel.getTargetTask()
                if pred: cur['predecessors'].append({'predecessor_uid':int(pred.getUniqueID()),'type':int(rel.getType().getValue()),'lag':int(rel.getLag().getDuration()/60000) if rel.getLag() else 0})
        return {'format':'Microsoft Project MPP via MPXJ','filename':filename,'project':project_meta,'tasks':tasks,'calendars':[],'resources':[],'assignments':[]}
    finally:
        try: os.unlink(path)
        except OSError: pass
        if started:
            jpype.shutdownJVM()


def parse_schedule_file(data: bytes, filename: str) -> dict:
    ext=Path(filename).suffix.lower()
    if ext=='.pod': return parse_projectlibre_pod(data, filename)
    if ext in {'.xml','.mspdi'}:
        return parse_mspdi_xml(data, filename)
    if ext=='.xer': return parse_primavera_xer(data, filename)
    if ext=='.mpp': return parse_mpp_with_mpxj(data, filename)
    raise ValueError('Unsupported schedule format. Synchronex accepts ProjectLibre .pod, Microsoft Project .mpp/.xml, and Primavera P6 .xer files.')
