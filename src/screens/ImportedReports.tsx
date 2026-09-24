import React, { useState } from 'react';

const PIPELINE_STEPS = ['RECEIVED', 'PARSED', 'EXTRACTED', 'MATCHED', 'REVIEWED', 'APPLIED'];

const REPORTS = [
  {
    name: 'Daily_Progress_23_Sep.xlsx',
    rows: 42, extracted: 38, linked: 31, review: 7,
    status: 'Processed', time: '23 Sep 09:35', type: 'XLSX',
  },
  {
    name: 'Piping_Site_Diary_23_Sep.pdf',
    rows: 18, extracted: 15, linked: 12, review: 3,
    status: 'Processed', time: '23 Sep 08:15', type: 'PDF',
  },
  {
    name: 'Civil_Progress_22_Sep.xlsx',
    rows: 25, extracted: 22, linked: 19, review: 3,
    status: 'Processed', time: '22 Sep 18:30', type: 'XLSX',
  },
  {
    name: 'Supervisor_Update_22_Sep.txt',
    rows: 10, extracted: 9, linked: 8, review: 1,
    status: 'Processed', time: '22 Sep 16:10', type: 'TXT',
  },
  {
    name: 'Electrical_Checklist_21_Sep.csv',
    rows: 30, extracted: 28, linked: 26, review: 2,
    status: 'Processed', time: '21 Sep 19:45', type: 'CSV',
  },
];

export default function ImportedReports() {
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<number | null>(0);

  const selReport = selected !== null ? REPORTS[selected] : null;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div className="page-title">Field Data Intake</div>
        <div className="page-subtitle">Import heterogeneous execution information from multiple sources.</div>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); }}
        style={{
          border: `2px dashed ${dragging ? '#2563EB' : '#CBD5E1'}`,
          borderRadius: 8,
          padding: 40,
          textAlign: 'center',
          background: dragging ? '#EFF6FF' : 'white',
          marginBottom: 20,
          transition: 'all 0.15s',
          cursor: 'pointer',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 10, color: '#CBD5E1' }}>↑</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Drag and drop files here</div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Supported formats: XLSX · CSV · PDF · TXT</div>
        <button className="btn-secondary">Browse Files</button>
      </div>

      {/* Processing pipeline */}
      {selReport && (
        <div className="section-card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 16 }}>Processing Pipeline — {selReport.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {PIPELINE_STEPS.map((step, i) => (
              <React.Fragment key={step}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', margin: '0 auto 6px',
                    background: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 12, fontWeight: 700,
                  }}>✓</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#15803D', letterSpacing: '0.05em' }}>{step}</div>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div style={{ height: 2, flex: 0.5, background: '#DCFCE7', margin: '0 4px', marginBottom: 22 }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Reports table */}
      <div className="section-card">
        <div className="section-header">
          <span className="section-title">Recent Imports</span>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>{REPORTS.length} files</div>
        </div>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>File Name</th>
              <th>Type</th>
              <th>Time</th>
              <th>Rows</th>
              <th>Extracted</th>
              <th>Linked</th>
              <th>Review</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {REPORTS.map((r, i) => (
              <tr key={i} onClick={() => setSelected(i)} style={{ background: selected === i ? '#EFF6FF' : undefined }}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500 }}>{r.name}</td>
                <td>
                  <span style={{ background: '#F1F5F9', padding: '1px 6px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 10, color: '#64748B' }}>{r.type}</span>
                </td>
                <td style={{ color: '#64748B', fontSize: 12 }}>{r.time}</td>
                <td>{r.rows}</td>
                <td>{r.extracted}</td>
                <td style={{ color: '#15803D', fontWeight: 600 }}>{r.linked}</td>
                <td style={{ color: '#B45309', fontWeight: 600 }}>{r.review}</td>
                <td><span className="status-on-track">{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
