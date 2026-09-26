import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ACTIVITIES, DISCIPLINES, FIELD_EVENTS, REVIEW_QUEUE, AUDIT_TRAIL, MEMORY_ACTIVITIES, PROGRESS_TREND, DELAY_CAUSES } from './data';

type Screen = 'command'|'schedule'|'capture'|'review'|'memory'|'trace'|'import'|'settings';
type Modal = 'help'|'notifications'|'activity'|'confirm'|'profile'|null;

const nav: Array<{id:Screen; num:string; label:string; glyph:string}> = [
  {id:'command',num:'01',label:'Command',glyph:'⌂'},
  {id:'schedule',num:'02',label:'Schedule',glyph:'▤'},
  {id:'capture',num:'03',label:'Capture',glyph:'↗'},
  {id:'review',num:'04',label:'Review',glyph:'!'},
  {id:'memory',num:'05',label:'Memory',glyph:'◌'},
  {id:'trace',num:'06',label:'Trace',glyph:'↳'},
];

const pageMeta: Record<Screen,{eyebrow:string;title:string;subtitle:string}> = {
 command:{eyebrow:'COMMAND / PROJECT CONTROL',title:'Execution command',subtitle:'A decision surface connecting baseline intent, field evidence, and verified actuals.'},
 schedule:{eyebrow:'SCHEDULE / L5–L6',title:'Schedule lattice',subtitle:'Inspect executable work, planned dates, actual dates, progress, and linkage evidence in one view.'},
 capture:{eyebrow:'FIELD INTELLIGENCE / INPUT',title:'Field capture',subtitle:'Convert the language of the site into structured, schedule-ready execution events.'},
 review:{eyebrow:'FIELD INTELLIGENCE / HUMAN GATE',title:'Planner review',subtitle:'Resolve ambiguity before an AI suggestion becomes a trusted schedule actual.'},
 memory:{eyebrow:'KNOWLEDGE / VALIDATED ACTUALS',title:'Institutional memory',subtitle:'Preserve real execution durations, recurring delay causes, and productivity evidence for future planning.'},
 trace:{eyebrow:'GOVERNANCE / PROVENANCE',title:'Trace ledger',subtitle:'Every accepted change carries a source, actor, timestamp, decision, and confidence trail.'},
 import:{eyebrow:'DATA INTAKE / CONTROLLED INGESTION',title:'Import center',subtitle:'Bring heterogeneous project inputs into a visible validation and extraction pipeline.'},
 settings:{eyebrow:'SYSTEM / TRUST CONTROLS',title:'Workspace settings',subtitle:'Define confidence thresholds, project defaults, access, and evidence handling.'},
};

const stages = ['Input received','Discipline identified','Events extracted','Activities searched','Confidence calculated','Ready for review'];

/* ---------------------------------------------------------------------- */
/* Global search: cross-entity index + fuzzy/typo-tolerant ranking        */
/* ---------------------------------------------------------------------- */

type SearchResult = {
  group: string;
  id: string;
  label: string;
  sub: string;
  score: number;
  action: { discipline?: string; activityId?: string; reviewId?: string };
};

