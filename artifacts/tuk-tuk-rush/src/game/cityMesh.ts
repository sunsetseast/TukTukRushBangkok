import * as THREE from "three";
import type { District, Road, RoadNode } from "./types";
import { buildLandmarkArt } from "./landmarkArt";
import { lamb } from "./meshUtil";
import { StaticBatch } from "./staticBatch";
import { buildTrafficModel } from "./trafficMesh";
import { ASSETS, surface, disposeObject } from "./assets";
import { degreeMap, sidewalkRange } from "./roadGeometry";
import { nearestRoad, obstacleDistance, distanceToSegment } from "./world";

export type City = {
  group: THREE.Group;
  update: (
    camera: THREE.Vector3,
    quality: "low" | "medium",
    horizontalGreen: boolean,
  ) => void;
  dispose: () => void;
};
type Seg = {
  r: Road;
  a: RoadNode;
  b: RoadNode;
  dx: number;
  dz: number;
  len: number;
};

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tmp = new THREE.Object3D();
function M(
  x: number,
  y: number,
  z: number,
  ry: number,
  sx = 1,
  sy = 1,
  sz = 1,
) {
  tmp.position.set(x, y, z);
  tmp.rotation.set(0, ry, 0);
  tmp.scale.set(sx, sy, sz);
  tmp.updateMatrix();
  return tmp.matrix.clone();
}

