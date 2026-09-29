from __future__ import annotations

from datetime import datetime
from pathlib import Path
import re
import xml.etree.ElementTree as ET


def _local(tag: str) -> str:
    return tag.rsplit('}', 1)[-1]


def _child(el: ET.Element, name: str):
    for child in list(el):
        if _local(child.tag) == name:
            return child
    return None


def _text(el: ET.Element | None, name: str, default: str | None = None):
    if el is None:
        return default
    child = _child(el, name)
    return child.text if child is not None and child.text is not None else default


def _int(value: str | None, default: int | None = None):
    try:
        return int(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def _float(value: str | None, default: float | None = None):
    try:
        return float(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def _bool(value: str | None) -> bool:
    return str(value).lower() in {'1', 'true'}


def _iso(value: str | None):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).isoformat()
    except ValueError:
        return value


def _date(value: str | None):
    iso = _iso(value)
    return iso[:10] if iso else None


def _duration_hours(value: str | None):
    # ProjectLibre/MSPDI normally expresses duration as PT...H...M.
    if not value:
        return None
    m = re.fullmatch(r'PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?', value)
    if m:
        return round(float(m.group(1) or 0) + float(m.group(2) or 0) / 60 + float(m.group(3) or 0) / 3600, 4)
    # Some exports use minute units such as PT4920M.
    return None


def extract_mspdi_xml(pod_bytes: bytes) -> bytes:
    start = pod_bytes.find(b'<Project')
    if start < 0:
        start = pod_bytes.find(b'<mspdi:Project')
    if start < 0:
        raise ValueError('The uploaded file does not contain embedded MSPDI ProjectLibre schedule XML.')

    end = pod_bytes.find(b'</Project>', start)
    if end < 0:
        raise ValueError('The embedded ProjectLibre MSPDI XML is incomplete.')
    return pod_bytes[start:end + len(b'</Project>')]


def parse_projectlibre_pod(pod_bytes: bytes, filename: str) -> dict:
    if Path(filename).suffix.lower() != '.pod':
        raise ValueError('Only ProjectLibre .pod files are accepted by the schedule importer.')

    xml_bytes = extract_mspdi_xml(pod_bytes)
    root = ET.fromstring(xml_bytes)

    project = {
        'name': _text(root, 'Name'),
        'title': _text(root, 'Title'),
        'manager': _text(root, 'Manager'),
        'start': _iso(_text(root, 'StartDate')),
        'finish': _iso(_text(root, 'FinishDate')),
    }

    tasks_el = _child(root, 'Tasks')
    tasks = []
    if tasks_el is not None:
        for task in list(tasks_el):
            if _local(task.tag) != 'Task':
                continue
            tasks.append({
                'uid': _int(_text(task, 'UID')),
                'outline_number': _text(task, 'OutlineNumber'),
                'outline_level': _int(_text(task, 'OutlineLevel')),
                'name': _text(task, 'Name', ''),
                'start': _iso(_text(task, 'Start')),
                'finish': _iso(_text(task, 'Finish')),
                'duration_hours': _duration_hours(_text(task, 'Duration')),
                'percent_complete': _float(_text(task, 'PercentComplete'), 0),
                'is_summary': _bool(_text(task, 'Summary')),
                'is_milestone': _bool(_text(task, 'Milestone')),
                'calendar_uid': _int(_text(task, 'CalendarUID')),
                'predecessors': [],
            })
            links = _child(task, 'PredecessorLink')
            if links is not None:
                # Kept for compatibility if an exporter nests a single link.
                pass

    # MSPDI commonly stores predecessor links directly under each Task.
    for task_el, task in zip(
        [x for x in list(tasks_el) if _local(x.tag) == 'Task'] if tasks_el is not None else [],
        tasks,
    ):
        for child in list(task_el):
            if _local(child.tag) != 'PredecessorLink':
                continue
            pred_uid = _int(_text(child, 'PredecessorUID'))
            link_type = _int(_text(child, 'Type'), 1)
            lag = _int(_text(child, 'LinkLag'), 0)
            if pred_uid is not None:
                task['predecessors'].append({'predecessor_uid': pred_uid, 'type': link_type, 'lag': lag})

    calendars = []
    calendars_el = _child(root, 'Calendars')
    if calendars_el is not None:
        for cal in list(calendars_el):
            if _local(cal.tag) != 'Calendar':
                continue
            calendars.append({'uid': _int(_text(cal, 'UID')), 'name': _text(cal, 'Name', '')})

    resources = []
    resources_el = _child(root, 'Resources')
    if resources_el is not None:
        for res in list(resources_el):
            if _local(res.tag) != 'Resource':
                continue
            resources.append({
                'uid': _int(_text(res, 'UID')),
                'name': _text(res, 'Name', ''),
                'resource_type': _int(_text(res, 'Type')),
                'calendar_uid': _int(_text(res, 'CalendarUID')),
            })

    assignments = []
    assignments_el = _child(root, 'Assignments')
    if assignments_el is not None:
        for a in list(assignments_el):
            if _local(a.tag) != 'Assignment':
                continue
            assignments.append({
                'uid': _int(_text(a, 'UID')),
                'task_uid': _int(_text(a, 'TaskUID')),
                'resource_uid': _int(_text(a, 'ResourceUID')),
                'units': _float(_text(a, 'Units'), 1),
            })

    return {
        'format': 'ProjectLibre POD / embedded MSPDI',
        'filename': filename,
        'project': project,
        'tasks': tasks,
        'calendars': calendars,
        'resources': resources,
        'assignments': assignments,
    }
