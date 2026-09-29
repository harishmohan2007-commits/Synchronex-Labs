from __future__ import annotations
import io
import re
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
        'Mechanical': ['mechanical', 'pump', 'equipment', 'alignment', 'commissioning'],
        'Electrical': ['electrical', 'cable', 'termination', 'continuity'],
        'Instrumentation': ['instrument', 'calibration', 'tubing'],
        'HSE': ['safety', 'hse'],
    }
    low = text.lower()
    for d, terms in vocab.items():
        if any(t in low for t in terms):
            return d
    return None


def _parse_date(text: str) -> str | None:
    patterns = [
        r'\b(20\d{2}-\d{2}-\d{2})\b',
        r'\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b',
        r'\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if not match:
            continue
        try:
            value = match.group(0)
            for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d %B %Y'):
                try:
                    return datetime.strptime(value, fmt).date().isoformat()
                except ValueError:
                    pass
        except Exception:
            pass
    return None


def _extract_progress(text: str) -> float | None:
    patterns = [
        r'(?:current\s+(?:physical\s+)?progress|physical\s+progress|progress)\s*[:=]\s*(\d+(?:\.\d+)?)\s*%',
        r'\b(\d+(?:\.\d+)?)\s*%\s*(?:complete|completed|progress)\b',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            value = float(match.group(1))
            if 0 <= value <= 100:
                return value
    return None


def _extract_actual_date(text: str) -> str | None:
    match = re.search(r'actual\s+(?:start|finish)\s*:\s*([^\n\r]+)', text, re.I)
    if match:
        return _parse_date(match.group(1))
    return _parse_date(text)


def _extract_action(text: str, progress: float | None) -> str:
    low = text.lower()
    # A numeric physical-progress value is stronger than an isolated verb such as
    # 'welded' or 'installed'. A 30% welding report is still in progress.
    if progress is not None:
        if progress >= 100:
            return 'finish'
        if progress > 0:
            return 'start'
        return 'observation'
    if re.search(r'\b(completed|complete|finished|ended|closed|installed|erected)\b', low):
        return 'finish'
    if re.search(r'\b(started|start|began|commenced|ongoing|progressing|continued|carried out)\b', low):
        return 'start'
    return 'observation'


def _extract_events(text: str):
    """Create one execution event per numbered field-report item, not one per keyword.

    The previous implementation scanned the entire report for every occurrence of
    "started/completed/...", which created overlapping snippets and duplicate review
    items. Numbered work items are the natural unit for the current field-report UX.
    """
    clean = text.replace('\r\n', '\n').replace('\r', '\n').strip()
    if not clean:
        return []

    headers = list(re.finditer(r'^\s*(\d+)\.\s+([^\n]+)\s*$', clean, re.M))
    events = []
    if headers:
        for index, header in enumerate(headers):
            start = header.start()
            end = headers[index + 1].start() if index + 1 < len(headers) else len(clean)
            section = clean[start:end].strip()
            title = header.group(2).strip().rstrip(':')
            # Ignore numbered metadata outside the actual work section.
            if title.lower() in {'day shift', 'night shift'}:
                continue
            progress = _extract_progress(section)
            action = _extract_action(section, progress)
            event_date = _extract_actual_date(section)
            events.append({
                'activity_label': title,
                'event_type': action,
                'event_date': event_date,
                'progress': progress,
                'evidence': section,
            })
    elif clean:
        progress = _extract_progress(clean)
        events.append({
            'activity_label': clean[:160],
            'event_type': _extract_action(clean, progress),
            'event_date': _extract_actual_date(clean),
            'progress': progress,
            'evidence': clean,
        })
    return events


@router.post('')
async def capture(project_id: str = Form(...), submitted_by: str = Form('field'), text: str = Form(''), files: list[UploadFile] = File(default=[])):
    sb = get_supabase()
    # Only executable baseline activities are candidates for field matching.
    # Summary/WBS rows are context, not executable work and must never become
    # trusted field actuals or review candidates.
    acts = sb.table('activities').select(
        'id,activity_code,name,discipline,planned_start,planned_finish,actual_start,actual_finish,actual_progress,is_summary'
    ).eq('project_id', project_id).eq('is_summary', False).execute().data or []
    if not text and not files:
        raise HTTPException(400, 'Provide text or at least one evidence file.')

    source_text, file_names = text, []
    for f in files:
        content = await f.read()
        name = f.filename or 'evidence'
        file_names.append(name)
        extracted = _extract_file_text(name, content)
        if extracted:
            source_text += '\n' + extracted

    if not source_text.strip():
        raise HTTPException(400, 'The submitted evidence could not be read as text. Add a text note or supported PDF/Excel/CSV/TXT evidence.')

    name_map = {a['id']: a['name'] for a in acts}
    code_map = {a['id']: a['activity_code'] for a in acts}
    events_out = []
    for e in _extract_events(source_text):
        # Match the field item's own title first; do not match a large context window.
        label = e['activity_label']
        choice = process.extractOne(label, name_map, scorer=fuzz.token_set_ratio)
        score = float(choice[1]) / 100 if choice else 0.0
        # High-confidence exact/near-exact labels can be suggested. Ambiguous labels
        # remain in review and are never applied automatically.
        aid = choice[2] if choice and score >= 0.55 else None
        action = e['event_type']
        row = {
            'project_id': project_id,
            'source_type': 'field_capture',
            'source_file': ', '.join(file_names) if file_names else None,
            'raw_text': e['evidence'],
            'discipline': _discipline(e['evidence']),
            'event_date': e['event_date'],
            'extracted_action': action,
            'location': None,
            'quantity': e['progress'],
            'unit': '%' if e['progress'] is not None else None,
            'extraction_confidence': 0.90 if e['progress'] is not None else 0.75,
        }
        inserted = sb.table('execution_events').insert(row).execute().data[0]
        events_out.append(inserted)

        reason = (
            f"Field activity '{label}' matched to executable activity {code_map.get(aid)}"
            if aid else
            f"No executable schedule activity matched field activity '{label}'."
        )
        match = sb.table('activity_matches').insert({
            'execution_event_id': inserted['id'],
            'activity_id': aid,
            'confidence_score': score,
            'match_method': 'rapidfuzz_activity_label' if aid else 'none',
            'match_reason': reason,
            'status': 'pending',
        }).execute().data[0]
        sb.table('review_queue').insert({
            'execution_event_id': inserted['id'],
            'suggested_activity_id': aid,
            'confidence_score': score,
            'reason': reason,
            'status': 'pending',
        }).execute()
        sb.table('audit_logs').insert({
            'project_id': project_id,
            'action': 'capture_event',
            'entity_type': 'execution_event',
            'entity_id': inserted['id'],
            'old_value': None,
            'new_value': {
                'match_id': match['id'],
                'activity_id': aid,
                'confidence': score,
                'reported_progress': e['progress'],
                'field_activity_label': label,
            },
            'source': 'field_capture',
        }).execute()
    return {'status': 'captured', 'events': events_out, 'files': file_names, 'event_count': len(events_out)}
