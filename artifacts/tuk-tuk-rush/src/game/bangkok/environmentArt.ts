import type { District } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import { degreeMap } from "../roadGeometry";
import { planEnvironment } from "./environmentPlan";
import { stableHash } from "./buildingGrammar";
export function emitEnvironment(d:District,emit:(p:ArtPiece)=>void){
  let siteId:string|undefined;
  const put=(x:number,y:number,z:number,w:number,h:number,depth:number,color:string,yaw=0,shape:ArtPiece["shape"]="box",layer:ArtPiece["layer"]="core")=>emit({x,y,z,w,h,d:depth,color,yaw,shape,layer,siteId,surface:shape==="orb"?"plaster":"concrete"});
  const nodes=new Map(d.nodes.map(n=>[n.id,n])),degree=degreeMap(d);
  for(const r of d.roads){
    if(r.shortcut||r.roundabout||r.bridge)continue;const a=nodes.get(r.a)!,b=nodes.get(r.b)!,len=Math.hypot(b.x-a.x,b.z-a.z),yaw=Math.atan2(b.x-a.x,b.z-a.z),sx=Math.sin(yaw),cz=Math.cos(yaw),from=(degree.get(r.a)??0)>2?13:0,to=len-((degree.get(r.b)??0)>2?13:0),seed=stableHash(`${r.a}:${r.b}`);
    const local=(u:number,t:number,y:number,w:number,h:number,depth:number,color:string,rotation=0,shape:ArtPiece["shape"]="box",layer:ArtPiece["layer"]="core")=>put(a.x+sx*t+cz*u,y,a.z+cz*t-sx*u,w,h,depth,color,yaw+rotation,shape,layer);
    if(to>from)for(const side of [-1,1]){
      const t=(from+to)/2;local(side*(r.width/2+3),t,.14,6,.16,to-from,"#b8b3a3");local(side*(r.width/2+.12),t,.18,.22,.09,to-from,"#ded7bb");local(side*(r.width/2-.12),t,.147,.2,.01,to-from,"#5d665f");
      for(let v=from+3;v<to;v+=5.3)local(side*(r.width/2+2.8),v,.227,5.5,.014,.045,"#898b7f",0,"box","detail");
      if(seed%3===0){const v=from+(to-from)*.62;local(side*(r.width/2-.25),v,.156,.45,.025,1.1,"#6d7975");for(let i=0;i<5;i++)local(side*(r.width/2-.25),v-.4+i*.2,.17,.43,.025,.025,"#344c4c",0,"box","detail");}
    }
    if(seed%13===0)local(0,len*.55,.154,1,.02,1,"#637274",0,"cylinder");
    if(seed%5===0&&!r.oneWay)for(const side of [-1,1]){const t=len*.5;local(side*r.width*.24,t,.155,.18,.012,2.5,"#d2cab4");local(side*r.width*.24,t-side*1.3,.155,1,.012,1,"#d2cab4",side>0?Math.PI:0,"arrow");}
    if((!r.oneWay&&(degree.get(r.a)??0)>2)||(r.oneWay&&(degree.get(r.b)??0)>2)){const t=r.oneWay?len-12.5:12.5;for(let u=-r.width/2+1;u<r.width/2-1;u+=1.35)local(u,t,.16,.78,.012,2.7,"#e4dbc0");local((r.oneWay?-1:1)*r.width/4,r.oneWay?t-2.5:t+2.5,.16,r.width/2-1,.012,.22,"#e2d5b2");}
  }
  for(const site of planEnvironment(d)){
    siteId=site.id;const b=site.body,yaw=b.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw),seed=site.seed,green=["#60845c","#436d59","#73965e"][seed%3]!;
    const B=(u:number,y:number,v:number,w:number,h:number,depth:number,color:string,shape:ArtPiece["shape"]="box",layer:ArtPiece["layer"]="core",turn=0)=>put(b.x+c*u+s*v,y,b.z-s*u+c*v,w,h,depth,color,yaw+turn,shape,layer);
    if(["tree","palm"].includes(site.kind)){
      const H=site.kind==="palm"?9.5:5.8+(seed%4)*.5;B(0,.5,0,b.w,.6,b.d,"#b7b08e");B(0,H/2+.25,0,.32,H,.32,"#7c6950","cylinder");
      if(site.kind==="tree")for(const [u,y,v,w,h,depth] of [[0,H,0,5,3.5,5],[-1.5,H-.6,.4,3.9,3,3.7],[1.4,H+.6,-.5,3.7,3.2,4]])B(u!,y!,v!,w!,h!,depth!,green,"orb");else for(let i=0;i<6;i++)B(0,H,0,.65,.38,7,green,"orb","core",i*Math.PI/3);
    }else if(["lamp","signal"].includes(site.kind)){
      B(0,3.5,0,.25,6.6,.25,"#5c6d66","cylinder");B(0,6.65,.6,.22,.18,1.5,"#5c6d66");if(site.kind==="lamp")B(0,6.52,1.2,.65,.15,.75,"#ffd597","box","night");else{B(0,5.7,0,.75,1.8,.6,"#354c48");for(let i=0;i<3;i++)B(0,6.2-i*.5,.33,.32,.32,.06,["#ad594e","#bda559","#43825d"][i]!,"orb");}
    }else if(site.kind==="scooter"){
      for(const z of [-.9,.9])B(0,.6,z,.35,.75,.62,"#304747","orb");B(0,.8,0,.6,.75,1.5,["#579184","#be5d5b","#d8b976"][seed%3]!);B(0,1.3,-.25,.55,.17,.85,"#3e4d4b");B(0,1.5,.6,1.05,.09,.15,"#687b78");
    }else if(site.kind==="bench"){
      for(const x of [-1.1,1.1])B(x,.55,0,.25,.65,1,"#566760");B(0,.87,0,3,.16,1,"#89765a");B(0,1.32,-.47,3,.65,.13,"#89765a");
    }else if(site.kind==="workshop"){
      for(let i=0;i<4;i++)B(-.9+(i%2)*.8,.5+Math.floor(i/2)*.45,0,.65,.45,.7,"#414c49","cylinder");B(.75,.75,.1,1,1.2,1.6,"#819184");B(.75,1.5,.1,.8,.15,.8,"#c2b398");
    }else{
      const col={noodle:"#479292",grill:"#a34d3e",fruit:"#b1a84d",tea:"#52766e"}[site.kind as "noodle"|"grill"|"fruit"|"tea"];B(0,.85,0,b.w-.3,1,b.d-.3,col);B(0,1.42,0,b.w,.18,b.d,"#d5cbb6");
      if(site.kind!=="fruit")for(const u of [-b.w*.43,b.w*.43])B(u,2.2,0,.07,1.7,.07,"#778780","cylinder");
      if(site.kind==="noodle"){B(0,3,0,b.w,.15,b.d,"#dab55e");B(-.55,1.72,0,.65,.55,.65,"#a5bab2","cylinder");B(.6,2,.2,.65,.85,.5,"#b3d3c9");for(const u of [-.6,0,.6])B(u,1.65,-.6,.3,.2,.3,"#e6dfc9","cylinder","detail");}
      else if(site.kind==="grill"){B(-.8,1.65,0,1.35,.25,1.6,"#42544e");for(let v=-.6;v<.7;v+=.2)B(-.8,1.8,v,1.35,.06,.06,"#da9d58","box","detail");B(.75,1.88,0,.8,.7,.8,"#b57449","cylinder");B(0,2.9,0,b.w,.22,b.d,"#bc714b");}
      else if(site.kind==="fruit"){B(0,2.7,0,b.w,.2,b.d,"#c8a964");for(let i=0;i<9;i++)B(-1.1+i%3*.8,1.75,Math.floor(i/3)*.65-.65,.55,.35,.5,["#d4b64d","#a56842","#69934f"][i%3]!,"orb");}
      else{B(0,2.65,0,b.w*.75,.18,b.d*.75,"#9db69c");for(const u of [-.55,.4])B(u,1.83,0,.48,.75,.48,"#d29c56","cylinder");B(0,1.75,-.65,1.35,.42,.35,"#c7d7c6");}
      for(const u of [-b.w*.32,b.w*.32])B(u,.55,-b.d*.37,.25,.45,.25,"#384c45","orb");
    }
  }
  siteId=undefined;
  for(const o of d.obstacles.filter(o=>o.protected)){
    put(o.x,-.06,o.z,o.w,.25,o.d,"#4a7952");put(o.x,.1,o.z,o.w*.84,.05,2.8,"#aeb19a");put(o.x,.1,o.z,2.8,.05,o.d*.84,"#aeb19a");
    for(let i=0;i<18;i++){const seed=stableHash(`${o.x}:${o.z}:${i}`),x=o.x+((seed%100)/100-.5)*(o.w-18),z=o.z+((Math.floor(seed/100)%100)/100-.5)*(o.d-18);if(Math.abs(x-o.x)<3||Math.abs(z-o.z)<3)continue;put(x,3,z,.6,6,.6,"#7c6c53",0,"cylinder");put(x,6.8,z,7,5.2,7,"#4e7c53",seed%6,"orb");}
  }
  for(const l of d.landmarks.filter(l=>["arun","pho","icon","paragon"].includes(l.id??""))){const a=nodes.get(l.accessNode!)!,p=l.plot!,len=Math.hypot(p.x-a.x,p.z-a.z),yaw=Math.atan2(p.x-a.x,p.z-a.z);put((a.x+p.x)/2,.18,(a.z+p.z)/2,5,.08,Math.max(1,len-l.size!*.4),["icon","paragon"].includes(l.id!)?"#d3cdb6":"#bdb69d",yaw);}
}
