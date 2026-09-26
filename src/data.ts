export const ACTIVITIES = [
  { id: 'PIP-245', wbs: 'L5', desc: 'Erect Line 24-XX', discipline: 'Piping', planStart: '20 Sep', planFinish: '25 Sep', actStart: '21 Sep', actFinish: '—', progress: 70, status: 'In Progress', aiConf: 96 },
  { id: 'PIP-246', wbs: 'L5', desc: 'Erect Line 25-XX', discipline: 'Piping', planStart: '22 Sep', planFinish: '28 Sep', actStart: '23 Sep', actFinish: '—', progress: 20, status: 'In Progress', aiConf: 91 },
  { id: 'PIP-251', wbs: 'L5', desc: 'Weld Line 24-XX', discipline: 'Piping', planStart: '26 Sep', planFinish: '30 Sep', actStart: '—', actFinish: '—', progress: 0, status: 'Planned', aiConf: 0 },
  { id: 'PIP-252', wbs: 'L5', desc: 'Weld Line 25-XX', discipline: 'Piping', planStart: '29 Sep', planFinish: '04 Oct', actStart: '—', actFinish: '—', progress: 0, status: 'Planned', aiConf: 0 },
  { id: 'PIP-260', wbs: 'L6', desc: 'Spool 24-A Erection', discipline: 'Piping', planStart: '20 Sep', planFinish: '22 Sep', actStart: '21 Sep', actFinish: '23 Sep', progress: 100, status: 'Completed', aiConf: 98 },
  { id: 'PIP-261', wbs: 'L6', desc: 'Spool 24-B Erection', discipline: 'Piping', planStart: '22 Sep', planFinish: '24 Sep', actStart: '22 Sep', actFinish: '—', progress: 60, status: 'In Progress', aiConf: 94 },
  { id: 'PIP-262', wbs: 'L6', desc: 'Spool 24-C Erection', discipline: 'Piping', planStart: '23 Sep', planFinish: '25 Sep', actStart: '—', actFinish: '—', progress: 0, status: 'Planned', aiConf: 0 },
  { id: 'CIV-022', wbs: 'L5', desc: 'Foundation Block A', discipline: 'Civil', planStart: '18 Sep', planFinish: '26 Sep', actStart: '18 Sep', actFinish: '—', progress: 70, status: 'In Progress', aiConf: 88 },
  { id: 'CIV-023', wbs: 'L5', desc: 'Foundation Block B', discipline: 'Civil', planStart: '20 Sep', planFinish: '28 Sep', actStart: '21 Sep', actFinish: '—', progress: 45, status: 'In Progress', aiConf: 81 },
  { id: 'CIV-021', wbs: 'L5', desc: 'Foundation Preparation', discipline: 'Civil', planStart: '15 Sep', planFinish: '19 Sep', actStart: '15 Sep', actFinish: '19 Sep', progress: 100, status: 'Completed', aiConf: 99 },
  { id: 'CIV-030', wbs: 'L5', desc: 'Structural Steel Erection A', discipline: 'Civil', planStart: '25 Sep', planFinish: '02 Oct', actStart: '—', actFinish: '—', progress: 0, status: 'Planned', aiConf: 0 },
  { id: 'ELE-014', wbs: 'L5', desc: 'Cable Laying — Substation A', discipline: 'Electrical', planStart: '24 Sep', planFinish: '29 Sep', actStart: '24 Sep', actFinish: '—', progress: 15, status: 'In Progress', aiConf: 91 },
  { id: 'ELE-015', wbs: 'L5', desc: 'Cable Laying — Substation B', discipline: 'Electrical', planStart: '26 Sep', planFinish: '01 Oct', actStart: '—', actFinish: '—', progress: 0, status: 'Planned', aiConf: 0 },
  { id: 'ELE-020', wbs: 'L5', desc: 'Panel Installation MCC-1', discipline: 'Electrical', planStart: '22 Sep', planFinish: '27 Sep', actStart: '22 Sep', actFinish: '—', progress: 80, status: 'In Progress', aiConf: 95 },
  { id: 'ELE-021', wbs: 'L5', desc: 'Panel Installation MCC-2', discipline: 'Electrical', planStart: '25 Sep', planFinish: '30 Sep', actStart: '—', actFinish: '—', progress: 0, status: 'Planned', aiConf: 0 },
  { id: 'MECH-018', wbs: 'L5', desc: 'Pump Set Installation P-101', discipline: 'Mechanical', planStart: '21 Sep', planFinish: '25 Sep', actStart: '22 Sep', actFinish: '—', progress: 55, status: 'In Progress', aiConf: 73 },
  { id: 'MECH-019', wbs: 'L5', desc: 'Pump Set Installation P-102', discipline: 'Mechanical', planStart: '24 Sep', planFinish: '28 Sep', actStart: '—', actFinish: '—', progress: 0, status: 'Planned', aiConf: 0 },
  { id: 'MECH-025', wbs: 'L5', desc: 'Compressor Skid Alignment', discipline: 'Mechanical', planStart: '22 Sep', planFinish: '26 Sep', actStart: '22 Sep', actFinish: '—', progress: 40, status: 'In Progress', aiConf: 87 },
  { id: 'INST-041', wbs: 'L5', desc: 'Instrument Hook-Up — Zone 1', discipline: 'Instrumentation', planStart: '23 Sep', planFinish: '28 Sep', actStart: '24 Sep', actFinish: '—', progress: 25, status: 'In Progress', aiConf: 82 },
  { id: 'INST-042', wbs: 'L5', desc: 'Instrument Hook-Up — Zone 2', discipline: 'Instrumentation', planStart: '26 Sep', planFinish: '01 Oct', actStart: '—', actFinish: '—', progress: 0, status: 'Planned', aiConf: 0 },
  { id: 'INST-045', wbs: 'L5', desc: 'Control Room Cabling', discipline: 'Instrumentation', planStart: '20 Sep', planFinish: '25 Sep', actStart: '20 Sep', actFinish: '—', progress: 65, status: 'In Progress', aiConf: 89 },
  { id: 'HSE-010', wbs: 'L5', desc: 'Fire Detection Installation', discipline: 'HSE', planStart: '19 Sep', planFinish: '24 Sep', actStart: '19 Sep', actFinish: '24 Sep', progress: 100, status: 'Completed', aiConf: 97 },
  { id: 'HSE-011', wbs: 'L5', desc: 'Gas Detection Installation', discipline: 'HSE', planStart: '22 Sep', planFinish: '27 Sep', actStart: '22 Sep', actFinish: '—', progress: 80, status: 'In Progress', aiConf: 95 },
  { id: 'HSE-012', wbs: 'L5', desc: 'Emergency Shower Installation', discipline: 'HSE', planStart: '24 Sep', planFinish: '26 Sep', actStart: '24 Sep', actFinish: '—', progress: 60, status: 'In Progress', aiConf: 88 },
];

