import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

test("detail view has tab navigation with the route as default",()=>{
  const page=readFileSync(path.join(site,"plan.html"),"utf8");
  assert.match(page,/role="tablist"/);
  for(const name of ["route","overview","weather","history"]){
    assert.match(page,new RegExp('id="tab-'+name+'"'));
    assert.match(page,new RegExp('id="panel-'+name+'"'));
  }
  assert.match(page,/id="tab-route"[^>]+aria-selected="true"/);
  assert.doesNotMatch(page,/id="panel-route"[^>]*hidden/);
  assert.match(page,/assets\/detail\.js/);
  assert.ok(existsSync(path.join(site,"assets","detail.js")));
  const js=readFileSync(path.join(site,"assets","detail.js"),"utf8");
  assert.match(js,/makeTimeline/);
  assert.match(js,/makeTimeline/);
  assert.match(js,/adjustments\[item\.id\]/);
  assert.doesNotMatch(js,/shift\s*[+\-]=/);
  assert.match(js,/aria-controls/);
  assert.match(js,/linkedTitle/);
  assert.doesNotMatch(page,/核实来源/);
  assert.doesNotMatch(js,/fetch\(.*jma|openweathermap|weatherapi/i);
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
  assert.match(html,/type="module" src="\.\/assets\/detail\.js"/);
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
