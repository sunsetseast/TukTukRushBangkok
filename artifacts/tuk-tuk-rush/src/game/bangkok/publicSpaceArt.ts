import * as T from "three";
import type { District, Landmark, Point } from "../types";
import { LandmarkBuilder } from "./landmarkBuilder";
import { insidePublicPolygon, type PublicSpace } from "./publicSpaces";
function polygon(ps: Point[], origin: Point, holes: Point[][] = []) {
  const shape = new T.Shape(
    ps.map((p) => new T.Vector2(p.x - origin.x, -(p.z - origin.z))),
  );
  for (const h of holes)
    shape.holes.push(
      new T.Path(
        h.map((p) => new T.Vector2(p.x - origin.x, -(p.z - origin.z))),
      ),
    );
  return new T.ShapeGeometry(shape).rotateX(-Math.PI / 2);
}
const local = (p: Point, o: Point) => ({ x: p.x - o.x, z: p.z - o.z });
function parkModel(s: PublicSpace, detail: boolean) {
  const b = new LandmarkBuilder(),
    o = s.origin;
  b.sculpt(
    polygon(s.boundary, o),
    0,
    0.07,
    0,
    s.id === "sanam" ? "#8fba67" : "#6e9e5d",
  );
  // Authentic island is a hole in water geometry, not a green box laid over it.
  for (const w of s.water.filter((w) => !w.hole)) {
    const holes = s.water.filter(
      (h) => h.hole && insidePublicPolygon(h.points[0]!, w.points),
    );
    b.sculpt(
      polygon(
        w.points,
        o,
        holes.map((h) => h.points),
      ),
      0,
      0.15,
      0,
      "#3b9699",
      "glass",
    );
  }
  const edges = s.boundary.map((p) => local(p, o));
  for (let i = 0; i < edges.length; i++) {
    const a = edges[i]!,
      q = edges[(i + 1) % edges.length]!,
      len = Math.hypot(q.x - a.x, q.z - a.z);
    b.box(
      (a.x + q.x) / 2,
      0.13,
      (a.z + q.z) / 2,
      4,
      0.12,
      len,
      "#d0c3a2",
      Math.atan2(q.x - a.x, q.z - a.z),
    );
  }
  for (const path of s.paths)
    for (let i = 1; i < path.points.length; i++) {
      const a = local(path.points[i - 1]!, o),
        q = local(path.points[i]!, o),
        mid = {
          x: (path.points[i - 1]!.x + path.points[i]!.x) / 2,
          z: (path.points[i - 1]!.z + path.points[i]!.z) / 2,
        },
        wet =
          s.water.some((w) => !w.hole && insidePublicPolygon(mid, w.points)) &&
          !s.water.some((w) => w.hole && insidePublicPolygon(mid, w.points)),
        len = Math.hypot(q.x - a.x, q.z - a.z),
        yaw = Math.atan2(q.x - a.x, q.z - a.z);
      b.box(
        (a.x + q.x) / 2,
        wet ? 1.8 : 0.18,
        (a.z + q.z) / 2,
        path.width,
        wet ? 0.5 : 0.15,
        len,
        wet ? "#a4794e" : "#d5c7a7",
        yaw,
      );
      if (wet)
        for (const side of [-1, 1]) {
          const x =
              (a.x + q.x) / 2 + Math.cos(yaw) * side * (path.width / 2 - 0.2),
            z = (a.z + q.z) / 2 - Math.sin(yaw) * side * (path.width / 2 - 0.2);
          b.box(x, 2.7, z, 0.18, 0.18, len, "#e5d8b8", yaw);
        }
    }
  for (const f of s.fences) {
    const p = local(f, o);
    b.box(p.x, 0.35, p.z, 0.65, 0.7, f.d, "#b8b59c", f.yaw);
    b.box(p.x, 1.3, p.z, 0.2, 0.13, f.d, "#4e6554", f.yaw);
    if (detail) {
      b.box(p.x, 1, p.z, 0.13, 1, f.d * 0.06, "#4e6554", f.yaw);
    }
  }
  for (const [i, p] of s.trees.entries()) {
    if (!detail && i % 2) continue;
    const q = local(p, o),
      h = 8 + (i % 7) * 1.25,
      r = 5 + (i % 5) * 0.7;
    b.sculpt(
      new T.CylinderGeometry(0.25, 0.5, h * 0.7, 5),
      q.x,
      h * 0.35,
      q.z,
      "#8e7151",
    );
    if (i % 5 === 0) {
      for (let j = 0; j < (detail ? 6 : 4); j++) {
        const angle = (j * Math.PI) / 3;
        b.sculpt(
          new T.ConeGeometry(r * 0.42, r * 1.4, 3)
            .rotateZ(Math.PI / 2.6)
            .rotateY(angle),
          q.x + Math.sin(angle) * r * 0.4,
          h,
          q.z + Math.cos(angle) * r * 0.4,
          "#487e4e",
        );
      }
    } else {
      b.sculpt(
        new T.IcosahedronGeometry(r, detail ? 1 : 0).scale(1, 1.1, 0.85),
        q.x,
        h * 0.87,
        q.z,
        ["#3f7b53", "#528d55", "#659c5a", "#719f57"][i % 4]!,
      );
      if (detail)
        b.sculpt(
          new T.IcosahedronGeometry(r * 0.65, 0),
          q.x + 2,
          h * 1.12,
          q.z + 1,
          "#6a9e62",
        );
    }
    if (detail && i % 7 === 0) {
      b.box(q.x + 6, 0.8, q.z, 3.6, 0.25, 1, "#a7774c");
      b.box(q.x + 6, 1.3, q.z + 0.4, 3.6, 0.7, 0.15, "#a7774c");
      b.box(q.x + 3, 3, q.z, 0.17, 6, 0.17, "#596c63");
      b.box(q.x + 3, 6, q.z, 1, 0.5, 1, "#f5ce77", 0, true);
    }
  }
  for (const g of s.gates) {
    const p = local(g.point, o),
      yaw = g.yaw ?? 0;
    const xz = (x: number) => ({
      x: p.x + Math.cos(yaw) * x,
      z: p.z - Math.sin(yaw) * x,
    });
    for (const side of [-1, 1]) {
      const a = xz(side * 5);
      b.box(a.x, 2, a.z, 1.1, 4, 1.5, "#d3c6a7", yaw);
      b.box(a.x, 4.2, a.z, 1.4, 0.5, 1.8, "#9c8f76", yaw);
    }
    b.box(p.x, 4.1, p.z, 9, 0.8, 0.45, "#286f50", yaw);
    if (!g.vehicle)
      for (const x of [-3, -1.5, 0, 1.5, 3]) {
        const a = xz(x);
        b.sculpt(
          new T.CylinderGeometry(0.17, 0.25, 1.1, 6),
          a.x,
          0.55,
          a.z,
          "#adb3a0",
        );
      }
  }
  if (s.id === "park") {
    const p = local({ x: (770 - 500) * 4, z: (760 - 600) * 4 }, o);
    b.box(p.x, 1.1, p.z, 12, 2.2, 10, "#c0b7a2");
    b.box(p.x, 3.2, p.z, 7, 3, 5, "#b9aa91");
    b.box(p.x, 6.3, p.z, 2.2, 4.5, 1.5, "#3f5144");
    b.sculpt(
      new T.IcosahedronGeometry(0.7, 1),
      p.x,
      9.3,
      p.z,
      "#4d6250",
      "bronze",
    );
    for (const side of [-1, 1]) {
      b.box(p.x + side * 0.65, 3.6, p.z, 0.55, 3, 0.65, "#405347");
      b.box(p.x + side * 1.3, 6.5, p.z, 0.5, 3, 0.6, "#405347");
    }
    b.box(p.x, 9.9, p.z, 1.6, 0.3, 1.2, "#405347");
    // Chinese-style clock tower, recreation courts, shaded pavilions and boat dock.
    const c = local({ x: (815 - 500) * 4, z: (675 - 600) * 4 }, o);
    b.box(c.x, 4, c.z, 4, 8, 4, "#d0c8a0");
    for (const sign of [-1, 1]) {
      b.sculpt(
        new T.CircleGeometry(1.1, 16),
        c.x,
        6,
        c.z + sign * 2.02,
        "#eee6c9",
      );
      b.box(c.x, 6.2, c.z + sign * 2.1, 0.08, 0.9, 0.1, "#596352");
    }
    b.roof(c.x, 8, c.z, 7, 7, 2.6, "#668b5c");
    for (const [dx, dz] of [
      [-53, -25],
      [26, 115],
      [100, -160],
    ]) {
      const w = 16,
        h = 6;
      if (
        s.water.some(
          (a) =>
            !a.hole &&
            insidePublicPolygon({ x: o.x + dx!, z: o.z + dz! }, a.points),
        )
      )
        continue;
      b.box(dx!, 2.8, dz!, w, 0.5, 11, "#c9b996");
      for (const side of [-1, 1])
        for (const end of [-1, 1])
          b.box(dx! + side * 6, 4.1, dz! + end * 4, 0.6, 3, 0.6, "#d5c6a3");
      b.roof(dx!, 5.6, dz!, w + 2, 13, h * 0.55, "#658861");
    }
    for (const dz of [-170, -140]) {
      b.box(100, 0.19, dz, 24, 0.12, 18, "#719f80");
      for (const dx of [-11, 11])
        b.box(100 + dx, 0.28, dz, 0.16, 0.05, 17, "#d8d7bb");
      b.box(100, 0.28, dz, 22, 0.05, 0.16, "#d8d7bb");
    }
    // The vehicle parking loop exists in the road graph, independently of paths.
    const x = (846 - 500) * 4 - o.x,
      z = (681 - 600) * 4 - o.z;
    b.box(x, 0.04, z, 23, 0.05, 108, "#abae9c");
    for (let j = 0; j < 12; j++)
      b.box(x + 7, 0.13, z - 47 + j * 8, 7, 0.04, 0.12, "#e5dfbf");
  }
  return b.finish(`public-space:${s.id}:${detail ? "near" : "far"}`);
}
export function publicSpaceLandmark(d: District, l: Landmark) {
  const s = d.publicSpaces?.find((s) => s.id === l.id);
  if (!s) return;
  const lod = new T.LOD();
  for (const detail of [true, false]) {
    const g = parkModel(s, detail);
    lod.addLevel(g, detail ? 0 : 520);
  }
  lod.userData.nightMaterials = lod.levels.flatMap(
    (l) => l.object.userData.nightMaterials ?? [],
  );
  lod.userData.publicSpace = s.id;
  return lod;
}

