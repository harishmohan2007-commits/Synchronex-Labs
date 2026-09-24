import React, { useState } from 'react';
import { AUDIT_TRAIL } from '../data';

interface Props {
  pip245Approved: boolean;
}

export default function AuditTrail({ pip245Approved }: Props) {
  const [filter, setFilter] = useState('All');

  const extraEntry = pip245Approved ? [{
    ts: '23 Sep 09:43',
    actor: 'AI',
    action: 'Match Approved',
    activity: 'PIP-245',
    source: 'AI Capture',
    prev: '60%',
    next: '70%',
    conf: 96,
  }] : [];

  const allEntries = [...extraEntry, ...AUDIT_TRAIL].filter(e => {
    if (filter === 'AI') return e.actor === 'AI';
    if (filter === 'Human') return e.actor === 'Planner' || e.actor === 'System';
    return true;
  });

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div className="page-title">Audit Trail</div>
        <div className="page-subtitle">Complete traceability of AI and human schedule updates.</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        {['All', 'AI', 'Human'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              background: filter === f ? '#111827' : 'white',
              color: filter === f ? 'white' : '#374151',
              border: filter === f ? '1px solid #111827' : '1px solid #E2E8F0',
            }}
          >{f}</button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8' }}>{allEntries.length} records</div>
      </div>

      <div className="section-card" style={{ overflow: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Activity</th>
              <th>Source</th>
              <th>Previous</th>
              <th>New Value</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {allEntries.map((e, i) => (
              <tr key={i} style={{ background: i === 0 && pip245Approved ? '#F0FDF4' : undefined }}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748B' }}>{e.ts}</td>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 3, fontSize: 11, fontWeight: 600,
                    background: e.actor === 'AI' ? '#EDE9FE' : e.actor === 'System' ? '#F1F5F9' : '#DBEAFE',
                    color: e.actor === 'AI' ? '#6D28D9' : e.actor === 'System' ? '#475569' : '#1D4ED8',
                  }}>
                    {e.actor === 'AI' ? '◆ AI' : e.actor === 'System' ? '⚙ System' : '◎ Planner'}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: '#374151' }}>{e.action}</td>
                <td>
                  {e.activity !== 'Multiple' ? <span className="activity-id">{e.activity}</span> : <span style={{ fontSize: 12, color: '#64748B' }}>{e.activity}</span>}
                </td>
                <td style={{ fontSize: 12, color: '#64748B' }}>{e.source}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#94A3B8' }}>{e.prev}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: '#15803D' }}>{e.next}</td>
                <td>
                  {e.conf > 0 ? (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: e.conf >= 90 ? '#15803D' : e.conf >= 75 ? '#B45309' : '#94A3B8' }}>
                      {e.conf}%
                    </span>
                  ) : <span style={{ color: '#CBD5E1' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
