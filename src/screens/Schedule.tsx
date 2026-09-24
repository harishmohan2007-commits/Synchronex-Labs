import React, { useState } from 'react';
import { ACTIVITIES } from '../data';

interface Props {
  selectedActivity: string | null;
  onSelectActivity: (id: string | null) => void;
  pip245Progress: number;
}

const StatusBadge = ({ status }: { status: string }) => {
  const cls = status === 'Completed' ? 'status-completed' : status === 'In Progress' ? 'status-in-progress' : status === 'Delayed' ? 'status-delayed' : 'status-on-track';
  return <span className={cls}>{status}</span>;
};

export default function Schedule({ selectedActivity, onSelectActivity, pip245Progress }: Props) {
  const [search, setSearch] = useState('');
  const [discipline, setDiscipline] = useState('All');
  const [status, setStatus] = useState('All');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const activities = ACTIVITIES.map(a => a.id === 'PIP-245' ? { ...a, progress: pip245Progress } : a);

  const filtered = activities.filter(a => {
    if (search && !a.id.toLowerCase().includes(search.toLowerCase()) && !a.desc.toLowerCase().includes(search.toLowerCase())) return false;
    if (discipline !== 'All' && a.discipline !== discipline) return false;
    if (status !== 'All' && a.status !== status) return false;
    return true;
  });

  const selected = selectedActivity ? activities.find(a => a.id === selectedActivity) : null;

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    const av = (a as any)[sortCol];
    const bv = (b as any)[sortCol];
    if (typeof av === 'number') return sortAsc ? av - bv : bv - av;
    return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const ACTIVITY_EVENTS: Record<string, { date: string; text: string }[]> = {
    'PIP-245': [
      { date: '23 Sep', text: '"Line 24 spool erection completed."' },
      { date: '22 Sep', text: '"Line 24 erection continued."' },
      { date: '21 Sep', text: '"Line 24 erection started."' },
    ],
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="page-title">Schedule Control</div>
            <div className="page-subtitle">Baseline activities and actual execution status.</div>
          </div>
          <button className="btn-secondary">↑ Import Schedule</button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input className="filter-input" placeholder="Search activities..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
          <select className="filter-input" value={discipline} onChange={e => setDiscipline(e.target.value)}>
            <option>All</option>
            {['Civil', 'Piping', 'Mechanical', 'Electrical', 'Instrumentation', 'HSE'].map(d => <option key={d}>{d}</option>)}
          </select>
          <select className="filter-input" value={status} onChange={e => setStatus(e.target.value)}>
            <option>All</option>
            {['Planned', 'In Progress', 'Completed', 'Delayed'].map(s => <option key={s}>{s}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8', alignSelf: 'center' }}>{sorted.length} activities</div>
        </div>

        {/* Table */}
        <div className="section-card" style={{ overflow: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[
                  { key: 'wbs', label: 'WBS' },
                  { key: 'id', label: 'Activity ID' },
                  { key: 'desc', label: 'Description' },
                  { key: 'discipline', label: 'Discipline' },
                  { key: 'planStart', label: 'Plan Start' },
                  { key: 'planFinish', label: 'Plan Finish' },
                  { key: 'actStart', label: 'Act. Start' },
                  { key: 'actFinish', label: 'Act. Finish' },
                  { key: 'progress', label: 'Progress' },
                  { key: 'status', label: 'Status' },
                  { key: 'aiConf', label: 'AI Link' },
                ].map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    {col.label} {sortCol === col.key ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(a => (
                <tr
                  key={a.id}
                  onClick={() => onSelectActivity(selectedActivity === a.id ? null : a.id)}
                  style={{ background: selectedActivity === a.id ? '#EFF6FF' : undefined }}
                >
                  <td><span className="wbs-level">{a.wbs}</span></td>
                  <td><span className="activity-id">{a.id}</span></td>
                  <td style={{ maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.desc}</td>
                  <td style={{ color: '#64748B', fontSize: 12 }}>{a.discipline}</td>
                  <td style={{ color: '#64748B', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{a.planStart}</td>
                  <td style={{ color: '#64748B', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{a.planFinish}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{a.actStart}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{a.actFinish}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar-bg" style={{ width: 60 }}>
                        <div className="progress-bar-fill" style={{ width: `${a.progress}%`, background: a.progress === 100 ? '#15803D' : '#1D4ED8' }} />
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500, color: '#374151', minWidth: 28 }}>{a.progress}%</span>
                    </div>
                  </td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>
                    {a.aiConf > 0 ? (
                      <span className="confidence-badge" style={{ color: a.aiConf >= 90 ? '#15803D' : a.aiConf >= 75 ? '#B45309' : '#94A3B8' }}>
                        {a.aiConf}%
                      </span>
                    ) : <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <>
          <div className="drawer-overlay" onClick={() => onSelectActivity(null)} style={{ position: 'relative', display: 'none' }} />
          <div style={{
            width: 380,
            background: 'white',
            borderLeft: '1px solid #E2E8F0',
            overflow: 'auto',
            flexShrink: 0,
          }}>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <span className="activity-id" style={{ fontSize: 13 }}>{selected.id}</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginTop: 6 }}>{selected.desc}</div>
                </div>
                <button onClick={() => onSelectActivity(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 18, padding: 0 }}>×</button>
              </div>

              {/* WBS Path */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>WBS PATH</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 12, color: '#64748B' }}>
                  {['L1 North Field Gas Processing', 'L2 Piping & Mechanical', 'L3 Process Piping', 'L4 Pipe Installation', `L5 ${selected.desc}`].map((p, i, arr) => (
                    <React.Fragment key={i}>
                      <span style={{ color: i === arr.length - 1 ? '#1D4ED8' : '#64748B', fontWeight: i === arr.length - 1 ? 600 : 400 }}>{p}</span>
                      {i < arr.length - 1 && <span style={{ color: '#CBD5E1' }}>/</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14, marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>PLANNED</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{selected.planStart} 2026</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#64748B' }}>{selected.planFinish} 2026</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>ACTUAL</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{selected.actStart !== '—' ? `${selected.actStart} 2026` : '—'}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{selected.actFinish !== '—' ? `${selected.actFinish} 2026` : 'In Progress'}</div>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>PROGRESS</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="progress-bar-bg" style={{ flex: 1 }}>
                    <div className="progress-bar-fill" style={{ width: `${selected.progress}%`, background: '#1D4ED8' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: '#1D4ED8' }}>{selected.progress}%</span>
                </div>
              </div>

              {selected.aiConf > 0 && (
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>AI LINK STATUS</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#15803D', display: 'inline-block' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#15803D' }}>Linked</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#15803D', fontWeight: 600 }}>{selected.aiConf}% confidence</span>
                  </div>
                </div>
              )}

              {(ACTIVITY_EVENTS[selected.id] || []).length > 0 && (
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 }}>RECENT EXECUTION EVENTS</div>
                  {(ACTIVITY_EVENTS[selected.id] || []).map((e, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#94A3B8', minWidth: 40 }}>{e.date}</span>
                      <span style={{ fontSize: 12, color: '#374151', fontStyle: 'italic' }}>{e.text}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>AUDIT</div>
                {['Created from baseline', selected.aiConf > 0 ? 'AI linked' : null, 'Progress updated', selected.aiConf > 0 ? 'Planner verified' : null].filter(Boolean).map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, fontSize: 12, color: '#64748B' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#CBD5E1', flexShrink: 0 }} />
                    {e}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
