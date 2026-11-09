import {emitRenaissanceRoadEdges} from "./renaissanceRoadEdges";
import {emitRenaissanceReturns} from "./renaissanceReturns";
import {renaissanceFrontage} from "./renaissancePlan";
import {emitRenaissanceFacade} from "./renaissanceArchitecture";
import * as T from "three";
import area from "./chinatownArea.generated.json";
import {CHINATOWN_SITES,chinatownSite} from "./chinatownSites";
import type {LifeAnchor} from "./chinatownLife";
import type { GeographicChunkData } from "./dataset";
import type { RuntimeBuilding, BuildingEdge } from "./buildings";
import { stableHash } from "../stableHash";
import { ArchitecturalBatch, type ArtPiece } from "../architecturalBatch";
import type { Obstacle } from "../../types";
import type { SignEntry } from "../../signArt";
/** Generic trade phrases, not claims about real businesses at imported addresses. */
export const GEO_SHOP_SIGNS: SignEntry[] = [
  ["gold", "ร้านทอง", "金店", "gold"],
  ["noodle", "ก๋วยเตี๋ยว", "麵家", "noodle"],
  ["tea", "ชาไทย", "茶樓", "heritage"],
  ["coffee", "กาแฟสด", "COFFEE", "heritage"],
  ["food", "ร้านอาหาร", "食堂", "noodle"],
  ["medicine", "ร้านยา", "藥行", "pharmacy"],
  ["merchant", "ร้านค้า", "商行", "heritage"],
  ["hotel", "โรงแรม", "GUESTHOUSE", "hotel"],
  ["warehouse", "โกดังสินค้า", "WAREHOUSE", "heritage"],
  ["fruit", "ผลไม้", "水果", "heritage"],
  ["retail", "ร้านสะดวกซื้อ", "MINI MART", "hotel"],
  ["bakery", "ขนม", "點心", "noodle"],
].map(([key, text, secondary, style], i) => ({
  key: key!,
  text: text!,
  secondary: secondary!,
  style: style as SignEntry["style"],
  variant: i % 2,
  layout: "painted",
  verticalText: /[\u3400-\u9fff]/.test(secondary!) ? secondary : undefined,
}));
GEO_SHOP_SIGNS.push(...CHINATOWN_SITES.map((s,i)=>({key:s.id,text:s.thai,secondary:s.secondary,verticalText:/[\u3400-\u9fff]/.test(s.secondary)?s.secondary:undefined,style:([0].includes(s.trade)?'gold':[1,4,11].includes(s.trade)?'noodle':s.trade===7?'hotel':'heritage') as SignEntry['style'],variant:0,layout:i%3===0?'neon' as const:'painted' as const})));
export type Facade = {
  id: string;
  siteId?: string;
  buildingId: string;
  street: string;
  chunk: string;
  style: "yaowarat" | "songwat";
  x: number;
  z: number;
  nx: number;
  nz: number;
  width: number;
  height: number;
  floors: number;
  seed: number;
  outset: number;
  setback?: number;
  tradeHint?: number;
  family: string;
  edge: BuildingEdge;
};
const segmentDistance = (
  x: number,
  z: number,
  s: (typeof area.segments)[number],
) => {
  const dx = s.b[0]! - s.a[0]!,
    dz = s.b[1]! - s.a[1]!,
    l = dx * dx + dz * dz;
  const t = Math.max(
    0,
    Math.min(1, ((x - s.a[0]!) * dx + (z - s.a[1]!) * dz) / (l || 1)),
  );
  return {
    x: s.a[0]! + dx * t,
    z: s.a[1]! + dz * t,
    distance: Math.hypot(x - s.a[0]! - dx * t, z - s.a[1]! - dz * t),
  };
};
export function roadClearance(x: number, z: number) {
  let distance = Infinity;
  for (const s of area.segments) {
    if (s.bridge) continue;
    distance = Math.min(
      distance,
      segmentDistance(x, z, s).distance - s.width / 2,
    );
  }
  return distance;
}
const streetSegments = new Map<string, typeof area.segments>();
for (const segment of area.segments) {
  if (!area.streets.includes(segment.name)) continue;
  const list = streetSegments.get(segment.id) ?? [];
  list.push(segment); streetSegments.set(segment.id, list);
}
/** A footprint can overlap another source record. Do not build hidden shop
 * interiors behind a different authoritative building; preserve both masses. */
