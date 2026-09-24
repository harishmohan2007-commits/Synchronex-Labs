import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DISCIPLINES, FIELD_EVENTS, PROGRESS_TREND } from '../data';

interface Props {
  onNav: (s: string) => void;
  pip245Progress: number;
}

const StatusBadge = ({ status }: { status: string }) => {
  const cls = status === 'On Track' ? 'status-on-track' : status === 'At Risk' ? 'status-at-risk' : 'status-delayed';
  return <span className={cls}>{status}</span>;
};

export default function Overview({ onNav, pip245Progress }: Props) {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Project Overview</div>
          <div className="page-subtitle">Real-time visibility from baseline schedule to field execution.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => onNav('imported-reports')}>↑ Import Progress</button>
          <button className="btn-primary" onClick={() => onNav('ai-capture')}>◆ AI Capture</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { label: 'TOTAL ACTIVITIES', value: '246', sub: 'L5/L6 executable activities', color: '#374151' },
          { label: 'ACTUAL PROGRESS', value: `${pip245Progress >= 70 ? '52.3' : '52.0'}%`, sub: 'Overall project actual', color: '#1D4ED8' },
          { label: 'PLANNED PROGRESS', value: '57.0%', sub: 'Baseline target today', color: '#374151' },
          { label: 'SCHEDULE VARIANCE', value: pip245Progress >= 70 ? '-4.7%' : '-5.0%', sub: 'vs planned', color: pip245Progress >= 70 ? '#B45309' : '#B91C1C' },
          { label: 'REVIEW QUEUE', value: '12', sub: 'Requires planner validation', color: '#B45309' },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card" style={{ cursor: i === 4 ? 'pointer' : 'default' }} onClick={() => i === 4 ? onNav('review-queue') : null}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: kpi.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Progress + Discipline row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16 }}>
        {/* Baseline vs Actual */}
        <div className="section-card">
          <div className="section-header">
            <span className="section-title">Baseline vs Actual Progress</span>
          </div>
          <div style={{ padding: '20px' }}>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={PROGRESS_TREND} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[20, 65]} />
                <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 4 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="planned" stroke="#94A3B8" strokeWidth={1.5} dot={false} name="Planned" strokeDasharray="4 2" />
                <Line type="monotone" dataKey="actual" stroke="#1D4ED8" strokeWidth={2} dot={false} name="Actual" />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
              {[
                { l: 'Planned', v: '57%', c: '#64748B' },
                { l: 'Actual', v: `${pip245Progress >= 70 ? '52.3' : '52.0'}%`, c: '#1D4ED8' },
                { l: 'Variance', v: pip245Progress >= 70 ? '-4.7%' : '-5.0%', c: '#B91C1C' },
              ].map(m => (
                <div key={m.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: m.c }}>{m.v}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
              {[
                { l: 'Planned completion', v: '30 Sep 2026' },
                { l: 'Forecast', v: pip245Progress >= 70 ? '03 Oct 2026' : '05 Oct 2026' },
              ].map(m => (
                <div key={m.l} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 4, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>{m.l}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 2 }}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Discipline table */}
        <div className="section-card">
          <div className="section-header">
            <span className="section-title">Discipline Progress</span>
          </div>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Discipline</th>
                <th>Activities</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Variance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {DISCIPLINES.map(d => (
                <tr key={d.name}>
                  <td style={{ fontWeight: 500 }}>{d.name}</td>
                  <td style={{ color: '#64748B' }}>{d.activities}</td>
                  <td>{d.planned}%</td>
                  <td style={{ fontWeight: 500 }}>{d.actual}%</td>
                  <td style={{ color: d.variance > 0 ? '#15803D' : '#B91C1C', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {d.variance > 0 ? '+' : ''}{d.variance}%
                  </td>
                  <td><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Field Intelligence */}
      <div className="section-card">
        <div className="section-header">
          <span className="section-title">Recent Field Intelligence</span>
          <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => onNav('ai-capture')}>View All</button>
        </div>
        <div style={{ padding: '0 20px' }}>
          {FIELD_EVENTS.map((ev, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: i < FIELD_EVENTS.length - 1 ? '1px solid #F1F5F9' : 'none', alignItems: 'flex-start' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#94A3B8', width: 36, flexShrink: 0, marginTop: 1 }}>{ev.time}</div>
              <div style={{ flexShrink: 0 }}>
                <span className={ev.status === 'AI MATCHED' ? 'status-ai' : 'status-at-risk'} style={{ fontSize: 10 }}>{ev.status}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#374151', fontStyle: 'italic', marginBottom: 4 }}>{ev.text}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="activity-id">{ev.actId}</span>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{ev.actDesc}</span>
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                {ev.conf > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>Confidence</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: ev.conf >= 90 ? '#15803D' : ev.conf >= 75 ? '#B45309' : '#B91C1C' }}>{ev.conf}%</div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
