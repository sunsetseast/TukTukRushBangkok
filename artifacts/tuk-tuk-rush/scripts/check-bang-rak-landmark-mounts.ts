import assert from 'node:assert/strict';import fs from 'node:fs';
import {BANG_RAK_DESTINATIONS,emitBangRakDestinations} from '../src/game/bangkok/bangRakDestinations';
import {orientedFootprintsOverlap} from '../src/game/world';import type {District,Obstacle} from '../src/game/types';import type {ArtPiece} from '../src/game/bangkok/architecturalBatch';
const all:ArtPiece[]=[];emitBangRakDestinations({landmarks:BANG_RAK_DESTINATIONS.map(s=>({id:s.id}))} as District,p=>all.push(p));
const failures:any[]=[],sites:any[]=[];
for(const site of BANG_RAK_DESTINATIONS){
 const pieces=all.filter(p=>p.siteId===site.id),joined=new Set(pieces.flatMap((p,i)=>p.y-p.h/2<=.02?[i]:[]));
 let changed=true;while(changed){changed=false;for(let i=0;i<pieces.length;i++){if(joined.has(i))continue;const p=pieces[i]!;for(const j of joined){const q=pieces[j]!;if(Math.abs(p.y-q.y)>(p.h+q.h)/2+.03)continue;if(orientedFootprintsOverlap({...p,height:p.h} as Obstacle,{...q,height:q.h} as Obstacle,.03)){joined.add(i);changed=true;break;}}}}
 for(let i=0;i<pieces.length;i++)if(!joined.has(i))failures.push({site:site.id,index:i,piece:pieces[i]});
 sites.push({id:site.id,pieces:pieces.length,connectedToGround:joined.size});
}
const report={pass:!failures.length,method:'Production landmark pieces: a 3-D bounding-volume support graph must connect each modeled component to a grounded structural component (3 cm tolerance). Detects detached facade skins, window panels and trim; not a structural engineering or pixel-occlusion proof.',sites,failures};
fs.writeFileSync(new URL('../../../docs/qa/bang-rak-completion/validation/landmark-mounts.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert.equal(failures.length,0,JSON.stringify(failures.slice(0,8)));
