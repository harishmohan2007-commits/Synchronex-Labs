import React, { useState } from 'react';
import { REVIEW_QUEUE } from '../data';

interface Props {
  showToast: (msg: string) => void;
}

const CANDIDATES_FOR_RQ001 = [
  { id: 'CIV-022', desc: 'Foundation Block A', conf: 78 },
  { id: 'CIV-023', desc: 'Foundation Block B', conf: 64 },
  { id: 'CIV-021', desc: 'Foundation Preparation', conf: 51 },
];

export default function ReviewQueue({ showToast }: Props) {
  const [selected, setSelected] = useState<string | null>('RQ-001');
  const [resolved, setResolved] = useState<string[]>([]);
  const [chosenActivity, setChosenActivity] = useState<string | null>(null);

  const item = REVIEW_QUEUE.find(r => r.id === selected);

  const handleConfirm = () => {
    if (!item) return;
    setResolved(prev => [...prev, item.id]);
    showToast(`Match confirmed for ${chosenActivity || item.candidate}.`);
    setSelected(null);
    setChosenActivity(null);
  };

  const handleFlag = () => {
    if (!item) return;
    setResolved(prev => [...prev, item.id]);
    showToast('Event flagged as new activity.');
    setSelected(null);
  };

  const handleReject = () => {
    if (!item) return;
    setResolved(prev => [...prev, item.id]);
    showToast('Event rejected and logged.');
    setSelected(null);
  };

  const activeItems = REVIEW_QUEUE.filter(r => !resolved.includes(r.id));

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div className="page-title">Review Queue</div>
        <div className="page-subtitle">Planner validation for ambiguous or unmatched field events.</div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ background: '#FEF3C7', color: '#B45309', borderRadius: 5, padding: '8px 14px', fontSize: 13, fontWeight: 700 }}>
          {activeItems.length} Items Awaiting Review
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="filter-input"><option>All Confidence</option><option>&gt;80%</option><option>60–80%</option><option>&lt;60%</option></select>
          <select className="filter-input"><option>All Disciplines</option><option>Civil</option><option>Piping</option><option>Mechanical</option></select>
          <select className="filter-input"><option>All Issues</option><option>Multiple candidates</option><option>No match</option><option>Granularity</option></select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16 }}>
        <div className="section-card" style={{ overflow: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Field Event</th>
                <th>Candidate</th>
                <th>Confidence</th>
                <th>Issue</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeItems.map(item => (
                <tr
                  key={item.id}
                  onClick={() => setSelected(item.id)}
                  style={{ background: selected === item.id ? '#EFF6FF' : undefined }}
                >
                  <td style={{ maxWidth: 200, fontStyle: 'italic', fontSize: 12, color: '#374151' }}>{item.text}</td>
                  <td>
                    {item.candidate !== '—' ? <span className="activity-id">{item.candidate}</span> : <span style={{ color: '#CBD5E1' }}>—</span>}
                  </td>
                  <td>
                    {item.conf > 0 ? (
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: item.conf >= 80 ? '#15803D' : item.conf >= 70 ? '#B45309' : '#B91C1C' }}>
                        {item.conf}%
                      </span>
                    ) : <span style={{ color: '#CBD5E1' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 12, color: '#64748B' }}>{item.issue}</td>
                  <td>
                    <span className={item.status === 'Unmatched' ? 'status-delayed' : 'status-at-risk'}>{item.status}</span>
                  </td>
                </tr>
              ))}
              {activeItems.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>
                    All items reviewed
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Review detail */}
        {item && !resolved.includes(item.id) ? (
          <div className="section-card" style={{ padding: 20, overflow: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 }}>FIELD STATEMENT</div>
            <div style={{ fontSize: 13, fontStyle: 'italic', color: '#111827', padding: '10px 12px', background: '#F8FAFC', borderRadius: 4, borderLeft: '3px solid #B45309', marginBottom: 16, lineHeight: 1.6 }}>
              {item.text}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#6D28D9', textTransform: 'uppercase', marginBottom: 10 }}>POSSIBLE SCHEDULE ACTIVITIES</div>
            {CANDIDATES_FOR_RQ001.map(c => (
              <div
                key={c.id}
                onClick={() => setChosenActivity(c.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 5, marginBottom: 8, cursor: 'pointer',
                  border: chosenActivity === c.id ? '1.5px solid #1D4ED8' : '1px solid #E2E8F0',
                  background: chosenActivity === c.id ? '#EFF6FF' : 'white',
                }}
              >
                <div style={{ flex: 1 }}>
                  <span className="activity-id">{c.id}</span>
                  <div style={{ fontSize: 12, color: '#374151', marginTop: 3 }}>{c.desc}</div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: c.conf >= 75 ? '#B45309' : '#94A3B8' }}>{c.conf}%</span>
              </div>
            ))}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn-primary" onClick={handleConfirm} disabled={!chosenActivity && item.candidate === '—'}>
                ✓ Confirm Match
              </button>
              <button className="btn-secondary" onClick={() => setChosenActivity(null)}>⊙ Choose Different Activity</button>
              <button className="btn-secondary" onClick={handleFlag}>+ Flag as New Activity</button>
              <button className="btn-danger" onClick={handleReject}>✕ Reject Event</button>
            </div>
            <div style={{ marginTop: 14, padding: '8px 10px', background: '#FFF7ED', borderRadius: 4, border: '1px solid #FED7AA', fontSize: 11, color: '#92400E' }}>
              Unmatched events are never silently discarded. All rejections are logged in the Audit Trail.
            </div>
          </div>
        ) : (
          <div className="section-card" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13 }}>
            Select a queue item to review
          </div>
        )}
      </div>
    </div>
  );
}