export const DISCIPLINES = [
  { name: 'Civil', activities: 42, planned: 63, actual: 68, variance: +5, status: 'On Track', milestones: 6, nextMilestone: 'Foundation Block B pour', varianceNote: 'Running ahead on early foundation work; sequencing buffer may be reallocated to Piping.' },
  { name: 'Piping', activities: 58, planned: 57, actual: 51, variance: -6, status: 'At Risk', milestones: 8, nextMilestone: 'Line 25 erection', varianceNote: 'Spool delivery delays on Line 25 are the primary driver of the variance.' },
  { name: 'Mechanical', activities: 38, planned: 49, actual: 46, variance: -3, status: 'At Risk', milestones: 5, nextMilestone: 'Pump Set P-102 installation', varianceNote: 'Minor slippage from compressor skid alignment rework.' },
  { name: 'Electrical', activities: 36, planned: 54, actual: 55, variance: +1, status: 'On Track', milestones: 4, nextMilestone: 'Panel Installation MCC-2', varianceNote: 'Tracking to plan; no material or manpower constraints reported.' },
  { name: 'Instrumentation', activities: 31, planned: 45, actual: 39, variance: -6, status: 'Delayed', milestones: 4, nextMilestone: 'Zone 2 instrument hook-up', varianceNote: 'Awaiting cable tray completion from Electrical before hook-up can proceed.' },
  { name: 'HSE', activities: 41, planned: 79, actual: 82, variance: +3, status: 'On Track', milestones: 3, nextMilestone: 'Emergency shower commissioning', varianceNote: 'Ahead of plan; commissioning walkdown scheduled early.' },
];

