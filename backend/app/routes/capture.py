from __future__ import annotations

import io
import re
from datetime import datetime, timezone

import fitz
import pandas as pd
from docx import Document
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from rapidfuzz import fuzz, process

from ..services.supabase_service import get_supabase

router = APIRouter(prefix='/api/capture', tags=['capture'])


def _extract_file_text(filename: str, content: bytes) -> str:
    """Extract text only from evidence formats for which deterministic extraction is safe.

    Unsupported evidence is still persisted as an attachment/source filename; it simply does
    not contribute extracted text to the activity matcher.
    """
    lower = filename.lower()
    if lower.endswith(('.txt', '.csv', '.json', '.md', '.log')):
        return content.decode('utf-8', errors='replace')
    if lower.endswith(('.xlsx', '.xls')):
        sheets = pd.read_excel(io.BytesIO(content), sheet_name=None)
        return '\n'.join(df.fillna('').astype(str).to_csv(index=False) for df in sheets.values())
    if lower.endswith(('.docx', '.doc')):
        if lower.endswith('.doc'):
            return ''
        document = Document(io.BytesIO(content))
        return '\n'.join(p.text for p in document.paragraphs if p.text.strip())
    if lower.endswith('.pdf'):
        with fitz.open(stream=content, filetype='pdf') as doc:
            return '\n'.join(page.get_text('text') for page in doc)
    return ''


def _discipline(text: str) -> str | None:
    vocab = {
        'Civil': ['civil', 'excavat', 'concrete', 'foundation', 'backfill'],
        'Piping': ['piping', 'pipe', 'spool', 'weld', 'ndt', 'erection'],
        'Mechanical': ['mechanical', 'pump', 'equipment', 'alignment', 'commissioning'],
        'Electrical': ['electrical', 'cable', 'termination', 'continuity'],
        'Instrumentation': ['instrument', 'calibration', 'tubing'],
        'HSE': ['safety', 'hse', 'inspection'],
    }
    low = text.lower()
    for discipline, terms in vocab.items():
        if any(term in low for term in terms):
            return discipline
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
        match = re.search(pattern, text or '', re.I)
        if not match:
            continue
        value = match.group(0)
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d %B %Y', '%d %b %Y'):
            try:
                return datetime.strptime(value, fmt).date().isoformat()
            except ValueError:
                continue
    return None


def _reported_progress(text: str) -> float | None:
    match = re.search(
        r'(?:current\s+(?:physical\s+)?progress|physical\s+progress|progress)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*%',
        text or '', re.I,
    )
    if not match:
        return None
    return max(0.0, min(100.0, float(match.group(1))))


def _reported_actual_start(text: str) -> str | None:
    match = re.search(r'(?:actual\s+start|started\s+on|start\s+date)\s*[:\-]?\s*([^\n\r]+)', text or '', re.I)
    return _parse_date(match.group(1)) if match else None


def _extract_action(text: str, progress: float | None) -> str:
    """Extract an explicit action without treating narrative words as status changes.

    A report saying 'further work is required before it can be considered complete' is an
    observation/update, not a completion event. Explicit ACTION/STATUS fields and a 100%
    progress value take precedence over narrative wording.
    """
    action_match = re.search(r'(?:^|\n)\s*(?:action|status)\s*[:\-]\s*([^\n\r]+)', text or '', re.I)
    if action_match:
        value = action_match.group(1).strip().lower()
        if re.search(r'complete|finish|commission|close', value):
            return 'finish'
        if re.search(r'start|begin|mobil', value):
            return 'start'
        return 'observation'
    if progress is not None:
        return 'finish' if progress >= 100 else 'observation'
    # Only explicit imperative/status phrases count as a start. Do not scan arbitrary prose
    # for 'started' because reports often mention historical or planned starts.
    if re.search(r'(?:^|\n)\s*(?:work|activity|installation)\s+(?:started|began|commenced|mobilized)\b', text or '', re.I):
        return 'start'
    return 'observation'


def _extract_event(text: str) -> dict | None:
    stripped = text.strip()
    if not stripped:
        return None
    progress = _reported_progress(stripped)
    event_date = _parse_date(stripped)
    actual_start = _reported_actual_start(stripped)
    return {
        'event_type': _extract_action(stripped, progress),
        'event_date': event_date or actual_start,
        'evidence': stripped,
        'reported_progress': progress,
        'reported_actual_start': actual_start,
    }


