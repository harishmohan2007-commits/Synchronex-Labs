import { useSyncExternalStore } from 'react';

type RuntimeData={
  project:any|null;
  ACTIVITIES:any[];
  DISCIPLINES:any[];
  FIELD_EVENTS:any[];
  REVIEW_QUEUE:any[];
  AUDIT_TRAIL:any[];
  MEMORY_ACTIVITIES:any[];
  PROGRESS_TREND:any[];
  DELAY_CAUSES:any[];
  DISCIPLINE_PERF:any[];
  MEMORY_OCCURRENCES:any[];
  settings:any|null;
  loading:boolean;
  error:string;
};
const empty:RuntimeData={project:null,ACTIVITIES:[],DISCIPLINES:[],FIELD_EVENTS:[],REVIEW_QUEUE:[],AUDIT_TRAIL:[],MEMORY_ACTIVITIES:[],PROGRESS_TREND:[],DELAY_CAUSES:[],DISCIPLINE_PERF:[],MEMORY_OCCURRENCES:[],settings:null,loading:true,error:''};
let snapshot=empty;
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(l=>l());
export function useRuntimeData(){return useSyncExternalStore(cb=>{listeners.add(cb);return()=>listeners.delete(cb)},()=>snapshot,()=>snapshot);}
const apiBase=()=> (import.meta.env.VITE_API_BASE_URL||'https://synchronex-api.onrender.com').replace(/\/$/,'');

function mapActivities(rows:any[]){return rows.map(a=>({
  id:a.activity_code, dbId:a.id, wbs:a.outline_number||'—', desc:a.name, discipline:a.discipline||'—',
  planStart:a.planned_start||'—', planFinish:a.planned_finish||'—', actStart:a.actual_start||'—', actFinish:a.actual_finish||'—',
  progress:a.actual_progress ?? 0, plannedProgress:a.planned_progress ?? null,
  status:a.status==='completed'?'Completed':a.status==='in_progress'?'In Progress':'Planned',
  aiConf:0, isSummary:!!a.is_summary, isMilestone:!!a.is_milestone
}));}
function buildDisciplines(activities:any[],events:any[]){
  const names=Array.from(new Set(activities.map(a=>a.discipline).filter((x:any)=>x&&x!=='—')));
  return names.map(name=>{const rows=activities.filter(a=>a.discipline===name);const planned=rows.length?Math.round(rows.reduce((s,a)=>s+(a.plannedProgress??0),0)/rows.length):0;const actual=rows.length?Math.round(rows.reduce((s,a)=>s+(a.progress??0),0)/rows.length):0;return {name,activities:rows.length,planned,actual,variance:actual-planned,status:actual<planned?'At Risk':'On Track',milestones:rows.filter(a=>a.isMilestone).length,nextMilestone:'—',varianceNote:events.length?'Derived from persisted execution evidence.':'No execution evidence available.'};});
}
export async function refreshRuntimeData(projectId?:string){
  snapshot={...snapshot,loading:true,error:''}; emit();
  try{
    const p=await fetch(`${apiBase()}/api/projects/current${projectId?`?project_id=${encodeURIComponent(projectId)}`:''}`);
    const project=await p.json(); if(!p.ok) throw new Error(project?.detail||'Unable to load the current project.');
    const b=await fetch(`${apiBase()}/api/projects/${project.id}/bootstrap`); const payload=await b.json(); if(!b.ok) throw new Error(payload?.detail||'Unable to load project data.');
    const activities=mapActivities(payload.activities||[]); const events=payload.events||[]; const reviews=payload.reviews||[]; const trace=payload.trace||[];
    const activityByDb=new Map((payload.activities||[]).map((a:any)=>[a.id,a]));
    const byEvent=new Map(events.map((e:any)=>[e.id,e]));
    const matches=payload.matches||[];
    const matchByEvent=new Map<string,any>();
    matches.forEach((m:any)=>{const current=matchByEvent.get(m.execution_event_id); if(!current || Number(m.confidence_score||0)>Number(current.confidence_score||0)) matchByEvent.set(m.execution_event_id,m);});
    const fieldEvents=events.map((e:any)=>{const match=matchByEvent.get(e.id); const aid=match?.activity_id?activityByDb.get(match.activity_id):null; return {time:new Date(e.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),status:match?.status==='approved'?'AI MATCHED':'REVIEW REQUIRED',text:`"${e.raw_text||''}"`,actId:aid?.activity_code||'—',actDesc:aid?.name||'No matching activity',conf:Math.round(Number(match?.confidence_score||e.extraction_confidence||0)*100)};});
    const reviewQueue=reviews.filter((r:any)=>r.status==='pending').map((r:any)=>{const e=byEvent.get(r.execution_event_id);const a=r.suggested_activity_id?activityByDb.get(r.suggested_activity_id):null;return {id:r.id,text:`"${e?.raw_text||'Execution event'}"`,candidate:a?.activity_code||'—',conf:Math.round(Number(r.confidence_score||0)*100),issue:r.reason||'Review required',status:r.suggested_activity_id?'Review':'Unmatched'};});
    const audit=trace.map((t:any)=>{const entityId=t.entity_id; const a=entityId?activityByDb.get(entityId):null; return {ts:new Date(t.created_at).toLocaleString(),actor:t.source==='human_review'?'Planner':t.source==='field_capture'?'AI':'System',action:t.action,activity:a?.activity_code||'—',source:t.source||'—',prev:t.old_value?JSON.stringify(t.old_value):'—',next:t.new_value?JSON.stringify(t.new_value):'—',conf:Math.round(Number(t.new_value?.confidence||0)*100)};});
    const memoryOccurrences=activities.filter(a=>a.actStart!=='—'&&a.actFinish!=='—').map(a=>({id:a.id,date:a.actFinish,duration:a.actStart&&a.actFinish?`${Math.max(0,Math.round((new Date(a.actFinish).getTime()-new Date(a.actStart).getTime())/86400000))} days`:'—',discipline:a.discipline,evidence:`Validated actual dates for ${a.desc}.`,status:'Validated'}));
    const memory=memoryOccurrences.length?Array.from(new Map(memoryOccurrences.map(o=>[o.discipline||'Unassigned',o])).entries()).map(([type,o])=>({type,baselineAvg:'—',actualAvg:o.duration,variance:'—',occurrences:memoryOccurrences.filter(x=>x.discipline===type).length})):[];
    snapshot={project,settings:payload.settings||null,ACTIVITIES:activities,DISCIPLINES:buildDisciplines(activities,events),FIELD_EVENTS:fieldEvents,REVIEW_QUEUE:reviewQueue,AUDIT_TRAIL:audit,MEMORY_ACTIVITIES:memory,MEMORY_OCCURRENCES:memoryOccurrences,PROGRESS_TREND:[],DELAY_CAUSES:[],DISCIPLINE_PERF:[],loading:false,error:''}; emit();
    return project.id;
  }catch(err){snapshot={...snapshot,loading:false,error:err instanceof Error?err.message:'Unable to load backend data.'};emit();throw err;}
}
