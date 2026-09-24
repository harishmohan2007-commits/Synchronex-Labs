import React, { useMemo, useState } from 'react';
import { ACTIVITIES, DISCIPLINES, FIELD_EVENTS, REVIEW_QUEUE, DELAY_CAUSES, MEMORY_ACTIVITIES } from './data';

type View = 'command' | 'schedule' | 'capture' | 'review' | 'memory' | 'audit';

const icons: Record<string, React.ReactNode> = {
  command: <span>⌂</span>, schedule: <span>◫</span>, capture: <span>⌁</span>, review: <span>!</span>, memory: <span>◌</span>, audit: <span>↳</span>,
};

function App() {
  const [view, setView] = useState<View>('command');
  const [query, setQuery] = useState('');
  const [fieldText, setFieldText] = useState('Piping team completed erection of Line 24 spool section A today. Line 25 erection started at 09:30. Foundation Block A concrete work reached approximately 70%.');
  const [processed, setProcessed] = useState(false);
  const [reviewCount, setReviewCount] = useState(12);
  const [selected, setSelected] = useState('PIP-245');
  const [toast, setToast] = useState('');

  const filteredActivities = useMemo(() => ACTIVITIES.filter(a => `${a.id} ${a.desc} ${a.discipline}`.toLowerCase().includes(query.toLowerCase())), [query]);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2400); };

  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="brand-lockup"><div className="brand-mark">S</div><div><strong>SYNCHRONEX</strong><small>execution intelligence</small></div></div>
        <div className="project-strip"><span className="eyebrow">ACTIVE PROJECT</span><strong>North Field Gas Processing / Phase 1</strong><span className="status-dot"/> <span>EXECUTION</span><span className="divider"/><span className="mono">NGFPF-P1-2026</span></div>
        <div className="mast-actions"><button onClick={() => notify('No new critical notifications')}>●</button><button onClick={() => notify('Command palette ready')}>?</button><div className="avatar">PC</div></div>
      </header>

      <div className="workspace">
        <aside className="project-spine">
          <div className="spine-label">PROJECT SPINE</div>
          {(['command','schedule','capture','review','memory','audit'] as View[]).map((item, i) => (
            <button key={item} className={`spine-item ${view === item ? 'active' : ''}`} onClick={() => setView(item)}>
              <span className="spine-index">0{i + 1}</span><span className="spine-icon">{icons[item]}</span><span>{({command:'Command',schedule:'Schedule',capture:'Capture',review:'Review',memory:'Memory',audit:'Trace'} as Record<View,string>)[item]}</span>{item === 'review' && <b>{reviewCount}</b>}
            </button>
          ))}
          <div className="spine-bottom"><span className="eyebrow">BASELINE</span><strong>REV 04</strong><span>synced 09:42</span></div>
        </aside>

        <main className="canvas">
          <div className="canvas-head">
            <div><div className="breadcrumb">SYNCHRONEX / {view.toUpperCase()}</div><h1>{view === 'command' ? 'Execution command' : view === 'schedule' ? 'Schedule lattice' : view === 'capture' ? 'Field capture' : view === 'review' ? 'Human review' : view === 'memory' ? 'Institutional memory' : 'Trace ledger'}</h1><p>{view === 'command' ? 'The planning-to-execution bridge, read from the work actually happening.' : 'A live operational surface for the planning-to-execution bridge.'}</p></div>
            <div className="head-tools"><label className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find activity, report or WBS node" /></label><button className="quiet" onClick={() => notify('Baseline is current')}>Baseline <b>04</b></button></div>
          </div>

          {view === 'command' && <CommandView selected={selected} setSelected={setSelected} onCapture={() => setView('capture')} onReview={() => setView('review')} />}
          {view === 'schedule' && <ScheduleView activities={filteredActivities} selected={selected} setSelected={setSelected} />}
          {view === 'capture' && <CaptureView text={fieldText} setText={setFieldText} processed={processed} onProcess={() => {setProcessed(true); notify('Three execution events extracted');}} />}
          {view === 'review' && <ReviewView count={reviewCount} onApprove={() => {setReviewCount(Math.max(0, reviewCount - 1)); notify('Match approved and trace recorded');}} />}
          {view === 'memory' && <MemoryView />}
          {view === 'audit' && <AuditView />}
        </main>
      </div>
      {toast && <div className="toast-line"><span>✓</span>{toast}</div>}
    </div>
  );
}

