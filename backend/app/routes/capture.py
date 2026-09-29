from __future__ import annotations
import io, re
from datetime import datetime, timezone
import fitz
import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from rapidfuzz import fuzz, process
from ..services.supabase_service import get_supabase

router = APIRouter(prefix='/api/capture', tags=['capture'])


def _extract_file_text(filename: str, content: bytes) -> str:
    lower = filename.lower()
    if lower.endswith(('.txt', '.csv')):
        return content.decode('utf-8', errors='replace')
    if lower.endswith(('.xlsx', '.xls')):
        sheets = pd.read_excel(io.BytesIO(content), sheet_name=None)
        return '\n'.join(df.astype(str).fillna('').to_csv(index=False) for df in sheets.values())
    if lower.endswith('.pdf'):
        doc = fitz.open(stream=content, filetype='pdf')
        return '\n'.join(page.get_text('text') for page in doc)
    return ''


def _discipline(text: str) -> str | None:
    vocab = {
        'Civil': ['civil', 'excavat', 'concrete', 'foundation', 'backfill'],
        'Piping': ['piping', 'pipe', 'spool', 'weld', 'ndt', 'erection'],
        'Mechanical': ['mechanical', 'pump', 'equipment', 'alignment'],
        'Electrical': ['electrical', 'cable', 'termination', 'continuity'],
        'Instrumentation': ['instrument', 'calibration', 'tubing'],
        'HSE': ['safety', 'hse', 'inspection'],
    }
    low = text.lower()
    for d, terms in vocab.items():
        if any(t in low for t in terms):
            return d
    return None


def _normalize(text: str) -> str:
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9]+', ' ', text.lower())).strip()


def _parse_date(text: str) -> str | None:
    patterns = [
        r'\b(20\d{2}-\d{2}-\d{2})\b',
        r'\b(\d{1,2}[/-]\d{1,2}[/-]20\d{2})\b',
        r'\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})\b',
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.I)
        if not m:
            continue
        value = m.group(0)
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d %B %Y', '%d %b %Y'):
            try:
                return datetime.strptime(value, fmt).date().isoformat()
            except ValueError:
                pass
    return None


def _extract_events(text: str):
    """A field submission represents one activity update, so create one event per report.
    This prevents a single report from becoming multiple duplicate review items just because
    the narrative contains words such as 'started' and 'completed'.
    """
    stripped = text.strip()
    if not stripped:
        return []
    low = stripped.lower()
    action = 'observation'
    if re.search(r'\b(completed|complete|finished|commissioned|closed)\b', low):
        action = 'finish'
    elif re.search(r'\b(started|began|commenced|mobilized|installation started)\b', low):
        action = 'start'
    return [{'event_type': action, 'event_date': _parse_date(stripped), 'evidence': stripped}]


