from __future__ import annotations
from pathlib import Path
import re
from datetime import datetime, timezone
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from ..services.schedule_import import parse_schedule_file
from ..services.supabase_service import get_supabase

router = APIRouter(prefix='/api/import', tags=['schedule import'])


def _project_code(name: str) -> str:
    base = re.sub(r'[^A-Za-z0-9]+', '-', name.strip()).strip('-').upper() or 'SYNCHRONEX-PROJECT'
    return base[:80]


def _discipline(name: str) -> str:
    low = (name or '').lower()
    if re.search(r'spool|pipe|piping|weld|ndt|pipeline|erection', low): return 'Piping'
    if re.search(r'pump|mechanical|commissioning|equipment|alignment', low): return 'Mechanical'
    if re.search(r'civil|foundation|concrete|excavat|backfill', low): return 'Civil'
    if re.search(r'electrical|cable|termination', low): return 'Electrical'
    if re.search(r'instrument|calibrat|tubing', low): return 'Instrumentation'
    if re.search(r'safety|hse|inspection', low): return 'HSE'
    return 'Unassigned'




def _validate_parsed_schedule(parsed: dict) -> None:
    tasks = parsed.get('tasks') or []
    if not tasks:
        raise ValueError('The schedule contains no tasks.')
    uids = [t.get('uid') for t in tasks]
    if any(uid is None for uid in uids):
        raise ValueError('The schedule contains a task without a source UID.')
    if len(set(uids)) != len(uids):
        raise ValueError('The schedule contains duplicate task UIDs.')
    outlines = [t.get('outline_number') for t in tasks if t.get('outline_number')]
    if len(outlines) != len(set(outlines)):
        raise ValueError('The schedule contains duplicate outline numbers.')
    task_uids = set(uids)
    for task in tasks:
        start = (task.get('start') or '')[:10]
        finish = (task.get('finish') or '')[:10]
        if start and finish and finish < start:
            raise ValueError(f"Task {task.get('name') or task.get('uid')} has a finish date before its start date.")
        for pred in task.get('predecessors') or []:
            if pred.get('predecessor_uid') not in task_uids:
                raise ValueError(f"Task {task.get('uid')} references missing predecessor {pred.get('predecessor_uid')}.")
    summary_count = sum(bool(t.get('is_summary')) for t in tasks)
    if summary_count == len(tasks):
        raise ValueError('The schedule contains no executable activities.')


def _resolve_or_create_project(sb, parsed: dict, project_id: str | None, filename: str):
    if project_id:
        project = sb.table('projects').select('*').eq('id', project_id).single().execute().data
        if not project:
            raise HTTPException(404, 'Project was not found.')
        return project

    meta = parsed.get('project', {})
    name = meta.get('name') or meta.get('title') or Path(filename).stem or 'Imported project'
    code = _project_code(name)
    existing = sb.table('projects').select('*').eq('project_code', code).limit(1).execute().data or []
    if existing:
        return existing[0]
    row = {
        'project_code': code,
        'name': name,
        'manager': meta.get('manager'),
        'planned_start': (meta.get('start') or '')[:10] or None,
        'planned_finish': (meta.get('finish') or '')[:10] or None,
        'status': 'planning',
        'source_format': parsed.get('format'),
        'source_file_name': filename,
    }
    return sb.table('projects').insert(row).execute().data[0]


