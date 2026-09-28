import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ACTIVITIES, DISCIPLINES, FIELD_EVENTS, REVIEW_QUEUE, AUDIT_TRAIL, MEMORY_ACTIVITIES, PROGRESS_TREND, DELAY_CAUSES, DISCIPLINE_PERF } from './data';

type Role = 'company'|'field';
type Screen = 'command'|'schedule'|'capture'|'review'|'memory'|'trace'|'import'|'analytics'|'team'|'settings'|'field-home'|'my-work'|'submissions'|'notifications'|'profile';
type Modal = 'help'|'notifications'|'activity'|'confirm'|'profile'|'member'|'invite'|null;
type ThemeMode = 'light'|'dark'|'system';

const companyNav: Array<{id:Screen; num:string; label:string; glyph:string}> = [
  {id:'command',num:'01',label:'Command',glyph:'⌂'},
  {id:'schedule',num:'02',label:'Schedule',glyph:'▤'},
  {id:'import',num:'03',label:'Import',glyph:'↑'},
  {id:'review',num:'04',label:'Review',glyph:'!'},
  {id:'analytics',num:'05',label:'Analytics',glyph:'◫'},
  {id:'memory',num:'06',label:'Memory',glyph:'◌'},
  {id:'trace',num:'07',label:'Trace',glyph:'↳'},
  {id:'team',num:'08',label:'Team',glyph:'♙'},
  {id:'settings',num:'09',label:'Settings',glyph:'⚙'},
];
const fieldNav: Array<{id:Screen; num:string; label:string; glyph:string}> = [
  {id:'field-home',num:'01',label:'Field Home',glyph:'⌂'},
  {id:'my-work',num:'02',label:'My Work',glyph:'✓'},
  {id:'capture',num:'03',label:'Capture',glyph:'↗'},
  {id:'submissions',num:'04',label:'Submissions',glyph:'↥'},
  {id:'notifications',num:'05',label:'Notifications',glyph:'!'},
  {id:'profile',num:'06',label:'Profile',glyph:'●'},
];

