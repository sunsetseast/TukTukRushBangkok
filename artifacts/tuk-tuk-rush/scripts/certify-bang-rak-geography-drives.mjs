import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const out=new URL('../../../docs/qa/bang-rak-geography/validation/',import.meta.url);const results=[];
for(const matrix of ['retained-bang-rak','new-seam'])for(const seed of [982,41,67]){
 const file=`${matrix}-legal-${seed}.json`;
 const env={...process.env,CHINATOWN_LEGAL:'1',CHINATOWN_TRAFFIC:'1',CHINATOWN_LANES:'1',CHINATOWN_TRAFFIC_SEED:String(seed),CHINATOWN_OUTPUT:`../../../docs/qa/bang-rak-geography/validation/${file}`};
 if(matrix==='retained-bang-rak')env.BANG_RAK_ROUTES='1';else env.BANG_RAK_GEOGRAPHY_ROUTES='1';
 const r=spawnSync(process.execPath,['--import','tsx','scripts/check-chinatown-drives.ts'],{env,encoding:'utf8',maxBuffer:32*1024*1024});
 fs.writeFileSync(new URL(file+'.log',out),(r.stdout??'')+(r.stderr??''));results.push({matrix,seed,exitCode:r.status,file});
 fs.writeFileSync(new URL('geography-driving-matrices.json',out),JSON.stringify(results,null,2)+'\n');console.log(matrix,seed,r.status);
}
process.exitCode=results.some(r=>r.exitCode!==0)?1:0;