@router.post('/schedule')
async def import_schedule(file: UploadFile = File(...), project_id: str | None = Form(default=None)):
    filename = file.filename or ''
    payload = await file.read()
    try:
        parsed = parse_schedule_file(payload, filename)
    except Exception as exc:
        raise HTTPException(400, str(exc)) from exc

    _validate_parsed_schedule(parsed)
    sb = get_supabase()
    project = _resolve_or_create_project(sb, parsed, project_id, filename)
    pid = project['id']

    try:
        # Replace only the schedule layer. Execution evidence, review, progress and audit history remain intact.
        for table in ('schedule_assignments', 'schedule_dependencies', 'schedule_resources', 'schedule_calendars', 'activities', 'wbs_nodes'):
            sb.table(table).delete().eq('project_id', pid).execute()

        meta = parsed['project']
        root = next((t for t in parsed['tasks'] if t.get('outline_level') == 1), None)
        update = {
            'name': (root or {}).get('name') or meta.get('name') or meta.get('title') or project['name'],
            'manager': meta.get('manager') or project.get('manager'),
            'planned_start': ((root or {}).get('start') or meta.get('start') or '')[:10] or None,
            'planned_finish': ((root or {}).get('finish') or meta.get('finish') or '')[:10] or None,
            'status': 'planning',
            'source_format': parsed.get('format'),
            'source_file_name': filename,
            'source_imported_at': datetime.now(timezone.utc).isoformat(),
        }
        sb.table('projects').update(update).eq('id', pid).execute()

        summaries = sorted(
            [t for t in parsed['tasks'] if t.get('is_summary')],
            key=lambda t: (t.get('outline_level') or 0, t.get('outline_number') or ''),
        )
        wbs_by_outline = {}
        for t in summaries:
            parts = (t.get('outline_number') or '').split('.')
            parent = '.'.join(parts[:-1])
            row = {
                'project_id': pid,
                'parent_id': wbs_by_outline.get(parent),
                'wbs_code': t.get('outline_number') or str(t['uid']),
                'name': t['name'],
                'level': t.get('outline_level') or len(parts),
                'description': None,
                'source_uid': t['uid'],
                'outline_number': t.get('outline_number'),
            }
            ins = sb.table('wbs_nodes').insert(row).execute().data[0]
            wbs_by_outline[t.get('outline_number')] = ins['id']

        activity_rows = []
        for t in parsed['tasks']:
            parts = (t.get('outline_number') or '').split('.')
            parent = None
            for cut in range(len(parts) - 1, 0, -1):
                candidate = '.'.join(parts[:cut])
                if candidate in wbs_by_outline:
                    parent = wbs_by_outline[candidate]
                    break
            if parent is None and t.get('outline_number') in wbs_by_outline:
                parent = wbs_by_outline[t['outline_number']]
            if parent is None:
                raise ValueError(f"No WBS node could be resolved for task {t['uid']} ({t['name']}).")
            pct = float(t.get('percent_complete') or 0)
            activity_rows.append({
                'project_id': pid, 'wbs_node_id': parent,
                'activity_code': f"SYNCHRON-{t['uid']}",
                'name': t['name'], 'discipline': _discipline(t['name']) if not t.get('is_summary') else (_discipline(t['name']) if t.get('name') and _discipline(t['name']) != 'Unassigned' else 'Unassigned'),
                'planned_start': (t.get('start') or '')[:10] or None,
                'planned_finish': (t.get('finish') or '')[:10] or None,
                'actual_start': None, 'actual_finish': None,
                'planned_progress': pct, 'actual_progress': 0,
                'status': 'not_started' if pct <= 0 else ('completed' if pct >= 100 else 'in_progress'),
                'quantity': None, 'quantity_unit': None,
                'source_uid': t['uid'], 'outline_number': t.get('outline_number'),
                'outline_level': t.get('outline_level'), 'duration_hours': t.get('duration_hours'),
                'is_summary': bool(t.get('is_summary')), 'is_milestone': bool(t.get('is_milestone')),
                'calendar_uid': t.get('calendar_uid'),
            })
        inserted = sb.table('activities').insert(activity_rows).execute().data
        by_uid = {a['source_uid']: a['id'] for a in inserted}

        crows = [dict(c, project_id=pid) for c in parsed.get('calendars', []) if c.get('uid') is not None]
        if crows:
            sb.table('schedule_calendars').insert(crows).execute()
        rrows = [dict(r, project_id=pid) for r in parsed.get('resources', []) if r.get('uid') is not None]
        inserted_resources = sb.table('schedule_resources').insert(rrows).execute().data if rrows else []
        rmap = {r['uid']: r for r in inserted_resources}

        deps = []
        for t in parsed['tasks']:
            for pred in t.get('predecessors', []):
                if pred.get('predecessor_uid') in by_uid and t['uid'] in by_uid:
                    deps.append({
                        'project_id': pid,
                        'predecessor_activity_id': by_uid[pred['predecessor_uid']],
                        'successor_activity_id': by_uid[t['uid']],
                        'dependency_type': pred.get('type', 1),
                        'lag_minutes': pred.get('lag', 0),
                    })
        if deps:
            sb.table('schedule_dependencies').insert(deps).execute()

        assignments = []
        for a in parsed.get('assignments', []):
            if a.get('task_uid') not in by_uid:
                continue
            r = rmap.get(a.get('resource_uid'))
            assignments.append({
                'project_id': pid, 'activity_id': by_uid[a['task_uid']],
                'resource_id': r.get('id') if r else None,
                'source_assignment_uid': a.get('uid'),
                'source_resource_uid': a.get('resource_uid'), 'units': a.get('units'),
            })
        if assignments:
            sb.table('schedule_assignments').insert(assignments).execute()

        import_row = {
            'project_id': pid, 'source_format': parsed['format'], 'source_file_name': filename,
            'status': 'completed', 'task_count': len(parsed['tasks']),
            'summary_task_count': sum(bool(t.get('is_summary')) for t in parsed['tasks']),
            'activity_count': len(inserted), 'dependency_count': len(deps),
            'calendar_count': len(crows), 'resource_count': len(rrows), 'assignment_count': len(assignments),
        }
        sb.table('schedule_imports').insert(import_row).execute()

        return {
            'status': 'imported', 'source': parsed['format'], 'project_id': pid,
            'project': update,
            'counts': {
                'tasks': len(parsed['tasks']),
                'summary_tasks': sum(bool(t.get('is_summary')) for t in parsed['tasks']),
                'activities': len(inserted), 'dependencies': len(deps),
                'calendars': len(crows), 'resources': len(rrows), 'assignments': len(assignments),
            },
            'metadata': meta,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f'Schedule import failed while writing to Supabase: {exc}') from exc