const pageMeta: Record<Screen,{eyebrow:string;title:string;subtitle:string}> = {
 command:{eyebrow:'COMMAND / PROJECT CONTROL',title:'Execution command',subtitle:'A decision surface connecting baseline intent, field evidence, and verified actuals.'},
 schedule:{eyebrow:'SCHEDULE / L5–L6',title:'Schedule lattice',subtitle:'Inspect executable work, planned dates, actual dates, progress, and linkage evidence in one view.'},
 capture:{eyebrow:'FIELD INTELLIGENCE / INPUT',title:'Field capture',subtitle:'Report what happened on site using text, voice, or any supporting evidence.'},
 review:{eyebrow:'FIELD INTELLIGENCE / HUMAN GATE',title:'Planner review',subtitle:'Resolve ambiguity before an AI suggestion becomes a trusted schedule actual.'},
 memory:{eyebrow:'KNOWLEDGE / VALIDATED ACTUALS',title:'Institutional memory',subtitle:'Preserve real execution durations, recurring delay causes, and productivity evidence for future planning.'},
 trace:{eyebrow:'GOVERNANCE / PROVENANCE',title:'Trace ledger',subtitle:'Every accepted change carries a source, actor, timestamp, decision, and confidence trail.'},
 import:{eyebrow:'DATA INTAKE / CONTROLLED INGESTION',title:'Import center',subtitle:'Bring company schedules and existing project evidence into the Synchronex bridge.'},
 analytics:{eyebrow:'ANALYTICS / PROJECT PERFORMANCE',title:'Project analytics',subtitle:'Turn validated execution data into schedule variance, productivity, delay, and progress insight.'},
 team:{eyebrow:'TEAM / ACCESS CONTROL',title:'Project team',subtitle:'Manage company planners, reviewers, supervisors, and field access.'},
 settings:{eyebrow:'SYSTEM / TRUST CONTROLS',title:'Workspace settings',subtitle:'Define confidence thresholds, project defaults, access, and evidence handling.'},
 'field-home':{eyebrow:'FIELD / TODAY',title:'Field home',subtitle:'See assigned work, recent submissions, and the next action without the planning complexity.'},
 'my-work':{eyebrow:'FIELD / ASSIGNED WORK',title:'My work',subtitle:'View the activities assigned to you and report progress against the approved baseline.'},
 submissions:{eyebrow:'FIELD / SUBMISSIONS',title:'My submissions',subtitle:'Track what you have reported and whether Synchronex accepted or needs more information.'},
 notifications:{eyebrow:'FIELD / NOTIFICATIONS',title:'Notifications',subtitle:'See assignment changes, submission decisions, and messages that need your attention.'},
 profile:{eyebrow:'FIELD / ACCOUNT',title:'My profile',subtitle:'Review your field role, project access, and account details.'},
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
  const [role,setRole]=useState<Role>('company');
  const [authMode,setAuthMode]=useState<'login'|'forgot'>('login');
  const [screen,setScreen]=useState<Screen>('command');
  const [query,setQuery]=useState('');
  const [selectedId,setSelectedId]=useState('PIP-245');
  const [reviewCount,setReviewCount]=useState(REVIEW_QUEUE.length);
  const [reviewIndex,setReviewIndex]=useState(0);
  const [reviewDetailOpen,setReviewDetailOpen]=useState(false);
  const [resolvedReviewIds,setResolvedReviewIds]=useState<string[]>([]);
  const [toast,setToast]=useState('');
  const [modal,setModal]=useState<Modal>(null);
  const [dirty,setDirty]=useState(false);
  const [captureText,setCaptureText]=useState('Piping team completed erection of Line 24 spool section A today. Line 25 erection started at 09:30. Foundation Block A concrete work reached approximately 70%.');
  const [captureStage,setCaptureStage]=useState(0);
  const [captureBusy,setCaptureBusy]=useState(false);
  const [captureResult,setCaptureResult]=useState(false);
  const [captureFiles,setCaptureFiles]=useState<File[]>([]);
  const [recording,setRecording]=useState(false);
  const [recordingSeconds,setRecordingSeconds]=useState(0);
  const [recordedAudioUrl,setRecordedAudioUrl]=useState('');
  const fileInputRef=useRef<HTMLInputElement>(null);
  const mediaRecorderRef=useRef<MediaRecorder|null>(null);
  const recordingChunksRef=useRef<Blob[]>([]);
  const recordingTimerRef=useRef<number|null>(null);
  const [importState,setImportState]=useState<'idle'|'processing'|'success'|'error'>('idle');
  const [importFile,setImportFile]=useState('');
  const [saved,setSaved]=useState(false);
  const [threshold,setThreshold]=useState(90);
  const [themeMode,setThemeMode]=useState<ThemeMode>(()=>{try{const v=localStorage.getItem('synchronex-theme');return v==='light'||v==='dark'||v==='system'?v:'light'}catch{return 'light'}});
  const [density,setDensity]=useState<'comfortable'|'compact'>(()=>{try{return localStorage.getItem('synchronex-density')==='compact'?'compact':'comfortable'}catch{return 'comfortable'}});
  const [emailNotifications,setEmailNotifications]=useState(true);
  const [inAppNotifications,setInAppNotifications]=useState(true);
  const [autoSave,setAutoSave]=useState(true);
  const [dateFormat,setDateFormat]=useState('DD MMM YYYY');
  const [timezone,setTimezone]=useState('Asia/Kolkata');
  const [retention,setRetention]=useState('project');
  const [memberTarget,setMemberTarget]=useState<{initials:string;name:string;role:string;workspace:string;status:string}|null>(null);
  const [memberDraft,setMemberDraft]=useState({role:'',workspace:'',status:'Active',canReview:true,canImport:true,canEditBaseline:false});

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
  const activeReview=openReviewQueue[Math.min(reviewIndex,Math.max(0,openReviewQueue.length-1))] || REVIEW_QUEUE[0];

  const searchResults=useMemo(()=>{const results=searchAll(query); if(role==='company') return results; return results.filter(r=>r.group==='Activities' || r.group==='Field reports / evidence').slice(0,12)},[query,role]);
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
    const root=document.documentElement;
    const applyTheme=()=>{
      const dark=themeMode==='dark' || (themeMode==='system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.dataset.theme=dark?'dark':'light';
      root.dataset.density=density;
    };
    applyTheme();
    try{localStorage.setItem('synchronex-theme',themeMode);localStorage.setItem('synchronex-density',density)}catch{}
    if(themeMode==='system'){
      const media=window.matchMedia('(prefers-color-scheme: dark)');
      const listener=()=>applyTheme();
      media.addEventListener?.('change',listener);
      return ()=>media.removeEventListener?.('change',listener);
    }
  },[themeMode,density]);

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
    if(role==='field'){
      if(r.action.activityId){setSelectedId(r.action.activityId);setScreen('my-work');return;}
      setScreen('submissions');return;
    }
    if(r.action.reviewId){
      const idx=REVIEW_QUEUE.findIndex(x=>x.id===r.action.reviewId);
      if(idx>=0)setReviewIndex(idx);
      setScreen('review');
      setReviewDetailOpen(true);
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
  const handleCaptureFiles=(files:FileList|null)=>{
    if(!files) return;
    setCaptureFiles(prev=>{
      const merged=[...prev,...Array.from(files)];
      return merged.filter((file,i,self)=>self.findIndex(x=>x.name===file.name && x.size===file.size && x.lastModified===file.lastModified)===i);
    });
    setDirty(true);
  };
  const removeCaptureFile=(index:number)=>{setCaptureFiles(files=>files.filter((_,i)=>i!==index));setDirty(true);};
  const startRecording=async()=>{
    if(recording) return;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const recorder=new MediaRecorder(stream);
      recordingChunksRef.current=[];
      recorder.ondataavailable=e=>{if(e.data.size) recordingChunksRef.current.push(e.data);};
      recorder.onstop=()=>{
        const blob=new Blob(recordingChunksRef.current,{type:recorder.mimeType||'audio/webm'});
        if(recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t=>t.stop());
      };
      mediaRecorderRef.current=recorder;
      recorder.start();
      setRecording(true);setRecordingSeconds(0);setDirty(true);
      recordingTimerRef.current=window.setInterval(()=>setRecordingSeconds(s=>s+1),1000);
    }catch{ notify('Microphone access was not granted. Please allow microphone access and try again.'); }
  };
  const stopRecording=()=>{
    const recorder=mediaRecorderRef.current;
    if(!recorder) return;
    recorder.stop();
    mediaRecorderRef.current=null;
    setRecording(false);
    if(recordingTimerRef.current!==null){window.clearInterval(recordingTimerRef.current);recordingTimerRef.current=null;}
  };
  const processVoice=()=>{if(!recordedAudioUrl){notify('Record a voice update first.');return;} setCaptureResult(true); setCaptureStage(1); [2,3,4,5,6].forEach((stage,i)=>window.setTimeout(()=>setCaptureStage(stage),450*(i+1))); window.setTimeout(()=>notify('Voice evidence processed · 3 execution events extracted.'),2800);};
  const formatRecordingTime=(seconds:number)=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;

  const approveReview=()=>{
    if(!activeReview) return;
    setResolvedReviewIds(ids=>ids.includes(activeReview.id)?ids:[...ids,activeReview.id]);
    setReviewCount(c=>Math.max(0,c-1));
    notify(`Match ${activeReview.candidate || 'new activity'} confirmed. Actual update queued with provenance.`);
    setReviewDetailOpen(false);
    setReviewIndex(i=>Math.min(i,Math.max(0,openReviewQueue.length-2)));
  };
  const chooseCandidate=()=>notify('Candidate picker opened. Select the correct L5/L6 activity before applying.');
  const flagNew=()=>{notify('New activity proposal created. Planner confirmation is required before it enters the baseline.');};
  const processImport=()=>{
    if(!importFile){notify('Choose a supported file first.');return;}
    setImportState('processing');
    window.setTimeout(()=>setImportState('success'),1600);
  };

  if(!authenticated) return <AuthScreen mode={authMode} setMode={setAuthMode} role={role} setRole={setRole} onLogin={()=>{setScreen(role==='company'?'command':'field-home');setScheduleDiscipline('All');setSelectedId(ACTIVITIES[0]?.id||'');setDetailId(null);setModal(null);setDirty(false);setAuthenticated(true)}} />;

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
        <button className="profile-chip" aria-label="Open profile" onClick={()=>setModal('profile')}>{role==='company'?'PC':'FS'}</button>
      </div>
      {modal==='notifications' && <Popover title={role==='company'?'Open decisions':'Latest field updates'}>{role==='company'?<><p><b>{reviewCount}</b> field events require planner validation.</p><p>Baseline Rev 04 synced at 09:42.</p><button className="text-action" onClick={()=>{setModal(null);go('review')}}>Open review queue →</button></>:<><p><b>2</b> submissions are being processed.</p><p>One report needs additional information.</p><button className="text-action" onClick={()=>{setModal(null);go('submissions')}}>Open submissions →</button></>}</Popover>}
    </header>

    <aside className="rail">
      <div className="rail-label">{role==='company'?'COMPANY PORTAL':'FIELD PORTAL'}</div>
      <div className="portal-badge"><span className="portal-dot"/>{role==='company'?'Planning & Control':'Execution & Reporting'}</div>
      {(role==='company'?companyNav:fieldNav).map(item=><button key={item.id} className={`rail-item ${screen===item.id?'active':''}`} aria-current={screen===item.id?'page':undefined} onClick={()=>go(item.id)}>
        <span className="rail-num">{item.num}</span><span className="rail-glyph">{item.glyph}</span><span>{item.label}</span>{item.id==='review'&&reviewCount>0?<b className="count-badge">{reviewCount}</b>:null}
      </button>)}
      <div className="rail-bottom"><span className="eyebrow">ACTIVE PROJECT</span><strong>North Field / Phase 1</strong><small>{role==='company'?'Baseline Rev 04 · Synced 09:42':'Field execution · Today'}</small><button onClick={()=>{setRole(role==='company'?'field':'company');setAuthenticated(false);setModal(null);setDirty(false)}}>Switch to {role==='company'?'field':'company'} portal →</button><button onClick={()=>{setAuthenticated(false);setModal(null)}}>Sign out</button></div>
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
              {!searching && Object.keys(groupedResults).map(group=>{const items=groupedResults[group]; return (
                <div className="search-group" key={group}>
                  <span className="search-group-label">{group}</span>
                  {items.slice(0,4).map(r=>{
                    const flatIndex=searchResults.indexOf(r);
                    return <button key={group+r.id} type="button" role="option" aria-selected={flatIndex===activeResult} className={`search-result-row ${flatIndex===activeResult?'active':''}`} onMouseEnter={()=>setActiveResult(flatIndex)} onClick={()=>openResult(r)}>
                      <strong>{highlight(r.label,query)}</strong><span>{r.sub}</span>
                    </button>;
                  })}
                </div>
              )})}
            </div>}
          </div>
          <button className="outline-btn" onClick={()=>notify(role==='company'?'Baseline Rev 04 is active. Changes are tracked against this revision.':'Field execution workspace is connected to the approved company baseline.')}>{role==='company'?<>Baseline <b>04</b></>:'Field mode'}</button>
        </div>
      </div>

      {role==='company' && screen==='command'&&<Command onGo={go} onSelect={(id)=>{setSelectedId(id);go('schedule')}} reviewCount={reviewCount}/>}
      {role==='company' && screen==='schedule'&&<Schedule rows={ACTIVITIES} selectedId={selectedId} onSelect={setSelectedId} selected={selected} onImport={()=>go('import')} discipline={scheduleDiscipline} setDiscipline={setScheduleDiscipline} onOpenDetail={(id)=>{setDetailId(id);setModal('activity')}} />}
      {role==='field' && screen==='capture'&&<Capture text={captureText} setText={(v)=>{setCaptureText(v);setDirty(true)}} stage={captureStage} busy={captureBusy} result={captureResult} run={runCapture} onImport={()=>role==='company'?go('import'):notify('Use the file evidence card below to attach a report.')} files={captureFiles} onFiles={handleCaptureFiles} removeFile={removeCaptureFile} fileInputRef={fileInputRef} recording={recording} recordingSeconds={recordingSeconds} recordedAudioUrl={recordedAudioUrl} startRecording={startRecording} stopRecording={stopRecording} processVoice={processVoice} formatRecordingTime={formatRecordingTime} />}
      {role==='company' && screen==='review'&&<Review count={openReviewQueue.length} item={activeReview} index={reviewIndex} queue={openReviewQueue} onApprove={approveReview} onChoose={chooseCandidate} onFlag={flagNew} onJump={setReviewIndex} detailOpen={reviewDetailOpen} onOpenDetail={(i)=>{setReviewIndex(i);setReviewDetailOpen(true)}} onBack={()=>setReviewDetailOpen(false)} />}
      {role==='company' && screen==='memory'&&<Memory />}
      {role==='company' && screen==='trace'&&<Trace />}
      {role==='company' && screen==='import'&&<Import state={importState} file={importFile} setFile={setImportFile} onProcess={processImport} onRetry={processImport} onOpenReview={()=>go('review')}/>}
      {role==='company' && screen==='analytics'&&<Analytics />}
      {role==='company' && screen==='team'&&<Team onInvite={()=>setModal('invite')} onManage={(m)=>{setMemberTarget(m);setMemberDraft({role:m.role,workspace:m.workspace,status:m.status,canReview:m.role.toLowerCase().includes('review')||m.workspace==='Company',canImport:m.workspace==='Company',canEditBaseline:m.role==='Project Manager'});setModal('member')}} />}
      {role==='company' && screen==='settings'&&<Settings threshold={threshold} setThreshold={setThreshold} saved={saved} onSave={()=>{setSaved(true);notify('Workspace controls saved.')}} themeMode={themeMode} setThemeMode={setThemeMode} density={density} setDensity={setDensity} emailNotifications={emailNotifications} setEmailNotifications={setEmailNotifications} inAppNotifications={inAppNotifications} setInAppNotifications={setInAppNotifications} autoSave={autoSave} setAutoSave={setAutoSave} dateFormat={dateFormat} setDateFormat={setDateFormat} timezone={timezone} setTimezone={setTimezone} retention={retention} setRetention={setRetention}/>}
      {role==='field' && screen==='field-home'&&<FieldHome onGo={go}/>}
      {role==='field' && screen==='my-work'&&<MyWork onCapture={()=>go('capture')}/>}
      {role==='field' && screen==='submissions'&&<Submissions onCapture={()=>go('capture')}/>}
      {role==='field' && screen==='notifications'&&<FieldNotifications />}
      {role==='field' && screen==='profile'&&<FieldProfile onSwitch={()=>{setRole('company');setAuthenticated(false);setModal(null)}} onSignOut={()=>setAuthenticated(false)}/>}
    </main>

    {modal==='help'&&<Modal title="How the planning-to-execution bridge works" onClose={()=>setModal(null)}><div className="flow-list">{[
      ['01','Capture','Receive free text, reports, spreadsheets, site diaries, or supervisor statements.'],
      ['02','Extract','Turn field language into structured execution events: activity, action, date, progress, evidence.'],
      ['03','Link','Search L5/L6 schedule nodes using terminology and granularity-aware matching.'],
      ['04','Confidence gate','High-confidence valid events can auto-apply; ambiguous or unmatched events go to a planner.'],
      ['05','Apply + trace','Write the accepted actual to the schedule and preserve source, actor, confidence, and decision.'],
    ].map(x=><div className="flow-row" key={x[0]}><b>{x[0]}</b><div><strong>{x[1]}</strong><p>{x[2]}</p></div></div>)}</div></Modal>}
    {modal==='profile'&&<Modal title={role==='company'?'Project Controls Engineer':'Field Supervisor'} onClose={()=>setModal(null)}><div className="profile-modal"><div className="profile-avatar">{role==='company'?'PC':'FS'}</div><p><b>{role==='company'?'Planner workspace':'Field execution workspace'}</b><br/>North Field Gas Processing / Phase 1</p><button className="outline-btn" onClick={()=>{setRole(role==='company'?'field':'company');setAuthenticated(false);setModal(null)}}>Switch to {role==='company'?'field':'company'} portal</button><button className="danger-btn" onClick={()=>{setAuthenticated(false);setModal(null)}}>Sign out</button></div></Modal>}
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
    {modal==='member'&&memberTarget&&<Modal title={`Manage ${memberTarget.name}`} onClose={()=>setModal(null)}>
      <div className="member-manage">
        <div className="member-manage-head"><span className="member-avatar large">{memberTarget.initials}</span><div><span className="eyebrow">ACCESS / MEMBER</span><h3>{memberTarget.name}</h3><p>{memberTarget.workspace} workspace · {memberTarget.status}</p></div></div>
        <div className="member-form-grid">
          <label>Role<select value={memberDraft.role} onChange={e=>setMemberDraft({...memberDraft,role:e.target.value})}><option>Project Manager</option><option>Planner / Reviewer</option><option>Field Supervisor</option><option>Field Engineer</option></select></label>
          <label>Workspace<select value={memberDraft.workspace} onChange={e=>setMemberDraft({...memberDraft,workspace:e.target.value})}><option>Company</option><option>Field</option></select></label>
          <label>Status<select value={memberDraft.status} onChange={e=>setMemberDraft({...memberDraft,status:e.target.value})}><option>Active</option><option>Suspended</option></select></label>
        </div>
        <div className="permission-list"><span className="eyebrow">PERMISSIONS</span>
          <label><input type="checkbox" checked={memberDraft.canReview} onChange={e=>setMemberDraft({...memberDraft,canReview:e.target.checked})}/> Review field matches</label>
          <label><input type="checkbox" checked={memberDraft.canImport} onChange={e=>setMemberDraft({...memberDraft,canImport:e.target.checked})}/> Import project data</label>
          <label><input type="checkbox" checked={memberDraft.canEditBaseline} onChange={e=>setMemberDraft({...memberDraft,canEditBaseline:e.target.checked})}/> Edit baseline schedule</label>
        </div>
        <div className="member-manage-actions"><button className="danger-btn" onClick={()=>{setMemberDraft({...memberDraft,status:'Suspended'});notify(`${memberTarget.name} access suspended in this demo.`)}}>Suspend access</button><span/><button className="outline-btn" onClick={()=>setModal(null)}>Cancel</button><button className="primary-btn" onClick={()=>{setModal(null);notify(`${memberTarget.name} access updated.`)}}>Save changes</button></div>
      </div>
    </Modal>}
    {modal==='invite'&&<Modal title="Invite project member" onClose={()=>setModal(null)}>
      <div className="invite-form"><p className="modal-copy">Add a company or field teammate to the active project. Access is scoped to the selected workspace.</p><label>Work email<input type="email" placeholder="name@company.example"/></label><div className="member-form-grid"><label>Workspace<select defaultValue="Company"><option>Company</option><option>Field</option></select></label><label>Role<select defaultValue="Planner / Reviewer"><option>Project Manager</option><option>Planner / Reviewer</option><option>Field Supervisor</option><option>Field Engineer</option></select></label></div><div className="modal-actions"><button className="outline-btn" onClick={()=>setModal(null)}>Cancel</button><button className="primary-btn" onClick={()=>{setModal(null);notify('Invitation created for the selected workspace.')}}>Send invitation →</button></div></div>
    </Modal>}
    {toast&&<div className="toast" role="status"><span>✓</span>{toast}</div>}
  </div>;
}

