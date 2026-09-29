import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ACTIVITIES, DISCIPLINES, FIELD_EVENTS, REVIEW_QUEUE, AUDIT_TRAIL, MEMORY_ACTIVITIES, PROGRESS_TREND, DELAY_CAUSES, DISCIPLINE_PERF, CURRENT_PROJECT, PROJECT_METRICS, loadCurrentProject, submitCapture, decideReview, importSchedule, getSettings, saveSettings } from './runtimeData';

type Role = 'company'|'field';
type Screen = 'command'|'schedule'|'capture'|'review'|'memory'|'trace'|'import'|'analytics'|'team'|'settings'|'field-home'|'submissions'|'profile';
type Modal = 'help'|'activity'|'confirm'|'profile'|'member'|'invite'|null;
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
  {id:'capture',num:'03',label:'Capture',glyph:'↗'},
  {id:'submissions',num:'04',label:'Submissions',glyph:'↥'},
  {id:'profile',num:'05',label:'Profile',glyph:'●'},
  {id:'settings',num:'06',label:'Settings',glyph:'⚙'},
];

const pageMeta: Record<Screen,{eyebrow:string;title:string;subtitle:string}> = {
 command:{eyebrow:'COMMAND / PROJECT CONTROL',title:'Execution command',subtitle:'A decision surface connecting baseline intent, field evidence, and verified actuals.'},
 schedule:{eyebrow:'SCHEDULE / L5–L6',title:'Schedule lattice',subtitle:'Inspect executable work, planned dates, actual dates, progress, and linkage evidence in one view.'},
 capture:{eyebrow:'FIELD INTELLIGENCE / INPUT',title:'Field capture',subtitle:'Report what happened on site using text, voice, or any supporting evidence.'},
 review:{eyebrow:'FIELD INTELLIGENCE / HUMAN GATE',title:'Planner review',subtitle:'Resolve ambiguity before an AI suggestion becomes a trusted schedule actual.'},
 memory:{eyebrow:'KNOWLEDGE / VALIDATED ACTUALS',title:'Institutional memory',subtitle:'Preserve real execution durations, recurring delay causes, and productivity evidence for future planning.'},
 trace:{eyebrow:'GOVERNANCE / PROVENANCE',title:'Trace ledger',subtitle:'Every accepted change carries a source, actor, timestamp, decision, and confidence trail.'},
 import:{eyebrow:'DATA INTAKE / CONTROLLED INGESTION',title:'Import center',subtitle:'Bring company schedules and existing project evidence into the Synchronex bridge.'},
 analytics:{eyebrow:'ANALYTICS',title:'Project analytics',subtitle:'Turn validated execution data into schedule variance, productivity, delay, and progress insight.'},
 team:{eyebrow:'TEAM / ACCESS CONTROL',title:'Project team',subtitle:'Manage company planners, reviewers, supervisors, and field access.'},
 settings:{eyebrow:'SYSTEM / TRUST CONTROLS',title:'Workspace settings',subtitle:'Define confidence thresholds, project defaults, access, and evidence handling.'},
 'field-home':{eyebrow:'FIELD / TODAY',title:'Field home',subtitle:'See assigned work, recent submissions, and the next action without the planning complexity.'},
 submissions:{eyebrow:'FIELD / SUBMISSIONS',title:'My submissions',subtitle:'Track what you have reported and whether Synchronex accepted or needs more information.'},
  profile:{eyebrow:'FIELD / ACCOUNT',title:'My profile',subtitle:'Review your field role, project access, and account details.'},
};