export function buildCity(
  d: District,
  textures: Map<string, THREE.Texture>,
): City {
  const group = new THREE.Group();
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const segs: Seg[] = [];
  for (const r of d.roads) {
    const a = nodes.get(r.a),
      b = nodes.get(r.b);
    if (!a || !b) continue;
    const dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz) || 1;
    segs.push({ r, a, b, dx: dx / len, dz: dz / len, len });
  }

  const infrastructure = new StaticBatch();
  const inst = infrastructure.add;

  // ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2),
    lamb("#b6b69c"),
  );
  ground.position.y = -0.02;
  group.add(ground);

  // roads
  const roadMat = new THREE.MeshStandardMaterial({
    map: surface(textures, ASSETS.asphalt, 12),
    roughness: 0.97,
    color: "#ffffff",
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const boxUnit = new THREE.BoxGeometry(1, 0.1, 1);
  const roadCol = (r: Road) =>
    new THREE.Color(
      r.shortcut ? "#7a5a48" : r.width >= 12 ? "#b1b5b6" : "#aab1b4",
    );
  inst(
    boxUnit,
    roadMat,
    segs.map((s) =>
      M(
        (s.a.x + s.b.x) / 2,
        0.05,
        (s.a.z + s.b.z) / 2,
        Math.atan2(s.dx, s.dz),
        s.r.width,
        1,
        s.len,
      ),
    ),
    segs.map((s) => roadCol(s.r)),
  );

  const discGeo = new THREE.CylinderGeometry(1, 1, 0.1, 20);
  const nodeW = new Map<string, Seg>();
  for (const s of segs)
    for (const n of [s.a.id, s.b.id]) {
      const o = nodeW.get(n);
      if (!o || o.r.width < s.r.width) nodeW.set(n, s);
    }
  const discM: THREE.Matrix4[] = [],
    discC: THREE.Color[] = [];
  const intersectionDegree = degreeMap(d);
  for (const [id, s] of nodeW) {
    const n = nodes.get(id)!;
    // Curve samples are not junctions: full-size discs at every sample make
    // winding streets resemble huge overlapping asphalt plazas.
    const r = s.r.width / 2 * ((intersectionDegree.get(id) ?? 0) >= 3 ? 1 : 0.72);
    discM.push(M(n.x, 0.05, n.z, 0, r, 1, r));
    discC.push(roadCol(s.r));
  }
  inst(discGeo, roadMat, discM, discC);

  // center dashes
  const dashM: THREE.Matrix4[] = [];
  const dashGeo = new THREE.BoxGeometry(1, 0.04, 1);
  for (const s of segs) {
    if (s.r.width < 9 || s.r.shortcut) continue;
    {
      const n = Math.floor(s.len / 9);
      for (let k = 0; k < n; k++) {
        const t = ((k + 0.5) * s.len) / n;
        dashM.push(M(s.a.x + s.dx * t, 0.12, s.a.z + s.dz * t, Math.atan2(s.dx, s.dz), 0.35, 1, 4));
      }
    }
  }
  inst(
    dashGeo,
    new THREE.MeshBasicMaterial({
      color: "#f3d98b",
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    dashM,
  );

  const deg = degreeMap(d);
  const whiteM: THREE.Matrix4[] = [],
    curbM: THREE.Matrix4[] = [];
  for (const s of segs) {
    const range = sidewalkRange(s.r, s.len, deg.get(s.a.id) ?? 2, deg.get(s.b.id) ?? 2);
    if (!range) continue;
    const ry = Math.atan2(s.dx, s.dz), tc = (range[0]! + range[1]!) / 2;
    for (const side of [-1, 1]) {
      const off = s.r.width / 2 - 0.5;
      curbM.push(M(s.a.x + s.dx * tc - s.dz * off * side, 0.14, s.a.z + s.dz * tc + s.dx * off * side, ry, 0.12, 1, range[1]! - range[0]!));
    }
    // Zebra crossings only beside true junctions on segments long enough to host them.
    if (s.len >= 20 && s.r.width >= 9)
      for (const [id, t0, dir] of [[s.a.id, 4, 1], [s.b.id, s.len - 4, -1]] as const) {
        if ((deg.get(id) ?? 2) < 3) continue;
        for (let k = 0; k < 6; k++) {
          const t = t0 + dir * k * 0.9;
          whiteM.push(M(s.a.x + s.dx * t, 0.15, s.a.z + s.dz * t, ry, s.r.width * 0.8, 1, 0.38));
        }
      }
  }
  inst(dashGeo, new THREE.MeshBasicMaterial({ color: "#ded9bf" }), whiteM);
  inst(dashGeo, new THREE.MeshBasicMaterial({ color: "#b5b09d" }), curbM);

  // Concrete utility poles, roadside cable bundles, curved lamp arms and lantern strings.
  const poleM: THREE.Matrix4[] = [],
    crossM: THREE.Matrix4[] = [],
    lampM: THREE.Matrix4[] = [],
    lanM: THREE.Matrix4[] = [],
    wire: number[] = [];
  const poleState = new Map<string, { acc: number; last: { x: number; z: number } | null }>();
  const fixtures: { kind: string; x: number; z: number; clearance: number }[] = [];
  const safeFixture = (x: number, z: number, clearance = 0.6) => {
    const p = { x, z };
    // All connected roads matter near a skewed junction, not only the source road.
    if (segs.some(s => distanceToSegment(p, s.a, s.b).distance < s.r.width / 2 + clearance)) return false;
    if (d.obstacles.some(o => obstacleDistance(p, o) < clearance + 0.5)) return false;
    if (d.roundabout && Math.hypot(x - d.roundabout.x, z - d.roundabout.z) < d.roundabout.radius + 3) return false;
    if (fixtures.some(o => Math.hypot(x - o.x, z - o.z) < clearance + o.clearance + 2.2)) return false;
    return true;
  };
  for (const s of segs) {
    const ry = Math.atan2(s.dx, s.dz);
    if (s.r.shortcut) continue;
    for (const side of [-1, 1]) {
      const key = `${s.r.name}:${side * (s.dx + s.dz > 0 ? 1 : -1)}`;
      const st = poleState.get(key) ?? { acc: 30, last: null as { x: number; z: number } | null };
      poleState.set(key, st);
      if (st.acc >= 28 && s.len > 6) {
        const t = s.len / 2, off = s.r.width / 2 + 2.8,
          x = s.a.x + s.dx * t - s.dz * side * off,
          z = s.a.z + s.dz * t + s.dx * side * off;
        if (!safeFixture(x, z, 0.6)) { st.acc += s.len; continue; }
        fixtures.push({ kind: "utility-pole", x, z, clearance: 0.6 });
        poleM.push(M(x, 3.1, z, 0));
        crossM.push(M(x, 5.6, z, ry, 1.3, 0.07, 0.1));
        lampM.push(M(x + s.dz * side * 0.55, 6.15, z - s.dx * side * 0.55, ry, 1.1, 0.1, 0.3));
        const last = st.last;
        if (last && Math.hypot(x - last.x, z - last.z) < 48)
          for (let cable = 0; cable < 4; cable++) {
            let px = last.x, py = 5.68 + cable * 0.14, pz = last.z;
            for (let step = 1; step <= 8; step++) {
              const f = step / 8, nx = last.x + (x - last.x) * f, nz = last.z + (z - last.z) * f,
                ny = 5.68 + cable * 0.14 - Math.sin(f * Math.PI) * (0.4 + cable * 0.05);
              wire.push(px, py, pz, nx, ny, nz);
              px = nx; py = ny; pz = nz;
            }
          }
        if (s.r.name.includes("Yaowarat") || s.r.shortcut)
          lanM.push(M(x + s.dz * side * 0.9, 4.1, z - s.dx * side * 0.9, 0));
        st.last = { x, z };
        st.acc = 0;
      }
      st.acc += s.len;
    }
  }
  inst(new THREE.CylinderGeometry(0.11, 0.16, 6.2, 8), lamb("#93958b"), poleM);
  inst(new THREE.BoxGeometry(1, 1, 1), lamb("#334446"), crossM);
  inst(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: "#ffe3ac" }),
    lampM,
  );
  inst(new THREE.SphereGeometry(0.25, 12, 8), lamb("#bc3c30"), lanM);
  inst(
    new THREE.CylinderGeometry(0.15, 0.15, 0.08, 10),
    lamb("#d5af57"),
    lanM.map((m) =>
      m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.25, 0)),
    ),
  );
  if (wire.length) {
    const wg = new THREE.BufferGeometry();
    wg.setAttribute("position", new THREE.Float32BufferAttribute(wire, 3));
    group.add(
      new THREE.LineSegments(
        wg,
        new THREE.LineBasicMaterial({ color: "#38484a" }),
      ),
    );
  }
  // Signal lenses use the simulation's actual intersection phase.
  const signals = [
    new THREE.MeshBasicMaterial({ color: "#a8d29a" }),
    new THREE.MeshBasicMaterial({ color: "#df7860" }),
  ];
  const lensGeo = new THREE.SphereGeometry(0.11, 8, 6),
    signalM: THREE.Matrix4[][] = [[], []];
  // Road-angle-aware placement. Each candidate must clear EVERY road arm.
  for (const n of d.nodes.filter(n => (deg.get(n.id) ?? 0) >= 3)) {
    const approaches = segs.filter(s => s.a.id === n.id || s.b.id === n.id);
    let installed = 0;
    for (const s of approaches) {
      if (installed >= 2 || s.r.roundabout) continue;
      const other = s.a.id === n.id ? s.b : s.a;
      const length = Math.hypot(other.x - n.x, other.z - n.z);
      if (length < 5) continue;
      const ux = (other.x - n.x) / length, uz = (other.z - n.z) / length;
      const dist = Math.min(length * 0.48, 9);
      for (const side of [-1, 1]) {
        const off = s.r.width / 2 + 2.7;
        const x = n.x + ux * dist - uz * side * off;
        const z = n.z + uz * dist + ux * side * off;
        if (!safeFixture(x, z, 0.85)) continue;
        fixtures.push({ kind: "traffic-signal", x, z, clearance: 0.85 });
        const angle = Math.atan2(ux, uz);
        inst(new THREE.BoxGeometry(0.12, 3.7, 0.12), lamb("#415658"), [M(x, 1.85, z, angle)]);
        inst(new THREE.BoxGeometry(0.35, 0.85, 0.24), lamb("#203840"), [M(x, 3.75, z, angle)]);
        const axis = Math.abs(ux) > Math.abs(uz) ? 0 : 1;
        signalM[axis]!.push(M(x, 3.72, z, angle));
        installed++;
        break;
      }
    }
  }
  group.userData.roadsideFixtures = fixtures;
  signalM.forEach((matrices, axis) => {
    const im = new THREE.InstancedMesh(
      lensGeo,
      signals[axis]!,
      matrices.length,
    );
    matrices.forEach((m, i) => im.setMatrixAt(i, m));
    im.computeBoundingSphere();
    group.add(im);
  });

  // nearest road helper
  const nearest = (x: number, z: number) => {
    let best = { d: 1e9, cx: x, cz: z, dx: 1, dz: 0, w: 10 };
    for (const s of segs) {
      const t = Math.max(
        0,
        Math.min(s.len, (x - s.a.x) * s.dx + (z - s.a.z) * s.dz),
      );
      const cx = s.a.x + s.dx * t,
        cz = s.a.z + s.dz * t,
        dd = Math.hypot(x - cx, z - cz);
      if (dd < best.d)
        best = { d: dd, cx, cz, dx: s.dx, dz: s.dz, w: s.r.width };
    }
    return best;
  };

  // Props: parked cars, stalls and trees. Colliders are appended to district.obstacles once.
  const propBatches = new StaticBatch();
  buildProps(d, segs, nodes, nearest, propBatches.add, fixtures);
  const propGroups = propBatches.finish();
  propGroups.forEach((g) => group.add(g));

  // landmarks
  const label = (
    text: string,
    bg: string,
    fg: string,
    y: number,
    x: number,
    z: number,
    s = 14,
  ) => {
    const index = ["เยาวราช", "วัดไตรมิตร", "หัวลำโพง"].indexOf(text);
    const texture = surface(textures, ASSETS.landmarkSigns);
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(0.5, 0.5);
    texture.offset.set((index % 2) * 0.5, (1 - Math.floor(index / 2)) * 0.5);
    const sp =
      index === 0
        ? new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ map: texture }),
          )
        : new THREE.Sprite(
            new THREE.SpriteMaterial({ map: texture, depthWrite: false }),
          );
    void bg;
    void fg;
    sp.scale.set(s, s * 0.3125, 1);
    sp.position.set(x, y, z);
    group.add(sp);
  };
  for (const l of d.landmarks) {
    group.add(buildLandmarkArt(l));
    if (l.kind === "gate")
      label("เยาวราช", "#b3201a", "#ffd23f", 12.6, l.x, l.z + 3.25, 13);
    else if (l.kind === "temple")
      label("วัดไตรมิตร", "#5a1530", "#ffd23f", 35, l.x, l.z, 18);
    else label("หัวลำโพง", "#12705f", "#fff0d2", 29, l.x, l.z, 18);
  }

  const roadGroups = infrastructure.finish();
  roadGroups.forEach((g) => group.add(g));
  const dispose = () => disposeObject(group);
  return {
    group,
    dispose,
    update(camera, quality, horizontalGreen) {
      signals[0]!.color.set(horizontalGreen ? "#79c998" : "#dc6a57");
      signals[1]!.color.set(horizontalGreen ? "#dc6a57" : "#79c998");
      for (const g of roadGroups) {
        const c = g.userData.center as THREE.Vector3;
        g.visible =
          Math.hypot(c.x - camera.x, c.z - camera.z) <
          (quality === "low" ? 230 : 320);
      }
      for (const g of propGroups) {
        const c = g.userData.center as THREE.Vector3;
        g.visible =
          Math.hypot(c.x - camera.x, c.z - camera.z) <
          (quality === "low" ? 110 : 155);
      }
    },
  };
}