function AuthScreen({mode,setMode,role,setRole,onLogin}:{mode:'login'|'forgot';setMode:(v:'login'|'forgot')=>void;role:Role;setRole:(v:Role)=>void;onLogin:()=>void}){
 const [email,setEmail]=useState(role==='company'?'planner@northfield.example':'field.supervisor@northfield.example');
 const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const chooseRole=(next:Role)=>{setRole(next);setEmail(next==='company'?'planner@northfield.example':'field.supervisor@northfield.example');setError('');setPassword('')};
 const submit=(e:React.FormEvent)=>{e.preventDefault();setError('');if(!email.includes('@')){setError('Enter a valid work email.');return}if(mode==='login'&&!password){setError('Enter your password.');return}setBusy(true);window.setTimeout(()=>{setBusy(false);if(mode==='forgot'){setError('Demo reset link generated. Check the workspace inbox.')}else onLogin()},700)};
 return <div className="auth-shell"><div className="auth-left"><div className="auth-brand"><span className="brand-mark">S</span><div><strong>SYNCHRONEX</strong><small>EXECUTION INTELLIGENCE</small></div></div><div className="auth-hero"><span className="eyebrow">PLANNING → EXECUTION</span><h1>{role==='company'?'Control the plan. Connect execution.':'Report the work. Keep the plan moving.'}</h1><p>{role==='company'?'Manage the baseline, review field evidence, validate actuals, and preserve project intelligence.':'Report site progress with text, voice, or evidence files without exposing company planning controls.'}</p><div className="auth-path">{role==='company'?<><span>01 Plan</span><i>→</i><span>02 Review</span><i>→</i><span>03 Apply</span><i>→</i><span>04 Learn</span></>:<><span>01 Work</span><i>→</i><span>02 Capture</span><i>→</i><span>03 Submit</span><i>→</i><span>04 Track</span></>}</div></div><div className="auth-note">Demo workspace · synthetic data only · no live project data</div></div><div className="auth-right"><div className="auth-card"><span className="eyebrow">{mode==='login'?'SECURE WORKSPACE':'ACCOUNT RECOVERY'}</span><h2>{mode==='login'?'Choose your workspace':'Recover access'}</h2>{mode==='login'&&<div className="role-switch" role="tablist" aria-label="Workspace type"><button type="button" className={role==='company'?'selected':''} onClick={()=>chooseRole('company')}><strong>Company portal</strong><span>Planning, review & control</span></button><button type="button" className={role==='field'?'selected':''} onClick={()=>chooseRole('field')}><strong>Field portal</strong><span>Work, capture & submissions</span></button></div>}<p>{mode==='login'?(role==='company'?'Use your project-controls account to manage the project workspace.':'Use your field account to report execution and track submissions.'):'Enter your work email to generate a recovery link.'}</p><form onSubmit={submit}><label>Work email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email"/></label>{mode==='login'&&<label>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password"/></label>}{error&&<div className="form-error" role="alert">{error}</div>}<button className="primary-btn" disabled={busy}>{busy?'Working…':mode==='login'?`Enter ${role==='company'?'company':'field'} portal`:'Generate reset link'} <span>→</span></button></form><button className="link-btn" onClick={()=>{setMode(mode==='login'?'forgot':'login');setError('')}}>{mode==='login'?'Forgot password?':'Back to sign in'}</button></div></div></div>
}

function PageSection({label,title,children,action}:{label?:string;title:string;children:React.ReactNode;action?:React.ReactNode}){return <section className="section"><div className="section-head"><div>{label&&<span className="eyebrow">{label}</span>}<h2>{title}</h2></div>{action}</div>{children}</section>}

function Command({onGo,onSelect,reviewCount}:{onGo:(s:Screen)=>void;onSelect:(id:string)=>void;reviewCount:number}){
 const commandSignals=FIELD_EVENTS.slice(0,5);
 return <div className="command-layout"><div className="command-main"><div className="status-strip"><div><span className="eyebrow">BASELINE REV 04</span><strong>North Field Gas Processing Facility — Phase 1</strong></div><div className="status-good"><i/> EXECUTION MODE</div></div><div className="metric-band"><Metric label="L5/L6 activities" value="246" note="executable nodes"/><Metric label="Actual progress" value="52.3%" note="vs 57.0% planned" tone="blue"/><Metric label="Schedule variance" value="−4.7%" note="behind baseline" tone="red"/><Metric label="Review workload" value={String(reviewCount)} note="planner decisions" tone="amber"/></div><PageSection label="BASELINE → ACTUAL" title="Project pulse" action={<button className="outline-btn" onClick={()=>onGo('schedule')}>Open schedule →</button>}><div className="pulse-grid"><div className="trend"><div className="trend-head"><span>Progress trajectory</span><span><b className="legend-line actual"/>Actual <b className="legend-line planned"/>Planned</span></div><div className="chart"><div className="gridlines"/><svg viewBox="0 0 720 220" preserveAspectRatio="none" aria-label="Planned and actual progress trend"><polyline points="0,158 100,142 200,118 300,98 400,79 520,64 720,35" fill="none" stroke="#93a1ad" strokeWidth="2" strokeDasharray="5 5"/><polyline points="0,166 100,151 200,128 300,104 400,88 520,80 720,64" fill="none" stroke="#173f35" strokeWidth="4"/></svg></div><div className="chart-axis"><span>01 Sep</span><span>10 Sep</span><span>18 Sep</span><span>23 Sep</span></div><div className="pulse-kpis"><div><span>ACTUAL</span><b>52.3%</b></div><div><span>PLANNED</span><b>57.0%</b></div><div><span>VARIANCE</span><b className="negative">−4.7%</b></div></div></div></div></PageSection><PageSection label="FIELD INTELLIGENCE" title="Recent execution signals" action={<button className="text-action" onClick={()=>onGo('review')}>Open review →</button>}><div className="signal-table">{commandSignals.map(e=><button key={e.time+e.actId} className="signal-row" onClick={()=>onSelect(e.actId)}><time>{e.time}</time><span className={`signal-tag ${e.status==='REVIEW REQUIRED'?'review':'matched'}`}>{e.status}</span><span className="signal-text">{e.text}</span><code>{e.actId}</code><strong>{e.conf?`${e.conf}%`:''}</strong></button>)}</div></PageSection></div><aside className="command-aside"><div className="aside-block decision-card"><span className="eyebrow">DECISION QUEUE</span><div className="decision-number-row"><strong className="aside-number">{reviewCount}</strong><span className="queue-status">OPEN</span></div><p>Ambiguous or unmatched events need a planner before schedule application.</p><button className="primary-btn" onClick={()=>onGo('review')}>Review decisions →</button></div><div className="aside-block capture-card"><div className="capture-card-icon">↗</div><span className="eyebrow">NEXT CONTROL</span><h3>Review incoming field evidence</h3><p>Field teams submit text, voice, and files. Your team validates uncertain matches before they become schedule actuals.</p><div className="capture-card-meta"><span>FIELD INTAKE</span><span>HUMAN GATE</span></div><button className="outline-btn" onClick={()=>onGo('review')}>Review incoming evidence <span>→</span></button></div><div className="aside-block health-card"><div className="health-head"><span className="eyebrow">PROJECT HEALTH</span><span className="health-dot">● LIVE</span></div><div className="health-line"><span>Baseline completion</span><b>30 Sep</b></div><div className="health-line"><span>Current forecast</span><b>03 Oct</b></div><div className="health-line"><span>Last sync</span><b>09:42</b></div></div></aside></div>
}
function Metric({label,value,note,tone}:{label:string;value:string;note:string;tone?:string}){return <div className="metric"><span>{label}</span><strong className={tone||''}>{value}</strong><small>{note}</small></div>}

