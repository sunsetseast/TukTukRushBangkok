/**
 * Bangkok City Tour - actual OpenStreetMap-derived roads at 1:1 geographic
 * scale. No generated artificial motor roads or imaginary river crossings.
 * OSM road geometry © OpenStreetMap contributors, ODbL 1.0.
 */
export type GeoPoint=[number,number]; // lon,lat
export type Point={x:number;z:number};
export type RoadSegment={a:number;b:number;x1:number;z1:number;x2:number;z2:number;w:number;name:string;bridge:boolean;className:string;length:number};
export type RoadNode={x:number;z:number;neighbors:{to:number;cost:number}[];component:number};
export type Landmark={id:string;name:string;name_th:string;zone:string;category:string;priority:number;point:Point;road:Point;roadNode:number;accessible:boolean;reason?:string};
type Feature={id?:string;geometry:{type:string;coordinates:unknown};properties:Record<string,unknown>};
type GeoJSON={features:Feature[];metadata?:Record<string,unknown>};
export const ORIGIN={lon:100.5100,lat:13.7402};
export const METERS_LON=111320*Math.cos(ORIGIN.lat*Math.PI/180), METERS_LAT=111320;
export const project=(lon:number,lat:number):Point=>({x:(lon-ORIGIN.lon)*METERS_LON,z:-(lat-ORIGIN.lat)*METERS_LAT});
export function haversine(a:GeoPoint,b:GeoPoint){
 const R=6371000,d=Math.PI/180;
 const dy=(b[1]-a[1])*d,dx=(b[0]-a[0])*d;
 const h=Math.sin(dy/2)**2+Math.cos(a[1]*d)*Math.cos(b[1]*d)*Math.sin(dx/2)**2;
 return 2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
export function segmentProjection(p:Point,s:RoadSegment) {
 const dx=s.x2-s.x1,dz=s.z2-s.z1;
 const t=clamp(((p.x-s.x1)*dx+(p.z-s.z1)*dz)/(dx*dx+dz*dz||1),0,1);
 const point={x:s.x1+t*dx,z:s.z1+t*dz};
 return {point,d:Math.hypot(point.x-p.x,point.z-p.z),t};
}
const width=(p:Record<string,unknown>)=>{
 const custom=Number(p.width);
 if(Number.isFinite(custom)&&custom>=3&&custom<=35)return custom;
 switch(p.highway){
  case "motorway":return 18;case "trunk":return 16;
  case "primary":return 14;case "secondary":return 12;
  case "tertiary":return 10;case "residential":return 8;
  case "service":return 6;case "living_street":return 6;
  default:return 7;
 }
};
function legal(p:Record<string,unknown>){
 if(!p.highway)return false;
 if(["no","private"].includes(String(p.access)))return false;
 if(["no","private"].includes(String(p.motor_vehicle)))return false;
 if(["no","private"].includes(String(p.motorcar)))return false;
 if(String(p.service)==="emergency_access")return false;
 return true;
}
export class BangkokNetwork{
 nodes:RoadNode[]=[];
 segments:RoadSegment[]=[];
 private grid=new Map<string,number[]>();
 private cell=180;
 mainComponent=-1;
 componentCounts=new Map<number,number>();
 boundaries={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
 static async load(){
  const [roads,landmarks,waters]=await Promise.all([
   fetch("/maps/imported/roads.geojson").then(r=>{if(!r.ok)throw Error("Real Bangkok roads have not been imported. Run Bangkok OSM map import before opening City Tour.");return r.json() as Promise<GeoJSON>}),
   fetch("/maps/bangkok-landmarks.geojson").then(r=>r.json() as Promise<GeoJSON>),
   fetch("/maps/imported/waterways.geojson").then(r=>r.ok?r.json() as Promise<GeoJSON>:Promise.resolve({features:[]} as GeoJSON))
  ]);
  const net=new BangkokNetwork();
  net.build(roads);
  return {network:net,landmarks:net.setLandmarks(landmarks),water:waters};
 }
 private key(x:number,z:number){return Math.floor(x/this.cell)+":"+Math.floor(z/this.cell)}
 private makeNode(p:Point,lookup:Map<string,number>){
  const key=Math.round(p.x*2)+":"+Math.round(p.z*2);
  let n=lookup.get(key);
  if(n===undefined){
   n=this.nodes.length;lookup.set(key,n);
   this.nodes.push({x:p.x,z:p.z,neighbors:[],component:-1});
   this.boundaries.minX=Math.min(this.boundaries.minX,p.x);
   this.boundaries.maxX=Math.max(this.boundaries.maxX,p.x);
   this.boundaries.minZ=Math.min(this.boundaries.minZ,p.z);
   this.boundaries.maxZ=Math.max(this.boundaries.maxZ,p.z);
  }
  return n;
 }
 build(geo:GeoJSON){
  const lookup=new Map<string,number>();
  for(const feat of geo.features){
   if(feat.geometry.type!=="LineString"||!legal(feat.properties))continue;
   const p=feat.properties,coords=feat.geometry.coordinates as GeoPoint[];
   if(!Array.isArray(coords)||coords.length<2)continue;
   const one=String(p.oneway||"").toLowerCase();
   const isOneWay=["yes","1","true","-1"].includes(one)||String(p.highway)==="motorway";
   const reverse=one==="-1",bridge=String(p.bridge)==="yes"||String(p.bridge)==="viaduct";
   const w=width(p),name=String(p["name:en"]||p.name||p.highway||"Bangkok street");
   for(let j=1;j<coords.length;j++){
    const ca=coords[j-1]!,cb=coords[j]!;
    if(!Array.isArray(ca)||!Array.isArray(cb))continue;
    const a=project(ca[0],ca[1]),b=project(cb[0],cb[1]);
    const len=Math.hypot(b.x-a.x,b.z-a.z);
    if(len<0.7||len>1600)continue; // reject corrupt map geometry
    const ai=this.makeNode(a,lookup),bi=this.makeNode(b,lookup);
    if(ai===bi)continue;
    this.nodes[ai]!.neighbors.push({to:bi,cost:len});
    if(isOneWay){
     if(reverse){
      this.nodes[ai]!.neighbors.pop();
      this.nodes[bi]!.neighbors.push({to:ai,cost:len});
     }
    }else this.nodes[bi]!.neighbors.push({to:ai,cost:len});
    const idx=this.segments.length;
    this.segments.push({a:ai,b:bi,x1:a.x,z1:a.z,x2:b.x,z2:b.z,
      w,name,bridge,className:String(p.highway),length:len});
    const x0=Math.floor((Math.min(a.x,b.x)-w)/this.cell),x1=Math.floor((Math.max(a.x,b.x)+w)/this.cell);
    const z0=Math.floor((Math.min(a.z,b.z)-w)/this.cell),z1=Math.floor((Math.max(a.z,b.z)+w)/this.cell);
    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
     const k=x+":"+z;if(!this.grid.has(k))this.grid.set(k,[]);
     this.grid.get(k)!.push(idx);
    }
   }
  }
  // Components must treat a legal one-way road as connected for geographic
  // access discovery; actual A* still respects directed traffic edges.
  const connected: number[][]=this.nodes.map(()=>[]);
  for(const s of this.segments){connected[s.a]!.push(s.b);connected[s.b]!.push(s.a)}
  let cid=0;
  for(let i=0;i<this.nodes.length;i++){
   if(this.nodes[i]!.component>=0)continue;
   let count=0;const q=[i];this.nodes[i]!.component=cid;
   for(let head=0;head<q.length;head++){
    const u=q[head]!;count++;
    for(const v of connected[u]!){
     if(this.nodes[v]!.component!==-1)continue;
     this.nodes[v]!.component=cid;q.push(v);
    }
   }
   this.componentCounts.set(cid,count);cid++;
  }
  this.mainComponent=[...this.componentCounts].sort((a,b)=>b[1]-a[1])[0]?.[0]??-1;
  if(this.segments.length<200||this.nodes.length<200)throw Error("Incomplete OSM road extract. Need real central Bangkok streets.");
 }
 nearby(point:Point,radius:number){
  const indices=new Set<number>(),minx=Math.floor((point.x-radius)/this.cell),maxx=Math.floor((point.x+radius)/this.cell);
  const minz=Math.floor((point.z-radius)/this.cell),maxz=Math.floor((point.z+radius)/this.cell);
  for(let x=minx;x<=maxx;x++)for(let z=minz;z<=maxz;z++)
   for(const id of this.grid.get(x+":"+z)||[])indices.add(id);
  return indices;
 }
 nearest(point:Point,preferMain=false,maxRadius=900){
  let best:{segment:RoadSegment;point:Point;d:number;t:number}|undefined;
  for(const id of this.nearby(point,maxRadius)){
   const s=this.segments[id]!;
   if(preferMain&&this.nodes[s.a]!.component!==this.mainComponent)continue;
   // Motorway ramps and tunnels may be drawn but aren't safe pickup stops.
   if(preferMain&&["motorway","trunk"].includes(s.className))continue;
   const result=segmentProjection(point,s);
   if(!best||result.d<best.d)best={segment:s,...result};
  }
  return best;
 }
 setLandmarks(data:GeoJSON):Landmark[]{
  return data.features.map(f=>{
   const [lon,lat]=f.geometry.coordinates as GeoPoint,p=project(lon,lat);
   const nearest=this.nearest(p,true,1300);
   const accessible=!!nearest&&nearest.d<650;
   const n=nearest?Math.hypot(p.x-this.nodes[nearest.segment.a]!.x,p.z-this.nodes[nearest.segment.a]!.z)<
    Math.hypot(p.x-this.nodes[nearest.segment.b]!.x,p.z-this.nodes[nearest.segment.b]!.z)?
    nearest.segment.a:nearest.segment.b:-1;
   return {id:String(f.properties.id||f.id),name:String(f.properties.name),
    name_th:String(f.properties.name_th||""),zone:String(f.properties.zone||"Bangkok"),
    category:String(f.properties.category||"landmark"),priority:Number(f.properties.priority||2),
    point:p,road:nearest?.point??p,roadNode:n,accessible,reason:accessible?undefined:"No legal road in imported main component nearby"};
  });
 }
 path(start:number,end:number):number[]{
  if(start<0||end<0||start>=this.nodes.length||end>=this.nodes.length)return [];
  if(this.nodes[start]!.component!==this.nodes[end]!.component)return [];
  // A* binary minheap, directed legal road edges; no straight-line teleport.
  const g=new Float64Array(this.nodes.length);g.fill(Infinity);g[start]=0;
  const prev=new Int32Array(this.nodes.length);prev.fill(-1);
  const visited=new Uint8Array(this.nodes.length);
  const heap:{id:number;score:number}[]=[];
  const push=(id:number,score:number)=>{
   let i=heap.length;heap.push({id,score});
   while(i>0){const k=(i-1)>>1;if(heap[k]!.score<=score)break;heap[i]=heap[k]!;i=k}heap[i]={id,score};
  };
  const pop=()=>{
   if(!heap.length)return undefined;
   const top=heap[0]!,last=heap.pop()!;
   if(heap.length){let i=0;while(true){
    const a=i*2+1,b=a+1;if(a>=heap.length)break;
    const next=b<heap.length&&heap[b]!.score<heap[a]!.score?b:a;
    if(heap[next]!.score>=last.score)break;heap[i]=heap[next]!;i=next;
   }heap[i]=last}return top;
  };
  const h=(id:number)=>Math.hypot(this.nodes[id]!.x-this.nodes[end]!.x,this.nodes[id]!.z-this.nodes[end]!.z);
  push(start,h(start));
  while(heap.length){
   const cur=pop()!.id;if(visited[cur])continue;visited[cur]=1;
   if(cur===end){const arr:number[]=[];let v=end;
    for(let safety=0;v!==-1&&safety<this.nodes.length;safety++){arr.push(v);v=prev[v]!}
    return arr.reverse();
   }
   for(const n of this.nodes[cur]!.neighbors){
    const score=g[cur]!+n.cost;
    if(score>=g[n.to]!)continue;
    prev[n.to]=cur;g[n.to]=score;
    push(n.to,score+h(n.to));
   }
  }
  return [];
 }
 nearNode(point:Point){
  const s=this.nearest(point,true,450);
  if(!s)return -1;
  const a=this.nodes[s.segment.a]!,b=this.nodes[s.segment.b]!;
  return Math.hypot(point.x-a.x,point.z-a.z)<Math.hypot(point.x-b.x,point.z-b.z)?s.segment.a:s.segment.b;
 }
};
