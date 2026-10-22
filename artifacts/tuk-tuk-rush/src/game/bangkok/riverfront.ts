import * as T from "three";
import type { District, Point } from "../types";
import { blockedByRiver } from "./world";
import { obstacleDistance, distanceToSegment } from "../world";
import { LandmarkBuilder } from "./landmarkBuilder";
import { PHO_PIER_PASSAGE } from './historicPlan';
import type { ArtPiece } from "./architecturalBatch";
import {riverClearance,nearestRiverShore,riverBank,inRiverWater} from './waterGeometry';
export type BoatRoute = {
  center: Point;
  dx: number;
  dz: number;
  length: number;
  phase: number;
  period: number;
  path?: Point[];
  loop?: boolean;
};
/** Shared emitted/map locations; compressed scenic stops, not boat gameplay. */
function computeRiverPiers(d:District){
  const anchors=d.landmarks.filter(l=>['arun','pho','icon','asiatique','river-city','oriental','shangri','hilton','peninsula'].includes(l.id!)).map(l=>({id:l.id!,name:`${l.name} pier`,point:l.plot!}));
  const palace=d.landmarks.find(l=>l.id==='palace');
  if(palace?.plot)anchors.push({id:'tha-chang',name:'Tha Chang public landing',point:{x:palace.plot.x-95,z:palace.plot.z-108}});
  const pho=anchors.find(a=>a.id==='pho');if(pho){pho.name='Tha Tien ferry landing';pho.point=PHO_PIER_PASSAGE.to;}
  const station=d.transit?.lines.flatMap(l=>l.stations).find(s=>s.code==='S6');if(station)anchors.push({id:'sathorn',name:'Sathorn river pier',point:station});
  const nodes=new Map(d.nodes.map(n=>[n.id,n])),song=d.roads.filter(r=>r.corridor==='songwat').flatMap(r=>[nodes.get(r.a)!,nodes.get(r.b)!]).sort((a,b)=>riverClearance(d,a)-riverClearance(d,b))[0];if(song)anchors.push({id:'songwat',name:'Song Wat river landing',point:song});
  return anchors.map(anchor=>{
    let best:ReturnType<typeof nearestRiverShore>|undefined,score=Infinity;
    const expected=riverBank(d,anchor.point);
    for(const ring of d.riverPolygon??[])for(let i=1;i<ring.length;i++){
      const a=ring[i-1]!,b=ring[i]!,len=Math.hypot(b.x-a.x,b.z-a.z);if(len<22)continue;
      const projection=distanceToSegment(anchor.point,a,b),t=Math.max(11/len,Math.min(1-11/len,projection.t)),shore={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
      let nx=(b.z-a.z)/len,nz=-(b.x-a.x)/len;
      const mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2};if(inRiverWater(d,{x:mid.x+nx*.1,z:mid.z+nz*.1})){nx=-nx;nz=-nz;}
      const water={x:shore.x-nx*9,z:shore.z-nz*9},land={x:shore.x+nx*8,z:shore.z+nz*8};
      const distance=Math.hypot(shore.x-anchor.point.x,shore.z-anchor.point.z);
      if(distance>=score||riverBank(d,land)!==expected||!inRiverWater(d,water)||inRiverWater(d,land))continue;
      if(d.roads.some(r=>distanceToSegment(water,nodes.get(r.a)!,nodes.get(r.b)!).distance<r.width/2+14))continue;
      if([-8,8].some(v=>!inRiverWater(d,{x:water.x+nz*v,z:water.z-nx*v})))continue;
      if(anchor.id==='pho'||anchor.id==='tha-chang'){
        const end=anchor.id==='pho'?PHO_PIER_PASSAGE.to:{x:-1008,z:-1060};
        const nearby=d.buildings.filter(b=>distanceToSegment(b,water,end).distance<Math.hypot(b.w,b.d)/2+3);
        if(Array.from({length:41},(_,j)=>({x:water.x+(end.x-water.x)*j/40,z:water.z+(end.z-water.z)*j/40})).some(p=>nearby.some(b=>obstacleDistance(p,b)<2.75)))continue;
      }

      best={point:shore,distance,nx,nz};score=distance;
    }
    if(!best)throw Error('No connected river landing: '+anchor.id);
    const {nx,nz}=best;return {...anchor,x:best.point.x-nx*9,z:best.point.z-nz*9,nx,nz,shore:best.point,bank:expected,yaw:Math.atan2(nx,nz)+Math.PI/2};
  });
}
const boatPathCache=new WeakMap<BoatRoute,{lengths:number[];total:number}>();
const pierCache=new WeakMap<District,{buildings:number;roads:number;polygon:District['riverPolygon'];piers:ReturnType<typeof computeRiverPiers>}>();
export function riverPiers(d:District){
  let cached=pierCache.get(d);
  if(!cached||cached.buildings!==d.buildings.length||cached.roads!==d.roads.length||cached.polygon!==d.riverPolygon){cached={buildings:d.buildings.length,roads:d.roads.length,polygon:d.riverPolygon,piers:computeRiverPiers(d)};pierCache.set(d,cached);}
  return cached.piers;
}
export function boatPose(r: BoatRoute, time: number) {
  if(r.path){
    const path=r.path;
    let metrics=boatPathCache.get(r);
    if(!metrics){const lengths=path.slice(1).map((p,i)=>Math.hypot(p.x-path[i]!.x,p.z-path[i]!.z));metrics={lengths,total:lengths.reduce((a,b)=>a+b,0)};boatPathCache.set(r,metrics);}
    const {lengths,total}=metrics,phase=(time/r.period+r.phase)*Math.PI*2,t=r.loop?((time/r.period+r.phase)%1+1)%1*total:(Math.sin(phase)*.5+.5)*total;
    const at=(s:number)=>{let n=r.loop?((s%total)+total)%total:Math.max(0,Math.min(total,s));for(let i=0;i<lengths.length;i++){const len=lengths[i]!,a=path[i]!,b=path[i+1]!;if(n<=len||i===lengths.length-1){const f=Math.min(1,n/len);return{x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f};}n-=len;}return path[0]!;};
    const p=at(t),a=at(t-4),b=at(t+4),direction=r.loop||Math.cos(phase)>=0?1:-1;
    return{...p,heading:Math.atan2((b.x-a.x)*direction,(b.z-a.z)*direction)};
  }
  const a = (time / r.period + r.phase) * Math.PI * 2,
    t = Math.sin(a) * r.length,
    s = Math.cos(a) * 8,
    vx = Math.cos(a) * r.length * r.dx - Math.sin(a) * 8 * r.dz,
    vz = Math.cos(a) * r.length * r.dz + Math.sin(a) * 8 * r.dx;
  return {
    x: r.center.x + r.dx * t + r.dz * s,
    z: r.center.z + r.dz * t - r.dx * s,
    heading: Math.atan2(vx, vz),
  };
}
function nearRiverStructure(d:District,p:Point,radius:number){
  return (d.riverStructures??[]).some(r=>{
    let inside=false;for(let i=1;i<r.length;i++){const a=r[i-1]!,b=r[i]!;if(distanceToSegment(p,a,b).distance<radius)return true;if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;
  });
}
export function boatRoutes(d: District) {
  const nodes = new Map(d.nodes.map((n) => [n.id, n])),
    bridges = d.roads
      .filter((r) => r.bridge)
      .map((r) => ({ r, a: nodes.get(r.a)!, b: nodes.get(r.b)! })),
    routes: BoatRoute[] = [];
  if(d.riverPolygon){
    const samples:Point[]=[];
    for(let i=1;i<d.river!.length;i++){const a=d.river![i-1]!,b=d.river![i]!,len=Math.hypot(b.x-a.x,b.z-a.z);for(let j=0;j<Math.ceil(len/8);j++){const t=j/Math.ceil(len/8);samples.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}}
    for(let k=0;k<7;k++){
      const desired=Math.floor((k+.5)*samples.length/7);
      for(let offset=0;offset<100;offset++){
        const start=Math.max(0,Math.min(samples.length-19,desired+offset-45)),path=samples.slice(start,start+18);
        if(path.length<18||!path.every(p=>riverClearance(d,p)<-30&&!nearRiverStructure(d,p,30)&&bridges.every(b=>distanceToSegment(p,b.a,b.b).distance>b.r.width/2+25)))continue;
        if(routes.some(r=>Math.hypot(r.center.x-path[8]!.x,r.center.z-path[8]!.z)<100))continue;
        // Parallel lanes and rounded end turns form a continuous ambient loop;
        // boats do not snap through a 180-degree heading at a ping-pong end.
        const tangents=path.map((p,i)=>{const a=path[Math.max(0,i-1)]!,b=path[Math.min(path.length-1,i+1)]!,len=Math.hypot(b.x-a.x,b.z-a.z);return{x:(b.x-a.x)/len,z:(b.z-a.z)/len};});
        const loop=path.map((p,i)=>({x:p.x+tangents[i]!.z*10,z:p.z-tangents[i]!.x*10}));
        const end=path.at(-1)!,forward=tangents.at(-1)!;
        for(let j=1;j<=10;j++){const a=j*Math.PI/10;loop.push({x:end.x+forward.z*10*Math.cos(a)+forward.x*10*Math.sin(a),z:end.z-forward.x*10*Math.cos(a)+forward.z*10*Math.sin(a)});}
        loop.push(...path.map((p,i)=>({x:p.x-tangents[i]!.z*10,z:p.z+tangents[i]!.x*10})).reverse().slice(1));
        const startPoint=path[0]!,back=tangents[0]!;
        for(let j=1;j<=10;j++){const a=j*Math.PI/10;loop.push({x:startPoint.x-back.z*10*Math.cos(a)-back.x*10*Math.sin(a),z:startPoint.z+back.x*10*Math.cos(a)-back.z*10*Math.sin(a)});}
        if(!loop.every(p=>riverClearance(d,p)<-15&&!nearRiverStructure(d,p,15)&&bridges.every(b=>distanceToSegment(p,b.a,b.b).distance>b.r.width/2+18)))continue;
        routes.push({center:path[8]!,dx:0,dz:1,length:60,phase:k*.137,period:125+k*7,path:loop,loop:true});break;
      }
    }
    return routes;
  }
  for (let i = 1; i < d.river!.length - 2 && routes.length < 7; i++) {
    const a = d.river![i]!,
      b = d.river![i + 1]!,
      len = Math.hypot(b.x - a.x, b.z - a.z),
      dx = (b.x - a.x) / len,
      dz = (b.z - a.z) / len;
    for (const t of [0.5, 0.3, 0.7, 0.18, 0.82]) {
      const r = {
        center: { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t },
        dx,
        dz,
        length: Math.min(62, len * 0.16),
        phase: i * 0.137,
        period: 125 + i * 7,
      };
      if (
        Array.from({ length: 256 }, (_, j) =>
          boatPose(r, (j * r.period) / 256),
        ).every(
          (p) =>
            riverClearance(d, p) < -17 &&
            bridges.every(
              (b) =>
                distanceToSegment(p, b.a, b.b).distance > b.r.width / 2 + 18,
            ),
        )
      ) {
        routes.push(r);
        break;
      }
    }
  }
  return routes;
}
function boat(kind: number) {
  const b = new LandmarkBuilder(),
    W = kind === 3 ? 6 : kind === 1 ? 5 : 3.4,
    L = kind === 3 ? 25 : kind === 1 ? 22 : kind === 0 ? 18 : 11,
    s = new T.Shape([
      new T.Vector2(-W * 0.35, L * 0.5),
      new T.Vector2(W * 0.35, L * 0.5),
      new T.Vector2(W * 0.5, -L * 0.25),
      new T.Vector2(0, -L * 0.55),
      new T.Vector2(-W * 0.5, -L * 0.25),
    ]);
  b.shape(
    new T.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: false }).rotateX(
      -Math.PI / 2,
    ),
    0,
    -0.65,
    0,
    kind === 1 ? "#d9ccb1" : "#8b674a",
  );
  b.box(0, 0.35, 0, W * 0.7, 0.3, L * 0.68, "#b59059");
  if (kind !== 2) {
    for (const x of [-W * 0.35, W * 0.35])
      for (const z of [-L * 0.22, L * 0.22])
        b.box(x, 1.5, z, 0.1, 2.3, 0.1, "#596b61");
    b.box(
      0,
      2.75,
      0,
      W * 0.88,
      0.22,
      L * 0.68,
      kind === 1 ? "#d7be5f" : "#b45548",
    );
    b.box(0, 1.65, L * 0.15, W * 0.7, 1.9, L * 0.18, "#698f8b");
  } else {
    b.box(0, 0.8, -1, W * 0.75, 0.5, 4, "#687d62");
    b.box(0, 1.7, -1, W * 0.8, 0.2, 4.5, "#b99054");
  }
  if (kind === 3) {
    b.box(0, 2, 0, 5, 2, 16, "#c7dbd7");
    for (let z = -6; z <= 6; z += 2)
      for (const side of [-1, 1])
        b.box(side * 2.52, 2.2, z, 0.12, 1.2, 1.5, "#4b8d9c");
    b.box(0, 3.4, 0, 5.6, 0.25, 17, "#d5d8bf");
    b.box(0, 3.7, -5, 3.3, 0.5, 3, "#376c83");
  }
  if (kind === 4) {
    b.box(0, 2.8, 0, 3.1, 0.35, 7.5, "#df854a");
    b.box(0, 1.6, 2.5, 2.8, 1.7, 1.7, "#599c9b");
  }
  if (kind === 0) {
    b.box(0, 0.65, -L * 0.46, 0.85, 0.85, 1.5, "#3c514c");
    b.box(0, 0.25, -L * 0.61, 0.15, 0.15, 4.2, "#657d71");
  }
  return b.finish(`river-boat-${kind}`);
}
export function riverMotion(d: District) {
  const root = new T.Group();
  root.name = "BangkokRiverCraft";
  const routes = [
      ...boatRoutes(d),
      ...(d.canals ?? []).flatMap((c) =>
        c.points.slice(1, 3).map((b, i) => {
          const a = c.points[i]!,
            len = Math.hypot(b.x - a.x, b.z - a.z);
          return {
            center: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
            dx: (b.x - a.x) / len,
            dz: (b.z - a.z) / len,
            length: Math.min(36, len * 0.18),
            phase: i * 0.2,
            period: 115,
          };
        }),
      ),
    ],
    boats = routes.map((r, i) => {
      const g = boat(i >= 7 ? 0 : i % 5);
      root.add(g);
      return g;
    }),
    wakeGeo = new T.PlaneGeometry(3, 8).rotateX(-Math.PI / 2),
    wakeMat = new T.MeshBasicMaterial({
      color: "#9eccc1",
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
    wakes = boats.map(() => {
      const m = new T.Mesh(wakeGeo, wakeMat);
      root.add(m);
      return m;
    });
  return {
    root,
    routes,
    update(time: number, quality: string) {
      boats.forEach((g, i) => {
        const p = boatPose(routes[i]!, time);
        g.position.set(p.x, -1.03 + Math.sin(time + i) * 0.035, p.z);
        g.rotation.y = p.heading;
        const w = wakes[i]!;
        w.visible = quality === "medium";
        w.position.set(
          p.x - Math.sin(p.heading) * 14,
          -1.17,
          p.z - Math.cos(p.heading) * 14,
        );
        w.rotation.y = p.heading;
      });
    },
  };
}
export function riverWater() {
  const time = { value: 0 },
    night = { value: 0 },
    mat = new T.MeshBasicMaterial({ color: "#ffffff" });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.riverTime = time;
    shader.uniforms.riverNight = night;
    shader.vertexShader =
      "varying vec2 riverWorld;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvec4 wp=vec4(position,1.);\n#ifdef USE_INSTANCING\nwp=instanceMatrix*wp;\n#endif\nriverWorld=(modelMatrix*wp).xz;",
      );
    shader.fragmentShader =
      "varying vec2 riverWorld;uniform float riverTime;uniform float riverNight;\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat ripple=sin(riverWorld.y*.9+sin(riverWorld.x*.2)+riverTime*.85);float wave=sin(riverWorld.x*.15+sin(riverWorld.y*.07)+riverTime*.7)*sin(riverWorld.y*.22-riverTime*.5);vec3 water=mix(vec3(.06,.32,.35),vec3(.025,.14,.23),riverNight);float glint=pow(max(0.,ripple),12.);float streak=pow(max(0.,sin(riverWorld.x*.025+riverWorld.y*.009+wave*.025)),18.)*(.025+glint*.08);diffuseColor.rgb=water+wave*.009+mix(vec3(.55,.29,.09),vec3(.3,.13,.32),.5+.5*sin(riverWorld.x*.014))*streak*(.8+riverNight*2.5);",
      );
  };
  mat.customProgramCacheKey = () => "living-river-v3";
  return { material: mat, time, night };
}
export function emitRiverfront(d: District, emit: (p: ArtPiece) => void) {
  const put = (
    p: Point,
    y: number,
    w: number,
    h: number,
    depth: number,
    color: string,
    yaw = 0,
  ) => emit({ ...p, y, w, h, d: depth, color, yaw, surface: "concrete" });
  // Actual bank edges, with local commercial/historic/hotel treatments. The
  // source polygon controls the wall, its cap and land-side normal together.
  const shoreRings=d.riverPolygon??[];
  const roadNodes=new Map(d.nodes.map(n=>[n.id,n]));
  let station=0;
  for(const ring of shoreRings)for(let i=1;i<ring.length;i++){
    const a=ring[i-1]!,b=ring[i]!,len=Math.hypot(b.x-a.x,b.z-a.z);
    if(len<.2)continue;
    const dx=(b.x-a.x)/len,dz=(b.z-a.z)/len,yaw=Math.atan2(dx,dz);
    const mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2},normal=nearestRiverShore(d,mid);
    const near=d.landmarks.filter(l=>l.plot).map(l=>({l,distance:Math.hypot(l.plot!.x-mid.x,l.plot!.z-mid.z)})).sort((a,b)=>a.distance-b.distance)[0];
    const id=near&&near.distance<230?near.l.id:'background';
    const historic=['palace','pho','arun'].includes(id!),commercial=['river-city','asiatique','gate'].includes(id!);
    const color=historic?'#8b8977':commercial?'#998b7a':'#758378';
    const pieces=Math.max(1,Math.ceil(len/16));
    for(let j=0;j<pieces;j++){
      const t=(j+.5)/pieces,point={x:a.x+dx*len*t,z:a.z+dz*len*t};
      if(d.roads.some(r=>r.bridge&&distanceToSegment(point,roadNodes.get(r.a)!,roadNodes.get(r.b)!).distance<r.width/2+5))continue;
      const p={x:point.x+normal.nx*.6,z:point.z+normal.nz*.6};
      put(p,-.8,1.4,1.7,len/pieces+.12,color,yaw);
      put(p,.08,historic?3.1:2,.12,len/pieces+.12,historic?'#c4b99b':'#a7ac97',yaw);
      const spacing=commercial?48:historic?72:128;
      if((commercial||historic)&&Math.floor((station+len*t)/spacing)!==Math.floor((station+len*(t-.5/pieces))/spacing)){
        const q={x:p.x+normal.nx*2,z:p.z+normal.nz*2};
        if(riverClearance(d,q)>1){put(q,1.5,.16,3,.16,'#5b6861');emit({...q,y:3.1,w:.6,h:.4,d:.6,yaw:0,color:'#f4c98a',surface:'panel',layer:'night'});}
      }
    }
    station+=len;
  }
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  for (const canal of d.canals ?? [])
    for (let i = 1; i < canal.points.length; i++) {
      const a = canal.points[i - 1]!,
        b = canal.points[i]!,
        len = Math.hypot(b.x - a.x, b.z - a.z),
        ux = (b.x - a.x) / len,
        uz = (b.z - a.z) / len,
        yaw = Math.atan2(ux, uz);
      for (let t = 8; t < len; t += 12)
        for (const side of [-1, 1]) {
          const p = {
            x: a.x + ux * t + uz * (canal.width / 2 + 0.5) * side,
            z: a.z + uz * t - ux * (canal.width / 2 + 0.5) * side,
          };
          if (
            d.roads.some(
              (r) =>
                distanceToSegment(p, nodes.get(r.a)!, nodes.get(r.b)!)
                  .distance <
                r.width / 2 + 8,
            )
          )
            continue;
          put(p, -0.65, 1.3, 1.6, 12, "#788977", yaw);
          put(p, 0.18, 3, 0.08, 12, "#b6b49a", yaw);
          if (Math.floor(t / 12) % 4 === 0)
            emit({
              ...p,
              y: 0.24,
              w: 1,
              h: 0.02,
              d: 1,
              yaw: 0,
              color: "#e8ba6c",
              surface: "panel",
              layer: "night",
            });
        }
    }
  for (const p of riverPiers(d)) {
    const {nx,nz,yaw}=p;
    // Every landing has a physical gangway across the bank; a roof in the
    // water alone is not an accessible pier.
    const land={x:p.shore.x+nx*8,z:p.shore.z+nz*8};
    put({x:(p.x+land.x)/2,z:(p.z+land.z)/2},.14,5.5,.2,Math.hypot(p.x-land.x,p.z-land.z)+2,'#bbae8e',Math.atan2(land.x-p.x,land.z-p.z));
    if(p.id==='pho'||p.id==='tha-chang') {
      const end=p.id==='pho'?PHO_PIER_PASSAGE.to:{x:-1008,z:-1060};
      const dx=end.x-p.x,dz=end.z-p.z,len=Math.hypot(dx,dz);
      put({x:(p.x+end.x)/2,z:(p.z+end.z)/2},.14,5.5,.18,len,'#c9b995',Math.atan2(dx,dz));
      // Bounded landing paving, bollards and waiting benches. No solids or
      // furniture on the lane, and no continuous invented waterside street.
      const shore={x:p.x+nx*13,z:p.z+nz*13};
      put(shore,.2,18,.15,7,'#c9bc9f',yaw);
      for(const side of [-1,1]) {
        const q={x:shore.x+Math.cos(yaw)*side*7,z:shore.z-Math.sin(yaw)*side*7};
        put(q,.55,3.5,.22,.8,'#947e5a',yaw);
      }
    }
    put(p, 0.12, 21, 0.2, 10, "#bfb497", yaw);
    put(p, 2.7, 14, 0.25, 6, "#bfab79", yaw);
    emit({
      ...p,
      y: 2.55,
      w: 13,
      h: 0.12,
      d: 5,
      yaw,
      color: "#ffcb84",
      surface: "panel",
      layer: "night",
    });
    for (let i = 0; i < 4; i++)
      put(
        { x: p.x + nx * (4 + i), z: p.z + nz * (4 + i) },
        0.15 - i * 0.08,
        16,
        0.16,
        1.2,
        "#b7ac94",
        yaw,
      );
    for (const side of [-1, 1]) {
      const q = {
        x: p.x + Math.cos(yaw) * side * 9,
        z: p.z - Math.sin(yaw) * side * 9,
      };
      put(q, 0.7, 0.5, 1.4, 0.5, "#80745a");
      put(q, 1.35, 0.7, 0.15, 0.7, "#626e68");
    }
    for (const x of [-6, 6])
      for (const z of [-2.3, 2.3]) {
        const q = {
          x: p.x + Math.cos(yaw) * x + Math.sin(yaw) * z,
          z: p.z - Math.sin(yaw) * x + Math.cos(yaw) * z,
        };
        if (blockedByRiver(d, q, 0.4)) put(q, 1.3, 0.25, 2.6, 0.25, "#817c67");
      }
  }
}
