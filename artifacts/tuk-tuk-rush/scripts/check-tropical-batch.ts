import assert from 'node:assert/strict';
import * as T from 'three';
import {ArchitecturalBatch, type ArtPiece} from '../src/game/bangkok/architecturalBatch';
import {pieceVolume} from '../src/game/bangkok/spatialValidation';
import {obstacleDistance} from '../src/game/world';
import {disposeObject} from '../src/game/assets';
import {emitTropicalPlant} from '../src/game/bangkok/tropicalVegetation';
const material=new T.MeshBasicMaterial(), night=new T.MeshBasicMaterial(), batch=new ArchitecturalBatch(material,night);
const pieces:ArtPiece[]=[0,240].map(x=>({x,y:12,z:30,w:4,h:2,d:7,yaw:.7,pitch:.6,shape:'frond',color:'#3f8238'}));
for(const p of pieces)batch.add(p);
const roots=batch.finish(),meshes=roots.map(r=>r.children[0] as T.InstancedMesh);
assert.equal(meshes.length,2);
assert.equal(meshes[0]!.geometry.attributes.position!.array,meshes[1]!.geometry.attributes.position!.array,'Repeated leaves across cells must share vertex storage');
for(let i=0;i<meshes.length;i++){
 const mesh=meshes[i]!,p=pieces[i]!,actual=new T.Matrix4();mesh.getMatrixAt(0,actual);
 const expected=new T.Matrix4().compose(new T.Vector3(p.x,p.y,p.z),new T.Quaternion().setFromEuler(new T.Euler(p.pitch,p.yaw,0,'YXZ')),new T.Vector3(p.w,p.h,p.d));
 actual.elements.forEach((v,j)=>assert(Math.abs(v-expected.elements[j]!)<1e-5,'Pitched foliage must retain its rotation in instanced rendering'));
 const volume=pieceVolume(p,'test'),positions=mesh.geometry.attributes.position!;
 for(let v=0;v<positions.count;v++){
  const point=new T.Vector3().fromBufferAttribute(positions,v).applyMatrix4(actual);
  assert(obstacleDistance(point,volume)<1e-4,'Visible frond must fit the clearance volume');
  assert(point.y>=volume.minY-1e-4&&point.y<=volume.maxY+1e-4);
 }
 assert(mesh.boundingBox!.containsPoint(new T.Vector3(p.x,p.y,p.z)));
}
let disposed=0;material.addEventListener('dispose',()=>disposed++);const root=new T.Group();root.add(...roots);disposeObject(root);assert.equal(disposed,1);
// Test the rendered branch transforms, not only a nominal tree bounding box.
// Branch bottoms must join the trunk; reversed pitch previously made floating
// support-like limbs even though the overall canopy clearance was valid.
for(const detail of [true,false]) {
 const art:ArtPiece[]=[];emitTropicalPlant({x:100,z:200},'tamarind',47,p=>art.push(p),detail);
 const trunk=art[0]!;
 for(const branch of art.filter(p=>p.shape==='cylinder').slice(1)) {
  const m=new T.Matrix4().compose(new T.Vector3(branch.x,branch.y,branch.z),new T.Quaternion().setFromEuler(new T.Euler(branch.pitch??0,branch.yaw,0,'YXZ')),new T.Vector3(branch.w,branch.h,branch.d));
  const bottom=new T.Vector3(0,-.5,0).applyMatrix4(m);
  assert(Math.hypot(bottom.x-trunk.x,bottom.z-trunk.z)<.01,'Tamarind limb must physically join its trunk');
  assert(bottom.y<=trunk.y+trunk.h/2&&bottom.y>=trunk.y,'Tree joint must lie on the upper trunk');
 }
}
console.log(JSON.stringify({pass:true,sharedLeaves:true,pitchedVisibleGeometryInsideClearance:true,sharedDisposalOnce:true}));