function Schedule({rows,selectedId,onSelect,selected,onImport,discipline,setDiscipline,onOpenDetail}:{rows:any[];selectedId:string;onSelect:(id:string)=>void;selected:any;onImport:()=>void;discipline:string;setDiscipline:(d:string)=>void;onOpenDetail:(id:string)=>void}){
  const [statusFilter,setStatusFilter]=useState('All');
  const [sortBy,setSortBy]=useState<'plan'|'progress'|'status'|'id'>('plan');
  const disciplineRows=discipline==='All'?rows:rows.filter(a=>a.discipline===discipline);
  const visibleRows=[...disciplineRows].filter(a=>statusFilter==='All'||a.status===statusFilter).sort((a,b)=>{
    if(sortBy==='progress') return b.progress-a.progress;
    if(sortBy==='status') return a.status.localeCompare(b.status);
    if(sortBy==='id') return a.id.localeCompare(b.id);
    return a.planStart.localeCompare(b.planStart);
  });
  const selectDiscipline=(name:string)=>{
    setDiscipline(name);
    setStatusFilter('All');
    const first=rows.find(a=>a.discipline===name);
    if(first) onSelect(first.id);
  };
  const recentEvidence=(name:string)=>FIELD_EVENTS.filter(e=>ACTIVITIES.find(a=>a.id===e.actId)?.discipline===name).slice(0,2);

  return <div className="schedule-page">
    <PageSection label="EXECUTABLE PLAN / WORKSTREAMS" title="Schedule by discipline" action={<button className="primary-btn" onClick={onImport}>Import schedule ↑</button>}>
      {discipline==='All' ? <div className="discipline-card-grid">
        {DISCIPLINES.map(d=>{
          const evidence=recentEvidence(d.name);
          return <div key={d.name} className="discipline-card" style={{['--discipline-accent' as any]:statusAccent(d.status)}}>
            <button className="discipline-card-hit" onClick={()=>selectDiscipline(d.name)}>
              <div className="discipline-card-top"><span className="discipline-icon">{d.name.slice(0,1)}</span><span className={`status-badge ${d.status==='Delayed'?'delayed':d.variance<0?'risk':'track'}`}>{d.status}</span><span className="card-chevron">→</span></div>
              <div className="discipline-card-title"><strong>{d.name}</strong><b>{d.actual}%</b></div>
              <div className="discipline-progress"><i style={{width:`${d.actual}%`}}/></div>
              <div className="discipline-card-metrics"><span><small>PLANNED</small><b>{d.planned}%</b></span><span><small>VARIANCE</small><b className={d.variance<0?'negative':'positive'}>{d.variance>0?'+':''}{d.variance}%</b></span><span><small>ACTIVITIES</small><b>{d.activities}</b></span></div>
              <div className="discipline-card-milestone"><small>NEXT MILESTONE</small><span>{d.nextMilestone}</span></div>
            </button>
            <div className="discipline-card-foot"><span>{d.milestones} milestones tracked</span><span>{evidence.length} recent evidence signals</span></div>
          </div>;
        })}
      </div> : <>
        <div className="schedule-detail-head"><div><span className="eyebrow">DISCIPLINE SCHEDULE</span><h3>{discipline}</h3><p>Executable activities, dates, progress, and linkage evidence for this workstream.</p></div><button className="filter-btn" onClick={()=>setDiscipline('All')}>← All disciplines</button></div>
        <div className="schedule-filter-bar"><label>Status<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Filter by status"><option value="All">All</option><option value="Planned">Planned</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option></select></label><label>Sort by<select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} aria-label="Sort activities"><option value="plan">Plan date</option><option value="progress">Progress</option><option value="status">Status</option><option value="id">Activity ID</option></select></label><span className="filter-count">{visibleRows.length} of {disciplineRows.length} activities</span></div>
        <div className="schedule-activity-list">{visibleRows.map(a=><button key={a.id} className={`schedule-activity ${a.id===selectedId?'selected':''}`} onClick={()=>{onSelect(a.id);onOpenDetail(a.id);}}><div className="activity-main"><code>{a.id}</code><strong>{a.desc}</strong><small>{a.wbs} executable node</small></div><div className="activity-dates"><span><small>PLAN</small>{a.planStart} → {a.planFinish}</span><span><small>ACTUAL</small>{a.actStart} → {a.actFinish}</span></div><div className="activity-progress"><div><i style={{width:`${a.progress}%`}}/></div><b>{a.progress}%</b></div><span className={`confidence ${a.aiConf>=90?'high':a.aiConf?'medium':'none'}`}>{a.aiConf?`${a.aiConf}% AI`:'No AI link'}</span><span className="activity-arrow">→</span></button>)}{visibleRows.length===0&&<div className="empty-state">No activities match this filter. <button className="text-action" onClick={()=>setStatusFilter('All')}>Clear status filter</button></div>}</div>
      </>}
    </PageSection>
  </div>
}

function Capture({text,setText,stage,busy,result,run,onImport,files,onFiles,removeFile,fileInputRef,recording,recordingSeconds,recordedAudioUrl,startRecording,stopRecording,processVoice,formatRecordingTime}:{text:string;setText:(v:string)=>void;stage:number;busy:boolean;result:boolean;run:()=>void;onImport:()=>void;files:File[];onFiles:(files:FileList|null)=>void;removeFile:(index:number)=>void;fileInputRef:React.RefObject<HTMLInputElement|null>;recording:boolean;recordingSeconds:number;recordedAudioUrl:string;startRecording:()=>void;stopRecording:()=>void;processVoice:()=>void;formatRecordingTime:(seconds:number)=>string}){
  return <div className="capture-layout">
    <div className="capture-main">
      <PageSection label="FIELD INPUT / 01" title="Speak in the language of the site">
        <p className="lead">Paste a daily report, site diary note, or supervisor statement. Synchronex turns execution language into structured events without forcing field teams into a rigid form.</p>
        <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')run()}} aria-label="Field report input" placeholder="Example: Line 24 spool erection completed…"/>
        <div className="capture-actions"><button className="primary-btn" disabled={busy} onClick={run}>{busy?'Extracting events…':'Extract execution events'} <span>↗</span></button><button className="outline-btn" onClick={onImport}>Import instead</button><span className="helper">Ctrl / ⌘ + Enter to extract · demo uses synthetic data</span></div>
        {result&&<ExtractionResult/>}

        <div className="capture-input-grid">
          <section className="capture-source-card">
            <div className="capture-source-head"><div><span className="eyebrow">FILE EVIDENCE / 02</span><h3>Upload any field file</h3><p>Accept documents, spreadsheets, PDFs, images, archives, text files, or any other file type.</p></div><span className="source-icon">↑</span></div>
            <input ref={fileInputRef} type="file" multiple accept="*/*" hidden onChange={e=>{onFiles(e.target.files);e.currentTarget.value='';}} />
            <button className="capture-dropzone" type="button" onClick={()=>fileInputRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();onFiles(e.dataTransfer.files);}}>
              <strong>Drop files here or browse</strong><span>Any file type · multiple files supported</span><small>PDF · Word · Excel · CSV · TXT · images · ZIP · and more</small>
            </button>
            {files.length>0&&<div className="capture-file-list">{files.map((file,i)=><div className="capture-file-row" key={`${file.name}-${file.lastModified}`}><div><strong>{file.name}</strong><span>{file.type||'Unknown file type'} · {(file.size/1024/1024).toFixed(2)} MB</span></div><button type="button" aria-label={`Remove ${file.name}`} onClick={()=>removeFile(i)}>×</button></div>)}</div>}
            <div className="capture-source-actions"><button className="primary-btn" disabled={!files.length} onClick={run}>Extract from {files.length||0} file{files.length===1?'':'s'} →</button><span className="helper">Original files remain available as source evidence.</span></div>
          </section>

          <section className="capture-source-card voice-card">
            <div className="capture-source-head"><div><span className="eyebrow">VOICE EVIDENCE / 03</span><h3>Record a field update</h3><p>Capture a supervisor or site-team statement directly from the microphone.</p></div><span className="source-icon">◉</span></div>
            <div className={`voice-recorder ${recording?'recording':''}`}><div className="voice-status-dot">{recording?'●':'○'}</div><div><strong>{recording?'Recording field statement':'Ready to record'}</strong><span>{recording?formatRecordingTime(recordingSeconds):'Use your browser microphone'}</span></div></div>
            <div className="voice-actions">{!recording?<button className="primary-btn" onClick={startRecording}>● Start recording</button>:<button className="danger-btn" onClick={stopRecording}>■ Stop recording</button>}</div>
            {recordedAudioUrl&&<div className="voice-preview"><span className="eyebrow">RECORDED EVIDENCE</span><audio controls src={recordedAudioUrl}/><button className="outline-btn" onClick={processVoice}>Process voice evidence →</button></div>}
            <span className="helper">Microphone access is requested only when recording starts. Audio can later feed the same extraction and matching pipeline.</span>
          </section>
        </div>
      </PageSection>
    </div>
    <aside className="process-panel"><span className="eyebrow">PROCESS / 04</span>{stages.map((s,i)=><div className={`process-step ${stage===i+1?'active':''} ${stage>i+1?'done':''}`} key={s}><b>0{i+1}</b><span>{s}</span><i>{stage>i+1?'✓':stage===i+1?'●':'○'}</i></div>)}<div className="human-loop"><b>Human stays in the loop.</b><p>Ambiguous matches never disappear. They move to review with candidate activities and evidence.</p></div></aside>
  </div>
}
function ExtractionResult(){return <div className="result-panel"><div className="result-head"><div><span className="eyebrow">EXTRACTION COMPLETE</span><h3>3 execution events found</h3></div><span className="success-chip">2 auto-linkable · 1 review</span></div><div className="event-cards"><EventCard id="PIP-245" text="Line 24 spool section A completed" conf={96} status="Matched"/><EventCard id="PIP-246" text="Line 25 erection started at 09:30" conf={91} status="Matched"/><EventCard id="CIV-022 / CIV-023" text="Foundation Block A reached ~70%" conf={78} status="Review required"/></div></div>}
function EventCard({id,text,conf,status}:{id:string;text:string;conf:number;status:string}){return <div className="event-card"><div><span className={`signal-tag ${status==='Matched'?'matched':'review'}`}>{status}</span><strong>{text}</strong></div><div><code>{id}</code><b className={conf>=90?'green':'amber'}>{conf}%</b></div></div>}

