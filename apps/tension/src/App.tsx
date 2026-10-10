import { useEffect, useMemo, useState } from 'react'
import { deleteLocalAuthUser, getIdToken, observeAuth, signIn, signOut, type AuthProviderName, type User } from '@bike-tools/auth'
import { compareSessions, summarizeSide, type MeasurementStage, type TensionMeasurement, type TensionSession, type Wheel, type WheelSide } from '@bike-tools/bike-core'
import { apiRequest } from '@bike-tools/db'

type Draft = Record<WheelSide, string[]>
const emptyDraft = (count: number): Draft => ({ left: Array(Math.ceil(count / 2)).fill(''), right: Array(Math.floor(count / 2)).fill('') })
const n = (value: string) => value.trim() ? Number(value) : null
const fmt = (value: number | null, suffix = '') => value === null ? '—' : `${value.toFixed(1)}${suffix}`

function SignIn() {
  const [busy, setBusy] = useState<AuthProviderName | null>(null); const [error, setError] = useState('')
  const connect = async (provider: AuthProviderName) => { try { setBusy(provider); setError(''); await signIn(provider) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sign-in failed') } finally { setBusy(null) } }
  // Add 'apple' and 'facebook' here after enabling them in packages/auth.
  const enabledProviders: AuthProviderName[] = ['google']
  return <main className="signin"><div className="signin-copy"><div className="brand"><span>SB</span> SPOKE BENCH</div><p className="eyebrow">PRECISION WHEEL WORKSHOP</p><h1>Every spoke.<br/><em>In balance.</em></h1><p>Measure tension, spot inconsistencies, and track your wheels over time.</p></div><section className="signin-card"><div className="wheel-logo">◎</div><h2>Welcome to your workbench</h2><p>Sign in to save wheels and tension sessions.</p>{enabledProviders.map(provider => <button key={provider} disabled={!!busy} onClick={() => connect(provider)}>Continue with {provider[0]?.toUpperCase()}{provider.slice(1)}</button>)}{error && <p className="error" role="alert">{error}</p>}<small>We store only your Firebase user ID with workshop data.</small></section></main>
}

function WheelForm({ onSave, onCancel }: { onSave: (wheel: Omit<Wheel, 'id'|'createdAt'|'updatedAt'|'tensionUnit'>) => Promise<void>; onCancel?: () => void }) {
  const [form, setForm] = useState({ name: '', position: 'rear' as const, spokeCount: '28', rim: '', hub: '', targetLeft: '75', targetRight: '120' }); const [busy, setBusy] = useState(false)
  const field = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm({ ...form, [key]: event.target.value })
  return <form className="card form" onSubmit={async event => { event.preventDefault(); setBusy(true); try { await onSave({ name: form.name || null, position: form.position, spokeCount: Number(form.spokeCount), rim: form.rim || null, hub: form.hub || null, targetLeft: n(form.targetLeft), targetRight: n(form.targetRight) }) } finally { setBusy(false) } }}><div className="card-head"><div><p className="eyebrow">NEW PROFILE</p><h2>Add a wheel</h2></div>{onCancel && <button className="icon-button" type="button" onClick={onCancel}>×</button>}</div><div className="form-grid"><label>Wheel name<input required maxLength={100} value={form.name} onChange={field('name')} placeholder="Trail bike rear" /></label><label>Position<select value={form.position} onChange={field('position')}><option value="front">Front</option><option value="rear">Rear</option></select></label><label>Spoke count<select value={form.spokeCount} onChange={field('spokeCount')}>{[24,28,32,36].map(x => <option key={x}>{x}</option>)}</select></label><label>Rim<input value={form.rim} onChange={field('rim')} placeholder="DT Swiss EX 511" /></label><label>Hub<input value={form.hub} onChange={field('hub')} placeholder="DT Swiss 350" /></label><label>Left target (kgf)<input type="number" min="1" max="500" value={form.targetLeft} onChange={field('targetLeft')} /></label><label>Right target (kgf)<input type="number" min="1" max="500" value={form.targetRight} onChange={field('targetRight')} /></label></div><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Create wheel'}</button></form>
}

function WheelDiagram({ draft, selected, onSelect, stats }: { draft: Draft; selected: [WheelSide,number]; onSelect: React.Dispatch<React.SetStateAction<[WheelSide,number]>>; stats: Record<WheelSide, ReturnType<typeof summarizeSide>> }) {
  const total = draft.left.length + draft.right.length
  const entries = Array.from({ length: total }, (_, position) => {
    const side: WheelSide = position % 2 === 0 ? 'left' : 'right'
    const index = Math.floor(position / 2)
    return { side, index, value: n(draft[side][index] ?? '') }
  })
  const cx = 150, cy = 150, radius = 112
  const measured = entries.flatMap(entry => entry.value === null ? [] : [entry.value])
  const maximum = measured.length ? Math.max(...measured) : null
  const chartMax = maximum === null ? 100 : Math.max(10, Math.ceil((maximum * 1.1) / 10) * 10)
  const point = (position: number, distance: number) => {
    const angle = (position / total) * Math.PI * 2 - Math.PI / 2
    return { x: cx + Math.cos(angle) * distance, y: cy + Math.sin(angle) * distance }
  }
  const dataPoints = entries.map((entry, position) => entry.value === null ? null : point(position, Math.min(entry.value / chartMax, 1) * radius))
  const series = (['left','right'] as const).map(side => {
    const points = dataPoints.flatMap((value,index) => value && entries[index]?.side === side ? [value] : [])
    return { side, points, path: points.map(value => `${value.x},${value.y}`).join(' ') }
  })
  return <div className="diagram"><div className="diagram-title"><span>TENSION PROFILE</span><small>{maximum === null ? 'No readings · scale 0–100 kgf' : `Max ${fmt(maximum)} kgf · scale 0–${chartMax}`}</small></div><svg viewBox="0 0 300 300" aria-label="Interactive spoke tension radar chart">{[.25,.5,.75,1].map(scale=><circle key={scale} className="radar-ring" cx={cx} cy={cy} r={radius*scale}/>)}{entries.map((entry,position)=>{const end=point(position,radius);return <line key={`axis-${entry.side}-${entry.index}`} className="radar-axis" x1={cx} y1={cy} x2={end.x} y2={end.y}/>})}{series.map(({side,points,path})=>points.length>=3?<polygon key={side} className={`radar-area ${side}`} points={path}/>:points.length===2?<polyline key={side} className={`radar-area radar-line ${side}`} points={path}/>:null)}{dataPoints.map((value,index)=>value&&<circle key={`value-${index}`} className={`radar-point ${entries[index]?.side}`} cx={value.x} cy={value.y} r="3.5"/>)}{entries.map(({side,index,value},position)=>{const spokeNumber=position+1;const end=point(position,radius);const label=point(position,radius+15);const average=stats[side].average;const bad=value!==null&&average!==null&&Math.abs(value-average)/average>.1;return <g key={`${side}${index}`} className={`spoke ${side} ${bad?'bad':''} ${selected[0]===side&&selected[1]===index?'selected':''}`} role="button" tabIndex={0} onClick={()=>onSelect([side,index])} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect([side,index])}}}><circle cx={end.x} cy={end.y} r="7"/><text x={end.x} y={end.y+3}>{spokeNumber}</text><title>{`Spoke ${spokeNumber} · ${side}: ${value ?? 'not measured'}${value === null ? '' : ' kgf'}`}</title><circle className="spoke-hit" cx={label.x} cy={label.y} r="10"/></g>})}<circle className="axle" cx={cx} cy={cy} r="4"/></svg><div className="diagram-legend"><span><i className="left-key"/>Left / odd</span><span><i className="right-key"/>Right / even</span></div><p>Enter all spokes to complete the tension profile</p></div>
}

