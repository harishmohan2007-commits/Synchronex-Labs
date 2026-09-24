import React, { useState } from 'react';

type WBSNode = {
  id: string;
  level: string;
  label: string;
  progress?: number;
  status?: string;
  children?: WBSNode[];
};

const WBS_TREE: WBSNode = {
  id: 'L1-NFGPF', level: 'L1', label: 'North Field Gas Processing Facility',
  progress: 52, status: 'In Progress',
  children: [
    {
      id: 'L2-PM', level: 'L2', label: 'Piping & Mechanical',
      progress: 49, status: 'At Risk',
      children: [
        {
          id: 'L3-PP', level: 'L3', label: 'Process Piping',
          progress: 46, status: 'At Risk',
          children: [
            {
              id: 'L4-PI', level: 'L4', label: 'Pipe Installation',
              progress: 45, status: 'At Risk',
              children: [
                {
                  id: 'L5-PIP245', level: 'L5', label: 'Erect Line 24-XX',
                  progress: 70, status: 'In Progress',
                  children: [
                    { id: 'L6-PIP260', level: 'L6', label: 'Spool 24-A', progress: 100, status: 'Completed' },
                    { id: 'L6-PIP261', level: 'L6', label: 'Spool 24-B', progress: 60, status: 'In Progress' },
                    { id: 'L6-PIP262', level: 'L6', label: 'Spool 24-C', progress: 0, status: 'Planned' },
                  ]
                },
                { id: 'L5-PIP246', level: 'L5', label: 'Erect Line 25-XX', progress: 20, status: 'In Progress' },
                { id: 'L5-PIP251', level: 'L5', label: 'Weld Line 24-XX', progress: 0, status: 'Planned' },
              ]
            },
          ]
        },
        {
          id: 'L3-ME', level: 'L3', label: 'Mechanical Equipment',
          progress: 47, status: 'In Progress',
          children: [
            { id: 'L5-MECH018', level: 'L5', label: 'Pump Set Installation P-101', progress: 55, status: 'In Progress' },
            { id: 'L5-MECH025', level: 'L5', label: 'Compressor Skid Alignment', progress: 40, status: 'In Progress' },
          ]
        }
      ]
    },
    {
      id: 'L2-CE', level: 'L2', label: 'Civil & Structural',
      progress: 68, status: 'On Track',
      children: [
        {
          id: 'L3-CF', level: 'L3', label: 'Civil Foundations',
          progress: 72, status: 'On Track',
          children: [
            { id: 'L5-CIV021', level: 'L5', label: 'Foundation Preparation', progress: 100, status: 'Completed' },
            { id: 'L5-CIV022', level: 'L5', label: 'Foundation Block A', progress: 70, status: 'In Progress' },
            { id: 'L5-CIV023', level: 'L5', label: 'Foundation Block B', progress: 45, status: 'In Progress' },
          ]
        },
      ]
    },
    {
      id: 'L2-EI', level: 'L2', label: 'Electrical & Instrumentation',
      progress: 47, status: 'In Progress',
      children: [
        {
          id: 'L3-EL', level: 'L3', label: 'Electrical',
          progress: 55, status: 'On Track',
          children: [
            { id: 'L5-ELE014', level: 'L5', label: 'Cable Laying — Substation A', progress: 15, status: 'In Progress' },
            { id: 'L5-ELE020', level: 'L5', label: 'Panel Installation MCC-1', progress: 80, status: 'In Progress' },
          ]
        },
        {
          id: 'L3-INST', level: 'L3', label: 'Instrumentation',
          progress: 39, status: 'Delayed',
          children: [
            { id: 'L5-INST041', level: 'L5', label: 'Instrument Hook-Up — Zone 1', progress: 25, status: 'In Progress' },
            { id: 'L5-INST045', level: 'L5', label: 'Control Room Cabling', progress: 65, status: 'In Progress' },
          ]
        },
      ]
    },
  ]
};