@router.post('')
async def capture(project_id: str = Form(...), submitted_by: str = Form('field'), text: str = Form(''), files: list[UploadFile] = File(default=[])):
    sb = get_supabase()
    acts = sb.table('activities').select('id,activity_code,name,discipline,planned_start,planned_finish,actual_start,actual_finish,actual_progress,is_summary').eq('project_id', project_id).execute().data or []
    if not text and not files:
        raise HTTPException(400, 'Provide text or at least one evidence file.')

    source_text, file_names = text, []
    for f in files:
        content = await f.read(); name = f.filename or 'evidence'; file_names.append(name)
        source_text += '\n' + _extract_file_text(name, content)

    settings_rows = sb.table('workspace_settings').select('confidence_threshold').eq('project_id', project_id).execute().data or []
    threshold = float(settings_rows[0].get('confidence_threshold', 0.90)) if settings_rows else 0.90
    threshold = max(0.80, min(1.0, threshold))

    executable_acts = [a for a in acts if not a.get('is_summary')]
    name_map = {a['id']: a['name'] for a in executable_acts if a.get('name')}
    code_map = {a['id']: a['activity_code'] for a in executable_acts if a.get('activity_code')}
    by_id = {a['id']: a for a in executable_acts}
    events_out = []

    progress_match = re.search(r'(?:current\s+(?:physical\s+)?progress|physical\s+progress|progress)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*%', source_text, re.I)
    reported_progress = float(progress_match.group(1)) if progress_match else None
    actual_start_match = re.search(r'(?:actual\s+start|started\s+on|start\s+date)\s*[:\-]?\s*([^\n\r]+)', source_text, re.I)
    reported_actual_start = _parse_date(actual_start_match.group(1)) if actual_start_match else None

    normalized_source = _normalize(source_text)
    for e in _extract_events(source_text):
        # First use deterministic references across the complete report, not only a small snippet.
        explicit_ids = set()
        for a in executable_acts:
            aid = a['id']
            name = _normalize(a.get('name') or '')
            code = _normalize(a.get('activity_code') or '')
            if (name and name in normalized_source) or (code and code in normalized_source):
                explicit_ids.add(aid)
        explicit_unique = len(explicit_ids) == 1

        candidates = process.extract(e['evidence'], name_map, scorer=fuzz.token_set_ratio, limit=2) if name_map else []
        choice = candidates[0] if candidates else None
        score = float(choice[1]) / 100 if choice else 0.0
        aid = choice[2] if choice and score >= 0.55 else None
        second_score = float(candidates[1][1]) / 100 if len(candidates) > 1 else 0.0
        unique_candidate = bool(aid) and (len(candidates) == 1 or (score - second_score >= 0.08))
        if explicit_unique:
            aid = next(iter(explicit_ids))
            score = 1.0
            unique_candidate = True
        elif len(explicit_ids) > 1:
            aid = None
            score = 1.0
            unique_candidate = False

        eligible_auto = bool(aid and unique_candidate and (score >= 1.0 or score >= threshold))

        row = {
            'project_id': project_id, 'source_type': 'field_capture',
            'source_file': ', '.join(file_names) if file_names else None,
            'raw_text': e['evidence'], 'discipline': _discipline(e['evidence']),
            'event_date': e['event_date'], 'extracted_action': e['event_type'],
            'location': None, 'quantity': None, 'unit': None,
            'extraction_confidence': 1.0 if explicit_unique else (0.75 if e['event_type'] != 'observation' else 0.65),
        }
        inserted = sb.table('execution_events').insert(row).execute().data[0]
        events_out.append(inserted)

        if explicit_unique:
            reason = f"Explicit unique activity reference to {code_map.get(aid)}"
        elif len(explicit_ids) > 1:
            reason = 'Multiple scheduled activities explicitly referenced; planner review required.'
        elif aid:
            reason = f"RapidFuzz activity-name match to {code_map.get(aid)}"
        else:
            reason = 'No matching executable schedule activity above threshold.'

        match_status = 'approved' if eligible_auto else 'pending'
        match = sb.table('activity_matches').insert({
            'execution_event_id': inserted['id'], 'activity_id': aid,
            'confidence_score': score, 'match_method': 'explicit_reference' if explicit_unique else ('rapidfuzz_token_set' if aid else 'none'),
            'match_reason': reason, 'status': match_status,
        }).execute().data[0]

        if eligible_auto:
            activity = by_id.get(aid)
            actual_date = e.get('event_date') or reported_actual_start
            update = {}
            progress = reported_progress
            if e['event_type'] == 'start' and actual_date:
                update['actual_start'] = activity.get('actual_start') or actual_date
            if e['event_type'] == 'finish':
                if actual_date:
                    update['actual_finish'] = activity.get('actual_finish') or actual_date
                if progress is None:
                    progress = 100.0
            if progress is not None:
                progress = max(float(activity.get('actual_progress') or 0), min(100.0, progress))
                update['actual_progress'] = progress
                update['status'] = 'completed' if progress >= 100 else ('in_progress' if progress > 0 else 'not_started')
                if progress > 0 and not activity.get('actual_start') and actual_date:
                    update['actual_start'] = actual_date
            if update:
                sb.table('activities').update(update).eq('id', aid).execute()
                if progress is not None:
                    sb.table('progress_updates').insert({
                        'activity_id': aid, 'execution_event_id': inserted['id'],
                        'previous_progress': activity.get('actual_progress') or 0,
                        'new_progress': progress, 'quantity_completed': None,
                        'quantity_unit': None, 'update_source': 'auto_threshold',
                    }).execute()
            sb.table('review_queue').insert({
                'execution_event_id': inserted['id'], 'suggested_activity_id': aid,
                'confidence_score': score, 'reason': f'{reason}. Automatically approved at {score:.0%} confidence.', 'status': 'approved',
            }).execute()
            sb.table('audit_logs').insert({
                'project_id': project_id, 'action': 'auto_apply_threshold', 'entity_type': 'activity',
                'entity_id': aid, 'old_value': {'actual_progress': activity.get('actual_progress'), 'actual_start': activity.get('actual_start'), 'actual_finish': activity.get('actual_finish')},
                'new_value': {'update': update, 'event_id': inserted['id'], 'confidence': score, 'threshold': threshold},
                'source': 'auto_threshold',
            }).execute()
        else:
            sb.table('review_queue').insert({
                'execution_event_id': inserted['id'], 'suggested_activity_id': aid,
                'confidence_score': score, 'reason': reason, 'status': 'pending',
            }).execute()
            sb.table('audit_logs').insert({
                'project_id': project_id, 'action': 'capture_event', 'entity_type': 'execution_event',
                'entity_id': inserted['id'], 'old_value': None,
                'new_value': {'match_id': match['id'], 'activity_id': aid, 'confidence': score, 'threshold': threshold},
                'source': 'field_capture',
            }).execute()

    return {'status': 'captured', 'events': events_out, 'files': file_names, 'threshold': threshold}
