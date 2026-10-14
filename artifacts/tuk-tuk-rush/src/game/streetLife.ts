import * as T from "three";
import type { District, Point } from "./types";
import { distanceToSegment, obstacleDistance } from "./world";
import { degreeMap, sidewalkRange } from "./roadGeometry";
import { disposeObject } from "./assets";
import { cityClearance } from "./bangkok/clearanceIndex";

export type StreetPerson = {
  start: Point;
  end: Point;
  x: number;
  z: number;
  heading: number;
  role: "walker" | "vendor" | "customer";
  seed: number;
  height: number;
  // Visual-only evasive offset: actual sidewalk route remains deterministic.
  dodgeX?: number;
  dodgeZ?: number;
  renderX?: number;
  renderZ?: number;
};
const clear = (d: District, p: Point, margin = 0.4) =>
  d.obstacles.every((o) => obstacleDistance(p, o) > margin);

/** Presentation-only routes on the real sidewalk traces. Never cross a road, shop, or cart footprint. */
export function streetPeople(d: District): StreetPerson[] {
  const people: StreetPerson[] = [];
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const deg = degreeMap(d);
  const roadsClear = (p: Point) =>
    d.roads.every(
      (r) => distanceToSegment(p, nodes.get(r.a)!, nodes.get(r.b)!).distance >= r.width / 2 + 0.75,
    );
  let runIndex = 0;
  for (const road of d.roads) {
    const a = nodes.get(road.a)!, b = nodes.get(road.b)!;
    const length = Math.hypot(b.x - a.x, b.z - a.z),
      dx = (b.x - a.x) / length, dz = (b.z - a.z) / length;
    const range = sidewalkRange(road, length, deg.get(road.a) ?? 2, deg.get(road.b) ?? 2);
    if (!range) continue;
    for (const side of [-1, 1]) {
      let run: Point[] = [];
      const flush = () => {
        if (run.length >= 3 && people.length < 80 && runIndex++ % 3 !== 2) {
          const seed = people.length;
          people.push({
            start: run[0]!, end: run[run.length - 1]!, x: run[0]!.x, z: run[0]!.z,
            heading: Math.atan2(dx, dz),
            role: seed % 7 === 0 ? "customer" : "walker",
            seed, height: 0.93 + (seed % 5) * 0.035,
          });
        }
        run = [];
      };
      for (let t = Math.max(0.5, range[0]!); t <= range[1]!; t += 1.5) {
        const off = road.width / 2 + 3.3;
        const p = { x: a.x + dx * t + dz * -side * off, z: a.z + dz * t + dx * side * off };
        if (clear(d, p, 0.55) && roadsClear(p)) run.push(p);
        else flush();
      }
      flush();
    }
  }
  for (const cart of d.obstacles.filter((o) => o.color === "#c4281c" && o.w === 2.6)) {
    if (people.length >= 110) break;
    for (const offset of [
      { x: 1.85, z: 0 }, { x: -1.85, z: 0 }, { x: 0, z: 1.85 }, { x: 0, z: -1.85 },
    ]) {
      const p = { x: cart.x + offset.x, z: cart.z + offset.z };
      if (!clear(d, p) || !roadsClear(p)) continue;
      people.push({
        start: p, end: p, ...p,
        heading: Math.atan2(-offset.x, -offset.z),
        role: "vendor", seed: people.length, height: 1,
      });
      break;
    }
  }
  // Reference-led shopfront activity: small queues and window-shoppers beside
  // named Yaowarat stores, not uniformly spaced puppets all over the map.
  // Each person's spawn is validated against the complete road and collider
  // network; none becomes a solid obstacle for arcade driving.
  for (const shop of d.buildings.filter(b => b.signatureId)) {
    const nx = Math.sin(shop.yaw ?? 0), nz = Math.cos(shop.yaw ?? 0);
    const tx = Math.cos(shop.yaw ?? 0), tz = -Math.sin(shop.yaw ?? 0);
    const waiters = shop.signatureId === 'nai442' ? [-2.2, -0.6, 1.0, 2.6]
      : shop.signatureId === 'so456' ? [-1.8, 0, 1.8]
      : [-1.35, 1.35];
    for (const offset of waiters) {
      if (people.length >= 132) break;
      // Local frontage normal points toward the road; keep the queue on the
      // pavement, in front of the existing building collider.
      const dist = shop.d / 2 + 1.5;
      const p = { x: shop.x + tx * offset + nx * dist,
        z: shop.z + tz * offset + nz * dist };
      if (!clear(d, p, 0.55) || !roadsClear(p)) continue;
      people.push({ start: p, end: p, x: p.x, z: p.z,
        heading: Math.atan2(-nx, -nz),
        role: 'customer', seed: people.length,
        height: 0.91 + (people.length % 7) * 0.032 });
    }
  }
  // Layered pedestrian groups beside the new fictional commercial frontage.
  // We reuse the EXISTING instanced person silhouettes and evade behaviour,
  // so extra street life adds no new animated draw calls.
  const heroes=d.buildings.filter(b=>b.signatureId);
  const contexts=d.buildings.filter(b=>!b.signatureId && b.showcase &&
    heroes.some(h=>Math.hypot(h.x-b.x,h.z-b.z)<125))
    .sort((a,b)=>{
      const distance=(v:typeof a)=>Math.min(...heroes.map(h=>Math.hypot(v.x-h.x,v.z-h.z)));
      return distance(a)-distance(b);
    }).slice(0,32);
  for(const shop of contexts){
    if(people.length>=180)break;
    const yaw=shop.yaw ?? 0, nx=Math.sin(yaw),nz=Math.cos(yaw);
    const tx=Math.cos(yaw),tz=-Math.sin(yaw);
    for(const offset of [-0.24,0.23]){
      if(people.length>=180)break;
      const x=shop.x+nx*(shop.d/2+1.85)+tx*shop.w*offset;
      const z=shop.z+nz*(shop.d/2+1.85)+tz*shop.w*offset;
      const p={x,z};
      if(!clear(d,p,0.55)||!roadsClear(p))continue;
      if(people.some(other=>Math.hypot(other.start.x-x,other.start.z-z)<1.3))continue;
      // Half are small moving window shoppers, half stop at the counter.
      const moving=people.length%2===0;
      const goal=moving?{x:x+tx*0.75,z:z+tz*0.75}:p;
      if(!clear(d,goal,0.55)||!roadsClear(goal))continue;
      const seed=people.length;
      people.push({start:p,end:goal,...p,heading:Math.atan2(-nx,-nz),
        role:moving?"walker":"customer",seed,
        height:0.88+(seed%7)*0.033});
    }
  }
  return people;
}

