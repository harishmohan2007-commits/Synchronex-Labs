import React, { useMemo, useState } from 'react';
import { ACTIVITIES, DISCIPLINES } from '../data';

interface Props {
  rows: typeof ACTIVITIES;
  selectedId: string;
  onSelect: (id: string) => void;
  selected: (typeof ACTIVITIES)[number];
  onImport: () => void;
}

const disciplineMeta: Record<string, { icon: string; accent: string; label: string; milestone: string }> = {
  Civil: { icon: '⌂', accent: '#2b7258', label: 'Civil works', milestone: 'Foundation Block A · 70%' },
  Piping: { icon: '⌁', accent: '#2d6b9b', label: 'Piping systems', milestone: 'Line 24 spool erection · 70%' },
  Mechanical: { icon: '◇', accent: '#72529a', label: 'Mechanical packages', milestone: 'Pump P-101 alignment · 55%' },
  Electrical: { icon: '⌁', accent: '#a65d10', label: 'Electrical systems', milestone: 'MCC-1 panel installation · 80%' },
  Instrumentation: { icon: '◌', accent: '#a74c46', label: 'Instrumentation', milestone: 'Control room cabling · 65%' },
  HSE: { icon: '✦', accent: '#477d63', label: 'Health & safety', milestone: 'Gas detection installation · 80%' },
};

const statusClass = (status: string) => status === 'Completed' ? 'status-completed' : status === 'In Progress' ? 'status-in-progress' : status === 'Delayed' ? 'status-delayed' : 'status-on-track';

