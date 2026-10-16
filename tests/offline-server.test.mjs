import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('local offline server returns the static app and JSON, rejects writes and traversal',async t=>{
 const child=spawn(process.execPath,['scripts/serve.mjs','0'],{stdio:['ignore','pipe','pipe']});
 t.after(()=>child.kill('SIGTERM'));
 let output='';child.stdout.setEncoding('utf8');child.stdout.on('data',x=>output+=x);
 const started=new Promise((resolve,reject)=>{
  child.stdout.on('data',()=>{const m=output.match(/http:\/\/127\.0\.0\.1:(\d+)\//);if(m)resolve(Number(m[1]));});
  child.once('error',reject);child.once('exit',code=>reject(Error('server exited '+code)));
 });
 const port=await started,base=`http://127.0.0.1:${port}/`;
 const home=await fetch(base);assert.equal(home.status,200);assert.match(await home.text(),/id="plan-list"/);
 const data=await fetch(base+'plans/oyama-day-hike/activity.json');assert.equal(data.status,200);assert.equal((await data.json()).id,'oyama-day-hike');
 assert.equal((await fetch(base,{method:'POST'})).status,405);
 assert.equal((await fetch(base+'%2e%2e/AGENTS.md')).status,404);
});
