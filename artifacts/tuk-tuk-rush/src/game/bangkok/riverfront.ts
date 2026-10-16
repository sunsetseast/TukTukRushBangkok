import * as T from "three";
import type { District, Point } from "../types";
import { riverDistance, blockedByRiver } from "./world";
import { distanceToSegment } from "../world";
import { LandmarkBuilder } from "./landmarkBuilder";
import type { ArtPiece } from "./architecturalBatch";
export type BoatRoute = {
  center: Point;
  dx: number;
  dz: number;
  length: number;
  phase: number;
  period: number;
};
export function boatPose(r: BoatRoute, time: number) {
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
export function boatRoutes(d: District) {
  const nodes = new Map(d.nodes.map((n) => [n.id, n])),
    bridges = d.roads
      .filter((r) => r.bridge)
      .map((r) => ({ r, a: nodes.get(r.a)!, b: nodes.get(r.b)! })),
    routes: BoatRoute[] = [];
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
            riverDistance(d, p) < d.riverWidth! / 2 - 17 &&
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
  for (let i = 1; i < d.river!.length; i++) {
    const a = d.river![i - 1]!,
      b = d.river![i]!,
      len = Math.hypot(b.x - a.x, b.z - a.z),
      dx = (b.x - a.x) / len,
      dz = (b.z - a.z) / len,
      yaw = Math.atan2(dx, dz);
    for (let t = 6; t < len; t += 12)
      for (const side of [-1, 1]) {
        const p = {
          x: a.x + dx * t + dz * (d.riverWidth! / 2 - 1) * side,
          z: a.z + dz * t - dx * (d.riverWidth! / 2 - 1) * side,
        };
        if (!blockedByRiver(d, p, 1)) continue;
        put(p, -0.85, 2, 1.7, 12, "#737f72", yaw);
        put(p, 0.18, 5.5, 0.08, 12, "#bdb79d", yaw);
        const q = { x: p.x - dz * side * 1.5, z: p.z + dx * side * 1.5 };
        if (!blockedByRiver(d, q, 0.3)) continue;
        put(q, 0.65, 0.18, 1.25, 0.18, "#63776e");
        put(q, 1.2, 0.1, 0.1, 12, "#697d73", yaw);
        if (Math.floor(t / 12) % 4 === 0) {
          put(p, 2, 0.16, 3.8, 0.16, "#55716b");
          emit({
            ...p,
            y: 4,
            w: 0.65,
            h: 0.55,
            d: 0.65,
            yaw: 0,
            color: "#f4c98a",
            surface: "panel",
            layer: "night",
          });
          put(p, 0.65, 1.8, 0.18, 0.7, "#9c805b", yaw);
        }
      }
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
  for (const l of d.landmarks.filter((l) =>
    ["arun", "pho", "icon", "asiatique"].includes(l.id!),
  )) {
    const plot = l.plot!,
      nearest = d
        .river!.slice(1)
        .map((b, i) => ({
          b,
          a: d.river![i]!,
          ...distanceToSegment(plot, d.river![i]!, b),
        }))
        .sort((a, b) => a.distance - b.distance)[0]!,
      dx = plot.x - nearest.point.x,
      dz = plot.z - nearest.point.z,
      len = Math.hypot(dx, dz),
      nx = dx / len,
      nz = dz / len,
      p = {
        x: nearest.point.x + nx * (d.riverWidth! / 2 - 9),
        z: nearest.point.z + nz * (d.riverWidth! / 2 - 9),
      },
      yaw = Math.atan2(nx, nz) + Math.PI / 2;
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
