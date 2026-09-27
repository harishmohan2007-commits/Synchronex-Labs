import React from 'react';

const NAV = [
  { section: null, id: 'overview', label: 'Overview', icon: '⬡' },
  { section: 'PROJECT CONTROLS', id: null, label: null, icon: null },
  { section: null, id: 'schedule', label: 'Schedule', icon: '▤' },
  { section: null, id: 'wbs', label: 'WBS Explorer', icon: '◈' },
  { section: null, id: 'progress', label: 'Progress Tracking', icon: '◎' },
  { section: 'FIELD INTELLIGENCE', id: null, label: null, icon: null },
  { section: null, id: 'ai-capture', label: 'AI Capture', icon: '◆' },
  { section: null, id: 'review-queue', label: 'Review Queue', icon: '◉' },
  { section: null, id: 'imported-reports', label: 'Imported Reports', icon: '▣' },
  { section: 'ANALYTICS', id: null, label: null, icon: null },
  { section: null, id: 'analytics', label: 'Project Analytics', icon: '◫' },
  { section: null, id: 'delay-intelligence', label: 'Delay Intelligence', icon: '◷' },
  { section: null, id: 'project-memory', label: 'Project Memory', icon: '◈' },
  { section: 'GOVERNANCE', id: null, label: null, icon: null },
  { section: null, id: 'audit-trail', label: 'Audit Trail', icon: '◈' },
  { section: 'SYSTEM', id: null, label: null, icon: null },
  { section: null, id: 'settings', label: 'Settings', icon: '◈' },
];

interface Props {
  active: string;
  onNav: (id: string) => void;
  reviewCount: number;
}

export default function Sidebar({ active, onNav, reviewCount }: Props) {
  return (
    <div style={{ width: 256, minWidth: 256, background: '#111827', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32, background: '#1D4ED8', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: 'white', letterSpacing: -1,
            flexShrink: 0
          }}>PB</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.02em' }}>PROJECTBRIDGE</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#6B7280', marginLeft: 42, marginTop: -2 }}>Project Controls Intelligence</div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {NAV.map((item, i) => {
          if (item.section !== null) {
            return <div key={i} className="section-label">{item.section}</div>;
          }
          if (!item.id) return null;
          return (
            <div
              key={item.id}
              className={`sidebar-nav-item ${active === item.id ? 'active' : ''}`}
              onClick={() => onNav(item.id!)}
            >
              <span style={{ fontSize: 12, width: 14, textAlign: 'center', opacity: 0.7 }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.id === 'review-queue' && reviewCount > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: '#B91C1C',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 10,
                  minWidth: 18,
                  textAlign: 'center',
                }}>{reviewCount}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 10, color: '#4B5563', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>PROJECT</div>
        <div style={{ fontSize: 12, color: '#D1D5DB', fontWeight: 500, marginBottom: 2 }}>North Field Gas Processing</div>
        <div style={{ fontSize: 11, color: '#6B7280' }}>Phase 1</div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, background: '#374151', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>PC</div>
          <div>
            <div style={{ fontSize: 11, color: '#D1D5DB', fontWeight: 500 }}>Project Controls Eng.</div>
            <div style={{ fontSize: 10, color: '#6B7280' }}>Logged in</div>
          </div>
        </div>
      </div>
    </div>
  );
}