function SpokeEntryTable({ draft, wheel, stats, selected, onChange, onSelect }: { draft: Draft; wheel: Wheel; stats: Record<WheelSide, ReturnType<typeof summarizeSide>>; selected: [WheelSide,number]; onChange: (side:WheelSide,index:number,value:string)=>void; onSelect: React.Dispatch<React.SetStateAction<[WheelSide,number]>> }) {
  const rowCount = Math.max(draft.left.length, draft.right.length)
  const cell = (side: WheelSide, index: number) => {
    const value = draft[side][index] ?? ''
    const tension = n(value)
    const target = side === 'left' ? wheel.targetLeft : wheel.targetRight
    const deviation = tension !== null && target ? ((tension - target) / target) * 100 : null
    const average = stats[side].average
    const outside = tension !== null && average !== null && Math.abs(tension - average) / average > .1
    const spokeNumber = index * 2 + (side === 'left' ? 1 : 2)
    return <td className={`side-entry-cell ${side} ${outside?'warning-cell':''} ${selected[0]===side&&selected[1]===index?'active-cell':''}`} onClick={()=>onSelect([side,index])}><div className="cell-input"><span className="physical-number">#{String(spokeNumber).padStart(2,'0')}</span><input aria-label={`${side} spoke ${index+1} tension`} type="number" min="1" max="500" step="0.1" value={value} placeholder="—" onFocus={()=>onSelect([side,index])} onChange={event=>onChange(side,index,event.target.value)}/><small>kgf</small></div><div className="cell-meta"><span>Target {fmt(target)}</span><span className={deviation!==null&&Math.abs(deviation)>10?'negative':''}>{deviation===null?'No reading':`${deviation>0?'+':''}${deviation.toFixed(1)}%`}</span>{!value?<span className="status empty-status">Not measured</span>:outside?<span className="status check-status">Check</span>:<span className="status good-status">In range</span>}</div></td>
  }
  return <section className="card spoke-entry"><div className="spoke-entry-head"><div><p className="eyebrow">ALL SPOKES</p><h3>Tension entry</h3></div><span>Values update the chart instantly</span></div><div className="spoke-table-wrap"><table className="split-spoke-table"><thead><tr><th>Position</th><th><span className="side-pill left">Left side · odd spokes</span></th><th><span className="side-pill right">Right side · even spokes</span></th></tr></thead><tbody>{Array.from({length:rowCount},(_,index)=><tr key={index}><td className="pair-number"><strong>{String(index+1).padStart(2,'0')}</strong></td>{index<draft.left.length?cell('left',index):<td/>}{index<draft.right.length?cell('right',index):<td/>}</tr>)}</tbody></table></div></section>
}