function normalize(s: string): string {
  return (s || '').toLowerCase().replace(/["“”]/g, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Exact ID > exact title > prefix/token > substring > typo-tolerant fuzzy. */
function fieldScore(query: string, rawField: string): number {
  if (!rawField) return 0;
  const q = normalize(query), f = normalize(rawField);
  if (!q) return 0;
  if (f === q) return 100;
  if (f.startsWith(q)) return 90;
  const tokensF = f.split(' ');
  const tokensQ = q.split(' ');
  if (tokensQ.every(t => tokensF.some(tf => tf.startsWith(t)))) return 80;
  if (f.includes(q)) return 70;
  const distWhole = levenshtein(q, f.slice(0, q.length + 3));
  const tolerance = Math.max(1, Math.floor(q.length * 0.3));
  if (distWhole <= tolerance) return 55;
  for (const tf of tokensF) {
    const d = levenshtein(q, tf);
    if (d <= Math.max(1, Math.floor(tf.length * 0.34))) return 45;
  }
  return 0;
}

function searchAll(query: string): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const results: SearchResult[] = [];

  ACTIVITIES.forEach(a => {
    const idScore = fieldScore(q, a.id) + (normalize(a.id) === normalize(q) ? 15 : 0);
    const titleScore = fieldScore(q, a.desc);
    const wbsScore = fieldScore(q, `${a.wbs} ${a.discipline} node`);
    const best = Math.max(idScore, titleScore, wbsScore * 0.9);
    if (best > 0) {
      results.push({
        group: 'Activities', id: a.id, label: `${a.id} · ${a.desc}`,
        sub: `${a.discipline} · ${a.wbs} · ${a.progress}% complete · ${a.status}`,
        score: best, action: { discipline: a.discipline, activityId: a.id },
      });
    }
  });

  DISCIPLINES.forEach(d => {
    const s = fieldScore(q, d.name);
    if (s > 0) {
      results.push({
        group: 'Disciplines / WBS', id: d.name, label: d.name,
        sub: `${d.status} · ${d.actual}% actual vs ${d.planned}% planned · next: ${d.nextMilestone}`,
        score: s, action: { discipline: d.name },
      });
    }
  });

  FIELD_EVENTS.forEach((e, i) => {
    const s = Math.max(fieldScore(q, e.text), fieldScore(q, e.actId), fieldScore(q, e.actDesc));
    if (s > 0) {
      const linked = ACTIVITIES.find(a => a.id === e.actId);
      results.push({
        group: 'Field reports / evidence', id: `fe-${i}`, label: e.text.replace(/^"|"$/g, ''),
        sub: `${e.actDesc} · ${e.actId} · ${e.status}`,
        score: s, action: { discipline: linked?.discipline, activityId: linked ? e.actId : undefined },
      });
    }
  });

  REVIEW_QUEUE.forEach(r => {
    const s = Math.max(fieldScore(q, r.text), fieldScore(q, r.candidate), fieldScore(q, r.issue));
    if (s > 0) {
      results.push({
        group: 'Review items', id: r.id, label: r.text.replace(/^"|"$/g, ''),
        sub: `${r.issue} · ${r.candidate !== '—' ? r.candidate : 'Unmatched'} · ${r.status}`,
        score: s, action: { reviewId: r.id },
      });
    }
  });

  return results.sort((a, b) => b.score - a.score).slice(0, 20);
}

function highlight(text: string, q: string): React.ReactNode {
  const query = q.trim();
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(normalize(query).split(' ')[0]);
  if (idx === -1) return text;
  const len = normalize(query).split(' ')[0].length;
  return <>{text.slice(0, idx)}<mark>{text.slice(idx, idx + len)}</mark>{text.slice(idx + len)}</>;
}

function statusAccent(status:string):string{
  if(status==='Delayed') return '#B7352C';
  if(status==='At Risk') return '#A45B13';
  return '#2a6653';
}

export default function App(){
  const [authenticated,setAuthenticated]=useState(false);
  const [authMode,setAuthMode]=useState<'login'|'forgot'>('login');
  const [screen,setScreen]=useState<Screen>('command');
  const [query,setQuery]=useState('');
  const [selectedId,setSelectedId]=useState('PIP-245');
  const [reviewCount,setReviewCount]=useState(REVIEW_QUEUE.length);
  const [reviewIndex,setReviewIndex]=useState<number|null>(null);
  const [resolvedReviewIds,setResolvedReviewIds]=useState<string[]>([]);
  const [toast,setToast]=useState('');
  const [modal,setModal]=useState<Modal>(null);
  const [dirty,setDirty]=useState(false);
  const [captureText,setCaptureText]=useState('Piping team completed erection of Line 24 spool section A today. Line 25 erection started at 09:30. Foundation Block A concrete work reached approximately 70%.');
  const [captureStage,setCaptureStage]=useState(0);
  const [captureBusy,setCaptureBusy]=useState(false);
  const [captureResult,setCaptureResult]=useState(false);
  const [importState,setImportState]=useState<'idle'|'processing'|'success'|'error'>('idle');
  const [importFile,setImportFile]=useState('');
  const [saved,setSaved]=useState(false);
  const [threshold,setThreshold]=useState(90);

  // Global search
  const [searchOpen,setSearchOpen]=useState(false);
  const [searching,setSearching]=useState(false);
  const [activeResult,setActiveResult]=useState(0);
  const searchInputRef=useRef<HTMLInputElement>(null);

  // Schedule discipline selection (lifted so global search can jump into it)
  const [scheduleDiscipline,setScheduleDiscipline]=useState('All');

  // Activity detail modal target
  const [detailId,setDetailId]=useState<string|null>(null);

  const selected=ACTIVITIES.find(a=>a.id===selectedId) || ACTIVITIES[0];
  const openReviewQueue=useMemo(()=>REVIEW_QUEUE.filter(r=>!resolvedReviewIds.includes(r.id)),[resolvedReviewIds]);
  const activeReview=reviewIndex===null ? null : (openReviewQueue[Math.min(reviewIndex,Math.max(0,openReviewQueue.length-1))] || null);

  const searchResults=useMemo(()=>searchAll(query),[query]);
  const groupedResults=useMemo(()=>{
    const map:Record<string,SearchResult[]>={};
    searchResults.forEach(r=>{(map[r.group]=map[r.group]||[]).push(r)});
    return map;
  },[searchResults]);

  useEffect(()=>{
    setActiveResult(0);
    if(!query){setSearching(false);setSearchOpen(false);return;}
    setSearching(true);setSearchOpen(true);
    const t=window.setTimeout(()=>setSearching(false),160);
    return ()=>window.clearTimeout(t);
  },[query]);

  useEffect(()=>{
    const handler=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();searchInputRef.current?.focus();}};
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  },[]);

  const notify=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(''),3000)};
  const go=(next:Screen)=>{
    if(next===screen) return;
    if(dirty){setModal('confirm'); (window as any).__pendingScreen=next; return;}
    setScreen(next); setQuery('');
  };
  const confirmLeave=()=>{const next=(window as any).__pendingScreen as Screen; setDirty(false);setModal(null);setScreen(next);setQuery('');};

  const openResult=(r:SearchResult)=>{
    setSearchOpen(false);setQuery('');
    if(r.action.reviewId){
      const idx=REVIEW_QUEUE.findIndex(x=>x.id===r.action.reviewId);
      if(idx>=0)setReviewIndex(idx);
      setScreen('review');
      return;
    }
    if(r.action.discipline) setScheduleDiscipline(r.action.discipline);
    if(r.action.activityId){
      setSelectedId(r.action.activityId);
      setDetailId(r.action.activityId);
      setModal('activity');
    }
    setScreen('schedule');
  };

  const searchKeyDown=(e:React.KeyboardEvent<HTMLInputElement>)=>{
    if(e.key==='Escape'){setSearchOpen(false);searchInputRef.current?.blur();}
    else if(e.key==='ArrowDown'){e.preventDefault();setActiveResult(i=>Math.min(i+1,Math.max(0,searchResults.length-1)));}
    else if(e.key==='ArrowUp'){e.preventDefault();setActiveResult(i=>Math.max(i-1,0));}
    else if(e.key==='Enter'){e.preventDefault();if(searchResults[activeResult])openResult(searchResults[activeResult]);}
  };

  const runCapture=()=>{
    if(!captureText.trim()){notify('Nothing to extract. Enter a field statement first.');return;}
    if(captureBusy)return;
    setCaptureBusy(true);setCaptureResult(false);setCaptureStage(1);setDirty(false);
    [2,3,4,5,6].forEach((s,i)=>window.setTimeout(()=>setCaptureStage(s),550*(i+1)));
    window.setTimeout(()=>{setCaptureBusy(false);setCaptureResult(true);notify('3 execution events extracted · 2 auto-linkable · 1 requires review.')},3500);
  };
  const approveReview=()=>{
    if(!activeReview) return;
    setResolvedReviewIds(ids=>ids.includes(activeReview.id)?ids:[...ids,activeReview.id]);
    setReviewCount(c=>Math.max(0,c-1));
    notify(`Match ${activeReview.candidate || 'new activity'} confirmed. Actual update queued with provenance.`);
    setReviewIndex(null);
  };
  const chooseCandidate=()=>notify('Candidate picker opened. Select the correct L5/L6 activity before applying.');
  const flagNew=()=>{notify('New activity proposal created. Planner confirmation is required before it enters the baseline.');};
  const processImport=()=>{
    if(!importFile){notify('Choose a supported file first.');return;}
    setImportState('processing');
    window.setTimeout(()=>setImportState('success'),1600);
  };

  if(!authenticated) return <AuthScreen mode={authMode} setMode={setAuthMode} onLogin={()=>setAuthenticated(true)} />;

  const detailActivity=ACTIVITIES.find(a=>a.id===detailId) || null;
  const detailTrail=detailId?AUDIT_TRAIL.filter(t=>t.activity===detailId):[];
  const detailEvidence=detailId?FIELD_EVENTS.find(e=>e.actId===detailId):undefined;

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={()=>setScreen('command')} aria-label="Go to command">
        <span className="brand-mark">S</span><span><strong>SYNCHRONEX</strong><small>EXECUTION INTELLIGENCE</small></span>
      </button>
      <div className="top-project"><span className="eyebrow">ACTIVE PROJECT</span><strong>North Field Gas Processing / Phase 1</strong><span className="live"><i/> EXECUTION</span><code>NGFPF-P1-2026</code></div>
      <div className="top-actions">
        <button className="icon-btn" aria-label="Notifications" onClick={()=>setModal(modal==='notifications'?null:'notifications')}>●<span className={reviewCount?'alert-dot':''}/></button>
        <button className="icon-btn" aria-label="Help" onClick={()=>setModal('help')}>?</button>
        <button className="profile-chip" aria-label="Open profile" onClick={()=>setModal('profile')}>PC</button>
      </div>
      {modal==='notifications' && <Popover title="Open decisions"><p><b>{reviewCount}</b> field events require planner validation.</p><p>Baseline Rev 04 synced at 09:42.</p><button className="text-action" onClick={()=>{setModal(null);go('review')}}>Open review queue →</button></Popover>}
    </header>

    <aside className="rail">
      <div className="rail-label">PROJECT SPINE</div>
      {nav.map(item=><button key={item.id} className={`rail-item ${screen===item.id?'active':''}`} aria-current={screen===item.id?'page':undefined} onClick={()=>go(item.id)}>
        <span className="rail-num">{item.num}</span><span className="rail-glyph">{item.glyph}</span><span>{item.label}</span>{item.id==='review'&&reviewCount>0?<b className="count-badge">{reviewCount}</b>:null}
      </button>)}
      <div className="rail-rule"/>
      <button className={`rail-item ${screen==='import'?'active':''}`} onClick={()=>go('import')}><span className="rail-num">07</span><span className="rail-glyph">↑</span><span>Import</span></button>
      <button className={`rail-item ${screen==='settings'?'active':''}`} onClick={()=>go('settings')}><span className="rail-num">08</span><span className="rail-glyph">⚙</span><span>Settings</span></button>
      <div className="rail-bottom"><span className="eyebrow">BASELINE</span><strong>REV 04</strong><small>Synced 23 Sep · 09:42</small><button onClick={()=>notify('Revision history is read-only in demo mode.')}>View revision history →</button></div>
    </aside>

    <main className="workspace">
      <div className="page-head">
        <div><div className="breadcrumb">SYNCHRONEX / {pageMeta[screen].eyebrow.split(' / ')[0]}</div><h1>{pageMeta[screen].title}</h1><p>{pageMeta[screen].subtitle}</p></div>
        <div className="head-tools">
          <div className="global-search-wrap" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setSearchOpen(false);}}>
            <label className="global-search">
              <span>⌕</span>
              <input ref={searchInputRef} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={searchKeyDown} onFocus={()=>{if(query)setSearchOpen(true)}} placeholder="Find activity, report or WBS node" aria-label="Search workspace" role="combobox" aria-expanded={searchOpen} aria-controls="global-search-results" autoComplete="off"/>
              <kbd>⌘ K</kbd>
            </label>
            {searchOpen && <div className="search-dropdown" id="global-search-results" role="listbox">
              {searching && <div className="search-loading">Searching…</div>}
              {!searching && searchResults.length===0 && <div className="search-empty">No matches for “{query}”. Try an activity ID like PIP-245, a discipline, or field-report text.</div>}
              {!searching && Object.entries(groupedResults).map(([group,items])=>
                <div className="search-group" key={group}>
                  <span className="search-group-label">{group}</span>
                  {items.slice(0,4).map(r=>{
                    const flatIndex=searchResults.indexOf(r);
                    return <button key={group+r.id} type="button" role="option" aria-selected={flatIndex===activeResult} className={`search-result-row ${flatIndex===activeResult?'active':''}`} onMouseEnter={()=>setActiveResult(flatIndex)} onClick={()=>openResult(r)}>
                      <strong>{highlight(r.label,query)}</strong><span>{r.sub}</span>
                    </button>;
                  })}
                </div>
              )}
            </div>}
          </div>
          <button className="outline-btn" onClick={()=>notify('Baseline Rev 04 is active. Changes are tracked against this revision.')}>Baseline <b>04</b></button>
        </div>
      </div>

      {screen==='command'&&<Command onGo={go} onSelect={(id)=>{setSelectedId(id);go('schedule')}} reviewCount={reviewCount}/>}
      {screen==='schedule'&&<Schedule rows={ACTIVITIES} selectedId={selectedId} onSelect={setSelectedId} selected={selected} onImport={()=>go('import')} discipline={scheduleDiscipline} setDiscipline={setScheduleDiscipline} onOpenDetail={(id)=>{setDetailId(id);setModal('activity')}} />}
      {screen==='capture'&&<Capture text={captureText} setText={(v)=>{setCaptureText(v);setDirty(true)}} stage={captureStage} busy={captureBusy} result={captureResult} run={runCapture} onImport={()=>go('import')} />}
      {screen==='review'&&<Review count={openReviewQueue.length} item={activeReview} index={reviewIndex} queue={openReviewQueue} onApprove={approveReview} onChoose={chooseCandidate} onFlag={flagNew} onJump={setReviewIndex} />}
      {screen==='memory'&&<Memory />}
      {screen==='trace'&&<Trace />}
      {screen==='import'&&<Import state={importState} file={importFile} setFile={setImportFile} onProcess={processImport} onRetry={processImport} onOpenReview={()=>go('review')}/>} 
      {screen==='settings'&&<Settings threshold={threshold} setThreshold={setThreshold} saved={saved} onSave={()=>{setSaved(true);notify('Workspace controls saved.')}}/>}
    </main>

    {modal==='help'&&<Modal title="How the planning-to-execution bridge works" onClose={()=>setModal(null)}><div className="flow-list">{[
      ['01','Capture','Receive free text, reports, spreadsheets, site diaries, or supervisor statements.'],
      ['02','Extract','Turn field language into structured execution events: activity, action, date, progress, evidence.'],
      ['03','Link','Search L5/L6 schedule nodes using terminology and granularity-aware matching.'],
      ['04','Confidence gate','High-confidence valid events can auto-apply; ambiguous or unmatched events go to a planner.'],
      ['05','Apply + trace','Write the accepted actual to the schedule and preserve source, actor, confidence, and decision.'],
    ].map(x=><div className="flow-row" key={x[0]}><b>{x[0]}</b><div><strong>{x[1]}</strong><p>{x[2]}</p></div></div>)}</div></Modal>}
    {modal==='profile'&&<Modal title="Project Controls Engineer" onClose={()=>setModal(null)}><div className="profile-modal"><div className="profile-avatar">PC</div><p><b>Planner workspace</b><br/>North Field Gas Processing / Phase 1</p><button className="outline-btn" onClick={()=>{setAuthenticated(false);setModal(null)}}>Sign out</button></div></Modal>}
    {modal==='confirm'&&<Modal title="Leave with unsaved work?" onClose={()=>setModal(null)}><p className="modal-copy">Your capture draft has not been submitted. Leaving now discards the unsaved text.</p><div className="modal-actions"><button className="outline-btn" onClick={()=>setModal(null)}>Stay</button><button className="danger-btn" onClick={confirmLeave}>Discard and leave</button></div></Modal>}
    {modal==='activity'&&<Modal title={detailActivity?`${detailActivity.id} · ${detailActivity.desc}`:'Activity detail'} onClose={()=>setModal(null)}>
      {detailActivity ? <div className="activity-detail">
        <div className="activity-detail-meta"><span className="eyebrow">{detailActivity.discipline} · {detailActivity.wbs} executable node</span><span className={`status-badge ${detailActivity.status==='Completed'?'track':detailActivity.status==='Planned'?'':'risk'}`}>{detailActivity.status}</span></div>
        <div className="activity-detail-grid">
          <div><span>PLAN</span><b>{detailActivity.planStart} → {detailActivity.planFinish}</b></div>
          <div><span>ACTUAL</span><b>{detailActivity.actStart} → {detailActivity.actFinish}</b></div>
          <div><span>PROGRESS</span><b>{detailActivity.progress}%</b></div>
          <div><span>AI CONFIDENCE</span><b>{detailActivity.aiConf?`${detailActivity.aiConf}%`:'—'}</b></div>
        </div>
        <div className="activity-detail-evidence"><span className="eyebrow">LATEST EVIDENCE</span><p>{detailEvidence?`“${detailEvidence.text.replace(/^"|"$/g,'')}”`:'No field evidence linked yet.'}</p></div>
        <div className="activity-detail-trace"><span className="eyebrow">TRACE ({detailTrail.length})</span>{detailTrail.length?detailTrail.map((t,i)=><div key={i} className="trace-mini-row"><span>{t.ts}</span><span className="actor">{t.actor}</span><span>{t.action}</span><span>{t.prev} → <b>{t.next}</b></span></div>):<p className="helper">No accepted changes recorded yet for this activity.</p>}</div>
        <div className="modal-actions"><button className="outline-btn" onClick={()=>{setModal(null);go('trace')}}>Open full trace ledger →</button></div>
      </div> : <p>Activity not found.</p>}
    </Modal>}
    {toast&&<div className="toast" role="status"><span>✓</span>{toast}</div>}
  </div>;
}