export function buildSky() {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(900, 24, 16);
  const stops = [
    [-1, "#ddc5a1"],
    [0, "#f2cda3"],
    [0.12, "#e9d5ba"],
    [0.4, "#93bed0"],
    [1, "#4b8eb4"],
  ] as const;
  const cs = stops.map((s) => new THREE.Color(s[1]));
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 900;
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const f = Math.max(
      0,
      Math.min(1, (t - stops[k][0]) / (stops[k + 1][0] - stops[k][0])),
    );
    c.copy(cs[k]).lerp(cs[k + 1], f);
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  g.add(
    new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
      }),
    ),
  );
  const sunDir = new THREE.Vector3(-120, 40, 60)
    .normalize()
    .multiplyScalar(820);
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(190, 24),
    new THREE.MeshBasicMaterial({
      color: "#ff8a5c",
      transparent: true,
      opacity: 0.3,
      fog: false,
      depthWrite: false,
    }),
  );
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(62, 24),
    new THREE.MeshBasicMaterial({
      color: "#ffd27a",
      fog: false,
      depthWrite: false,
    }),
  );
  halo.position.copy(sunDir).multiplyScalar(0.99);
  sun.position.copy(sunDir).multiplyScalar(0.98);
  halo.lookAt(0, 0, 0);
  sun.lookAt(0, 0, 0);
  g.add(halo, sun);
  g.renderOrder = -10;
  return g;
}

