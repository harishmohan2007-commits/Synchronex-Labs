import React, { useState } from 'react';

const SCREEN_LABELS: Record<string, string> = {
  overview: 'Overview',
  schedule: 'Schedule',
  wbs: 'WBS Explorer',
  progress: 'Progress Tracking',
  'ai-capture': 'AI Capture',
  'review-queue': 'Review Queue',
  'imported-reports': 'Field Data Intake',
  analytics: 'Project Analytics',
  'delay-intelligence': 'Delay Intelligence',
  'project-memory': 'Project Memory',
  'audit-trail': 'Audit Trail',
  settings: 'Settings',
};

interface Props {
  screen: string;
  onNav: (s: string) => void;
  showNotifications: boolean;
  setShowNotifications: (v: boolean) => void;
}

const NOTIFICATIONS = [
  { text: 'AI linked 29 execution events from Daily Report.', time: '09:42', type: 'ai' },
  { text: '5 events require planner review.', time: '09:42', type: 'warn' },
  { text: 'PIP-245 is behind baseline by 1 day.', time: '09:40', type: 'warn' },
  { text: '3 unmatched field events detected.', time: '09:38', type: 'danger' },
  { text: 'Daily Progress Report processing completed.', time: '09:35', type: 'info' },
  { text: 'Baseline Rev 04 loaded successfully.', time: '08:00', type: 'info' },
];

export default function Header({ screen, onNav, showNotifications, setShowNotifications }: Props) {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const label = SCREEN_LABELS[screen] || screen;

  const RESULTS = [
    { id: 'PIP-245', desc: 'Erect Line 24-XX', type: 'Activity', screen: 'schedule' },
    { id: 'PIP-251', desc: 'Weld Line 24-XX', type: 'Activity', screen: 'schedule' },
    { id: 'EXE-001', desc: '"Line 24 spool erection completed"', type: 'Execution Event', screen: 'ai-capture' },
  ].filter(r => search.length > 1 && (r.id.toLowerCase().includes(search.toLowerCase()) || r.desc.toLowerCase().includes(search.toLowerCase())));

  return (
    <div>
      {/* Main header bar */}
      <div style={{
        height: 52,
        background: 'white',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <span>Projects</span>
          <span>/</span>
          <span>North Field Gas Processing</span>
          <span>/</span>
          <span style={{ color: '#374151', fontWeight: 500 }}>{label}</span>
        </div>

        {/* Search */}
        <div style={{ flex: 1, maxWidth: 360, position: 'relative', margin: '0 auto' }}>
          <div style={{ position: 'relative' }}>
            <input
              className="filter-input"
              style={{ width: '100%', paddingLeft: 32, fontSize: 12 }}
              placeholder="Search activities, reports, WBS…"
              value={search}
              onChange={e => { setSearch(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#94A3B8' }}>⌕</span>
          </div>
          {searchOpen && RESULTS.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'white', border: '1px solid #E2E8F0',
              borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              marginTop: 4, zIndex: 100,
            }}>
              {RESULTS.map(r => (
                <div key={r.id} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9' }}
                  onMouseDown={() => { onNav(r.screen); setSearch(''); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="activity-id">{r.id}</span>
                    <span style={{ fontSize: 12, color: '#374151' }}>{r.desc}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94A3B8' }}>{r.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontSize: 13, color: '#374151', position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span>🔔</span>
            <span style={{ position: 'absolute', top: 3, right: 4, width: 8, height: 8, background: '#B91C1C', borderRadius: '50%', border: '1.5px solid white' }}></span>
          </button>
          <button style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontSize: 13, color: '#374151' }}>?</button>
          <div style={{ width: 30, height: 30, background: '#1D4ED8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', fontWeight: 600, cursor: 'pointer' }}>PC</div>
        </div>
      </div>

      {/* Project context bar */}
      <div style={{
        background: '#F8FAFC',
        borderBottom: '1px solid #E2E8F0',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        fontSize: 12,
      }}>
        <div>
          <span style={{ fontWeight: 600, color: '#111827' }}>North Field Gas Processing Facility — Phase 1</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#64748B' }}>
          <span><span style={{ color: '#94A3B8' }}>Project ID</span> <span className="font-mono" style={{ fontSize: 11, color: '#374151' }}>NFGPF-P1-2026</span></span>
          <span>·</span>
          <span><span style={{ color: '#94A3B8' }}>Status</span> <span style={{ color: '#15803D', fontWeight: 600 }}>Execution</span></span>
          <span>·</span>
          <span><span style={{ color: '#94A3B8' }}>Baseline</span> <span style={{ fontWeight: 500, color: '#374151' }}>Rev 04</span></span>
          <span>·</span>
          <span><span style={{ color: '#94A3B8' }}>Last sync</span> <span style={{ color: '#374151' }}>23 Sep 2026, 09:42</span></span>
        </div>

        {/* Notification panel */}
        {showNotifications && (
          <div style={{
            position: 'fixed', top: 52, right: 0, width: 360,
            background: 'white', border: '1px solid #E2E8F0', borderRadius: '0 0 0 8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Notifications</span>
              <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 16 }}>×</button>
            </div>
            {NOTIFICATIONS.map((n, i) => (
              <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 14, marginTop: 1 }}>
                  {n.type === 'ai' ? '◆' : n.type === 'warn' ? '⚠' : n.type === 'danger' ? '✕' : 'ℹ'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#374151' }}>{n.text}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
