import assert from 'node:assert/strict';import fs from 'node:fs';
Object.assign(globalThis,{window:{addEventListener(){},removeEventListener(){}},document:{addEventListener(){},removeEventListener(){},hidden:false}});
const {GameEngine}=await import('../src/game/engine');
const {obstacleDistance}=await import('../src/game/world');
const {BANG_RAK_COMPLETION}=await import('../src/game/bangkok/bangRakCompletion');
const e=new GameEngine({seed:26}),d=e.model.district,results:any[]=[],failures:any[]=[];
for(const c of BANG_RAK_COMPLETION.courts)for(let i=0;i<=80;i++){
 const p={x:c.a.x+(c.b.x-c.a.x)*i/80,z:c.a.z+(c.b.z-c.a.z)*i/80};
 const bad=d.obstacles.find(o=>obstacleDistance(p,o)<.6);
 if(bad)failures.push({path:c.id,t:i/80,body:bad.environmentId??bad.landmarkId,distance:obstacleDistance(p,bad)});
}
e.start('free');
for(const id of ['grand-postal','warehouse-30','state','assumption','royal-orchid','house-no-1','customs-house']) {
 const l=d.landmarks.find(l=>l.id===id)!,n=d.nodes.find(n=>n.id===l.accessNode)!;
 e.resume();Object.assign(e.model.player,{x:n.x,z:n.z,speed:0,collision:0});
 const opened=e.viewLandmark(id);results.push({id,stop:n.id,opened,target:e.model.snapshot.viewingLandmark});assert(opened,'LOOK opens from public arrival '+id);
}
const r={pass:failures.length===0,walkingSamples:BANG_RAK_COMPLETION.courts.length*81,failures,look:results};
fs.writeFileSync(new URL('../../../docs/qa/bang-rak-completion/validation/entrances.json',import.meta.url),JSON.stringify(r,null,2)+'\n');assert.equal(failures.length,0,JSON.stringify(failures));console.log(r);