export const FIELD_EVENTS = [
  { time: '09:42', status: 'AI MATCHED', text: '"Line 24 spool erection completed."', actId: 'PIP-245', actDesc: 'Erect Line 24-XX', conf: 96 },
  { time: '09:31', status: 'AI MATCHED', text: '"Cable laying started in Substation A."', actId: 'ELE-014', actDesc: 'Cable Laying — Substation A', conf: 91 },
  { time: '09:18', status: 'REVIEW REQUIRED', text: '"Foundation work nearly complete."', actId: 'CIV-022/CIV-023', actDesc: 'Multiple candidates', conf: 78 },
  { time: '08:55', status: 'AI MATCHED', text: '"MCC-1 panel installation 80% done."', actId: 'ELE-020', actDesc: 'Panel Installation MCC-1', conf: 95 },
  { time: '08:40', status: 'AI MATCHED', text: '"Pump P-101 alignment in progress."', actId: 'MECH-018', actDesc: 'Pump Set Installation P-101', conf: 87 },
];

export const REVIEW_QUEUE = [
  { id: 'RQ-001', text: '"Foundation work nearly complete"', candidate: 'CIV-022', conf: 78, issue: 'Multiple candidates', status: 'Review' },
  { id: 'RQ-002', text: '"Pump installation progressing"', candidate: 'MECH-018', conf: 73, issue: 'Granularity mismatch', status: 'Review' },
  { id: 'RQ-003', text: '"Valve assembly finished"', candidate: '—', conf: 0, issue: 'No matching activity', status: 'Unmatched' },
  { id: 'RQ-004', text: '"Trench backfilling started near gate"', candidate: 'CIV-035', conf: 69, issue: 'Low confidence', status: 'Review' },
  { id: 'RQ-005', text: '"Instrument calibration checks done"', candidate: 'INST-041', conf: 74, issue: 'Partial match', status: 'Review' },
  { id: 'RQ-006', text: '"Gasket replacement on flange 14"', candidate: '—', conf: 0, issue: 'No matching activity', status: 'Unmatched' },
  { id: 'RQ-007', text: '"Structural anchor bolt inspection"', candidate: 'CIV-030', conf: 71, issue: 'Scope ambiguity', status: 'Review' },
  { id: 'RQ-008', text: '"Control panel testing initiated"', candidate: 'ELE-020', conf: 76, issue: 'Multiple candidates', status: 'Review' },
  { id: 'RQ-009', text: '"Scaffold erection near furnace area"', candidate: '—', conf: 0, issue: 'No matching activity', status: 'Unmatched' },
  { id: 'RQ-010', text: '"Gas detection sensor placement"', candidate: 'HSE-011', conf: 75, issue: 'Low confidence', status: 'Review' },
  { id: 'RQ-011', text: '"Compressor base plate grouting"', candidate: 'MECH-025', conf: 77, issue: 'Partial match', status: 'Review' },
  { id: 'RQ-012', text: '"Electrical earthing connection point A"', candidate: 'ELE-015', conf: 72, issue: 'Low confidence', status: 'Review' },
];

export const AUDIT_TRAIL = [
  { ts: '23 Sep 09:42', actor: 'AI', action: 'Progress Update', activity: 'PIP-245', source: 'Daily Report', prev: '60%', next: '70%', conf: 96 },
  { ts: '23 Sep 09:45', actor: 'Planner', action: 'Match Approved', activity: 'CIV-022', source: 'Review Queue', prev: 'Unmatched', next: 'Linked', conf: 78 },
  { ts: '23 Sep 09:50', actor: 'AI', action: 'Activity Linked', activity: 'ELE-014', source: 'Site Diary', prev: '0%', next: '15%', conf: 91 },
  { ts: '23 Sep 09:52', actor: 'Planner', action: 'Progress Updated', activity: 'MECH-018', source: 'Manual Entry', prev: '40%', next: '55%', conf: 0 },
  { ts: '23 Sep 10:05', actor: 'AI', action: 'Progress Update', activity: 'ELE-020', source: 'Daily Report', prev: '65%', next: '80%', conf: 95 },
  { ts: '23 Sep 10:11', actor: 'Planner', action: 'Event Flagged', activity: 'RQ-003', source: 'Review Queue', prev: '—', next: 'Unmatched', conf: 0 },
  { ts: '23 Sep 10:22', actor: 'AI', action: 'Progress Update', activity: 'PIP-261', source: 'Daily Report', prev: '40%', next: '60%', conf: 94 },
  { ts: '23 Sep 10:35', actor: 'System', action: 'Report Processed', activity: 'Multiple', source: 'File Import', prev: '—', next: '38 events', conf: 0 },
];