export default function Schedule({ rows, selectedId, onSelect, selected, onImport }: Props) {
  const [activeDiscipline, setActiveDiscipline] = useState('Piping');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');

  const disciplineActivities = useMemo(() => rows.filter(a => a.discipline === activeDiscipline), [rows, activeDiscipline]);
  const visibleActivities = disciplineActivities.filter(a => {
    const matchesQuery = !query || `${a.id} ${a.desc}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'All' || a.status === status;
    return matchesQuery && matchesStatus;
  });

  const openDiscipline = (name: string) => {
    setActiveDiscipline(name);
    const first = rows.find(a => a.discipline === name);
    if (first) onSelect(first.id);
  };

  const activeMeta = disciplineMeta[activeDiscipline] || disciplineMeta.Civil;
  const selectedInDiscipline = disciplineActivities.find(a => a.id === selectedId) || disciplineActivities[0];

  return (
    <div className="schedule-page">
      <div className="schedule-content">
        <div className="schedule-hero">
          <div>
            <span className="eyebrow">EXECUTABLE PLAN / DISCIPLINE CONTROL</span>
            <h2>Schedule by discipline</h2>
            <p>Choose a workstream first, then inspect only the L5/L6 activities that belong to it.</p>
          </div>
          <button className="primary-btn" onClick={onImport}>Import schedule ↑</button>
        </div>

        <div className="schedule-toolbar">
          <label className="schedule-search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search within discipline…" /></label>
          <select className="filter-btn" value={status} onChange={e => setStatus(e.target.value)}>
            <option>All</option><option>Planned</option><option>In Progress</option><option>Completed</option><option>Delayed</option>
          </select>
          <span className="schedule-count">{disciplineActivities.length} activities in {activeDiscipline}</span>
        </div>

        <section className="discipline-cards" aria-label="Disciplines">
          {DISCIPLINES.map(d => {
            const meta = disciplineMeta[d.name] || disciplineMeta.Civil;
            const active = d.name === activeDiscipline;
            return (
              <button key={d.name} className={`discipline-card ${active ? 'selected' : ''}`} style={{ '--discipline-accent': meta.accent } as React.CSSProperties} onClick={() => openDiscipline(d.name)} aria-pressed={active}>
                <div className="discipline-card-top">
                  <span className="discipline-icon">{meta.icon}</span>
                  <span className={`discipline-status ${d.status === 'Delayed' ? 'delayed' : d.status === 'At Risk' ? 'risk' : 'track'}`}>{d.status}</span>
                  <span className="discipline-open">{active ? 'OPEN' : 'VIEW'} →</span>
                </div>
                <div className="discipline-card-title"><strong>{d.name}</strong><span>{meta.label}</span></div>
                <div className="discipline-progress-row"><span>Actual</span><b>{d.actual}%</b><span>vs {d.planned}% plan</span></div>
                <div className="discipline-progress"><i style={{ width: `${d.actual}%` }} /></div>
                <div className="discipline-card-metrics"><span><b>{d.activities}</b> activities</span><span className={d.variance < 0 ? 'negative' : 'positive'}>{d.variance > 0 ? '+' : ''}{d.variance}% variance</span></div>
                <div className="discipline-milestone"><small>NEXT MILESTONE</small><strong>{meta.milestone}</strong></div>
              </button>
            );
          })}
        </section>

        <section className="discipline-schedule-panel">
          <div className="discipline-schedule-head">
            <div>
              <span className="eyebrow">SELECTED WORKSTREAM</span>
              <h3>{activeDiscipline} schedule</h3>
              <p>Plan window, actual execution, progress and AI evidence for this discipline.</p>
            </div>
            <div className="discipline-summary"><b>{DISCIPLINES.find(d => d.name === activeDiscipline)?.actual}%</b><span>actual progress</span></div>
          </div>

          <div className="discipline-schedule-body">
            <div className="activity-stack">
              {visibleActivities.map(a => (
                <button key={a.id} className={`activity-card ${selectedInDiscipline?.id === a.id ? 'selected' : ''}`} onClick={() => onSelect(a.id)}>
                  <div className="activity-card-main">
                    <span className="activity-id">{a.id}</span>
                    <strong>{a.desc}</strong>
                    <small>{a.wbs} executable node</small>
                  </div>
                  <div className="activity-window"><small>PLAN</small><span>{a.planStart} → {a.planFinish}</span><small>ACTUAL</small><span>{a.actStart} → {a.actFinish}</span></div>
                  <div className="activity-progress"><div><span>Progress</span><b>{a.progress}%</b></div><div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${a.progress}%`, background: activeMeta.accent }} /></div><StatusBadge status={a.status} /></div>
                  <span className="activity-chevron">→</span>
                </button>
              ))}
              {!visibleActivities.length && <div className="empty-state"><strong>No activities match these filters.</strong><span>Try another search or status.</span></div>}
            </div>

            {selectedInDiscipline && <aside className="schedule-detail-card">
              <div className="detail-kicker">SELECTED ACTIVITY</div>
              <span className="activity-id">{selectedInDiscipline.id}</span>
              <h3>{selectedInDiscipline.desc}</h3>
              <span className={statusClass(selectedInDiscipline.status)}>{selectedInDiscipline.status}</span>
              <div className="detail-progress"><div className="detail-progress-label"><span>Actual progress</span><b>{selectedInDiscipline.progress}%</b></div><div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${selectedInDiscipline.progress}%`, background: activeMeta.accent }} /></div></div>
              <div className="detail-dates"><div><small>PLANNED</small><b>{selectedInDiscipline.planStart}</b><span>{selectedInDiscipline.planFinish}</span></div><div><small>ACTUAL</small><b>{selectedInDiscipline.actStart}</b><span>{selectedInDiscipline.actFinish}</span></div></div>
              {selectedInDiscipline.aiConf > 0 && <div className="detail-evidence"><small>AI LINK</small><strong>{selectedInDiscipline.aiConf}% confidence</strong><span>Evidence is linked to the execution record before schedule application.</span></div>}
              <button className="outline-btn full" onClick={() => onSelect(selectedInDiscipline.id)}>Keep activity selected</button>
            </aside>}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={statusClass(status)}>{status}</span>;
}
