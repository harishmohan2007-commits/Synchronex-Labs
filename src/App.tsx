import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRuntimeData, refreshRuntimeData } from './runtimeData';

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
  const {ACTIVITIES,DISCIPLINES,FIELD_EVENTS,REVIEW_QUEUE,AUDIT_TRAIL,MEMORY_ACTIVITIES,PROGRESS_TREND,DELAY_CAUSES,DISCIPLINE_PERF,project,settings:backendSettings,loading:dataLoading,error:dataError}=useRuntimeData();
  useEffect(()=>{refreshRuntimeData().catch(()=>{});},[]);
  useEffect(()=>{if(ACTIVITIES.length && !ACTIVITIES.some(a=>a.id===selectedId))setSelectedId(ACTIVITIES[0].id);},[ACTIVITIES.length]);
  const reviewCount=REVIEW_QUEUE.length;
  useEffect(()=>{if(!backendSettings)return;setThreshold(Math.round((backendSettings.confidence_threshold??0.9)*100));setDateFormat(backendSettings.date_format||'DD MMM YYYY');setTimezone(backendSettings.timezone||'Asia/Kolkata');setRetention(backendSettings.retention||'project');setAutoSave(backendSettings.auto_save??true);setEmailNotifications(backendSettings.email_notifications??true);setInAppNotifications(backendSettings.in_app_notifications??true);},[backendSettings]);
  const [authenticated,setAuthenticated]=useState(false);
  const [role,setRole]=useState<Role>('company');
  const [authMode,setAuthMode]=useState<'login'|'forgot'>('login');
  const [screen,setScreen]=useState<Screen>('command');
  const [selectedId,setSelectedId]=useState('PIP-245');
  const [reviewIndex,setReviewIndex]=useState(0);
  const [reviewDetailOpen,setReviewDetailOpen]=useState(false);
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

  // Schedule discipline selection
  const [scheduleDiscipline,setScheduleDiscipline]=useState('All');

  // Activity detail modal target
  const [detailId,setDetailId]=useState<string|null>(null);

  const selected=ACTIVITIES.find(a=>a.id===selectedId) || ACTIVITIES[0];
  const openReviewQueue=REVIEW_QUEUE;
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
    if(!captureName.trim()){notify('Name this progress update before submitting.');return;}
    if(!captureText.trim() && !captureFiles.length && !recordedAudioUrl){notify('Add at least one information source: text, a file, or a voice update.');return;}
    setCaptureBusy(true);setCaptureResult(false);setDirty(false);
    const apiBase=(import.meta.env.VITE_API_BASE_URL||'https://synchronex-api.onrender.com').replace(/\/$/,'');
    try{
      const body=new FormData(); body.append('project_id',project?.id||''); body.append('submitted_by',role==='field'?'field':'planner'); body.append('text',`REPORT NAME: ${captureName.trim()}\n${captureText}`.trim());
      captureFiles.forEach(f=>body.append('files',f,f.name));
      const response=await fetch(`${apiBase}/api/capture`,{method:'POST',body}); const payload=await response.json().catch(()=>({detail:'Capture failed.'}));
      if(!response.ok) throw new Error(payload?.detail||'Capture failed.');
      setCaptureBusy(false);setCaptureResult(false);setCaptureText('');setCaptureName('');setCaptureFiles([]);if(recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);setRecordedAudioUrl('');setRecordingSeconds(0);setDirty(false);await refreshRuntimeData(project?.id);notify('Progress update submitted successfully. The field form has been reset.');
    }catch(error){setCaptureBusy(false);notify(error instanceof Error?error.message:'Capture failed.');}
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

  const decideReview=async(decision:'approve'|'reject'|'flag')=>{
    if(!activeReview) return;
    try{const apiBase=(import.meta.env.VITE_API_BASE_URL||'https://synchronex-api.onrender.com').replace(/\/$/,'');const r=await fetch(`${apiBase}/api/review/${activeReview.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision,reviewer:'planner'})});const p=await r.json().catch(()=>({detail:'Review action failed.'}));if(!r.ok)throw new Error(p?.detail||'Review action failed.');await refreshRuntimeData(project?.id);setReviewDetailOpen(false);setReviewIndex(0);notify(decision==='approve'?'Match approved and actuals/provenance updated.':decision==='reject'?'Match rejected and retained in provenance.':'Execution event flagged as a new activity proposal.');}catch(error){notify(error instanceof Error?error.message:'Review action failed.');}
  };
  const approveReview=()=>decideReview('approve');
  const rejectReview=()=>decideReview('reject');
  const flagNew=()=>decideReview('flag');
  const processImport=async()=>{
    if(!importFiles.length){notify('Choose a ProjectLibre, Microsoft Project, or Primavera schedule file first.');return;}
    const file=importFiles[0];
    if(!/\.(pod|mpp|xml|xer|mspdi)$/i.test(file.name)){setImportState('error');notify('Supported schedules: ProjectLibre .pod, Microsoft Project .mpp/.xml, Primavera P6 .xer.');return;}
    const apiBase=(import.meta.env.VITE_API_BASE_URL||'https://synchronex-api.onrender.com').replace(/\/$/,'');
    const projectId=project?.id;
    setImportState('processing');
    try{
      const body=new FormData();
      body.append('file',file,file.name);
      if(projectId) body.append('project_id',projectId);
      const response=await fetch(`${apiBase}/api/import/schedule`,{method:'POST',body});
      const payload=await response.json().catch(()=>({detail:'The backend returned an invalid response.'}));
      if(!response.ok) throw new Error(payload?.detail||`Import failed (${response.status}).`);
      setImportState('success');
      setDirty(false);
      await refreshRuntimeData(projectId);
      const counts=payload?.counts||{};
      setImportFiles([]);
      setImportState('idle');
      notify(`${payload?.source||'Schedule'} imported successfully. Import form reset: ${counts.activities??0} activities, ${counts.dependencies??0} dependencies loaded.`);
    }catch(error){
      setImportState('error');
      notify(error instanceof Error?error.message:'POD import failed.');
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

      {role==='company' && screen==='command'&&<Command onGo={go} reviewCount={reviewCount}/>}
      {role==='company' && screen==='schedule'&&<Schedule rows={ACTIVITIES} selectedId={selectedId} onSelect={setSelectedId} onExport={exportSchedule} discipline={scheduleDiscipline} setDiscipline={setScheduleDiscipline} onOpenDetail={(id)=>{setDetailId(id);setModal('activity')}} />}
      {role==='field' && screen==='capture'&&<Capture text={captureText} setText={(v)=>{setCaptureText(v);setDirty(true)}} name={captureName} setName={(v)=>{setCaptureName(v);setDirty(true)}} stage={captureStage} busy={captureBusy} result={captureResult} run={runCapture} files={captureFiles} onFiles={handleCaptureFiles} removeFile={removeCaptureFile} fileInputRef={fileInputRef} recording={recording} recordingSeconds={recordingSeconds} recordedAudioUrl={recordedAudioUrl} startRecording={startRecording} stopRecording={stopRecording} deleteRecording={deleteRecording} resetCapture={resetCapture} formatRecordingTime={formatRecordingTime} />}
      {role==='company' && screen==='review'&&<Review count={openReviewQueue.length} item={activeReview} index={reviewIndex} queue={openReviewQueue} onApprove={approveReview} onReject={rejectReview} onFlag={flagNew} onJump={setReviewIndex} detailOpen={reviewDetailOpen} onOpenDetail={(i)=>{setReviewIndex(i);setReviewDetailOpen(true)}} onBack={()=>setReviewDetailOpen(false)} />}
      {role==='company' && screen==='memory'&&<Memory />}
      {role==='company' && screen==='trace'&&<Trace />}
      {role==='company' && screen==='import'&&<Import state={importState} files={importFiles} setFiles={(files)=>{setImportFiles(files);setImportState('idle');setDirty(true)}} onProcess={processImport} onRetry={processImport} onOpenReview={()=>go('review')}/>}
      {role==='company' && screen==='analytics'&&<Analytics />}
      {role==='company' && screen==='team'&&<Team onInvite={()=>setModal('invite')} onManage={(m)=>{setMemberTarget(m);setMemberDraft({role:m.role,workspace:m.workspace,status:m.status,canReview:m.role.toLowerCase().includes('review')||m.workspace==='Company',canImport:m.workspace==='Company',canEditBaseline:m.role==='Project Manager'});setModal('member')}} />}
      {role==='company' && screen==='settings'&&<Settings threshold={threshold} setThreshold={setThreshold} saved={saved} onSave={async()=>{if(!project?.id){notify('Import a schedule before saving workspace controls.');return;}try{const apiBase=(import.meta.env.VITE_API_BASE_URL||'https://synchronex-api.onrender.com').replace(/\/$/,'');const r=await fetch(`${apiBase}/api/settings/${project.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({confidence_threshold:threshold/100,date_format:dateFormat,timezone,retention,auto_save:autoSave,email_notifications:emailNotifications,in_app_notifications:inAppNotifications})});if(!r.ok)throw new Error('Settings could not be saved.');setSaved(true);notify('Workspace controls saved to Supabase.');}catch(error){notify(error instanceof Error?error.message:'Settings could not be saved.');}}} themeMode={themeMode} setThemeMode={setThemeMode} density={density} setDensity={setDensity} emailNotifications={emailNotifications} setEmailNotifications={setEmailNotifications} inAppNotifications={inAppNotifications} setInAppNotifications={setInAppNotifications} autoSave={autoSave} setAutoSave={setAutoSave} dateFormat={dateFormat} setDateFormat={setDateFormat} timezone={timezone} setTimezone={setTimezone} retention={retention} setRetention={setRetention}/>}
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
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const [forgotOpen,setForgotOpen]=useState(false); const [forgotEmail,setForgotEmail]=useState(''); const [forgotBusy,setForgotBusy]=useState(false); const [forgotSent,setForgotSent]=useState(false);
 const chooseRole=(next:Role)=>{setRole(next);setEmail('');setError('');setPassword('')};
 const submit=(e:React.FormEvent)=>{e.preventDefault();setError('');const demoEntry=!email.trim()&&!password.trim();if(demoEntry){setBusy(true);window.setTimeout(()=>{setBusy(false);onLogin()},250);return}if(!email.includes('@')){setError('Enter a valid work email, or leave both fields blank for demo entry.');return}if(!password){setError('Enter your password, or leave both fields blank for demo entry.');return}setBusy(true);window.setTimeout(()=>{setBusy(false);onLogin()},700)};
 const openForgot=()=>{setForgotEmail(email.includes('@')?email:'');setForgotSent(false);setError('');setForgotOpen(true)};
 const sendReset=(e:React.FormEvent)=>{e.preventDefault();if(!forgotEmail.includes('@')){setError('Enter the registered email address.');return}setForgotBusy(true);setError('');window.setTimeout(()=>{setForgotBusy(false);setForgotSent(true)},900)};
 return <div className="auth-shell"><div className="auth-left"><div className="auth-brand"><span className="brand-mark">S</span><div><strong>SYNCHRONEX LABS</strong></div></div><div className="auth-hero"><h1>{role==='company'?'Connect planning with execution intelligence.':'Turn field updates into trusted schedule actuals.'}</h1><p>{role==='company'?'Manage the baseline, review field evidence, validate actuals, and preserve project intelligence.':'Report site progress with text, voice, or evidence files without exposing company planning controls.'}</p><div className="auth-path">{role==='company'?<><span>01 Plan</span><i>→</i><span>02 Review</span><i>→</i><span>03 Apply</span><i>→</i><span>04 Learn</span></>:<><span>01 Work</span><i>→</i><span>02 Capture</span><i>→</i><span>03 Submit</span><i>→</i><span>04 Track</span></>}</div></div></div><div className="auth-right"><div className="auth-card"><span className="eyebrow">SECURE WORKSPACE</span><h2>Choose your workspace</h2><div className="role-switch" role="tablist" aria-label="Workspace type"><button type="button" className={role==='company'?'selected':''} onClick={()=>chooseRole('company')}><strong>Company portal</strong><span>Planning, review & control</span></button><button type="button" className={role==='field'?'selected':''} onClick={()=>chooseRole('field')}><strong>Field portal</strong><span>Work, capture & submissions</span></button></div><p>{role==='company'?'Use your project-controls account to manage the project workspace.':'Use your field account to report execution and track submissions.'}</p><form onSubmit={submit}><label>Work email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email"/></label><label>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password"/></label>{error&&<div className="form-error" role="alert">{error}</div>}<button className="primary-btn" disabled={busy}>{busy?'Working…':`Enter ${role==='company'?'company':'field'} portal`} <span>→</span></button></form><button className="link-btn" type="button" onClick={openForgot}>Forgot password?</button></div></div>{forgotOpen&&<div className="modal-backdrop auth-recovery-backdrop" role="dialog" aria-modal="true" aria-labelledby="recovery-title" onMouseDown={e=>e.currentTarget===e.target&&setForgotOpen(false)}><div className="modal auth-recovery-modal"><div className="modal-head"><h2 id="recovery-title">Reset your password</h2><button className="icon-btn" aria-label="Close password recovery" onClick={()=>setForgotOpen(false)}>×</button></div>{forgotSent?<div className="recovery-success"><span className="success-chip">REQUEST RECEIVED</span><h3>Check your registered email</h3><p>If the address is registered, a password-reset email will be sent to <strong>{forgotEmail}</strong>.</p><button className="primary-btn" onClick={()=>setForgotOpen(false)}>Back to sign in →</button></div>:<form onSubmit={sendReset} className="recovery-form"><p className="modal-copy">Enter the email address registered to your Synchronex account. We'll use it for the password-reset request.</p><label>Registered email<input autoFocus value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} type="email" placeholder="name@company.com" autoComplete="email"/></label>{error&&<div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="outline-btn" onClick={()=>setForgotOpen(false)}>Cancel</button><button type="submit" className="primary-btn" disabled={forgotBusy}>{forgotBusy?'Sending…':'Send reset email →'}</button></div></form>}</div></div>}</div>
}

function PageSection({label,title,children,action}:{label?:string;title:string;children:React.ReactNode;action?:React.ReactNode}){return <section className="section"><div className="section-head"><div>{label&&<span className="eyebrow">{label}</span>}<h2>{title}</h2></div>{action}</div>{children}</section>}

function Command({onGo,reviewCount}:{onGo:(s:Screen)=>void;reviewCount:number}){
  const {DISCIPLINES,FIELD_EVENTS,ACTIVITIES,PROGRESS_TREND}=useRuntimeData();
  const executable=ACTIVITIES.filter(a=>!a.isSummary);
  const planned=executable.length?Math.round(executable.reduce((s,a)=>s+(a.plannedProgress??0),0)/executable.length*10)/10:0;
  const actual=executable.length?Math.round(executable.reduce((s,a)=>s+(a.progress??0),0)/executable.length*10)/10:0;
  const variance=Math.round((actual-planned)*10)/10;
  const fmt=(n:number)=>`${n>0?'+':''}${n}%`;
  return <div className="command-page">
   <div className="command-top"><div className="metric-band command-metrics">
     <Metric label="L5/L6 activities" value={String(executable.length)} note="executable nodes"/>
     <Metric label="Actual progress" value={`${actual}%`} note={`vs ${planned}% planned`} tone="blue"/>
     <Metric label="Schedule variance" value={fmt(variance)} note={variance<0?'behind baseline':variance>0?'ahead of baseline':'no validated variance'} tone={variance<0?'red':''}/>
     <Metric label="Review workload" value={String(reviewCount)} note="planner decisions" tone="amber"/>
   </div></div>
   <section className="command-summary-row">
     <div className="command-summary-card decision-summary-card"><div><span className="eyebrow">DECISION QUEUE</span><div className="summary-number-row"><strong>{reviewCount}</strong><span className="queue-status">OPEN</span></div><p>Ambiguous or unmatched events need a planner before schedule application.</p></div><button className="primary-btn" onClick={()=>onGo('review')}>Review decisions →</button></div>
     <div className="command-summary-card progress-summary-card"><div className="summary-card-head"><div><span className="eyebrow">PROJECT PROGRESS</span><h3>Planned trajectory &amp; actual progress</h3></div><span className="summary-delta">{fmt(variance)}</span></div>
       <div className="summary-progress-grid"><div><span>PLANNED</span><strong>{planned}%</strong><div className="summary-bar"><i style={{width:`${Math.min(100,Math.max(0,planned))}%`}}/></div></div><div><span>ACTUAL</span><strong>{actual}%</strong><div className="summary-bar actual"><i style={{width:`${Math.min(100,Math.max(0,actual))}%`}}/></div></div></div>
     </div>
   </section>
   <div className="command-pulse-heading command-pulse-heading-full"><div><span className="eyebrow">BASELINE → ACTUAL</span><h2>Project pulse</h2></div><button className="outline-btn" onClick={()=>onGo('schedule')}>Open schedule →</button></div>
   <section className="command-pulse-graph"><div className="pulse-grid"><div className="trend"><div className="trend-head"><span>Progress trajectory</span><span><b className="legend-line actual"/>Actual <b className="legend-line planned"/>Planned</span></div>
     {PROGRESS_TREND.length? <div className="chart"><svg viewBox="0 0 720 220" preserveAspectRatio="none" aria-label="Planned and actual progress trend"><polyline points={PROGRESS_TREND.map((d,i)=>`${i/Math.max(1,PROGRESS_TREND.length-1)*720},${210-d.planned*1.8}`).join(' ')} fill="none" stroke="#93a1ad" strokeWidth="2" strokeDasharray="5 5"/><polyline points={PROGRESS_TREND.map((d,i)=>`${i/Math.max(1,PROGRESS_TREND.length-1)*720},${210-d.actual*1.8}`).join(' ')} fill="none" stroke="#173f35" strokeWidth="4"/></svg></div> : <div className="empty-state">No validated execution history is available yet. Progress trajectory will appear after actual field events are accepted.</div>}
     {PROGRESS_TREND.length>0&&<div className="chart-axis">{PROGRESS_TREND.map((d:any)=><span key={d.date}>{d.date}</span>)}</div>}
     <div className="pulse-kpis"><div><span>ACTUAL</span><b>{actual}%</b></div><div><span>PLANNED</span><b>{planned}%</b></div><div><span>VARIANCE</span><b className={variance<0?'negative':''}>{fmt(variance)}</b></div></div>
   </div></div></section>
 </div>
}

function Metric({label,value,note,tone}:{label:string;value:string;note:string;tone?:string}){return <div className="metric"><span>{label}</span><strong className={tone||''}>{value}</strong><small>{note}</small></div>}

function Schedule({rows,selectedId,onSelect,onExport,discipline,setDiscipline,onOpenDetail}:{rows:any[];selectedId:string;onSelect:(id:string)=>void;onExport:()=>void;discipline:string;setDiscipline:(d:string)=>void;onOpenDetail:(id:string)=>void}){
  const visibleRows=discipline==='All'?rows:rows.filter(a=>a.discipline===discipline);
  const plannedRows=visibleRows.filter(a=>a.planStart!=='—'&&a.planFinish!=='—');
  const dates=plannedRows.flatMap(a=>[new Date(a.planStart).getTime(),new Date(a.planFinish).getTime()]).filter(Number.isFinite);
  const minDate=dates.length?new Date(Math.min(...dates)):new Date();
  const maxDate=dates.length?new Date(Math.max(...dates)):new Date(minDate.getTime()+86400000);
  const span=Math.max(1,maxDate.getTime()-minDate.getTime());
  const marksCount=8;
  const marks=Array.from({length:marksCount},(_,i)=>new Date(minDate.getTime()+span*i/(marksCount-1)));
  const pct=(date:string)=>Math.max(0,Math.min(100,(new Date(date).getTime()-minDate.getTime())/span*100));
  const formatDate=(d:Date)=>d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
  const disciplines=Array.from(new Set(rows.map(a=>a.discipline).filter((d:any)=>d&&d!=='—')));
  const executable=plannedRows.filter(a=>!a.isSummary);
  return <div className="schedule-page">
    <PageSection label="SCHEDULE / PLANNED VS ACTUAL" title="Schedule" action={<div className="schedule-head-actions"><label className="gantt-filter-label">Discipline<select value={discipline} onChange={e=>setDiscipline(e.target.value)} aria-label="Filter schedule by discipline"><option value="All">All disciplines</option>{disciplines.map(d=><option key={d} value={d}>{d}</option>)}</select></label><button className="primary-btn" onClick={onExport}>Export schedule ↓</button></div>}>
      <div className="schedule-progress-note"><span><b>Planned</b> = baseline trajectory at the latest validated progress date</span><span><b>Actual</b> = verified field progress only</span></div>
      <div className="gantt-shell gantt-shell-progress">
        <div className="gantt-head gantt-head-progress"><div>Activity</div><div className="gantt-progress-head"><span>Planned</span><span>Actual</span><span className="gantt-timeline-head">{marks.map((d,i)=><em key={i}>{formatDate(d)}</em>)}</span></div></div>
        {plannedRows.length?plannedRows.map(a=>{const left=pct(a.planStart);const right=pct(a.planFinish);return <button key={a.id} className={`gantt-row gantt-row-progress ${a.id===selectedId?'selected':''} ${a.isSummary?'summary-row':''}`} onClick={()=>{onSelect(a.id);onOpenDetail(a.id);}}><div className="gantt-activity"><code>{a.id}</code><strong>{a.desc}</strong><small>{a.wbs} · {a.discipline}</small></div><div className="gantt-progress-cell"><b>{a.plannedProgress==null?'—':`${Math.round(a.plannedProgress)}%`}</b><b className={a.progress>0?'actual-value':''}>{Math.round(a.progress||0)}%</b><div className="gantt-track"><div className="gantt-grid">{marks.map((_,i)=><i key={i}/>)}</div><span className="gantt-bar" style={{left:`${left}%`,width:`${Math.max(1.5,right-left)}%`}}/></div></div></button>}) : <div className="screen-empty-state"><strong>No scheduled activities so far</strong><span>Import a valid project schedule to populate the planned Gantt view.</span></div>}
      </div>
      <div className="gantt-legend"><span><i/> Planned schedule duration</span><span>{executable.length} executable activities · {discipline==='All'?'all disciplines':discipline}</span></div>
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
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Pipe erection XX progress" aria-label="Progress report name" />
        </div>
        <div className="capture-final-actions">
          <button className="primary-btn capture-submit-btn" disabled={busy} onClick={run}>{busy?'Submitting progress…':'Submit progress update'} <span>→</span></button>
          <button className="outline-btn" type="button" onClick={resetCapture}>Reset update</button>
          <span className="helper"><strong>Required:</strong> progress update name. <strong>Optional:</strong> text, files, or voice — add at least one.</span>
        </div>
        {result&&<div className="submission-success"><span>✓</span><div><strong>Progress update submitted successfully</strong><p>Your field evidence has been sent through extraction, matching, and validation.</p></div></div>}
      </PageSection>
    </div>
  </div>
}

function Review({count,item,index,queue,onApprove,onReject,onFlag,onJump,detailOpen,onOpenDetail,onBack}:{count:number;item:any;index:number;queue:any[];onApprove:()=>void;onReject:()=>void;onFlag:()=>void;onJump:(i:number)=>void;detailOpen:boolean;onOpenDetail:(i:number)=>void;onBack:()=>void}){
  const {ACTIVITIES}=useRuntimeData();
  const queueRows=queue.map((q,i)=><tr key={q.id} onClick={()=>onOpenDetail(i)}><td><code>{q.id.slice(0,8)}</code></td><td><strong>{q.reportName||'Field progress report'}</strong><small>{q.date||'Date not extracted'} · {q.discipline||'Discipline not extracted'}</small></td><td><strong>{q.candidate||'No matching activity'}</strong><small>{q.action||'Observation'} · {q.progress!=null?`${q.progress}% reported`:'Progress not extracted'}</small></td><td><b className={q.conf>=80?'review-conf-high':'review-conf'}>{q.conf?`${q.conf}%`:'—'}</b></td><td>{q.issue}</td><td><span className={`review-status ${q.status==='Unmatched'?'unmatched':''}`}>{q.status}</span></td><td><span className="review-open-arrow">Open →</span></td></tr>);
  if(!detailOpen){
    return <div className="review-queue-page"><PageSection label="REVIEW / FIELD EVIDENCE" title="Review queue" action={<span className="queue-count">{count} open</span>}>
      <div className="review-queue-subtitle"><strong>Select a field event to open planner validation.</strong><p>The queue shows the same report details captured by the field portal before a planner decision is applied.</p></div>
      <div className="review-table-wrap"><table className="review-table"><thead><tr><th>Queue ID</th><th>Field report</th><th>Candidate / progress</th><th>Confidence</th><th>Issue</th><th>Status</th><th></th></tr></thead><tbody>{queue.length?queueRows:<tr><td colSpan={7}><div className="review-empty"><strong>No open review items</strong><span>100% unique matches are applied automatically; ambiguous or low-confidence events appear here.</span></div></td></tr>}</tbody></table></div>
    </PageSection></div>
  }
  return <div className="review-detail-page"><PageSection label="REVIEW / FIELD EVIDENCE" title="Resolve before apply" action={<button className="outline-btn" onClick={onBack}>← Back to review queue</button>}>
    <div className="review-detail-grid">
      <main className="review-detail-main">
        <div className="review-hero"><div><span className="eyebrow">ORIGINAL FIELD REPORT</span><h3 className="review-report-name">{item?.reportName||'Field progress report'}</h3><blockquote>{item?.text}</blockquote><div className="review-evidence-meta"><span><b>Date</b>{item?.date||'—'}</span><span><b>Discipline</b>{item?.discipline||'—'}</span><span><b>Action</b>{item?.action||'Observation'}</span><span><b>Progress</b>{item?.progress!=null?`${item.progress}%`:'—'}</span></div><span className="issue-chip">{item?.issue}</span></div><div className="confidence-ring"><b>{item?.conf || 0}%</b><span>AI confidence</span></div></div>
        <div className="candidate-grid"><div className="candidate selected"><span className="eyebrow">CURRENT CANDIDATE</span><code>{item?.candidate || 'No activity'}</code><strong>{item?.candidate ? (ACTIVITIES.find(a=>a.id===item.candidate)?.desc || `Baseline activity ${item.candidate}`) : 'No matching baseline node'}</strong><p>Match evidence combines terminology, discipline, schedule context, and activity granularity.</p><span className="evidence-score">Evidence alignment · {item?.conf || 0}%</span></div><div className="candidate"><span className="eyebrow">DECISION REQUIRED</span><strong>{item?.candidate?'Confirm or reject':'Create a new activity proposal'}</strong><p>{item?.candidate?'Verify the suggested L5/L6 node against the source statement. Reject it if the suggested activity is not the correct match.':'Do not silently drop unmatched work. Flag it for planner review and baseline control.'}</p></div></div>
        <div className="review-actions"><button className="primary-btn" onClick={onApprove}>Confirm match &amp; apply →</button><button className="danger-btn" onClick={onReject}>Reject</button><button className="danger-btn" onClick={onFlag}>Flag as new activity</button></div><p className="helper">Applying writes the verified actual progress and creates an append-only trace record.</p>
      </main>
    </div>
  </PageSection></div>
}

function Memory(){
  const {MEMORY_ACTIVITIES}=useRuntimeData();
  const [selectedType,setSelectedType]=useState<string|null>(null);
  const [selectedOccurrence,setSelectedOccurrence]=useState<any|null>(null);
  const selected=MEMORY_ACTIVITIES.find(m=>m.type===selectedType) || null;

  const downloadTextFile=(content:string,filename:string,mime:string)=>{
    const blob=new Blob([content],{type:mime});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a'); link.href=url; link.download=filename; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),0);
  };

  const exportKnowledge=()=>{
    const headers=['Activity Type','Baseline Average','Actual Average','Drift','Occurrences','Evidence'];
    const csv=[headers.join(','),...MEMORY_ACTIVITIES.map(m=>[m.type,m.baselineAvg,m.actualAvg,m.variance,m.occurrences,'Traceable'].map(v=>`\"${String(v??'').replace(/\"/g,'\"\"')}\"`).join(','))].join('\n');
    downloadTextFile(csv,'synchronex-knowledge-export.csv','text/csv;charset=utf-8');
  };

  const downloadOccurrencePdf=(selected:any,occurrence:any)=>{
    const escapePdf=(value:string)=>String(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
    const raw=[
      'SYNCHRONEX - OCCURRENCE EVIDENCE',
      `Occurrence: ${occurrence.id}`,
      `Activity type: ${selected.type}`,
      `Date: ${occurrence.date}`,
      `Actual duration: ${occurrence.duration}`,
      `Discipline: ${occurrence.discipline}`,
      `Uploaded on: ${occurrence.date}`,
      `Uploaded by: Synchronex validated execution history`,
      `Source: Persisted execution event`,
      '',
      'Execution evidence:',
      occurrence.evidence,
      '',
      'Status: Validated',
      'Institutional memory: Linked',
    ];
    const lines:string[]=[];
    raw.forEach(line=>{
      const words=String(line).split(' '); let current='';
      words.forEach(word=>{
        const next=current?`${current} ${word}`:word;
        if(next.length>88){lines.push(current); current=word;} else current=next;
      });
      lines.push(current);
    });
    const pageLines=48, pages=[] as string[][];
    for(let i=0;i<lines.length;i+=pageLines) pages.push(lines.slice(i,i+pageLines));
    const objects:string[]=[];
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    const pageIds:number[]=[]; const contentIds:number[]=[];
    let nextId=3;
    pages.forEach(()=>{pageIds.push(nextId++);contentIds.push(nextId++);});
    objects[1]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
    pages.forEach((page,i)=>{
      const commands=['BT','/F1 11 Tf','50 760 Td','14 TL'];
      page.forEach((line,j)=>{
        if(j===0 && i===0) commands.push('/F1 15 Tf');
        commands.push(`(${escapePdf(line)}) Tj`);
        if(j===0 && i===0) commands.push('/F1 11 Tf');
        if(j<page.length-1) commands.push('T*');
      });
      commands.push('ET');
      const stream=commands.join('\n');
      objects[pageIds[i]-1]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${3+pages.length*2} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;
      objects[contentIds[i]-1]=`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });
    const fontId=3+pages.length*2; objects[fontId-1]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    let pdf='%PDF-1.4\n'; const offsets=[0];
    objects.forEach((obj,idx)=>{const id=idx+1; offsets[id]=pdf.length; pdf+=`${id} 0 obj\n${obj}\nendobj\n`;});
    const xref=pdf.length; pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
    for(let i=1;i<=objects.length;i++) pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
    pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    downloadTextFile(pdf,`synchronex-occurrence-${occurrence.id}.pdf`,'application/pdf');
  };


  const {MEMORY_OCCURRENCES}=useRuntimeData();
  const occurrenceData: Record<string, any[]> = Object.fromEntries(MEMORY_ACTIVITIES.map(m=>[m.type,MEMORY_OCCURRENCES.filter(o=>o.discipline===m.type)]));

  if(selected){
    const occurrences=occurrenceData[selected.type] || [];
    const exportOccurrences=()=>{
      const headers=['Occurrence','Date','Duration','Discipline','Execution Evidence','Status'];
      const csv=[headers.join(','),...occurrences.map(o=>[o.id,o.date,o.duration,o.discipline,o.evidence,o.status].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))].join('\n');
      downloadTextFile(csv,`synchronex-${selected.type.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-occurrences.csv`,'text/csv;charset=utf-8');
    };
    return <PageSection title={selected.type} action={<div style={{display:'flex',gap:10}}><button className="outline-btn" onClick={exportOccurrences}>Export occurrences ↓</button><button className="outline-btn" onClick={()=>setSelectedType(null)}>← Back to Memory</button></div>}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:20,marginBottom:22}}>
        <p className="lead" style={{margin:0}}>Validated execution occurrences retained as reusable evidence for future planning.</p>
      </div>
      <div className="memory-table">
        <table>
          <thead><tr><th>Occurrence</th><th>Date</th><th>Duration</th><th>Discipline</th><th>Execution evidence</th><th>Status</th></tr></thead>
          <tbody>{occurrences.map(o=><tr key={o.id} className="memory-occurrence-row" onClick={()=>setSelectedOccurrence(o)} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setSelectedOccurrence(o)}}>
            <td><code>{o.id}</code></td><td>{o.date}</td><td>{o.duration}</td><td>{o.discipline}</td><td style={{maxWidth:420}}>{o.evidence}</td><td><span className="trace-chip">{o.status}</span></td>
          </tr>)}</tbody>
        </table>
      </div>
      {selectedOccurrence&&<div className="memory-occurrence-overlay" role="dialog" aria-modal="true" aria-labelledby="occurrence-detail-title" onMouseDown={e=>{if(e.currentTarget===e.target)setSelectedOccurrence(null)}}>
        <div className="memory-occurrence-card">
          <div className="memory-occurrence-head">
            <div><h2 id="occurrence-detail-title">{selectedOccurrence.id}</h2><p>{selected.type} · {selectedOccurrence.discipline}</p></div>
            <button className="icon-btn memory-occurrence-close" aria-label="Close occurrence details" onClick={()=>setSelectedOccurrence(null)}>×</button>
          </div>
          <div className="memory-occurrence-grid">
            <div><span>OCCURRENCE DATE</span><b>{selectedOccurrence.date}</b></div>
            <div><span>ACTUAL DURATION</span><b>{selectedOccurrence.duration}</b></div>
            <div><span>DISCIPLINE</span><b>{selectedOccurrence.discipline}</b></div>
            <div><span>ACTIVITY TYPE</span><b>{selected.type}</b></div>
            <div><span>UPLOADED ON</span><b>{selectedOccurrence.date}</b></div>
            <div><span>UPLOADED BY</span><b>Synchronex validated execution history</b></div>
            <div className="wide"><span>SOURCE</span><b>Persisted execution event</b></div>
            <div className="wide"><span>EXECUTION EVIDENCE</span><p>{selectedOccurrence.evidence}</p></div>
          </div>
          <div className="memory-occurrence-footer"><button className="outline-btn" onClick={()=>setSelectedOccurrence(null)}>← Back to occurrences</button><button className="primary-btn" onClick={()=>downloadOccurrencePdf(selected,selectedOccurrence)}>Download as PDF ↓</button></div>
        </div>
      </div>}
    </PageSection>;
  }

  return <div className="memory-overview"><PageSection title="Memory" action={<button className="outline-btn" onClick={exportKnowledge}>Export knowledge ↓</button>}>
    {MEMORY_ACTIVITIES.length ? <div className="memory-table"><table><thead><tr><th>Activity type</th><th>Baseline avg</th><th>Actual avg</th><th>Drift</th><th>Occurrences</th><th>Evidence</th></tr></thead><tbody>{MEMORY_ACTIVITIES.map(m=><tr key={m.type} onClick={()=>setSelectedType(m.type)} style={{cursor:'pointer'}} title="View occurrence details">
      <td><strong>{m.type}</strong><div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'#94A3B8',marginTop:3}}>View occurrence details →</div></td><td>{m.baselineAvg}</td><td>{m.actualAvg}</td><td className="negative">{m.variance}</td><td>{m.occurrences}</td><td><span className="trace-chip">Traceable</span></td>
    </tr>)}</tbody></table></div> : <div className="screen-empty-state"><strong>No validated execution memory so far</strong><span>Reusable memory will appear after reviewed execution events produce validated historical evidence.</span></div>}
  </PageSection></div>;
}

function Trace(){
  const {AUDIT_TRAIL}=useRuntimeData();
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
    {actors.length ? <div className="trace-actor-grid trace-actor-grid-only">{actors.map(actor=>{const meta=actorMeta[actor]||{label:actor,description:'Recorded provenance events.',glyph:actor.slice(0,2).toUpperCase()}; const rows=actorUpdates(actor); return <div key={actor} className="trace-actor-card" onClick={()=>setSelectedActor(actor)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setSelectedActor(actor)}}>
      <div className="trace-actor-card-top"><div className="trace-actor-mark">{meta.glyph}</div><span className="trace-actor-count">{rows.length} updates</span></div>
      <strong>{meta.label}</strong><p>{meta.description}</p>
      <div className="trace-stage-list" aria-label={`${meta.label} trace stages`}>
        <span><i>01</i> Capture</span><span><i>02</i> Process</span><span><i>03</i> Record</span>
      </div>
      <span className="trace-actor-open">View {meta.label} updates →</span>
    </div>})}</div> : <div className="screen-empty-state"><strong>No trace updates so far</strong><span>Accepted changes and other provenance events will appear here after validated execution activity is recorded.</span></div>}
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
  const supported='.pod,.mpp,.xml,.xer,.mspdi';
  const addFiles=(incoming:FileList|null)=>{
    if(!incoming) return;
    const file=Array.from(incoming).find(candidate=>/\.(pod|mpp|xml|xer|mspdi)$/i.test(candidate.name));
    if(!file){setFiles([]);return;}
    setFiles([file]);
  };
  const removeFile=(index:number)=>setFiles(files.filter((_,i)=>i!==index));
  return <div className="import-page">
    <PageSection title="Import center">
      <div className="import-purpose import-purpose-clean"><div><span className="eyebrow">MULTI-SOURCE SCHEDULE INTAKE</span><h3>Send the original project schedule directly through Synchronex.</h3><p>Upload the original planning file. Synchronex parses it itself, normalizes the schedule, validates it, and writes the parsed records directly to Supabase. No JSON, CSV, Excel, or generated SQL import file is required.</p></div><div className="import-supported-inline"><span>INPUT</span><b>ProjectLibre · Microsoft Project · Primavera</b></div></div>
      <article className="import-choice import-choice-single">
        <div className="import-choice-top"><div><span className="import-choice-icon">▤</span></div><span className="trace-chip">SCHEDULE</span></div>
        <span className="eyebrow">01 / SCHEDULE IMPORT</span>
        <h3>Upload project schedules</h3>
        <p>Upload the original schedule. Synchronex supports ProjectLibre (.pod), Microsoft Project (.mpp/.xml), and Primavera P6 (.xer).</p>
        <div className="import-format-list"><span>ProjectLibre · .pod</span><span>Microsoft Project · .mpp/.xml</span><span>Primavera P6 · .xer</span><span>Persisted only after manager upload</span></div>
        <input ref={inputRef} className="file-input-hidden" type="file" accept={supported} onChange={e=>{addFiles(e.target.files);e.currentTarget.value='';}} aria-label="Select schedule files" />
        <div className={`import-drop-zone import-drop-zone-large ${dragOver?'dragging':''}`} role="button" tabIndex={0} onClick={()=>inputRef.current?.click()} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')inputRef.current?.click()}} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);addFiles(e.dataTransfer.files)}}>
          <span className="import-drop-icon">↑</span><strong>{files.length?'ProjectLibre .pod selected':'Drop a project schedule file here'}</strong><span>Drag and drop the original schedule or browse from your computer.</span><small>Accepted: .pod · .mpp · .xml · .xer</small>
        </div>
        {files.length>0&&<div className="import-file-list">{files.map((file,i)=><div className="import-file-row" key={`${file.name}-${file.lastModified}`}><div><strong>{file.name}</strong><span>{file.type||'Schedule file'} · {(file.size/1024/1024).toFixed(2)} MB</span></div><button type="button" className="icon-btn" aria-label={`Remove ${file.name}`} onClick={()=>removeFile(i)}>×</button></div>)}</div>}
        <div className="import-actions import-actions-submit"><button className="primary-btn" disabled={!files.length||state==='processing'} onClick={onProcess}>{state==='processing'?'Parsing schedule and writing data…':state==='success'?'Import another schedule':'Submit schedule to Synchronex'} <span>→</span></button></div>
      </article>
      {(state!=='idle'||files.length>0) && <div className={`import-status-banner ${state}`} role="status"><div><span className="eyebrow">IMPORT STATUS</span><strong>{state==='processing'?'Synchronex is reading the POD…':state==='success'?'Schedule imported into Synchronex':state==='error'?'POD import needs attention':'Ready to import'}</strong><p>{files.length?`${files[0].name} · parsed by Synchronex after upload · schedule records persisted` :'Select a supported schedule file to begin.'}</p></div><div className="import-status-actions">{state==='processing'&&<span className="import-status-chip">Processing</span>}{state==='success'&&<><span className="import-status-chip success">Complete</span><button className="text-action" onClick={onOpenReview}>Open review →</button></>}{state==='error'&&<button className="outline-btn" onClick={onRetry}>Retry</button>}</div></div>}
    </PageSection>
  </div>
}
function FieldHome({onGo}:{onGo:(s:Screen)=>void}){
  const {PROGRESS_TREND,FIELD_EVENTS,REVIEW_QUEUE}=useRuntimeData();
  const trend=PROGRESS_TREND;
  const width=760,height=250,left=42,right=18,top=20,bottom=42;
  const x=(i:number)=>left+(i/Math.max(1,trend.length-1))*(width-left-right);
  const y=(v:number)=>top+(100-v)/100*(height-top-bottom);
  const plannedPoints=trend.map((d,i)=>`${x(i)},${y(d.planned)}`).join(' '); const actualPoints=trend.map((d,i)=>`${x(i)},${y(d.actual)}`).join(' ');
  const accepted=FIELD_EVENTS.filter(e=>e.status==='AI MATCHED').length; const pending=REVIEW_QUEUE.length;
  return <div className="field-page field-home-page"><PageSection label="FIELD / TODAY" title="Field home" action={<button className="primary-btn" onClick={()=>onGo('capture')}>Report progress →</button>}>
    <div className="field-summary-grid"><div className="field-summary field-summary-work"><div><span className="eyebrow">FIELD UPDATES AVAILABLE</span><strong>{FIELD_EVENTS.length}</strong><small>Persisted execution events</small></div><span className="summary-status">{accepted?'MATCHED':'NO DATA'}</span></div><div className="field-summary field-summary-submissions"><div><span className="eyebrow">PENDING SUBMISSIONS</span><strong>{pending}</strong><small>Events requiring planner review</small></div><span className="summary-status amber">{pending?'IN REVIEW':'CLEAR'}</span></div></div>
    <div className="field-home-grid field-home-grid-enhanced"><div className="field-panel field-trajectory-panel"><div className="panel-heading"><div><span className="eyebrow">PROJECT TRAJECTORY</span><h3>How progress is moving</h3><p className="panel-subtitle">Planned progress compared with verified project actuals.</p></div><span className="trajectory-delta">{trend.length?`${trend[trend.length-1].actual}% actual`:'No validated actuals'}</span></div><div className="field-chart-wrap">
      {trend.length?<><svg className="field-trajectory-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Project planned versus actual progress trajectory">{[0,25,50,75,100].map(v=><g key={v}><line x1={left} x2={width-right} y1={y(v)} y2={y(v)} className="chart-grid-line"/><text x={left-10} y={y(v)+4} textAnchor="end" className="chart-axis-label">{v}%</text></g>)}<polyline points={plannedPoints} className="trajectory-line planned"/><polyline points={actualPoints} className="trajectory-line actual"/>{trend.map((d,i)=><g key={d.date}><circle cx={x(i)} cy={y(d.actual)} r="3.5" className="trajectory-dot actual"/><text x={x(i)} y={height-15} textAnchor="middle" className="chart-date-label">{d.date}</text></g>)}</svg><div className="trajectory-legend"><span><i className="legend-line planned"/>Planned</span><span><i className="legend-line actual"/>Actual</span></div></>:<div className="empty-state">No validated execution history is available yet. Capture and approve field evidence to build the trajectory.</div>}
    </div></div><div className="field-panel field-submissions-panel"><div className="panel-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h3>Execution submissions</h3><p className="panel-subtitle">Latest persisted field evidence and its current review state.</p></div></div>{FIELD_EVENTS.slice(0,3).map((e:any,i:number)=><div className="submission-mini" key={`${e.time}-${i}`}><span className={`submission-state ${e.status==='AI MATCHED'?'accepted':'review'}`}>{e.status==='AI MATCHED'?'Matched':'Under review'}</span><strong>{e.actDesc}</strong><small>{e.time} · {e.conf}% match confidence</small></div>)}{!FIELD_EVENTS.length&&<div className="empty-state">No field submissions have been persisted yet.</div>}<button className="outline-btn full" onClick={()=>onGo('submissions')}>Open submissions →</button></div></div><div className="field-home-footer-space" aria-hidden="true"/></PageSection></div>
}

function Submissions({onCapture}:{onCapture:()=>void}){
  const {FIELD_EVENTS}=useRuntimeData();
  const submissions=FIELD_EVENTS.map((e:any,i:number)=>({status:e.status==='AI MATCHED'?'Matched':'Under review',cls:e.status==='AI MATCHED'?'accepted':'review',title:e.actDesc||'Unmatched execution event',meta:`${e.time} · ${e.conf}% match confidence`}));
  return <div className="field-page"><PageSection label="FIELD / SUBMISSIONS" title="My submissions" action={<button className="primary-btn" onClick={onCapture}>New report →</button>}><div className="field-submissions-list">{submissions.map((s:any,i:number)=><div className="submission-card" key={`${s.title}-${i}`}><div><span className={`submission-state ${s.cls}`}>{s.status}</span><strong>{s.title}</strong><small>{s.meta}</small></div><span className="submission-arrow">→</span></div>)}{!submissions.length&&<div className="empty-state">No persisted submissions yet.</div>}</div></PageSection></div>
}

function FieldProfile({onSignOut}:{onSignOut:()=>void}){
  return <div className="field-page"><PageSection label="FIELD / ACCOUNT" title="My profile"><div className="field-profile-card"><div className="profile-avatar">FS</div><div><span className="eyebrow">FIELD SUPERVISOR</span><h3>Field account</h3><p>Project context is loaded from the active Synchronex workspace.</p></div><div className="profile-actions"><button className="danger-btn" onClick={onSignOut}>Sign out</button></div></div></PageSection></div>
}
function Analytics(){
  const {PROGRESS_TREND,DISCIPLINE_PERF,DELAY_CAUSES,REVIEW_QUEUE}=useRuntimeData();
  const trend=PROGRESS_TREND;
  const width=860,height=280,left=52,right=20,top=18,bottom=34;
  const x=(i:number)=>left+(i/Math.max(1,trend.length-1))*(width-left-right);
  const y=(v:number)=>top+(100-v)/100*(height-top-bottom);
  const planned=trend.map((d,i)=>`${x(i)},${y(d.planned)}`).join(' ');
  const actual=trend.map((d,i)=>`${x(i)},${y(d.actual)}`).join(' ');
  return <div className="analytics-page">
    <PageSection label="ANALYTICS / PROJECT PERFORMANCE" title="Project analytics">
      <div className="analytics-summary-grid">
        <div className="analytics-kpi"><span className="eyebrow">ACTUAL PROGRESS</span><strong>{trend.length?`${trend[trend.length-1].actual}%`:'—'}</strong><small>Verified execution progress across the project</small></div>
        <div className="analytics-kpi"><span className="eyebrow">PLAN TRAJECTORY</span><strong>{trend.length?`${trend[trend.length-1].planned}%`:'—'}</strong><small>Current planned project progress</small></div>
        <div className="analytics-kpi"><span className="eyebrow">REVIEW WORKLOAD</span><strong>{REVIEW_QUEUE.length}</strong><small>Ambiguous events awaiting planner action</small></div>
        <div className="analytics-kpi"><span className="eyebrow">UNMATCHED</span><strong>{REVIEW_QUEUE.filter((r:any)=>r.status==='Unmatched').length}</strong><small>Explicit new-activity proposals</small></div>
      </div>
      <div className="analytics-grid-two">
        <article className="analytics-panel analytics-trajectory-panel">
          <div className="analytics-panel-head"><div><span className="eyebrow">PROGRESS TRAJECTORY</span><h3>Planned vs actual</h3></div><span className="trace-chip">{trend.length?`${trend[trend.length-1].actual}% actual`:'No validated actuals'}</span></div>
          {trend.length ? <><div className="analytics-chart">
            <div className="analytics-ylabels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
            <div className="analytics-plot">
              <div className="analytics-gridlines"><i/><i/><i/><i/><i/></div>
              <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="Planned versus actual project progress"><polyline points={planned} fill="none" stroke="var(--info)" strokeWidth="3" strokeDasharray="8 7"/><polyline points={actual} fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>{trend.map((d,i)=><circle key={i} cx={x(i)} cy={y(d.actual)} r="4" fill="var(--surface)" stroke="var(--accent)" strokeWidth="3"/>)}</svg>
              <div className="analytics-xlabels">{trend.map(d=><span key={d.date}>{d.date}</span>)}</div>
            </div>
          </div><div className="analytics-legend"><span><i className="legend-line actual-line"/>Actual</span><span><i className="legend-line planned-line"/>Planned</span></div></> : <div className="analytics-chart-empty"><strong>No progress trajectory so far</strong><span>Planned vs actual history will appear after validated execution progress is recorded.</span></div>}
        </article>
        <article className="analytics-panel">
          <div className="analytics-panel-head"><div><span className="eyebrow">DISCIPLINE PERFORMANCE</span><h3>Workstream output</h3></div></div>
          {DISCIPLINE_PERF.length ? <div className="analytics-bars">{DISCIPLINE_PERF.map(d=><div className="analytics-bar-row" key={d.disc}><div className="analytics-bar-label"><span>{d.disc}</span><b>{d.actual}%</b></div><div className="analytics-bar-track"><i style={{width:`${d.actual}%`}}/><span style={{left:`${d.planned}%`}}/></div><small>plan {d.planned}%</small></div>)}</div> : <div className="analytics-panel-empty"><strong>No workstream output so far</strong><span>Discipline performance will appear after the imported schedule contains validated execution actuals.</span></div>}
        </article>
      </div>
      <article className="analytics-panel">
        <div className="analytics-panel-head"><div><span className="eyebrow">DELAY PATTERNS</span><h3>Primary execution causes</h3></div></div>
        {DELAY_CAUSES.length ? <div className="analytics-bars">{DELAY_CAUSES.map(d=><div className="analytics-bar-row" key={d.cause}><div className="analytics-bar-label"><span>{d.cause}</span><b>{d.pct}%</b></div><div className="analytics-bar-track"><i style={{width:`${d.pct}%`}}/></div></div>)}</div> : <div className="analytics-panel-empty"><strong>No primary execution causes so far</strong><span>No validated delay causes have been recorded yet. Delay patterns will appear after execution evidence identifies a cause.</span></div>}
      </article>
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
    <PageSection title="Team members" action={<button className="primary-btn" onClick={onInvite}>Add member +</button>}>
      <div className="team-table-wrap"><table className="team-table"><thead><tr><th>Member</th><th>Role</th><th>Workspace</th><th>Status</th><th>Access</th></tr></thead><tbody>{members.map(m=><tr key={m.name}><td><span className="member-avatar">{m.initials}</span><strong>{m.name}</strong></td><td>{m.role}</td><td>{m.workspace}</td><td><span className="status-badge track">{m.status}</span></td><td><button className="text-action" onClick={()=>onManage(m)}>Manage →</button></td></tr>)}</tbody></table></div>
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
 <PageSection title="Control when AI may apply changes"><div className="settings-card stacked"><div className="setting-row threshold-setting-row"><div><strong>Auto-apply confidence threshold</strong><p>Events at or above this threshold may be eligible for automatic application if all validation checks pass.</p></div><div className="threshold-control"><input aria-label="Auto apply confidence threshold" type="range" min="80" max="100" value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/><b>{threshold}%</b></div></div><div className="setting-row company-draft-setting"><div><strong>Auto-save drafts</strong><p>Preserve unfinished company form changes locally before submission.</p></div><button className={`toggle ${autoSave?'on':''}`} aria-pressed={autoSave} onClick={()=>setAutoSave(!autoSave)}><span/></button></div><div className="settings-save-row"><button className="primary-btn" onClick={onSave}>Save workspace controls</button>{saved&&<span className="settings-saved-note">Saved to workspace</span>}</div></div></PageSection>

</div>
}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){return <div className="modal-backdrop" onMouseDown={e=>e.currentTarget===e.target&&onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><h2 id="modal-title">{title}</h2><button className="icon-btn" aria-label="Close" onClick={onClose}>×</button></div>{children}</div></div>}
