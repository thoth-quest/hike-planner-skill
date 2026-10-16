// Pure, dependency-free, testable day-trip time simulation.
// Public transport timetable records stay as source evidence; scenario offsets are temporary.
// Node adjustments are scenario-only. No live queries and no plan JSON mutations.
export function parseClock(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  return Number(value.slice(0,2))*60 + Number(value.slice(3));
}
export function clockText(minutes) {
  return Number.isInteger(minutes) && minutes >= 0 && minutes < 1440
    ? String(Math.floor(minutes/60)).padStart(2,"0") + ":" + String(minutes%60).padStart(2,"0") : "跨日";
}
const integer = v => Number.isInteger(v) ? v : null;
const adjustment = (edits, id) => integer(edits?.[id]) ?? 0;
const validTimetable = (leg, day, evidence) => {
  const s=leg.timetable;
  if (leg.schedule_status && leg.schedule_status !== "verified") return null;
  if(!day || !s || s.service_date !== day || !s.source_id || !Number.isFinite(Date.parse(s.checked_at))) return null;
  const proof=(evidence||[]).find(e=>e.id===s.source_id && e.status==="verified" && /^https:\/\//.test(e.url||""));
  const departure=parseClock(s.departure_time), arrival=parseClock(s.arrival_time);
  if(!proof || departure===null || arrival===null || arrival<departure) return null;
  return {departure,arrival,source_id:s.source_id,service_id:s.service_id||null};
};
export function makeTimeline(plan, edits={}, selections={}, arrivalEdits={}, transitOffsets={}) {
  const steps=[];
  const date=plan.constraints?.date||null;
  const before=(plan.transport?.inbound||[]).filter(leg=>leg.preview_phase!=="hike");
  const after=plan.transport?.outbound||[];
  const route=(plan.route?.sections||[]).flatMap((section,sectionIndex)=>
    (section.stops||[]).map((stop,i)=>({...stop, section_name:section.name,
      node_id:stop.node_id||"trail-"+sectionIndex+"-"+i})));
  const anchor=plan.preview_timing?.status === "illustrative" ? parseClock(plan.preview_timing.anchor_time) : null;
  let cursor=null;
  let blocked=false;
  let hasInboundArrival=false;
  let problem=false;
  let uncertain=false;
  const entries=[];
  const getDelay=(id)=>adjustment(edits,id);
  function transit(leg, phase, index) {
    const id=leg.node_id||phase+"-"+index;
    const mode=leg.mode||"scheduled_transit";
    const delay=Math.max(0,getDelay(id));
    const verifiedOptions=(leg.timetable_options||[]).map(x=>validTimetable({...leg,timetable:x,schedule_status:"verified"},date,plan.evidence)).filter(Boolean);
    const selectedId=selections[id];
    const selectedOption=verifiedOptions.find(x=>x.service_id===selectedId);
    const s=selectedOption||validTimetable(leg,date,plan.evidence);
    const transitOffset=integer(transitOffsets[id])??0;
    const reference=cursor??parseClock(leg.reference_time);
    const serviceOptions=[...(s?[s]:[]),...verifiedOptions]
      .filter((service,index,list)=>list.findIndex(other=>other.service_id===service.service_id&&other.departure===service.departure)===index)
      .sort((a,b)=>a.departure-b.departure);
    const previousServices=reference===null?[]:serviceOptions.filter(x=>x.departure<=reference).slice(-2);
    const nextServices=reference===null?serviceOptions.slice(0,2):serviceOptions.filter(x=>x.departure>reference).slice(0,2);
    let status="pending",display=null,dep=null,arr=null;
    if(mode==="driving"||mode==="walking"||mode==="flexible") {
      const start=cursor??parseClock(leg.departure_time);
      const duration=integer(leg.estimated_duration_minutes);
      if(start!==null && duration!==null && duration>=0 && !blocked && !uncertain) {
        display=start+duration;cursor=display+delay;status="estimated";
        if(phase==="before") hasInboundArrival=true;
      } else { status=blocked?"connection_missed":"pending"; cursor=null; uncertain=true; }
    } else if(s) {
      const actualDeparture=s.departure+transitOffset;
      const actualArrival=s.arrival+transitOffset;
      dep=actualDeparture;arr=actualArrival;
      // Keep the sourced service intact; simulate a temporary early/late run at this node.
      if(blocked || (cursor!==null && cursor>actualDeparture)){
        status="connection_missed";cursor=null;blocked=true;problem=true;
      } else if(uncertain) {
        status="connection_unknown"; cursor=null;
      } else {
        status=transitOffset===0?"fixed":"adjusted";display=actualArrival;cursor=actualArrival+delay;
        if(phase==="before") hasInboundArrival=true;
      }
    } else {
      // An unresolved rail/bus cannot be assigned an invented time.
      status=blocked?"connection_missed":"pending";
      cursor=null; uncertain=true;
    }
    entries.push({id,kind:"transit",phase,mode,label:leg.name||"交通节点",
      note:leg.note||"",source_id:s?.source_id||leg.source_id||null,
      departure:dep,base_departure:s?.departure??null,
      scheduled_arrival:arr,base_scheduled_arrival:s?.arrival??null,base_arrival:display,
      previous_services:previousServices,next_services:nextServices,
      available_services:serviceOptions,
      full_day_services:leg.timetable_coverage?.scope==="full_day"&&leg.timetable_coverage.service_date===date&&leg.timetable_coverage.service_count===serviceOptions.length&&(plan.evidence||[]).some(e=>e.id===leg.timetable_coverage.source_id&&e.status==="verified"&&/^https:\/\//.test(e.url||"")),
      arrival:display,ready_after:display===null?null:display+delay,
      status,delay,transit_offset:transitOffset,service_id:s?.service_id||null});
    return status;
  }
  before.forEach((x,i)=>transit(x,"before",i));
  // Without a verified inbound arrival, the walking times are disconnected demo estimates.
  const missedInbound=blocked;
  let walkingBase=missedInbound?null:hasInboundArrival&&cursor!==null?cursor:anchor;
  const linked=hasInboundArrival&&cursor!==null&&!missedInbound&&!uncertain;
  // The offset at a trail node describes arrival at the node.
  // Delay entered ON that node shifts only FOLLOWING trail nodes and transfers.
  let cumulative=0;
  route.forEach((stop,i)=>{
    const id=stop.node_id;
    const offset=integer(stop.offset_minutes);
    const nominal=offset===null||walkingBase===null?null:walkingBase+offset+cumulative;
    const nextOffset=integer(route[i+1]?.offset_minutes);
    const minimum=offset!==null && nextOffset!==null ? -Math.max(0,nextOffset-offset) : 0;
    const previousOffset=integer(route[i-1]?.offset_minutes);
    const minimumArrival=offset!==null && previousOffset!==null ? -Math.max(0,offset-previousOffset) : 0;
    const delay=Math.max(minimum,getDelay(id));
    const arrivalShift=Math.max(minimumArrival,adjustment(arrivalEdits,id));
    const arrival=nominal===null?null:nominal+arrivalShift;
    const status=missedInbound?"connection_missed":nominal===null?"pending":linked?"estimated_linked":"illustrative";
    steps.push({id,kind:"trail",phase:"trail",label:stop.name||"登山节点",
      note:stop.note||"",section_name:stop.section_name,
      source_id:stop.source_id||null,key_point:!!stop.key_point,
      arrival,base_arrival:nominal,
      ready_after:arrival===null?null:arrival+delay,
      status,delay,min_delay:minimum,min_arrival_shift:minimumArrival,offset_minutes:offset});
    cumulative+=delay+arrivalShift;
  });
  // Once hiking has finished, use its actual scenario completion for the outbound connection.
  // The previous inbound cursor must not override the hike.
  if(route.length && steps.at(-1).ready_after!==null) {
    cursor=steps.at(-1).ready_after;
    blocked=false;
    uncertain=!linked;
  } else { cursor=null;blocked=missedInbound; uncertain=true; }
  after.forEach((x,i)=>transit(x,"after",i));
  const trailEnd=steps.at(-1)?.ready_after??null;
  const lastOutbound=entries.filter(x=>x.phase==="after").at(-1);
  const finish=lastOutbound?.status==="fixed"||lastOutbound?.status==="adjusted"||lastOutbound?.status==="estimated"
    ?lastOutbound.ready_after:lastOutbound?null:trailEnd;
  const overnight=[...before,...after].some(leg=>{
    const t=leg.timetable, dep=parseClock(t?.departure_time), arr=parseClock(t?.arrival_time);
    return t?.service_date===date && dep!==null && arr!==null && arr<dep;
  });
  const overDay=overnight||[...steps,...entries].some(x=>[x.arrival,x.ready_after,x.departure].some(t=>t!==null&&(t<0||t>=1440)));
  return {before:entries.filter(x=>x.phase==="before"),
    trail:steps,after:entries.filter(x=>x.phase==="after"),linked,anchor:walkingBase,
    finish,trailEnd,hasMissedConnection:problem,overDay,
    hasUnknownConnection:entries.some(x=>x.status==="connection_unknown"),
    changes:[
      ...Object.entries(edits).filter(([id,n])=>integer(n)!==null&&n!==0).map(([id,minutes])=>({id,minutes,kind:"delay"})),
      ...Object.entries(arrivalEdits).filter(([id,n])=>integer(n)!==null&&n!==0).map(([id,minutes])=>({id,minutes,kind:"arrival"})),
      ...Object.entries(transitOffsets).filter(([id,n])=>integer(n)!==null&&n!==0).map(([id,minutes])=>({id,minutes,kind:"transit"}))
    ]};
}
