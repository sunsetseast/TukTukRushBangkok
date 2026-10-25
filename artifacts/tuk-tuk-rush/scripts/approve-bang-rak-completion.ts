import fs from 'node:fs';
import {createBangkokWorld} from '../src/game/bangkok/world';
import {roadGraphKey,cityGraphApprovalKey} from '../src/game/bangkok/roadIdentity';
import {BANG_RAK_COMPLETION,bangRakCompletionState} from '../src/game/bangkok/bangRakCompletion';
const d=createBangkokWorld({authoring:true}),s=bangRakCompletionState(d)!;
const file=new URL('../src/game/bangkok/cityData.v1.json',import.meta.url),j=JSON.parse(fs.readFileSync(file,'utf8'));
j.roadBaseline={...j.roadBaseline,version:6,key:roadGraphKey(d),fullGraphKey:cityGraphApprovalKey(d),roads:d.roads.length,nodes:d.nodes.length,sourceStages:[...j.roadBaseline.sourceStages.filter((s:string)=>s!=='bang-rak-completion-v1'),'bang-rak-completion-v1'],status:'approved-bang-rak-completion-v1-explicit-migration'};
for(const site of BANG_RAK_COMPLETION.sites) {
 const feature={id:site.id,name:site.name,category:site.kind,model:{origin:site.origin,rotation:site.yaw,size:Math.max(site.w,site.d),placement:"approved-pr44-compressed",builder:"bang-rak-completion",design:[site.origin.x/4+500,site.origin.z/4+600]},featureOffset:{x:0,z:0},requestPin:null,compressionReason:site.note};
 const i=j.features.findIndex((f:any)=>f.id===site.id);if(i<0)j.features.push(feature);else j.features[i]=feature;
}
fs.writeFileSync(file,JSON.stringify(j,null,2)+'\n');
fs.writeFileSync(new URL('../../../docs/qa/bang-rak-completion/district-plan.json',import.meta.url),JSON.stringify({roads:s.roads,retired:s.retired,parcels:s.parcels,rejectedFrontageCandidates:s.rejected,landmarks:d.landmarks.slice(-4)},null,2)+'\n');
console.log({roads:d.roads.length,nodes:d.nodes.length,parcels:s.parcels.length,retired:s.retired.length});
