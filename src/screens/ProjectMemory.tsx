import React from 'react';
import { MEMORY_ACTIVITIES } from '../data';

export default function ProjectMemory() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="page-title">Project Memory</div>
        <div className="page-subtitle">Preserve structured execution knowledge beyond project closure — institutional intelligence for future planning.</div>
      </div>

      {/* Historical activity performance */}
      <div className="section-card">
        <div className="section-header">
          <span className="section-title">HISTORICAL ACTIVITY PERFORMANCE</span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>North Field Gas Processing Facility — Phase 1</span>
        </div>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Activity Type</th>
              <th>Baseline Avg</th>
              <th>Actual Avg</th>
              <th>Variance</th>
              <th>Occurrences</th>
              <th>Productivity Index</th>
            </tr>
          </thead>
          <tbody>
            {MEMORY_ACTIVITIES.map(a => {
              const baseVal = parseFloat(a.baselineAvg);
              const actVal = parseFloat(a.actualAvg);
              const pi = (baseVal / actVal * 100).toFixed(0);
              return (
                <tr key={a.type}>
                  <td style={{ fontWeight: 500 }}>{a.type}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{a.baselineAvg}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{a.actualAvg}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: '#B91C1C' }}>{a.variance}</td>
                  <td style={{ color: '#64748B' }}>{a.occurrences}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar-bg" style={{ width: 60 }}>
                        <div className="progress-bar-fill" style={{ width: `${pi}%`, background: parseInt(pi) >= 80 ? '#15803D' : '#B45309' }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#374151' }}>{pi}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Recurring delay patterns */}
        <div className="section-card" style={{ padding: 20 }}>
          <div className="section-title" style={{ marginBottom: 14 }}>RECURRING DELAY PATTERNS</div>
          {[
            { label: 'Material availability', freq: 'Most frequent', note: 'Avg 3.2 day delay per occurrence', icon: '⚠' },
            { label: 'Inspection delays', freq: 'Recurring', note: 'Avg 1.8 day delay per occurrence', icon: '⚠' },
            { label: 'Manpower constraints', freq: 'Recurring', note: 'Avg 2.5 day delay per occurrence', icon: '⚠' },
            { label: 'Equipment availability', freq: 'Occasional', note: 'Avg 1.4 day delay per occurrence', icon: 'ℹ' },
          ].map(p => (
            <div key={p.label} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #F1F5F9', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 14, color: p.freq === 'Most frequent' ? '#B91C1C' : p.freq === 'Recurring' ? '#B45309' : '#94A3B8', marginTop: 1 }}>{p.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{p.label}</div>
                <div style={{ fontSize: 11, color: p.freq === 'Most frequent' ? '#B91C1C' : '#B45309', fontWeight: 500 }}>{p.freq}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{p.note}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Discipline productivity */}
        <div className="section-card" style={{ padding: 20 }}>
          <div className="section-title" style={{ marginBottom: 14 }}>DISCIPLINE PRODUCTIVITY</div>
          {[
            { disc: 'Piping', avg: '7.2 days', index: 69 },
            { disc: 'Civil', avg: '9.4 days', index: 85 },
            { disc: 'Electrical', avg: '5.1 days', index: 78 },
            { disc: 'Mechanical', avg: '6.8 days', index: 71 },
            { disc: 'Instrumentation', avg: '8.3 days', index: 72 },
            { disc: 'HSE', avg: '4.2 days', index: 90 },
          ].map(d => (
            <div key={d.disc} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{d.disc}</span>
                  <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 6 }}>avg {d.avg}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: d.index >= 80 ? '#15803D' : '#B45309' }}>{d.index}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${d.index}%`, background: d.index >= 80 ? '#15803D' : '#B45309' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Knowledge export note */}
      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 16, color: '#1D4ED8', marginTop: 1 }}>ℹ</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF', marginBottom: 3 }}>Institutional Knowledge Preservation</div>
          <div style={{ fontSize: 12, color: '#3730A3' }}>
            This data is retained beyond project closure and made available for future similar infrastructure projects. All duration benchmarks, delay patterns, and productivity indices are synthetic demo data. In production, they would be derived from validated actual schedule records.
          </div>
        </div>
      </div>
    </div>
  );
}
