import {spawnSync} from 'node:child_process';
for(const seed of [982,41,67]){
 const r=spawnSync(process.execPath,['--import','tsx','scripts/check-chinatown-drives.ts'],{stdio:'inherit',env:{...process.env,CHINATOWN_TRAFFIC:'1',CHINATOWN_LEGAL:'1',CHINATOWN_TRAFFIC_SEED:String(seed),CHINATOWN_OUTPUT:`../../../docs/qa/chinatown-completion/validation/legal-${seed}.json`}});
 if(r.status!==0)process.exit(r.status??1);
}