function frontageVisibility(chunk: GeographicChunkData) {
  const grid=new Map<string, RuntimeBuilding[]>();
  for(const b of chunk.buildings??[]){
    if(b.minHeight>1.2||b.height<2)continue;
    const edges=b.edges.filter(e=>e.ring===0);if(!edges.length)continue;
    const xs=edges.flatMap(e=>[e.a[0],e.b[0]]),zs=edges.flatMap(e=>[e.a[1],e.b[1]]);
    for(let x=Math.floor(Math.min(...xs)/32);x<=Math.floor(Math.max(...xs)/32);x++)
      for(let z=Math.floor(Math.min(...zs)/32);z<=Math.floor(Math.max(...zs)/32);z++){
        const key=`${x}:${z}`,list=grid.get(key)??[];list.push(b);grid.set(key,list);
      }
  }
  return (id:string,ax:number,az:number,bx:number,bz:number)=>{
    const seen=new Set<RuntimeBuilding>();
    for(let x=Math.floor(Math.min(ax,bx)/32);x<=Math.floor(Math.max(ax,bx)/32);x++)
      for(let z=Math.floor(Math.min(az,bz)/32);z<=Math.floor(Math.max(az,bz)/32);z++)
        for(const b of grid.get(`${x}:${z}`)??[]){
          if(b.id===id||seen.has(b))continue;seen.add(b);
          for(const e of b.edges){if(e.ring!==0)continue;
            const dx=bx-ax,dz=bz-az,ex=e.b[0]-e.a[0],ez=e.b[1]-e.a[1],den=dx*ez-dz*ex;
            if(Math.abs(den)<1e-9)continue;
            const px=e.a[0]-ax,pz=e.a[1]-az,t=(px*ez-pz*ex)/den,u=(px*dz-pz*dx)/den;
            if(t>0.001&&t<0.999&&u>=0&&u<=1)return false;
          }
        }
    return true;
  };
}
// Immutable local road index. Rectangle-to-segment distance admits long,
// street-parallel counters without the old over-conservative bounding circle.
const propRoadGrid=new Map<string,typeof area.segments>();
for(const s of area.segments){if(s.bridge)continue;const pad=s.width/2+.2;
  for(let x=Math.floor((Math.min(s.a[0]!,s.b[0]!)-pad)/32);x<=Math.floor((Math.max(s.a[0]!,s.b[0]!)+pad)/32);x++)
    for(let z=Math.floor((Math.min(s.a[1]!,s.b[1]!)-pad)/32);z<=Math.floor((Math.max(s.a[1]!,s.b[1]!)+pad)/32);z++){
      const key=`${x}:${z}`,list=propRoadGrid.get(key)??[];list.push(s);propRoadGrid.set(key,list);
    }
}
export function decorativeRoadClearance(x:number,z:number,w:number,d:number,yaw:number){
 const c=Math.cos(yaw),sn=Math.sin(yaw),hw=w/2,hd=d/2,rx=Math.abs(c)*hw+Math.abs(sn)*hd,rz=Math.abs(sn)*hw+Math.abs(c)*hd,candidates=new Set<(typeof area.segments)[number]>();
 for(let i=Math.floor((x-rx)/32);i<=Math.floor((x+rx)/32);i++)for(let j=Math.floor((z-rz)/32);j<=Math.floor((z+rz)/32);j++)for(const s of propRoadGrid.get(`${i}:${j}`)??[])candidates.add(s);
 let best=Infinity;
 for(const s of candidates){
  const ax=c*(s.a[0]!-x)-sn*(s.a[1]!-z),az=sn*(s.a[0]!-x)+c*(s.a[1]!-z),bx=c*(s.b[0]!-x)-sn*(s.b[1]!-z),bz=sn*(s.b[0]!-x)+c*(s.b[1]!-z),dx=bx-ax,dz=bz-az;
  let lo=0,hi=1,hit=true;
  for(const [a,delta,h]of [[ax,dx,hw],[az,dz,hd]]){if(Math.abs(delta!)<1e-12){if(Math.abs(a!)>h!)hit=false;}else{const t1=(-h!-a!)/delta!,t2=(h!-a!)/delta!;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}}
  let distance=hit&&lo<=hi?0:Math.min(Math.hypot(Math.max(Math.abs(ax)-hw,0),Math.max(Math.abs(az)-hd,0)),Math.hypot(Math.max(Math.abs(bx)-hw,0),Math.max(Math.abs(bz)-hd,0)));
  for(const u of [-hw,hw])for(const v of [-hd,hd]){const t=Math.max(0,Math.min(1,((u-ax)*dx+(v-az)*dz)/(dx*dx+dz*dz||1)));distance=Math.min(distance,Math.hypot(u-ax-t*dx,v-az-t*dz));}
  best=Math.min(best,distance-s.width/2);
 }
 return best;
}
export function geographicFacades(chunk: GeographicChunkData): Facade[] {
  const result: Facade[] = [];
  // Index lazily: ordinary chunks outside the showcase allocate no visibility grid.
  let clear: ReturnType<typeof frontageVisibility> | undefined;
  const [minX, maxX, minZ, maxZ] = area.bounds;
  for (const b of chunk.buildings ?? []) {
    if (
      b.minHeight > 0 ||
      b.height < 5 ||
      b.height > 45 ||
      ["roof", "carport", "part"].includes(b.classification)
    )
      continue;
    if (!b.edges.some(e => {
      const x=chunk.origin[0]+e.a[0],z=chunk.origin[1]+e.a[1];
      return x>=minX! && x<=maxX! && z>=minZ! && z<=maxZ!;
    })) continue;
    for (const e of b.edges) {
      if (e.ring !== 0 || !e.collision) continue;
      const x = chunk.origin[0] + (e.a[0] + e.b[0]) / 2,
        z = chunk.origin[1] + (e.a[1] + e.b[1]) / 2;
      if (x < minX! || x > maxX! || z < minZ! || z > maxZ!) continue;
      // Re-evaluate nearby selected roads instead of trusting the compiler's
      // single nearest-street hint. A corner can face two legitimate streets.
      const roads = area.segments.filter(s => area.streets.includes(s.name) &&
        Math.abs((s.a[0]!+s.b[0]!)/2-x) < Math.abs(s.b[0]!-s.a[0]!)/2+40 &&
        Math.abs((s.a[1]!+s.b[1]!)/2-z) < Math.abs(s.b[1]!-s.a[1]!)/2+40);
      if (!roads.length) continue;
      const dx = e.b[0] - e.a[0],
        dz = e.b[1] - e.a[1],
        width = Math.hypot(dx, dz);
      if (width < 3.2 || width > 65) continue;
      const ring = b.edges.filter(
        (a) => a.polygon === e.polygon && a.ring === 0,
      );
      const ccw =
        ring.reduce((n, a) => n + a.a[0] * a.b[1] - a.b[0] * a.a[1], 0) > 0;
      const nx = (ccw ? dz : -dz) / width,
        nz = (ccw ? -dx : dx) / width;
      const road = roads.map(s => ({s,...segmentDistance(x,z,s)}))
        .filter(r => ((r.x-x)*nx+(r.z-z)*nz)/Math.max(.1,r.distance) >= .65 &&
          r.distance-r.s.width/2 <= 18)
        .sort((a,b)=>a.distance-b.distance||a.s.id.localeCompare(b.s.id))[0];
      if (!road) continue;
      const sb=area.songWatBounds, song=road.s.name==='Song Wat Road';
      if(song&&(x<sb[0]!||x>sb[1]!||z<sb[2]!||z>sb[3]!))continue;
      const margin = Math.min(
        ...[-0.45, 0, 0.45].map((u) =>
          roadClearance(x + nz * width * u, z - nx * width * u),
        ),
      );
      if (margin < 0.35) continue;
      clear ??= frontageVisibility(chunk);
      if(!clear(b.id,x-chunk.origin[0]+nx*.12,z-chunk.origin[1]+nz*.12,road.x-chunk.origin[0],road.z-chunk.origin[1]))continue;
      result.push({
        id: `${b.id}:${e.polygon}:${e.edge}`,
        siteId: chinatownSite(`${b.id}:${e.polygon}:${e.edge}`)?.id,
        buildingId: b.id,
        street: road.s.id,
        chunk: chunk.origin.join(":"),
        style: song ? "songwat" : "yaowarat",
        x,
        z,
        nx,
        nz,
        width,
        height: b.height,
        floors: Math.max(
          2,
          Math.min(6, b.floors || Math.round(b.height / 3.4)),
        ),
        seed: stableHash(`${b.id}:${e.edge}`),
        family: b.family,
        tradeHint:
          b.tags.shop === "jewelry"
            ? 0
            : b.tags.shop === "pharmacy"
              ? 5
              : b.tags.shop === "convenience"
                ? 10
                : b.tags.amenity === "cafe"
                  ? 3
                  : b.tags.amenity === "restaurant"
                    ? 4
                    : b.tags.tourism === "hotel"
                      ? 7
                      : b.tags.building === "warehouse"
                        ? 8
                        : undefined,
        setback:margin,
        outset: Math.min(1.65, margin - 0.25),
        edge: e,
      });
    }
  }
  // Adjacent collinear source edges may overlap (source building parts). Keep one
  // frontage per shared physical segment; never move or modify the source shape.
  return result
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter(
      (f, i, all) =>
        !all
          .slice(0, i)
          .some(
            (a) =>
              Math.hypot(a.x - f.x, a.z - f.z) < 1.5 &&
              Math.abs(a.nx * f.nx + a.nz * f.nz) > 0.95,
          ),
    );
}
export function facadeTrade(f: Facade, bay = 0) {
  const seed = bay ? stableHash(`${f.id}:bay:${bay}`) : f.seed;
  return chinatownSite(f.id)?.trade ?? f.tradeHint ?? (f.style === 'songwat'
    ? [6,8,2,3][seed%4]!
    : [0,1,2,3,4,5,6,7,9,10,11][seed%11]!);
}
export type PackedAttribute = {
  array: T.TypedArray;
  size: number;
  normalized: boolean;
  instanced: boolean;
  stride?: number;
  offset?: number;
};
export type DecorationBatch = {
  layer: string;
  center: number[];
  attributes: Record<string, PackedAttribute>;
  index?: T.TypedArray;
  matrices?: Float32Array;
  colors?: T.TypedArray;
  count?: number;
  sign?: "h" | "v";
};
export type ChinatownDecoration = {
  facades: Facade[];
  batches: DecorationBatch[];
  pieces: number;
  bytes: number;
  props: (Obstacle & { sourceId: string })[];
  life: LifeAnchor[];
};
function packed(
  mesh: T.Mesh,
  layer: string,
  center: number[],
): DecorationBatch {
  const attributes: Record<string, PackedAttribute> = {};
  for (const [name, raw] of Object.entries(mesh.geometry.attributes)) {
    const a = raw as T.BufferAttribute | T.InterleavedBufferAttribute;
    const interleaved = a instanceof T.InterleavedBufferAttribute;
    attributes[name] = {
      array: interleaved ? a.data.array : a.array,
      stride: interleaved ? a.data.stride : undefined,
      offset: interleaved ? a.offset : undefined,
      size: a.itemSize,
      normalized: a.normalized,
      instanced: a instanceof T.InstancedBufferAttribute,
    };
  }
  const im = mesh instanceof T.InstancedMesh ? mesh : undefined;
  return {
    layer,
    center,
    attributes,
    index: mesh.geometry.index?.array,
    matrices: im?.instanceMatrix.array as Float32Array | undefined,
    colors: im?.instanceColor?.array,
    count: im?.count,
  };
}
/** Worker-only original decorative grammar; footprints/colliders are never edited. */
export function prepareChinatown(
  chunk: GeographicChunkData,
): ChinatownDecoration | undefined {
  const facades = geographicFacades(chunk);
  if (!facades.length) return;
  const material = new T.MeshStandardMaterial(),
    batch = new ArchitecturalBatch(material, material, 60, false),
    signs = new Map<
      string,
      { p: number[]; uv: number[]; center: number[]; vertical: boolean }
    >();
  const props: (Obstacle & { sourceId: string })[] = [];
  const life:LifeAnchor[]=[];
  const visible=frontageVisibility(chunk);
  const frontageIds=new Set(facades.map(f=>f.id)),returned=new Set<string>(),sourceBuildings=new Map((chunk.buildings??[]).map(b=>[b.id,b]));
  let pieces = 0;
  for (const f of [...facades].sort((a,b)=>Number(!!b.siteId)-Number(!!a.siteId)||a.id.localeCompare(b.id))) {
    const song = f.style === "songwat",
      seed = f.seed,
      modern = f.style !== "songwat" && f.seed % 5 === 2,
      W = f.width,
      H = f.height,
      n = Math.max(1, Math.ceil(W / 5.7)),
      bay = W / n,
      fh = H / f.floors;
    const site=chinatownSite(f.id);
    const baseType = facadeTrade(f);
    const wall = (
      song
        ? ["#cbbd9e", "#e5d8bb", "#c6c5b1", "#d8c9a7"]
        : ["#a0b9ae", "#cfb59a", "#b0ad99", "#d6c4a0", "#93aba9", "#b8b6a7"]
    )[seed % (song ? 4 : 6)]!;
    const accent =
      baseType === 0
        ? "#98202a"
        : song
          ? "#476453"
          : ["#386b66", "#8b3636", "#253c53", "#aa713d"][seed % 4]!;
    const yaw = Math.atan2(f.nx, f.nz),
      out = f.outset;
    const put = (
      u: number,
      y: number,
      v: number,
      w: number,
      h: number,
      d: number,
      color: string,
      layer: ArtPiece["layer"] = "core",
      shape: ArtPiece["shape"] = "box",
      rotate = 0,
      surface: ArtPiece["surface"] = "plaster",
    ) => {
      if (pieces >= 18000 && layer === "detail") return;
      if(y<3.2&&v+d/2>.1&&decorativeRoadClearance(f.x+f.nz*u+f.nx*v,f.z-f.nx*u+f.nz*v,w,d,yaw+rotate)<.12)return;
      if (
        (layer === "near" || layer === "core") &&
        shape === "box" &&
        y > 0.4 &&
        y < 1 &&
        h > .6 &&
        d > 0.3 &&
        props.length < 256
      )
        props.push({
          x: f.x + f.nz * u + f.nx * v,
          z: f.z - f.nx * u + f.nz * v,
          w,
          d,
          height: y + h / 2,
          color,
          yaw: yaw + rotate,
          sourceId: `decor:${f.id}`,
        });
      // Flat rear panels/windows need only the outward face. Keep projecting
      // profiles, equipment and near props volumetric.
      if (shape === "box" && d <= 0.18 && (layer === "core" || layer === "night")) shape = "panel";
      batch.add({
        x: f.x - chunk.origin[0] + f.nz * u + f.nx * v,
        y,
        z: f.z - chunk.origin[1] - f.nx * u + f.nz * v,
        w,
        h,
        d,
        color,
        yaw: yaw + rotate,
        layer,
        shape,
        surface,
        glow:renaissanceFrontage(f)&&v<.12&&y<3.2? (baseType===0?"#71532d":"#63503b"):undefined,
      });
      pieces++;
    };
    const sign = (
      u: number,
      y: number,
      v: number,
      w: number,
      h: number,
      vertical = false,
      rotation = 0,
      reverse = false,
      trade = site?.sign ?? baseType,
    ) => {
      const ang = yaw + rotation + (reverse ? Math.PI : 0),
        tx = Math.cos(ang),
        tz = -Math.sin(ang),
        x =
          f.x -
          chunk.origin[0] +
          f.nz * u +
          f.nx * v +
          (vertical ? Math.sin(ang) * 0.14 : 0),
        z =
          f.z -
          chunk.origin[1] -
          f.nx * u +
          f.nz * v +
          (vertical ? Math.cos(ang) * 0.14 : 0);
      const cell = `${Math.floor(x / 60)}:${Math.floor(z / 60)}:${vertical}`;
      let s = signs.get(cell);
      if (!s) {
        s = {
          p: [],
          uv: [],
          center: [
            Math.floor(x / 60) * 60 + 30,
            0,
            Math.floor(z / 60) * 60 + 30,
          ],
          vertical,
        };
        signs.set(cell, s);
      }
      const cols = vertical ? 8 : 4,
        rows = Math.ceil(GEO_SHOP_SIGNS.length / cols),
        col = trade % cols,
        row = Math.floor(trade / cols),
        corners = [
          [-0.5, -0.5],
          [0.5, -0.5],
          [0.5, 0.5],
          [-0.5, 0.5],
        ];
      for (const i of [0, 1, 2, 0, 2, 3]) {
        const [a, b] = corners[i]!;
        s.p.push(x + tx * a! * w, y + b! * h, z + tz * a! * w);
        s.uv.push(
          (col + 0.012 + (a! + 0.5) * 0.976) / cols,
          (rows - row - 1 + 0.012 + (b! + 0.5) * 0.976) / rows,
        );
      }
    };
    if(renaissanceFrontage(f)){
      emitRenaissanceFacade(f,put,sign,site,Array.from({length:n},(_,j)=>facadeTrade(f,j)));
      const sourceBuilding=sourceBuildings.get(f.buildingId)!;
      emitRenaissanceReturns(f,sourceBuilding,put,e=>{
        const id=`${f.buildingId}:${e.polygon}:${e.edge}`;
        if(e.ring!==0||!e.collision||frontageIds.has(id)||returned.has(id))return false;
        const shared=[e.a,e.b].some(p=>[f.edge.a,f.edge.b].some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<.02));if(!shared)return false;
        const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],len=Math.hypot(dx,dz);if(len<2||len>50)return false;
        const ccw=(f.edge.b[1]-f.edge.a[1])*f.nx-(f.edge.b[0]-f.edge.a[0])*f.nz>0?1:-1,nx=ccw*dz/len,nz=-ccw*dx/len;
        const x=(e.a[0]+e.b[0])/2,z=(e.a[1]+e.b[1])/2;
        if(roadClearance(x+chunk.origin[0],z+chunk.origin[1])>12||!visible(f.buildingId,x+nx*.12,z+nz*.12,x+nx*.5,z+nz*.5))return false;
        returned.add(id);return true;
      });
      // Retain a bounded cook anchor behind the worktop, with a clear upper silhouette.
      if([1,4,11].includes(baseType)&&out>1.25&&life.length<24){
        const u=-W/2+bay*.5,x=f.x+f.nz*u+f.nx*.19,z=f.z-f.nx*u+f.nz*.19;
        if(decorativeRoadClearance(x,z,.68,.7,yaw)>.18)life.push({sourceId:f.id,x:x-chunk.origin[0],z:z-chunk.origin[1],yaw,kind:baseType===4?'wok':'stir',seed,travel:0,skin:'#b98c68',shirt:['#59766b','#a65e49','#b7b2a0'][seed%3]!});
      }
      continue;
    }
    // Thin coloured skin follows every admitted edge. Existing massing remains authoritative.
    put(0, H / 2, 0.035, W - 0.08, H, 0.06, wall);
    put(0, 3.6, 0.18, W, 0.15, 0.35, accent);
    put(0, H - 0.3, 0.18, W, 0.32, 0.4, song ? "#e9dfc4" : "#c9c3ac");
    for (let j = 0; j < n; j++) {
      const type = facadeTrade(f,j);
      const accent = type === 0 ? "#98202a" : song ? "#476453" : ["#386b66","#8b3636","#253c53","#aa713d"][(seed+j)%4]!;
      const u = -W / 2 + bay * (j + 0.5),
        span = bay - 0.3;
      put(u, 1.55, 0.09, span, 2.9, 0.1, "#202d2b"); // real recessed shop back behind front columns/counter
      put(
        u - bay / 2 + 0.15,
        H / 2,
        0.16,
        0.24,
        H,
        0.3,
        song ? "#e8dec4" : "#ddd2b5",
      );
      put(u, 3.15, 0.16, span, 0.85, 0.18, accent);
      sign(u, 3.15, 0.27, span - 0.1, 0.7, false, 0, false, site?.sign ?? type);
      const glow = type === 0 ? "#fbd281" : song ? "#ac8a52" : "#e6b87d";
      put(u, 2.77, .24, span*.8, .12, .08, glow, "night");
      // Sheltered display room: floor, ceiling, splayed jambs and rear wall.
      // All depth projects into the independently cleared shop-owned setback.
      const depth=Math.max(.22,Math.min(1.45,out-.12));
      put(u,.16,depth/2,span,.13,depth,"#665d4c","near");
      put(u,2.85,depth/2,span,.1,depth,"#b8a988","near");
      for(const side of [-1,1])put(u+side*(span/2-.06),1.5,depth/2,.12,2.65,depth,side<0?"#897659":"#c4ac80","near");
      put(u,2.5,.14,span*.86,.1,.1,"#9d7c4b","near");
      put(u,1.5,.13,span*.58,1.8,.08,type===0?"#58282a":"#31413b");
      for(const side of [-1,1])put(u+side*span*.29,1.48,.24,.06,2.25,.09,type===0?"#b88d4a":"#948c72","near");
      put(
        u,
        1.1,
        Math.min(0.9, out * 0.55),
        span * 0.8,
        0.15,
        0.55,
        type === 0 ? "#c19542" : "#656e68",
        "near",
      );
      put(
        u,
        0.55,
        Math.min(0.9, out * 0.55),
        span * 0.8,
        0.9,
        0.45,
        type === 0 ? "#6c4828" : "#405c54",
        "near",
      );
      // Recessed display glass + shelves, gold trays or steaming noodle equipment.
      if (type === 0) {
        put(u, 0.99, 0.63, span * 0.72, 0.25, 0.12, "#8aabb0", "near");
        for (let k = 0; k < 4; k++)
          put(
            u - span * 0.28 + k * span * 0.18,
            1.21,
            0.72,
            0.16,
            0.2,
            0.1,
            "#e1be56",
            "detail",
            "orb",
          );
        put(u, 2.5, 0.3, span * 0.78, 0.12, 0.2, "#d6b553", "near");
        for(const k of [-1,0,1]){
          put(u+k*span*.22,1.95,.23,.3,.48,.12,'#2b2626','near','orb');
          put(u+k*span*.22,2.04,.32,.2,.25,.045,'#d8b856','near','arch');
          put(u+k*span*.22,1.65,.25,.4,.08,.2,'#b59150','near');
        }
        put(u,1.13,.78,span*.68,.045,.2,'#e6c578','night');
      } else if ([1, 4, 11].includes(type)) {
        for (const k of [-1, 1]) {
          put(
            u + k * 0.5,
            1.4,
            0.62,
            0.55,
            0.6,
            0.5,
            "#a7b3ae",
            "near",
            "cylinder",
            0,
            "metal",
          );
          put(
            u + k * 0.5,
            1.75,
            0.62,
            0.48,
            0.08,
            0.45,
            "#d3d7c9",
            "detail",
            "cylinder",
          );
        }
        put(u, 2.6, 0.36, 0.65, 0.72, 0.1, "#ece0bf", "near");
        if (out > 1.2) {
          put(u, 0.55, 1.0, 0.75, 0.12, 0.6, "#d1b77f", "detail");
          for (const k of [-1, 1]) {
            put(
              u + k * 0.65,
              0.22,
              0.95,
              0.32,
              0.44,
              0.32,
              k > 0 ? "#c7493d" : "#328b76",
              "detail",
              "cylinder",
            );
          }
        }
      } else if (type === 5) {
        for (let k = 0; k < 3; k++)
          put(u, 1 + k * 0.47, 0.5, span * 0.8, 0.1, 0.4, "#d8ddc4", "near");
      } else {
        put(u, 1.5, 0.43, span * 0.65, 0.1, 0.45, "#a88b60", "near");
        for (const k of [-1, 0, 1])
          put(
            u + k * 0.6,
            0.42,
            0.6,
            0.43,
            0.75,
            0.43,
            "#aa9065",
            "detail",
            "box",
            0,
            "wood",
          );
      }
      // Individually composed trade equipment, original fictional shop interiors.
      if (type === 2) {
        // tea merchant: jars, carved shelving and a tea table
        for (let k = 0; k < 4; k++) {
          put(
            u - span * 0.3 + k * span * 0.2,
            1.8,
            0.48,
            0.25,
            0.45,
            0.25,
            "#bcae7c",
            "near",
            "cylinder",
          );
          put(
            u - span * 0.3 + k * span * 0.2,
            2.07,
            0.48,
            0.28,
            0.08,
            0.28,
            "#50695b",
            "detail",
            "cylinder",
          );
        }
        put(u, 2.35, 0.26, span * 0.8, 0.08, 0.3, "#8d6346", "near");
      } else if (type === 3) {
        // coffee counter with espresso machine and grinders
        put(u, 1.96, 0.57, 0.9, 0.55, 0.38, "#34464b", "near");
        put(u, 2.28, 0.58, 0.78, 0.08, 0.4, "#c5c9bc", "detail");
        put(
          u + 0.7,
          2.02,
          0.55,
          0.25,
          0.55,
          0.25,
          "#a9b9ad",
          "near",
          "cylinder",
        );
        put(
          u + 0.7,
          2.38,
          0.55,
          0.26,
          0.25,
          0.26,
          "#725443",
          "detail",
          "cylinder",
        );
      } else if (type === 5) {
        // original pharmacy frontage: cross is commercial, not traffic control
        put(u - span * 0.32, 2.3, 0.32, 0.38, 0.12, 0.09, "#93d1a7", "near");
        put(u - span * 0.32, 2.3, 0.32, 0.12, 0.4, 0.1, "#93d1a7", "near");
        for (let k = 0; k < 6; k++)
          put(
            u - span * 0.25 + k * span * 0.1,
            1.3,
            0.49,
            0.12,
            0.25,
            0.12,
            k % 2 ? "#bed2c3" : "#d2a66d",
            "detail",
          );
      } else if (type === 6 || type === 8) {
        // merchant / warehouse: folding gates and stacked goods
        for (const side of [-1, 1])
          for (let k = 0; k < 4; k++)
            put(
              u + side * span * 0.4 + k * 0.04,
              1.55,
              0.27,
              0.045,
              2.75,
              0.17,
              "#4c6255",
              "near",
            );
        for (let k = 0; k < 3; k++)
          put(
            u + span * 0.23,
            0.24 + k * 0.38,
            0.64,
            0.55,
            0.35,
            0.45,
            "#b79b6d",
            "detail",
            "box",
            0,
            "wood",
          );
      } else if (type === 7) {
        // small guesthouse: arched foyer, reception and brass key rack
        put(u, 2.4, 0.33, span * 0.55, 0.65, 0.18, "#d8c59d", "near", "arch");
        put(u - span * 0.28, 1.8, 0.3, 0.65, 0.75, 0.14, "#765543", "near");
        for (let k = 0; k < 4; k++)
          put(
            u - span * 0.28 + (k % 2) * 0.18 - 0.09,
            1.64 + Math.floor(k / 2) * 0.28,
            0.39,
            0.09,
            0.15,
            0.06,
            "#d5b465",
            "detail",
          );
      } else if (type === 9) {
        // produce crates: actual rounded fruit silhouettes
        for (let k = 0; k < 7; k++)
          put(
            u - span * 0.29 + k * span * 0.095,
            1.85,
            0.62,
            0.23,
            0.23,
            0.23,
            ["#c85439", "#c3ad45", "#5c854f"][k % 3]!,
            "near",
            "orb",
          );
      } else if (type === 10) {
        // mini market: recessed cool cabinet and striped stocked shelves
        put(u + span * 0.27, 1.45, 0.4, 0.72, 2.0, 0.38, "#bdcbbd", "near");
        put(u + span * 0.27, 1.5, 0.62, 0.55, 1.65, 0.06, "#436870", "near");
        for (let k = 0; k < 3; k++)
          put(
            u - span * 0.2,
            1.1 + k * 0.4,
            0.55,
            span * 0.4,
            0.08,
            0.4,
            "#e4d9b8",
            "near",
          );
      } else if (type === 11) {
        // bamboo steamers and pastry trays
        for (let k = 0; k < 3; k++)
          put(
            u - 0.4,
            1.87 + k * 0.13,
            0.6,
            0.5,
            0.12,
            0.5,
            "#c5a36b",
            "near",
            "cylinder",
            0,
            "wood",
          );
        for (let k = 0; k < 4; k++)
          put(
            u + 0.2 + k * 0.2,
            1.85,
            0.65,
            0.15,
            0.13,
            0.15,
            "#e1c59c",
            "detail",
            "orb",
          );
      }
      if ([1,4].includes(type) && out > 1.4 && j === 0) {
        // Compact vendor trolley and stools, all admitted by the same road clearance.
        put(u-span*.32,.78,.94,.68,.86,.43,"#8b9c94","near","box",0,"metal");
        put(u-span*.32,1.25,.94,.74,.08,.5,"#c2ccc2","near","box",0,"metal");
        for (const side of [-1,1]) put(u-span*.32+side*.25,.25,.99,.15,.15,.15,"#343e3a","detail","orb");
        put(u+span*.32,.48,1.0,.38,.09,.38,"#b43939","near","cylinder");
        for(const side of [-1,1])put(u+span*.32+side*.12,.24,1.0,.06,.45,.08,"#b43939","detail");
      }
      // Upper-floor window bays, shutters, lintels, rails, balcony brackets and AC.
      for (let floor = 1; floor < f.floors; floor++) {
        if(site?.composition==='goldTower'&&j===0)continue;
        const y = floor * fh + fh * 0.53,
          ww = span * (modern ? 0.83 : 0.65),
          hh = Math.min(modern ? 2.4 : 1.85, fh * 0.64);
        put(
          u,
          y,
          0.105,
          ww + 0.24,
          hh + 0.28,
          0.14,
          song ? "#e8ddbd" : "#dcd0b6",
        );
        put(u, y, 0.2, ww, hh, 0.12, song ? "#405d50" : modern ? "#638186" : "#304b51");
        if (!song && !modern && seed % 4 === 0) {
          for (const side of [-1, 1]) put(u+side*ww*.39,y,.29,ww*.22,hh,.08,accent,"near","box",0,"wood");
        }
        if (modern) put(u,y+hh/2+.1,.24,ww+.3,.12,.25,"#b3c3c2","near","box",0,"metal");
        put(u, y, 0.3, 0.085, hh, 0.15, "#b8b99c", "near");
        put(u, y - hh / 2, 0.35, ww + 0.38, 0.12, 0.45, "#ded1ae", "near");
        if (song) {
          put(
            u,
            y + hh / 2,
            0.25,
            ww * 0.8,
            0.4,
            0.18,
            "#e5d7b4",
            "near",
            "arch",
          );
          for (const k of [-1, 1])
            for (let sl = 0; sl < 4; sl++)
              put(
                u + k * ww * 0.28,
                y - hh * 0.32 + sl * hh * 0.2,
                0.31,
                ww * 0.37,
                0.065,
                0.12,
                "#74826a",
                "detail",
              );
        } else if ((seed + floor + j) % 3 !== 0 && out > 0.65) {
          put(u, y - hh * 0.55, 0.48, ww + 0.5, 0.13, 0.8, wall, "near");
          put(u, y - hh * 0.15, 0.82, ww + 0.45, 0.07, 0.07, "#3b4d48", "near");
          for (let k = 0; k < 5; k++)
            put(
              u - ww / 2 + (k * ww) / 4,
              y - hh * 0.35,
              0.82,
              0.045,
              0.65,
              0.045,
              "#3b4d48",
              "detail",
            );
        }
        if (!song && (seed + j + floor) % 4 === 0) {
          put(
            u + span * 0.35,
            y - hh * 0.5,
            0.35,
            0.85,
            0.5,
            0.4,
            "#bbc2b6",
            "near",
          );
          for (let k = 0; k < 4; k++)
            put(
              u + span * 0.35,
              y - hh * 0.5 - 0.15 + k * 0.1,
              0.57,
              0.7,
              0.035,
              0.04,
              "#6b7974",
              "detail",
            );
        }
        if ((seed + floor + j) % 4 === 0)
          put(u, y, 0.29, ww * 0.8, hh * 0.8, 0.05, "#d6b67b", "night");
      }
      // Fabric awning has valance and distinct projecting supports, above vehicle height.
      const canopy = Math.min(1.2, out);
      if (canopy > 0.4) {
        put(
          u,
          2.68,
          canopy / 2,
          span,
          0.12,
          canopy,
          accent,
          "near",
          "box",
          0,
          "cloth",
        );
        for (let k = 0; k < 6; k++)
          put(
            u - span / 2 + ((k + 0.5) * span) / 6,
            2.51,
            canopy - 0.06,
            span / 6,
            0.26,
            0.12,
            k % 2 ? accent : "#d6c59d",
            "detail",
            "box",
            0,
            "cloth",
          );
      }
      if(type===0) {
        put(u,3.72,.24,span-.1,.13,.25,"#c7a244","near");
        for(const side of [-1,1])put(u+side*span*.44,1.62,.3,.08,2.65,.12,"#c7a244","near");
        put(u,3.9,.25,.34,.28,.12,"#d6b553","near","orb");
      }
      if (j === 0 && !song && out > 0.9 && H > 8) {
        const sy = Math.min(H - 2.5, 7.8),
          v = 0.49;
        put(
          -W/2+.27,
          sy,
          v,
          0.82,
          4.4,
          0.14,
          accent,
          "near",
          "box",
          Math.PI / 2,
        );
        put(-W/2+.27, sy - 2.1, 0.28, 0.1, 0.09, 0.6, "#8a7e65", "near");
        put(-W/2+.27, sy + 2.1, 0.28, 0.1, 0.09, 0.6, "#8a7e65", "near");
        sign(-W/2+.27, sy, v + 0.01, 0.75, 4.2, true, Math.PI / 2, false, site?.sign ?? type);
        sign(-W/2+.27, sy, v + 0.01, 0.75, 4.2, true, Math.PI / 2, true, site?.sign ?? type);
      }
      if (j === 0 && out > 1.4 && seed % 4 === 0) {
        put(
          u - span * 0.3,
          0.3,
          0.85,
          0.4,
          0.6,
          0.4,
          "#956c4d",
          "detail",
          "cylinder",
        );
        for (const turn of [-0.6, 0.6, 1.8])
          put(
            u - span * 0.3,
            1.15,
            0.85,
            0.75,
            1.0,
            0.25,
            "#4b7855",
            "detail",
            "leaf",
            turn,
          );
      }
      if (j === 0 && out > 1.1) {
        // shop-owned pole, cable loom and lamp; kept off drivable surface
        put(
          u - bay * 0.43,
          3.7,
          0.75,
          0.11,
          7.4,
          0.11,
          "#6f7264",
          "near",
          "cylinder",
        );
        for (let k = 0; k < 3; k++)
          put(u, 5.4 + k * 0.17, 0.7, span, 0.025, 0.025, "#252c2c", "near");
        put(u - bay * 0.4, 5, 0.8, 0.4, 0.15, 0.4, "#edc886", "night", "orb");
      }
    }
    // Rhythm changes at source boundaries; no new massing or source height.
    for(let k=0;k<n;k++){
      const u=-W/2+(k+.5)*bay;
      if(seed%3===0||song){put(u,H-.6,.2,bay*.8,.3,.28,song?'#d9c9a6':'#b4ad96','near','arch');}
      if(seed%4===1)put(u,H-.8,.15,bay*.6,.4,.12,'#6b827d');
      if(k===0)put(u-bay*.43,H*.5,.32,.075,H-.8,.12,'#6d756c','near','cylinder');
      if(!song&&seed%3===1)put(u,H-.15,.3,bay-.18,.14,.64,'#a9a694','near');
    }
    // Composed hero sites get a coherent entrance instead of unrelated tenants.
    if(site){
      const span=Math.min(W-.35,site.composition==='hotel'?12:W-.35),deep=Math.min(out-.1,1.45);
      if(site.composition==='heritageGold'){
        for(const side of [-1,1]){
          put(side*(W/2-.3),H/2,.2,.44,H,.4,'#e4d9be');
          for(let y=3.7;y<H;y+=H/7){put(side*(W/2-.3),y,.34,.65,.18,.4,'#af9d7c','near');}
        }
        for(let floor=1;floor<7;floor++)put(0,floor*H/7,.25,W,.18,.4,'#e4d5b6');
        put(0,H-1,.23,W*.68,.8,.25,'#b6a27c','near','arch');
        put(0,4.2,.24,W*.75,1.05,.2,'#77272c');sign(0,4.2,.36,W*.71,.92);
      }else if(site.composition==='goldTower'){
        const sh=Math.min(9,H-4.2),sy=H-sh/2-.5,su=-W/2+bay/2;
        put(su,sy,.39,1.6,sh,.3,'#721e28');
        for(const side of [-1,1])put(su+side*.86,sy,.51,.09,sh+.15,.14,'#d8b359','near');
        sign(su,sy,.56,1.5,sh-.2,true);
        put(0,3.8,.3,W-.2,.3,.4,'#d8b359');
      }else if(site.composition==='hotel'){
        put(0,3.6,.3,span,1.05,.5,'#87363b');sign(0,3.6,.57,span-.2,.85);
        for(const side of [-1,1])put(side*span*.4,1.75,Math.max(.2,deep*.6),.55,3.1,.5,'#d2c2a4','near');
        put(0,2.95,deep/2,span, .22,deep,'#7c5946','near');
        put(0,1.75,.3,span*.55,2.25,.12,'#476368','near');
      }else if(site.composition==='restaurant'){
        put(0,3.8,.23,W-.2,.9,.25,'#e1d0a5');sign(0,3.8,.38,W-.5,.76);
        for(let k=0;k<Math.min(n,3);k++){
          const u=-W/2+(k+.5)*bay;
          put(u,2.4,.25,bay*.6,.65,.25,'#77847c','near','canopy');
          put(u,2.9,.22,.35,.7,.22,'#8e9990','near','cylinder');
          put(u,1.2,.35,.7,.1,.5,'#b7b196','near');
          for(const side of [-1,1])put(u+side*.4,.38,.4,.28,.7,.28,side<0?'#874d3d':'#43766a','detail','cylinder');
          put(u,1.87,.75,.5,.1,.5,'#3b4542','near','cylinder');
          for(let b=0;b<3;b++)put(u-.45+b*.25,1.82,.48,.19,.1,.19,'#e8d8b5','detail','orb');
          put(u,2.1,.15,bay*.5,.4,.07,'#dfd1aa','near');
        }
      }else if(site.composition==='warehouse'){
        put(0,3.65,.22,W-.3,.65,.25,'#b7a580');sign(0,3.65,.36,W-.6,.52);
        for(const side of [-1,1]){put(side*W*.43,1.6,.35,.45,2.8,.3,'#697361','near');for(let k=0;k<3;k++)put(side*W*.25,.35+k*.4,.6,.7,.38,.45,'#a88d61','near','box',0,'wood');}
        put(0,H-.5,.25,W*.62,.7,.2,'#ddd0ac','near','arch');
      }else{
        const tint=site.composition==='tea'?'#446455':site.composition==='bakery'?'#a36f49':'#517c78';
        put(0,3.7,.24,W-.3,.7,.25,tint);sign(0,3.7,.39,W-.6,.58);
        put(0,2.95,Math.max(.2,deep/2),W-.3,.12,deep,tint,'near');
        for(const side of [-1,1])put(side*W*.4,1.5,.25,.26,2.7,.3,'#cdbb95','near');
      }
    }
    if(site&&out>1.3){
      for(const side of [-1,1]){
        put(side*(W/2-.5),2.7,.65,.035,.36,.035,'#6c6355','near');
        put(side*(W/2-.5),2.38,.65,.28,.38,.28,song?'#c3a977':'#a84a36','near','orb');
        put(side*(W/2-.5),2.18,.65,.08,.1,.08,'#d9b96c','night');
      }
      if(site.composition==='market'||site.composition==='warehouse'){
        for(let k=0;k<3;k++)put(-W*.3+k*.45,.25,1,.4,.45,.4,'#947c55','detail','box',0,'wood');
      }
    }
    // Select bounded local activity after static furniture is known. Actor
    // footprint and complete walking sweep must stay in the cleared setback.
    if(out>1.15&&W>4&&life.length<24&&(site||seed%4===0)){
      const kind=baseType===1?'stir':baseType===4?'wok':baseType===11?'serve':'browse';
      const addLife=(u:number,v:number,kind:LifeAnchor['kind'],travel=0)=>{
        if(life.length>=24)return;
        const x=f.x+f.nz*u+f.nx*v,z=f.z-f.nx*u+f.nz*v;
        if(decorativeRoadClearance(x,z,.68+travel*2,.7,yaw)<.18)return;
        for(const t of [-travel,0,travel])if(!visible(f.buildingId,f.x-chunk.origin[0]+f.nz*(u+t)+f.nx*.1,f.z-chunk.origin[1]-f.nx*(u+t)+f.nz*.1,x-chunk.origin[0]+f.nz*t,z-chunk.origin[1]-f.nx*t))return;
        if(kind!=='steam'&&kind!=='fan'&&props.some(p=>{const dx=x-p.x,dz=z-p.z,c=Math.cos(p.yaw??0),s=Math.sin(p.yaw??0);return Math.abs(c*dx-s*dz)<p.w/2+.3+travel&&Math.abs(s*dx+c*dz)<p.d/2+.18;}))return;
        life.push({sourceId:f.id,x:x-chunk.origin[0],z:z-chunk.origin[1],yaw,kind,seed,travel,skin:['#b88461','#c49b76','#ad7958'][seed%3]!,shirt:['#657b72','#b65c44','#d5cbb0','#4b6f86'][seed%4]!});
      };
      addLife(-W/2+bay*.5,.39,kind);
      if([1,4,11].includes(baseType)){addLife(-W/2+bay*.5,.48,'steam');addLife(W/2-.55,.3,'fan');}
      if(out>1.6&&W>9&&seed%2===0)addLife(0,1.35,'walk',Math.min(.6,W*.06));
    }
    if (song) {
      for (let k = 0; k < n; k++)
        put(
          -W / 2 + (k + 0.5) * bay,
          H - 0.75,
          0.2,
          0.35,
          0.28,
          0.22,
          "#b5a27c",
          "near",
          "orb",
        );
    }
  }
  emitRenaissanceRoadEdges(chunk,batch);
  const batches: DecorationBatch[] = [];
  for (const root of batch.finish()) {
    const mesh = root.children[0] as T.Mesh;
    batches.push(
      packed(mesh, root.name, (root.userData.center as T.Vector3).toArray()),
    );
    mesh.geometry.dispose();
    if (mesh instanceof T.InstancedMesh) mesh.dispose();
  }
  for (const s of signs.values())
    batches.push({
      layer: "CommercialSigns",
      center: s.center,
      sign: s.vertical ? "v" : "h",
      attributes: {
        position: {
          array: new Float32Array(s.p),
          size: 3,
          normalized: false,
          instanced: false,
        },
        uv: {
          array: new Float32Array(s.uv),
          size: 2,
          normalized: false,
          instanced: false,
        },
      },
    });
  material.dispose();
  const bytes = batches.reduce(
    (n, b) =>
      n +
      Object.values(b.attributes).reduce((s, a) => s + a.array.byteLength, 0) +
      (b.index?.byteLength ?? 0) +
      (b.matrices?.byteLength ?? 0) +
      (b.colors?.byteLength ?? 0),
    0,
  );
  return { facades, batches, pieces, bytes, props, life };
}
