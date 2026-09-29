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
const apiBase=()=> (() => { const configured = import.meta.env.VITE_API_BASE_URL; const base = configured || (typeof window !== 'undefined' && !['localhost','127.0.0.1'].includes(window.location.hostname) ? '' : 'http://localhost:8000'); const normalized = base.replace(/\/$/,''); return normalized.endsWith('/api') ? normalized.slice(0,-4) : normalized; })();

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
    const rawActivities=payload.activities||[];
    const activities=mapActivities(rawActivities);
    const events=payload.events||[];
    const reviews=payload.reviews||[];
    const matches=payload.matches||[];
    const trace=payload.trace||[];
    const activityByDb=new Map(rawActivities.map((a:any)=>[a.id,a]));
    const byEvent=new Map(events.map((e:any)=>[e.id,e]));
    const matchByEvent=new Map(matches.map((m:any)=>[m.execution_event_id,m]));
    const reviewByEvent=new Map(reviews.map((r:any)=>[r.execution_event_id,r]));
    const fieldEvents=events.map((e:any)=>{
      const match=matchByEvent.get(e.id);
      const aid=match?.activity_id?activityByDb.get(match.activity_id):null;
      const conf=match?.confidence_score ?? e.extraction_confidence ?? 0;
      return {
        time:new Date(e.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
        status:match?.status==='approved'?'APPROVED':match?.status==='rejected'?'REJECTED':'REVIEW REQUIRED',
        text:`\"${e.raw_text||''}\"`,
        actId:aid?.activity_code||'—',
        actDesc:aid?.name||'No matching activity',
        conf:Math.round(Number(conf)*100)
      };
    });
    const reviewQueue=reviews.filter((r:any)=>r.status==='pending').map((r:any)=>{
      const e=byEvent.get(r.execution_event_id);
      const a=r.suggested_activity_id?activityByDb.get(r.suggested_activity_id):null;
      return {
        id:r.id,
        text:`\"${e?.raw_text||'Execution event'}\"`,
        candidate:a?.activity_code||'—',
        conf:Math.round(Number(r.confidence_score||0)*100),
        issue:r.reason||'Review required',
        status:a?'Review':'Unmatched'
      };
    });
    const audit=trace.map((t:any)=>{
      const a=t.entity_id?activityByDb.get(t.entity_id):null;
      return {
        ts:new Date(t.created_at).toLocaleString(),
        actor:t.user_id||'System',
        action:t.action,
        activity:a?.activity_code||'—',
        source:t.source||'—',
        prev:t.old_value?JSON.stringify(t.old_value):'—',
        next:t.new_value?JSON.stringify(t.new_value):'—',
        conf:typeof t.new_value?.confidence==='number'?Math.round(t.new_value.confidence*100):0
      };
    });
    const memoryOccurrences=activities.filter(a=>a.actStart!=='—'&&a.actFinish!=='—').map(a=>({id:a.id,date:a.actFinish,duration:a.actStart&&a.actFinish?`${Math.max(0,Math.round((new Date(a.actFinish).getTime()-new Date(a.actStart).getTime())/86400000))} days`:'—',discipline:a.discipline,evidence:`Validated actual dates for ${a.desc}.`,status:'Validated'}));
    const memory=memoryOccurrences.length?Array.from(new Map(memoryOccurrences.map(o=>[o.discipline||'Unassigned',o])).entries()).map(([type,o])=>({type,baselineAvg:'—',actualAvg:o.duration,variance:'—',occurrences:memoryOccurrences.filter(x=>x.discipline===type).length})):[];
    snapshot={project,settings:payload.settings||null,ACTIVITIES:activities,DISCIPLINES:buildDisciplines(activities,events),FIELD_EVENTS:fieldEvents,REVIEW_QUEUE:reviewQueue,AUDIT_TRAIL:audit,MEMORY_ACTIVITIES:memory,MEMORY_OCCURRENCES:memoryOccurrences,PROGRESS_TREND:[],DELAY_CAUSES:[],DISCIPLINE_PERF:[],loading:false,error:''}; emit();
    return project.id;
  }catch(err){snapshot={...snapshot,loading:false,error:err instanceof Error?err.message:'Unable to load backend data.'};emit();throw err;}
}