function SessionEditor({ wheel, history, onSaved }: { wheel: Wheel; history: TensionSession[]; onSaved: () => Promise<void> }) {
  const freshDrafts=()=>({before:emptyDraft(wheel.spokeCount),after:emptyDraft(wheel.spokeCount)})
  const [drafts,setDrafts]=useState(freshDrafts); const [stage,setStage]=useState<MeasurementStage>('before'); const [selected,setSelected]=useState<[WheelSide,number]>(['left',0]); const [notes,setNotes]=useState(''); const [isNewWheel,setIsNewWheel]=useState(false); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('')
  useEffect(()=>{setDrafts(freshDrafts());setStage('before');setIsNewWheel(false)},[wheel.id,wheel.spokeCount])
  const draft=drafts[stage]
  const measurements=useMemo(()=> (['before','after'] as const).flatMap(measurementStage=>(['left','right'] as const).flatMap(side=>drafts[measurementStage][side].flatMap((value,index)=>n(value) ? [{spokeNumber:index*2+(side==='left'?1:2),side,positionIndex:index,tension:Number(value),stage:measurementStage}] : []))),[drafts])
  const stageMeasurements=measurements.filter(item=>item.stage===stage)
  const beforeCount=measurements.filter(item=>item.stage==='before').length, afterCount=measurements.filter(item=>item.stage==='after').length
  const stats={left:summarizeSide(stageMeasurements,'left',wheel.targetLeft),right:summarizeSide(stageMeasurements,'right',wheel.targetRight)}
  const previousAfter=history[0]?.measurements.filter(item=>item.stage==='after')??[]
  const comparison=history[0] ? compareSessions(measurements.filter(item=>item.stage==='after'),previousAfter) : []
  const update=(side:WheelSide,index:number,value:string)=>setDrafts(current=>({...current,[stage]:{...current[stage],[side]:current[stage][side].map((v,i)=>i===index?value:v)}}))
  const save=async()=>{if(!beforeCount||!afterCount)return;setBusy(true);setMessage('');try{const token=await getIdToken();await apiRequest('tension-session',token,{method:'POST',body:JSON.stringify({wheelId:wheel.id,notes:notes||null,isNewWheel,measurements})});setDrafts(freshDrafts());setStage('before');setNotes('');setIsNewWheel(false);setMessage('Session saved');await onSaved()}catch(e){setMessage(e instanceof Error?e.message:'Could not save')}finally{setBusy(false)}}
  return <section className="workspace">
    <div className="section-title"><div><p className="eyebrow">LIVE SESSION</p><h2>{wheel.name || `${wheel.position} wheel`}</h2></div><div className="session-progress"><strong>{beforeCount + afterCount}/{wheel.spokeCount * 2}</strong><span>readings entered</span></div></div>
    <div className="measurement-tabs" role="tablist" aria-label="Measurement stage">{(['before','after'] as const).map(item=><button key={item} type="button" role="tab" aria-selected={stage===item} className={stage===item?'active':''} onClick={()=>setStage(item)}><strong>{item}</strong><span>{item==='before'?'Before service':'After service'} · {item==='before'?beforeCount:afterCount}/{wheel.spokeCount}</span></button>)}</div>
    <div className="analysis-grid"><div className="card chart-card"><WheelDiagram draft={draft} selected={selected} onSelect={setSelected} stats={stats}/></div></div>
    <SpokeEntryTable draft={draft} wheel={wheel} stats={stats} selected={selected} onChange={update} onSelect={setSelected}/>
    <div className="stats">{(['left','right'] as const).map(side=><article className="card" key={side}><p className="eyebrow">{side.toUpperCase()} SIDE</p><strong>{fmt(stats[side].average)}</strong><span>kgf average</span><dl><div><dt>Minimum</dt><dd>{fmt(stats[side].minimum)}</dd></div><div><dt>Maximum</dt><dd>{fmt(stats[side].maximum)}</dd></div><div><dt>Std. deviation</dt><dd>{fmt(stats[side].standardDeviation)}</dd></div><div><dt>From target</dt><dd>{fmt(stats[side].targetDeviationPercent,'%')}</dd></div></dl></article>)}</div>
    <div className="card session-save"><label>Session notes<textarea maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Trued wheel; checked after first ride…"/></label>{history.length===0&&<label className="new-wheel-check"><input type="checkbox" checked={isNewWheel} onChange={event=>setIsNewWheel(event.target.checked)}/><span><strong>New wheel</strong><small>Mark this first session as the wheel's initial build.</small></span></label>}<div><small>{!beforeCount||!afterCount?'Enter at least one reading in both Before and After.':history[0]&&comparison.length?`After service vs last session: ${comparison.filter(x=>Math.abs(x.change)>=5).length} spokes changed ≥5 kgf.`:'This first session will become the comparison baseline.'}</small><button className="primary" disabled={busy||!beforeCount||!afterCount} onClick={save}>{busy?'Saving…':'Save session'}</button></div>{message&&<p className="notice" role="status">{message}</p>}</div>
  </section>
}