function Review({count,item,index,queue,onApprove,onChoose,onFlag,onJump,detailOpen,onOpenDetail,onBack}:{count:number;item:any;index:number;queue:any[];onApprove:()=>void;onChoose:()=>void;onFlag:()=>void;onJump:(i:number)=>void;detailOpen:boolean;onOpenDetail:(i:number)=>void;onBack:()=>void}){
  const queueRows=queue.map((q,i)=><tr key={q.id} onClick={()=>onOpenDetail(i)}><td><code>{q.id}</code></td><td><strong>{q.text.replace(/"/g,'')}</strong></td><td>{q.candidate||'—'}</td><td><b className={q.conf>=80?'review-conf-high':'review-conf'}>{q.conf?`${q.conf}%`:'—'}</b></td><td>{q.issue}</td><td><span className={`review-status ${q.status==='Unmatched'?'unmatched':''}`}>{q.status}</span></td><td><span className="review-open-arrow">Open →</span></td></tr>);
  if(!detailOpen){
    return <div className="review-queue-page"><PageSection label="HUMAN VALIDATION / CONFIDENCE GATE" title="Review queue" action={<span className="queue-count">{count} open</span>}>
      <div className="review-queue-intro"><div><strong>Select a field event to open planner validation.</strong><p>Review ambiguous or unmatched execution signals before they become trusted schedule actuals.</p></div><div className="review-filters"><button className="filter-btn">All Confidence⌄</button><button className="filter-btn">All Disciplines⌄</button><button className="filter-btn">All Issues⌄</button></div></div>
      <div className="review-table-wrap"><table className="review-table"><thead><tr><th>Queue ID</th><th>Field event</th><th>Candidate</th><th>Confidence</th><th>Issue</th><th>Status</th><th></th></tr></thead><tbody>{queue.length?queueRows:<tr><td colSpan={7}><div className="review-empty"><strong>Queue cleared</strong><span>All open decisions have been resolved for this session.</span></div></td></tr>}</tbody></table></div>
    </PageSection></div>
  }
  return <div className="review-detail-page"><PageSection label={`HUMAN VALIDATION / EVENT ${String(index+1).padStart(2,'0')} / ${item?.id}`} title="Resolve before apply" action={<button className="outline-btn" onClick={onBack}>← Back to review queue</button>}>
    <div className="review-detail-grid">
      <main className="review-detail-main">
        <div className="review-hero"><div><span className="eyebrow">ORIGINAL FIELD EVENT</span><blockquote>{item?.text}</blockquote><span className="issue-chip">{item?.issue}</span></div><div className="confidence-ring"><b>{item?.conf || 0}%</b><span>AI confidence</span></div></div>
        <div className="candidate-grid"><div className="candidate selected"><span className="eyebrow">CURRENT CANDIDATE</span><code>{item?.candidate || 'No activity'}</code><strong>{item?.candidate ? (ACTIVITIES.find(a=>a.id===item.candidate)?.desc || `Baseline activity ${item.candidate}`) : 'No matching baseline node'}</strong><p>Match evidence combines terminology, discipline, schedule context, and granularity.</p><span className="evidence-score">Evidence alignment · {item?.conf || 0}%</span></div><div className="candidate"><span className="eyebrow">DECISION REQUIRED</span><strong>{item?.candidate?'Confirm or choose another':'Create a new activity proposal'}</strong><p>{item?.candidate?'Verify the suggested L5/L6 node against the source statement.':'Do not silently drop unmatched work. Flag it for planner review and baseline control.'}</p></div></div>
        <div className="review-actions"><button className="primary-btn" onClick={onApprove}>Confirm match & apply →</button><button className="outline-btn" onClick={onChoose}>Choose different activity</button><button className="danger-btn" onClick={onFlag}>Flag as new activity</button></div><p className="helper">Applying writes an actual update and creates an append-only trace record.</p>
      </main>
      <aside className="review-validation-panel"><span className="eyebrow">VALIDATION CHECKS</span>{['Source preserved','Activity exists in baseline','Discipline consistent','Date is valid','Confidence below auto-apply threshold'].map((x,i)=><div className="check-row" key={x}><span>{i<4?'✓':'!'}</span><p>{x}<small>{i<4?'Passed':'Planner decision required'}</small></p></div>)}<div className="review-rule"/><span className="eyebrow">EDGE CASE</span><p className="aside-copy">Granularity mismatch is surfaced explicitly. Field detail can be richer than the plan; the system must never silently discard it.</p></aside>
    </div>
  </PageSection></div>
}
function Memory(){
  const [selectedType,setSelectedType]=useState<string|null>(null);
  const [selectedOccurrence,setSelectedOccurrence]=useState<any|null>(null);
  const selected=MEMORY_ACTIVITIES.find(m=>m.type===selectedType) || null;

  const occurrenceData: Record<string, Array<{id:string;date:string;duration:string;discipline:string;evidence:string;status:string}>> = {
    'Pipe Erection': [
      {id:'PE-042',date:'23 Sep 2026',duration:'8 days',discipline:'Piping',evidence:'P-101 Spool B erection completed after material release.',status:'Validated'},
      {id:'PE-041',date:'19 Sep 2026',duration:'7 days',discipline:'Piping',evidence:'Pipe erection progressed across the north rack workfront.',status:'Validated'},
      {id:'PE-040',date:'14 Sep 2026',duration:'6 days',discipline:'Piping',evidence:'Spool erection completed with inspection handover.',status:'Validated'},
      {id:'PE-039',date:'08 Sep 2026',duration:'9 days',discipline:'Piping',evidence:'Erection extended due to material availability constraint.',status:'Validated'},
      {id:'PE-038',date:'01 Sep 2026',duration:'7 days',discipline:'Piping',evidence:'Pipe erection completed for the assigned workfront.',status:'Validated'},
    ],
    'Foundation Work': [
      {id:'FW-031',date:'22 Sep 2026',duration:'10 days',discipline:'Civil',evidence:'Foundation block concrete and curing activities completed.',status:'Validated'},
      {id:'FW-030',date:'16 Sep 2026',duration:'9 days',discipline:'Civil',evidence:'Foundation work completed after inspection clearance.',status:'Validated'},
      {id:'FW-029',date:'10 Sep 2026',duration:'8 days',discipline:'Civil',evidence:'Foundation excavation, reinforcement and pour completed.',status:'Validated'},
      {id:'FW-028',date:'03 Sep 2026',duration:'11 days',discipline:'Civil',evidence:'Additional preparation work extended the foundation cycle.',status:'Validated'},
      {id:'FW-027',date:'27 Aug 2026',duration:'9 days',discipline:'Civil',evidence:'Foundation block released for the next work package.',status:'Validated'},
    ],
    'Cable Installation': [
      {id:'CI-027',date:'23 Sep 2026',duration:'6 days',discipline:'Electrical',evidence:'Cable pulling and termination completed for the panel area.',status:'Validated'},
      {id:'CI-026',date:'17 Sep 2026',duration:'5 days',discipline:'Electrical',evidence:'Cable installation completed after route clearance.',status:'Validated'},
      {id:'CI-025',date:'11 Sep 2026',duration:'4 days',discipline:'Electrical',evidence:'Cable pulling completed for the assigned tray section.',status:'Validated'},
      {id:'CI-024',date:'05 Sep 2026',duration:'5 days',discipline:'Electrical',evidence:'Cable installation and tagging verified.',status:'Validated'},
      {id:'CI-023',date:'29 Aug 2026',duration:'5 days',discipline:'Electrical',evidence:'Installation completed and handed over for testing.',status:'Validated'},
    ],
    'Instrument Hook-Up': [
      {id:'IH-018',date:'24 Sep 2026',duration:'9 days',discipline:'Instrumentation',evidence:'Instrument hook-up completed and prepared for loop checks.',status:'Validated'},
      {id:'IH-017',date:'18 Sep 2026',duration:'8 days',discipline:'Instrumentation',evidence:'Field instruments connected after cable readiness.',status:'Validated'},
      {id:'IH-016',date:'12 Sep 2026',duration:'7 days',discipline:'Instrumentation',evidence:'Hook-up completed with inspection sign-off.',status:'Validated'},
      {id:'IH-015',date:'06 Sep 2026',duration:'9 days',discipline:'Instrumentation',evidence:'Additional calibration checks extended execution.',status:'Validated'},
      {id:'IH-014',date:'30 Aug 2026',duration:'8 days',discipline:'Instrumentation',evidence:'Instrument hook-up completed for the assigned package.',status:'Validated'},
    ],
    'Equipment Alignment': [
      {id:'EA-022',date:'21 Sep 2026',duration:'5 days',discipline:'Mechanical',evidence:'Pump alignment completed and recorded in the field report.',status:'Validated'},
      {id:'EA-021',date:'15 Sep 2026',duration:'4 days',discipline:'Mechanical',evidence:'Equipment alignment completed after baseplate correction.',status:'Validated'},
      {id:'EA-020',date:'09 Sep 2026',duration:'4 days',discipline:'Mechanical',evidence:'Alignment verified within accepted tolerance.',status:'Validated'},
      {id:'EA-019',date:'03 Sep 2026',duration:'3 days',discipline:'Mechanical',evidence:'Initial alignment completed for the equipment package.',status:'Validated'},
      {id:'EA-018',date:'28 Aug 2026',duration:'5 days',discipline:'Mechanical',evidence:'Re-alignment required following inspection feedback.',status:'Validated'},
    ],
    'Structural Steel': [
      {id:'SS-015',date:'20 Sep 2026',duration:'13 days',discipline:'Structural',evidence:'Structural steel erection completed for the north module.',status:'Validated'},
      {id:'SS-014',date:'12 Sep 2026',duration:'12 days',discipline:'Structural',evidence:'Steel erection progressed with staged material releases.',status:'Validated'},
      {id:'SS-013',date:'04 Sep 2026',duration:'11 days',discipline:'Structural',evidence:'Structural frame completed and released for follow-on work.',status:'Validated'},
      {id:'SS-012',date:'27 Aug 2026',duration:'13 days',discipline:'Structural',evidence:'Erection cycle extended due to access constraints.',status:'Validated'},
      {id:'SS-011',date:'15 Aug 2026',duration:'12 days',discipline:'Structural',evidence:'Steel package completed with inspection evidence retained.',status:'Validated'},
    ],
  };

  if(selected){
    const occurrences=occurrenceData[selected.type] || [];
    return <PageSection label="INSTITUTIONAL MEMORY / OCCURRENCE DETAIL" title={selected.type} action={<button className="outline-btn" onClick={()=>setSelectedType(null)}>← Back to Memory</button>}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:20,marginBottom:22}}>
        <div>
          <p className="lead" style={{marginBottom:6}}>Validated execution occurrences retained as reusable evidence for future planning.</p>
          <span style={{fontFamily:'var(--font-mono)',fontSize:12,color:'#64748B'}}>{selected.occurrences} total occurrences · synthetic demo evidence</span>
        </div>
        <div style={{display:'flex',gap:28,flexShrink:0}}>
          <div><span className="eyebrow">BASELINE AVG</span><strong style={{display:'block',fontSize:20}}>{selected.baselineAvg}</strong></div>
          <div><span className="eyebrow">ACTUAL AVG</span><strong style={{display:'block',fontSize:20}}>{selected.actualAvg}</strong></div>
          <div><span className="eyebrow">DRIFT</span><strong style={{display:'block',fontSize:20,color:'#B91C1C'}}>{selected.variance}</strong></div>
        </div>
      </div>
      <div className="memory-table">
        <table>
          <thead><tr><th>Occurrence</th><th>Date</th><th>Duration</th><th>Discipline</th><th>Execution evidence</th><th>Status</th></tr></thead>
          <tbody>{occurrences.map(o=><tr key={o.id} className="memory-occurrence-row" onClick={()=>setSelectedOccurrence(o)} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setSelectedOccurrence(o)}}>
            <td><code>{o.id}</code></td><td>{o.date}</td><td>{o.duration}</td><td>{o.discipline}</td><td style={{maxWidth:420}}>{o.evidence}</td><td><span className="trace-chip">{o.status}</span></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="memory-cards" style={{marginTop:16}}>
        <div><span className="eyebrow">TRACEABILITY</span><strong>Evidence retained</strong><p>Each occurrence remains linked to validated execution evidence.</p></div>
        <div><span className="eyebrow">BENCHMARK</span><strong>{selected.actualAvg}</strong><p>Observed average duration across {selected.occurrences} occurrences.</p></div>
        <div><span className="eyebrow">REUSE</span><strong>Planning reference</strong><p>Available as historical context for future similar activities.</p></div>
      </div>
      {selectedOccurrence&&<div className="memory-occurrence-overlay" role="dialog" aria-modal="true" aria-labelledby="occurrence-detail-title" onMouseDown={e=>{if(e.currentTarget===e.target)setSelectedOccurrence(null)}}>
        <div className="memory-occurrence-card">
          <div className="memory-occurrence-head">
            <div><span className="eyebrow">OCCURRENCE DETAIL / VALIDATED EVIDENCE</span><h2 id="occurrence-detail-title">{selectedOccurrence.id}</h2><p>{selected.type} · {selectedOccurrence.discipline}</p></div>
            <button className="icon-btn memory-occurrence-close" aria-label="Close occurrence details" onClick={()=>setSelectedOccurrence(null)}>×</button>
          </div>
          <div className="memory-occurrence-status"><span className="trace-chip">{selectedOccurrence.status}</span><span>Linked to institutional memory</span></div>
          <div className="memory-occurrence-grid">
            <div><span>OCCURRENCE DATE</span><b>{selectedOccurrence.date}</b></div>
            <div><span>ACTUAL DURATION</span><b>{selectedOccurrence.duration}</b></div>
            <div><span>DISCIPLINE</span><b>{selectedOccurrence.discipline}</b></div>
            <div><span>ACTIVITY TYPE</span><b>{selected.type}</b></div>
            <div><span>UPLOADED ON</span><b>{selectedOccurrence.date} · 18:30 IST</b></div>
            <div><span>UPLOADED BY</span><b>{selectedOccurrence.discipline==='Piping'?'Site Supervisor · Arun Kumar':selectedOccurrence.discipline==='Civil'?'Civil Supervisor · Karthik R':'Discipline Supervisor · Priya S'}</b></div>
            <div className="wide"><span>SOURCE FILE</span><b>Daily_{selectedOccurrence.discipline.replace(/\s+/g,'_')}_Report_{selectedOccurrence.id}.pdf</b></div>
            <div className="wide"><span>EXECUTION EVIDENCE</span><p>{selectedOccurrence.evidence}</p></div>
          </div>
          <div className="memory-occurrence-footer"><button className="outline-btn" onClick={()=>setSelectedOccurrence(null)}>← Back to occurrences</button><span>Source preserved · audit trace available</span></div>
        </div>
      </div>}
    </PageSection>;
  }

  return <PageSection label="INSTITUTIONAL MEMORY / SYNTHETIC DEMO DATA" title="What execution teaches the next project" action={<button className="outline-btn">Export knowledge ↗</button>}>
    <p className="lead">Only validated actuals become reusable evidence. Every benchmark remains traceable to the execution events that produced it.</p>
    <div className="memory-table"><table><thead><tr><th>Activity type</th><th>Baseline avg</th><th>Actual avg</th><th>Drift</th><th>Occurrences</th><th>Evidence</th></tr></thead><tbody>{MEMORY_ACTIVITIES.map(m=><tr key={m.type} onClick={()=>setSelectedType(m.type)} style={{cursor:'pointer'}} title="View occurrence details">
      <td><strong>{m.type}</strong><div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'#94A3B8',marginTop:3}}>View occurrence details →</div></td><td>{m.baselineAvg}</td><td>{m.actualAvg}</td><td className="negative">{m.variance}</td><td>{m.occurrences}</td><td><span className="trace-chip">Traceable</span></td>
    </tr>)}</tbody></table></div>
    <div className="memory-cards"><div><span className="eyebrow">DELAY PATTERN</span><strong>Material availability</strong><p>31% of demo delay events</p></div><div><span className="eyebrow">PRODUCTIVITY SIGNAL</span><strong>Piping · 69%</strong><p>Derived from validated synthetic actuals</p></div><div><span className="eyebrow">KNOWLEDGE STATUS</span><strong>Traceable</strong><p>Source evidence retained with every benchmark</p></div></div>
  </PageSection>;
}

