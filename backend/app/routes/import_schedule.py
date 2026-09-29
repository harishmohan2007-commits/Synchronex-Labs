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




def _infer_discipline(name: str) -> str:
    low = str(name or '').lower()
    if re.search(r'spool|piping|pipeline|pipe|weld|ndt|erection', low):
        return 'Piping'
    if re.search(r'pump|mechanical|equipment|commissioning|alignment', low):
        return 'Mechanical'
    if re.search(r'cable|electrical|termination|continuity', low):
        return 'Electrical'
    if re.search(r'instrument|calibration|tubing', low):
        return 'Instrumentation'
    if re.search(r'civil|excavat|concrete|foundation|backfill', low):
        return 'Civil'
    return 'Other'


def _resolve_or_create_project(sb, parsed: dict, project_id: str | None, filename: str):
    if project_id:
        result = sb.table('projects').select('*').eq('id', project_id).limit(1).execute()
        rows = result.data or []
        if not rows:
            raise HTTPException(404, 'Project was not found.')
        return rows[0], False

    meta = parsed.get('project') or {}
    name = meta.get('name') or meta.get('title') or Path(filename).stem or 'Imported project'
    code = _project_code(name)
    existing = sb.table('projects').select('*').eq('project_code', code).limit(1).execute().data or []
    if existing:
        return existing[0], False

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
    created = sb.table('projects').insert(row).execute().data or []
    if not created:
        raise RuntimeError('Supabase did not return the created project.')
    return created[0], True


