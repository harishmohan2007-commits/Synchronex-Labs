import React, { useState } from 'react';

interface Props {
  onNav: (s: string) => void;
  onApproveMatch: () => void;
  showToast: (msg: string) => void;
}

const CANDIDATES = [
  { id: 'PIP-245', desc: 'Erect Line 24-XX', conf: 96, selected: true },
  { id: 'PIP-246', desc: 'Erect Line 25-XX', conf: 34, selected: false },
  { id: 'PIP-251', desc: 'Weld Line 24-XX', conf: 42, selected: false },
];

const EVIDENCE = [
  { label: 'Activity ID similarity', score: 98 },
  { label: 'Description similarity', score: 94 },
  { label: 'Discipline consistency', score: 100 },
  { label: 'Temporal consistency', score: 92 },
  { label: 'Overall confidence', score: 96 },
];

export default function AILinking({ onNav, onApproveMatch, showToast }: Props) {
  const [approved, setApproved] = useState(false);

  const handleApprove = () => {
    setApproved(true);
    onApproveMatch();
    showToast('Execution event linked to PIP-245 successfully.');
    setTimeout(() => onNav('extraction-results'), 1500);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div className="page-title">AI Schedule Linking</div>
          <div className="page-subtitle">Match evidence and reasoning for activity <span className="activity-id" style={{ fontSize: 14 }}>PIP-245</span></div>
        </div>
        <button className="btn-secondary" onClick={() => onNav('extraction-results')}>← Back to Results</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Field execution */}
        <div className="section-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 14 }}>FIELD EXECUTION</div>
          <div style={{ fontSize: 15, color: '#111827', fontStyle: 'italic', lineHeight: 1.7, marginBottom: 16, padding: '12px 14px', background: '#F8FAFC', borderRadius: 5, borderLeft: '3px solid #1D4ED8' }}>
            "Line 24 spool erection completed today."
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { l: 'Source', v: 'Daily Progress Report' },
              { l: 'Date', v: '23 Sep 2026' },
              { l: 'Discipline', v: 'Piping' },
              { l: 'Reporter', v: 'Site Supervisor' },
            ].map(f => (
              <div key={f.l}>
                <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{f.l}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{f.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule candidates */}
        <div className="section-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 14 }}>SCHEDULE CANDIDATES</div>
          {CANDIDATES.map((c, i) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 5, marginBottom: 8,
              background: c.selected ? '#EFF6FF' : '#F8FAFC',
              border: c.selected ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: '#94A3B8', minWidth: 16 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <span className="activity-id">{c.id}</span>
                <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{c.desc}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: c.selected ? '#15803D' : '#94A3B8' }}>{c.conf}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Match evidence */}
      <div className="section-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 14 }}>MATCH EVIDENCE</div>
            {EVIDENCE.map(e => (
              <div key={e.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{e.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: e.score >= 90 ? '#15803D' : '#B45309' }}>{e.score}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${e.score}%`, background: e.score >= 90 ? '#15803D' : '#B45309' }} />
                </div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 14 }}>AI REASONING</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, padding: '14px 16px', background: '#F8FAFC', borderRadius: 5, border: '1px solid #E2E8F0', borderLeft: '3px solid #6D28D9' }}>
              Field description references Line 24 and spool erection. The selected activity belongs to the Piping discipline and represents the corresponding planned erection activity. Temporal context and discipline markers are consistent with the baseline schedule entry.
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {!approved ? (
          <>
            <button className="btn-primary" onClick={handleApprove}>✓ Approve Match</button>
            <button className="btn-secondary">⊙ Select Another</button>
            <button className="btn-secondary" onClick={() => onNav('review-queue')}>→ Send to Review</button>
          </>
        ) : (
          <div style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: 5, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#15803D', display: 'flex', alignItems: 'center', gap: 6 }}>
            ✓ Execution event linked to PIP-245 successfully. Redirecting…
          </div>
        )}
      </div>
    </div>
  );
}
