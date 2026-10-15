import assert from 'node:assert/strict';
import * as T from 'three';
import {createBangkokWorld} from '../src/game/bangkok/world';
import {sculptedLandmark} from '../src/game/bangkok/sculptedLandmarks';
import {disposeObject} from '../src/game/assets';
import {InspectionCamera,inspectionSubject,inspectionOccluded,clearInspectionSightline} from '../src/game/inspection';
import {arrivalSign,municipalSigns,STREET_NAMES} from '../src/game/bangkok/signPlacement';
const d=createBangkokWorld(),pose={position:[0,0,0] as [number,number,number],target:[0,0,0] as [number,number,number]},camera=new InspectionCamera(),inventory=[];
for(const l of d.landmarks){
 if(l.kind==='park'){inventory.push({id:l.id,tier:'landscaped open space',preserved:true});continue;}
 const g=sculptedLandmark(l);assert(g,`Placeholder remains: ${l.id}`);let triangles=0,bytes=0,disposed=0;
 g.traverse(o=>{if(!(o instanceof T.Mesh))return;const p=o.geometry.attributes.position!;for(const v of p.array)assert(Number.isFinite(v),`Invalid mesh ${l.id}`);triangles+=(o.geometry.index?.count??p.count)/3;for(const a of Object.values(o.geometry.attributes))bytes+=a.array.byteLength;o.geometry.addEventListener('dispose',()=>disposed++);});
 assert(triangles>50);assert(triangles<300000,`Unbounded hero geometry ${l.id}`);
 const bbox=new T.Box3().setFromObject(g),s=bbox.getSize(new T.Vector3());assert(s.x<l.size!+3&&s.z<l.size!+5,`Art escapes restricted site envelope: ${l.id}: ${s.toArray()}`);
 camera.open(inspectionSubject(l));for(let i=0;i<camera.subject!.views.length;i++){camera.choose(i);for(let j=0;j<24;j++){camera.rotate(.3,.3);camera.zoom(j%2?.1:10);camera.pan(50,-50);assert(camera.update(1/60,pose,d));assert([...pose.position,...pose.target].every(Number.isFinite));const view=camera.view!;assert(camera.distance>=view.minDistance-1e-6&&camera.distance<=view.maxDistance+1e-6);assert(camera.pitch>=view.minPitch&&camera.pitch<=view.maxPitch);if(view.room){const origin=camera.subject!.origin;for(let k=0;k<3;k++)assert(pose.position[k]!-origin[k]!>=view.room.min[k]!-1e-5&&pose.position[k]!-origin[k]!<=view.room.max[k]!+1e-5,'Indoor camera escapes viewing aisle');}}
  camera.reset();assert.equal(camera.azimuth,camera.view!.azimuth);assert.equal(camera.panX,0);}
 camera.close();assert(!camera.update(1/60,pose,d));disposeObject(g);assert(disposed>0);
 inventory.push({id:l.id,tier:['pho','paknam','arun','palace'].includes(l.id!)?'hero':l.kind==='tower'?'skyline':'site-specific',residentTriangles:triangles,geometryBytes:bytes});
}
for(const a of d.destinations!){const p=arrivalSign(a),g=a.entrance,c=Math.cos(g.yaw),s=Math.sin(g.yaw),dx=p.x-g.x,dz=p.z-g.z;
 assert(Math.abs(c*dx-s*dz)<.01);assert(s*dx+c*dz<-3);assert(p.clearance>4.2);assert(p.y+p.h/2<7.1,'Board overlaps gate beam');
 assert(Math.cos(p.yaw)*c+Math.sin(p.yaw)*s<-.99,'Arrival sign faces away from approach');
}
const obstruction={x:0,z:15,w:8,d:8,height:16,color:'#fff'},eye:[number,number,number]=[0,10,35],focus:[number,number,number]=[0,5,0];assert(inspectionOccluded(eye,focus,[obstruction],''));clearInspectionSightline(eye,focus,[obstruction],'');assert(!inspectionOccluded(eye,focus,[obstruction],''));assert(eye[1]<=22);
const municipal=municipalSigns(d);assert.equal(municipal.length,STREET_NAMES.length,'Every authored street family needs a valid placement');assert.equal(new Set(municipal.map(s=>s.key)).size,municipal.length);
console.log(JSON.stringify({pass:true,inventory,arrivalSigns:d.destinations!.length,municipalSigns:municipal.map(s=>s.key),inspection:'all presets, extreme inputs, reset, indoor bounds, disposal'},null,2));