/** One local atlas supplies legible, illuminated municipal entrance boards. */
export function buildPublicSpaceSigns(d: District) {
  const root = new T.Group();
  if (typeof document === "undefined") return root;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const c = canvas.getContext("2d")!;
  const labels = [
    ["สวนลุมพินี", "LUMPHINI PARK"],
    ["สนามหลวง", "SANAM LUANG"],
    ["สวนเบญจกิติ", "BENJAKITTI PARK"],
  ];
  for (let i = 0; i < labels.length; i++) {
    const y = (i * 256) / 3;
    c.fillStyle = "#286548";
    c.fillRect(0, y, 512, 256 / 3);
    c.strokeStyle = "#c7bb85";
    c.lineWidth = 3;
    c.strokeRect(3, y + 3, 506, 256 / 3 - 6);
    c.textAlign = "center";
    c.fillStyle = "#fff2d0";
    c.font = '800 33px "Rush Thai",sans-serif';
    c.fillText(labels[i]![0]!, 256, y + 40);
    c.font = "800 20px Arial,sans-serif";
    c.fillText(labels[i]![1]!, 256, y + 68);
  }
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  const material = new T.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: "#fff1cc",
    emissiveIntensity: 0.1,
    roughness: 0.8,
  });
  for (const [row, s] of (d.publicSpaces ?? []).entries())
    for (const g of s.gates) {
      const geo = new T.PlaneGeometry(8.6, 0.95),
        uv = geo.attributes.uv!;
      for (let i = 0; i < uv.count; i++)
        uv.setY(i, 1 - (row + 1) / 3 + uv.getY(i) / 3);
      const mesh = new T.Mesh(geo, material);
      mesh.position.set(
        g.point.x + Math.sin(g.yaw ?? 0) * 0.28,
        4.15,
        g.point.z + Math.cos(g.yaw ?? 0) * 0.28,
      );
      mesh.rotation.y = g.yaw ?? 0;
      const chunk = new T.Group();
      chunk.name = "BangkokSign";
      chunk.add(mesh);
      root.add(chunk);
    }
  return root;
}