function CommandView({selected,setSelected,onCapture,onReview}:{selected:string,setSelected:(x:string)=>void,onCapture:()=>void,onReview:()=>void}) {
  return <>
    <section className="signal-row">
      <Signal label="ACTIVITIES" value="246" note="L5 / L6 executable" />
      <Signal label="ACTUAL" value="52.3%" note="+4.7 pts behind plan" accent="blue" />
      <Signal label="FIELD EVENTS" value="247" note="30 day window" />
      <Signal label="REVIEW" value="12" note="planner attention" accent="amber" />
      <div className="signal-action"><button className="primary" onClick={onCapture}>+ Capture field update</button><button className="secondary" onClick={onReview}>Open review queue</button></div>
    </section>
    <section className="command-grid">
      <div className="execution-map panel-line">
        <div className="section-kicker">01 / EXECUTION MAP</div>
        <div className="map-head"><div><h2>Where the plan meets the field</h2><p>Six disciplines · 246 executable activities</p></div><span className="legend"><i className="planned"/> plan <i className="actual"/> actual</span></div>
        <div className="axis"><span>01 SEP</span><span>10</span><span>20</span><span>30 SEP</span></div>
        {DISCIPLINES.map((d, idx) => <div className="discipline-line" key={d.name}><div className="disc-name"><span>{String(idx+1).padStart(2,'0')}</span>{d.name}</div><div className="track"><i style={{width:`${d.planned}%`}}/><b style={{width:`${d.actual}%`}}/></div><div className={`variance ${d.variance < 0 ? 'negative':''}`}>{d.variance > 0 ? '+' : ''}{d.variance}%</div></div>)}
        <div className="forecast-band"><span>PLANNED COMPLETION <b>30 SEP 2026</b></span><span>PROJECTED <b>03 OCT 2026</b></span><span>DRIFT <b className="red">+3 DAYS</b></span></div>
      </div>
      <div className="focus panel-line">
        <div className="section-kicker">02 / LIVE FOCUS</div>
        <div className="focus-code">{selected}</div><h2>Erect Line 24-XX</h2><div className="focus-meta">L5 · PIPING · IN PROGRESS</div>
        <div className="focus-progress"><div style={{width:'70%'}}/></div><div className="focus-percent">70%</div>
        <div className="event-stack">{FIELD_EVENTS.slice(0,3).map(e => <div className="event" key={e.time}><span>{e.time}</span><p>{e.text}<small>{e.actId} · {e.actDesc}</small></p><b>{e.conf}%</b></div>)}</div>
        <button className="text-action">Open activity trace →</button>
      </div>
    </section>
    <section className="lower-grid">
      <div className="panel-line feed"><div className="section-kicker">03 / FIELD SIGNALS</div><h2>Recent execution language</h2>{FIELD_EVENTS.map((e,i)=><div className="signal-event" key={e.time}><span className="time">{e.time}</span><span className={`event-tag ${e.status.includes('REVIEW')?'amber':''}`}>{e.status}</span><em>{e.text}</em><strong>{e.conf ? `${e.conf}%` : '—'}</strong></div>)}</div>
      <div className="panel-line bridge"><div className="section-kicker">04 / BRIDGE STATE</div><h2>From words to schedule</h2><div className="bridge-flow"><span>FIELD WORDS</span><i>→</i><span>EXTRACT</span><i>→</i><span className="hot">MATCH</span><i>→</i><span>VALIDATE</span><i>→</i><span>ACTUAL</span></div><div className="bridge-note"><b>96%</b><span>current top match confidence</span></div><p>Every AI decision remains traceable to the original field statement and the activity it changed.</p></div>
    </section>
  </>;
}

function ScheduleView({activities,selected,setSelected}:{activities:any[],selected:string,setSelected:(x:string)=>void}) { return <section className="schedule-surface"><div className="schedule-intro"><div><div className="section-kicker">LIVE BASELINE / REV 04</div><h2>Activity lattice</h2><p>Executable L5/L6 work, with actuals layered directly onto the baseline.</p></div><div className="schedule-stats"><span>246 total</span><span>52.3% actual</span><span>12 review</span></div></div><div className="table-head"><span>WBS</span><span>ACTIVITY</span><span>DESCRIPTION</span><span>PLAN</span><span>ACTUAL</span><span>PROGRESS</span><span>LINK</span></div>{activities.map(a=><button className={`activity-row ${selected===a.id?'selected':''}`} key={a.id} onClick={()=>setSelected(a.id)}><span>{a.wbs}</span><strong>{a.id}</strong><span>{a.desc}</span><span>{a.planStart} → {a.planFinish}</span><span>{a.actStart} → {a.actFinish}</span><span><i className="mini-bar"><b style={{width:`${a.progress}%`}}/></i>{a.progress}%</span><span className={a.aiConf>89?'green':'amber'}>{a.aiConf ? `${a.aiConf}%`:'—'}</span></button>)}</section> }

