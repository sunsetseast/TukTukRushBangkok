import * as T from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
import type { District, Obstacle } from "./types";
import { ASSETS, surface, disposeObject } from "./assets";
import { distanceToSegment } from "./world";
import { composeFacade, composeSide, clearFacadeCache, defaultSign, type Style, type MatKey, type FacadeApi } from "./miniatureFacade";
import { buildSignAtlas, type SignEntry } from "./signArt";
import { buildSignatureFacade, buildOppositeFacadeArt } from "./signatureFacadeArt";
import { TRADE, tradeKeys, buildYaowaratBlades } from "./yaowaratSignLayers";
import { degreeMap, sidewalkRange } from "./roadGeometry";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/** Small spatial batches keep culling useful; all art stays outside road/collision envelopes. */
export function buildStreetscape(
  d: District,
  textures: Map<string, T.Texture>,
) {
  const root = new T.Group(),
    details: T.Group[] = [],
    shells: T.Group[] = [];
  const plasterMap = surface(textures, ASSETS.plaster, 2),
    pavingMap = surface(textures, ASSETS.paving, 3);
  const plaster = new T.MeshStandardMaterial({ map: plasterMap, vertexColors: true, roughness: 0.95 });
  const stone = new T.MeshStandardMaterial({ map: pavingMap, vertexColors: true, roughness: 0.94 });
  const metal = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.56, metalness: 0.3 });
  const glass = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.35 });
  const STYLES: Style[] = ["gold", "noodle", "heritage", "pharmacy", "hotel"];
  const styleOf = (b: Obstacle, i: number): Style => b.style ?? STYLES[i % 5]!;
  const entries: SignEntry[] = [];
  const keyOf = (b: Obstacle, i: number) => {
    const style = styleOf(b, i),
      text = b.sign ?? defaultSign[style],
      key = b.signatureId ? `hero:${b.signatureId}` : `${text}|${style}|${i % 2}`;
    if (!entries.some((e) => e.key === key)) entries.push({ key, text, style, variant: i % 2, signatureId: b.signatureId });
    return key;
  };
  const keys = d.buildings.map((b, i) => keyOf(b, i));
  const heroes=d.buildings.filter(b=>b.signatureId);
  const dist=(b:Obstacle)=>Math.min(...heroes.map(h=>Math.hypot(b.x-h.x,b.z-h.z)));
  const context=d.buildings.filter(b=>!b.signatureId && b.showcase &&
    b.signatureInfillIndex===undefined && dist(b)<125).sort((a,b)=>dist(a)-dist(b)).slice(0,20);
  const nearShops=new Set<Obstacle>([
    ...d.buildings.filter(b=>b.signatureInfillIndex!==undefined),...context,
  ]);
  const signsByBuilding=new Map<Obstacle,[string,string]>();
  for(const [i,b] of d.buildings.entries()){
    if(!nearShops.has(b))continue;
    const style=styleOf(b,i),variant=i%2, ids=tradeKeys(style,variant);
    signsByBuilding.set(b,ids);
    for(let slot=0;slot<2;slot++){
      const key=ids[slot]!;
      if(!entries.some(e=>e.key===key))
        entries.push({key,text:TRADE[style][variant]![slot]!,style,variant});
    }
  }
  const atlas = buildSignAtlas(entries);
  const mkSign = (a: { tex: T.Texture; cols: number; rows: number }) => {
    const m = new T.MeshStandardMaterial({ map: a.tex, emissiveMap: a.tex, emissive: "#ffffff", emissiveIntensity: 0.22, roughness: 0.6 });
    m.userData = { cols: a.cols, rows: a.rows };
    return m;
  };
  const sign = mkSign(atlas.h),
    verticalSign = mkSign(atlas.v);
  const cloth = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: T.DoubleSide });
  void textures;
  const sphere = new T.SphereGeometry(1, 8, 5),
    torus = new T.TorusGeometry(1, 0.09, 4, 10),
    box = new T.BoxGeometry(1, 1, 1),
    plane = new T.PlaneGeometry(1, 1);
  const buckets = new Map<
    string,
    { group: T.Group; material: T.Material; geometries: T.BufferGeometry[] }
  >();
  const temp = new T.Object3D();
  function piece(
    geo: T.BufferGeometry,
    m: T.Material,
    c: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    ry = 0,
    tile = -1,
    detail = true,
  ) {
    const cell = `${Math.floor(x / 96)},${Math.floor(z / 96)}`;
    const key = `${cell}:${m.uuid}:${detail}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      const group = new T.Group();
      group.userData.center = new T.Vector3(
        (Math.floor(x / 96) + 0.5) * 96,
        0,
        (Math.floor(z / 96) + 0.5) * 96,
      );
      root.add(group);
      if (detail) details.push(group);
      else shells.push(group);
      bucket = { group, material: m, geometries: [] };
      buckets.set(key, bucket);
    }
    temp.position.set(x, y, z);
    temp.rotation.set(0, ry, 0);
    temp.scale.set(sx, sy, sz);
    temp.updateMatrix();
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(
      temp.matrix,
    );
    if (tile >= 0) {
      const uv = g.getAttribute("uv"),
        cols = m.userData.cols as number,
        rows = m.userData.rows as number;
      for (let i = 0; i < uv.count; i++)
        uv.setXY(
          i,
          ((tile % cols) + uv.getX(i)) / cols,
          (rows - 1 - Math.floor(tile / cols) + uv.getY(i)) / rows,
        );
    } else {
      const col = new T.Color(c),
        colors = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = col.r;
        colors[i + 1] = col.g;
        colors[i + 2] = col.b;
      }
      g.setAttribute("color", new T.BufferAttribute(colors, 3));
    }
    bucket.geometries.push(g);
  }
  const B = (
    m: T.Material,
    c: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    dep: number,
    ry = 0,
    detail = true,
  ) => piece(box, m, c, x, y, z, w, h, dep, ry, -1, detail);
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  function front(b: Obstacle) {
    if (typeof b.yaw === "number") {
      const nx = Math.sin(b.yaw), nz = Math.cos(b.yaw);
      return { ry: b.yaw, w: b.w, dd: b.d, nx, nz };
    }
    let best = { distance: Infinity, point: { x: 0, z: 0 } };
    for (const r of d.roads) {
      const q = distanceToSegment(b, nodes.get(r.a)!, nodes.get(r.b)!);
      if (q.distance < best.distance) best = q;
    }
    const dx = best.point.x - b.x, dz = best.point.z - b.z;
    const xside = Math.abs(dx) / (b.w / 2) > Math.abs(dz) / (b.d / 2);
    const nx = xside ? Math.sign(dx) : 0, nz = xside ? 0 : Math.sign(dz);
    return { ry: Math.atan2(nx, nz), w: xside ? b.d : b.w, dd: xside ? b.w : b.d, nx, nz };
  }
  const mats: Record<MatKey, T.Material> = { plaster, metal, glass, cloth };
  d.buildings.forEach((b, i) => {
    const n = front(b), style = styleOf(b, i);
    const c = Math.cos(n.ry), sn = Math.sin(n.ry);
    const wx = (u: number, v: number) => b.x + c * u + sn * v,
      wz = (u: number, v: number) => b.z - sn * u + c * v;
    const wall = new T.Color(b.color).lerp(new T.Color("#ddcfb5"), 0.3).getStyle();
    // Bevelled masonry shell plus cornice; one rounded mass per building keeps silhouettes soft.
    piece(new RoundedBoxGeometry(n.w, b.height, n.dd, 1, 0.32), plaster, wall, b.x, b.height / 2, b.z, 1, 1, 1, n.ry, -1, false);
    B(metal, "#646c68", b.x, b.height + 0.1, b.z, n.w - 0.4, 0.2, n.dd - 0.4, n.ry, false);
    const id = atlas.index.get(keys[i]!)!;
    const api: FacadeApi = {
        add: (m, color, geo, u, y, v, detail = true) => piece(geo, mats[m], color, wx(u, v), y, wz(u, v), 1, 1, 1, n.ry, -1, detail),
        sign: (k, u, y, v, w, h) => piece(plane, sign, "#fff", wx(u, v), y, wz(u, v), w, h, 1, n.ry, k),
        vsign: (k, u, y, v, w, h, faceHalfWidth = 0.18) => {
          // Textured faces must sit on the *OUTSIDE* of the sign cabinet.
          // Previous hard-coded 0.18m buried textures inside 3m-wide hero
          // signs, leaving what looked like unmarked colored boxes.
          for (const side of [-1, 1])
            piece(plane, verticalSign, "#fff",
              wx(u + side * faceHalfWidth, v), y,
              wz(u + side * faceHalfWidth, v), w, h, 1,
              n.ry + (side * Math.PI) / 2, k);
        },
    };
    // Real-world reference shops are composed from dedicated geometry,
    // never covered by the interchangeable procedural gold/noodle facades.
    if (b.signatureId) {
      buildSignatureFacade(api, {
        id: b.signatureId, W: n.w, D: n.dd, H: b.height, sign: id,
      });
    } else {
      composeFacade(api, { style, W: n.w, D: n.dd, H: b.height, i, sign: id, businessName: b.sign, showcase: b.showcase ?? i % 4 === 0 });
    }
    composeSide(api, { style, W: n.w, D: n.dd, H: b.height, i });
    if (b.signatureInfillIndex !== undefined) buildOppositeFacadeArt(api, {
      index: b.signatureInfillIndex, W: n.w, D: n.dd, H: b.height, sign: id,
    });
    const extra=signsByBuilding.get(b);
    if(extra && b.height>12)
      buildYaowaratBlades(api,{W:n.w,D:n.dd,H:b.height,i,
        ids:[atlas.index.get(extra[0])!,atlas.index.get(extra[1])!]});
  });
  // Reference-inspired Yaowarat curb activity. Localized to the noodle shop
  // and contextual tea/heritage frontage; this creates real street composition
  // instead of scattering generic carts through every neighborhood.
  // Visual-only: never introduces a hard collision or road-centreline object.
  const carts: { x:number; z:number }[] = [];
  const lanternGeo = new T.SphereGeometry(1, 10, 7);
  const canopyGeo = new T.ConeGeometry(1, 0.62, 10);
  const poleGeo = new T.CylinderGeometry(1, 1, 1, 8);
  const landmarkShops = d.buildings.filter(b=>b.signatureId);
  const marketShopCandidates = d.buildings.filter(b=>!b.signatureId && b.showcase &&
    landmarkShops.some(h=>Math.hypot(h.x-b.x,h.z-b.z)<110))
    .sort((a,b)=>{
      const distance=(v:Obstacle)=>Math.min(...landmarkShops.map(h=>Math.hypot(h.x-v.x,h.z-v.z)));
      return distance(a)-distance(b);
    }).slice(0,17);
  const noodleSidewalk = [
    ...landmarkShops.filter(b=>b.signatureId==='nai442' ||
      b.signatureId==='tea-house' || b.signatureId==='heritage-balcony' ||
      b.signatureId==='traditional-medicine'),
    ...marketShopCandidates,
  ];
  for (const b of noodleSidewalk) {
    // A bounded set of curated, valid sidewalk stalls. Never uniformly flood
    // every street or cover the road with merchandise.
    if(carts.length>=19)break;
    const yaw = b.yaw ?? 0, nx = Math.sin(yaw), nz = Math.cos(yaw);
    const tx = Math.cos(yaw), tz = -Math.sin(yaw);
    const slots = b.signatureId === 'nai442' ? [-b.w * 0.30, b.w * 0.29]
      : [b.w * 0.31];
    for (const t of slots) {
      const gap = b.d/2 + 1.40, x = b.x + nx*gap + tx*t, z = b.z + nz*gap + tz*t;
      const pt = { x, z };
      if (carts.some(q=>Math.hypot(q.x-x, q.z-z)<3.2)) continue;
      // Check against ALL roads and all building/landmark footprints: close
      // crossroads are skipped rather than moving the stall into traffic.
      if (d.roads.some(r=>{
        const a=nodes.get(r.a)!, end=nodes.get(r.b)!;
        return distanceToSegment(pt,a,end).distance < r.width/2 + 2.3;
      })) continue;
      if (d.obstacles.some(o=>{
        const dx=x-o.x, dz=z-o.z, c=Math.cos(o.yaw??0), si=Math.sin(o.yaw??0);
        const ux=c*dx-si*dz, uz=si*dx+c*dz;
        return Math.hypot(Math.max(0,Math.abs(ux)-o.w/2),Math.max(0,Math.abs(uz)-o.d/2))<0.80;
      })) continue;
      carts.push(pt);
      // A tiny hand-pushed noodle cart with cream counter, visible condiment
      // jars, wheels, folded awning and two short, warm paper-lantern pendants.
      B(metal,'#b5b4aa',x,0.90,z,1.38,1.25,0.77,yaw);
      B(metal,'#d6d9d4',x,1.59,z,1.65,0.13,1.05,yaw);
      B(plaster,'#885342',x,0.53,z,1.29,0.18,0.82,yaw);
      for (const dx of [-0.57,0.57])
        for (const dz of [-0.37,0.37])
          piece(torus,metal,'#444d4d',x+dx,0.35,z+dz,0.28,0.28,0.28,0,-1,true);
      const red = b.signatureId === 'nai442' ? '#af2d35' : '#b74a36';
      // Only the overhead canopy overhangs the walkway; no road pole.
      for (const dx of [-0.54,0.54]) {
        B(metal,'#786c55',x+tx*dx,2.14,z+tz*dx,0.055,1.31,0.055);
      }
      piece(canopyGeo,cloth,red,x,2.91,z,1.27,1,1.14,yaw,-1,true);
      for (const dx of [-0.51,0.51]) {
        piece(lanternGeo,metal,'#c5433f',x+tx*dx,2.38,z+tz*dx,0.18,0.26,0.18,0,-1,true);
        piece(sphere,metal,'#f6d18d',x+tx*dx,2.15,z+tz*dx,0.10,0.10,0.10,0,-1,true);
      }
      for (const [dx,col] of [[-0.4,'#b76535'],[0,'#e5cd87'],[0.4,'#496d4c']] as const)
        piece(poleGeo,metal,col,x+tx*dx,1.79,z+tz*dx,0.11,0.26,0.11,yaw,-1,true);
    }
  }
  lanternGeo.dispose();
  canopyGeo.dispose();
  poleGeo.dispose();
  // Flat sidewalks follow every sampled segment; they are cut back only at real junctions.
  const deg = degreeMap(d);
  for (const r of d.roads) {
    const a = nodes.get(r.a)!, b = nodes.get(r.b)!,
      len = Math.hypot(b.x - a.x, b.z - a.z),
      ry = Math.atan2(b.x - a.x, b.z - a.z),
      range = sidewalkRange(r, len, deg.get(r.a) ?? 2, deg.get(r.b) ?? 2);
    if (!range) continue;
    const tc = (range[0]! + range[1]!) / 2, l = range[1]! - range[0]!;
    for (const side of [-1, 1]) {
      const off = r.width / 2 + 2.3,
        x = a.x + Math.sin(ry) * tc + Math.cos(ry) * off * side,
        z = a.z + Math.cos(ry) * tc - Math.sin(ry) * off * side;
      B(stone, "#c6bc9f", x, 0.16, z, 4.4, 0.12, l, ry, false);
      B(plaster, "#d8cbaa", x - Math.cos(ry) * 2.1 * side, 0.15, z, 0.17, 0.15, l, ry, false);
    }
  }
  // Solid roundabout island: curb ring, garden, gravel path and shrubs; the gate stands in its middle.
  if (d.roundabout) {
    const { x, z } = d.roundabout;
    const rr = (w: number, dd: number, r: number, h: number) => {
      const sh = new T.Shape(), x0 = -w / 2, y0 = -dd / 2;
      sh.moveTo(x0 + r, y0); sh.lineTo(-x0 - r, y0); sh.quadraticCurveTo(-x0, y0, -x0, y0 + r);
      sh.lineTo(-x0, -y0 - r); sh.quadraticCurveTo(-x0, -y0, -x0 - r, -y0);
      sh.lineTo(x0 + r, -y0); sh.quadraticCurveTo(x0, -y0, x0, -y0 - r);
      sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
      return new T.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 5 }).rotateX(-Math.PI / 2);
    };
    piece(rr(42, 38, 9, 0.3), stone, "#d6ccb0", x, 0, z, 1, 1, 1, 0, -1, false);
    piece(rr(40.6, 36.6, 8.2, 0.12), metal, "#7ea56c", x, 0.3, z, 1, 1, 1, 0, -1, false);
    piece(rr(34, 5, 2, 0.05), metal, "#cdb98c", x, 0.42, z, 1, 1, 1, 0, -1, false);
    const bush = ["#4f8a5e", "#5f9a63", "#3f7a58"];
    for (let k = 0; k < 16; k++) {
      const sx = ((k % 8) - 3.5) * 4.9, sz = (k < 8 ? -1 : 1) * (9 + (k % 3) * 2.6);
      const sc = 1.3 + (k % 4) * 0.28;
      piece(sphere, metal, bush[k % 3]!, x + sx, 0.5 + sc * 0.5, z + sz, sc * 1.25, sc * 0.9, sc * 1.25, 0, -1, false);
    }
    for (const [tx, tz] of [[-17, -14], [17, -14], [-17, 14], [17, 14]] as const) {
      B(metal, "#6a4a36", x + tx, 2.2, z + tz, 0.5, 4, 0.5, 0, false);
      for (const [ox, oy, oz, s2] of [[0, 5.2, 0, 2.7], [1.5, 4.5, 0.6, 1.9], [-1.4, 4.6, -0.5, 2.0]] as const)
        piece(sphere, metal, "#468a60", x + tx + ox, oy, z + tz + oz, s2, s2 * 0.8, s2, 0, -1, false);
    }
  }
  for (const bucket of buckets.values()) {
    const g = mergeGeometries(bucket.geometries);
    if (!g) throw new Error("Facade batch failed");
    const indexed = mergeVertices(g);
    g.dispose();
    const mesh = new T.Mesh(indexed, bucket.material);
    bucket.group.add(mesh);
    bucket.geometries.forEach((g) => g.dispose());
  }
  clearFacadeCache();
  sphere.dispose();
  torus.dispose();
  box.dispose();
  plane.dispose();
  return {
    root,
    update(camera: T.Vector3, quality: "low" | "medium") {
      const radius = quality === "low" ? 75 : 140;
      for (const g of shells) {
        const c = g.userData.center as T.Vector3;
        g.visible =
          Math.hypot(c.x - camera.x, c.z - camera.z) <
          (quality === "low" ? 200 : 330);
      }
      for (const g of details) {
        const c = g.userData.center as T.Vector3;
        g.visible = Math.hypot(c.x - camera.x, c.z - camera.z) < radius;
      }
    },
    dispose: () => disposeObject(root),
  };
}
