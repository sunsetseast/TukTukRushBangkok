/** Source-named wayfinding art for the geographic world. This is NOT a
 * claimed survey of physical BMA signpost positions. Placements are stable,
 * deterministic proposals based on the existing OSM named road geometry.
 *
 * Bangkok sign references: blue plaques with Thai above English:
 * https://www.istockphoto.com/photos/bangkok-street-sign
 * https://www.otp.go.th/post/view/2098
 */
import type { GeographicNetwork } from "./network";
export type ThaiWayName={
  id:string;
  way:number;
  edge:number;
  thai?:string;
  english?:string;
  x:number;z:number;y:number;yaw:number;
};
type NamedRoadNetwork=Pick<GeographicNetwork,
  "metadata"|"x"|"z"|"y"|"a"|"b"|"way"|"width"|"trafficEdgesNear">;
const THAI=/[\u0E00-\u0E7F]/;
const ENGLISH=/[A-Za-z]/;
export function sourceWayName(way:{id:string;name:string;thai?:string}){
  const thai=THAI.test(way.thai??"")?way.thai!.trim():
    THAI.test(way.name)?way.name.trim():undefined;
  const english=ENGLISH.test(way.name)&&
    way.name!=="Unnamed passage"&&way.name.length<=70
      ?way.name.trim():undefined;
  if(!thai&&!english)return;
  return {thai,english};
}
export function localThaiWayNames(
  network:NamedRoadNetwork,player:{x:number;z:number},
  max=6,radius=95,
  clearance?:(p:{x:number;z:number})=>boolean,
):ThaiWayName[]{
  const chosen=new Map<number,ThaiWayName & {distance:number}>();
  for(const edge of network.trafficEdgesNear(player,radius)){
    const sourceIndex=network.way[edge]!,source=network.metadata.ways[sourceIndex];
    if(!source)continue;
    const names=sourceWayName(source);
    if(!names)continue;
    const from=network.a[edge]!,to=network.b[edge]!;
    const x1=network.x[from]!,z1=network.z[from]!,
      x2=network.x[to]!,z2=network.z[to]!,
      dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz);
    const elevation=(network.y[from]!+network.y[to]!)/2;
    if(len<15 || Math.abs(network.y[from]!-network.y[to]!)>.7 ||
      Math.abs(elevation)>1.0)continue; // no decorative plaques on bridges
    const ux=dx/len,uz=dz/len,shoulder=Math.max(2.4,
      Math.min(7.5,network.width[edge]!/2+.8));
    // Stable fallback locations along this SAME named source segment if
    // the midpoint would be embedded in a shophouse/building facade.
    // Clearance decisions are source-geometry dependent, never dependent on
    // which direction the player's camera happens to be facing.
    let anchor:{x:number;z:number}|undefined;
    for(const t of [.50,.28,.72]){
      const p={x:x1+dx*t+uz*shoulder,z:z1+dz*t-ux*shoulder};
      if(!clearance || clearance(p)){anchor=p;break;}
    }
    if(!anchor)continue;
    const {x,z}=anchor;
    const dist=Math.hypot(x-player.x,z-player.z);
    if(dist>radius)continue;
    const old=chosen.get(sourceIndex);
    if(old && old.distance<=dist)continue;
    chosen.set(sourceIndex,{
      ...names,id:source.id,way:sourceIndex,edge,
      x,z,y:elevation,
      yaw:Math.atan2(-ux,-uz),
      distance:dist,
    });
  }
  return [...chosen.values()]
    .sort((a,b)=>a.distance-b.distance)
    .slice(0,Math.max(0,Math.min(8,max)))
    .map(({distance,...name})=>name);
}
export function paintBangkokRoadPlaque(
  ctx:CanvasRenderingContext2D,
  name:Pick<ThaiWayName,"thai"|"english">,
){
  const w=768,h=256;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle="#1657a5";ctx.fillRect(8,9,w-16,h-18);
  ctx.lineWidth=11;ctx.strokeStyle="#fafcff";
  ctx.strokeRect(16,17,w-32,h-34);
  ctx.textBaseline="middle";ctx.textAlign="center";
  ctx.fillStyle="#ffffff";
  const thai=name.thai?.trim(),english=name.english?.trim();
  const limit=(text:string,maxPx:number,fontSize:number)=>{
    let size=fontSize;
    while(size>24){
      ctx.font=`700 ${size}px "Noto Sans Thai","Thonburi","Tahoma",sans-serif`;
      if(ctx.measureText(text).width<=maxPx)break;
      size-=3;
    }
    return size;
  };
  if(thai){
    limit(thai,688,english?90:110);
    ctx.fillText(thai,w/2,english?102:126,688);
  }
  if(english){
    limit(english,696,thai?58:88);
    ctx.fillText(english,w/2,thai?189:128,696);
  }
}