function SessionHistory({ wheel, sessions, onShare, defaultOpen=false, title='Session history' }: { wheel: Wheel; sessions: TensionSession[]; onShare?: (sessionId:string)=>Promise<void>; defaultOpen?: boolean; title?: string }) {
  const [openId,setOpenId]=useState<string|null>(defaultOpen?sessions[0]?.id??null:null)
  const [sharing,setSharing]=useState<string|null>(null)
  const [shareMessage,setShareMessage]=useState('')
  const opened=sessions.find(session=>session.id===openId)
  const formatDate=(value:string)=>new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))
  const readingsFor=(measurementStage:MeasurementStage)=>opened?.measurements.filter(item=>item.stage===measurementStage)??[]
  const stageDetail=(measurementStage:MeasurementStage)=>{
    const readings=readingsFor(measurementStage)
    const stats={left:summarizeSide(readings,'left',wheel.targetLeft),right:summarizeSide(readings,'right',wheel.targetRight)}
    const rowCount=Math.max(0,...readings.map(item=>item.positionIndex+1))
    const reading=(side:WheelSide,index:number)=>readings.find(item=>item.side===side&&item.positionIndex===index)
    return <section className="saved-stage" key={measurementStage}><h4>{measurementStage} service <span>{readings.length} readings</span></h4><div className="saved-stats">{(['left','right'] as const).map(side=><div key={side}><span className={`side-pill ${side}`}>{side} average</span><strong>{fmt(stats[side].average)} kgf</strong><small>{fmt(stats[side].minimum)} min · {fmt(stats[side].maximum)} max · {fmt(stats[side].targetDeviationPercent,'%')} target</small></div>)}</div><div className="saved-readings"><table><thead><tr><th>Position</th><th><span className="side-pill left">Left / odd</span></th><th><span className="side-pill right">Right / even</span></th></tr></thead><tbody>{Array.from({length:rowCount},(_,index)=>{const left=reading('left',index);const right=reading('right',index);return <tr key={index}><td>{String(index+1).padStart(2,'0')}</td><td>{left?<><strong>{left.tension.toFixed(1)}</strong> kgf <small>spoke {left.spokeNumber}</small></>:'—'}</td><td>{right?<><strong>{right.tension.toFixed(1)}</strong> kgf <small>spoke {right.spokeNumber}</small></>:'—'}</td></tr>})}</tbody></table></div></section>
  }
  return <section className="history">
    <div className="section-title"><div><p className="eyebrow">SERVICE RECORD</p><h2>{title}</h2></div></div>
    {shareMessage&&<p className="share-message" role="status">{shareMessage}</p>}
    {sessions.length?<div className="history-list">{sessions.map(item=><article className={`card history-record ${openId===item.id?'open':''}`} key={item.id}>
      <div className="history-actions"><button type="button" className="history-summary" aria-expanded={openId===item.id} onClick={()=>setOpenId(current=>current===item.id?null:item.id)}><span><strong>{formatDate(item.createdAt)} {item.isNewWheel&&<em className="new-wheel-badge">New wheel</em>}</strong><small>{item.notes||'No notes'}</small></span><span>{item.measurements.length} readings <b>{openId===item.id?'−':'+'}</b></span></button>{onShare&&<button className="share-button" type="button" disabled={sharing===item.id} onClick={async()=>{setSharing(item.id);setShareMessage('');try{await onShare(item.id);setShareMessage('Share link copied. The viewer must sign in to open it.')}catch(error){setShareMessage(error instanceof Error?error.message:'Could not create share link')}finally{setSharing(null)}}}>{sharing===item.id?'Creating…':'Share'}</button>}</div>
      {openId===item.id&&<div className="session-detail">{item.notes&&<div className="saved-notes"><span>Session notes</span><p>{item.notes}</p></div>}<div className="saved-stage-grid">{stageDetail('before')}{stageDetail('after')}</div></div>}
    </article>)}</div>:<div className="empty">No saved sessions yet. Complete a measurement above to begin your wheel history.</div>}
  </section>
}

