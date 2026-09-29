from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.supabase_service import get_supabase

router = APIRouter(prefix='/api/review', tags=['review'])

class Decision(BaseModel):
    reviewer: str = 'planner'
    decision: str
    new_progress: float | None = None
    quantity_completed: float | None = None
    quantity_unit: str | None = None
    actual_date: str | None = None


@router.post('/{review_id}')
def decide(review_id: str, body: Decision):
    if body.decision not in {'approve', 'reject', 'flag'}:
        raise HTTPException(400, 'decision must be approve, reject, or flag')
    sb = get_supabase()
    review = sb.table('review_queue').select('*').eq('id', review_id).single().execute().data
    if not review:
        raise HTTPException(404, 'Review item not found.')
    event = sb.table('execution_events').select('*').eq('id', review['execution_event_id']).single().execute().data
    activity_id = review.get('suggested_activity_id')
    now = datetime.now(timezone.utc).isoformat()

    if body.decision == 'approve':
        if not activity_id:
            raise HTTPException(400, 'This review item has no candidate activity. Flag it as a new activity instead.')
        actual_date = body.actual_date or event.get('event_date')
        activity = sb.table('activities').select('*').eq('id', activity_id).single().execute().data
        if not activity:
            raise HTTPException(404, 'Matched activity not found.')

        progress = body.new_progress
        if progress is None and event.get('unit') == '%' and event.get('quantity') is not None:
            progress = float(event.get('quantity'))
        if progress is not None and not 0 <= progress <= 100:
            raise HTTPException(400, 'new_progress must be between 0 and 100')
        update = {}
        if event.get('extracted_action') == 'start' and actual_date:
            update['actual_start'] = activity.get('actual_start') or actual_date
        if event.get('extracted_action') == 'finish':
            update['actual_finish'] = activity.get('actual_finish') or actual_date
            if progress is None:
                progress = 100.0
        if progress is not None:
            # Keep verified actual progress monotonic unless a future explicit
            # correction workflow is introduced.
            progress = max(float(activity.get('actual_progress') or 0), progress)
            update['actual_progress'] = progress
            update['status'] = 'completed' if progress >= 100 else ('in_progress' if progress > 0 else 'not_started')
            if progress > 0 and not activity.get('actual_start') and actual_date:
                update['actual_start'] = actual_date
        if update:
            sb.table('activities').update(update).eq('id', activity_id).execute()
            if progress is not None:
                sb.table('progress_updates').insert({
                    'activity_id': activity_id, 'execution_event_id': event['id'],
                    'previous_progress': activity.get('actual_progress') or 0,
                    'new_progress': progress, 'quantity_completed': body.quantity_completed,
                    'quantity_unit': body.quantity_unit, 'update_source': 'human_review',
                }).execute()

        sb.table('execution_events').update({'extracted_action': event.get('extracted_action')}).eq('id', event['id']).execute()
        sb.table('review_queue').update({'status': 'approved', 'reviewed_at': now}).eq('id', review_id).execute()
        sb.table('activity_matches').update({'status': 'approved', 'reviewed_at': now}).eq('execution_event_id', event['id']).eq('activity_id', activity_id).execute()
        sb.table('audit_logs').insert({
            'project_id': activity['project_id'], 'action': 'review_approved',
            'entity_type': 'activity', 'entity_id': activity_id,
            'old_value': {'actual_progress': activity.get('actual_progress'), 'actual_start': activity.get('actual_start'), 'actual_finish': activity.get('actual_finish')},
            'new_value': {'update': update, 'event_id': event['id'], 'review_id': review_id},
            'source': 'human_review',
        }).execute()
        if update.get('actual_finish') and update.get('actual_start'):
            from datetime import date
            try:
                planned_days = (date.fromisoformat(activity['planned_finish']) - date.fromisoformat(activity['planned_start'])).days if activity.get('planned_start') and activity.get('planned_finish') else None
                actual_days = (date.fromisoformat(update['actual_finish']) - date.fromisoformat(update['actual_start'])).days
                delay = actual_days - planned_days if planned_days is not None else None
                sb.table('project_memory').insert({
                    'project_id': activity['project_id'], 'activity_type': activity['name'],
                    'discipline': activity.get('discipline'), 'planned_duration': planned_days,
                    'actual_duration': actual_days, 'delay_days': delay, 'delay_cause': None,
                    'source_activity_id': activity_id,
                }).execute()
            except (TypeError, ValueError):
                pass
    elif body.decision == 'reject':
        sb.table('execution_events').update({'extracted_action': event.get('extracted_action')}).eq('id', event['id']).execute()
        sb.table('review_queue').update({'status': 'rejected', 'reviewed_at': now}).eq('id', review_id).execute()
        sb.table('activity_matches').update({'status': 'rejected', 'reviewed_at': now}).eq('execution_event_id', event['id']).execute()
        sb.table('audit_logs').insert({'project_id': event['project_id'], 'action': 'review_rejected', 'entity_type': 'execution_event', 'entity_id': event['id'], 'new_value': {'review_id': review_id}, 'source': 'human_review'}).execute()
    else:
        sb.table('review_queue').update({'status': 'manually_matched', 'reviewed_at': now}).eq('id', review_id).execute()
        sb.table('activity_matches').update({'status': 'manual', 'reviewed_at': now}).eq('execution_event_id', event['id']).execute()
        sb.table('audit_logs').insert({'project_id': event['project_id'], 'action': 'new_activity_flagged', 'entity_type': 'execution_event', 'entity_id': event['id'], 'new_value': {'review_id': review_id}, 'source': 'human_review'}).execute()
    return {'status': body.decision, 'review_id': review_id}
