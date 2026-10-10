import * as T from "three";
import type { District, Point } from "./types";
import { distanceToSegment } from "./world";
import { disposeObject } from "./assets";

export type StreetPerson = {
  start: Point;
  end: Point;
  x: number;
  z: number;
  heading: number;
  role: "walker" | "vendor" | "customer";
  seed: number;
  height: number;
};
const clear = (d: District, p: Point, margin = 0.4) =>
  !d.obstacles.some(
    (o) =>
      Math.abs(o.x - p.x) < o.w / 2 + margin &&
      Math.abs(o.z - p.z) < o.d / 2 + margin,
  );

/** Presentation-only routes. Never cross a road, shop wall, or food-cart footprint. */
export function streetPeople(d: District): StreetPerson[] {
  const people: StreetPerson[] = [];
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  for (const road of d.roads) {
    if (
      road.shortcut ||
      !["Yaowarat Road", "Charoen Krung Road", "Soi Lantern"].includes(
        road.name,
      )
    )
      continue;
    const a = nodes.get(road.a)!,
      b = nodes.get(road.b)!;
    const length = Math.hypot(b.x - a.x, b.z - a.z),
      dx = (b.x - a.x) / length,
      dz = (b.z - a.z) / length;
    for (const side of [-1, 1]) {
      let run: Point[] = [];
      const flush = () => {
        if (run.length >= 4) {
          const start = run[0]!,
            end = run[run.length - 1]!;
          const count = Math.min(
            road.name === "Yaowarat Road" ? 3 : 1,
            Math.max(1, Math.floor(run.length / 7)),
          );
          for (let k = 0; k < count; k++) {
            const seed = people.length;
            people.push({
              start,
              end,
              x: start.x,
              z: start.z,
              heading: Math.atan2(dx, dz),
              role: seed % 7 === 0 ? "customer" : "walker",
              seed,
              height: 0.93 + (seed % 5) * 0.035,
            });
          }
        }
        run = [];
      };
      for (let t = 23; t < length - 23; t += 1.5) {
        const off = road.width / 2 + 3.3;
        const p = {
          x: a.x + dx * t - dz * side * off,
          z: a.z + dz * t + dx * side * off,
        };
        // Check ALL roads: a nearby fictional shortcut can intersect this sidewalk.
        const safe =
          clear(d, p, 0.55) &&
          d.roads.every(
            (r) =>
              distanceToSegment(p, nodes.get(r.a)!, nodes.get(r.b)!).distance >=
              r.width / 2 + 0.75,
          );
        if (safe) run.push(p);
        else flush();
      }
      flush();
    }
  }
  for (const cart of d.obstacles.filter(
    (o) => o.color === "#c4281c" && o.w === 2.6 && Math.abs(o.z - 40) < 20,
  )) {
    for (const offset of [
      { x: 1.85, z: 0 },
      { x: -1.85, z: 0 },
      { x: 0, z: 1.85 },
      { x: 0, z: -1.85 },
    ]) {
      const p = { x: cart.x + offset.x, z: cart.z + offset.z };
      if (
        !clear(d, p) ||
        d.roads.some(
          (r) =>
            distanceToSegment(p, nodes.get(r.a)!, nodes.get(r.b)!).distance <
            r.width / 2 + 0.75,
        )
      )
        continue;
      people.push({
        start: p,
        end: p,
        ...p,
        heading: Math.atan2(-offset.x, -offset.z),
        role: "vendor",
        seed: people.length,
        height: 1,
      });
      break;
    }
  }
  return people;
}

/** Shared instanced character parts: bounded draw calls, no skeletons or per-person materials. */
export function buildStreetLife(d: District) {
  const root = new T.Group();
  root.name = "StreetLife";
  const people = streetPeople(d);
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
    mesh.boundingSphere = new T.Sphere(new T.Vector3(0, 1, 0), 520);
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
  steam.boundingSphere = new T.Sphere(new T.Vector3(), 520);
  root.add(steam);
  const colorTemp = new T.Color();
  let time = 0;
  function update(
    dt: number,
    camera: T.Vector3,
    quality: "low" | "medium",
    active: boolean,
    player?: Point,
  ) {
    if (active) time += Math.max(0, Math.min(dt, 0.05));
    let slot = 0,
      steamSlot = 0;
    for (let i = 0; i < people.length; i++) {
      const p = people[i]!,
        length = Math.hypot(p.end.x - p.start.x, p.end.z - p.start.z);
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
      const visible =
        Math.hypot(p.x - camera.x, p.z - camera.z) <
          (quality === "low" ? 65 : 100) &&
        (quality === "medium" || i % 2 === 0) &&
        (!player || Math.hypot(p.x - player.x, p.z - player.z) > 1.7);
      if (!visible) continue;
      const swing = walking ? Math.sin(time * 6 + p.seed) * 0.48 : 0;
      const serve = p.role === "vendor" ? Math.sin(time * 2 + p.seed) * 0.2 : 0;
      parent.position.set(
        p.x,
        0.22 + (walking ? Math.abs(Math.sin(time * 6 + p.seed)) * 0.025 : 0),
        p.z,
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
