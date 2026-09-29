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


def _extract_progress(text: str) -> float | None:
    patterns = [
        r'(?:current\s+(?:physical\s+)?progress|physical\s+progress|progress)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*%',
        r'(\d+(?:\.\d+)?)\s*%\s*(?:progress|complete|completed)',
    ]
    for pat in patterns:
        m = re.search(pat, text, re.I)
        if m:
            value = float(m.group(1))
            if 0 <= value <= 100:
                return value
    return None


def _extract_date(text: str) -> str | None:
    iso = re.search(r'20\d{2}-\d{2}-\d{2}', text)
    if iso:
        return iso.group(0)
    numeric = re.search(r'\b\d{1,2}[/-]\d{1,2}[/-]20\d{2}\b', text)
    if numeric:
        raw = numeric.group(0).replace('/', '-')
        for fmt in ('%d-%m-%Y', '%m-%d-%Y'):
            try:
                return datetime.strptime(raw, fmt).date().isoformat()
            except ValueError:
                pass
    named = re.search(r'\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b', text, re.I)
    if named:
        try:
            return datetime.strptime(' '.join(named.groups()), '%d %B %Y').date().isoformat()
        except ValueError:
            pass
    return None


def _extract_events(text: str):
    clean = text.strip()
    if not clean:
        return []
    # A field submission represents one activity update. When a progress percentage
    # is present, keep the report as one execution event so a single submission
    # cannot create multiple review items from incidental words like "started" or
    # "complete" in the narrative.
    progress = _extract_progress(clean)
    if progress is not None:
        action = 'finish' if progress >= 100 else 'observation'
        return [{'event_type': action, 'event_date': _extract_date(clean), 'evidence': clean}]

    events = []
    patterns = [
        ('start', r'\b(start(?:ed|s)?|began|commenced|mobilized|installation started)\b'),
        ('finish', r'\b(complet(?:ed|e)|finished|ended|closed|installed|erected|welded|tested|inspected)\b'),
    ]
    for kind, pat in patterns:
        for m in re.finditer(pat, clean, re.I):
            left, right = max(0, m.start()-180), min(len(clean), m.end()+260)
            snippet = clean[left:right].strip()
            events.append({
                'event_type': kind, 'event_date': _extract_date(snippet) or _extract_date(clean),
                'evidence': snippet,
            })
    if not events:
        events.append({'event_type': 'observation', 'event_date': _extract_date(clean), 'evidence': clean})
    return events


@router.post('')
async def capture(project_id: str = Form(''), submitted_by: str = Form('field'), update_name: str = Form(''), text: str = Form(''), files: list[UploadFile] = File(default=[])):
    sb = get_supabase()
    if not project_id:
        current = sb.table('projects').select('id').order('created_at', desc=True).limit(1).execute().data or []
        if not current:
            raise HTTPException(404, 'No project is available. Import a schedule first.')
        project_id = current[0]['id']
    acts = sb.table('activities').select('id,activity_code,name,discipline,planned_start,planned_finish,actual_start,actual_finish,actual_progress').eq('project_id', project_id).execute().data or []
    if not text and not files:
        raise HTTPException(400, 'Provide text or at least one evidence file.')
    source_text, file_names = text, []
    update_name = update_name.strip() or 'Field progress update'
    for f in files:
        content = await f.read(); name = f.filename or 'evidence'; file_names.append(name)
        extracted = _extract_file_text(name, content)
        source_text += '\n' + extracted

    name_map = {a['id']: a['name'] for a in acts}
    code_map = {a['id']: a['activity_code'] for a in acts}
    events_out = []
    for e in _extract_events(source_text):
        choice = process.extractOne(e['evidence'], name_map, scorer=fuzz.token_set_ratio)
        score = float(choice[1]) / 100 if choice else 0.0
        aid = choice[2] if choice and score >= 0.55 else None
        action = e['event_type']
        progress = _extract_progress(e['evidence']) or _extract_progress(source_text)
        row = {
            'project_id': project_id, 'source_type': 'field_capture',
            'source_file': ', '.join(file_names) if file_names else None,
            'raw_text': f'{update_name}\n{e["evidence"]}'.strip(), 'discipline': _discipline(e['evidence']),
            'event_date': e['event_date'], 'extracted_action': action,
            'location': None, 'quantity': progress, 'unit': '%' if progress is not None else None,
            'extraction_confidence': 0.75 if action != 'observation' else 0.45,
        }
        inserted = sb.table('execution_events').insert(row).execute().data[0]
        events_out.append(inserted)

        reason = f"RapidFuzz activity-name match to {code_map.get(aid)}" if aid else 'No matching schedule activity above threshold.'
        match = sb.table('activity_matches').insert({
            'execution_event_id': inserted['id'], 'activity_id': aid,
            'confidence_score': score, 'match_method': 'rapidfuzz_token_set' if aid else 'none',
            'match_reason': reason, 'status': 'pending',
        }).execute().data[0]
        sb.table('review_queue').insert({
            'execution_event_id': inserted['id'], 'suggested_activity_id': aid,
            'confidence_score': score, 'reason': reason, 'status': 'pending',
        }).execute()
        sb.table('audit_logs').insert({
            'project_id': project_id, 'action': 'capture_event', 'entity_type': 'execution_event',
            'entity_id': inserted['id'], 'old_value': None,
            'new_value': {'match_id': match['id'], 'activity_id': aid, 'confidence': score, 'update_name': update_name},
            'source': 'field_capture',
        }).execute()
    return {'status': 'captured', 'events': events_out, 'files': file_names}