function TreeNode({ node, depth = 0, selected, onSelect }: {
  node: WBSNode; depth?: number; selected: string | null; onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selected === node.id;

  const statusColor = node.status === 'Completed' ? '#15803D' : node.status === 'On Track' ? '#15803D' : node.status === 'In Progress' ? '#1D4ED8' : node.status === 'At Risk' ? '#B45309' : node.status === 'Delayed' ? '#B91C1C' : '#94A3B8';

  return (
    <div>
      <div
        onClick={() => { if (hasChildren) setExpanded(!expanded); onSelect(node.id); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 12px 7px ' + (8 + depth * 20) + 'px',
          cursor: 'pointer',
          background: isSelected ? '#EFF6FF' : 'transparent',
          borderLeft: isSelected ? '2px solid #1D4ED8' : '2px solid transparent',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'; }}
        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        <span style={{ fontSize: 10, color: '#CBD5E1', width: 12, flexShrink: 0 }}>
          {hasChildren ? (expanded ? '▼' : '▶') : ''}
        </span>
        <span className="wbs-level">{node.level}</span>
        <span style={{ fontSize: 13, fontWeight: depth === 0 ? 700 : depth === 1 ? 600 : 400, color: '#111827', flex: 1 }}>{node.label}</span>
        {node.progress !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="progress-bar-bg" style={{ width: 50 }}>
              <div className="progress-bar-fill" style={{ width: `${node.progress}%`, background: statusColor }} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: statusColor, minWidth: 28 }}>{node.progress}%</span>
          </div>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children!.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

const EVENTS: Record<string, { date: string; text: string; conf: number }[]> = {
  'L5-PIP245': [
    { date: '23 Sep', text: '"Line 24 spool erection completed."', conf: 96 },
    { date: '22 Sep', text: '"Line 24 erection continued."', conf: 94 },
    { date: '21 Sep', text: '"Line 24 erection started."', conf: 96 },
  ],
  'L6-PIP260': [
    { date: '23 Sep', text: '"Spool 24-A erection complete."', conf: 98 },
  ],
};

function NodeDetail({ node }: { node: WBSNode }) {
  const events = EVENTS[node.id] || [];
  return (
    <div style={{ padding: 20, height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 16 }}>
        <span className="wbs-level" style={{ fontSize: 12 }}>{node.level}</span>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginTop: 6 }}>{node.label}</div>
      </div>
      {node.progress !== undefined && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>PROGRESS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="progress-bar-bg" style={{ flex: 1 }}>
              <div className="progress-bar-fill" style={{ width: `${node.progress}%`, background: '#1D4ED8' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: '#1D4ED8' }}>{node.progress}%</span>
          </div>
        </div>
      )}
      {events.length > 0 && (
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 }}>EXECUTION EVENTS</div>
          {events.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, padding: '8px 10px', background: '#F8FAFC', borderRadius: 4, border: '1px solid #E2E8F0' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#94A3B8', minWidth: 40 }}>{e.date}</span>
              <span style={{ fontSize: 12, color: '#374151', fontStyle: 'italic', flex: 1 }}>{e.text}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: '#15803D' }}>{e.conf}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function findNode(node: WBSNode, id: string): WBSNode | null {
  if (node.id === id) return node;
  if (node.children) {
    for (const c of node.children) {
      const found = findNode(c, id);
      if (found) return found;
    }
  }
  return null;
}

export default function WBSExplorer() {
  const [selected, setSelected] = useState<string | null>('L5-PIP245');
  const selectedNode = selected ? findNode(WBS_TREE, selected) : null;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div className="page-title">WBS Explorer</div>
        <div className="page-subtitle">Hierarchical baseline structure from L1 project to L6 executable activities.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: 'calc(100vh - 200px)', minHeight: 500 }}>
        <div className="section-card" style={{ overflow: 'auto' }}>
          <TreeNode node={WBS_TREE} selected={selected} onSelect={setSelected} />
        </div>
        <div className="section-card" style={{ overflow: 'auto' }}>
          {selectedNode ? <NodeDetail node={selectedNode} /> : (
            <div style={{ padding: 24, color: '#94A3B8', fontSize: 13 }}>Select a node to view details.</div>
          )}
        </div>
      </div>
    </div>
  );
}