@router.post('/schedule')
async def import_schedule(file: UploadFile = File(...), project_id: str | None = Form(default=None)):
    filename = file.filename or ''
    if not filename:
        raise HTTPException(400, 'No schedule filename was provided.')

    payload = await file.read()
    if not payload:
        raise HTTPException(400, 'The uploaded schedule file is empty.')

    # Parse completely in memory first. The source file itself is never written to Supabase.
    try:
        parsed = parse_schedule_file(payload, filename)
    except Exception as exc:
        raise HTTPException(400, f'Schedule parsing failed: {exc}') from exc

    stage = 'database connection'
    project = None
    created_project = False
    try:
        sb = get_supabase()
        stage = 'project lookup'
        project, created_project = _resolve_or_create_project(sb, parsed, project_id, filename)
        pid = project['id']

        meta = parsed.get('project') or {}
        tasks = parsed.get('tasks') or []
        if not tasks:
            raise ValueError('The schedule contains no tasks.')
        if any(t.get('uid') is None for t in tasks):
            raise ValueError('The schedule contains a task without a source UID.')

        summaries = sorted(
            [t for t in tasks if t.get('is_summary')],
            key=lambda t: (t.get('outline_level') or 0, t.get('outline_number') or ''),
        )
        if not summaries:
            raise ValueError('The schedule contains no summary/WBS nodes.')

        # Validate the hierarchy before touching the active schedule.
        wbs_rows = []
        known_wbs = set()
        for t in summaries:
            outline = t.get('outline_number') or str(t['uid'])
            parts = outline.split('.')
            parent_outline = '.'.join(parts[:-1]) or None
            if parent_outline and parent_outline not in known_wbs:
                raise ValueError(f'Missing WBS parent {parent_outline} for {t["name"]}.')
            level = int(t.get('outline_level') or len(parts))
            if not 1 <= level <= 6:
                raise ValueError(f'WBS level {level} is outside Synchronex L1-L6 for {t["name"]}.')
            known_wbs.add(outline)
            wbs_rows.append({
                'project_id': pid,
                'parent_outline': parent_outline,
                'wbs_code': outline,
                'name': t['name'],
                'level': level,
                'description': None,
                'source_uid': t['uid'],
                'outline_number': outline,
            })

        activity_rows = []
        for t in tasks:
            outline = t.get('outline_number') or str(t['uid'])
            parts = outline.split('.')
            parent_outline = None
            for cut in range(len(parts) - 1, 0, -1):
                candidate = '.'.join(parts[:cut])
                if candidate in known_wbs:
                    parent_outline = candidate
                    break
            if parent_outline is None and outline in known_wbs:
                parent_outline = outline
            if parent_outline is None:
                raise ValueError(f'No WBS node could be resolved for task {t["uid"]} ({t["name"]}).')
            pct = float(t.get('percent_complete') or 0)
            if not 0 <= pct <= 100:
                raise ValueError(f'Invalid percent complete {pct} for task {t["uid"]}.')
            activity_rows.append({
                'project_id': pid,
                'wbs_node_id': None,
                'activity_code': f"{Path(filename).stem[:8].upper()}-{t['uid']}",
                'name': t['name'],
                'discipline': _infer_discipline(t['name']) if not t.get('is_summary') else None,
                'planned_start': (t.get('start') or '')[:10] or None,
                'planned_finish': (t.get('finish') or '')[:10] or None,
                'actual_start': None,
                'actual_finish': None,
                'planned_progress': pct,
                'actual_progress': 0,
                'status': 'not_started' if pct <= 0 else ('completed' if pct >= 100 else 'in_progress'),
                'quantity': None,
                # IMPORTANT: live schema uses quantity_unit, not unit.
                'quantity_unit': None,
                'source_uid': t['uid'],
                'outline_number': t.get('outline_number'),
                'outline_level': t.get('outline_level'),
                'duration_hours': t.get('duration_hours'),
                'is_summary': bool(t.get('is_summary')),
                'is_milestone': bool(t.get('is_milestone')),
                'calendar_uid': t.get('calendar_uid'),
            })

        crows = [
            {'project_id': pid, 'uid': int(c['uid']), 'name': c.get('name') or f'Calendar {c["uid"]}'}
            for c in parsed.get('calendars', []) if c.get('uid') is not None
        ]
        rrows = [
            {'project_id': pid, 'uid': int(r['uid']), 'name': r.get('name') or f'Resource {r["uid"]}',
             'resource_type': r.get('resource_type'), 'calendar_uid': r.get('calendar_uid')}
            for r in parsed.get('resources', []) if r.get('uid') is not None
        ]

        # Only after full validation do we replace the schedule layer.
        stage = 'clearing previous schedule'
        for table in ('schedule_assignments', 'schedule_dependencies', 'schedule_resources', 'schedule_calendars', 'activities', 'wbs_nodes'):
            sb.table(table).delete().eq('project_id', pid).execute()

        stage = 'writing project metadata'
        root = next((t for t in tasks if t.get('outline_level') == 1), None)
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

        stage = 'writing WBS'
        wbs_by_outline = {}
        for row in wbs_rows:
            parent_id = wbs_by_outline.get(row.pop('parent_outline'))
            row['parent_id'] = parent_id
            ins = sb.table('wbs_nodes').insert(row).execute().data or []
            if not ins:
                raise RuntimeError(f'Supabase returned no WBS row for {row["name"]}.')
            wbs_by_outline[row['outline_number']] = ins[0]['id']

        stage = 'writing activities'
        for row, t in zip(activity_rows, tasks):
            outline = t.get('outline_number') or str(t['uid'])
            parts = outline.split('.')
            parent_outline = outline if outline in wbs_by_outline else None
            if parent_outline is None:
                for cut in range(len(parts) - 1, 0, -1):
                    candidate = '.'.join(parts[:cut])
                    if candidate in wbs_by_outline:
                        parent_outline = candidate
                        break
            row['wbs_node_id'] = wbs_by_outline[parent_outline]
        inserted = sb.table('activities').insert(activity_rows).execute().data or []
        if len(inserted) != len(activity_rows):
            raise RuntimeError(f'Expected {len(activity_rows)} activities but Supabase returned {len(inserted)}.')
        by_uid = {a['source_uid']: a['id'] for a in inserted}

        stage = 'writing calendars'
        if crows:
            sb.table('schedule_calendars').insert(crows).execute()

        stage = 'writing resources'
        inserted_resources = sb.table('schedule_resources').insert(rrows).execute().data if rrows else []
        rmap = {r['uid']: r['id'] for r in inserted_resources}

        stage = 'writing dependencies'
        deps = []
        for t in tasks:
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

        stage = 'writing assignments'
        assignments = []
        for a in parsed.get('assignments', []):
            if a.get('task_uid') not in by_uid:
                continue
            assignments.append({
                'project_id': pid,
                'activity_id': by_uid[a['task_uid']],
                'resource_id': rmap.get(a.get('resource_uid')),
                'source_assignment_uid': a.get('uid'),
                'source_resource_uid': a.get('resource_uid'),
                'units': a.get('units'),
            })
        if assignments:
            sb.table('schedule_assignments').insert(assignments).execute()

        stage = 'recording import'
        import_row = {
            'project_id': pid,
            'source_format': parsed['format'],
            'source_file_name': filename,
            'status': 'completed',
            'task_count': len(tasks),
            'summary_task_count': sum(bool(t.get('is_summary')) for t in tasks),
            'activity_count': len(inserted),
            'dependency_count': len(deps),
            'calendar_count': len(crows),
            'resource_count': len(rrows),
            'assignment_count': len(assignments),
        }
        sb.table('schedule_imports').insert(import_row).execute()

        return {
            'status': 'imported',
            'source': parsed['format'],
            'project_id': pid,
            'project': update,
            'counts': {
                'tasks': len(tasks),
                'summary_tasks': sum(bool(t.get('is_summary')) for t in tasks),
                'activities': len(inserted),
                'dependencies': len(deps),
                'calendars': len(crows),
                'resources': len(rrows),
                'assignments': len(assignments),
            },
            'metadata': meta,
        }
    except HTTPException:
        raise
    except Exception as exc:
        # Never hide the actual Supabase/PostgREST error behind a bare HTTP 500.
        detail = f'Schedule import failed during {stage}: {type(exc).__name__}: {exc}'
        raise HTTPException(500, detail) from exc