function AuthScreen({mode,setMode,onLogin}:{mode:'login'|'forgot';setMode:(v:'login'|'forgot')=>void;onLogin:()=>void}){
 const [email,setEmail]=useState('planner@northfield.example');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const submit=(e:React.FormEvent)=>{e.preventDefault();setError('');if(!email.includes('@')){setError('Enter a valid work email.');return}if(mode==='login'&&!password){setError('Enter your password.');return}setBusy(true);window.setTimeout(()=>{setBusy(false);if(mode==='forgot'){setError('Demo reset link generated. Check the workspace inbox.')}else onLogin()},700)};
 return <div className="auth-shell"><div className="auth-left"><div className="auth-brand"><span className="brand-mark">S</span><div><strong>SYNCHRONEX</strong><small>EXECUTION INTELLIGENCE</small></div></div><div className="auth-hero"><span className="eyebrow">PLANNING → EXECUTION</span><h1>Make field reality legible to the schedule.</h1><p>Capture site language, link it to L5/L6 work, and keep every accepted actual traceable.</p><div className="auth-path"><span>01 Capture</span><i>→</i><span>02 Link</span><i>→</i><span>03 Validate</span><i>→</i><span>04 Apply</span></div></div><div className="auth-note">Demo workspace · synthetic data only · no live project data</div></div><div className="auth-right"><div className="auth-card"><span className="eyebrow">{mode==='login'?'SECURE WORKSPACE':'ACCOUNT RECOVERY'}</span><h2>{mode==='login'?'Sign in':'Recover access'}</h2><p>{mode==='login'?'Use your project-controls account to enter the workspace.':'Enter your work email to generate a recovery link.'}</p><form onSubmit={submit}><label>Work email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email"/></label>{mode==='login'&&<label>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password"/></label>}{error&&<div className="form-error" role="alert">{error}</div>}<button className="primary-btn" disabled={busy}>{busy?'Working…':mode==='login'?'Enter workspace':'Generate reset link'} <span>→</span></button></form><button className="link-btn" onClick={()=>{setMode(mode==='login'?'forgot':'login');setError('')}}>{mode==='login'?'Forgot password?':'Back to sign in'}</button></div></div></div>
}

