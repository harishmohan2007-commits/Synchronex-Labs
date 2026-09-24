import React from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell
} from 'recharts';
import { PROGRESS_TREND, DISCIPLINE_PERF } from '../data';

const VARIANCE_DATA = [
  { activity: 'PIP-245', baseline: 5, actual: 6, variance: '+1' },
  { activity: 'CIV-022', baseline: 8, actual: 8, variance: '0' },
  { activity: 'MECH-018', baseline: 4, actual: 4, variance: '0' },
  { activity: 'ELE-014', baseline: 5, actual: 5, variance: '0' },
  { activity: 'INST-045', baseline: 5, actual: 6, variance: '+1' },
];

export default function Analytics() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="page-title">Project Analytics</div>
        <div className="page-subtitle">Schedule performance, discipline output, and AI linking effectiveness.</div>
      </div>

      {/* Planned vs Actual + Discipline in a row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="section-card">
          <div className="section-header"><span className="section-title">Planned vs Actual Progress</span></div>
          <div style={{ padding: '16px 16px 8px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={PROGRESS_TREND} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[20, 65]} />
                <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 4 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="planned" stroke="#94A3B8" strokeWidth={1.5} dot={false} name="Planned" strokeDasharray="4 2" />
                <Line type="monotone" dataKey="actual" stroke="#1D4ED8" strokeWidth={2} dot={{ r: 3, fill: '#1D4ED8' }} name="Actual" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section-card">
          <div className="section-header"><span className="section-title">Discipline Performance</span></div>
          <div style={{ padding: '16px 16px 8px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={DISCIPLINE_PERF} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="disc" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 4 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="planned" fill="#CBD5E1" name="Planned" radius={[2, 2, 0, 0]} />
                <Bar dataKey="actual" fill="#1D4ED8" name="Actual" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Variance table + AI performance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <div className="section-card">
          <div className="section-header"><span className="section-title">Activity Duration Variance</span></div>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Activity</th>
                <th>Baseline Duration</th>
                <th>Actual Duration</th>
                <th>Variance (days)</th>
              </tr>
            </thead>
            <tbody>
              {VARIANCE_DATA.map(r => (
                <tr key={r.activity}>
                  <td><span className="activity-id">{r.activity}</span></td>
                  <td>{r.baseline} days</td>
                  <td>{r.actual} days</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: r.variance.startsWith('+') ? '#B91C1C' : '#15803D' }}>{r.variance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>AI LINKING PERFORMANCE</div>
          {[
            { label: 'Auto Linked', pct: 85, color: '#15803D', bg: '#DCFCE7' },
            { label: 'Planner Review', pct: 12, color: '#B45309', bg: '#FEF3C7' },
            { label: 'Unmatched', pct: 3, color: '#B91C1C', bg: '#FEE2E2' },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#64748B' }}>{item.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: item.color }}>{item.pct}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${item.pct}%`, background: item.color }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 20, padding: '10px 12px', background: '#F8FAFC', borderRadius: 4, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>Total events processed</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>247</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>Last 30 days</div>
          </div>
        </div>
      </div>
    </div>
  );
}
