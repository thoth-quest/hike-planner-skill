import { chromium } from 'playwright';
import { readFile, mkdir, mkdtemp, cp, writeFile } from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=await mkdtemp(path.join(tmpdir(),'hike-planner-offline-'));
await cp(path.resolve('site'),root,{recursive:true});
const fixture=JSON.parse(await readFile('tests/fixtures/offline-oyama-test.json','utf8'));
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
await mkdir('test-results',{recursive:true});
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
  if(process.env.CJK_FONT_PATH){const font=(await readFile(process.env.CJK_FONT_PATH)).toString('base64');await page.addStyleTag({content:`@font-face{font-family:'Noto Sans SC';font-style:normal;font-weight:100 900;src:url(data:font/woff2;base64,${font}) format('woff2')} :root{font-family:'Noto Sans SC',sans-serif}`});}
  await page.screenshot({path:`test-results/${process.env.SHOT_PREFIX||'after'}-${width}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
  for(const name of ['overview','weather','history','route']){
   await page.locator('#tab-'+name).click();assert.equal(await page.locator('#panel-'+name).isVisible(),true);
  }
  await page.locator('#tab-route').press('ArrowRight');assert.equal(await page.locator('#panel-overview').isVisible(),true);
  await page.locator('#tab-overview').press('Home');
  const summit=page.locator('.timeline-item').filter({has:page.getByRole('heading',{name:'大山山顶 ↗',exact:true})});
  const finish=page.locator('.timeline-item').filter({has:page.getByRole('heading',{name:'大山ケーブル（巴士站） ↗',exact:true})}).last();
  assert.equal(await finish.locator('.timeline-time').innerText(),'15:40');
  await summit.getByRole('button',{name:'调整耗时',exact:true}).click();
  await summit.getByRole('button',{name:'+15 分',exact:true}).click();
  assert.equal(await summit.locator('.timeline-time').innerText(),'11:50');
  assert.equal(await finish.locator('.timeline-time').innerText(),'15:55');
  await summit.screenshot({path:`test-results/${process.env.SHOT_PREFIX||'after'}-adjust-${width}.png`});
  await page.getByRole('button',{name:'展开全部 14 个登山节点'}).click();
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
