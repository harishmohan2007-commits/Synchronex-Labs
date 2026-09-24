import React, { useState } from 'react';

interface Props {
  onNav: (s: string) => void;
  onApproveMatch: () => void;
  showToast: (msg: string) => void;
}

const EVENTS = [
  {
    id: 'EV01',
    text: '"Piping team completed erection of Line 24 spool section A today."',
    discipline: 'Piping',
    eventType: 'Progress / Completion',
    date: '23 Sep 2026',
    desc: 'Line 24 spool section A erection',
    actId: 'PIP-245',
    actDesc: 'Erect Line 24-XX',
    conf: 96,
    confStatus: 'High Confidence',
  },
  {
    id: 'EV02',
    text: '"Line 25 erection started at 09:30."',
    discipline: 'Piping',
    eventType: 'Progress / Start',
    date: '23 Sep 2026',
    desc: 'Line 25 erection commencement',
    actId: 'PIP-246',
    actDesc: 'Erect Line 25-XX',
    conf: 91,
    confStatus: 'High Confidence',
  },
  {
    id: 'EV03',
    text: '"Foundation Block A concrete work reached approximately 70%."',
    discipline: 'Civil',
    eventType: 'Progress Update',
    date: '23 Sep 2026',
    desc: 'Foundation Block A concrete — ~70% complete',
    actId: 'CIV-022',
    actDesc: 'Foundation Block A',
    conf: 78,
    confStatus: 'Requires Review',
  },
];

export default function ExtractionResults({ onNav, onApproveMatch, showToast }: Props) {
  const [approved, setApproved] = useState<string[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);

  const handleApprove = (id: string, actId: string) => {
    setApproved(prev => [...prev, id]);
    if (actId === 'PIP-245') onApproveMatch();
    showToast(`Execution event linked to ${actId} successfully.`);
  };

  const handleReject = (id: string) => {
    setRejected(prev => [...prev, id]);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div className="page-title">Extraction Results</div>
          <div className="page-subtitle">AI-extracted execution events ready for review and approval.</div>
        </div>
        <button className="btn-secondary" onClick={() => onNav('ai-capture')}>← Back to Capture</button>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: '#EDE9FE', color: '#6D28D9', borderRadius: 5, padding: '8px 14px', fontSize: 13, fontWeight: 700 }}>
          {EVENTS.length} EXECUTION EVENTS DETECTED
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8' }}>
          {approved.length} approved · {rejected.length} rejected · {EVENTS.length - approved.length - rejected.length} pending
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {EVENTS.map((ev, i) => {
          const isApproved = approved.includes(ev.id);
          const isRejected = rejected.includes(ev.id);
          return (
            <div key={ev.id} className="section-card" style={{ opacity: isRejected ? 0.5 : 1 }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>EVENT {String(i + 1).padStart(2, '0')}</span>
                {isApproved && <span className="status-on-track">APPROVED</span>}
                {isRejected && <span className="status-delayed">REJECTED</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, padding: '0' }}>
                {/* Field statement */}
                <div style={{ padding: '16px 20px', borderRight: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 }}>FIELD STATEMENT</div>
                  <div style={{ fontSize: 13, color: '#111827', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 14 }}>{ev.text}</div>
                </div>
                {/* Extracted data */}
                <div style={{ padding: '16px 20px', borderRight: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 }}>EXTRACTED DATA</div>
                  {[
                    { l: 'Discipline', v: ev.discipline },
                    { l: 'Event Type', v: ev.eventType },
                    { l: 'Execution Date', v: ev.date },
                    { l: 'Description', v: ev.desc },
                  ].map(f => (
                    <div key={f.l} style={{ marginBottom: 8, display: 'grid', gridTemplateColumns: '110px 1fr' }}>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>{f.l}</span>
                      <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{f.v}</span>
                    </div>
                  ))}
                </div>
                {/* Schedule link */}
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 }}>SCHEDULE LINK</div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="activity-id" style={{ fontSize: 13 }}>{ev.actId}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{ev.actDesc}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>Confidence</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: ev.conf >= 90 ? '#15803D' : ev.conf >= 75 ? '#B45309' : '#B91C1C' }}>{ev.conf}%</span>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <span className={ev.confStatus === 'High Confidence' ? 'status-on-track' : 'status-at-risk'}>{ev.confStatus}</span>
                  </div>
                  {!isApproved && !isRejected && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn-primary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => handleApprove(ev.id, ev.actId)}>✓ Approve</button>
                      <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => onNav('ai-linking')}>⊙ Inspect Match</button>
                      <button className="btn-danger" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => handleReject(ev.id)}>✕</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
