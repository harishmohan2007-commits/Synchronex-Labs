import React, { useState } from 'react';

interface Props {
  onNav: (s: string) => void;
  onAnalyzeComplete: () => void;
}

const STEPS = [
  'INPUT RECEIVED',
  'DISCIPLINE IDENTIFIED',
  'EXECUTION EVENTS EXTRACTED',
  'SCHEDULE ACTIVITIES SEARCHED',
  'MATCH CONFIDENCE CALCULATED',
  'READY FOR REVIEW',
];

const DEFAULT_TEXT = `Piping team completed erection of Line 24 spool section A today. Line 25 erection started at 09:30. Foundation Block A concrete work reached approximately 70%.`;

export default function AICapture({ onNav, onAnalyzeComplete }: Props) {
  const [tab, setTab] = useState<'text' | 'file' | 'supervisor'>('text');
  const [text, setText] = useState(DEFAULT_TEXT);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(-1);

  const handleAnalyze = () => {
    if (!text.trim()) return;
    setProcessing(true);
    setStep(0);
    let s = 0;
    const interval = setInterval(() => {
      s++;
      setStep(s);
      if (s >= STEPS.length - 1) {
        clearInterval(interval);
        setTimeout(() => {
          onAnalyzeComplete();
          onNav('extraction-results');
        }, 600);
      }
    }, 500);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div className="page-title">AI Progress Capture</div>
        <div className="page-subtitle">Convert unstructured field updates into schedule-ready actuals.</div>
      </div>

      {/* Capture method tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden', background: 'white', width: 'fit-content' }}>
        {(['text', 'file', 'supervisor'] as const).map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '9px 20px',
              background: tab === t ? '#1D4ED8' : 'transparent',
              color: tab === t ? 'white' : '#64748B',
              border: 'none',
              borderRight: i < 2 ? '1px solid #E2E8F0' : 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: tab === t ? 600 : 400,
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.15s',
            }}
          >
            {t === 'text' ? 'TEXT REPORT' : t === 'file' ? 'FILE IMPORT' : 'SUPERVISOR UPDATE'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div className="section-card" style={{ padding: 24 }}>
          {tab === 'text' && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>FIELD UPDATE</div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={8}
                style={{
                  width: '100%',
                  border: '1px solid #E2E8F0',
                  borderRadius: 5,
                  padding: '12px 14px',
                  fontSize: 14,
                  color: '#111827',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                  lineHeight: 1.6,
                  background: '#FAFBFC',
                }}
                placeholder="Enter a daily progress statement…"
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn-primary" onClick={handleAnalyze} disabled={processing || !text.trim()}>
                  {processing ? 'Analyzing…' : '◆ Analyze Field Update'}
                </button>
                <button className="btn-secondary" onClick={() => setText('')}>Clear</button>
              </div>
            </>
          )}
          {tab === 'file' && (
            <div style={{ border: '2px dashed #E2E8F0', borderRadius: 6, padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 12, color: '#CBD5E1' }}>↑</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Drag and drop files here</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Supported: XLSX · CSV · PDF · TXT</div>
              <button className="btn-secondary">Browse Files</button>
            </div>
          )}
          {tab === 'supervisor' && (
            <div style={{ color: '#64748B', fontSize: 13, padding: 16 }}>
              <div style={{ fontWeight: 600, color: '#374151', marginBottom: 8 }}>Supervisor Direct Update</div>
              <p>Select a supervisor from the roster and capture their verbal progress update directly.</p>
              <div style={{ marginTop: 16 }}>
                <select className="filter-input" style={{ width: '100%', marginBottom: 12 }}>
                  <option>Select supervisor…</option>
                  <option>Ahmed Al-Rashidi — Piping</option>
                  <option>Ramesh Patel — Civil</option>
                  <option>John Smith — Electrical</option>
                </select>
                <textarea
                  rows={5}
                  className="filter-input"
                  style={{ width: '100%' }}
                  placeholder="Enter supervisor's progress statement…"
                />
                <button className="btn-primary" style={{ marginTop: 8 }}>◆ Analyze Update</button>
              </div>
            </div>
          )}
        </div>

        {/* Processing panel */}
        <div className="section-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>AI PROCESSING</div>
          {STEPS.map((s, i) => (
            <div key={s} className={`processing-step ${step >= i ? 'done' : 'pending'}`}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                background: step >= i ? '#DCFCE7' : '#F1F5F9',
                color: step >= i ? '#15803D' : '#CBD5E1',
              }}>
                {step > i ? '✓' : step === i && processing ? '…' : i + 1}
              </span>
              <span style={{ fontSize: 12 }}>{s}</span>
            </div>
          ))}

          {!processing && step < 0 && (
            <div style={{ marginTop: 20, padding: '12px 14px', background: '#F8FAFC', borderRadius: 5, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>WORKFLOW</div>
              <div style={{ fontSize: 12, color: '#64748B', lineHeight: 2 }}>
                Field Data → AI Extraction → L5/L6 Matching → Confidence → Human Validation → Actuals
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