export const PROGRESS_TREND = [
  { date: '01 Sep', planned: 28, actual: 26 },
  { date: '05 Sep', planned: 33, actual: 31 },
  { date: '10 Sep', planned: 39, actual: 37 },
  { date: '15 Sep', planned: 44, actual: 43 },
  { date: '18 Sep', planned: 48, actual: 46 },
  { date: '20 Sep', planned: 51, actual: 48 },
  { date: '23 Sep', planned: 57, actual: 52 },
];

export const DELAY_CAUSES = [
  { cause: 'Material', pct: 31 },
  { cause: 'Manpower', pct: 22 },
  { cause: 'Weather', pct: 17 },
  { cause: 'Inspection', pct: 14 },
  { cause: 'Equipment', pct: 9 },
  { cause: 'Other', pct: 7 },
];

export const DELAY_TREND = [
  { month: 'Jul', Material: 8, Manpower: 5, Weather: 4, Inspection: 3 },
  { month: 'Aug', Material: 10, Manpower: 7, Weather: 6, Inspection: 4 },
  { month: 'Sep', Material: 13, Manpower: 10, Weather: 7, Inspection: 7 },
];

export const MEMORY_ACTIVITIES = [
  { type: 'Pipe Erection', baselineAvg: '5 days', actualAvg: '7.2 days', variance: '+2.2 days', occurrences: 42 },
  { type: 'Foundation Work', baselineAvg: '8 days', actualAvg: '9.4 days', variance: '+1.4 days', occurrences: 31 },
  { type: 'Cable Installation', baselineAvg: '4 days', actualAvg: '5.1 days', variance: '+1.1 days', occurrences: 27 },
  { type: 'Instrument Hook-Up', baselineAvg: '6 days', actualAvg: '8.3 days', variance: '+2.3 days', occurrences: 18 },
  { type: 'Equipment Alignment', baselineAvg: '3 days', actualAvg: '4.2 days', variance: '+1.2 days', occurrences: 22 },
  { type: 'Structural Steel', baselineAvg: '10 days', actualAvg: '12.1 days', variance: '+2.1 days', occurrences: 15 },
];