/** Shared instanced character parts: bounded draw calls, no skeletons or per-person materials. */
export function buildStreetLife(d: District, population?: StreetPerson[]) {
  const root = new T.Group();
  root.name = "StreetLife";
  const people = population ?? streetPeople(d);
  const citywide = d.worldId === "bangkok";
  const routeNodes = new Map(d.nodes.map(n => [n.id, n]));
  const indexedClear = citywide ? cityClearance(d) : undefined;
  const safeDodge = (x: number, z: number) => {
    if (indexedClear) return indexedClear({x,z});
    const q = { x, z };
    if (d.obstacles.some(o => obstacleDistance(q, o) < 0.5)) return false;
    return d.roads.every(r =>
      distanceToSegment(q, routeNodes.get(r.a)!, routeNodes.get(r.b)!).distance >= r.width / 2 + 0.5
    );
  };
  const material = new T.MeshStandardMaterial({ roughness: 0.86 });
  const sphere = new T.SphereGeometry(1, 10, 7);
  const capsule = new T.CapsuleGeometry(1, 1, 2, 8);
  const box = new T.BoxGeometry(1, 1, 1);
  const parts: { mesh: T.InstancedMesh; key: string }[] = [];
  const keys = [
    "body",
    "head",
    "hair",
    "leftArm",
    "rightArm",
    "leftLeg",
    "rightLeg",
    "leftShoe",
    "rightShoe",
    "apron",
    "bag",
    "shadow",
  ];
  for (const key of keys) {
    const geo =
      key === "shadow"
        ? new T.CircleGeometry(1, 12).rotateX(-Math.PI / 2)
        : ["head", "hair"].includes(key)
          ? sphere
          : key.includes("Arm") || key.includes("Leg")
            ? capsule
            : box;
    const mesh = new T.InstancedMesh(
      geo,
      key === "shadow"
        ? new T.MeshBasicMaterial({
            color: "#29282a",
            transparent: true,
            opacity: 0.18,
            depthWrite: false,
          })
        : material,
      people.length,
    );
    mesh.name = key;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    // Explicit district bound, not the initial all-zero instance matrices.
    mesh.boundingSphere = new T.Sphere(new T.Vector3(0, 1, 0), citywide ? 3600 : 520);
    root.add(mesh);
    parts.push({ mesh, key });
  }
  const skins = ["#bc8861", "#d2a17b", "#9f674b", "#e3b99c"];
  const shirts = [
    "#bc4145",
    "#268b81",
    "#e0ad44",
    "#3975a5",
    "#f0e2c2",
    "#596c4e",
  ];
  const temp = new T.Object3D(),
    parent = new T.Object3D(),
    matrix = new T.Matrix4();
  const steam = new T.InstancedMesh(
    new T.PlaneGeometry(1, 1),
    new T.MeshBasicMaterial({
      color: "#f2e9d6",
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      side: T.DoubleSide,
    }),
    people.filter((p) => p.role === "vendor").length * 3,
  );
  steam.name = "CookingSteam";
  steam.instanceMatrix.setUsage(T.DynamicDrawUsage);
  steam.boundingSphere = new T.Sphere(new T.Vector3(), citywide ? 3600 : 520);
  root.add(steam);
  const colorTemp = new T.Color();
  let time = 0,nearX=Infinity,nearZ=Infinity;
  let presentation=people.map((_,i)=>i);
  function update(
    dt: number,
    camera: T.Vector3,
    quality: "low" | "medium",
    active: boolean,
    player?: Point & { heading?: number; speed?: number },
  ) {
    if (active) time += Math.max(0, Math.min(dt, 0.05));
    if(citywide&&Math.hypot(camera.x-nearX,camera.z-nearZ)>12){nearX=camera.x;nearZ=camera.z;presentation=people.map((_,i)=>i).sort((i,j)=>{const score=(i:number)=>Math.hypot(people[i].start.x-camera.x,people[i].start.z-camera.z)-(people[i].role==='vendor'?8:0);return score(i)-score(j);});}
    let slot = 0,
      steamSlot = 0;
    for (const i of presentation) {
      const p = people[i]!,
        length = Math.hypot(p.end.x - p.start.x, p.end.z - p.start.z);
      if (citywide && Math.hypot(p.start.x-camera.x,p.start.z-camera.z)>125) continue;
      const period = length / 0.85 + 5,
        cycle = (time + p.seed * 3.73) % (period * 2),
        returning = cycle >= period;
      const travel = Math.min(
        length,
        Math.max(0, ((cycle % period) - 2.5) * 0.85),
      );
      const f = length
        ? returning
          ? 1 - travel / length
          : travel / length
        : 0;
      p.x = p.start.x + (p.end.x - p.start.x) * f;
      p.z = p.start.z + (p.end.z - p.start.z) * f;
      if (length)
        p.heading =
          Math.atan2(p.end.x - p.start.x, p.end.z - p.start.z) +
          (returning ? Math.PI : 0);
      const walking = p.role === "walker" && travel > 0 && travel < length;
      // Customers stand beside their shop rather than sliding in place.
      if (p.role === "customer") {
        p.x = p.start.x;
        p.z = p.start.z;
      }
      // Predict an approaching tuk-tuk, then step onto a *validated* safe part
      // of the sidewalk. Do not vanish or become an invisible hard obstacle.
      let targetX = 0, targetZ = 0, escaping = false;
      if (player && active) {
        const dx = p.x - player.x, dz = p.z - player.z;
        const distance = Math.hypot(dx, dz);
        const speed = Math.abs(player.speed ?? 0);
        const ahead = dx * Math.sin(player.heading ?? 0) + dz * Math.cos(player.heading ?? 0);
        const approaching = speed < 1.5 || ahead > -1.2;
        const threshold = 3.1 + Math.min(speed * 0.18, 4.5);
        if (approaching && distance < threshold) {
          const directionX = dx / Math.max(0.01, distance);
          const directionZ = dz / Math.max(0.01, distance);
          const pathX = p.end.x - p.start.x, pathZ = p.end.z - p.start.z;
          const pathLength = Math.max(0.01, Math.hypot(pathX, pathZ));
          const ux = pathX / pathLength, uz = pathZ / pathLength;
          // Away from vehicle first; both directions along the sidewalk as backups.
          const vectors = [
            [directionX, directionZ], [ux, uz], [-ux, -uz],
            [uz, -ux], [-uz, ux],
          ];
          let best = -Infinity;
          for (const [vx, vz] of vectors) {
            for (const step of [1.5, 2.5, 3.5]) {
              const x = p.x + vx! * step, z = p.z + vz! * step;
              if (!safeDodge(x, z)) continue;
              const separation = Math.hypot(x - player.x, z - player.z);
              const score = separation - step * 0.18;
              if (score > best) {
                best = score;
                targetX = x - p.x; targetZ = z - p.z;
                escaping = true;
              }
            }
          }
        }
      }
      // Pause must freeze the displayed evade animation as well as the route.
      const follow = active ? Math.min(1, Math.max(0, dt) * (escaping ? 5.5 : 1.65)) : 0;
      p.dodgeX = (p.dodgeX ?? 0) + (targetX - (p.dodgeX ?? 0)) * follow;
      p.dodgeZ = (p.dodgeZ ?? 0) + (targetZ - (p.dodgeZ ?? 0)) * follow;
      let displayX = p.x + (p.dodgeX ?? 0), displayZ = p.z + (p.dodgeZ ?? 0);
      // The base route might advance while a person dodges. Never show someone
      // moving through an obstacle or into a lane between updates.
      if (!safeDodge(displayX, displayZ)) {
        p.dodgeX = 0; p.dodgeZ = 0;
        displayX = p.x; displayZ = p.z;
      }
      p.renderX = displayX; p.renderZ = displayZ;
      const visible =
        Math.hypot(displayX - camera.x, displayZ - camera.z) <
          (quality === "low" ? 65 : 100) &&
        (quality === "medium" || i % 2 === 0 || (citywide && p.role === "vendor"));
      if (!visible || (citywide && slot >= (quality === "low" ? 20 : 32))) continue;
      const swing = walking || escaping ? Math.sin(time * (escaping ? 12 : 6) + p.seed) * 0.48 : 0;
      const serve = p.role === "vendor" ? Math.sin(time * 2 + p.seed) * 0.2 : 0;
      parent.position.set(
        displayX,
        0.22 + ((walking || escaping) ? Math.abs(Math.sin(time * (escaping ? 12 : 6) + p.seed)) * 0.025 : 0),
        displayZ,
      );
      parent.rotation.set(0, p.heading, 0);
      parent.scale.setScalar(p.height);
      parent.updateMatrix();
      for (const { mesh, key } of parts) {
        temp.rotation.set(0, 0, 0);
        temp.scale.set(1, 1, 1);
        switch (key) {
          case "body":
            temp.position.set(0, 1.08, 0);
            temp.scale.set(0.43, 0.56, 0.27);
            break;
          case "head":
            temp.position.set(0, 1.58, 0.025);
            temp.scale.set(0.16, 0.19, 0.15);
            break;
          case "hair":
            temp.position.set(0, 1.69, 0);
            temp.scale.set(0.169, 0.115, 0.158);
            break;
          case "leftArm":
          case "rightArm": {
            const side = key === "leftArm" ? -1 : 1;
            temp.position.set(side * 0.27, 1.07, 0.03);
            temp.scale.set(0.065, 0.17, 0.065);
            temp.rotation.x =
              side * swing + (p.role === "vendor" ? -0.7 + serve : 0);
            break;
          }
          case "leftLeg":
          case "rightLeg": {
            const side = key === "leftLeg" ? -1 : 1;
            temp.position.set(side * 0.12, 0.44, 0);
            temp.scale.set(0.08, 0.245, 0.08);
            temp.rotation.x = -side * swing;
            break;
          }
          case "leftShoe":
          case "rightShoe": {
            const side = key === "leftShoe" ? -1 : 1;
            temp.position.set(side * 0.12, 0.065, 0.055);
            temp.scale.set(0.17, 0.12, 0.3);
            break;
          }
          case "apron":
            temp.position.set(0, 0.98, 0.151);
            temp.scale.set(0.33, 0.65, 0.025);
            if (p.role !== "vendor") temp.scale.setScalar(0);
            break;
          case "shadow":
            temp.position.set(0, 0.025, 0);
            temp.scale.set(0.36, 1, 0.26);
            break;
          case "bag":
            temp.position.set(0.34, 0.82, -0.01);
            temp.scale.set(0.19, 0.28, 0.12);
            if (p.role !== "customer" && i % 3 !== 0) temp.scale.setScalar(0);
            break;
        }
        const color =
          key === "head" || key.includes("Arm")
            ? skins[p.seed % skins.length]!
            : key === "hair" || key.includes("Shoe")
              ? "#242b2c"
              : key.includes("Leg")
                ? "#334e60"
                : key === "apron"
                  ? "#e6dbc2"
                  : key === "bag"
                    ? "#b8824c"
                    : shirts[p.seed % shirts.length]!;
        mesh.setColorAt(slot, colorTemp.set(color));
        temp.updateMatrix();
        matrix.multiplyMatrices(parent.matrix, temp.matrix);
        mesh.setMatrixAt(slot, matrix);
      }
      slot++;
      if (p.role === "vendor" && quality === "medium")
        for (let k = 0; k < 3; k++) {
          const f = (time * 0.32 + k / 3 + p.seed * 0.17) % 1;
          temp.position.set(
            p.x + Math.sin(p.heading) * 1.65 + Math.sin(time + k) * 0.1,
            1.45 + f * 0.85,
            p.z + Math.cos(p.heading) * 1.65,
          );
          temp.rotation.set(
            0,
            Math.atan2(camera.x - temp.position.x, camera.z - temp.position.z),
            0,
          );
          temp.scale.setScalar(Math.sin(f * Math.PI) * (0.18 + f * 0.3));
          temp.updateMatrix();
          steam.setMatrixAt(steamSlot++, temp.matrix);
        }
    }
    steam.count = steamSlot;
    steam.visible = steamSlot > 0;
    steam.instanceMatrix.needsUpdate = true;
    parts.forEach(({ mesh }) => {
      mesh.count = slot;
      mesh.visible = slot > 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }
  update(0, new T.Vector3(-270, 3, 40), "medium", false);
  return { root, people, update, dispose: () => disposeObject(root) };
}
