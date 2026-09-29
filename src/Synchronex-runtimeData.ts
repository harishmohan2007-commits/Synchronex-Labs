const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export type Activity = {
  id: string;
  dbId: string;
  wbs: string;
  desc: string;
  discipline: string;
  planStart: string;
  planFinish: string;
  actStart: string;
  actFinish: string;
  progress: number;
  plannedProgress: number;
  status: string;
  aiConf: number;
};

export let ACTIVITIES: Activity[] = [];
export let DISCIPLINES: any[] = [];
export let FIELD_EVENTS: any[] = [];
export let REVIEW_QUEUE: any[] = [];
export let AUDIT_TRAIL: any[] = [];
export let MEMORY_ACTIVITIES: any[] = [];
export let PROGRESS_TREND: any[] = [];
export let DELAY_CAUSES: any[] = [];
export let DISCIPLINE_PERF: any[] = [];

export let CURRENT_PROJECT: any = null;
export let PROJECT_METRICS = {
  activityCount: 0,
  executableCount: 0,
  plannedProgress: 0,
  actualProgress: 0,
  variance: 0,
  reviewCount: 0,
  unmatchedCount: 0,
  eventCount: 0,
};

export function apiUrl(path: string) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(apiUrl(path), init);
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const message = body?.detail || body?.message || `API request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export async function apiGet(path: string) {
  return request(path);
}

function formatDate(value: any) {
  if (!value) return '—';
  const s = String(value).slice(0, 10);
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function activityStatus(row: any) {
  const status = String(row?.status || 'not_started');
  if (status === 'completed') return 'Completed';
  if (status === 'delayed') return 'Delayed';
  if (status === 'on_hold') return 'On Hold';
  if (status === 'in_progress') return 'In Progress';
  return 'Planned';
}

function disciplineRows(rows: any[]) {
  const grouped = new Map<string, any[]>();
  rows.filter(a => !a.is_summary).forEach(a => {
    const d = a.discipline || 'Unassigned';
    if (!grouped.has(d)) grouped.set(d, []);
    grouped.get(d)!.push(a);
  });
  return Array.from(grouped.entries()).map(([name, items]) => {
    const planned = items.length ? items.reduce((s, a) => s + Number(a.planned_progress || 0), 0) / items.length : 0;
    const actual = items.length ? items.reduce((s, a) => s + Number(a.actual_progress || 0), 0) / items.length : 0;
    const variance = actual - planned;
    return {
      name,
      activities: items.length,
      planned: Math.round(planned),
      actual: Math.round(actual),
      variance: Math.round(variance),
      status: variance < -5 ? 'Delayed' : variance < 0 ? 'At Risk' : 'On Track',
      milestones: items.filter(a => a.is_milestone).length,
      nextMilestone: items.find(a => a.is_milestone && Number(a.actual_progress || 0) < 100)?.name || '—',
      varianceNote: 'Derived from the current persisted schedule snapshot.',
    };
  });
}

function mapActivity(row: any, matches: any[], events: any[]): Activity {
  const related = matches.filter(m => m.activity_id === row.id);
  const conf = related.length ? Math.max(...related.map(m => Number(m.confidence_score || 0))) : 0;
  return {
    id: row.activity_code || row.source_uid || row.id,
    dbId: row.id,
    wbs: row.outline_level ? `L${row.outline_level}` : '—',
    desc: row.name || 'Unnamed activity',
    discipline: row.discipline || 'Unassigned',
    planStart: formatDate(row.planned_start),
    planFinish: formatDate(row.planned_finish),
    actStart: formatDate(row.actual_start),
    actFinish: formatDate(row.actual_finish),
    progress: Number(row.actual_progress || 0),
    plannedProgress: Number(row.planned_progress || 0),
    status: activityStatus(row),
    aiConf: Math.round(conf * 100),
  };
}

export function applyBootstrap(data: any) {
  CURRENT_PROJECT = data?.project || null;
  const rawActivities = Array.isArray(data?.activities) ? data.activities : [];
  const events = Array.isArray(data?.events) ? data.events : [];
  const matches = Array.isArray(data?.matches) ? data.matches : [];
  const reviews = Array.isArray(data?.reviews) ? data.reviews : [];
  const trace = Array.isArray(data?.trace) ? data.trace : [];

  ACTIVITIES = rawActivities.map((a: any) => mapActivity(a, matches, events));
  const byCode = new Map(ACTIVITIES.map(a => [a.dbId, a]));

  FIELD_EVENTS = events.map((e: any) => {
    const match = matches.find((m: any) => m.execution_event_id === e.id);
    const act = match?.activity_id ? byCode.get(match.activity_id) : undefined;
    return {
      id: e.id,
      time: e.created_at ? new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
      status: match?.status === 'approved' ? 'AI MATCHED' : match?.activity_id ? 'REVIEW REQUIRED' : 'UNMATCHED',
      text: `"${e.raw_text || ''}"`,
      actId: act?.id || match?.activity_id || '—',
      actDesc: act?.desc || 'No matching activity',
      conf: Math.round(Number(match?.confidence_score || e.extraction_confidence || 0) * 100),
    };
  });

  REVIEW_QUEUE = reviews.map((r: any) => {
    const event = events.find((e: any) => e.id === r.execution_event_id);
    const act = r.suggested_activity_id ? byCode.get(r.suggested_activity_id) : undefined;
    return {
      id: r.id,
      text: `"${event?.raw_text || 'Execution event'}"`,
      candidate: act?.id || '—',
      conf: Math.round(Number(r.confidence_score || 0) * 100),
      issue: r.reason || (act ? 'Review required' : 'No matching activity'),
      status: r.status === 'pending' ? 'Review' : r.status,
    };
  }).filter((r: any) => r.status === 'Review' || r.status === 'pending');

  AUDIT_TRAIL = trace.map((a: any) => {
    const oldValue = a.old_value || {};
    const newValue = a.new_value || {};
    const oldProgress = oldValue.actual_progress;
    const newProgress = newValue?.update?.actual_progress ?? newValue.actual_progress;
    return {
      ts: a.created_at ? new Date(a.created_at).toLocaleString('en-GB') : '—',
      actor: a.user_id ? 'Planner' : (a.source === 'field_capture' ? 'Field' : 'System'),
      action: String(a.action || '').replace(/_/g, ' '),
      activity: byCode.get(a.entity_id)?.id || a.entity_id || '—',
      source: a.source || 'System',
      prev: oldProgress == null ? '—' : `${oldProgress}%`,
      next: newProgress == null ? '—' : `${newProgress}%`,
      conf: newValue?.confidence ? Math.round(Number(newValue.confidence) * 100) : 0,
    };
  });

  const executable = rawActivities.filter((a: any) => !a.is_summary);
  const planned = executable.length ? executable.reduce((s: number, a: any) => s + Number(a.planned_progress || 0), 0) / executable.length : 0;
  const actual = executable.length ? executable.reduce((s: number, a: any) => s + Number(a.actual_progress || 0), 0) / executable.length : 0;
  const unmatchedCount = reviews.filter((r: any) => !r.suggested_activity_id && r.status === 'pending').length;
  PROJECT_METRICS = {
    activityCount: rawActivities.length,
    executableCount: executable.length,
    plannedProgress: planned,
    actualProgress: actual,
    variance: actual - planned,
    reviewCount: reviews.filter((r: any) => r.status === 'pending').length,
    unmatchedCount,
    eventCount: events.length,
  };

  DISCIPLINES = disciplineRows(rawActivities);
  DISCIPLINE_PERF = DISCIPLINES.map(d => ({ disc: d.name, planned: d.planned, actual: d.actual }));
  // No historical progress series exists in the current API. Do not invent one.
  PROGRESS_TREND = [];
  // Memory/delay history is not exposed by the current bootstrap endpoint yet.
  MEMORY_ACTIVITIES = [];
  DELAY_CAUSES = [];
  return data;
}

export async function loadCurrentProject(projectId?: string) {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  const project = await apiGet(`/api/projects/current${query}`);
  const bootstrap = await apiGet(`/api/projects/${project.id}/bootstrap`);
  applyBootstrap(bootstrap);
  return bootstrap;
}

export async function refreshCurrentProject() {
  if (!CURRENT_PROJECT?.id) return null;
  const bootstrap = await apiGet(`/api/projects/${CURRENT_PROJECT.id}/bootstrap`);
  applyBootstrap(bootstrap);
  return bootstrap;
}

export async function submitCapture(projectId: string, submittedBy: string, text: string, files: File[]) {
  const form = new FormData();
  form.append('project_id', projectId);
  form.append('submitted_by', submittedBy || 'field');
  form.append('text', text || '');
  files.forEach(file => form.append('files', file, file.name));
  const result = await request('/api/capture', { method: 'POST', body: form });
  await refreshCurrentProject();
  return result;
}

export async function decideReview(reviewId: string, decision: 'approve'|'reject'|'flag', newProgress?: number) {
  const result = await request(`/api/review/${reviewId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewer: 'planner', decision, new_progress: newProgress }),
  });
  await refreshCurrentProject();
  return result;
}

export async function importSchedule(file: File, projectId?: string) {
  const form = new FormData();
  form.append('file', file, file.name);
  if (projectId) form.append('project_id', projectId);
  const result = await request('/api/import/schedule', { method: 'POST', body: form });
  const bootstrap = await apiGet(`/api/projects/${result.project_id}/bootstrap`);
  applyBootstrap(bootstrap);
  return result;
}

export async function getSettings(projectId: string) {
  return apiGet(`/api/settings/${projectId}`);
}

export async function saveSettings(projectId: string, settings: Record<string, any>) {
  return request(`/api/settings/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
}

export { API_BASE };
