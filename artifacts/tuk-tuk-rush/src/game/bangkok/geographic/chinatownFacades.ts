import * as T from 'three';
import area from './chinatownArea.generated.json';
import type {GeographicChunkData} from './dataset';
import type {RuntimeBuilding,BuildingEdge} from './buildings';
import {stableHash} from '../stableHash';
import {ArchitecturalBatch,type ArtPiece} from '../architecturalBatch';
import type {SignEntry} from '../../signArt';
/** Generic trade phrases, not claims about real businesses at imported addresses. */
export const GEO_SHOP_SIGNS: SignEntry[] = [
 ['gold','ร้านทอง','金店','gold'],['noodle','ก๋วยเตี๋ยว','麵家','noodle'],
 ['tea','ชาไทย','茶樓','heritage'],['coffee','กาแฟสด','COFFEE','heritage'],
 ['food','ร้านอาหาร','食堂','noodle'],['medicine','ร้านยา','藥行','pharmacy'],
 ['merchant','ร้านค้า','商行','heritage'],['hotel','โรงแรม','GUESTHOUSE','hotel'],
 ['warehouse','โกดังสินค้า','WAREHOUSE','heritage'],['fruit','ผลไม้','水果','heritage'],
 ['retail','ร้านสะดวกซื้อ','MINI MART','hotel'],['bakery','ขนม','點心','noodle'],
].map(([key,text,secondary,style],i)=>({key:key!,text:text!,secondary:secondary!,style:style as SignEntry['style'],variant:i%2,layout:'painted'}));
export type Facade = {id:string;buildingId:string;street:string;chunk:string;style:'yaowarat'|'songwat';x:number;z:number;nx:number;nz:number;width:number;height:number;floors:number;seed:number;outset:number;edge:BuildingEdge};
const segmentDistance=(x:number,z:number,s:typeof area.segments[number])=>{
 const dx=s.b[0]!-s.a[0]!,dz=s.b[1]!-s.a[1]!,l=dx*dx+dz*dz;
 const t=Math.max(0,Math.min(1,((x-s.a[0]!)*dx+(z-s.a[1]!)*dz)/(l||1)));
 return {x:s.a[0]!+dx*t,z:s.a[1]!+dz*t,distance:Math.hypot(x-s.a[0]!-dx*t,z-s.a[1]!-dz*t)};
};
export function roadClearance(x:number,z:number){let distance=Infinity;for(const s of area.segments){if(s.bridge)continue;distance=Math.min(distance,segmentDistance(x,z,s).distance-s.width/2);}return distance;}
export function geographicFacades(chunk:GeographicChunkData):Facade[]{
 const result:Facade[]=[];const [minX,maxX,minZ,maxZ]=area.bounds;
 for(const b of chunk.buildings??[]){
  if(b.minHeight>0||b.height<5||b.height>45||['roof','carport','part'].includes(b.classification))continue;
  for(const e of b.edges){
   if(e.ring!==0||!e.street||!e.collision)continue;
   const roads=area.segments.filter(s=>s.id===e.street&&area.streets.includes(s.name));if(!roads.length)continue;
   const x=chunk.origin[0]+(e.a[0]+e.b[0])/2,z=chunk.origin[1]+(e.a[1]+e.b[1])/2;
   if(x<minX!||x>maxX!||z<minZ!||z>maxZ!)continue;
   const road=roads.map(s=>({s,...segmentDistance(x,z,s)})).sort((a,b)=>a.distance-b.distance)[0]!;
   const song=road.s.name==='Song Wat Road',sb=area.songWatBounds;
   if(song&&(x<sb[0]!||x>sb[1]!||z<sb[2]!||z>sb[3]!))continue;
   const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],width=Math.hypot(dx,dz);if(width<3.2||width>65)continue;
   const ring=b.edges.filter(a=>a.polygon===e.polygon&&a.ring===0);
   const ccw=ring.reduce((n,a)=>n+a.a[0]*a.b[1]-a.b[0]*a.a[1],0)>0;
   const nx=(ccw?dz:-dz)/width,nz=(ccw?-dx:dx)/width;
   if(((road.x-x)*nx+(road.z-z)*nz)/Math.max(.1,road.distance)<.65||road.distance-road.s.width/2>18)continue;
   const margin=Math.min(...[-.45,0,.45].map(u=>roadClearance(x+nz*width*u,z-nx*width*u)));
   if(margin<.35)continue;
   result.push({id:`${b.id}:${e.polygon}:${e.edge}`,buildingId:b.id,street:e.street,chunk:chunk.origin.join(':'),style:song?'songwat':'yaowarat',x,z,nx,nz,width,height:b.height,floors:Math.max(2,Math.min(6,b.floors||Math.round(b.height/3.4))),seed:stableHash(`${b.id}:${e.edge}`),outset:Math.min(1.65,margin-.25),edge:e});
  }
 }
 // Adjacent collinear source edges may overlap (source building parts). Keep one
 // frontage per shared physical segment; never move or modify the source shape.
 return result.sort((a,b)=>a.id.localeCompare(b.id)).filter((f,i,all)=>!all.slice(0,i).some(a=>Math.hypot(a.x-f.x,a.z-f.z)<1.5&&Math.abs(a.nx*f.nx+a.nz*f.nz)>.95));
}
export type PackedAttribute={array:T.TypedArray;size:number;normalized:boolean;instanced:boolean};
export type DecorationBatch={layer:string;center:number[];attributes:Record<string,PackedAttribute>;index?:T.TypedArray;matrices?:Float32Array;colors?:T.TypedArray;count?:number;sign?:'h'|'v'};
export type ChinatownDecoration={facades:Facade[];batches:DecorationBatch[];pieces:number;bytes:number};
function packed(mesh:T.Mesh,layer:string,center:number[]):DecorationBatch{
 const attributes:Record<string,PackedAttribute>={};for(const [name,raw] of Object.entries(mesh.geometry.attributes)){const a=raw as T.BufferAttribute;attributes[name]={array:a.array,size:a.itemSize,normalized:a.normalized,instanced:a instanceof T.InstancedBufferAttribute};}
 const im=mesh instanceof T.InstancedMesh?mesh:undefined;
 return {layer,center,attributes,index:mesh.geometry.index?.array,matrices:im?.instanceMatrix.array as Float32Array|undefined,colors:im?.instanceColor?.array,count:im?.count};
}
/** Worker-only original decorative grammar; footprints/colliders are never edited. */
export function prepareChinatown(chunk:GeographicChunkData):ChinatownDecoration|undefined{
 const facades=geographicFacades(chunk);if(!facades.length)return;
 const material=new T.MeshStandardMaterial(),batch=new ArchitecturalBatch(material,material),signs=new Map<string,{p:number[];uv:number[];center:number[];vertical:boolean}>();let pieces=0;
 for(const f of facades){
  const song=f.style==='songwat',seed=f.seed,W=f.width,H=f.height,n=Math.max(1,Math.ceil(W/5.7)),bay=W/n,fh=H/f.floors;
  const type=song?[6,8,2,3][seed%4]!:[0,1,2,3,4,5,6,7,9,10,11][seed%11]!;
  const wall=(song?['#cbbd9e','#e5d8bb','#c6c5b1','#d8c9a7']:['#a0b9ae','#cfb59a','#b0ad99','#d6c4a0','#93aba9','#b8b6a7'])[seed%(song?4:6)]!;
  const accent=type===0?'#98202a':song?'#476453':['#386b66','#8b3636','#253c53','#aa713d'][seed%4]!;
  const yaw=Math.atan2(f.nx,f.nz),out=f.outset;
  const put=(u:number,y:number,v:number,w:number,h:number,d:number,color:string,layer:ArtPiece['layer']='core',shape:ArtPiece['shape']='box',rotate=0,surface:ArtPiece['surface']='plaster')=>{
   if(pieces>=14000)return;
   if(y<3.2&&v+d/2>.1){const safety=Math.hypot(w,d)/2+.12;if(roadClearance(f.x+f.nz*u+f.nx*v,f.z-f.nx*u+f.nz*v)<safety)return;}
   batch.add({x:f.x-chunk.origin[0]+f.nz*u+f.nx*v,y,z:f.z-chunk.origin[1]-f.nx*u+f.nz*v,w,h,d,color,yaw:yaw+rotate,layer,shape,surface});pieces++;
  };
  const sign=(u:number,y:number,v:number,w:number,h:number,vertical=false,rotation=0,reverse=false)=>{
   const ang=yaw+rotation+(reverse?Math.PI:0),tx=Math.cos(ang),tz=-Math.sin(ang),x=f.x-chunk.origin[0]+f.nz*u+f.nx*v+(vertical?Math.sin(ang)*.085:0),z=f.z-chunk.origin[1]-f.nx*u+f.nz*v+(vertical?Math.cos(ang)*.085:0);
   const cell=`${Math.floor(x/120)}:${Math.floor(z/120)}:${vertical}`;let s=signs.get(cell);if(!s){s={p:[],uv:[],center:[Math.floor(x/120)*120+60,0,Math.floor(z/120)*120+60],vertical};signs.set(cell,s);}
   const cols=vertical?8:4,rows=Math.ceil(GEO_SHOP_SIGNS.length/cols),col=type%cols,row=Math.floor(type/cols),corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];
   for(const i of [0,1,2,0,2,3]){const [a,b]=corners[i]!;s.p.push(x+tx*a!*w,y+b!*h,z+tz*a!*w);s.uv.push((col+.012+(a!+.5)*.976)/cols,(rows-row-1+.012+(b!+.5)*.976)/rows);}
  };
  // Thin coloured skin follows every admitted edge. Existing massing remains authoritative.
  put(0,H/2,.035,W-.08,H,.06,wall);
  put(0,3.5,.18,W,.3,.35,accent);put(0,H-.3,.18,W,.32,.4,song?'#e9dfc4':'#c9c3ac');
  for(let j=0;j<n;j++){
   const u=-W/2+bay*(j+.5),span=bay-.3;
   put(u,1.55,.09,span,2.9,.1,'#202d2b'); // real recessed shop back behind front columns/counter
   put(u-bay/2+.15,H/2,.16,.24,H,.3,song?'#e8dec4':'#ddd2b5');
   put(u,3.15,.16,span,.85,.18,accent);
   sign(u,3.15,.27,span-.1,.7);
   const glow=type===0?'#fbd281':song?'#ac8a52':'#e6b87d';
   put(u,1.4,.19,span-.4,2.2,.08,glow,'night');
   put(u,1.65,Math.min(.9,out*.55),span*.8,.15,.55,type===0?'#c19542':'#656e68','near');
   put(u,.7,Math.min(.9,out*.55),span*.8,1.2,.45,type===0?'#6c4828':'#405c54','near');
   // Recessed display glass + shelves, gold trays or steaming noodle equipment.
   if(type===0){
    put(u,1.25,.63,span*.72,.55,.12,'#8aabb0','near');
    for(let k=0;k<4;k++)put(u-span*.28+k*span*.18,1.5,.72,.16,.2,.1,'#e1be56','detail','orb');
    put(u,2.5,.3,span*.78,.12,.2,'#d6b553','near');
   }else if([1,4,11].includes(type)){
    for(const k of [-1,1]){put(u+k*.5,1.95,.62,.55,.6,.5,'#a7b3ae','near','cylinder',0,'metal');put(u+k*.5,2.3,.62,.48,.08,.45,'#d3d7c9','detail','cylinder');}
    put(u,2.6,.36,.65,.72,.1,'#ece0bf','near');
    if(out>1.2){put(u,.55,1.0,.75,.12,.6,'#d1b77f','detail');for(const k of [-1,1]){put(u+k*.65,.22,.95,.32,.44,.32,k>0?'#c7493d':'#328b76','detail','cylinder');}}
   }else if(type===5){for(let k=0;k<3;k++)put(u,1+k*.47,.5,span*.8,.1,.4,'#d8ddc4','near');}
   else {put(u,1.5,.43,span*.65,.1,.45,'#a88b60','near');for(const k of [-1,0,1])put(u+k*.6,.42,.6,.43,.75,.43,'#aa9065','detail','box',0,'wood');}
   // Upper-floor window bays, shutters, lintels, rails, balcony brackets and AC.
   for(let floor=1;floor<f.floors;floor++){
    const y=floor*fh+fh*.53,ww=span*.65,hh=Math.min(1.85,fh*.64);
    put(u,y,.105,ww+.24,hh+.28,.14,song?'#e8ddbd':'#dcd0b6');
    put(u,y,.2,ww,hh,.12,song?'#405d50':'#304b51');
    put(u,y,.3,.085,hh,.15,'#b8b99c','near');
    put(u,y-hh/2,.35,ww+.38,.12,.45,'#ded1ae','near');
    if(song){put(u,y+hh/2,.25,ww*.8,.4,.18,'#e5d7b4','near','arch');for(const k of [-1,1])for(let sl=0;sl<4;sl++)put(u+k*ww*.28,y-hh*.32+sl*hh*.2,.31,ww*.37,.065,.12,'#74826a','detail');}
    else if((seed+floor+j)%3!==0&&out>.65){
     put(u,y-hh*.55,.48,ww+.5,.13,.8,wall,'near');
     put(u,y-hh*.15,.82,ww+.45,.07,.07,'#3b4d48','near');
     for(let k=0;k<5;k++)put(u-ww/2+k*ww/4,y-hh*.35,.82,.045,.65,.045,'#3b4d48','detail');
    }
    if(!song&&(seed+j+floor)%4===0){put(u+span*.35,y-hh*.5,.35,.85,.5,.4,'#bbc2b6','near');for(let k=0;k<4;k++)put(u+span*.35,y-hh*.5-.15+k*.1,.57,.7,.035,.04,'#6b7974','detail');}
    if((seed+floor+j)%4===0)put(u,y,.29,ww*.8,hh*.8,.05,'#d6b67b','night');
   }
   // Fabric awning has valance and distinct projecting supports, above vehicle height.
   const canopy=Math.min(1.2,out);if(canopy>.4){put(u,2.68,canopy/2,span,.12,canopy,accent,'near','box',0,'cloth');for(let k=0;k<6;k++)put(u-span/2+(k+.5)*span/6,2.51,canopy-.06,span/6,.26,.12,k%2?accent:'#d6c59d','detail','box',0,'cloth');}
   if(j===0&&!song&&out>.9&&H>8){
    const sy=Math.min(H-2,7.8),v=.49;
    put(u-bay*.39,sy,v,.82,4.4,.14,accent,'near','box',Math.PI/2);
    put(u-bay*.39,sy-2.1,.28,.1,.09,.6,'#8a7e65','near');put(u-bay*.39,sy+2.1,.28,.1,.09,.6,'#8a7e65','near');
    sign(u-bay*.39,sy,v+.01,.75,4.2,true,Math.PI/2);sign(u-bay*.39,sy,v+.01,.75,4.2,true,Math.PI/2,true);
   }
   // People are deliberately lightweight, inside the sheltered shop opening.
   if((seed+j)%3===0&&out>1.15){put(u+span*.3,.95,.7,.38,.9,.3,['#c18a5c','#416d65','#92635b'][seed%3]!,'detail','cylinder');put(u+span*.3,1.55,.7,.31,.38,.3,'#bb8b69','detail','orb');put(u+span*.3,.27,.7,.27,.55,.24,'#35454a','detail');}
   if(j===0&&out>1.1){ // shop-owned pole, cable loom and lamp; kept off drivable surface
    put(u-bay*.43,3.7,.75,.11,7.4,.11,'#6f7264','near','cylinder');
    for(let k=0;k<3;k++)put(u,5.4+k*.17,.7,span,.025,.025,'#252c2c','near');
    put(u-bay*.4,5,.8,.4,.15,.4,'#edc886','night','orb');
   }
  }
  if(song){for(let k=0;k<n;k++)put(-W/2+(k+.5)*bay,H-.75,.2,.35,.28,.22,'#b5a27c','near','orb');}
 }
 const batches:DecorationBatch[]=[];
 for(const root of batch.finish()){const mesh=root.children[0] as T.Mesh;batches.push(packed(mesh,root.name,(root.userData.center as T.Vector3).toArray()));mesh.geometry.dispose();if(mesh instanceof T.InstancedMesh)mesh.dispose();}
 for(const s of signs.values())batches.push({layer:'CommercialSigns',center:s.center,sign:s.vertical?'v':'h',attributes:{position:{array:new Float32Array(s.p),size:3,normalized:false,instanced:false},uv:{array:new Float32Array(s.uv),size:2,normalized:false,instanced:false}}});
 material.dispose();const bytes=batches.reduce((n,b)=>n+Object.values(b.attributes).reduce((s,a)=>s+a.array.byteLength,0)+(b.index?.byteLength??0)+(b.matrices?.byteLength??0)+(b.colors?.byteLength??0),0);
 return {facades,batches,pieces,bytes};
}