@router.post('')
async def capture(
    project_id: str = Form(...),
    submitted_by: str = Form('field'),
    text: str = Form(''),
    files: list[UploadFile] = File(default=[]),
):
    sb = get_supabase()
    if not text and not files:
        raise HTTPException(400, 'Provide text or at least one evidence file.')

    project_rows = sb.table('projects').select('id').eq('id', project_id).limit(1).execute().data or []
    if not project_rows:
        raise HTTPException(404, 'The selected project does not exist. Import the schedule before submitting field progress.')

    acts = sb.table('activities').select(
        'id,activity_code,name,discipline,planned_start,planned_finish,actual_start,actual_finish,actual_progress,is_summary'
    ).eq('project_id', project_id).execute().data or []

    source_text = text or ''
    file_names: list[str] = []
    for upload in files:
        content = await upload.read()
        name = upload.filename or 'evidence'
        file_names.append(name)
        extracted = _extract_file_text(name, content)
        if extracted:
            source_text += '\n' + extracted

    # File names are useful deterministic evidence (for example P101_Spool_A_Field_Report.pdf),
    # but they are not written into raw_text because raw_text should remain the field statement.
    matching_source = source_text + '\n' + '\n'.join(file_names)
    event_source = source_text.strip() or '\n'.join(file_names)
    event = _extract_event(event_source)
    if not event:
        raise HTTPException(400, 'The submitted evidence did not contain readable field information.')

    settings_rows = sb.table('workspace_settings').select('confidence_threshold').eq('project_id', project_id).execute().data or []
    threshold = float(settings_rows[0].get('confidence_threshold', 0.90)) if settings_rows else 0.90
    threshold = max(0.80, min(1.0, threshold))

    executable_acts = [a for a in acts if not a.get('is_summary')]
    name_map = {a['id']: a['name'] for a in executable_acts if a.get('name')}
    code_map = {a['id']: a['activity_code'] for a in executable_acts if a.get('activity_code')}
    by_id = {a['id']: a for a in executable_acts}
    normalized_source = _normalize(matching_source)

    explicit_ids: set[str] = set()
    for activity in executable_acts:
        aid = activity['id']
        name = _normalize(activity.get('name') or '')
        code = _normalize(activity.get('activity_code') or '')
        if (name and name in normalized_source) or (code and code in normalized_source):
            explicit_ids.add(aid)

    explicit_unique = len(explicit_ids) == 1
    candidates = process.extract(event['evidence'], name_map, scorer=fuzz.token_set_ratio, limit=2) if name_map else []
    choice = candidates[0] if candidates else None
    score = float(choice[1]) / 100 if choice else 0.0
    aid = choice[2] if choice and score >= 0.55 else None
    second_score = float(candidates[1][1]) / 100 if len(candidates) > 1 else 0.0
    unique_candidate = bool(aid) and (len(candidates) == 1 or score - second_score >= 0.08)

    if explicit_unique:
        aid = next(iter(explicit_ids))
        score = 1.0
        unique_candidate = True
    elif len(explicit_ids) > 1:
        aid = None
        score = 1.0
        unique_candidate = False

    eligible_auto = bool(aid and unique_candidate and score >= 1.0)

    reason = (
        f"Explicit unique activity reference to {code_map.get(aid)}" if explicit_unique else
        'Multiple scheduled activities explicitly referenced; planner review required.' if len(explicit_ids) > 1 else
        f"RapidFuzz activity-name match to {code_map.get(aid)}" if aid else
        'No matching executable schedule activity above threshold.'
    )

    event_row = {
        'project_id': project_id,
        'source_type': 'field_capture',
        'source_file': ', '.join(file_names) if file_names else None,
        'raw_text': event['evidence'],
        'discipline': _discipline(event['evidence']),
        'event_date': event['event_date'],
        'extracted_action': event['event_type'],
        'location': None,
        'quantity': None,
        'unit': None,
        'extraction_confidence': 1.0 if explicit_unique else (0.80 if aid else 0.65),
        'created_by': submitted_by or 'field',
    }
    inserted = sb.table('execution_events').insert(event_row).execute().data[0]

    sb.table('activity_matches').insert({
        'execution_event_id': inserted['id'],
        'activity_id': aid,
        'confidence_score': score,
        'match_method': 'explicit_reference' if explicit_unique else ('rapidfuzz_token_set' if aid else 'none'),
        'match_reason': reason,
        'status': 'approved' if eligible_auto else 'pending',
    }).execute()

    if not eligible_auto:
        sb.table('review_queue').insert({
            'execution_event_id': inserted['id'],
            'suggested_activity_id': aid,
            'confidence_score': score,
            'reason': reason,
            'status': 'pending',
        }).execute()
        return {'status': 'review_required', 'event_id': inserted['id'], 'activity_id': aid, 'confidence': score, 'reason': reason}

    activity = by_id[aid]
    actual_date = event['event_date'] or event['reported_actual_start']
    update: dict = {}
    progress = event['reported_progress']

    if event['event_type'] == 'start' and actual_date:
        update['actual_start'] = activity.get('actual_start') or actual_date
    if event['event_type'] == 'finish':
        if actual_date:
            update['actual_finish'] = activity.get('actual_finish') or actual_date
        if progress is None:
            progress = 100.0
    if progress is not None:
        previous = float(activity.get('actual_progress') or 0)
        progress = max(previous, min(100.0, float(progress)))
        update['actual_progress'] = progress
        update['status'] = 'completed' if progress >= 100 else ('in_progress' if progress > 0 else 'not_started')
        if progress > 0 and not activity.get('actual_start') and actual_date:
            update['actual_start'] = actual_date

    if update:
        sb.table('activities').update(update).eq('id', aid).execute()
        if progress is not None:
            sb.table('progress_updates').insert({
                'activity_id': aid,
                'execution_event_id': inserted['id'],
                'previous_progress': activity.get('actual_progress') or 0,
                'new_progress': progress,
                'quantity_completed': None,
                'quantity_unit': None,
                'update_source': 'auto_threshold',
                'updated_by': submitted_by or 'field',
            }).execute()

    sb.table('review_queue').insert({
        'execution_event_id': inserted['id'],
        'suggested_activity_id': aid,
        'confidence_score': score,
        'reason': f'{reason}. Automatically approved at 100% confidence.',
        'status': 'approved',
    }).execute()
    sb.table('audit_logs').insert({
        'project_id': project_id,
        'user_id': None,
        'action': 'execution_auto_approved',
        'entity_type': 'activity',
        'entity_id': aid,
        'old_value': {'actual_progress': activity.get('actual_progress'), 'actual_start': activity.get('actual_start'), 'actual_finish': activity.get('actual_finish')},
        'new_value': {'update': update, 'event_id': inserted['id'], 'confidence': 1.0},
        'source': 'auto_threshold',
    }).execute()

    return {
        'status': 'auto_approved',
        'event_id': inserted['id'],
        'activity_id': aid,
        'confidence': 1.0,
        'actual_progress': progress,
        'reason': reason,
    }