function PageSection({label,title,children,action}:{label?:string;title:string;children:React.ReactNode;action?:React.ReactNode}){return <section className="section"><div className="section-head"><div>{label&&<span className="eyebrow">{label}</span>}<h2>{title}</h2></div>{action}</div>{children}</section>}

function Command({onGo,onSelect,reviewCount}:{onGo:(s:Screen)=>void;onSelect:(id:string)=>void;reviewCount:number}){
 const commandSignals=FIELD_EVENTS.slice(0,5);
 return <div className="command-layout"><div className="command-main"><div className="status-strip"><div><span className="eyebrow">BASELINE REV 04</span><strong>North Field Gas Processing Facility — Phase 1</strong></div><div className="status-good"><i/> EXECUTION MODE</div></div><div className="metric-band"><Metric label="L5/L6 activities" value="246" note="executable nodes"/><Metric label="Actual progress" value="52.3%" note="vs 57.0% planned" tone="blue"/><Metric label="Schedule variance" value="−4.7%" note="behind baseline" tone="red"/><Metric label="Review workload" value={String(reviewCount)} note="planner decisions" tone="amber"/></div><PageSection label="BASELINE → ACTUAL" title="Project pulse" action={<button className="outline-btn" onClick={()=>onGo('schedule')}>Open schedule →</button>}><div className="pulse-grid"><div className="trend"><div className="trend-head"><span>Progress trajectory</span><span><b className="legend-line actual"/>Actual <b className="legend-line planned"/>Planned</span></div><div className="chart"><div className="gridlines"/><svg viewBox="0 0 720 220" preserveAspectRatio="none" aria-label="Planned and actual progress trend"><polyline points="0,158 100,142 200,118 300,98 400,79 520,64 720,35" fill="none" stroke="#93a1ad" strokeWidth="2" strokeDasharray="5 5"/><polyline points="0,166 100,151 200,128 300,104 400,88 520,80 720,64" fill="none" stroke="#173f35" strokeWidth="4"/></svg></div><div className="chart-axis"><span>01 Sep</span><span>10 Sep</span><span>18 Sep</span><span>23 Sep</span></div><div className="pulse-kpis"><div><span>ACTUAL</span><b>52.3%</b></div><div><span>PLANNED</span><b>57.0%</b></div><div><span>VARIANCE</span><b className="negative">−4.7%</b></div></div></div></div></PageSection><PageSection label="FIELD INTELLIGENCE" title="Recent execution signals" action={<button className="text-action" onClick={()=>onGo('capture')}>Open capture →</button>}><div className="signal-table">{commandSignals.map(e=><button key={e.time+e.actId} className="signal-row" onClick={()=>onSelect(e.actId)}><time>{e.time}</time><span className={`signal-tag ${e.status==='REVIEW REQUIRED'?'review':'matched'}`}>{e.status}</span><span className="signal-text">{e.text}</span><code>{e.actId}</code><strong>{e.conf?`${e.conf}%`:''}</strong></button>)}</div></PageSection></div><aside className="command-aside"><div className="aside-block decision-card"><span className="eyebrow">DECISION QUEUE</span><div className="decision-number-row"><strong className="aside-number">{reviewCount}</strong><span className="queue-status">OPEN</span></div><p>Ambiguous or unmatched events need a planner before schedule application.</p><button className="primary-btn" onClick={()=>onGo('review')}>Review decisions →</button></div><div className="aside-block capture-card"><div className="capture-card-icon">↗</div><span className="eyebrow">NEXT CONTROL</span><h3>Capture today’s field report</h3><p>Start with site language. Synchronex extracts events, links evidence, and sends uncertain matches to review.</p><div className="capture-card-meta"><span>FIELD INPUT</span><span>HUMAN GATE</span></div><button className="outline-btn" onClick={()=>onGo('capture')}>Start capture <span>→</span></button></div><div className="aside-block health-card"><div className="health-head"><span className="eyebrow">PROJECT HEALTH</span><span className="health-dot">● LIVE</span></div><div className="health-line"><span>Baseline completion</span><b>30 Sep</b></div><div className="health-line"><span>Current forecast</span><b>03 Oct</b></div><div className="health-line"><span>Last sync</span><b>09:42</b></div></div></aside></div>
}
function Metric({label,value,note,tone}:{label:string;value:string;note:string;tone?:string}){return <div className="metric"><span>{label}</span><strong className={tone||''}>{value}</strong><small>{note}</small></div>}

