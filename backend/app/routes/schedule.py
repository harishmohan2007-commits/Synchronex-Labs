from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
from ..services.supabase_service import get_supabase

router = APIRouter(prefix='/api', tags=['schedule'])


def _project_id(sb, project_id=None):
    if project_id:
        return project_id
    r = sb.table('projects').select('id').order('created_at').limit(1).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail='No Synchronex project exists in Supabase.')
    return r.data[0]['id']


@router.get('/projects/current')
def current_project(project_id: str | None = Query(default=None)):
    sb = get_supabase(); pid = _project_id(sb, project_id)
    r = sb.table('projects').select('*').eq('id', pid).single().execute()
    return r.data


@router.get('/projects/{project_id}/activities')
def activities(project_id: str):
    sb = get_supabase()
    return sb.table('activities').select('*').eq('project_id', project_id).order('outline_number').execute().data or []


@router.get('/projects/{project_id}/bootstrap')
def bootstrap(project_id: str):
    sb = get_supabase()
    project = sb.table('projects').select('*').eq('id', project_id).single().execute().data
    if not project:
        raise HTTPException(404, 'Project not found.')
    def q(table):
        return sb.table(table).select('*').eq('project_id', project_id).execute().data or []
    activities_rows = q('activities')
    events = q('execution_events')
    matches = [m for m in sb.table('activity_matches').select('*').in_('execution_event_id', [e['id'] for e in events]).execute().data or []] if events else []
    reviews = [r for r in sb.table('review_queue').select('*').in_('execution_event_id', [e['id'] for e in events]).execute().data or []] if events else []
    trace = q('audit_logs')
    settings_rows = q('workspace_settings')
    validated_actuals = [a for a in activities_rows if a.get('actual_start') or a.get('actual_finish') or (a.get('actual_progress') or 0) > 0]
    return {
        'project': project, 'activities': activities_rows, 'events': events, 'matches': matches,
        'reviews': reviews, 'trace': trace,
        'calendars': q('schedule_calendars'), 'resources': q('schedule_resources'),
        'dependencies': q('schedule_dependencies'), 'assignments': q('schedule_assignments'),
        'wbs': q('wbs_nodes'),
        'analytics': {
            'activity_count': len(activities_rows), 'execution_event_count': len(events),
            'review_count': len([r for r in reviews if r.get('status') == 'pending']),
            'validated_actual_count': len(validated_actuals),
        },
        'settings': settings_rows[0] if settings_rows else None,
    }