const stages = ['Input received','Discipline identified','Events extracted','Activities searched','Confidence calculated','Ready for review'];

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
  const [selectedId,setSelectedId]=useState('');
  const [,setDataVersion]=useState(0);
  const [dataLoading,setDataLoading]=useState(true);
  const [reviewCount,setReviewCount]=useState(0);
  const [reviewIndex,setReviewIndex]=useState(0);
  const [reviewDetailOpen,setReviewDetailOpen]=useState(false);
  const [resolvedReviewIds,setResolvedReviewIds]=useState<string[]>([]);
  const [toast,setToast]=useState('');
  const [modal,setModal]=useState<Modal>(null);
  const [dirty,setDirty]=useState(false);
  const [captureText,setCaptureText]=useState('');
  const [captureName,setCaptureName]=useState('');
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
  const [importFiles,setImportFiles]=useState<File[]>([]);
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

  useEffect(()=>{
    let cancelled=false;
    loadCurrentProject().then(()=>{
      if(cancelled)return;
      setSelectedId(ACTIVITIES[0]?.id||'');
      setReviewCount(REVIEW_QUEUE.length);
      setDataVersion(v=>v+1);
    }).catch(err=>{
      if(!cancelled) notify(err instanceof Error ? err.message : 'Unable to load Synchronex data.');
    }).finally(()=>{if(!cancelled)setDataLoading(false);});
    return ()=>{cancelled=true};
  },[]);

  useEffect(()=>{
    if(CURRENT_PROJECT?.id){
      getSettings(CURRENT_PROJECT.id).then((settings:any)=>{
        if(settings?.confidence_threshold!=null)setThreshold(Math.round(Number(settings.confidence_threshold)*100));
        if(settings?.date_format)setDateFormat(settings.date_format);
        if(settings?.timezone)setTimezone(settings.timezone);
        if(settings?.retention)setRetention(settings.retention);
        if(typeof settings?.auto_save==='boolean')setAutoSave(settings.auto_save);
        if(typeof settings?.email_notifications==='boolean')setEmailNotifications(settings.email_notifications);
        if(typeof settings?.in_app_notifications==='boolean')setInAppNotifications(settings.in_app_notifications);
      }).catch(()=>{});
    }
  },[CURRENT_PROJECT?.id]);

  // Schedule discipline selection
  const [scheduleDiscipline,setScheduleDiscipline]=useState('All');

  // Activity detail modal target
  const [detailId,setDetailId]=useState<string|null>(null);

  const selected=ACTIVITIES.find(a=>a.id===selectedId) || ACTIVITIES[0];
  const openReviewQueue=useMemo(()=>REVIEW_QUEUE.filter(r=>!resolvedReviewIds.includes(r.id)),[resolvedReviewIds]);
  const activeReview=openReviewQueue[Math.min(reviewIndex,Math.max(0,openReviewQueue.length-1))] || REVIEW_QUEUE[0];


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


  const notify=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(''),3000)};
  const go=(next:Screen)=>{
    if(next===screen) return;
    if(dirty){setModal('confirm'); (window as any).__pendingScreen=next; return;}
    setScreen(next);
  };
  const confirmLeave=()=>{const next=(window as any).__pendingScreen as Screen; setDirty(false);setModal(null);setScreen(next);};


  const runCapture=async()=>{
    if(captureBusy)return;
    if(!CURRENT_PROJECT?.id){notify('Import a schedule before submitting field evidence.');return;}
    if(!captureName.trim()){notify('Name this progress update before submitting.');return;}
    if(!captureText.trim() && !captureFiles.length){
      notify(recordedAudioUrl ? 'Voice recording is captured locally, but the current backend accepts text/PDF/Excel evidence. Add text or a supported file before submitting.' : 'Add at least one information source: text or a supported evidence file.');
      return;
    }
    setCaptureBusy(true);setCaptureResult(false);
    try{
      await submitCapture(CURRENT_PROJECT.id,captureName.trim(),captureText,captureFiles);
      setCaptureBusy(false);setCaptureResult(true);setDirty(false);
      setReviewCount(REVIEW_QUEUE.length);setDataVersion(v=>v+1);
      notify('Execution evidence captured and added to the review workflow.');
    }catch(err){
      setCaptureBusy(false);
      notify(err instanceof Error ? err.message : 'Capture failed.');
    }
  };
  const handleCaptureFiles=(files:FileList|null)=>{
    if(!files) return;
    const incoming=Array.from(files);
    const existingKeys=new Set(captureFiles.map(file=>`${file.name}|${file.size}|${file.lastModified}`));
    const additions=incoming.filter(file=>{
      const key=`${file.name}|${file.size}|${file.lastModified}`;
      if(existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });
    if(!additions.length) return;
    setCaptureFiles(prev=>[...prev,...additions]);
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
  const resetCapture=()=>{
    if(recording) stopRecording();
    setCaptureText('');
    setCaptureName('');
    setCaptureFiles([]);
    if(recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    setRecordedAudioUrl('');
    setRecordingSeconds(0);
    setCaptureResult(false);
    setCaptureBusy(false);
    setDirty(false);
    notify('Progress update draft cleared.');
  };
  const deleteRecording=()=>{
    if(recording) stopRecording();
    if(recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    setRecordedAudioUrl('');
    setRecordingSeconds(0);
    setDirty(true);
    notify('Voice recording removed.');
  };
  const formatRecordingTime=(seconds:number)=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;

  const finishReviewDecision=async(decision:'approve'|'reject'|'flag')=>{
    if(!activeReview)return;
    try{
      await decideReview(activeReview.id,decision);
      setResolvedReviewIds(ids=>ids.includes(activeReview.id)?ids:[...ids,activeReview.id]);
      setReviewCount(REVIEW_QUEUE.length);
      setDataVersion(v=>v+1);
      setReviewDetailOpen(false);
      setReviewIndex(i=>Math.min(i,Math.max(0,REVIEW_QUEUE.length-1)));
      notify(decision==='approve' ? `Match ${activeReview.candidate || 'activity'} approved and actuals updated.` : decision==='reject' ? 'Suggested activity rejected.' : 'Event flagged for manual/new-activity handling.');
    }catch(err){
      notify(err instanceof Error ? err.message : 'Review decision failed.');
    }
  };
  const approveReview=()=>finishReviewDecision('approve');
  const rejectReview=()=>finishReviewDecision('reject');
  const flagNew=()=>finishReviewDecision('flag');
  const processImport=async()=>{
    if(!importFiles.length){notify('Choose a schedule file first.');return;}
    if(importFiles.length>1){notify('Submit one planning schedule at a time. Importing another schedule replaces only the schedule layer for the selected project.');return;}
    setImportState('processing');
    try{
      const result=await importSchedule(importFiles[0],CURRENT_PROJECT?.id);
      setImportState('success');setDirty(false);setReviewCount(REVIEW_QUEUE.length);setSelectedId(ACTIVITIES[0]?.id||'');setDataVersion(v=>v+1);
      notify(`Schedule imported: ${result?.counts?.tasks ?? 0} tasks, ${result?.counts?.dependencies ?? 0} dependencies.`);
    }catch(err){
      setImportState('error');
      notify(err instanceof Error ? err.message : 'Schedule import failed.');
    }
  };
  const exportSchedule=()=>{
    const headers=['Activity ID','Discipline','Activity','WBS','Plan Start','Plan Finish','Actual Start','Actual Finish','Progress','Status','AI Confidence'];
    const csv=[headers.join(','),...ACTIVITIES.map(a=>[a.id,a.discipline,a.desc,a.wbs,a.planStart,a.planFinish,a.actStart,a.actFinish,`${a.progress}%`,a.status,a.aiConf?`${a.aiConf}%`:''].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a'); link.href=url; link.download='synchronex-schedule-export.csv'; link.click();
    URL.revokeObjectURL(url); notify('Schedule exported successfully.');
  };

  if(!authenticated) return <AuthScreen mode={authMode} setMode={setAuthMode} role={role} setRole={setRole} onLogin={()=>{setScreen(role==='company'?'command':'field-home');setScheduleDiscipline('All');setSelectedId(ACTIVITIES[0]?.id||'');setDetailId(null);setModal(null);setDirty(false);setAuthenticated(true)}} />;

  const detailActivity=ACTIVITIES.find(a=>a.id===detailId) || null;
  const detailTrail=detailId?AUDIT_TRAIL.filter(t=>t.activity===detailId):[];
  const detailEvidence=detailId?FIELD_EVENTS.find(e=>e.actId===detailId):undefined;

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={()=>setScreen('command')} aria-label="Go to command">
        <span className="brand-mark">S</span><span><strong>Synchronex Labs</strong></span>
      </button>
      <div className="top-actions">
        <button className="profile-chip" aria-label="Open profile" onClick={()=>setModal('profile')}>{role==='company'?'PC':'FS'}</button>
      </div>
    </header>

    <aside className="rail">
      <div className="rail-label">{role==='company'?'COMPANY PORTAL':'FIELD PORTAL'}</div>
      {(role==='company'?companyNav:fieldNav).map(item=><button key={item.id} className={`rail-item ${screen===item.id?'active':''}`} aria-current={screen===item.id?'page':undefined} onClick={()=>go(item.id)}>
        <span className="rail-num">{item.num}</span><span className="rail-glyph">{item.glyph}</span><span>{item.label}</span>{item.id==='review'&&reviewCount>0?<b className="count-badge">{reviewCount}</b>:null}
      </button>)}
      <div className="rail-bottom"><button className="rail-signout" onClick={()=>{setAuthenticated(false);setModal(null)}}><span className="signout-icon">↪</span><span><strong>Sign out</strong><small>Securely end session</small></span></button></div>
    </aside>

    <main className="workspace">
      <div className="page-head">
        <div><h1>{pageMeta[screen].title}</h1><p>{pageMeta[screen].subtitle}</p></div>
      </div>
      {dataLoading && <div className="helper" style={{marginBottom:16}}>Loading persisted Synchronex data…</div>}
      {!dataLoading && !CURRENT_PROJECT && <div className="empty-state" style={{marginBottom:16}}>No project schedule has been imported yet. Use Import to upload a ProjectLibre, Microsoft Project, or Primavera schedule.</div>}

      {role==='company' && screen==='command'&&<Command onGo={go} reviewCount={reviewCount} metrics={PROJECT_METRICS}/>}
      {role==='company' && screen==='schedule'&&<Schedule rows={ACTIVITIES} selectedId={selectedId} onSelect={setSelectedId} onExport={exportSchedule} discipline={scheduleDiscipline} setDiscipline={setScheduleDiscipline} onOpenDetail={(id)=>{setDetailId(id);setModal('activity')}} />}
      {role==='field' && screen==='capture'&&<Capture text={captureText} setText={(v)=>{setCaptureText(v);setDirty(true)}} name={captureName} setName={(v)=>{setCaptureName(v);setDirty(true)}} stage={captureStage} busy={captureBusy} result={captureResult} run={runCapture} files={captureFiles} onFiles={handleCaptureFiles} removeFile={removeCaptureFile} fileInputRef={fileInputRef} recording={recording} recordingSeconds={recordingSeconds} recordedAudioUrl={recordedAudioUrl} startRecording={startRecording} stopRecording={stopRecording} deleteRecording={deleteRecording} resetCapture={resetCapture} formatRecordingTime={formatRecordingTime} />}
      {role==='company' && screen==='review'&&<Review count={openReviewQueue.length} item={activeReview} index={reviewIndex} queue={openReviewQueue} onApprove={approveReview} onReject={rejectReview} onFlag={flagNew} onJump={setReviewIndex} detailOpen={reviewDetailOpen} onOpenDetail={(i)=>{setReviewIndex(i);setReviewDetailOpen(true)}} onBack={()=>setReviewDetailOpen(false)} />}
      {role==='company' && screen==='memory'&&<Memory />}
      {role==='company' && screen==='trace'&&<Trace />}
      {role==='company' && screen==='import'&&<Import state={importState} files={importFiles} setFiles={(files)=>{setImportFiles(files);setImportState('idle');setDirty(true)}} onProcess={processImport} onRetry={processImport} onOpenReview={()=>go('review')}/>}
      {role==='company' && screen==='analytics'&&<Analytics />}
      {role==='company' && screen==='team'&&<Team onInvite={()=>setModal('invite')} onManage={(m)=>{setMemberTarget(m);setMemberDraft({role:m.role,workspace:m.workspace,status:m.status,canReview:m.role.toLowerCase().includes('review')||m.workspace==='Company',canImport:m.workspace==='Company',canEditBaseline:m.role==='Project Manager'});setModal('member')}} />}
      {role==='company' && screen==='settings'&&<Settings threshold={threshold} setThreshold={setThreshold} saved={saved} onSave={async()=>{if(!CURRENT_PROJECT?.id){notify('Import a schedule before saving workspace settings.');return;}try{await saveSettings(CURRENT_PROJECT.id,{confidence_threshold:threshold/100,date_format:dateFormat,timezone,retention,auto_save:autoSave,email_notifications:emailNotifications,in_app_notifications:inAppNotifications});setSaved(true);notify('Workspace controls saved.');}catch(err){notify(err instanceof Error ? err.message : 'Unable to save settings.');}}} themeMode={themeMode} setThemeMode={setThemeMode} density={density} setDensity={setDensity} emailNotifications={emailNotifications} setEmailNotifications={setEmailNotifications} inAppNotifications={inAppNotifications} setInAppNotifications={setInAppNotifications} autoSave={autoSave} setAutoSave={setAutoSave} dateFormat={dateFormat} setDateFormat={setDateFormat} timezone={timezone} setTimezone={setTimezone} retention={retention} setRetention={setRetention}/>}
      {role==='field' && screen==='field-home'&&<FieldHome onGo={go}/>}
      {role==='field' && screen==='submissions'&&<Submissions onCapture={()=>go('capture')}/>}
      {role==='field' && screen==='profile'&&<FieldProfile onSignOut={()=>setAuthenticated(false)}/>}
      {role==='field' && screen==='settings'&&<FieldSettings themeMode={themeMode} setThemeMode={setThemeMode} density={density} setDensity={setDensity} autoSave={autoSave} setAutoSave={setAutoSave}/>}
    </main>

    {modal==='profile'&&<Modal title="Profile" onClose={()=>setModal(null)}><div className="profile-modal profile-modal-enhanced"><div className="profile-hero"><div className="profile-avatar profile-avatar-enhanced">{role==='company'?'PC':'FS'}</div><div><span className="eyebrow">{role==='company'?'COMPANY WORKSPACE':'FIELD WORKSPACE'}</span><h3>{role==='company'?'Project Controls Engineer':'Field Supervisor'}</h3><p>Synchronex Labs workspace</p></div></div><div className="profile-summary"><div><span>ACCESS</span><strong>{role==='company'?'Planning & control':'Execution & reporting'}</strong></div><div><span>SESSION</span><strong>Authenticated</strong></div></div><div className="profile-modal-actions"><button className="danger-btn profile-signout" onClick={()=>{setAuthenticated(false);setModal(null)}}><span>↪</span> Sign out</button></div></div></Modal>}
    {modal==='confirm'&&<Modal title="Leave with unsaved work?" onClose={()=>setModal(null)}><p className="modal-copy">Your capture draft has not been submitted. Leaving now discards the unsaved text.</p><div className="modal-actions"><button className="outline-btn" onClick={()=>setModal(null)}>Stay</button><button className="danger-btn" onClick={confirmLeave}>Discard and leave</button></div></Modal>}
    {modal==='activity'&&<Modal title={detailActivity?`${detailActivity.id} · ${detailActivity.desc}`:'Activity detail'} onClose={()=>setModal(null)}>
      {detailActivity ? <div className="activity-detail activity-detail-modern">
        <div className="activity-detail-hero">
          <div><span className="eyebrow">{detailActivity.discipline} · {detailActivity.wbs} EXECUTABLE NODE</span><h3>{detailActivity.desc}</h3><p>Schedule status, execution progress, and the latest linked evidence.</p></div>
          <span className={`status-badge ${detailActivity.status==='Completed'?'track':detailActivity.status==='Planned'?'':'risk'}`}>{detailActivity.status}</span>
        </div>
        <div className="activity-detail-grid">
          <div><span>PLAN</span><b>{detailActivity.planStart} → {detailActivity.planFinish}</b></div>
          <div><span>ACTUAL</span><b>{detailActivity.actStart} → {detailActivity.actFinish}</b></div>
          <div><span>PROGRESS</span><b>{detailActivity.progress}%</b><i className="activity-detail-progress"><em style={{width:`${detailActivity.progress}%`}}/></i></div>
          <div><span>AI CONFIDENCE</span><b>{detailActivity.aiConf?`${detailActivity.aiConf}%`:'No link'}</b></div>
        </div>
        <div className="activity-detail-evidence activity-detail-panel"><span className="eyebrow">LATEST EVIDENCE</span><p>{detailEvidence?`“${detailEvidence.text.replace(/^"|"$/g,'')}”`:'No field evidence linked yet.'}</p></div>
        <div className="activity-detail-trace activity-detail-panel"><div className="activity-detail-panel-head"><span className="eyebrow">RECENT PROGRESS UPDATES</span><span className="trace-chip">{detailTrail.length} recorded</span></div>{detailTrail.length?detailTrail.map((t,i)=><div key={i} className="trace-mini-row"><span>{t.ts}</span><span className="actor">{t.actor}</span><span>{t.action.toLowerCase().includes('progress update')?`Progress update by ${t.actor}`:t.action}</span><span>{t.prev} → <b>{t.next}</b></span></div>):<p className="helper">No accepted changes recorded yet for this activity.</p>}</div>
        <div className="activity-detail-footer"><button className="outline-btn" onClick={()=>setModal(null)}>Close</button></div>
      </div> : <p>Activity not found.</p>}
    </Modal>}
    {modal==='member'&&memberTarget&&<Modal title={`Manage ${memberTarget.name}`} onClose={()=>setModal(null)}>
      <div className="member-manage">
        <div className="member-manage-head"><span className="member-avatar large">{memberTarget.initials}</span><div><span className="eyebrow">TEAM MEMBER</span><h3>{memberTarget.name}</h3><p>{memberTarget.workspace} workspace</p></div></div>
        <div className="member-form-grid member-form-grid-two">
          <label>Role<select value={memberDraft.role} onChange={e=>setMemberDraft({...memberDraft,role:e.target.value})}><option>Project Manager</option><option>Planner / Reviewer</option><option>Field Supervisor</option><option>Field Engineer</option></select></label>
          <label>Workspace<select value={memberDraft.workspace} onChange={e=>setMemberDraft({...memberDraft,workspace:e.target.value})}><option>Company</option><option>Field</option></select></label>
        </div>
        <div className="member-manage-actions"><span/><button className="outline-btn" onClick={()=>setModal(null)}>Cancel</button><button className="primary-btn" onClick={()=>{setModal(null);notify(`${memberTarget.name} access updated.`)}}>Save changes</button></div>
      </div>
    </Modal>}
    {modal==='invite'&&<Modal title="Add project member" onClose={()=>setModal(null)}>
      <div className="invite-form"><p className="modal-copy">Add a company or field teammate to the active project. Access is scoped to the selected workspace.</p><label>Work email<input type="email" placeholder="name@company.example"/></label><div className="member-form-grid"><label>Workspace<select defaultValue="Company"><option>Company</option><option>Field</option></select></label><label>Role<select defaultValue="Planner / Reviewer"><option>Project Manager</option><option>Planner / Reviewer</option><option>Field Supervisor</option><option>Field Engineer</option></select></label></div><div className="modal-actions"><button className="outline-btn" onClick={()=>setModal(null)}>Cancel</button><button className="primary-btn" onClick={()=>{setModal(null);notify('Project member added to the selected workspace.')}}>Add member →</button></div></div>
    </Modal>}
    {toast&&<div className="toast" role="status"><span>✓</span>{toast}</div>}
  </div>;
}

function AuthScreen({mode,setMode,role,setRole,onLogin}:{mode:'login'|'forgot';setMode:(v:'login'|'forgot')=>void;role:Role;setRole:(v:Role)=>void;onLogin:()=>void}){
 const [email,setEmail]=useState(role==='company'?'planner@northfield.example':'field.supervisor@northfield.example');
 const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const [forgotOpen,setForgotOpen]=useState(false); const [forgotEmail,setForgotEmail]=useState(''); const [forgotBusy,setForgotBusy]=useState(false); const [forgotSent,setForgotSent]=useState(false);
 const chooseRole=(next:Role)=>{setRole(next);setEmail(next==='company'?'planner@northfield.example':'field.supervisor@northfield.example');setError('');setPassword('')};
 const submit=(e:React.FormEvent)=>{e.preventDefault();setError('');if(!email.includes('@')){setError('Enter a valid work email.');return}if(!password){setError('Enter your password.');return}setBusy(true);window.setTimeout(()=>{setBusy(false);onLogin()},700)};
 const openForgot=()=>{setForgotEmail(email.includes('@')?email:'');setForgotSent(false);setError('');setForgotOpen(true)};
 const sendReset=(e:React.FormEvent)=>{e.preventDefault();if(!forgotEmail.includes('@')){setError('Enter the registered email address.');return}setForgotBusy(true);setError('');window.setTimeout(()=>{setForgotBusy(false);setForgotSent(true)},900)};
 return <div className="auth-shell"><div className="auth-left"><div className="auth-brand"><span className="brand-mark">S</span><div><strong>SYNCHRONEX LABS</strong></div></div><div className="auth-hero"><h1>{role==='company'?'Connect planning with execution intelligence.':'Turn field updates into trusted schedule actuals.'}</h1><p>{role==='company'?'Manage the baseline, review field evidence, validate actuals, and preserve project intelligence.':'Report site progress with text, voice, or evidence files without exposing company planning controls.'}</p><div className="auth-path">{role==='company'?<><span>01 Plan</span><i>→</i><span>02 Review</span><i>→</i><span>03 Apply</span><i>→</i><span>04 Learn</span></>:<><span>01 Work</span><i>→</i><span>02 Capture</span><i>→</i><span>03 Submit</span><i>→</i><span>04 Track</span></>}</div></div></div><div className="auth-right"><div className="auth-card"><span className="eyebrow">SECURE WORKSPACE</span><h2>Choose your workspace</h2><div className="role-switch" role="tablist" aria-label="Workspace type"><button type="button" className={role==='company'?'selected':''} onClick={()=>chooseRole('company')}><strong>Company portal</strong><span>Planning, review & control</span></button><button type="button" className={role==='field'?'selected':''} onClick={()=>chooseRole('field')}><strong>Field portal</strong><span>Work, capture & submissions</span></button></div><p>{role==='company'?'Use your project-controls account to manage the project workspace.':'Use your field account to report execution and track submissions.'}</p><form onSubmit={submit}><label>Work email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email"/></label><label>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password"/></label>{error&&<div className="form-error" role="alert">{error}</div>}<button className="primary-btn" disabled={busy}>{busy?'Working…':`Enter ${role==='company'?'company':'field'} portal`} <span>→</span></button></form><button className="link-btn" type="button" onClick={openForgot}>Forgot password?</button></div></div>{forgotOpen&&<div className="modal-backdrop auth-recovery-backdrop" role="dialog" aria-modal="true" aria-labelledby="recovery-title" onMouseDown={e=>e.currentTarget===e.target&&setForgotOpen(false)}><div className="modal auth-recovery-modal"><div className="modal-head"><h2 id="recovery-title">Reset your password</h2><button className="icon-btn" aria-label="Close password recovery" onClick={()=>setForgotOpen(false)}>×</button></div>{forgotSent?<div className="recovery-success"><span className="success-chip">REQUEST RECEIVED</span><h3>Check your registered email</h3><p>If the address is registered, a password-reset email will be sent to <strong>{forgotEmail}</strong>.</p><button className="primary-btn" onClick={()=>setForgotOpen(false)}>Back to sign in →</button></div>:<form onSubmit={sendReset} className="recovery-form"><p className="modal-copy">Enter the email address registered to your Synchronex account. We'll use it for the password-reset request.</p><label>Registered email<input autoFocus value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} type="email" placeholder="name@company.com" autoComplete="email"/></label>{error&&<div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="outline-btn" onClick={()=>setForgotOpen(false)}>Cancel</button><button type="submit" className="primary-btn" disabled={forgotBusy}>{forgotBusy?'Sending…':'Send reset email →'}</button></div></form>}</div></div>}</div>
}

function PageSection({label,title,children,action}:{label?:string;title:string;children:React.ReactNode;action?:React.ReactNode}){return <section className="section"><div className="section-head"><div>{label&&<span className="eyebrow">{label}</span>}<h2>{title}</h2></div>{action}</div>{children}</section>}

function Command({onGo,reviewCount,metrics}:{onGo:(s:Screen)=>void;reviewCount:number;metrics:typeof PROJECT_METRICS}){
 return <div className="command-page">
   <div className="command-top">
     <div className="metric-band command-metrics">
       <Metric label="L5/L6 activities" value={String(metrics.executableCount)} note="executable nodes"/>
       <Metric label="Actual progress" value={`${metrics.actualProgress.toFixed(1)}%`} note={`vs ${metrics.plannedProgress.toFixed(1)}% planned`} tone="blue"/>
       <Metric label="Schedule variance" value={`${metrics.variance >= 0 ? ' +' : '−'}${Math.abs(metrics.variance).toFixed(1)}%`} note="current actual vs planned" tone={metrics.variance < 0 ? "red" : ""}/>
       <Metric label="Review workload" value={String(reviewCount)} note="planner decisions" tone="amber"/>
     </div>
   </div>

   <section className="command-summary-row">
     <div className="command-summary-card decision-summary-card">
       <div>
         <span className="eyebrow">DECISION QUEUE</span>
         <div className="summary-number-row">
           <strong>{reviewCount}</strong>
           <span className="queue-status">OPEN</span>
         </div>
         <p>Ambiguous or unmatched events need a planner before schedule application.</p>
       </div>
       <button className="primary-btn" onClick={()=>onGo('review')}>Review decisions →</button>
     </div>

     <div className="command-summary-card progress-summary-card">
       <div className="summary-card-head">
         <div>
           <span className="eyebrow">PROJECT PROGRESS</span>
           <h3>Planned trajectory &amp; actual progress</h3>
         </div>
         <span className="summary-delta">{`${metrics.variance >= 0 ? ' +' : '−'}${Math.abs(metrics.variance).toFixed(1)}%`}</span>
       </div>
       <div className="summary-progress-grid">
         <div>
           <span>PLANNED</span>
           <strong>{metrics.plannedProgress.toFixed(1)}%</strong>
           <div className="summary-bar"><i style={{width:`${Math.max(0,Math.min(100,metrics.plannedProgress))}%`}}/></div>
         </div>
         <div>
           <span>ACTUAL</span>
           <strong>{metrics.actualProgress.toFixed(1)}%</strong>
           <div className="summary-bar actual"><i style={{width:`${Math.max(0,Math.min(100,metrics.actualProgress))}%`}}/></div>
         </div>
       </div>
     </div>
   </section>

   <div className="command-pulse-heading command-pulse-heading-full">
     <div>
       <span className="eyebrow">BASELINE → ACTUAL</span>
       <h2>Project pulse</h2>
     </div>
     <button className="outline-btn" onClick={()=>onGo('schedule')}>Open schedule →</button>
   </div>

   <section className="command-pulse-graph">
     <div className="pulse-grid">
       <div className="trend">
         <div className="trend-head">
           <span>Progress trajectory</span>
           <span><b className="legend-line actual"/>Actual <b className="legend-line planned"/>Planned</span>
         </div>
         <div className="chart">
           {PROGRESS_TREND.length ? <div className="gridlines"/> : <div className="empty-state">Historical progress points will appear after validated execution updates are recorded.</div>}
           {PROGRESS_TREND.length > 1 && <svg viewBox="0 0 720 220" preserveAspectRatio="none" aria-label="Planned and actual progress trend">
             <polyline points={PROGRESS_TREND.map((d:any,i:number)=>`${(i/(PROGRESS_TREND.length-1))*720},${220-(Number(d.planned||0)/100)*180}`).join(' ')} fill="none" stroke="var(--info)" strokeWidth="2" strokeDasharray="5 5"/>
             <polyline points={PROGRESS_TREND.map((d:any,i:number)=>`${(i/(PROGRESS_TREND.length-1))*720},${220-(Number(d.actual||0)/100)*180}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="4"/>
           </svg>}
         </div>
         <div className="chart-axis">{PROGRESS_TREND.map((d:any)=><span key={d.date}>{d.date}</span>)}</div>
         <div className="pulse-kpis">
           <div><span>ACTUAL</span><b>{metrics.actualProgress.toFixed(1)}%</b></div>
           <div><span>PLANNED</span><b>{metrics.plannedProgress.toFixed(1)}%</b></div>
           <div><span>VARIANCE</span><b className={metrics.variance<0?"negative":"positive"}>{metrics.variance >= 0 ? ' +' : '−'}{Math.abs(metrics.variance).toFixed(1)}%</b></div>
         </div>
       </div>
     </div>
   </section>
 </div>
}
function Metric({label,value,note,tone}:{label:string;value:string;note:string;tone?:string}){return <div className="metric"><span>{label}</span><strong className={tone||''}>{value}</strong><small>{note}</small></div>}

function Schedule({rows,selectedId,onSelect,onExport,discipline,setDiscipline,onOpenDetail}:{rows:any[];selectedId:string;onSelect:(id:string)=>void;onExport:()=>void;discipline:string;setDiscipline:(d:string)=>void;onOpenDetail:(id:string)=>void}){
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
    <PageSection title="Schedule by discipline" action={<div className="schedule-head-actions">{discipline!=='All'&&<button className="filter-btn" onClick={()=>setDiscipline('All')}>← All disciplines</button>}<button className="primary-btn" onClick={onExport}>Export schedule ↓</button></div>}>
      {discipline==='All' ? <div className="discipline-card-grid">
        {DISCIPLINES.map(d=>{
          const evidence=recentEvidence(d.name);
          return <div key={d.disc} className="discipline-card" style={{['--discipline-accent' as any]:statusAccent(d.status)}}>
            <button className="discipline-card-hit" onClick={()=>selectDiscipline(d.name)}>
              <div className="discipline-card-top"><span className="discipline-icon">{d.name.slice(0,1)}</span><span className={`status-badge ${d.status==='Delayed'?'delayed':d.variance<0?'risk':'track'}`}>{d.status}</span><span className="card-chevron">→</span></div>
              <div className="discipline-card-title"><strong>{d.name}</strong><b>{d.actual}%</b></div>
              <div className="discipline-progress"><i style={{width:`${d.actual}%`}}/></div>
              <div className="discipline-card-metrics"><span><small>PLANNED</small><b>{d.planned}%</b></span><span><small>VARIANCE</small><b className={d.variance<0?'negative':'positive'}>{d.variance>0?'+':''}{d.variance}%</b></span><span><small>ACTIVITIES</small><b>{d.activities}</b></span></div>
            </button>
          </div>;
        })}
      </div> : <>
        <div className="schedule-detail-head"><div><h3>{discipline === 'Piping' ? 'Piping Workstream' : `${discipline} Workstream`}</h3><p>{discipline === 'Piping' ? 'Track piping activities, planned dates, actual progress, and execution evidence in one view.' : 'Track activities, planned dates, actual progress, and execution evidence in one view.'}</p></div><span className="schedule-detail-count">{disciplineRows.length} activities</span></div>
        <div className="schedule-filter-bar"><label>Status<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Filter by status"><option value="All">All</option><option value="Planned">Planned</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option></select></label><label>Sort by<select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} aria-label="Sort activities"><option value="plan">Plan date</option><option value="progress">Progress</option><option value="status">Status</option><option value="id">Activity ID</option></select></label><span className="filter-count">{visibleRows.length} of {disciplineRows.length} activities</span></div>
        <div className="schedule-activity-list">{visibleRows.map(a=><button key={a.id} className={`schedule-activity ${a.id===selectedId?'selected':''}`} onClick={()=>{onSelect(a.id);onOpenDetail(a.id);}}><div className="activity-main"><code>{a.id}</code><strong>{a.desc}</strong><small>{a.wbs} executable node</small></div><div className="activity-dates"><span><small>PLAN</small>{a.planStart} → {a.planFinish}</span><span><small>ACTUAL</small>{a.actStart} → {a.actFinish}</span></div><div className="activity-progress"><div><i style={{width:`${a.progress}%`}}/></div><b>{a.progress}%</b></div><span className={`confidence ${a.aiConf>=90?'high':a.aiConf?'medium':'none'}`}>{a.aiConf?`${a.aiConf}% AI`:'No AI link'}</span><span className="activity-arrow">→</span></button>)}{visibleRows.length===0&&<div className="empty-state">No activities match this filter. <button className="text-action" onClick={()=>setStatusFilter('All')}>Clear status filter</button></div>}</div>
      </>}
    </PageSection>
  </div>
}

function Capture({text,setText,name,setName,stage,busy,result,run,files,onFiles,removeFile,fileInputRef,recording,recordingSeconds,recordedAudioUrl,startRecording,stopRecording,deleteRecording,resetCapture,formatRecordingTime}:{text:string;setText:(v:string)=>void;name:string;setName:(v:string)=>void;stage:number;busy:boolean;result:boolean;run:()=>void;files:File[];onFiles:(files:FileList|null)=>void;removeFile:(index:number)=>void;fileInputRef:React.RefObject<HTMLInputElement|null>;recording:boolean;recordingSeconds:number;recordedAudioUrl:string;startRecording:()=>void;stopRecording:()=>void;deleteRecording:()=>void;resetCapture:()=>void;formatRecordingTime:(seconds:number)=>string}){
  const textareaRef=useRef<HTMLTextAreaElement|null>(null);
  useEffect(()=>{const el=textareaRef.current;if(!el)return;el.style.height='auto';el.style.height=Math.min(el.scrollHeight,360)+'px';},[text]);
  return <div className="capture-layout capture-layout-full">
    <div className="capture-main">
      <PageSection label="FIELD PROGRESS / 01" title="Submit work progress">
        <p className="lead">Share what was completed on site using text, files, images, or a voice update. Use any one of these inputs or combine them.</p>
        <div className="capture-text-meta"><span className="optional-chip">OPTIONAL</span><span>Text note</span></div><textarea ref={textareaRef} className="capture-progress-textarea" value={text} onChange={e=>setText(e.target.value)} aria-label="Optional field progress note" placeholder="Optional: add a short progress note, site update, or supervisor comment…" />
        <div className="capture-input-grid capture-input-grid-three">
          <section className="capture-source-card">
            <div className="capture-source-head"><div><span className="eyebrow">FILE EVIDENCE / OPTIONAL</span><h3>Attach progress evidence</h3><p>Upload photos, PDFs, reports, spreadsheets, videos, ZIP files, or any other supporting evidence.</p></div><span className="source-icon">↑</span></div>
            <input ref={fileInputRef} type="file" multiple accept="*/*" hidden onChange={e=>{onFiles(e.target.files);e.currentTarget.value='';}} />
            <button className="capture-dropzone" type="button" onClick={()=>fileInputRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();onFiles(e.dataTransfer.files);}}>
              <strong>Drop files here or browse</strong><span>Any file type · multiple files supported</span><small>Images · PDF · Word · Excel · CSV · TXT · ZIP · video · and more</small>
            </button>
            {files.length>0&&<div className="capture-file-list">{files.map((file,i)=><div className="capture-file-row" key={`${file.name}-${file.lastModified}`}><div className="capture-file-main"><strong>{file.name}</strong><span>{file.type||'Unknown file type'} · {(file.size/1024/1024).toFixed(2)} MB</span></div><button type="button" aria-label={`Remove ${file.name}`} onClick={()=>removeFile(i)}>Remove ×</button></div>)}</div>}
            <span className="helper">Use the file name you entered on your device. You can remove an attachment before submitting.</span>
          </section>

          <section className="capture-source-card voice-card">
            <div className="capture-source-head"><div><span className="eyebrow">VOICE UPDATE / OPTIONAL</span><h3>Record progress</h3><p>Use your microphone when speaking is easier than typing. The recording can be submitted as progress evidence.</p></div><span className="source-icon">◉</span></div>
            <div className={`voice-recorder ${recording?'recording':''}`}><div className="voice-status-dot">{recording?'●':'○'}</div><div><strong>{recording?'Recording progress update':'Ready to record'}</strong><span>{recording?formatRecordingTime(recordingSeconds):'Use your browser microphone'}</span></div></div>
            <div className="voice-actions">{!recording?<button className="primary-btn" onClick={startRecording}>● Start recording</button>:<button className="danger-btn" onClick={stopRecording}>■ Stop recording</button>}</div>
            {recordedAudioUrl&&<div className="voice-preview"><span className="eyebrow">RECORDED EVIDENCE</span><strong>Voice progress recording</strong><audio controls src={recordedAudioUrl}/><div className="recording-actions"><button className="danger-btn" onClick={deleteRecording}>Delete recording</button></div></div>}
            <span className="helper">You can delete a recording and record again before submitting.</span>
          </section>
        </div>
        <div className="capture-report-name">
          <div>
            <span className="eyebrow">PROGRESS REPORT / REQUIRED</span>
            <h3>Name this progress update <span className="required-inline">Required</span></h3>
            <p>Give the complete submission a clear name so the project team can identify it later. The worker chooses this name.</p>
          </div>
          <input value={name} onChange={e=>{setName(e.target.value);setDirty(true)}} placeholder="e.g. Pipe erection XX progress" aria-label="Progress report name" />
        </div>
        <div className="capture-final-actions">
          <button className="primary-btn capture-submit-btn" disabled={busy} onClick={run}>{busy?'Submitting progress…':'Submit progress update'} <span>→</span></button>
          <button className="outline-btn" type="button" onClick={resetCapture}>Reset update</button>
          <span className="helper"><strong>Required:</strong> progress update name. <strong>Optional:</strong> text, files, or voice — add at least one.</span>
        </div>
        {result&&<div className="submission-success"><span>✓</span><div><strong>Progress update submitted</strong><p>Your progress note and selected evidence are ready for the project record and review workflow.</p></div></div>}
      </PageSection>
    </div>
  </div>
}

function Review({count,item,index,queue,onApprove,onReject,onFlag,onJump,detailOpen,onOpenDetail,onBack}:{count:number;item:any;index:number;queue:any[];onApprove:()=>void;onReject:()=>void;onFlag:()=>void;onJump:(i:number)=>void;detailOpen:boolean;onOpenDetail:(i:number)=>void;onBack:()=>void}){
  const queueRows=queue.map((q,i)=><tr key={q.id} onClick={()=>onOpenDetail(i)}><td><code>{q.id}</code></td><td><strong>{q.text.replace(/"/g,'')}</strong></td><td>{q.candidate||'—'}</td><td><b className={q.conf>=80?'review-conf-high':'review-conf'}>{q.conf?`${q.conf}%`:'—'}</b></td><td>{q.issue}</td><td><span className={`review-status ${q.status==='Unmatched'?'unmatched':''}`}>{q.status}</span></td><td><span className="review-open-arrow">Open →</span></td></tr>);
  if(!detailOpen){
    return <div className="review-queue-page"><PageSection label="" title="Review queue" action={<span className="queue-count">{count} open</span>}>
      <div className="review-queue-subtitle"><strong>Select a field event to open planner validation.</strong><p>Review ambiguous or unmatched execution signals before they become trusted schedule actuals.</p></div>
      <div className="review-table-wrap"><table className="review-table"><thead><tr><th>Queue ID</th><th>Field event</th><th>Candidate</th><th>Confidence</th><th>Issue</th><th>Status</th><th></th></tr></thead><tbody>{queue.length?queueRows:<tr><td colSpan={7}><div className="review-empty"><strong>Queue cleared</strong><span>All open decisions have been resolved for this session.</span></div></td></tr>}</tbody></table></div>
    </PageSection></div>
  }
  return <div className="review-detail-page"><PageSection label="" title="Resolve before apply" action={<button className="outline-btn" onClick={onBack}>← Back to review queue</button>}>
    <div className="review-detail-grid">
      <main className="review-detail-main">
        <div className="review-hero"><div><span className="eyebrow">ORIGINAL FIELD EVENT</span><blockquote>{item?.text}</blockquote><span className="issue-chip">{item?.issue}</span></div><div className="confidence-ring"><b>{item?.conf || 0}%</b><span>AI confidence</span></div></div>
        <div className="candidate-grid"><div className="candidate selected"><span className="eyebrow">CURRENT CANDIDATE</span><code>{item?.candidate || 'No activity'}</code><strong>{item?.candidate ? (ACTIVITIES.find(a=>a.id===item.candidate)?.desc || `Baseline activity ${item.candidate}`) : 'No matching baseline node'}</strong><p>Match evidence combines terminology, discipline, schedule context, and granularity.</p><span className="evidence-score">Evidence alignment · {item?.conf || 0}%</span></div><div className="candidate"><span className="eyebrow">DECISION REQUIRED</span><strong>{item?.candidate?'Confirm or reject':'Create a new activity proposal'}</strong><p>{item?.candidate?'Verify the suggested L5/L6 node against the source statement. Reject it if the suggested activity is not the correct match.':'Do not silently drop unmatched work. Flag it for planner review and baseline control.'}</p></div></div>
        <div className="review-actions"><button className="primary-btn" onClick={onApprove}>Confirm match & apply →</button><button className="danger-btn" onClick={onReject}>Reject</button><button className="danger-btn" onClick={onFlag}>Flag as new activity</button></div><p className="helper">Applying writes an actual update and creates an append-only trace record.</p>
      </main>
      
    </div>
  </PageSection></div>
}
function Memory(){
  const exportKnowledge=()=>{
    const headers=['Activity type','Baseline average','Actual average','Drift','Occurrences'];
    const csv=[headers.join(','),...MEMORY_ACTIVITIES.map((m:any)=>[m.type,m.baselineAvg,m.actualAvg,m.variance,m.occurrences].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))].join('\n');
    downloadTextFile(csv,'synchronex-knowledge.csv','text/csv;charset=utf-8');
  };
  return <div className="memory-overview"><PageSection title="Memory" action={<button className="outline-btn" onClick={exportKnowledge}>Export knowledge ↓</button>}>
    {MEMORY_ACTIVITIES.length ? <div className="memory-table"><table><thead><tr><th>Activity type</th><th>Baseline avg</th><th>Actual avg</th><th>Drift</th><th>Occurrences</th><th>Evidence</th></tr></thead><tbody>{MEMORY_ACTIVITIES.map((m:any)=><tr key={m.type}><td><strong>{m.type}</strong></td><td>{m.baselineAvg}</td><td>{m.actualAvg}</td><td>{m.variance}</td><td>{m.occurrences}</td><td><span className="trace-chip">Traceable</span></td></tr>)}</tbody></table></div> : <div className="empty-state">No validated execution memory is available yet. Memory appears after reviewed execution events produce reusable historical evidence.</div>}
  </PageSection></div>;
}

function Trace(){
  const [selectedActor,setSelectedActor]=useState<string|null>(null);
  const actors=Array.from(new Set(AUDIT_TRAIL.map(a=>a.actor)));
  const actorUpdates=(actor:string)=>AUDIT_TRAIL.filter(a=>a.actor===actor);
  const downloadCsv=(rows:any[],filename:string)=>{
    const headers=['Time','Actor','Action','Object','Source','Previous','Next','Confidence'];
    const csv=[headers.join(','),...rows.map(a=>[a.ts,a.actor,a.action,a.activity,a.source,a.prev,a.next,a.conf||''].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))].join('\\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a'); link.href=url; link.download=filename; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),0);
  };
  const actorMeta:Record<string,{label:string;description:string;glyph:string}>= {
    AI:{label:'AI',description:'Automated extraction, linking, and progress signals.',glyph:'AI'},
    Planner:{label:'Planner',description:'Human validation, matching decisions, and progress updates.',glyph:'PL'},
    System:{label:'System',description:'Import and processing events recorded by the platform.',glyph:'SY'},
  };
  const selectedUpdates=selectedActor?actorUpdates(selectedActor):[];
  const selectedMeta=selectedActor?(actorMeta[selectedActor]||{label:selectedActor,description:'Recorded provenance events.',glyph:selectedActor.slice(0,2).toUpperCase()}):null;
  return <PageSection label="AUDIT / APPEND-ONLY PROVENANCE" title="Trace every accepted change" action={<button className="outline-btn" onClick={()=>downloadCsv(AUDIT_TRAIL,'synchronex-all-trace-updates.csv')}>Export all updates ↓</button>}>
    <div className="trace-actor-grid trace-actor-grid-only">{actors.map(actor=>{const meta=actorMeta[actor]||{label:actor,description:'Recorded provenance events.',glyph:actor.slice(0,2).toUpperCase()}; const rows=actorUpdates(actor); return <div key={actor} className="trace-actor-card" onClick={()=>setSelectedActor(actor)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setSelectedActor(actor)}}>
      <div className="trace-actor-card-top"><div className="trace-actor-mark">{meta.glyph}</div><span className="trace-actor-count">{rows.length} updates</span></div>
      <strong>{meta.label}</strong><p>{meta.description}</p>
      <div className="trace-stage-list" aria-label={`${meta.label} trace stages`}>
        <span><i>01</i> Capture</span><span><i>02</i> Process</span><span><i>03</i> Record</span>
      </div>
      <span className="trace-actor-open">View {meta.label} updates →</span>
    </div>})}</div>
    {selectedActor&&<div className="trace-actor-modal" role="dialog" aria-modal="true" aria-labelledby="trace-actor-modal-title" onMouseDown={e=>{if(e.currentTarget===e.target)setSelectedActor(null)}}>
      <div className="trace-actor-modal-card">
        <div className="trace-actor-modal-head">
          <div><span className="eyebrow">ACTOR UPDATES</span><h2 id="trace-actor-modal-title">{selectedMeta?.label} updates</h2><p>{selectedMeta?.description}</p></div>
          <button className="icon-btn" aria-label="Close actor updates" onClick={()=>setSelectedActor(null)}>×</button>
        </div>
        <div className="trace-actor-modal-toolbar"><span>{selectedUpdates.length} recorded update{selectedUpdates.length===1?'':'s'}</span><button className="outline-btn" onClick={()=>downloadCsv(selectedUpdates,`synchronex-${selectedActor?.toLowerCase()}-trace.csv`)}>Export {selectedMeta?.label} updates ↓</button></div>
        <div className="trace-table trace-modal-table"><table><thead><tr><th>Time</th><th>Action</th><th>Object</th><th>Source</th><th>Change</th><th>Confidence</th></tr></thead><tbody>{selectedUpdates.map((a,i)=><tr key={i}><td>{a.ts}</td><td>{a.action}</td><td><code>{a.activity}</code></td><td>{a.source}</td><td>{a.prev} → <b>{a.next}</b></td><td>{a.conf?`${a.conf}%`:'—'}</td></tr>)}</tbody></table></div>
        <div className="trace-actor-modal-footer"><button className="outline-btn" onClick={()=>setSelectedActor(null)}>Close</button></div>
      </div>
    </div>}
  </PageSection>
}
function Import({state,files,setFiles,onProcess,onRetry,onOpenReview}:{state:'idle'|'processing'|'success'|'error';files:File[];setFiles:(files:File[])=>void;onProcess:()=>void;onRetry:()=>void;onOpenReview:()=>void}){
  const inputRef=useRef<HTMLInputElement>(null);
  const [dragOver,setDragOver]=useState(false);
  const supported='.mpp,.xer,.xml,.pod';
  const supportedExt=new Set(['mpp','xer','xml','pod']);
  const addFiles=(incoming:FileList|null)=>{
    if(!incoming) return;
    const incomingFiles=Array.from(incoming);
    const valid=incomingFiles.filter(file=>supportedExt.has(file.name.split('.').pop()?.toLowerCase()||''));
    const next=[...files,...valid].filter((file,i,arr)=>arr.findIndex(x=>x.name===file.name&&x.size===file.size&&x.lastModified===file.lastModified)===i);
    setFiles(next);
  };
  const removeFile=(index:number)=>setFiles(files.filter((_,i)=>i!==index));
  return <div className="import-page">
    <PageSection title="Import center">
      <div className="import-purpose import-purpose-clean"><div><span className="eyebrow">SCHEDULE DATA INTAKE</span><h3>Bring approved planning files into the Synchronex bridge.</h3><p>Upload the schedule that should become the active baseline. Synchronex validates it before writing the normalized schedule to the project.</p></div><div className="import-supported-inline"><span>SUPPORTED</span><b>MS Project</b><b>Primavera</b><b>ProjectLibre</b><b>Excel / CSV</b></div></div>
      <article className="import-choice import-choice-single">
        <div className="import-choice-top"><div><span className="import-choice-icon">▤</span></div><span className="trace-chip">SCHEDULE</span></div>
        <span className="eyebrow">01 / SCHEDULE IMPORT</span>
        <h3>Upload project schedules</h3>
        <p>Upload one planning schedule at a time. Supported project formats include Microsoft Project, Primavera, and ProjectLibre.</p>
        <div className="import-format-list">{['Microsoft Project · .mpp / .xml','Primavera P6 · .xer','ProjectLibre · .pod'].map(x=><span key={x}>{x}</span>)}</div>
        <input ref={inputRef} className="file-input-hidden" type="file" accept={supported} onChange={e=>{addFiles(e.target.files);e.currentTarget.value='';}} aria-label="Select schedule files" />
        <div className={`import-drop-zone import-drop-zone-large ${dragOver?'dragging':''}`} role="button" tabIndex={0} onClick={()=>inputRef.current?.click()} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')inputRef.current?.click()}} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);addFiles(e.dataTransfer.files)}}>
          <span className="import-drop-icon">↑</span><strong>{files.length?`${files.length} schedule file${files.length===1?'':'s'} selected`:'Drop schedule files here'}</strong><span>Drag and drop a schedule file or browse from your computer.</span><small>Microsoft Project · Primavera P6 · ProjectLibre</small>
        </div>
        {files.length>0&&<div className="import-file-list">{files.map((file,i)=><div className="import-file-row" key={`${file.name}-${file.lastModified}`}><div><strong>{file.name}</strong><span>{file.type||'Schedule file'} · {(file.size/1024/1024).toFixed(2)} MB</span></div><button type="button" className="icon-btn" aria-label={`Remove ${file.name}`} onClick={()=>removeFile(i)}>×</button></div>)}</div>}
        <div className="import-actions import-actions-submit"><button className="primary-btn" disabled={!files.length||state==='processing'} onClick={onProcess}>{state==='processing'?'Processing schedule…':state==='success'?'Import again':'Submit schedule'} <span>→</span></button></div>
      </article>
      {(state!=='idle'||files.length>0) && <div className={`import-status-banner ${state}`} role="status"><div><span className="eyebrow">IMPORT STATUS</span><strong>{state==='processing'?'Processing selected schedules…':state==='success'?'Schedules processed successfully':state==='error'?'Import needs attention':'Ready to submit'}</strong><p>{files.length?`${files.length} file${files.length===1?'':'s'} selected · ${files.map(f=>f.name).join(', ')}`:'Select schedule files to begin.'}</p></div><div className="import-status-actions">{state==='processing'&&<span className="import-status-chip">Processing</span>}{state==='success'&&<><span className="import-status-chip success">Complete</span><button className="text-action" onClick={onOpenReview}>Open review →</button></>}{state==='error'&&<button className="outline-btn" onClick={onRetry}>Retry</button>}</div></div>}
    </PageSection>
  </div>
}
function FieldHome({onGo}:{onGo:(s:Screen)=>void}){
  const trend=PROGRESS_TREND;
  const width=760, height=250, left=42, right=18, top=20, bottom=42;
  const x=(i:number)=>left+(i/Math.max(1,trend.length-1))*(width-left-right);
  const y=(v:number)=>top+(60-v)/60*(height-top-bottom);
  const plannedPoints=trend.map((d,i)=>`${x(i)},${y(d.planned)}`).join(' ');
  const actualPoints=trend.map((d,i)=>`${x(i)},${y(d.actual)}`).join(' ');
  return <div className="field-page field-home-page">
    <PageSection label="FIELD / TODAY" title="Field home" action={<button className="primary-btn" onClick={()=>onGo('capture')}>Report progress →</button>}>
      <div className="field-summary-grid">
        <div className="field-summary field-summary-work"><div><span className="eyebrow">FIELD UPDATES TODAY</span><strong>{FIELD_EVENTS.length}</strong><small>Persisted execution events</small></div><span className="summary-status">ACTIVE</span></div>
        <div className="field-summary field-summary-submissions"><div><span className="eyebrow">PENDING SUBMISSIONS</span><strong>{REVIEW_QUEUE.length}</strong><small>Pending planner decisions</small></div><span className="summary-status amber">IN REVIEW</span></div>
      </div>
      <div className="field-home-grid field-home-grid-enhanced">
        <div className="field-panel field-trajectory-panel">
          <div className="panel-heading"><div><span className="eyebrow">PROJECT TRAJECTORY</span><h3>How progress is moving</h3><p className="panel-subtitle">Planned progress compared with verified project actuals.</p></div><span className="trajectory-delta">{PROJECT_METRICS.actualProgress.toFixed(1)}% actual</span></div>
          <div className="field-chart-wrap">
            {!trend.length && <div className="empty-state">Historical progress points will appear after validated execution updates are recorded.</div>}
            {trend.length > 0 && <svg className="field-trajectory-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Project planned versus actual progress trajectory">
              {[0,15,30,45,60].map(v=><g key={v}><line x1={left} x2={width-right} y1={y(v)} y2={y(v)} className="chart-grid-line"/><text x={left-10} y={y(v)+4} textAnchor="end" className="chart-axis-label">{v}%</text></g>)}
              <polyline points={plannedPoints} className="trajectory-line planned"/>
              <polyline points={actualPoints} className="trajectory-line actual"/>
              {trend.map((d,i)=><g key={d.date}><circle cx={x(i)} cy={y(d.actual)} r="3.5" className="trajectory-dot actual"/><text x={x(i)} y={height-15} textAnchor="middle" className="chart-date-label">{d.date}</text></g>)}
            </svg>}
            <div className="trajectory-legend"><span><i className="legend-line planned"/>Planned</span><span><i className="legend-line actual"/>Actual</span><b>{PROJECT_METRICS.variance >= 0 ? `+${PROJECT_METRICS.variance.toFixed(1)} pts current gap` : `−${Math.abs(PROJECT_METRICS.variance).toFixed(1)} pts current gap`}</b></div>
          </div>
        </div>
        <div className="field-panel field-submissions-panel"><div className="panel-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h3>Recent execution events</h3><p className="panel-subtitle">Persisted field evidence and its current review state.</p></div></div>{FIELD_EVENTS.slice(0,2).map((e:any)=><div className="submission-mini" key={e.id}><span className={`submission-state ${e.status==='AI MATCHED'?'accepted':'review'}`}>{e.status}</span><strong>{e.actDesc}</strong><small>{e.text}</small></div>)}{!FIELD_EVENTS.length&&<div className="empty-state">No execution events have been submitted yet.</div>}<button className="outline-btn full" onClick={()=>onGo('submissions')}>Open submissions →</button></div>
      </div>
      <div className="field-home-footer-space" aria-hidden="true"/>
    </PageSection>
  </div>
}

function Submissions({onCapture}:{onCapture:()=>void}){
  return <div className="field-page"><PageSection label="FIELD / SUBMISSIONS" title="My submissions" action={<button className="primary-btn" onClick={onCapture}>New report →</button>}>
    {FIELD_EVENTS.length ? <div className="field-submissions-list">{FIELD_EVENTS.map((s:any)=><div className="submission-card" key={s.id}><div><span className={`submission-state ${s.status==='AI MATCHED'?'accepted':s.status==='UNMATCHED'?'needs':'review'}`}>{s.status}</span><strong>{s.actDesc}</strong><small>{s.text}</small></div><span className="submission-arrow">→</span></div>)}</div> : <div className="empty-state">No field submissions are stored for this project yet.</div>}
  </PageSection></div>
}

function FieldProfile({onSignOut}:{onSignOut:()=>void}){
  return <div className="field-page"><PageSection label="FIELD / ACCOUNT" title="My profile"><div className="field-profile-card"><div className="profile-avatar">FS</div><div><span className="eyebrow">FIELD WORKSPACE</span><h3>Signed-in field user</h3><p>{CURRENT_PROJECT?.name || 'No project imported'}</p></div><div className="profile-actions"><button className="danger-btn" onClick={onSignOut}>Sign out</button></div></div></PageSection></div>
}
function Analytics(){
  const trend=PROGRESS_TREND;
  const width=860,height=280,left=52,right=20,top=18,bottom=34;
  const x=(i:number)=>left+(i/Math.max(1,trend.length-1))*(width-left-right);
  const y=(v:number)=>top+(60-v)/60*(height-top-bottom);
  const planned=trend.map((d,i)=>`${x(i)},${y(d.planned)}`).join(' ');
  const actual=trend.map((d,i)=>`${x(i)},${y(d.actual)}`).join(' ');
  return <div className="analytics-page">
    <PageSection label="ANALYTICS / PROJECT PERFORMANCE" title="Project analytics">
      <div className="analytics-summary-grid">
        <div className="analytics-kpi"><span className="eyebrow">ACTUAL PROGRESS</span><strong>{PROJECT_METRICS.actualProgress.toFixed(1)}%</strong><small>Persisted execution progress across the project</small></div>
        <div className="analytics-kpi"><span className="eyebrow">PLAN TRAJECTORY</span><strong>{PROJECT_METRICS.plannedProgress.toFixed(1)}%</strong><small>Current persisted planned progress</small></div>
        <div className="analytics-kpi"><span className="eyebrow">REVIEW WORKLOAD</span><strong>{PROJECT_METRICS.reviewCount}</strong><small>Ambiguous events awaiting planner action</small></div>
        <div className="analytics-kpi"><span className="eyebrow">UNMATCHED</span><strong>{PROJECT_METRICS.unmatchedCount}</strong><small>Unmatched pending events</small></div>
      </div>
      <div className="analytics-grid-two">
        <article className="analytics-panel analytics-trajectory-panel">
          <div className="analytics-panel-head"><div><span className="eyebrow">PROGRESS TRAJECTORY</span><h3>Planned vs actual</h3></div><span className="trace-chip">{PROJECT_METRICS.actualProgress.toFixed(1)}% actual</span></div>
          <div className="analytics-chart">
            <div className="analytics-ylabels"><span>60%</span><span>45%</span><span>30%</span><span>15%</span><span>0%</span></div>
            <div className="analytics-plot">
              <div className="analytics-gridlines"><i/><i/><i/><i/><i/></div>
              {trend.length > 1 ? <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="Planned versus actual project progress"><polyline points={planned} fill="none" stroke="var(--info)" strokeWidth="3" strokeDasharray="8 7"/><polyline points={actual} fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>{trend.map((d:any,i:number)=><circle key={i} cx={x(i)} cy={y(d.actual)} r="4" fill="var(--surface)" stroke="var(--accent)" strokeWidth="3"/>)}</svg> : <div className="empty-state">Historical progress points will appear after validated execution updates are recorded.</div>}
              <div className="analytics-xlabels">{trend.map((d:any)=><span key={d.date}>{d.date}</span>)}</div>
            </div>
          </div>
          <div className="analytics-legend"><span><i className="legend-line actual-line"/>Actual</span><span><i className="legend-line planned-line"/>Planned</span></div>
        </article>
        <article className="analytics-panel"><div className="analytics-panel-head"><div><span className="eyebrow">DISCIPLINE PERFORMANCE</span><h3>Workstream output</h3></div></div><div className="analytics-bars">{DISCIPLINE_PERF.map(d=><div className="analytics-bar-row" key={d.disc}><div className="analytics-bar-label"><span>{d.disc}</span><b>{d.actual}%</b></div><div className="analytics-bar-track"><i style={{width:`${d.actual}%`}}/><span style={{left:`${d.planned}%`}}/></div><small>plan {d.planned}%</small></div>)}</div></article>
      </div>
      <article className="analytics-panel"><div className="analytics-panel-head"><div><span className="eyebrow">DELAY PATTERNS</span><h3>Primary execution causes</h3></div></div><div className="analytics-bars">{DELAY_CAUSES.map(d=><div className="analytics-bar-row" key={d.cause}><div className="analytics-bar-label"><span>{d.cause}</span><b>{d.pct}%</b></div><div className="analytics-bar-track"><i style={{width:`${d.pct}%`}}/></div></div>)}</div></article>
    </PageSection>
  </div>
}

function Team({onInvite,onManage}:{onInvite:()=>void;onManage:(member:{initials:string;name:string;role:string;workspace:string;status:string})=>void}){
  void onManage;
  return <div className="team-page">
    <PageSection title="Team members" action={<button className="primary-btn" onClick={onInvite}>Add member +</button>}>
      <div className="empty-state">Team membership is not exposed by the current frontend API yet. No placeholder members are shown.</div>
    </PageSection>
  </div>
}

function FieldSettings({themeMode,setThemeMode,density,setDensity,autoSave,setAutoSave}:{themeMode:ThemeMode;setThemeMode:(v:ThemeMode)=>void;density:'comfortable'|'compact';setDensity:(v:'comfortable'|'compact')=>void;autoSave:boolean;setAutoSave:(v:boolean)=>void}){
 return <div className="settings-page field-settings-page"><PageSection title="Field settings">
   <div className="settings-card"><div className="setting-copy"><span className="eyebrow">APPEARANCE</span><strong>Theme</strong><p>Choose the interface appearance for your field workspace.</p></div><div className="theme-picker" role="radiogroup" aria-label="Theme"><button className={themeMode==='light'?'selected':''} onClick={()=>setThemeMode('light')}><span className="theme-preview light-preview">☼</span><b>Light</b><small>Bright workspace</small></button><button className={themeMode==='dark'?'selected':''} onClick={()=>setThemeMode('dark')}><span className="theme-preview dark-preview">◐</span><b>Dark</b><small>Low-light workspace</small></button><button className={themeMode==='system'?'selected':''} onClick={()=>setThemeMode('system')}><span className="theme-preview system-preview">◑</span><b>System</b><small>Follow device</small></button></div></div>
   <div className="settings-card"><div className="setting-copy"><span className="eyebrow">LAYOUT</span><strong>Density</strong><p>Control how much information is visible across the field workspace.</p></div><div className="segmented-control"><button className={density==='comfortable'?'selected':''} onClick={()=>setDensity('comfortable')}>Comfortable</button><button className={density==='compact'?'selected':''} onClick={()=>setDensity('compact')}>Compact</button></div></div>
   <div className="settings-card field-draft-setting"><div className="setting-row"><div><span className="eyebrow">DRAFTS</span><strong>Auto-save progress drafts</strong><p>Keep unfinished field progress entries locally so they can be resumed before submission.</p></div><button className={`toggle ${autoSave?'on':''}`} aria-pressed={autoSave} onClick={()=>setAutoSave(!autoSave)}><span/></button></div></div>
 </PageSection></div>
}
function Settings({threshold,setThreshold,saved,onSave,themeMode,setThemeMode,density,setDensity,emailNotifications,setEmailNotifications,inAppNotifications,setInAppNotifications,autoSave,setAutoSave,dateFormat,setDateFormat,timezone,setTimezone,retention,setRetention}:{threshold:number;setThreshold:(n:number)=>void;saved:boolean;onSave:()=>void;themeMode:ThemeMode;setThemeMode:(v:ThemeMode)=>void;density:'comfortable'|'compact';setDensity:(v:'comfortable'|'compact')=>void;emailNotifications:boolean;setEmailNotifications:(v:boolean)=>void;inAppNotifications:boolean;setInAppNotifications:(v:boolean)=>void;autoSave:boolean;setAutoSave:(v:boolean)=>void;dateFormat:string;setDateFormat:(v:string)=>void;timezone:string;setTimezone:(v:string)=>void;retention:string;setRetention:(v:string)=>void}){
 return <div className="settings-page"><PageSection title="Make Synchronex work your way"><div className="settings-card"><div className="setting-copy"><span className="eyebrow">APPEARANCE</span><strong>Theme</strong><p>Choose the interface appearance for this workspace. System follows your operating system preference.</p></div><div className="theme-picker" role="radiogroup" aria-label="Theme"><button className={themeMode==='light'?'selected':''} onClick={()=>setThemeMode('light')}><span className="theme-preview light-preview">☼</span><b>Light</b><small>Bright workspace</small></button><button className={themeMode==='dark'?'selected':''} onClick={()=>setThemeMode('dark')}><span className="theme-preview dark-preview">◐</span><b>Dark</b><small>Low-light workspace</small></button><button className={themeMode==='system'?'selected':''} onClick={()=>setThemeMode('system')}><span className="theme-preview system-preview">◑</span><b>System</b><small>Follow device</small></button></div></div><div className="settings-card"><div className="setting-copy"><span className="eyebrow">LAYOUT</span><strong>Density</strong><p>Control how much information is visible in tables and lists.</p></div><div className="segmented-control"><button className={density==='comfortable'?'selected':''} onClick={()=>setDensity('comfortable')}>Comfortable</button><button className={density==='compact'?'selected':''} onClick={()=>setDensity('compact')}>Compact</button></div></div></PageSection>
 <PageSection title="Control when AI may apply changes"><div className="settings-card stacked"><div className="setting-row"><div><strong>Auto-apply confidence threshold</strong><p>Events at or above this threshold may be eligible for automatic application if all validation checks pass.</p></div><div className="threshold-control"><input aria-label="Auto apply confidence threshold" type="range" min="80" max="99" value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/><b>{threshold}%</b></div></div><div className="setting-row"><div><strong>Auto-save drafts</strong><p>Preserve unfinished company form changes locally before submission.</p></div><button className={`toggle ${autoSave?'on':''}`} aria-pressed={autoSave} onClick={()=>setAutoSave(!autoSave)}><span/></button></div></div></PageSection>

</div>
}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){return <div className="modal-backdrop" onMouseDown={e=>e.currentTarget===e.target&&onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><h2 id="modal-title">{title}</h2><button className="icon-btn" aria-label="Close" onClick={onClose}>×</button></div>{children}</div></div>}
