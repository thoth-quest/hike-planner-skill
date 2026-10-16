import { chromium } from 'playwright';
import { readFile, mkdir, mkdtemp, cp, writeFile } from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=await mkdtemp(path.join(tmpdir(),'hike-planner-offline-'));
await cp(path.resolve('site'),root,{recursive:true});
const fixture=JSON.parse(await readFile('tests/fixtures/offline-oyama-test.json','utf8'));
const currentOyama=JSON.parse(await readFile('site/plans/oyama-day-hike/activity.json','utf8'));
fixture.costs=currentOyama.costs;
// Synthetic browser-only schedule records exercise choosing verified adjacent services.
fixture.constraints.date='2026-10-24';
fixture.evidence.push({id:'browser-timetable',url:'https://example.org/test-timetable',status:'verified',checked_at:'2026-10-16T10:00:00+09:00'});
const sampleLeg=fixture.transport.inbound.find(x=>x.mode==='scheduled_transit');
sampleLeg.reference_time='07:30';
sampleLeg.timetable_options=['07:00','07:15','07:45','08:00'].map((departure,index)=>({
 service_date:'2026-10-24',departure_time:departure,arrival_time:`${String(Number(departure.slice(0,2))+1).padStart(2,'0')}:${departure.slice(3)}`,
 checked_at:'2026-10-16T10:00:00+09:00',source_id:'browser-timetable',service_id:`TEST-${index+1}`
}));
await mkdir(path.join(root,'plans',fixture.id),{recursive:true});
await writeFile(path.join(root,'plans',fixture.id,'activity.json'),JSON.stringify(fixture));
const manifest=JSON.parse(await readFile(path.join(root,'plans/index.json'),'utf8'));manifest.plans.push(fixture.id);
await writeFile(path.join(root,'plans/index.json'),JSON.stringify(manifest));
const server=spawn(process.execPath,['scripts/serve.mjs','0'],{env:{...process.env,SITE_ROOT:root},stdio:['ignore','pipe','inherit']});
let startup='';
const base=await new Promise((resolve,reject)=>{
 server.stdout.setEncoding('utf8');
 server.stdout.on('data',chunk=>{startup+=chunk;const match=startup.match(/http:\/\/127\.0\.0\.1:(\d+)\//);if(match)resolve(`http://127.0.0.1:${match[1]}/`);});
 server.once('error',reject);server.once('exit',code=>reject(Error('offline server exited '+code)));
});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
try {
 for(const width of [375,1280]){
  const context=await browser.newContext({viewport:{width,height:850}});
  const external=[];
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();
   external.push(url.href);return route.abort();
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'plan.html?id=offline-oyama-test');
  await page.locator('#detail-status').filter({hasText:'已读取当前计划'}).waitFor();
  await page.locator('#tab-costs').click();
  assert.match(await page.locator('.cost-summary').innerText(),/¥820/);
  assert.match(await page.locator('.cost-pending').innerText(),/往返电车/);
  if(process.env.CJK_FONT_PATH){const font=(await readFile(process.env.CJK_FONT_PATH)).toString('base64');await page.addStyleTag({content:`@font-face{font-family:'Noto Sans SC';font-style:normal;font-weight:100 900;src:url(data:font/woff2;base64,${font}) format('woff2')} :root{font-family:'Noto Sans SC',sans-serif}`});}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
  for(const name of ['overview','weather','route','costs','history']){
   await page.locator('#tab-'+name).click();assert.equal(await page.locator('#panel-'+name).isVisible(),true);
  }
  await page.locator('#tab-route').press('ArrowRight');assert.equal(await page.locator('#panel-costs').isVisible(),true);
  await page.locator('#tab-overview').press('Home');assert.equal(await page.locator('#panel-overview').isVisible(),true);
  await page.locator('#tab-route').click();
  const firstTransit=page.locator('.timeline-item').filter({has:page.getByRole('heading',{name:/铁路到伊势原/})});
  assert.equal(await firstTransit.locator('.service-choice').count(),4,'two actual options before and after the requested time');
  await firstTransit.getByRole('button',{name:/07:45 → 08:45/}).click();
  assert.match(await firstTransit.innerText(),/固定班次.*TEST-3/);
  await page.getByRole('button',{name:'清除全部调整'}).click();
  assert.match(await firstTransit.innerText(),/班次待查/);
  await page.getByRole('button',{name:'展开全部 14 个登山节点'}).click();
  const summit=page.locator('.timeline-item').filter({has:page.getByRole('heading',{name:'大山山顶 ↗',exact:true})});
  const finish=page.locator('.timeline-item').filter({has:page.getByRole('heading',{name:'大山ケーブル（巴士站） ↗',exact:true})}).last();
  assert.equal(await finish.locator('.timeline-time').innerText(),'15:40');
  await summit.locator('input[type="time"]').fill('12:10');
  assert.equal(await finish.locator('.timeline-time').innerText(),'16:00','native time picker changes this node and later nodes');
  await page.getByRole('button',{name:'清除全部调整'}).click();
  assert.equal(await finish.locator('.timeline-time').innerText(),'15:40');
  await summit.getByRole('button',{name:'调整耗时',exact:true}).click();
  await summit.getByRole('button',{name:'+15 分',exact:true}).click();
  assert.equal(await summit.locator('.timeline-time').innerText(),'11:50');
  assert.equal(await finish.locator('.timeline-time').innerText(),'15:55');
  const midRoute=page.locator('.timeline-item').filter({has:page.getByRole('heading',{name:/见晴台 ↗/})});
  await midRoute.locator('input[type="time"]').fill('14:00');
  assert.equal(await midRoute.locator('.timeline-time').innerText(),'14:00','later node time uses its current arrival after upstream delay');
  assert.equal(await finish.locator('.timeline-time').innerText(),'16:25','later node adjustment propagates only downstream');
  assert.equal(await page.locator('.timeline-item').count(),17);
  await page.getByRole('button',{name:'清除全部调整'}).click();
  assert.equal(await finish.locator('.timeline-time').innerText(),'15:40');
  await page.reload();await page.locator('#detail-status').filter({hasText:'已读取当前计划'}).waitFor();
  assert.equal(await page.locator('.node-delay').count(),0);
  await page.goto(base);await page.locator('.plan-card').first().waitFor();
  await page.locator('#filter').fill('oyama-day-hike');assert.equal(await page.locator('.plan-card').count(),1);
  await page.locator('#filter').fill('no-such-plan');assert.match(await page.locator('#plan-list').innerText(),/没有匹配/);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[],'no Internet request should be required');console.log(`PASS ${width}px: offline load, tabs, keyboard, delay, reset, expansion, reload, catalogue, overflow`);
  await context.close();
 }
}finally{await browser.close();server.kill('SIGTERM');}
