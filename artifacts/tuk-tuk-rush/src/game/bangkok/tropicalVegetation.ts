import * as T from "three";
import type { ArtPiece, Shape } from "./architecturalBatch";
import type { Point } from "../types";
export type TropicalSpecies = "coconut" | "royal-palm" | "rain-tree" | "ratchaphruek" | "shade-tree" | "frangipani" | "banana" | "understory" | "bougainvillea";
export const TROPICAL_SPECIES: TropicalSpecies[] = ["coconut","royal-palm","rain-tree","ratchaphruek","shade-tree","frangipani","banana","understory","bougainvillea"];
export const tropicalSpecies = (region:string,seed:number,palm=false):TropicalSpecies => palm
  ? (["icon","riverside","south","paknam"].includes(region)?"coconut":"royal-palm")
  : region==="chinatown" ? (["frangipani","bougainvillea","understory"] as const)[seed%3]!
  : region==="paknam" ? (["banana","coconut","shade-tree"] as const)[seed%3]!
  : (["rain-tree","ratchaphruek","shade-tree","frangipani"] as const)[seed%4]!;
/** Opaque folded leaves: serrated coconut pinnae and broad banana/aroid blades.
 * Original geometry, no alpha cards, texture downloads or double-sided layers. */
export function tropicalLeafGeometry(shape: "frond" | "leaf") {
  const p:number[]=[], ix:number[]=[];
  const sections=shape==="frond"?9:5;
  for(let i=0;i<=sections;i++){
    const t=i/sections, width=Math.sin(Math.PI*t)*(shape==="frond"?(i%2?.34:.5):.5);
    const y=Math.sin(Math.PI*t)*.18-t*t*.22;
    p.push(-width,y-.04,t-.5,0,y+.04,t-.5,width,y-.04,t-.5,
      -width,y-.055,t-.5,0,y-.08,t-.5,width,y-.055,t-.5);
    if(i){const a=(i-1)*6,b=i*6;ix.push(a,b,a+1,a+1,b,b+1,a+1,b+1,a+2,a+2,b+1,b+2);
      // Distinct underside vertices preserve useful normals at driving height.
      ix.push(a+4,b+3,a+3,a+4,b+4,b+3,a+5,b+4,a+4,a+5,b+5,b+4);}
  }
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(p,3));g.setAttribute("uv",new T.Float32BufferAttribute(p.flatMap((_,i)=>i%3===0?[.5,.5]:[]),2));g.setIndex(ix);g.computeVertexNormals();return g;
}
export const plantRadius = (species:TropicalSpecies,scale=1) => scale*(species==="rain-tree"?10:species==="shade-tree"?7:species==="ratchaphruek"?6:species==="coconut"?5:species==="royal-palm"?4:species==="frangipani"?4:species==="banana"?3:2);
export function emitTropicalPlant(p:Point,species:TropicalSpecies,seed:number,emit:(p:ArtPiece)=>void,detail=true,scale=1) {
  const yaw=seed*.618, color=["#367857","#4d955b","#638f4b"][seed%3]!;
  const put=(x:number,y:number,z:number,w:number,h:number,d:number,c:string,shape:Shape="box",a=0,pitch=0)=>emit({x:p.x+x*scale,y:y*scale,z:p.z+z*scale,w:w*scale,h:h*scale,d:d*scale,color:c,shape,yaw:a,pitch,surface:shape==="cylinder"?"wood":"plaster"});
  const radial=(radius:number,a:number)=>({x:Math.sin(a)*radius,z:Math.cos(a)*radius});
  const crown=(x:number,y:number,z:number,w:number,c:string)=>put(x,y,z,w,w*.34,w,c,"orb");
  if(species==="coconut"||species==="royal-palm"){
    const coconut=species==="coconut",h=(coconut?12:14)+(seed%5)*.55,lean=coconut?1.2:0;
    for(let j=0;j<3;j++)put(lean*(j+.5)/3,h*(j+.5)/3,0,.4-j*.055,h/3+.1,.4-j*.055,coconut?"#967954":"#a1a08a","cylinder",Math.PI/2,coconut?-.1:0);
    if(!coconut)put(0,h-.5,0,.55,1.4,.55,"#5c9b61","cylinder");
    const count=detail?8:5;
    for(let i=0;i<count;i++){
      const a=yaw+i*Math.PI*2/count,r=coconut?2.5:1.9,q=radial(r,a);
      put(lean+q.x,h+.2+(i%3)*.18,q.z,coconut?1.5:1.25,1.5,coconut?5.5:4.2,color,"frond",a,-.12+(i%3)*.08);
    }
    if(coconut&&detail)for(let i=0;i<3;i++)put(lean+.25*Math.cos(i*2),h-.65,.25*Math.sin(i*2),.32,.4,.32,"#7e8f48","orb");
    return;
  }
  if(["banana","understory","bougainvillea"].includes(species)){
    const banana=species==="banana",count=detail?7:4;
    for(let i=0;i<count;i++){
      const a=yaw+i*2.4,q=radial(banana?1:.65,a),h=banana?3.4:1.2;
      put(q.x*.4,h*.4,q.z*.4,.12,h*.8,.12,"#659951","cylinder");
      put(q.x,h,q.z,banana?1.1:.9,banana?.8:.5,banana?3:1.8,color,"leaf",a,-.35);
      if(species==="bougainvillea")crown(q.x,h+.3,q.z,1.3,["#de559a","#b863b1","#ed9367"][seed%3]!);
    }return;
  }
  const rain=species==="rain-tree",frangipani=species==="frangipani",h=frangipani?4.5:rain?12:8.5;
  put(0,h*.22,0,rain?.85:.45,h*.44,rain?.85:.45,"#8a7052","cylinder");
  const count=detail?(rain?7:5):3;
  for(let i=0;i<count;i++){
    const a=yaw+i*Math.PI*2/count,q=radial(rain?4:frangipani?1.4:2.7,a),r=rain?7:frangipani?3:4.7;
    put(q.x*.5,h*.49,q.z*.5,.3,h*.62,.3,"#8a7052","cylinder",a,-.7);
    crown(q.x,h*.72+(i%3)*.5,q.z,r,color);
    if(detail)put(q.x,h*.85,q.z,r*.7,.8,r*.85,"#619d5b","leaf",a);
    if(species==="ratchaphruek"||frangipani)for(let k=0;k<(detail?3:1);k++){
      const f=radial(r*.26,k*2.3+a);crown(q.x+f.x,h*.8+(k%2)*.5,q.z+f.z,frangipani?.65:1.8,frangipani?["#fff2cb","#f5bed0"][seed%2]!:"#ebcb4e");
    }
  }
}
