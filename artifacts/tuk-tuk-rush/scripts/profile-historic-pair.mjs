import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
const current=path.resolve(import.meta.dirname,'../../..'),baseline=process.env.CITY_BASELINE_CHECKOUT;
if(!baseline)throw Error('Set CITY_BASELINE_CHECKOUT to the isolated PR31 worktree');
const profiler=await fs.readFile(new URL('./profile-city-inventory.ts',import.meta.url));
await fs.writeFile(path.join(baseline,'artifacts/tuk-tuk-rush/scripts/profile-city-inventory.ts'),profiler);
for(const [label,checkout] of [['before',baseline],['after',current]]){
 const output=path.join(current,`docs/qa/historic-bangkok/inventory-${label}.json`);
 const child=spawn(process.execPath,['--import','tsx','scripts/profile-city-inventory.ts'],{cwd:path.join(checkout,'artifacts/tuk-tuk-rush'),env:{...process.env,CITY_INVENTORY_OUTPUT:output},stdio:['ignore','pipe','pipe']});
 let log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
 const code=await new Promise(r=>child.on('exit',r));if(code)throw Error(log);
 const d=JSON.parse(await fs.readFile(output,'utf8'));console.log(label,JSON.stringify({wallMs:d.constructionMs,cpuMs:d.constructionCpuMs,bufferBytes:d.geometryBuffersBytes}));
}
