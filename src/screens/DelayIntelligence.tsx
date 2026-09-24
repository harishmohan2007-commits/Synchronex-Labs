import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DELAY_CAUSES, DELAY_TREND } from '../data';

const COLORS = ['#1D4ED8', '#B45309', '#6D28D9', '#0369A1', '#B91C1C', '#94A3B8'];

export default function DelayIntelligence() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="page-title">Delay Intelligence</div>
        <div className="page-subtitle">Understand recurring causes affecting execution. Demo data only — not based on actual project statistics.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Delay causes pie */}
        <div className="section-card" style={{ padding: 20 }}>
          <div className="section-title" style={{ marginBottom: 16 }}>DELAY CAUSES</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={DELAY_CAUSES} dataKey="pct" nameKey="cause" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                  {DELAY_CAUSES.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 4 }} />
              </PieChart>
            </ResponsiveContainer>
            <div>
              {DELAY_CAUSES.map((c, i) => (
                <div key={c.cause} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, flex: 1, color: '#374151' }}>{c.cause}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: '#111827' }}>{c.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Most affected */}
        <div className="section-card" style={{ padding: 20 }}>
          <div className="section-title" style={{ marginBottom: 16 }}>MOST AFFECTED DISCIPLINES</div>
          {[
            { name: 'Piping', delays: 18, severity: 'High', color: '#B91C1C' },
            { name: 'Mechanical', delays: 12, severity: 'Medium', color: '#B45309' },
            { name: 'Instrumentation', delays: 11, severity: 'Medium', color: '#B45309' },
            { name: 'Civil', delays: 7, severity: 'Low', color: '#15803D' },
          ].map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ width: 4, height: 36, background: d.color, borderRadius: 2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{d.name}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{d.delays} delay events</div>
              </div>
              <span className={d.severity === 'High' ? 'status-delayed' : d.severity === 'Medium' ? 'status-at-risk' : 'status-on-track'}>{d.severity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trend chart */}
      <div className="section-card">
        <div className="section-header"><span className="section-title">Delay Category Trend</span></div>
        <div style={{ padding: '16px 16px 8px' }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={DELAY_TREND} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 4 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Material" fill="#1D4ED8" name="Material" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Manpower" fill="#B45309" name="Manpower" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Weather" fill="#6D28D9" name="Weather" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Inspection" fill="#0369A1" name="Inspection" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recurring patterns */}
      <div className="section-card" style={{ padding: 20 }}>
        <div className="section-title" style={{ marginBottom: 14 }}>RECURRING DELAY PATTERNS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Material availability', freq: 'Most frequent', pct: 31, color: '#B91C1C' },
            { label: 'Inspection delays', freq: 'Recurring', pct: 14, color: '#B45309' },
            { label: 'Manpower constraints', freq: 'Recurring', pct: 22, color: '#B45309' },
          ].map(p => (
            <div key={p.label} style={{ padding: 14, background: '#F8FAFC', borderRadius: 5, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: p.freq === 'Most frequent' ? '#B91C1C' : '#B45309', fontWeight: 500, marginBottom: 10 }}>{p.freq}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: p.color }}>{p.pct}%</div>
              <div style={{ fontSize: 10, color: '#94A3B8' }}>of all delay events</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
