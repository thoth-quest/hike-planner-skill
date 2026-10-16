// Compare deployed bytes to this checkout, not merely HTTP 200 or workflow success.
import {readFile} from 'node:fs/promises';
const base=process.env.PAGE_URL;
if(!base)throw Error('PAGE_URL required');
for(const file of ['index.html','plan.html','assets/detail.js','assets/timeline.mjs','assets/site.css','plans/index.json','plans/oyama-day-hike/activity.json']){
 const res=await fetch(new URL(file,base),{signal:AbortSignal.timeout(20000),cache:'no-store'});
 if(!res.ok)throw Error(`${file}: HTTP ${res.status}`);
 const actual=await res.text(), expected=await readFile('site/'+file,'utf8');
 if(actual!==expected)throw Error(`${file}: deployed content differs from checkout`);
 console.log('Verified '+file);
}
