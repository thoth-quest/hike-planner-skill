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
