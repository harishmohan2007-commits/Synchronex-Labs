import React from 'react';

export default function Settings() {
  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <div className="page-title">Settings</div>
        <div className="page-subtitle">System configuration and preferences.</div>
      </div>
      {[
        {
          section: 'PROJECT', items: [
            { label: 'Project Name', value: 'North Field Gas Processing Facility' },
            { label: 'Project ID', value: 'NFGPF-P1-2026', mono: true },
            { label: 'Phase', value: 'Phase 1 — Execution' },
            { label: 'Baseline Revision', value: 'Rev 04' },
          ]
        },
        {
          section: 'AI CONFIGURATION', items: [
            { label: 'Auto-approve threshold', value: '≥ 90%', note: 'Events above this confidence are auto-approved' },
            { label: 'Review threshold', value: '70–89%', note: 'Events in this range go to Review Queue' },
            { label: 'Reject threshold', value: '< 70%', note: 'Events below are flagged as unmatched' },
          ]
        },
        {
          section: 'NOTIFICATIONS', items: [
            { label: 'AI match completions', value: 'Enabled' },
            { label: 'Review queue alerts', value: 'Enabled' },
            { label: 'Schedule variance alerts', value: 'Enabled' },
            { label: 'File import notifications', value: 'Enabled' },
          ]
        },
      ].map(group => (
        <div key={group.section} className="section-card" style={{ marginBottom: 16 }}>
          <div className="section-header"><span className="section-title">{group.section}</span></div>
          <div style={{ padding: '4px 0' }}>
            {group.items.map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '12px 20px', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{item.label}</div>
                  {(item as any).note && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{(item as any).note}</div>}
                </div>
                <div style={{ fontFamily: (item as any).mono ? 'var(--font-mono)' : 'inherit', fontSize: 13, color: '#1D4ED8', fontWeight: 500 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