function CaptureView({text,setText,processed,onProcess}:{text:string,setText:(x:string)=>void,processed:boolean,onProcess:()=>void}) { return <section className="capture-layout"><div className="capture-main"><div className="section-kicker">FIELD INPUT / 01</div><h2>Speak in the language of the site.</h2><p className="lede">Paste a daily report, site diary note, or supervisor statement. Synchronex converts execution language into schedule-ready events.</p><textarea value={text} onChange={e=>setText(e.target.value)} /><div className="capture-actions"><button className="primary" onClick={onProcess}>Extract execution events ↗</button><span>Demo mode · no production data</span></div>{processed&&<div className="extracted"><div className="section-kicker">EXTRACTED / 03 EVENTS</div>{[['PIP-245','Completion','Line 24 spool erection completed','96%'],['PIP-246','Start','Line 25 erection started at 09:30','91%'],['CIV-022','Progress','Foundation Block A · approximately 70%','88%']].map(x=><div className="extract-row" key={x[0]}><strong>{x[0]}</strong><span>{x[1]}</span><em>{x[2]}</em><b>{x[3]}</b></div>)}</div>}</div><aside className="capture-side"><div className="section-kicker">PROCESS / 02</div>{['Input received','Discipline identified','Events extracted','Activities searched','Confidence calculated','Ready for review'].map((x,i)=><div className={`process-step ${processed||i===0?'done':''}`} key={x}><span>{String(i+1).padStart(2,'0')}</span><p>{x}</p><i/></div>)}<div className="side-callout"><b>Human stays in the loop.</b><p>Ambiguous matches never disappear. They move to the review queue with candidate activities and confidence evidence.</p></div></aside></section> }

function ReviewView({count,onApprove}:{count:number,onApprove:()=>void}) { return <section className="review-layout"><div className="review-list"><div className="section-kicker">REVIEW QUEUE / {count} OPEN</div><h2>Decisions that need a planner</h2>{REVIEW_QUEUE.slice(0,7).map((r,i)=><button className={`review-row ${i===0?'selected':''}`} key={r.id}><span>{r.id}</span><em>{r.text}</em><strong>{r.candidate}</strong><b>{r.conf || '—'}%</b><small>{r.issue}</small></button>)}</div><aside className="review-detail"><div className="section-kicker">SELECTED EVENT</div><blockquote>“Foundation work nearly complete”</blockquote><div className="candidate"><span>01</span><div><strong>CIV-022</strong><p>Foundation Block A</p></div><b>78%</b></div><div className="candidate muted"><span>02</span><div><strong>CIV-023</strong><p>Foundation Block B</p></div><b>64%</b></div><div className="candidate muted"><span>03</span><div><strong>CIV-021</strong><p>Foundation Preparation</p></div><b>51%</b></div><button className="primary full" onClick={onApprove}>Confirm CIV-022 ↗</button><button className="secondary full">Choose different activity</button><button className="danger full">Flag as new activity</button></aside></section> }

function MemoryView(){return <section className="memory-layout"><div className="section-kicker">INSTITUTIONAL MEMORY / SYNTHETIC DEMO DATA</div><h2>What execution teaches the next project</h2><p className="lede">Validated actuals become reusable duration and delay evidence instead of disappearing at project close.</p><div className="memory-table"><div className="memory-head"><span>ACTIVITY TYPE</span><span>BASELINE</span><span>ACTUAL AVG</span><span>DRIFT</span><span>OCCURRENCES</span></div>{MEMORY_ACTIVITIES.map(x=><div className="memory-row" key={x.type}><strong>{x.type}</strong><span>{x.baselineAvg}</span><span>{x.actualAvg}</span><b>{x.variance}</b><span>{x.occurrences}</span></div>)}</div><div className="memory-foot"><div><span>DELAY PATTERN</span><strong>Material availability</strong><small>31% of demo delay events</small></div><div><span>PRODUCTIVITY SIGNAL</span><strong>Piping · 69%</strong><small>based on synthetic historical actuals</small></div><div><span>KNOWLEDGE STATUS</span><strong>Traceable</strong><small>source event retained with every benchmark</small></div></div></section> }

function AuditView(){return <section className="audit-layout"><div className="section-kicker">TRACE LEDGER / ALL ACTORS</div><h2>Every schedule change has a provenance.</h2><div className="audit-rail">{[['09:42','AI','PIP-245','Progress 60 → 70%','96%'],['09:45','PLANNER','CIV-022','Match approved','78%'],['09:50','AI','ELE-014','Activity linked · 15%','91%'],['10:05','AI','ELE-020','Progress 65 → 80%','95%'],['10:11','PLANNER','RQ-003','Flagged unmatched','—'],['10:35','SYSTEM','MULTIPLE','Report processed · 38 events','—']].map(r=><div className="audit-row" key={r[0]}><time>{r[0]}</time><b>{r[1]}</b><strong>{r[2]}</strong><span>{r[3]}</span><em>{r[4]}</em></div>)}</div></section> }

function Signal({label,value,note,accent}:{label:string,value:string,note:string,accent?:string}){return <div className={`signal ${accent||''}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>}

export default App;
