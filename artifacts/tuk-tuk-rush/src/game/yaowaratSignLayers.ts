import * as THREE from "three";
import type { FacadeApi, Style } from "./miniatureFacade";

/** Generic Chinese trade labels on FICTIONAL shops only, never real business names. */
export const TRADE: Record<Style, readonly (readonly [string,string])[]> = {
  gold: [["金行","珠寶"],["金飾","銀樓"]],
  noodle: [["麵館","小吃"],["粥麵","美食"]],
  pharmacy: [["藥房","藥材"],["參茸","草藥"]],
  hotel: [["旅店","客房"],["旅館","住宿"]],
  heritage: [["茶樓","布莊"],["茶莊","絲綢"]],
};
export const tradeKeys=(style:Style,variant:number):[string,string] =>
  [`yt:${style}:${variant%2}:0`,`yt:${style}:${variant%2}:1`];

/** Differing silhouettes, color, height and depth create Yaowarat's sign
 * canopy. All cabinet frames hang above five meters from BUILDING braces. */
export function buildYaowaratBlades(
  api:FacadeApi,o:{W:number;D:number;H:number;i:number;ids:[number,number]},
){
  const {W,D,H,i,ids}=o,F=D/2;
  const box=(col:string,w:number,h:number,d:number,u:number,y:number,v:number)=>{
    const g=new THREE.BoxGeometry(w,h,d);api.add("metal",col,g,u,y,v);g.dispose();
  };
  const globe=(col:string,r:number,u:number,y:number,v:number)=>{
    const g=new THREE.SphereGeometry(r,8,6);api.add("metal",col,g,u,y,v);g.dispose();
  };
  const colors=["#a32c38","#255b65","#3b624d","#84452f","#ae6034"];
  const metal=["#efc568","#d6b394","#e6cf8b","#d7ad74"];
  for(let k=0;k<2;k++){
    const h=(k?4.6:7.4)+(i%3)*0.34, y=Math.min(H-h/2-0.65,(k?8.2:11.1)+(i%2)*0.55);
    if(y-h/2<5.1)continue;
    const u=(k?-1:1)*(W/2-(k?1.0:1.35)),v=F+(k?1.85:2.22);
    const w=k?1.42:1.86, col=colors[(i+k)%colors.length]!,rim=metal[(i+k)%metal.length]!;
    for(const yy of [y-h*0.3,y+h*0.3]){
      box("#63534b",0.15,0.17,2.8,u,yy,F+1.03);
      box(rim,0.22,0.16,0.64,u,yy,F+1.47);
    }
    // Cabinet length lies in streetward v; readable faces point along
    // the street and sit just OUTSIDE its u-facing surfaces.
    box("#544a47",0.71,h+0.47,w+0.45,u,y,v);
    box(rim,0.62,h+0.28,w+0.50,u,y,v+0.06);
    box(col,0.54,h+0.12,w+0.52,u,y,v+0.11);
    api.vsign(ids[k]!,u,y,v+0.12,w,h,0.39);
    for(const end of [-1,1]){
      box(rim,0.83,0.15,w+0.66,u,y+end*(h/2+0.11),v+0.09);
      globe("#f4d79a",0.15,u,y+end*h/2,v+w/2+0.20);
    }
    if((i+k)%2===0){
      const g=new THREE.TorusGeometry(0.5,0.12,6,14);
      api.add("metal",rim,g,u,y+h/2+0.78,v+0.12);g.dispose();
    }else{
      for(const dx of [-0.28,0,0.28]){
        const g=new THREE.ConeGeometry(0.13,0.6,7);
        api.add("metal",rim,g,u,y+h/2+0.61,v+dx);g.dispose();
      }
    }
  }
  // Secondary fascia turns upper commercial floors into layered sign clusters.
  const signY=Math.min(H-1.0,6.15);
  if(signY>5.2) {
    box("#5b4c45",W*0.59,0.8,0.25,0,signY,F+0.62);
    box(metal[i%metal.length]!,W*0.56,0.66,0.29,0,signY,F+0.75);
    api.sign(ids[0],0,signY,F+0.94,W*0.52,0.58);
  }
}

/** Side-wall enamel trade board for original FICTIONAL businesses. Mounted to
 * exposed masonry, above pedestrian height; no ground footprint. */
export function buildYaowaratWallAd(api:FacadeApi,
 o:{W:number;D:number;H:number;side:-1|1;i:number;sign:number}){
 const {W,H,side,i,sign}=o;
 const h=Math.min(7.3,H-6.8);if(h<3.2)return;
 const y=H-h/2-0.5,u=side*(W/2+0.17),v=0.4+(i%2)*0.36;
 const rim=["#d8b361","#b88b5b","#dec17d","#ad765f"][i%4]!;
 const bg=["#812f35","#285664","#695043","#385e4c"][i%4]!;
 const box=(color:string,w:number,ht:number,depth:number,x:number,yy:number,z:number)=>{
   const geo=new THREE.BoxGeometry(w,ht,depth);
   api.add("metal",color,geo,x,yy,z);geo.dispose();
 };
 box("#574d48",0.2,h+0.65,3.63,u,y,v);
 box(rim,0.24,h+0.38,3.52,u+side*0.07,y,v);
 box(bg,0.29,h+0.14,3.38,u+side*0.11,y,v);
 api.vsign(sign,u+side*0.12,y,v,3.12,h,0.18);
 for(const yy of [y-h/2-0.1,y+h/2+0.1])
   box(rim,0.34,0.12,3.78,u+side*0.16,yy,v);
 for(const yy of [y-h*0.28,y,y+h*0.28]){
   const geo=new THREE.SphereGeometry(0.12,7,5);
   api.add("metal","#ead5a8",geo,u+side*0.34,yy,v+1.58);
   geo.dispose();
 }
}
