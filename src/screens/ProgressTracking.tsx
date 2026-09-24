import React from 'react';
import { DISCIPLINES } from '../data';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ProgressTracking() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="page-title">Progress Tracking</div>
        <div className="page-subtitle">Overall and discipline-level actual vs planned progress across the project.</div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'PROJECT ACTUAL', value: '52.0%', sub: 'vs 57.0% planned', color: '#B91C1C' },
          { label: 'ACTIVITIES COMPLETE', value: '34', sub: 'of 246 total activities', color: '#1D4ED8' },
          { label: 'ON TRACK DISCIPLINES', value: '3/6', sub: 'Civil, Electrical, HSE', color: '#15803D' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color, letterSpacing: '-0.02em' }}>{k.value}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Discipline progress bars */}
      <div className="section-card" style={{ padding: 20 }}>
        <div className="section-title" style={{ marginBottom: 16 }}>DISCIPLINE PROGRESS</div>
        {DISCIPLINES.map(d => (
          <div key={d.name} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', minWidth: 130 }}>{d.name}</span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>{d.activities} activities</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                <span style={{ color: '#94A3B8' }}>Plan <strong style={{ color: '#374151' }}>{d.planned}%</strong></span>
                <span style={{ color: '#94A3B8' }}>Actual <strong style={{ color: '#1D4ED8' }}>{d.actual}%</strong></span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: d.variance > 0 ? '#15803D' : '#B91C1C' }}>
                  {d.variance > 0 ? '+' : ''}{d.variance}%
                </span>
              </div>
            </div>
            <div style={{ position: 'relative', height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${d.planned}%`, background: '#CBD5E1', borderRadius: 4 }} />
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${d.actual}%`, background: d.variance >= 0 ? '#1D4ED8' : '#B91C1C', borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="section-card">
        <div className="section-header"><span className="section-title">Planned vs Actual by Discipline</span></div>
        <div style={{ padding: '16px 16px 8px' }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={DISCIPLINES.map(d => ({ name: d.name, Planned: d.planned, Actual: d.actual }))} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 4 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Planned" fill="#CBD5E1" name="Planned" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Actual" fill="#1D4ED8" name="Actual" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