export const MEMORY_OCCURRENCES: Record<string, Array<{
  id: string;
  date: string;
  activity: string;
  baseline: string;
  actual: string;
  drift: string;
  cause: string;
  source: string;
  status: string;
  location: string;
  discipline: string;
  evidence: string;
}>> = {
  'Pipe Erection': [
    { id:'MEM-PE-042', date:'23 Sep 2026', activity:'P-101 Spool A Erection', baseline:'5 days', actual:'7 days', drift:'+2 days', cause:'Material availability', source:'Daily Progress Report', status:'Validated', location:'P-101 Pipe Rack', discipline:'Piping', evidence:'Piping crew completed spool erection after material release.' },
    { id:'MEM-PE-041', date:'21 Sep 2026', activity:'P-101 Spool B Erection', baseline:'5 days', actual:'6 days', drift:'+1 day', cause:'Crew sequencing', source:'Site Diary', status:'Validated', location:'P-101 Pipe Rack', discipline:'Piping', evidence:'Spool B erection progressed after crew handover from adjacent work front.' },
    { id:'MEM-PE-038', date:'18 Sep 2026', activity:'Line 24 Spool Erection', baseline:'5 days', actual:'8 days', drift:'+3 days', cause:'Material availability', source:'Supervisor Report', status:'Validated', location:'Line 24 Corridor', discipline:'Piping', evidence:'Delivery of remaining spool supports delayed the erection sequence.' },
    { id:'MEM-PE-031', date:'14 Sep 2026', activity:'Line 18 Spool Erection', baseline:'5 days', actual:'7 days', drift:'+2 days', cause:'Access constraint', source:'Daily Progress Report', status:'Validated', location:'Line 18 Corridor', discipline:'Piping', evidence:'Access was restricted while civil works were completed in the same work front.' },
  ],
  'Foundation Work': [
    { id:'MEM-FW-031', date:'22 Sep 2026', activity:'Foundation Block A', baseline:'8 days', actual:'10 days', drift:'+2 days', cause:'Concrete pour sequencing', source:'Daily Progress Report', status:'Validated', location:'Foundation Zone A', discipline:'Civil', evidence:'Pour sequence was adjusted to accommodate inspection hold points.' },
    { id:'MEM-FW-027', date:'19 Sep 2026', activity:'Foundation Block B', baseline:'8 days', actual:'9 days', drift:'+1 day', cause:'Rebar availability', source:'Site Diary', status:'Validated', location:'Foundation Zone B', discipline:'Civil', evidence:'Rebar delivery was received later than the planned work-front release.' },
    { id:'MEM-FW-024', date:'16 Sep 2026', activity:'Pump Foundation P-201', baseline:'8 days', actual:'10 days', drift:'+2 days', cause:'Inspection hold', source:'Inspection Report', status:'Validated', location:'Pump Area', discipline:'Civil', evidence:'Inspection hold delayed the final concrete pour.' },
    { id:'MEM-FW-019', date:'12 Sep 2026', activity:'Equipment Foundation E-04', baseline:'8 days', actual:'8 days', drift:'0 days', cause:'No delay', source:'Daily Progress Report', status:'Validated', location:'Equipment Area', discipline:'Civil', evidence:'Foundation completed within baseline duration.' },
  ],
  'Cable Installation': [
    { id:'MEM-CI-027', date:'23 Sep 2026', activity:'Substation A Cable Laying', baseline:'4 days', actual:'5 days', drift:'+1 day', cause:'Cable route congestion', source:'Daily Progress Report', status:'Validated', location:'Substation A', discipline:'Electrical', evidence:'Existing temporary services constrained the cable route.' },
    { id:'MEM-CI-024', date:'20 Sep 2026', activity:'Substation B Cable Laying', baseline:'4 days', actual:'6 days', drift:'+2 days', cause:'Tray readiness', source:'Site Diary', status:'Validated', location:'Substation B', discipline:'Electrical', evidence:'Cable tray handover was later than the planned work-front date.' },
    { id:'MEM-CI-021', date:'17 Sep 2026', activity:'MCC-1 Cable Installation', baseline:'4 days', actual:'4 days', drift:'0 days', cause:'No delay', source:'Daily Progress Report', status:'Validated', location:'MCC Room', discipline:'Electrical', evidence:'Installation completed to baseline duration.' },
    { id:'MEM-CI-018', date:'13 Sep 2026', activity:'Control Room Cable Laying', baseline:'4 days', actual:'5 days', drift:'+1 day', cause:'Access constraint', source:'Supervisor Report', status:'Validated', location:'Control Room', discipline:'Electrical', evidence:'Access was restricted during concurrent panel installation.' },
  ],
  'Instrument Hook-Up': [
    { id:'MEM-IH-018', date:'22 Sep 2026', activity:'Zone 1 Instrument Hook-Up', baseline:'6 days', actual:'8 days', drift:'+2 days', cause:'Cable tray readiness', source:'Daily Progress Report', status:'Validated', location:'Process Area Zone 1', discipline:'Instrumentation', evidence:'Hook-up started after late cable-tray handover.' },
    { id:'MEM-IH-015', date:'19 Sep 2026', activity:'Zone 2 Instrument Hook-Up', baseline:'6 days', actual:'9 days', drift:'+3 days', cause:'Material availability', source:'Site Diary', status:'Validated', location:'Process Area Zone 2', discipline:'Instrumentation', evidence:'Junction-box accessories were released in batches.' },
    { id:'MEM-IH-012', date:'15 Sep 2026', activity:'Compressor Instrument Hook-Up', baseline:'6 days', actual:'8 days', drift:'+2 days', cause:'Inspection hold', source:'Inspection Report', status:'Validated', location:'Compressor Area', discipline:'Instrumentation', evidence:'Inspection release was required before final terminations.' },
    { id:'MEM-IH-009', date:'11 Sep 2026', activity:'Utility Instrument Hook-Up', baseline:'6 days', actual:'8 days', drift:'+2 days', cause:'Crew sequencing', source:'Supervisor Report', status:'Validated', location:'Utility Area', discipline:'Instrumentation', evidence:'Instrumentation crew was reassigned to a priority work front.' },
  ],
  'Equipment Alignment': [
    { id:'MEM-EA-022', date:'21 Sep 2026', activity:'P-201 Pump Alignment', baseline:'3 days', actual:'4 days', drift:'+1 day', cause:'Baseplate rework', source:'Daily Progress Report', status:'Validated', location:'Pump Area', discipline:'Mechanical', evidence:'Baseplate correction was completed before final alignment.' },
    { id:'MEM-EA-019', date:'18 Sep 2026', activity:'P-202 Pump Alignment', baseline:'3 days', actual:'5 days', drift:'+2 days', cause:'Survey recheck', source:'Site Diary', status:'Validated', location:'Pump Area', discipline:'Mechanical', evidence:'Survey readings required a second alignment cycle.' },
    { id:'MEM-EA-015', date:'15 Sep 2026', activity:'Compressor Skid Alignment', baseline:'3 days', actual:'4 days', drift:'+1 day', cause:'Foundation tolerance', source:'Supervisor Report', status:'Validated', location:'Compressor Area', discipline:'Mechanical', evidence:'Final shimming was required to meet tolerance.' },
    { id:'MEM-EA-011', date:'11 Sep 2026', activity:'Fan Skid Alignment', baseline:'3 days', actual:'4 days', drift:'+1 day', cause:'Access constraint', source:'Daily Progress Report', status:'Validated', location:'Utility Area', discipline:'Mechanical', evidence:'Lifting access was shared with adjacent equipment work.' },
  ],
  'Structural Steel': [
    { id:'MEM-SS-015', date:'20 Sep 2026', activity:'Pipe Rack Steel Erection A', baseline:'10 days', actual:'12 days', drift:'+2 days', cause:'Material availability', source:'Daily Progress Report', status:'Validated', location:'Pipe Rack A', discipline:'Structural', evidence:'Steel member delivery was staggered across the work front.' },
    { id:'MEM-SS-012', date:'16 Sep 2026', activity:'Pipe Rack Steel Erection B', baseline:'10 days', actual:'13 days', drift:'+3 days', cause:'Crane access', source:'Site Diary', status:'Validated', location:'Pipe Rack B', discipline:'Structural', evidence:'Crane access was constrained by concurrent civil works.' },
    { id:'MEM-SS-009', date:'13 Sep 2026', activity:'Equipment Platform Steel', baseline:'10 days', actual:'11 days', drift:'+1 day', cause:'Bolt inspection', source:'Inspection Report', status:'Validated', location:'Equipment Area', discipline:'Structural', evidence:'Additional bolt inspection extended the handover sequence.' },
    { id:'MEM-SS-006', date:'10 Sep 2026', activity:'Access Platform Steel', baseline:'10 days', actual:'12 days', drift:'+2 days', cause:'Crew sequencing', source:'Supervisor Report', status:'Validated', location:'Process Area', discipline:'Structural', evidence:'Steel crew was sequenced behind priority equipment access.' },
  ],
};

export const DISCIPLINE_PERF = [
  { disc: 'Civil', planned: 63, actual: 68 },
  { disc: 'Piping', planned: 57, actual: 51 },
  { disc: 'Mechanical', planned: 49, actual: 46 },
  { disc: 'Electrical', planned: 54, actual: 55 },
  { disc: 'Instrumentation', planned: 45, actual: 39 },
  { disc: 'HSE', planned: 79, actual: 82 },
];
