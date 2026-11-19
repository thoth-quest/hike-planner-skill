import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeTimeline } from "../site/assets/timeline.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const site=path.join(root,"site"),dir=path.join(site,"plans");
const load=(p)=>JSON.parse(readFileSync(p,"utf8"));
const index=load(path.join(dir,"index.json"));
const plans=index.plans;
const slug=/^[a-z0-9][a-z0-9-]{0,62}$/;
test("manifest is valid, with unique safe plan IDs",()=>{
  assert.equal(index.schema_version,1);
  assert.ok(Array.isArray(plans));
  assert.equal(new Set(plans).size,plans.length);
  assert.ok(plans.every(id=>slug.test(id)));
});
test("each listed plan owns its JSON, all files are registered",()=>{
  const listed=[...plans].sort();
  const actual=readdirSync(dir,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
  assert.deepEqual(listed,actual);
  for(const id of plans){
    const p=load(path.join(dir,id,"activity.json"));
    assert.equal(p.id,id);
    assert.equal(p.schema_version,1);
    assert.equal(p.trip_type,"day_trip","only day hikes are supported in this release");
    assert.equal(p.stage,"goal_definition");
    assert.ok(Number.isInteger(p.revision) && p.revision>0);
    for(const key of ["destination","goals","constraints","weather","candidates","evidence","changes"])
      assert.ok(Object.hasOwn(p,key),id+" missing "+key);
    assert.ok(["pending","unavailable","current","stale"].includes(p.weather.status));
    assert.ok(Array.isArray(p.weather.snapshots));
    assert.ok(Array.isArray(p.changes));
    assert.ok(Array.isArray(p.evidence));
    if(p.weather.status==="current"){
      assert.ok(p.weather.snapshots.length>0,"current forecast requires snapshot");
      assert.ok(p.weather.snapshots.at(-1).checked_at);
      assert.ok(p.weather.snapshots.at(-1).sources?.length);
    }
  }
});
test("static pages are independent of Python and generated HTML",()=>{
  assert.ok(existsSync(path.join(site,"index.html")));
  assert.ok(existsSync(path.join(site,"plan.html")));
  assert.ok(existsSync(path.join(site,"assets","app.js")));
  const js=readFileSync(path.join(site,"assets","app.js"),"utf8");
  assert.match(js,/fetch\(/);
  assert.match(js,/activity\.json/);
  assert.doesNotMatch(js,/api\.openweathermap|api\.weatherapi|jma\.go\.jp/);
  assert.ok(!existsSync(path.join(root,"scripts","render.py")),"obsolete Python renderer should be removed");
});

test("Oyama reference plan includes grounded route and safety information",()=>{
  const p=load(path.join(dir,"oyama-day-hike","activity.json"));
  assert.equal(p.example_only,false);
  assert.equal(p.constraints.date,null,"do not invent an outing date");
  assert.equal(p.weather.status,"pending","do not invent date-specific forecasts");
  assert.ok(p.route.sections.length>=3);
  assert.ok(p.route.sections.flatMap(x=>x.stops).some(x=>x.name.includes("见晴台")));
  assert.ok(p.transport.inbound.length>0);
  assert.ok(p.safety.alerts.some(a=>a.title.includes("熊")));
  assert.ok(p.evidence.length>=5);
  const ids=new Set(p.evidence.map(x=>x.id));
  for(const e of p.evidence) {
    assert.ok(e.url.startsWith("https://"),"evidence URL must use HTTPS");
    assert.ok(e.checked_at,"date-sensitive evidence needs checked_at");
  }
  for(const a of p.safety.alerts) assert.ok(ids.has(a.source_id),"alerts must link to evidence");
});

test("detail view opens Route first and has four product tabs",()=>{
  const page=readFileSync(path.join(site,"plan.html"),"utf8");
  assert.match(page,/role="tablist"/);
  for(const name of ["route","overview","weather","history"]){
    assert.match(page,new RegExp('id="tab-'+name+'"'));
    assert.match(page,new RegExp('id="panel-'+name+'"'));
  }
  assert.match(page,/id="tab-route"[^>]+aria-selected="true"/);
  assert.doesNotMatch(page,/id="panel-route"[^>]*hidden/);
  assert.match(page,/id="tab-overview"[^>]+aria-controls="panel-overview"[^>]*>计划 <span class="tab-count">02/);
  assert.match(page,/id="tab-weather"[^>]+aria-controls="panel-weather"[^>]*>安全 <span class="tab-count">03/);
  assert.match(page,/id="tab-history"[^>]+aria-controls="panel-history"[^>]*>记录 <span class="tab-count">04/);
  assert.doesNotMatch(page,/id="tab-costs"|id="panel-costs"/);
  assert.match(page,/assets\/detail\.js/);
  assert.ok(existsSync(path.join(site,"assets","detail.js")));
  const js=readFileSync(path.join(site,"assets","detail.js"),"utf8");
  assert.match(js,/renderCostItems\(root,p\)/);
  assert.match(js,/makeTimeline/);
  assert.match(js,/adjustments\[item\.id\]/);
  assert.match(js,/target-item\.base_arrival/);
  assert.match(js,/timeline-clock-trigger/);
  assert.match(js,/wheelColumn\(wheels,"时"/);
  assert.match(js,/wheelColumn\(wheels,"分"/);
  assert.match(js,/node-reset/);
  assert.doesNotMatch(js,/input\.type="time"|调整耗时|−15 分|\+15 分/);
  assert.doesNotMatch(js,/shift\s*[+\-]=/);
  assert.match(js,/aria-controls/);
  assert.match(js,/linkedTitle/);
  assert.doesNotMatch(page,/核实来源/);
  assert.doesNotMatch(js,/fetch\(.*jma|openweathermap|weatherapi/i);
});

test('Oyama has source-backed fee inputs and does not invent unresolved rail fares',()=>{
 const p=load(path.join(dir,"oyama-day-hike","activity.json"));
 assert.equal(p.costs.currency,"JPY");
 assert.equal(p.costs.items.find(x=>x.name.includes("巴士站"))?.amount_yen,410);
 assert.equal(p.costs.items.find(x=>x.name.includes("往返电车"))?.amount_yen,null);
 assert.equal(p.costs.items.filter(x=>x.included===false)[0]?.amount_yen,640);
 const evidence=new Set(p.evidence.map(x=>x.id));
 assert.ok(p.costs.items.filter(x=>x.amount_yen!==null).every(x=>evidence.has(x.source_id)));
});

test("Oyama timeline covers inbound transit, hike and outbound transit, with evidence",()=>{
  const p=load(path.join(dir,"oyama-day-hike","activity.json"));
  assert.equal(p.preview_timing.status,"illustrative");
  assert.match(p.preview_timing.anchor_time,/^\d\d:\d\d$/);
  const stops=p.route.sections.flatMap(x=>x.stops);
  assert.ok(stops.length>=10);
  assert.equal(stops[0].offset_minutes,0);
  assert.ok(stops.every(x=>Number.isInteger(x.offset_minutes)));
  assert.ok(stops.every((x,i)=>i===0||x.offset_minutes>=stops[i-1].offset_minutes));
  assert.ok(stops.every(x=>x.node_id));
  assert.ok(p.transport.inbound.filter(x=>x.mode==="scheduled_transit").every(x=>x.timetable===null));
  assert.ok(p.transport.outbound.every(x=>x.timetable===null));
  const ids=new Set(p.evidence.map(x=>x.id));
  for(const stop of stops)assert.ok(ids.has(stop.source_id),"missing inline source reference for "+stop.name);
  for(const leg of [...p.transport.inbound,...p.transport.outbound])
    if(leg.source_id) assert.ok(ids.has(leg.source_id));
  assert.equal(p.weather.status,"pending","moving a preview timeline cannot claim actual weather");
});

test("Okutama shared JR segment stores all verified trip-day trains",()=>{
  const p=JSON.parse(readFileSync(path.join(site,"plans","2026-10-18-okutama-trail","activity.json"),"utf8"));
  const leg=p.transport.outbound.find(x=>x.node_id==="after-okutama-jr");
  assert.equal(leg.timetable_coverage.scope,"full_day");
  assert.equal(leg.timetable_coverage.service_date,p.constraints.date);
  assert.equal(leg.timetable_coverage.service_count,leg.timetable_options.length);
  assert.equal(leg.timetable_options.length,37);
  assert.equal(new Set(leg.timetable_options.map(x=>x.service_id)).size,37);
  assert.ok(leg.timetable_options.every(x=>x.service_date===p.constraints.date&&p.evidence.some(e=>e.id===x.source_id&&e.status==="verified")));
  assert.equal(leg.timetable_options.some(x=>x.departure_time==="17:34"),false,"exclude the special train that does not run on the plan date");
});

test("day trip is explicit in schema and UI",()=>{
  const schema=load(path.join(root,"schemas","activity.schema.json"));
  assert.ok(schema.required.includes("trip_type"));
  assert.equal(schema.properties.trip_type.const,"day_trip");
  const html=readFileSync(path.join(site,"plan.html"),"utf8");
  assert.match(html,/DAY HIKE/);
  const js=readFileSync(path.join(site,"assets","detail.js"),"utf8");
  assert.match(js,/trip_type/);
  assert.match(js,/adjustments\[item\.id\]/);
  assert.match(js,/makeTimeline/);
  assert.match(js,/linkedTitle/);
  const css=readFileSync(path.join(site,"assets","site.css"),"utf8");
  assert.match(css,/:focus-visible/);
  assert.match(css,/prefers-reduced-motion/);
});

test("browser loads a pure scenario engine and fixed transit has no invented clock",()=>{
  const html=readFileSync(path.join(site,"plan.html"),"utf8");
  assert.match(html,/type="module" src="\.\/assets\/detail\.js\?v=/);
  const js=readFileSync(path.join(site,"assets","detail.js"),"utf8");
  const model=readFileSync(path.join(site,"assets","timeline.mjs"),"utf8");
  assert.match(js,/from "\.\/timeline\.mjs"/);
  assert.match(js,/missed|已错过|换乘风险/);
  assert.match(model,/validTimetable/);
  assert.doesNotMatch(model,/fetch\(|XMLHttpRequest|localStorage/);
  const p=load(path.join(dir,"oyama-day-hike","activity.json"));
  assert.equal(p.constraints.date,null);
  assert.equal(p.transport.outbound[0].timetable,null);
});

test('all published plans validate against JSON Schema and node references',async()=>{
 const {default:Ajv}=await import('ajv/dist/2020.js');
 const {default:addFormats}=await import('ajv-formats');
 const ajv=new Ajv({allErrors:true,strict:false});addFormats(ajv);
 const validate=ajv.compile(load(path.join(root,'schemas/activity.schema.json')));
 for(const id of plans){
  const p=load(path.join(dir,id,'activity.json'));
  assert.ok(validate(p),id+': '+JSON.stringify(validate.errors));
  const nodes=[...(p.transport?.inbound||[]),...(p.route?.sections||[]).flatMap(x=>x.stops),...(p.transport?.outbound||[])];
  const ids=nodes.map(x=>x.node_id).filter(Boolean);
  assert.equal(new Set(ids).size,ids.length,id+' duplicate node IDs');
  const sources=new Set(p.evidence.map(x=>x.id));
  for(const node of nodes) if(node.source_id) assert.ok(sources.has(node.source_id));
 }
});

test('Kintoki plan shows the full YAMAP route and derived mountain times',()=>{
 const p=load(path.join(dir,'2026-10-17-kintoki-yokohama','activity.json'));
 const stops=p.route.sections.flatMap(section=>section.stops);
 assert.equal(p.route.expanded_by_default,true);
 assert.equal(stops.length,9);
 assert.ok(stops.some(x=>x.name==='金時宿り石'));
 assert.ok(stops.some(x=>x.name==='公時神社分岐（山頂側）'));
 assert.match(p.route.duration_reference,/3時間05分.*3\.8 km.*516 m/);
 const timeline=makeTimeline(p);
 assert.equal(timeline.trail[0].arrival,540);
 assert.equal(timeline.trail.find(x=>x.id==='summit')?.arrival,665);
 assert.equal(timeline.trail.at(-1)?.arrival,725);
 assert.ok(timeline.trail.every(x=>x.arrival!==null));
 assert.ok(timeline.trail.every(x=>x.status==='illustrative'),'route times stay clearly illustrative while bus service is unresolved');
});

test('Nenogongen draft preserves the meeting cutoff and leaves both descent branches unresolved',()=>{
 const p=JSON.parse(readFileSync(path.join(root,'site/plans/nenogongen-relaxed-day-hike/activity.json'),'utf8'));
 assert.equal(p.constraints.date,'2026-11-03');
 assert.match(p.constraints.hard_rules.join(' '),/10:00.*10:38/);
 assert.equal(p.preview_timing.anchor_time,'10:00');
 assert.match(p.preview_timing.notice,/10:38.*不是列车时刻|10:00–10:38.*等待窗口/);
 assert.equal(p.route.alternatives.length,2);
 const stops=p.route.sections.flatMap(s=>s.stops);
 assert.equal(stops.find(s=>s.node_id==='departure-cutoff')?.offset_minutes,38,'the delay buffer is represented as its own adjustable node');
 assert.ok(stops.find(s=>s.node_id==='nenogongen').offset_minutes>stops.find(s=>s.node_id==='departure-cutoff').offset_minutes,'hike estimates begin after the departure decision');
 assert.ok(p.transport.inbound.every(x=>x.timetable===null&&x.schedule_status==='pending'));
 assert.ok(p.transport.outbound.every(x=>x.timetable===null&&x.schedule_status==='pending'));
 assert.equal(p.weather.status,'pending');
});

test('node clocks remain visible and use minute wheels with a node reset',()=>{
 const js=readFileSync(path.join(site,'assets','detail.js'),'utf8');
 const css=readFileSync(path.join(site,'assets','site.css'),'utf8');
 assert.match(js,/timeline-clock-trigger/);
 assert.match(js,/wheelColumn\(wheels,"时"/);
 assert.match(js,/wheelColumn\(wheels,"分"/);
 assert.match(js,/node-reset/);
 assert.doesNotMatch(js,/调整耗时|−15 分|\+15 分/);
 assert.match(css,/\.time-wheel\{[^}]*scroll-snap-type:y mandatory/);
 assert.match(css,/\.timeline-clock-trigger\{[^}]*font-size:18px/);
});


test('offline UI fixture is real route data and contains no invented live conditions',async()=>{
 const {default:Ajv}=await import('ajv/dist/2020.js');const {default:addFormats}=await import('ajv-formats');
 const ajv=new Ajv({allErrors:true,strict:false});addFormats(ajv);
 const p=load(path.join(root,'tests','fixtures','offline-oyama-test.json'));
 assert.ok(ajv.compile(load(path.join(root,'schemas','activity.schema.json')))(p));
 assert.equal(p.example_only,true);assert.equal(p.trip_type,'day_trip');assert.equal(p.constraints.date,null);
 assert.equal(p.weather.status,'pending');assert.ok(p.transport.inbound.every(x=>x.timetable===null));
 assert.ok(p.transport.outbound.every(x=>x.timetable===null));assert.equal(p.preview_timing.status,'illustrative');
});


test('offline launcher is loopback-only and read-only',()=>{
 const source=readFileSync(path.join(root,'scripts','serve.mjs'),'utf8');
 assert.match(source,/server\.listen\(port,\s*['"]127\.0\.0\.1['"]/) ;
 assert.match(source,/\['GET','HEAD'\]/);
 assert.match(source,/server\.address\(\)\.port/);
});

test('Kumotori is the primary complete route, with real last return bus and separate fallbacks',()=>{
 const p=load(path.join(dir,'2026-11-21-kumotori-direction','activity.json'));
 assert.equal(p.destination.state,'fixed');
 assert.equal(p.route.primary_goal,'kumotori-summit');
 assert.match(p.title,/雲取山/);
 assert.equal(p.status,'needs_review');
 const stops=p.route.sections.flatMap(x=>x.stops);
 assert.equal(stops.length,18);
 assert.equal(stops.at(-1).offset_minutes,571);
 assert.equal(stops.find(x=>x.node_id==='trail-kumotori-summit')?.offset_minutes,336);
 assert.ok(stops.some(x=>x.name.includes('雲取山')));
 const keys=new Set(stops.map(x=>x.node_id));assert.equal(keys.size,stops.length);
 assert.deepEqual(p.route.scenarios.map(x=>x.id),['nanatsuishi','hut']);
 assert.equal(p.route.scenarios[0].sections.at(-1).stops.at(-1).offset_minutes,401);
 assert.equal(p.route.scenarios[0].suggested_bus_departure,'16:08');
 assert.equal(p.route.scenarios[1].suggested_bus_departure,'15:02');
 assert.equal(p.route.scenarios[1].sections.at(-1).stops.at(-1).offset_minutes,336);
 const services=p.transport.outbound[0].timetable_options;
 assert.ok(services.some(x=>x.departure_time==='18:04'&&x.arrival_time==='18:40'));
 const main=makeTimeline(p);
 assert.equal(main.before[0].departure,8*60+35);
 assert.equal(main.before[0].scheduled_arrival,9*60+9);
 assert.equal(main.trail.find(x=>x.id==='trail-kumotori-summit').arrival,14*60+45);
 assert.equal(main.trail.at(-1).arrival,18*60+40);
 assert.equal(main.after[0].status,'connection_missed','08:35 start cannot catch last 18:04 bus after 18:40 trail finish');
 const finalService=services.find(x=>x.departure_time==='18:04');
 const late=makeTimeline(p,{}, {'after-kamosawa-okutama':finalService.service_id});
 assert.equal(late.after[0].departure,18*60+4);
 assert.equal(late.after[0].status,'connection_missed','18:04 last bus leaves before 18:40 trail completion');
 const seven={...p,route:{...p.route,sections:p.route.scenarios[0].sections}};
 assert.equal(makeTimeline(seven).trail.at(-1).arrival,15*60+50);
 const sevenBus=services.find(x=>x.departure_time==='16:08');
 const sevenTimeline=makeTimeline(seven,{}, {'after-kamosawa-okutama':sevenBus.service_id});
 assert.equal(sevenTimeline.after[0].status,'fixed');
 assert.equal(sevenTimeline.after[0].departure,16*60+8);
 assert.equal(sevenTimeline.after[0].departure-sevenTimeline.trailEnd,18);
 const hut={...p,route:{...p.route,sections:p.route.scenarios[1].sections}};
 assert.equal(makeTimeline(hut).trail.at(-1).arrival,14*60+45);
 const hutBus=services.find(x=>x.departure_time==='15:02');
 const hutTimeline=makeTimeline(hut,{}, {'after-kamosawa-okutama':hutBus.service_id});
 assert.equal(hutTimeline.after[0].status,'fixed');
 assert.equal(hutTimeline.after[0].departure-hutTimeline.trailEnd,17);
 const js=readFileSync(path.join(site,'assets/detail.js'),'utf8');
 assert.match(js,/route-scenario-picker/);
 assert.match(js,/selectedScenario/);
 assert.match(js,/makeTimeline\(viewedPlan/);
});

test('Kumotori contingency has evidence, actionable recovery and conditional boarding window',()=>{
 const p=load(path.join(dir,'2026-11-21-kumotori-direction','activity.json'));
 assert.equal(p.contingency.scope,'return_transport_failure');
 assert.equal(p.contingency.applies_to_date,p.constraints.date);
 assert.ok(p.contingency.checked_at);
 const evidence=new Set(p.evidence.map(x=>x.id));
 const fallback=p.contingency.options.find(x=>x.id==='tozura_bus');
 assert.equal(fallback.departure_stop.startsWith('留浦'),true);
 assert.equal(fallback.departure_time,'18:47');
 assert.equal(fallback.arrival_time,'19:22');
 assert.equal(fallback.walk_minutes_estimate,10);
 assert.equal(fallback.preboarding_buffer_minutes,10);
 assert.equal(fallback.recommended_kamosawa_cutoff,'18:27');
 assert.ok(p.contingency.options.every(x=>x.source_ids.length&&x.source_ids.every(id=>evidence.has(id))),"every contingency must have evidence");
 assert.equal(p.contingency.options.filter(x=>x.kind==='taxi').length,2);
 assert.ok(p.contingency.options.some(x=>x.kind==='lodging'));
 assert.ok(p.contingency.options.some(x=>x.kind==='rescue'&&x.status==='emergency_only'));
 assert.ok(p.contingency.options.filter(x=>['taxi','lodging'].includes(x.kind))
   .every(x=>x.status==='requires_advance_confirmation'),"contacts are not reservations");
 const main=makeTimeline(p);
 assert.equal(main.trailEnd,18*60+40);
 const cutoff=18*60+47-fallback.walk_minutes_estimate-fallback.preboarding_buffer_minutes;
 assert.ok(main.trailEnd>cutoff,"main route cannot reliably reach Tozura");
 const seven={...p,route:{...p.route,sections:p.route.scenarios[0].sections}};
 assert.equal(makeTimeline(seven).trailEnd,15*60+50);
 assert.ok(makeTimeline(seven).trailEnd<cutoff);
 const js=readFileSync(path.join(site,'assets','detail.js'),'utf8');
 assert.match(js,/renderReturnContingency\(p,contingencyBox,schedule\)/);
 assert.match(js,/schedule\.trailEnd/);
 assert.match(js,/walk_minutes_estimate/);
 assert.match(js,/preboarding_buffer_minutes/);
 const skill=readFileSync(path.join(root,'skills','hike-planner','SKILL.md'),'utf8');
 assert.match(skill,/Missed transport, no-service and rescue contingencies \(MANDATORY\)/);
 assert.match(skill,/do it before marking the route travel-ready|Do it before marking the route travel-ready/);
});