function Schedule({rows,selectedId,onSelect,selected,onImport,discipline,setDiscipline,onOpenDetail}:{rows:any[];selectedId:string;onSelect:(id:string)=>void;selected:any;onImport:()=>void;discipline:string;setDiscipline:(d:string)=>void;onOpenDetail:(id:string)=>void}){
 const [statusFilter,setStatusFilter]=useState('All');
 const [sortBy,setSortBy]=useState<'plan'|'progress'|'status'|'id'>('plan');
 const mostUrgent=[...DISCIPLINES].sort((a,b)=>a.variance-b.variance)[0];
 const [expanded,setExpanded]=useState<string|null>(mostUrgent?.name || null);
 const disciplineRows=discipline==='All'?rows:rows.filter(a=>a.discipline===discipline);
 let visibleRows=statusFilter==='All'?disciplineRows:disciplineRows.filter(a=>a.status===statusFilter);
 visibleRows=[...visibleRows].sort((a,b)=>{
   if(sortBy==='progress')return b.progress-a.progress;
   if(sortBy==='status')return a.status.localeCompare(b.status);
   if(sortBy==='id')return a.id.localeCompare(b.id);
   return a.planStart.localeCompare(b.planStart);
 });
 const cards=discipline==='All'?DISCIPLINES:DISCIPLINES.filter(d=>d.name===discipline);
 const currentSelected=visibleRows.find(a=>a.id===selectedId) || visibleRows[0] || selected;
 const selectDiscipline=(name:string)=>{setDiscipline(name);setStatusFilter('All');const first=rows.find(a=>a.discipline===name);if(first)onSelect(first.id);};
 const recentEvidence=(name:string)=>FIELD_EVENTS.filter(e=>ACTIVITIES.find(a=>a.id===e.actId)?.discipline===name).slice(0,2);
 return <div className="schedule-page"><PageSection label="EXECUTABLE PLAN / WORKSTREAMS" title="Schedule by discipline" action={<button className="primary-btn" onClick={onImport}>Import schedule ↑</button>}><div className="schedule-intro"><div><strong>Choose a discipline to inspect its executable plan.</strong><span>Each workstream opens its own schedule so dates, progress, milestones, and evidence stay focused.</span></div><div className="schedule-count"><b>{visibleRows.length}</b><span>visible activities</span></div></div><div className="discipline-card-grid">{cards.map(d=>{
   const isExpanded=expanded===d.name;
   const evidence=recentEvidence(d.name);
   return <div key={d.name} className={`discipline-card ${discipline===d.name?'active':''} ${d.variance<0?'risk':''} ${isExpanded?'expanded':''}`} style={{['--discipline-accent' as any]:statusAccent(d.status)}}>
     <button className="discipline-card-hit" onClick={()=>selectDiscipline(d.name)}>
       <div className="discipline-card-top"><span className="discipline-icon">{d.name.slice(0,1)}</span><span className={`status-badge ${d.status==='Delayed'?'delayed':d.variance<0?'risk':'track'}`}>{d.status}</span><span className="card-chevron">→</span></div>
       <div className="discipline-card-title"><strong>{d.name}</strong><b>{d.actual}%</b></div>
       <div className="discipline-progress"><i style={{width:`${d.actual}%`}}/></div>
       <div className="discipline-card-metrics"><span><small>PLANNED</small><b>{d.planned}%</b></span><span><small>VARIANCE</small><b className={d.variance<0?'negative':'positive'}>{d.variance>0?'+':''}{d.variance}%</b></span><span><small>ACTIVITIES</small><b>{d.activities}</b></span></div>
       <div className="discipline-card-milestone"><small>NEXT MILESTONE</small><span>{d.nextMilestone}</span></div>
     </button>
     <button className="discipline-expand-btn" aria-expanded={isExpanded} aria-label={isExpanded?`Collapse ${d.name} details`:`Expand ${d.name} details`} onClick={()=>setExpanded(isExpanded?null:d.name)}>{isExpanded?'Show less ▲':'Show more ▼'}</button>
     {isExpanded&&<div className="discipline-expanded-panel">
       <div><span className="eyebrow">MILESTONES</span><strong>{d.milestones} tracked · next: {d.nextMilestone}</strong></div>
       <div><span className="eyebrow">VARIANCE EXPLANATION</span><p>{d.varianceNote}</p></div>
       <div><span className="eyebrow">RECENT EVIDENCE</span>{evidence.length?evidence.map((e,i)=><p key={i}>“{e.text.replace(/^"|"$/g,'')}”</p>):<p className="helper">No recent field evidence for this discipline.</p>}</div>
     </div>}
   </div>;
 })}</div><div className="schedule-detail-head"><div><span className="eyebrow">{discipline==='All'?'DISCIPLINE OVERVIEW':'DISCIPLINE SCHEDULE'}</span><h3>{discipline==='All'?'Select a discipline':' '+discipline}</h3><p>{discipline==='All'?'Choose a workstream card to open its focused schedule.':'Activities, milestones, dates, progress and evidence for this workstream.'}</p></div>{discipline!=='All'&&<button className="filter-btn" onClick={()=>setDiscipline('All')}>← All disciplines</button>}</div>{discipline!=='All'&&<div className="schedule-filter-bar"><label>Status<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Filter by status"><option value="All">All</option><option value="Planned">Planned</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option></select></label><label>Sort by<select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} aria-label="Sort activities"><option value="plan">Plan date</option><option value="progress">Progress</option><option value="status">Status</option><option value="id">Activity ID</option></select></label><span className="filter-count">{visibleRows.length} of {disciplineRows.length} activities</span></div>}{discipline!=='All'&&<div className="schedule-activity-list">{visibleRows.map(a=><button key={a.id} className={`schedule-activity ${a.id===selectedId?'selected':''}`} onClick={()=>{onSelect(a.id);onOpenDetail(a.id);}}><div className="activity-main"><code>{a.id}</code><strong>{a.desc}</strong><small>{a.wbs} executable node</small></div><div className="activity-dates"><span><small>PLAN</small>{a.planStart} → {a.planFinish}</span><span><small>ACTUAL</small>{a.actStart} → {a.actFinish}</span></div><div className="activity-progress"><div><i style={{width:`${a.progress}%`}}/></div><b>{a.progress}%</b></div><span className={`confidence ${a.aiConf>=90?'high':a.aiConf?'medium':'none'}`}>{a.aiConf?`${a.aiConf}% AI`:'No AI link'}</span><span className="activity-arrow">→</span></button>)}{visibleRows.length===0&&<div className="empty-state">No activities match this filter. <button className="text-action" onClick={()=>setStatusFilter('All')}>Clear status filter</button></div>}</div>}<div className="schedule-selected"><div className="selected-summary"><span className="eyebrow">SELECTED ACTIVITY</span><h3>{currentSelected?.desc || selected.desc}</h3><code>{currentSelected?.id || selected.id}</code></div><div className="selected-stats"><div><span>Progress</span><b>{currentSelected?.progress ?? selected.progress}%</b></div><div><span>Planned</span><b>{currentSelected?.planStart ?? selected.planStart}</b><small>{currentSelected?.planFinish ?? selected.planFinish}</small></div><div><span>Actual</span><b>{currentSelected?.actStart ?? selected.actStart}</b><small>{currentSelected?.actFinish ?? selected.actFinish}</small></div><div><span>AI confidence</span><b>{currentSelected?.aiConf ? `${currentSelected.aiConf}%` : '—'}</b></div></div><div className="selected-evidence"><span className="eyebrow">LATEST EVIDENCE</span><p>“Line 24 spool erection completed.”</p><strong>Evidence remains attached to the activity for traceability.</strong></div><button className="outline-btn" onClick={()=>onOpenDetail(currentSelected?.id||selected.id)}>Open activity detail →</button></div></PageSection></div>
}

function Capture({text,setText,stage,busy,result,run,onImport}:{text:string;setText:(v:string)=>void;stage:number;busy:boolean;result:boolean;run:()=>void;onImport:()=>void}){return <div className="capture-layout"><div className="capture-main"><PageSection label="FIELD INPUT / 01" title="Speak in the language of the site"><p className="lead">Paste a daily report, site diary note, or supervisor statement. Synchronex turns execution language into structured events without forcing field teams into a rigid form.</p><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')run()}} aria-label="Field report input" placeholder="Example: Line 24 spool erection completed…"/><div className="capture-actions"><button className="primary-btn" disabled={busy} onClick={run}>{busy?'Extracting events…':'Extract execution events'} <span>↗</span></button><button className="outline-btn" onClick={onImport}>Import instead</button><span className="helper">Ctrl / ⌘ + Enter to extract · demo uses synthetic data</span></div>{result&&<ExtractionResult/>}</PageSection></div><aside className="process-panel"><span className="eyebrow">PROCESS / 02</span>{stages.map((s,i)=><div className={`process-step ${stage===i+1?'active':''} ${stage>i+1?'done':''}`} key={s}><b>0{i+1}</b><span>{s}</span><i>{stage>i+1?'✓':stage===i+1?'●':'○'}</i></div>)}<div className="human-loop"><b>Human stays in the loop.</b><p>Ambiguous matches never disappear. They move to review with candidate activities and evidence.</p></div></aside></div>}
function ExtractionResult(){return <div className="result-panel"><div className="result-head"><div><span className="eyebrow">EXTRACTION COMPLETE</span><h3>3 execution events found</h3></div><span className="success-chip">2 auto-linkable · 1 review</span></div><div className="event-cards"><EventCard id="PIP-245" text="Line 24 spool section A completed" conf={96} status="Matched"/><EventCard id="PIP-246" text="Line 25 erection started at 09:30" conf={91} status="Matched"/><EventCard id="CIV-022 / CIV-023" text="Foundation Block A reached ~70%" conf={78} status="Review required"/></div></div>}
function EventCard({id,text,conf,status}:{id:string;text:string;conf:number;status:string}){return <div className="event-card"><div><span className={`signal-tag ${status==='Matched'?'matched':'review'}`}>{status}</span><strong>{text}</strong></div><div><code>{id}</code><b className={conf>=90?'green':'amber'}>{conf}%</b></div></div>}

function Review({count,item,index,queue,onApprove,onChoose,onFlag,onJump}:{count:number;item:any;index:number|null;queue:any[];onApprove:()=>void;onChoose:()=>void;onFlag:()=>void;onJump:(i:number|null)=>void}){
 const inDetail = item && index !== null;

 if(inDetail){
   return <div className="review-page">
     <div className="review-detail-toolbar">
       <button className="outline-btn review-back-btn" onClick={()=>onJump(null)}>← Back to review queue</button>
       <span className="queue-count">{count} open</span>
     </div>
     <div className="review-detail-card review-detail-card-full">
       <div className="review-detail-main">
         <div className="review-detail-header">
           <div><span className="eyebrow">HUMAN VALIDATION / EVENT {String(index+1).padStart(2,'0')} / {item.id}</span><h2>Resolve before apply</h2></div>
           <div className="confidence-ring"><b>{item.conf||0}%</b><span>AI confidence</span></div>
         </div>
         <div className="review-hero">
           <div><blockquote>{item.text}</blockquote><span className="issue-chip">{item.issue}</span></div>
         </div>
         <div className="candidate-grid">
           <div className="candidate selected"><span className="eyebrow">CURRENT CANDIDATE</span><code>{item.candidate || 'No activity'}</code><strong>{item.candidate ? (ACTIVITIES.find(a=>a.id===item.candidate)?.desc || `Baseline activity ${item.candidate}`) : 'No matching baseline node'}</strong><p>Match evidence combines terminology, discipline, schedule context, and granularity.</p><span className="evidence-score">Evidence alignment · {item.conf || 0}%</span></div>
           <div className="candidate"><span className="eyebrow">DECISION REQUIRED</span><strong>{item.candidate?'Confirm or choose another':'Create a new activity proposal'}</strong><p>{item.candidate?'Verify the suggested L5/L6 node against the source statement.':'Do not silently drop unmatched work. Flag it for planner review and baseline control.'}</p></div>
         </div>
         <div className="review-actions"><button className="primary-btn" onClick={onApprove}>Confirm match & apply →</button><button className="outline-btn" onClick={onChoose}>Choose different activity</button><button className="danger-btn" onClick={onFlag}>Flag as new activity</button></div>
         <p className="helper">Applying writes an actual update and creates an append-only trace record.</p>
       </div>
       <aside className="review-detail-aside"><span className="eyebrow">VALIDATION CHECKS</span>{['Source preserved','Activity exists in baseline','Discipline consistent','Date is valid','Confidence below auto-apply threshold'].map((x,i)=><div className="check-row" key={x}><span>{i<4?'✓':'!'}</span><p>{x}<small>{i<4?'Passed':'Planner decision required'}</small></p></div>)}<div className="review-rule"/><span className="eyebrow">EDGE CASE</span><p className="aside-copy">Granularity mismatch is surfaced explicitly. Field detail can be richer than the plan; the system must never silently discard it.</p></aside>
     </div>
   </div>
 }

 return <div className="review-page">
   <PageSection label="HUMAN VALIDATION / CONFIDENCE GATE" title="Review queue" action={<span className="queue-count">{count} open</span>}>
     <div className="review-queue-panel">
       <div className="review-queue-head">
         <div><strong>Select a field event to open planner validation.</strong><span>Review ambiguous or unmatched execution signals before they become trusted schedule actuals.</span></div>
         <div className="review-filters"><select><option>All Confidence</option><option>&gt;80%</option><option>60–80%</option><option>&lt;60%</option></select><select><option>All Disciplines</option><option>Civil</option><option>Piping</option><option>Mechanical</option></select><select><option>All Issues</option><option>Multiple candidates</option><option>No match</option><option>Granularity</option></select></div>
       </div>
       <div className="review-table-wrap">
         <table className="data-table review-queue-table">
           <thead><tr><th>Queue ID</th><th>Field event</th><th>Candidate</th><th>Confidence</th><th>Issue</th><th>Status</th></tr></thead>
           <tbody>
             {queue.length ? queue.map((q,i)=><tr key={q.id} onClick={()=>onJump(i)} className="review-queue-clickable-row">
               <td><code>{q.id}</code></td>
               <td className="review-event-text">{q.text.replace(/^"|"$/g,'')}</td>
               <td>{q.candidate||'—'}</td>
               <td><b className={q.conf>=80?'review-high':q.conf>=70?'review-mid':'review-low'}>{q.conf?`${q.conf}%`:'—'}</b></td>
               <td>{q.issue}</td>
               <td><span className={`review-status ${q.status==='Unmatched'?'unmatched':'reviewing'}`}>{q.status}</span></td>
             </tr>) : <tr><td colSpan={6} className="review-empty-cell">Queue cleared · all open decisions have been resolved.</td></tr>}
           </tbody>
         </table>
       </div>
     </div>
   </PageSection>
 </div>
}

function Memory(){return <PageSection label="INSTITUTIONAL MEMORY / SYNTHETIC DEMO DATA" title="What execution teaches the next project" action={<button className="outline-btn">Export knowledge ↗</button>}><p className="lead">Only validated actuals become reusable evidence. Every benchmark remains traceable to the execution events that produced it.</p><div className="memory-table"><table><thead><tr><th>Activity type</th><th>Baseline avg</th><th>Actual avg</th><th>Drift</th><th>Occurrences</th><th>Evidence</th></tr></thead><tbody>{MEMORY_ACTIVITIES.map(m=><tr key={m.type}><td><strong>{m.type}</strong></td><td>{m.baselineAvg}</td><td>{m.actualAvg}</td><td className="negative">{m.variance}</td><td>{m.occurrences}</td><td><span className="trace-chip">Traceable</span></td></tr>)}</tbody></table></div><div className="memory-cards"><div><span className="eyebrow">DELAY PATTERN</span><strong>Material availability</strong><p>31% of demo delay events</p></div><div><span className="eyebrow">PRODUCTIVITY SIGNAL</span><strong>Piping · 69%</strong><p>Derived from validated synthetic actuals</p></div><div><span className="eyebrow">KNOWLEDGE STATUS</span><strong>Traceable</strong><p>Source evidence retained with every benchmark</p></div></div></PageSection>}

function Trace(){return <PageSection label="AUDIT / APPEND-ONLY PROVENANCE" title="Trace every accepted change" action={<button className="outline-btn">Export ledger ↗</button>}><div className="trace-intro"><div><strong>Every field statement can be followed to its schedule consequence.</strong><p>Source → extraction → candidate → planner decision → actual update.</p></div><span className="trace-chip">8 demo records</span></div><div className="trace-table"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Object</th><th>Source</th><th>Change</th><th>Confidence</th></tr></thead><tbody>{AUDIT_TRAIL.map((a,i)=><tr key={i}><td>{a.ts}</td><td><span className="actor">{a.actor}</span></td><td>{a.action}</td><td><code>{a.activity}</code></td><td>{a.source}</td><td>{a.prev} → <b>{a.next}</b></td><td>{a.conf?`${a.conf}%`:'—'}</td></tr>)}</tbody></table></div></PageSection>}

function Import({state,file,setFile,onProcess,onRetry,onOpenReview}:{state:'idle'|'processing'|'success'|'error';file:string;setFile:(v:string)=>void;onProcess:()=>void;onRetry:()=>void;onOpenReview:()=>void}){return <div className="import-layout"><PageSection label="DATA INTAKE / 01" title="Bring field evidence into the bridge"><div className="dropzone" tabIndex={0} role="button" onClick={()=>setFile('Daily_Progress_Report_23Sep.xlsx')} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&setFile('Daily_Progress_Report_23Sep.xlsx')}><span className="drop-icon">↑</span><strong>{file||'Choose a file or drag it here'}</strong><p>Prototype accepts CSV, XLSX, PDF, and TXT inputs.</p>{file&&<code>{file}</code>}</div><div className="import-actions"><button className="primary-btn" disabled={!file||state==='processing'} onClick={onProcess}>{state==='processing'?'Processing…':'Validate and process'} →</button>{state==='error'&&<button className="outline-btn" onClick={onRetry}>Retry</button>}<span className="helper">Source is preserved before extraction. Production OCR/ASR is outside the prototype scope.</span></div>{state==='success'&&<div className="import-success"><span>✓</span><div><strong>Processing complete</strong><p>38 rows received · 31 events extracted · 24 linked · 7 sent to review.</p></div><button className="text-action" onClick={onOpenReview}>Open review →</button></div>}</PageSection><aside className="import-side"><span className="eyebrow">VALIDATION PIPELINE</span>{['File received','Format validated','Rows extracted','Activity IDs searched','Confidence scored'].map((x,i)=><div className={`pipeline-row ${state==='success'||(state==='processing'&&i<3)?'done':''}`} key={x}><b>0{i+1}</b><span>{x}</span><i>{state==='success'||(state==='processing'&&i<3)?'✓':'○'}</i></div>)}<div className="supported"><b>Supported prototype inputs</b><span>Daily report · discipline spreadsheet · free-text supervisor note</span></div></aside></div>}

function Settings({threshold,setThreshold,saved,onSave}:{threshold:number;setThreshold:(n:number)=>void;saved:boolean;onSave:()=>void}){return <div className="settings-layout"><PageSection label="TRUST / AUTOMATION" title="Control when AI may apply changes"><div className="setting-row"><div><strong>Auto-apply confidence threshold</strong><p>Events at or above this threshold may be eligible for automatic application if all validation checks pass.</p></div><div className="threshold-control"><input type="range" min="80" max="99" value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/><b>{threshold}%</b></div></div><div className="setting-row"><div><strong>Timezone</strong><p>Used for field event timestamps and schedule actuals.</p></div><select defaultValue="Asia/Kolkata"><option value="Asia/Kolkata">Asia/Kolkata (IST)</option><option value="UTC">UTC</option></select></div><div className="setting-row"><div><strong>Evidence retention</strong><p>Keep source statements attached to trace records for auditability.</p></div><select defaultValue="project"><option value="project">Project lifetime</option><option value="90">90 days</option><option value="365">1 year</option></select></div><div className="settings-actions"><button className="primary-btn" onClick={onSave}>{saved?'Saved ✓':'Save controls'}</button></div></PageSection><aside className="settings-side"><span className="eyebrow">SAFE DEFAULT</span><strong>Human review remains mandatory for ambiguity.</strong><p>No confidence score alone can override missing schedule context, invalid dates, or a new activity proposal.</p></aside></div>}

function Popover({title,children}:{title:string;children:React.ReactNode}){return <div className="popover"><span className="eyebrow">{title}</span>{children}</div>}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){return <div className="modal-backdrop" onMouseDown={e=>e.currentTarget===e.target&&onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><h2 id="modal-title">{title}</h2><button className="icon-btn" aria-label="Close" onClick={onClose}>×</button></div>{children}</div></div>}