const propDone = new WeakSet<District>();
const propPlacementObstacles = new WeakMap<District, District["obstacles"]>();
type Inst = (
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  ms: THREE.Matrix4[],
  cols?: THREE.Color[],
) => void;

function buildProps(
  d: District,
  segs: Seg[],
  nodes: Map<string, RoadNode>,
  nearest: (x: number, z: number) => { d: number; w: number },
  inst: Inst,
  fixtures: { kind: string; x: number; z: number; clearance: number }[],
) {
  const fresh = !propDone.has(d);
  propDone.add(d);
  if (!propPlacementObstacles.has(d))
    propPlacementObstacles.set(d, [...d.obstacles]);
  const staticObstacles = propPlacementObstacles.get(d)!;
  const rand = rng(99);
  const carM: THREE.Matrix4[] = [],
    carC: THREE.Color[] = [],
    cabM: THREE.Matrix4[] = [];
  const stM: THREE.Matrix4[] = [],
    awM: THREE.Matrix4[] = [],
    awC: THREE.Color[] = [];
  const trM: THREE.Matrix4[] = [],
    leM: THREE.Matrix4[] = [],
    leC: THREE.Color[] = [];
  const placed: { x: number; z: number; w: number; d: number }[] = [];
  const carCols = [
    "#ec3f8a",
    "#e8e0d0",
    "#2bb39a",
    "#3a6ea5",
    "#f7b733",
    "#8a2a2a",
  ];
  const leaf = ["#437c66", "#4d8d6f", "#366757"];
  const ra = d.roundabout;
  const free = (x: number, z: number, hw: number, hd: number, roadClear: number) => {
    const p = { x, z }, rad = Math.hypot(hw, hd);
    if (nearest(x, z).d < roadClear) return false;
    if (ra && Math.hypot(x - ra.x, z - ra.z) < ra.radius + ra.laneWidth) return false;
    // Cars, carts and trees must not occupy the same pavement as lamp posts.
    if (fixtures.some(o => Math.hypot(o.x - x, o.z - z) < rad + o.clearance + 0.6)) return false;
    for (const r of d.roads) {
      const a = nodes.get(r.a)!, b = nodes.get(r.b)!;
      if (nearestRoad({ ...d, roads: [r] }, p).distance < r.width / 2 + rad + 0.8) return false;
    }
    for (const n of d.nodes) if ((degAll.get(n.id) ?? 2) >= 3 && Math.hypot(n.x - x, n.z - z) < 20) return false;
    for (const o of staticObstacles) if (obstacleDistance(p, o) < rad + 1.2) return false;
    for (const o of placed) if (Math.abs(o.x - x) < o.w / 2 + hw + 0.8 && Math.abs(o.z - z) < o.d / 2 + hd + 0.8) return false;
    return true;
  };
  const degAll = degreeMap(d);
  segs.forEach((s, si) => {
    let side = si % 2 ? 1 : -1;
    if (s.r.shortcut || s.r.roundabout) return;
    for (let t = 6; t < s.len - 4; t += 17) {
      const roll = rand();
      const along = roll < 0.4 ? "car" : roll < 0.7 ? "stall" : "tree";
      const off =
        s.r.width / 2 + (along === "car" ? 4.5 : along === "stall" ? 3.2 : 2.6);
      const x = s.a.x + s.dx * t - s.dz * side * off,
        z = s.a.z + s.dz * t + s.dx * side * off;
      side = -side;
      const eastWest = Math.abs(s.dx) > Math.abs(s.dz), cry = Math.atan2(s.dx, s.dz);
      if (along === "car") {
        const w = 2.2, dd = 4.4;
        if (si % 3 || !free(x, z, 2.4, 2.4, s.r.width / 2 + 1.5)) continue;
        placed.push({ x, z, w: 4.8, d: 4.8 });
        if (fresh)
          d.obstacles.push({ x, z, w, d: dd, height: 1.8, color: "#888888", yaw: cry });
        const ry = cry;
        carM.push(M(x, 0, z, ry));
        carC.push(
          new THREE.Color(carCols[Math.floor(rand() * carCols.length)]),
        );
        cabM.push(M(x, 1.25, z, ry, 1.55, 0.6, 2.2));
      } else if (along === "stall") {
        if (!free(x, z, 1.3, 1.3, s.r.width / 2 + 1.6)) continue;
        placed.push({ x, z, w: 2.6, d: 2.6 });
        if (fresh)
          d.obstacles.push({
            x,
            z,
            w: 2.6,
            d: 2.6,
            height: 2.6,
            color: "#c4281c",
          });
        stM.push(M(x, 0.6, z, 0, 2.2, 1.2, 2.2));
        awM.push(M(x, 2.5, z, 0, 2.8, 0.2, 2.8));
        awC.push(new THREE.Color(awn2[Math.floor(rand() * awn2.length)]));
      } else {
        if (!free(x, z, 0.8, 0.8, s.r.width / 2 + 1.5)) continue;
        placed.push({ x, z, w: 1.6, d: 1.6 });
        trM.push(M(x, 1.2, z, 0, 1, 1, 1));
        const sc = 1.6 + rand() * 0.9;
        leM.push(M(x, 3.2 + sc * 0.6, z, 0, sc, sc, sc));
        leC.push(new THREE.Color(leaf[Math.floor(rand() * leaf.length)]));
      }
    }
  });
  // Curated food-cart pockets along every Yaowarat segment, checked against the same footprints.
  for (const s of segs.filter((s) => s.r.name.includes("Yaowarat")))
    for (const side of [-1, 1])
      for (const f of [0.33, 0.68]) {
        const t = s.len * f,
          off = s.r.width / 2 + 3.2,
          x = s.a.x + s.dx * t - s.dz * side * off,
          z = s.a.z + s.dz * t + s.dx * side * off;
        if (!free(x, z, 1.3, 1.3, s.r.width / 2 + 1.6)) continue;
        placed.push({ x, z, w: 2.6, d: 2.6 });
        if (fresh)
          d.obstacles.push({
            x,
            z,
            w: 2.6,
            d: 2.6,
            height: 2.6,
            color: "#c4281c",
          });
        stM.push(M(x, 0.6, z, 0));
      }
  void nodes;
  if (!stM.length && !carM.length && !trM.length) return;
  const lm = () => new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const van = buildTrafficModel("van", "#e4d6ba");
  van.traverse((o) => {
    if (o instanceof THREE.Mesh)
      inst(o.geometry, o.material as THREE.Material, carM.slice(0, 3));
  });
  const parked = buildTrafficModel("car", "#c7d7d1");
  parked.traverse((o) => {
    if (o instanceof THREE.Mesh)
      inst(
        o.geometry,
        o.material as THREE.Material,
        carM.slice(3),
        (o.material as THREE.Material).name === "paint"
          ? carC.slice(3)
          : undefined,
      );
  });
  void cabM;
  // Stainless food carts: wheels, glass display, worktop, cookware and striped parasols.
  const positions = stM.map((m) =>
    new THREE.Vector3().setFromMatrixPosition(m),
  );
  const parts = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    dx: number,
    dy: number,
    dz: number,
  ) =>
    inst(
      geo,
      mat,
      positions.map((p) => M(p.x + dx, dy, p.z + dz, 0)),
    );
  const steel = new THREE.MeshStandardMaterial({
    color: "#a3b2b6",
    roughness: 0.35,
    metalness: 0.7,
  });
  parts(new THREE.BoxGeometry(1.8, 0.65, 1.3), steel, 0, 0.75, 0);
  parts(new THREE.BoxGeometry(1.95, 0.07, 1.4), steel, 0, 1.13, 0);
  parts(new THREE.BoxGeometry(1.6, 0.6, 0.6), lamb("#4d777c"), 0, 1.47, -0.2);
  for (const sx of [-0.72, 0.72])
    for (const sz of [-0.45, 0.45])
      parts(
        new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12).rotateZ(Math.PI / 2),
        lamb("#24313a"),
        sx,
        0.3,
        sz,
      );
  for (const sx of [-0.75, 0.75])
    parts(new THREE.BoxGeometry(0.035, 0.64, 0.035), steel, sx, 1.47, 0.12);
  parts(
    new THREE.CylinderGeometry(0.24, 0.24, 0.28, 12),
    steel,
    0.5,
    1.28,
    0.31,
  );
  parts(
    new THREE.SphereGeometry(0.22, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    steel,
    0.5,
    1.43,
    0.31,
  );
  parts(
    new THREE.CylinderGeometry(0.28, 0.19, 0.07, 12),
    lamb("#dfd6b5"),
    -0.5,
    1.2,
    0.32,
  );
  parts(new THREE.CylinderGeometry(0.03, 0.04, 2.3, 8), steel, 0, 1.45, -0.5);
  inst(
    new THREE.ConeGeometry(1.47, 0.42, 16, 1, true),
    new THREE.MeshStandardMaterial({
      color: "#f4ce76",
      side: THREE.DoubleSide,
      roughness: 0.9,
    }),
    positions.map((p) => M(p.x, 2.5, p.z - 0.5, 0)),
  );
  parts(
    new THREE.TorusGeometry(1.47, 0.035, 4, 16).rotateX(Math.PI / 2),
    lamb("#ac433c"),
    0,
    2.29,
    -0.5,
  );
  // Small sidewalk seating placed within the stall's existing collider envelope.
  parts(
    new THREE.CylinderGeometry(0.35, 0.35, 0.06, 12),
    lamb("#9f4036"),
    1,
    0.84,
    0.8,
  );
  parts(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 6), steel, 1, 0.42, 0.8);
  parts(
    new THREE.CylinderGeometry(0.2, 0.2, 0.08, 10),
    lamb("#2c8176"),
    0.5,
    0.46,
    0.8,
  );
  inst(new THREE.CylinderGeometry(0.18, 0.25, 2.4, 6), lamb("#5a3a2a"), trM);
  inst(new THREE.IcosahedronGeometry(0.85, 1), lm(), leM, leC);
  for (const side of [-1, 1])
    inst(
      new THREE.IcosahedronGeometry(0.72, 1),
      lm(),
      leM.map((m) =>
        m
          .clone()
          .multiply(
            new THREE.Matrix4().makeTranslation(side * 0.5, -0.15, 0.14),
          ),
      ),
      leC,
    );
  inst(
    new THREE.CylinderGeometry(0.48, 0.4, 0.7, 12),
    lamb("#8c6650"),
    trM.map((m) =>
      m.clone().multiply(new THREE.Matrix4().makeTranslation(0, -0.85, 0)),
    ),
  );
}
const awn2 = ["#d9371f", "#2bb39a", "#f7b733", "#ec3f8a"];