function Trace(){return <PageSection label="AUDIT / APPEND-ONLY PROVENANCE" title="Trace every accepted change" action={<button className="outline-btn">Export ledger ↗</button>}><div className="trace-intro"><div><strong>Every field statement can be followed to its schedule consequence.</strong><p>Source → extraction → candidate → planner decision → actual update.</p></div><span className="trace-chip">8 demo records</span></div><div className="trace-table"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Object</th><th>Source</th><th>Change</th><th>Confidence</th></tr></thead><tbody>{AUDIT_TRAIL.map((a,i)=><tr key={i}><td>{a.ts}</td><td><span className="actor">{a.actor}</span></td><td>{a.action}</td><td><code>{a.activity}</code></td><td>{a.source}</td><td>{a.prev} → <b>{a.next}</b></td><td>{a.conf?`${a.conf}%`:'—'}</td></tr>)}</tbody></table></div></PageSection>}

function Import({state,file,setFile,onProcess,onRetry,onOpenReview}:{state:'idle'|'processing'|'success'|'error';file:string;setFile:(v:string)=>void;onProcess:()=>void;onRetry:()=>void;onOpenReview:()=>void}){
  const inputRef=useRef<HTMLInputElement>(null);
  const [kind,setKind]=useState<'schedule'|'evidence'>('evidence');
  const [dragOver,setDragOver]=useState<'schedule'|'evidence'|null>(null);
  const choose=(nextKind:'schedule'|'evidence')=>{setKind(nextKind);inputRef.current?.click()};
  const handleFiles=(files:FileList|null,nextKind:typeof kind=kind)=>{
    const first=files?.[0];
    if(!first) return;
    setKind(nextKind);
    setFile(first.name);
  };
  const onDrop=(e:React.DragEvent<HTMLDivElement>,nextKind:typeof kind)=>{
    e.preventDefault();
    setDragOver(null);
    handleFiles(e.dataTransfer.files,nextKind);
  };
  const formats=kind==='schedule'?['Primavera','MS Project','ProjectLibre','Excel','CSV']:['PDF','Word','Excel','CSV','TXT','Images','Any file'];
  return <div className="import-page">
    <PageSection label="COMPANY / DATA INTAKE" title="Import center" action={<span className="trace-chip">Company controlled</span>}>
      <div className="import-purpose"><span className="eyebrow">WHY IMPORT EXISTS</span><h3>Bring existing company data into the Synchronex bridge.</h3><p>Use <b>Schedule Import</b> for the approved baseline. Use <b>Evidence Import</b> for project documents already produced by the organization. Field teams use Capture for live execution updates.</p></div>
      <div className="import-choice-grid import-choice-grid-clean">
        <article className={`import-choice ${kind==='schedule'?'selected-source':''}`}>
          <div className="import-choice-top"><span className="import-choice-icon">▤</span><span className="trace-chip">BASELINE</span></div>
          <span className="eyebrow">01 / SCHEDULE IMPORT</span><h3>Bring in the baseline plan</h3><p>Upload the approved planning file and prepare WBS, activity IDs, dates, dependencies, and levels for a new baseline revision.</p>
          <div className="import-format-list">{['Primavera','MS Project','ProjectLibre','Excel','CSV'].map(x=><span key={x}>{x}</span>)}</div>
          <div className={`import-drop-zone ${dragOver==='schedule'?'dragging':''}`} role="button" tabIndex={0} onClick={()=>choose('schedule')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')choose('schedule')}} onDragOver={e=>{e.preventDefault();setDragOver('schedule')}} onDragLeave={()=>setDragOver(null)} onDrop={e=>onDrop(e,'schedule')}>
            <strong>{file&&kind==='schedule'?file:'Drop schedule file here'}</strong><span>Any file can be selected. Validation happens after upload.</span><small>Choose a file or drag it into this area</small>
          </div>
          <button className="primary-btn import-select-btn" onClick={()=>choose('schedule')}>{file&&kind==='schedule'?'Replace schedule file':'Select schedule file'} <span>→</span></button>
          <small className="import-note">Creates a candidate baseline revision; publishing remains company-controlled.</small>
        </article>

        <article className={`import-choice ${kind==='evidence'?'selected-source':''}`}>
          <div className="import-choice-top"><span className="import-choice-icon">↑</span><span className="trace-chip">EVIDENCE</span></div>
          <span className="eyebrow">02 / EVIDENCE IMPORT</span><h3>Process existing project evidence</h3><p>Upload reports and documents already collected by the project. Synchronex extracts execution events, matches them to the baseline, and routes ambiguity to Review.</p>
          <div className="import-format-list">{['PDF','Word','Excel','CSV','TXT','Images','Any file'].map(x=><span key={x}>{x}</span>)}</div>
          <div className={`import-drop-zone ${dragOver==='evidence'?'dragging':''}`} role="button" tabIndex={0} onClick={()=>choose('evidence')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')choose('evidence')}} onDragOver={e=>{e.preventDefault();setDragOver('evidence')}} onDragLeave={()=>setDragOver(null)} onDrop={e=>onDrop(e,'evidence')}>
            <strong>{file&&kind==='evidence'?file:'Drop any evidence file here'}</strong><span>PDF, Word, Excel, images, archives, text, or any other file type.</span><small>Source is preserved before extraction</small>
          </div>
          <button className="outline-btn import-select-btn" onClick={()=>choose('evidence')}>{file&&kind==='evidence'?'Replace evidence file':'Select evidence file'} <span>→</span></button>
          <small className="import-note">Use Capture instead when a field user is reporting live from site.</small>
        </article>
      </div>
      <input ref={inputRef} className="file-input-hidden" type="file" multiple accept="*/*" onChange={e=>{handleFiles(e.target.files);e.currentTarget.value='';}} aria-label="Select import file" />
      {(state!=='idle'||file) && <div className={`import-status-banner ${state}`} role="status">
        <div>
          <span className="eyebrow">IMPORT STATUS</span>
          <strong>{state==='processing'?'Processing import…':state==='success'?'Import processed successfully':state==='error'?'Import needs attention':'File selected'}</strong>
          <p>{file ? `${file} · ${kind==='schedule'?'Schedule baseline':'Project evidence'}` : 'Select a schedule or evidence file to begin.'}</p>
        </div>
        <div className="import-status-actions">
          {state==='processing' && <span className="import-status-chip">Processing</span>}
          {state==='success' && <><span className="import-status-chip success">Complete</span><button className="text-action" onClick={onOpenReview}>Open review →</button></>}
          {state==='error' && <button className="outline-btn" onClick={onRetry}>Retry</button>}
        </div>
      </div>}
    </PageSection>
  </div>
}

function FieldHome({onGo}:{onGo:(s:Screen)=>void}){
  const assigned=ACTIVITIES.filter(a=>a.status!=='Completed').slice(0,3);
  return <div className="field-page">
    <PageSection label="FIELD / TODAY" title="Field home" action={<button className="primary-btn" onClick={()=>onGo('capture')}>Report progress →</button>}>
      <div className="field-summary-grid"><div className="field-summary"><span className="eyebrow">TODAY'S WORK</span><strong>{assigned.length}</strong><small>Assigned activities in this demo</small></div><div className="field-summary"><span className="eyebrow">PENDING SUBMISSIONS</span><strong>2</strong><small>Reports currently processing</small></div><div className="field-summary"><span className="eyebrow">BASELINE</span><strong>REV 04</strong><small>Approved company schedule</small></div></div>
      <div className="field-home-grid">
        <div className="field-panel"><div className="panel-heading"><div><span className="eyebrow">MY WORK</span><h3>Today's assigned activities</h3></div><button className="text-action" onClick={()=>onGo('my-work')}>View all →</button></div>{assigned.map(a=><button className="field-work-card" key={a.id} onClick={()=>onGo('my-work')}><div><code>{a.id}</code><strong>{a.desc}</strong><small>{a.discipline} · {a.wbs}</small></div><div><span>Progress</span><b>{a.progress}%</b></div><i>→</i></button>)}</div>
        <div className="field-panel"><div className="panel-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h3>Your submissions</h3></div></div><div className="submission-mini"><span className="submission-state accepted">Accepted</span><strong>P-101 Spool B erection</strong><small>Submitted today · linked to PIP-261</small></div><div className="submission-mini"><span className="submission-state review">Under review</span><strong>Line 25 erection started</strong><small>Submitted today · planner validation pending</small></div><button className="outline-btn full" onClick={()=>onGo('submissions')}>Open submissions →</button></div>
      </div>
    </PageSection>
  </div>
}

function MyWork({onCapture}:{onCapture:()=>void}){
  return <div className="field-page"><PageSection label="FIELD / ASSIGNED WORK" title="My work" action={<button className="primary-btn" onClick={onCapture}>Report progress →</button>}><div className="field-work-list">{ACTIVITIES.slice(0,10).map(a=><button className="field-work-card" key={a.id} onClick={onCapture}><div><code>{a.id}</code><strong>{a.desc}</strong><small>{a.discipline} · {a.planStart} → {a.planFinish}</small></div><div className="field-progress"><span>Current</span><b>{a.progress}%</b><div className="bar-track"><i style={{width:`${a.progress}%`}}/></div></div><i>→</i></button>)}</div></PageSection></div>
}

function Submissions({onCapture}:{onCapture:()=>void}){
  const submissions=[
    {status:'Accepted',cls:'accepted',title:'P-101 Spool B erection',meta:'Today · 10:32 · linked to PIP-261'},
    {status:'Under review',cls:'review',title:'Line 25 erection started',meta:'Today · 11:14 · planner validation pending'},
    {status:'Needs information',cls:'needs',title:'Foundation Block A update',meta:'Yesterday · 17:45 · add workfront context'},
  ];
  return <div className="field-page"><PageSection label="FIELD / SUBMISSIONS" title="My submissions" action={<button className="primary-btn" onClick={onCapture}>New report →</button>}><div className="field-submissions-list">{submissions.map(s=><div className="submission-card" key={s.title}><div><span className={`submission-state ${s.cls}`}>{s.status}</span><strong>{s.title}</strong><small>{s.meta}</small></div><span className="submission-arrow">→</span></div>)}</div></PageSection></div>
}

function FieldNotifications(){
  const items=[
    ['Assignment updated','P-101 Spool B remains assigned to your workfront.','10 min ago'],
    ['Submission under review','Line 25 erection started is awaiting planner validation.','35 min ago'],
    ['Schedule notice','MCC-2 panel installation is planned for 25 Sep.','2 hr ago'],
  ];
  return <div className="field-page"><PageSection label="FIELD / NOTIFICATIONS" title="Notifications"><div className="field-notification-list">{items.map(([title,body,time])=><div className="notification-card" key={title}><div><span className="eyebrow">{time}</span><strong>{title}</strong><p>{body}</p></div><span>•</span></div>)}</div></PageSection></div>
}

function FieldProfile({onSwitch,onSignOut}:{onSwitch:()=>void;onSignOut:()=>void}){
  return <div className="field-page"><PageSection label="FIELD / ACCOUNT" title="My profile"><div className="field-profile-card"><div className="profile-avatar">FS</div><div><span className="eyebrow">FIELD SUPERVISOR</span><h3>Karthik R</h3><p>North Field Gas Processing / Phase 1</p></div><div className="profile-actions"><button className="outline-btn" onClick={onSwitch}>Switch to company portal</button><button className="danger-btn" onClick={onSignOut}>Sign out</button></div></div><div className="profile-details-grid"><div><span>DISCIPLINE</span><b>Piping</b></div><div><span>WORKSPACE</span><b>Field execution</b></div><div><span>ACCESS</span><b>Report · Capture · Submit</b></div><div><span>BASELINE</span><b>Rev 04 · Read only</b></div></div></PageSection></div>
}

function Analytics(){
  const totalActivities=ACTIVITIES.length;
  const avgActual=Math.round(ACTIVITIES.reduce((sum,a)=>sum+a.progress,0)/Math.max(totalActivities,1));
  const matched=FIELD_EVENTS.filter(e=>e.conf>=90).length;
  const review=REVIEW_QUEUE.filter(r=>r.status==='Review').length;
  const unmatched=REVIEW_QUEUE.filter(r=>r.status==='Unmatched').length;
  return <div className="analytics-page">
    <PageSection label="ANALYTICS / PROJECT PERFORMANCE" title="Project analytics">
      <div className="analytics-summary-grid">
        <div className="analytics-kpi"><span className="eyebrow">ACTUAL PROGRESS</span><strong>{avgActual}%</strong><small>Across {totalActivities} executable demo activities</small></div>
        <div className="analytics-kpi"><span className="eyebrow">PLAN TRAJECTORY</span><strong>57%</strong><small>Current planned project progress</small></div>
        <div className="analytics-kpi"><span className="eyebrow">REVIEW WORKLOAD</span><strong>{review}</strong><small>Ambiguous events awaiting planner action</small></div>
        <div className="analytics-kpi"><span className="eyebrow">UNMATCHED</span><strong>{unmatched}</strong><small>Explicit new-activity proposals</small></div>
      </div>
      <div className="analytics-grid-two">
        <div className="analytics-panel">
          <div className="analytics-panel-head"><div><span className="eyebrow">PROGRESS TRAJECTORY</span><h3>Planned vs actual</h3></div><span className="trace-chip">Rev 04</span></div>
          <div className="analytics-chart">
            <div className="analytics-ylabels"><span>60%</span><span>45%</span><span>30%</span><span>15%</span><span>0%</span></div>
            <div className="analytics-plot">
              <div className="analytics-gridlines"><i/><i/><i/><i/><i/></div>
              <svg viewBox="0 0 640 240" preserveAspectRatio="none" aria-label="Planned and actual progress chart">
                <polyline points="0,150 106,130 213,105 320,83 427,64 533,43 640,23" fill="none" stroke="var(--info)" strokeWidth="3" strokeDasharray="8 7"/>
                <polyline points="0,166 106,146 213,118 320,91 427,72 533,63 640,49" fill="none" stroke="var(--accent)" strokeWidth="4"/>
              </svg>
              <div className="analytics-xlabels"><span>01 Sep</span><span>05 Sep</span><span>10 Sep</span><span>15 Sep</span><span>18 Sep</span><span>20 Sep</span><span>23 Sep</span></div>
            </div>
          </div>
          <div className="analytics-legend"><span><i className="legend-dot actual-dot"/>Actual</span><span><i className="legend-dot planned-dot"/>Planned</span></div>
        </div>
        <div className="analytics-panel">
          <div className="analytics-panel-head"><div><span className="eyebrow">DISCIPLINE PERFORMANCE</span><h3>Workstream output</h3></div></div>
          <div className="analytics-bars">{DISCIPLINE_PERF.map(d=><div className="analytics-bar-row" key={d.disc}><div className="analytics-bar-label"><span>{d.disc}</span><b>{d.actual}%</b></div><div className="analytics-bar-track"><i style={{width:`${d.actual}%`}}/><span style={{left:`${d.planned}%`}}/></div><small>plan {d.planned}%</small></div>)}</div>
        </div>
      </div>
      <div className="analytics-grid-two">
        <div className="analytics-panel">
          <div className="analytics-panel-head"><div><span className="eyebrow">ACTIVITY DURATION</span><h3>Variance snapshot</h3></div></div>
          <table className="analytics-table"><thead><tr><th>Activity</th><th>Baseline</th><th>Actual</th><th>Variance</th></tr></thead><tbody>{[
            ['PIP-245','5 days','6 days','+1 day'],['CIV-022','8 days','8 days','0'],['MECH-018','4 days','5 days','+1 day'],['ELE-014','5 days','5 days','0'],['INST-045','5 days','6 days','+1 day']
          ].map(r=><tr key={r[0]}><td><code>{r[0]}</code></td><td>{r[1]}</td><td>{r[2]}</td><td className={r[3].startsWith('+')?'negative':'positive'}>{r[3]}</td></tr>)}</tbody></table>
        </div>
        <div className="analytics-panel">
          <div className="analytics-panel-head"><div><span className="eyebrow">AI LINKING</span><h3>Evidence routing</h3></div></div>
          <div className="analytics-routing-list"><div><span>High-confidence linked</span><b>{matched?85:0}%</b></div><div><span>Planner review</span><b>{review?12:0}%</b></div><div><span>Unmatched</span><b>{unmatched?3:0}%</b></div></div>
          <div className="analytics-event-total"><span className="eyebrow">EVENTS PROCESSED</span><strong>247</strong><small>Last 30 days · synthetic demo dataset</small></div>
        </div>
      </div>
    </PageSection>
  </div>
}

function Team({onInvite,onManage}:{onInvite:()=>void;onManage:(member:{initials:string;name:string;role:string;workspace:string;status:string})=>void}){
  const members=[
    {initials:'PC',name:'Priya Menon',role:'Project Manager',workspace:'Company',status:'Active'},
    {initials:'PL',name:'Arun Kumar',role:'Planner / Reviewer',workspace:'Company',status:'Active'},
    {initials:'SV',name:'Karthik R',role:'Field Supervisor',workspace:'Field',status:'Active'},
    {initials:'EN',name:'Meera S',role:'Field Engineer',workspace:'Field',status:'Active'},
  ];
  return <div className="team-page">
    <PageSection label="ACCESS / PROJECT TEAM" title="Who can see and change what" action={<button className="primary-btn" onClick={onInvite}>Invite member +</button>}>
      <div className="team-role-note"><div><span className="eyebrow">ROLE SEPARATION</span><strong>Company users control the plan. Field users report execution.</strong><p>Access is separated by workspace so field teams never need baseline administration or planner controls.</p></div><span className="trace-chip">Workspace scoped</span></div>
      <div className="team-table-wrap"><table className="team-table"><thead><tr><th>Member</th><th>Role</th><th>Workspace</th><th>Status</th><th>Access</th></tr></thead><tbody>{members.map(m=><tr key={m.name}><td><span className="member-avatar">{m.initials}</span><strong>{m.name}</strong></td><td>{m.role}</td><td>{m.workspace}</td><td><span className="status-badge track">{m.status}</span></td><td><button className="text-action" onClick={()=>onManage(m)}>Manage →</button></td></tr>)}</tbody></table></div>
      <div className="team-footer"><span>4 active members · 2 company · 2 field</span><span>Permissions are evaluated per workspace.</span></div>
    </PageSection>
  </div>
}

function Settings({threshold,setThreshold,saved,onSave,themeMode,setThemeMode,density,setDensity,emailNotifications,setEmailNotifications,inAppNotifications,setInAppNotifications,autoSave,setAutoSave,dateFormat,setDateFormat,timezone,setTimezone,retention,setRetention}:{threshold:number;setThreshold:(n:number)=>void;saved:boolean;onSave:()=>void;themeMode:ThemeMode;setThemeMode:(v:ThemeMode)=>void;density:'comfortable'|'compact';setDensity:(v:'comfortable'|'compact')=>void;emailNotifications:boolean;setEmailNotifications:(v:boolean)=>void;inAppNotifications:boolean;setInAppNotifications:(v:boolean)=>void;autoSave:boolean;setAutoSave:(v:boolean)=>void;dateFormat:string;setDateFormat:(v:string)=>void;timezone:string;setTimezone:(v:string)=>void;retention:string;setRetention:(v:string)=>void}){
 return <div className="settings-page"><PageSection label="WORKSPACE / APPEARANCE" title="Make Synchronex work your way"><div className="settings-card"><div className="setting-copy"><span className="eyebrow">APPEARANCE</span><strong>Theme</strong><p>Choose the interface appearance for this workspace. System follows your operating system preference.</p></div><div className="theme-picker" role="radiogroup" aria-label="Theme"><button className={themeMode==='light'?'selected':''} onClick={()=>setThemeMode('light')}><span className="theme-preview light-preview">☼</span><b>Light</b><small>Bright workspace</small></button><button className={themeMode==='dark'?'selected':''} onClick={()=>setThemeMode('dark')}><span className="theme-preview dark-preview">◐</span><b>Dark</b><small>Low-light workspace</small></button><button className={themeMode==='system'?'selected':''} onClick={()=>setThemeMode('system')}><span className="theme-preview system-preview">◑</span><b>System</b><small>Follow device</small></button></div></div><div className="settings-card"><div className="setting-copy"><span className="eyebrow">LAYOUT</span><strong>Density</strong><p>Control how much information is visible in tables and lists.</p></div><div className="segmented-control"><button className={density==='comfortable'?'selected':''} onClick={()=>setDensity('comfortable')}>Comfortable</button><button className={density==='compact'?'selected':''} onClick={()=>setDensity('compact')}>Compact</button></div></div></PageSection>
 <PageSection label="TRUST / AUTOMATION" title="Control when AI may apply changes"><div className="settings-card stacked"><div className="setting-row"><div><strong>Auto-apply confidence threshold</strong><p>Events at or above this threshold may be eligible for automatic application if all validation checks pass.</p></div><div className="threshold-control"><input aria-label="Auto apply confidence threshold" type="range" min="80" max="99" value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/><b>{threshold}%</b></div></div><div className="setting-row"><div><strong>Auto-save drafts</strong><p>Preserve unfinished company form changes locally before submission.</p></div><button className={`toggle ${autoSave?'on':''}`} aria-pressed={autoSave} onClick={()=>setAutoSave(!autoSave)}><span/></button></div><div className="setting-row"><div><strong>Human review gate</strong><p>Ambiguous, low-confidence, unmatched, and granularity-mismatch events always require planner review.</p></div><span className="locked-setting">Required</span></div></div></PageSection>
 <PageSection label="NOTIFICATIONS" title="Choose how Synchronex keeps you informed"><div className="settings-card stacked"><div className="setting-row"><div><strong>In-app notifications</strong><p>Review decisions, failed validation, new submissions, and schedule changes.</p></div><button className={`toggle ${inAppNotifications?'on':''}`} aria-pressed={inAppNotifications} onClick={()=>setInAppNotifications(!inAppNotifications)}><span/></button></div><div className="setting-row"><div><strong>Email notifications</strong><p>Receive important project and access alerts at your work email.</p></div><button className={`toggle ${emailNotifications?'on':''}`} aria-pressed={emailNotifications} onClick={()=>setEmailNotifications(!emailNotifications)}><span/></button></div></div></PageSection>
 <PageSection label="REGIONAL / DATA" title="Project defaults"><div className="settings-card settings-form-grid"><label>Timezone<select value={timezone} onChange={e=>setTimezone(e.target.value)}><option value="Asia/Kolkata">Asia/Kolkata (IST)</option><option value="UTC">UTC</option><option value="Asia/Dubai">Asia/Dubai</option><option value="Europe/London">Europe/London</option></select></label><label>Date format<select value={dateFormat} onChange={e=>setDateFormat(e.target.value)}><option>DD MMM YYYY</option><option>MMM DD, YYYY</option><option>YYYY-MM-DD</option></select></label><label>Evidence retention<select value={retention} onChange={e=>setRetention(e.target.value)}><option value="project">Project lifetime</option><option value="90">90 days</option><option value="365">1 year</option><option value="730">2 years</option></select></label><div className="settings-info"><span className="eyebrow">CURRENT WORKSPACE</span><strong>North Field Gas Processing / Phase 1</strong><span>Baseline Rev 04 · Asia/Kolkata · Human-gated ambiguity</span></div></div><div className="settings-actions"><button className="primary-btn" onClick={onSave}>{saved?'Saved ✓':'Save workspace settings'}</button><span className="helper">Settings are scoped to the active company workspace.</span></div></PageSection></div>
}
function Popover({title,children}:{title:string;children:React.ReactNode}){return <div className="popover"><span className="eyebrow">{title}</span>{children}</div>}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){return <div className="modal-backdrop" onMouseDown={e=>e.currentTarget===e.target&&onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><h2 id="modal-title">{title}</h2><button className="icon-btn" aria-label="Close" onClick={onClose}>×</button></div>{children}</div></div>}
