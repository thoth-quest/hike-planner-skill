import test from "node:test";
import assert from "node:assert/strict";
import { makeTimeline, parseClock, clockText } from "../site/assets/timeline.mjs";
const known = (service_date,departure_time,arrival_time,id="proof") =>
 ({service_date,departure_time,arrival_time,source_id:id,checked_at:"2026-10-15T08:00:00+09:00",service_id:"X12"});
function fixture() {
  return {
    constraints:{date:"2026-10-24"},preview_timing:{anchor_time:"08:00"},
    evidence:[{id:"proof",url:"https://example.org/schedules",status:"verified"}],
    transport:{
      inbound:[
        {node_id:"train",name:"Train",mode:"scheduled_transit",timetable:known("2026-10-24","07:00","07:20")},
        {node_id:"bus-in",name:"Bus to mountain",mode:"scheduled_transit",timetable:known("2026-10-24","07:30","08:00")}
      ],
      outbound:[{node_id:"bus-out",name:"Return bus",mode:"scheduled_transit",timetable:known("2026-10-24","09:45","10:15")}]
    },
    route:{sections:[{name:"Hike",stops:[
      {node_id:"start",name:"Trailhead",offset_minutes:0},
      {node_id:"summit",name:"Summit",offset_minutes:60},
      {node_id:"finish",name:"Finish",offset_minutes:90}
    ]}]}
  };
}
test("fixed public transit stays unchanged when a hike node runs late",()=>{
  const p=fixture();
  const original=structuredClone(p);
  const normal=makeTimeline(p);
  const late=makeTimeline(p,{summit:30});
  assert.equal(normal.after[0].departure,parseClock("09:45"));
  assert.equal(normal.after[0].status,"fixed");
  assert.equal(late.after[0].departure,parseClock("09:45"));
  assert.equal(late.after[0].scheduled_arrival,parseClock("10:15"));
  assert.equal(late.after[0].status,"connection_missed");
  assert.equal(late.trail[1].arrival,parseClock("09:00"));
  assert.equal(late.trail[2].arrival,parseClock("10:00"));
  assert.equal(late.trailEnd,parseClock("10:00"));
  assert.equal(late.hasMissedConnection,true);
  assert.deepEqual(p,original,"scenario must never modify plan JSON");
});
test("node delay affects only following flexible waypoints",()=>{
 const a=makeTimeline(fixture(),{summit:15});
 assert.equal(a.trail[0].arrival,480);
 assert.equal(a.trail[1].arrival,540);
 assert.equal(a.trail[2].arrival,585);
 assert.equal(a.after[0].departure,585);
 assert.equal(a.after[0].status,"fixed");
});
test("a late train can miss the fixed inbound bus and blocks downstream hiking estimates",()=>{
 const a=makeTimeline(fixture(),{train:15});
 assert.equal(a.before[0].departure,420);
 assert.equal(a.before[0].scheduled_arrival,440);
 assert.equal(a.before[0].ready_after,455);
 assert.equal(a.before[1].departure,450);
 assert.equal(a.before[1].status,"connection_missed");
 assert.equal(a.trail[0].arrival,null);
 assert.equal(a.hasMissedConnection,true);
});
test("unverified timetable is never treated as fixed public transit",()=>{
 const p=fixture();p.constraints.date=null;
 const a=makeTimeline(p);
 assert.equal(a.before[0].status,"pending");
 assert.equal(a.before[0].arrival,null);
 assert.equal(a.after[0].status,"pending");
 assert.equal(a.trail[0].status,"illustrative");
 assert.equal(a.trail[0].arrival,480);
});
test("driving and walking delays propagate, not pretend to be a timetable",()=>{
 const p=fixture();
 p.transport.inbound=[
  {node_id:"car",mode:"driving",departure_time:"07:00",estimated_duration_minutes:60,name:"Drive"},
 ];
 const a=makeTimeline(p,{car:20});
 assert.equal(a.before[0].status,"estimated");
 assert.equal(a.before[0].arrival,480);
 assert.equal(a.before[0].ready_after,500);
 // Driving provides an estimated arrival which anchors downstream hiking (never a fixed timetable).
 assert.equal(a.linked,true);
 assert.equal(a.trail[0].arrival,500);
 assert.equal(a.trail[0].status,"estimated_linked");
});
test("missing next verified service never fabricates a replacement departure",()=>{
 const a=makeTimeline(fixture(),{summit:60});
 assert.equal(a.after[0].status,"connection_missed");
 assert.equal(a.after[0].arrival,null);
 assert.equal(a.after[0].service_id,"X12");
 assert.equal(a.hasMissedConnection,true);
});
test("cross-day results are flagged rather than rolled into a second day",()=>{
 const p=fixture();
 p.preview_timing.anchor_time="23:30";
 p.transport.inbound=[];p.transport.outbound=[];
 const a=makeTimeline(p);
 assert.equal(a.overDay,true);
 assert.equal(clockText(a.trail[2].arrival),"跨日");
});