function App() {
  const exportEnabled=import.meta.env.VITE_ENABLE_DATA_EXPORT==='true'
  const feedbackEmail=(import.meta.env.VITE_FEEDBACK_EMAIL as string|undefined)?.trim()
  const feedbackLink=feedbackEmail?`mailto:${feedbackEmail}?subject=${encodeURIComponent('Spoke Bench feedback')}&body=${encodeURIComponent('Hello,\n\nI would like to share the following feedback:\n\n')}`:''
  const [user,setUser]=useState<User|null|undefined>(undefined); const [wheels,setWheels]=useState<Wheel[]>([]); const [active,setActive]=useState<string>(''); const [history,setHistory]=useState<TensionSession[]>([]); const [adding,setAdding]=useState(false); const [error,setError]=useState('')
  const [sharedView,setSharedView]=useState<{wheel:Wheel;session:TensionSession}|null>(null); const [sharedError,setSharedError]=useState(''); const [sharedLoading,setSharedLoading]=useState(false)
  const shareToken=typeof window==='undefined'?null:new URLSearchParams(window.location.search).get('share')
  useEffect(()=>observeAuth(setUser),[])
  const load=async()=>{if(!user)return;try{const token=await getIdToken();const data=await apiRequest<Wheel[]>('wheels',token);if(!Array.isArray(data))throw new Error('The wheels API returned an invalid response');setWheels(data);setActive(current=>current||data[0]?.id||'')}catch(e){setWheels([]);setError(e instanceof Error?e.message:'Could not load wheels')}}
  useEffect(()=>{void load()},[user])
  const current=wheels.find(w=>w.id===active)
  const loadHistory=async()=>{if(!current)return;const token=await getIdToken();const rows=await apiRequest<Array<Record<string,unknown>>>('tension-history?wheelId='+current.id,token);setHistory(rows.map(row=>({id:String(row.id),wheelId:String(row.wheel_id),notes:row.notes as string|null,isNewWheel:Boolean(row.is_new_wheel),createdAt:String(row.created_at),measurements:(row.spoke_measurements as Array<Record<string,unknown>>).map(m=>({id:String(m.id),spokeNumber:Number(m.spoke_number),side:m.side as WheelSide,positionIndex:Number(m.position_index),tension:Number(m.tension),stage:(m.measurement_stage||'after') as MeasurementStage}))})))}
  useEffect(()=>{void loadHistory().catch(e=>setError(e.message))},[current?.id])
  useEffect(()=>{if(!user||!shareToken)return;setSharedLoading(true);setSharedError('');void getIdToken().then(token=>apiRequest<Record<string,unknown>>(`shared-session?token=${encodeURIComponent(shareToken)}`,token)).then(row=>{const wheelRow=row.wheels as Record<string,unknown>;const measurements=row.spoke_measurements as Array<Record<string,unknown>>;setSharedView({wheel:{id:String(wheelRow.id),name:wheelRow.name as string|null,position:wheelRow.position as Wheel['position'],spokeCount:Number(wheelRow.spoke_count),rim:wheelRow.rim as string|null,hub:wheelRow.hub as string|null,targetLeft:wheelRow.target_left===null?null:Number(wheelRow.target_left),targetRight:wheelRow.target_right===null?null:Number(wheelRow.target_right),tensionUnit:'kgf',createdAt:String(wheelRow.created_at),updatedAt:String(wheelRow.updated_at)},session:{id:String(row.id),wheelId:String(row.wheel_id),notes:row.notes as string|null,isNewWheel:Boolean(row.is_new_wheel),createdAt:String(row.created_at),measurements:measurements.map(item=>({id:String(item.id),spokeNumber:Number(item.spoke_number),side:item.side as WheelSide,positionIndex:Number(item.position_index),tension:Number(item.tension),stage:(item.measurement_stage||'after') as MeasurementStage}))}})}).catch(cause=>setSharedError(cause instanceof Error?cause.message:'Could not open shared session')).finally(()=>setSharedLoading(false))},[user,shareToken])
  if(user===undefined)return <div className="loading">Loading workbench…</div>
  if(!user)return <SignIn/>
  if(shareToken)return <div className="app"><header><div className="brand"><span>SB</span> SPOKE BENCH</div><nav><a className="header-link" href="/">My workbench</a><button onClick={()=>signOut()}>Sign out</button></nav></header><main className="shared-page"><div className="page-head"><div><p className="eyebrow">SHARED / READ ONLY</p><h1>{sharedView?.wheel.name||'Shared tension session'}</h1></div></div>{sharedLoading&&<div className="loading-panel">Loading shared session…</div>}{sharedError&&<p className="error" role="alert">{sharedError}</p>}{sharedView&&<SessionHistory wheel={sharedView.wheel} sessions={[sharedView.session]} defaultOpen title="Shared session"/>}</main></div>
  const create=async(wheel:Omit<Wheel,'id'|'createdAt'|'updatedAt'|'tensionUnit'>)=>{const token=await getIdToken();const created=await apiRequest<Wheel>('wheels',token,{method:'POST',body:JSON.stringify(wheel)});setWheels([created,...wheels]);setActive(created.id);setAdding(false)}
  const exportData=async()=>{const token=await getIdToken();const data=await apiRequest('export-data',token);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='spoke-bench-export.json';a.click();URL.revokeObjectURL(url)}
  const shareSession=async(sessionId:string)=>{const token=await getIdToken();const result=await apiRequest<{token:string}>('session-share',token,{method:'POST',body:JSON.stringify({sessionId})});const url=`${window.location.origin}/?share=${encodeURIComponent(result.token)}`;if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);else window.prompt('Copy this share link',url)}
  const removeAccount=async()=>{if(!confirm('Permanently delete all wheel data and your account? This cannot be undone.'))return;try{const token=await getIdToken(true);await apiRequest('account',token,{method:'DELETE'});await deleteLocalAuthUser()}catch(e){setError(e instanceof Error?e.message:'Deletion failed. Sign in again and retry.')}}
  return <div className="app">
    <header><div className="brand"><span>SB</span> SPOKE BENCH</div><nav><button className="mobile-add-wheel" onClick={()=>setAdding(true)}>+ Wheel</button>{feedbackEmail&&<a className="header-link" href={feedbackLink}>Feedback</a>}{exportEnabled&&<button onClick={exportData}>Export data</button>}<button onClick={()=>signOut()}>Sign out</button></nav></header>
    <div className="layout"><aside><p className="eyebrow">MY WHEELS</p><button className="add-wheel-button" type="button" onClick={()=>setAdding(true)}><strong>＋</strong><span>Add wheel</span></button>{wheels.map(w=><button key={w.id} className={active===w.id?'active':''} onClick={()=>setActive(w.id)}><span className="mini-wheel">◎</span><span><strong>{w.name||'Untitled wheel'}</strong><small>{w.position} · {w.spokeCount} spokes</small></span></button>)}<div className="account"><button onClick={removeAccount}>Delete account</button><small>Deletes all saved data and Firebase identity.</small></div></aside>
      <main><div className="page-head"><div><p className="eyebrow">WHEEL WORKSHOP / TENSION</p><h1>Tension manager</h1></div>{current&&<div className="wheel-meta"><span>{current.rim||'No rim'}</span><span>{current.hub||'No hub'}</span><span>{current.spokeCount} spokes</span></div>}</div>{error&&<p className="error" role="alert">{error}</p>}{adding||!wheels.length?<WheelForm onSave={create} onCancel={wheels.length?()=>setAdding(false):undefined}/>:current&&<><SessionEditor wheel={current} history={history} onSaved={loadHistory}/><SessionHistory wheel={current} sessions={history} onShare={shareSession}/></>}</main>
    </div>
  </div>
}
export default App
