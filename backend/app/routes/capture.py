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


def _extract_events(text: str):
    events = []
    date_pat = r'(20\d{2}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]20\d{2})'
    patterns = [
        ('start', r'\b(start(?:ed|s)?|began|commenced|mobilized|installation started)\b'),
        ('finish', r'\b(complet(?:ed|e)|finished|ended|closed|installed|erected|welded|tested|inspected)\b'),
    ]
    for kind, pat in patterns:
        for m in re.finditer(pat, text, re.I):
            left, right = max(0, m.start()-180), min(len(text), m.end()+260)
            snippet = text[left:right].strip()
            dates = re.findall(date_pat, snippet)
            events.append({
                'event_type': kind, 'event_date': dates[0] if dates else None,
                'evidence': snippet,
            })
    if not events and text.strip():
        events.append({'event_type': 'observation', 'event_date': None, 'evidence': text.strip()})
    return events


@router.post('')
async def capture(project_id: str = Form(...), submitted_by: str = Form('field'), text: str = Form(''), files: list[UploadFile] = File(default=[])):
    sb = get_supabase()
    acts = sb.table('activities').select('id,activity_code,name,discipline,planned_start,planned_finish,actual_start,actual_finish,actual_progress').eq('project_id', project_id).execute().data or []
    if not text and not files:
        raise HTTPException(400, 'Provide text or at least one evidence file.')
    source_text, file_names = text, []
    for f in files:
        content = await f.read(); name = f.filename or 'evidence'; file_names.append(name)
        source_text += '\n' + _extract_file_text(name, content)

    name_map = {a['id']: a['name'] for a in acts}
    code_map = {a['id']: a['activity_code'] for a in acts}
    events_out = []
    for e in _extract_events(source_text):
        choice = process.extractOne(e['evidence'], name_map, scorer=fuzz.token_set_ratio)
        score = float(choice[1]) / 100 if choice else 0.0
        aid = choice[2] if choice and score >= 0.55 else None
        action = e['event_type']
        row = {
            'project_id': project_id, 'source_type': 'field_capture',
            'source_file': ', '.join(file_names) if file_names else None,
            'raw_text': e['evidence'], 'discipline': _discipline(e['evidence']),
            'event_date': e['event_date'], 'extracted_action': action,
            'location': None, 'quantity': None, 'unit': None,
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
            'new_value': {'match_id': match['id'], 'activity_id': aid, 'confidence': score},
            'source': 'field_capture',
        }).execute()
    return {'status': 'captured', 'events': events_out, 'files': file_names}
