import {createServer} from 'vite';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
// Isolate dependency optimization across simultaneous baseline/final servers.
// A shared node_modules cache can otherwise trigger a mid-capture full reload.
const port=Number(process.argv[2]);
// Evidence capture must not reload when a separate QA report or script is
// written. Source changes require a fresh capture process, never live HMR.
const baseline=process.env.GEOGRAPHY_QA_BASELINE_REF;
if(baseline&&!/^[0-9a-f]{40}$/.test(baseline))throw Error('QA baseline must be a pinned commit SHA');
const historical=new Set(['src/game/bangkok/clearanceIndex.ts',...['buildings.ts','dataset.ts','rendering.ts','Prototype.tsx','streaming.ts'].map(f=>`src/game/bangkok/geographic/${f}`)]);
const server=await createServer({
  cacheDir:path.join(os.tmpdir(),`tuktuk-qa-vite-${port}-${baseline?.slice(0,12)??'working'}`),
  plugins:baseline?[{name:'pinned-geography-qa-baseline',enforce:'pre',load(id){
    const relative=path.relative(process.cwd(),id.split('?')[0]);
    if(historical.has(relative))return execFileSync('git',['show',`${baseline}:artifacts/tuk-tuk-rush/${relative}`],{encoding:'utf8',maxBuffer:8*1024*1024});
  }}]:[],
  server:{host:'127.0.0.1',port,strictPort:true,hmr:false,watch:{ignored:['**/scripts/**']}}
});
await server.listen();
