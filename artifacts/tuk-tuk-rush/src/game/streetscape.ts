import * as T from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
import type { District, Obstacle } from "./types";
import { ASSETS, surface, disposeObject } from "./assets";
import { distanceToSegment } from "./world";

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
  const signsMap = surface(textures, ASSETS.signs);
  signsMap.wrapS = signsMap.wrapT = T.ClampToEdgeWrapping;
  const plaster = new T.MeshStandardMaterial({
    map: plasterMap,
    vertexColors: true,
    roughness: 0.95,
  });
  const stone = new T.MeshStandardMaterial({
    map: pavingMap,
    vertexColors: true,
    roughness: 0.94,
  });
  const metal = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.56,
    metalness: 0.3,
  });
  const glass = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.25,
    metalness: 0.35,
  });
  const sign = new T.MeshStandardMaterial({
    map: signsMap,
    emissiveMap: signsMap,
    emissive: "#ffffff",
    emissiveIntensity: 0.23,
    roughness: 0.63,
  });
  const verticalMap = surface(textures, ASSETS.verticalSigns);
  verticalMap.wrapS = verticalMap.wrapT = T.ClampToEdgeWrapping;
  const verticalSign = new T.MeshStandardMaterial({
    map: verticalMap,
    emissiveMap: verticalMap,
    emissive: "#ffffff",
    emissiveIntensity: 0.2,
    roughness: 0.63,
  });
  verticalSign.name = "vertical";
  const box = new T.BoxGeometry(1, 1, 1),
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
        cols = m.name === "vertical" ? 8 : 4,
        rows = m.name === "vertical" ? 1 : 2;
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
    let best = { distance: Infinity, point: { x: 0, z: 0 } };
    for (const r of d.roads) {
      const q = distanceToSegment(b, nodes.get(r.a)!, nodes.get(r.b)!);
      if (q.distance < best.distance) best = q;
    }
    const dx = best.point.x - b.x,
      dz = best.point.z - b.z;
    const xside = Math.abs(dx) / (b.w / 2) > Math.abs(dz) / (b.d / 2);
    const nx = xside ? Math.sign(dx) : 0,
      nz = xside ? 0 : Math.sign(dz);
    return {
      nx,
      nz,
      ry: Math.atan2(nx, nz),
      w: xside ? b.d : b.w,
      fx: b.x + (nx * b.w) / 2,
      fz: b.z + (nz * b.d) / 2,
    };
  }
  d.buildings.forEach((b, i) => {
    const n = front(b),
      showcase = Math.abs(b.z - 40) < 62;
    const color = new T.Color(b.color)
      .lerp(new T.Color("#ddcfb5"), 0.35)
      .getStyle();
    // Upper masonry and ground-floor side/back walls leave a real 1.25m shop recess.
    B(
      plaster,
      color,
      b.x,
      (b.height + 3.5) / 2,
      b.z,
      b.w,
      b.height - 3.5,
      b.d,
      0,
      false,
    );
    if (n.nx) {
      B(
        plaster,
        color,
        b.x - n.nx * (b.w / 2 - 0.12),
        1.75,
        b.z,
        0.24,
        3.5,
        b.d,
        0,
        false,
      );
      for (const side of [-1, 1])
        B(
          plaster,
          color,
          b.x,
          1.75,
          b.z + side * (b.d / 2 - 0.12),
          b.w,
          3.5,
          0.24,
          0,
          false,
        );
    } else {
      B(
        plaster,
        color,
        b.x,
        1.75,
        b.z - n.nz * (b.d / 2 - 0.12),
        b.w,
        3.5,
        0.24,
        0,
        false,
      );
      for (const side of [-1, 1])
        B(
          plaster,
          color,
          b.x + side * (b.w / 2 - 0.12),
          1.75,
          b.z,
          0.24,
          3.5,
          b.d,
          0,
          false,
        );
    }
    B(metal, "#646c68", b.x, b.height + 0.15, b.z, b.w, 0.3, b.d, 0, false);
    const bays = 2,
      bw = n.w / bays;
    // All facade detail projects into the existing off-road margin, by at most 1.35m.
    const local = (
      u: number,
      y: number,
      v: number,
      w: number,
      h: number,
      dep: number,
      m: T.Material,
      c: string,
    ) =>
      B(
        m,
        c,
        n.fx + Math.cos(n.ry) * u + n.nx * v,
        y,
        n.fz - Math.sin(n.ry) * u + n.nz * v,
        w,
        h,
        dep,
        n.ry,
      );
    for (let bay = 0; bay < bays; bay++) {
      const u = (bay - 0.5) * bw;
      local(u, 1.75, -1.35, bw - 0.55, 3.3, 0.17, metal, "#263c3c");
      // Recess illusion: shaded interior, warm counter and side piers rather than painted windows.
      if ((i + bay) % 4 !== 0) {
        local(u, 1.4, -1.25, bw - 0.85, 2.4, 0.05, glass, "#466466");
        local(u, 1, -0.4, bw - 0.8, 0.2, 0.7, metal, "#b59050");
        for (let k = 0; k < 6; k++)
          local(
            u + (k - 2.5) * 0.62,
            1.24,
            -0.4,
            0.35,
            0.2,
            0.16,
            metal,
            k % 2 ? "#d6c780" : "#da6b39",
          );
      } else {
        local(u, 1.5, 0.22, bw - 0.65, 2.7, 0.08, metal, "#7e9292");
        for (let k = 0; k < 16; k++)
          local(
            u,
            0.3 + k * 0.17,
            0.28,
            bw - 0.65,
            0.025,
            0.045,
            metal,
            "#425b5e",
          );
      }
      for (let side of [-1, 1]) {
        local(
          u + side * (bw / 2 - 0.2),
          1.75,
          0.24,
          0.26,
          3.5,
          0.3,
          plaster,
          "#ece0c3",
        );
        local(
          u + side * (bw / 2 - 0.5),
          1.6,
          0.27,
          0.065,
          2.5,
          0.06,
          metal,
          "#bfb398",
        );
      }
      local(u, 3.72, 0.23, bw - 0.3, 0.22, 0.4, plaster, "#ecdfbe");
      const awnColor = ["#9c3032", "#2d7974", "#b79045", "#45646d"][
        (i + bay) % 4
      ]!;
      local(u, 3.25, 0.76, bw - 0.5, 0.12, 1.4, metal, awnColor);
      for (let k = 0; k < 8; k++)
        local(
          u + ((k - 3.5) * (bw - 0.5)) / 8,
          3.25,
          0.77,
          (bw - 0.5) / 16,
          0.125,
          1.4,
          metal,
          "#e5d2a2",
        );
      local(u, 3.08, 1.44, bw - 0.5, 0.3, 0.08, metal, awnColor);
      const floors = Math.max(1, Math.floor((b.height - 4) / 3.5));
      for (let f = 0; f < floors; f++) {
        const y = 5.7 + f * 3.5;
        local(u, y - 0.99, 0.13, bw - 0.05, 0.13, 0.34, plaster, "#f1e4c9");
        for (let k of [-1, 1]) {
          const wx = u + k * bw * 0.22;
          local(wx, y, 0.13, 1.7, 2, 0.15, metal, "#e8d8b7");
          local(
            wx,
            y,
            0.23,
            1.38,
            1.72,
            0.05,
            glass,
            (i + f + bay) % 5 === 0 ? "#e5b466" : "#4c7078",
          );
          local(wx, y, 0.28, 0.065, 1.74, 0.05, metal, "#e6d6b5");
          local(wx, y, 0.28, 1.38, 0.06, 0.05, metal, "#d0c39f");
          local(wx, y + 1.03, 0.15, 1.93, 0.14, 0.38, plaster, "#e8d9b9");
        }
        if (showcase && f % 2 === 0) {
          local(u, y - 0.9, 0.61, bw - 0.65, 0.13, 1.23, plaster, "#c4b69a");
          local(u, y - 0.42, 1.18, bw - 0.65, 0.06, 0.06, metal, "#415453");
          for (let k = 0; k < 10; k++)
            local(
              u + ((k - 4.5) * (bw - 0.65)) / 9,
              y - 0.64,
              1.18,
              0.035,
              0.5,
              0.035,
              metal,
              "#405350",
            );
        }
      }
      // AC compressor, louvres, downpipe and projecting two-sided business signage.
      if (showcase) {
        local(u + bw * 0.35, 5.25, 0.65, 0.8, 0.48, 0.5, metal, "#d6d2b7");
        for (let k = 0; k < 5; k++)
          local(
            u + bw * 0.35,
            5.08 + k * 0.07,
            0.92,
            0.66,
            0.025,
            0.04,
            metal,
            "#536463",
          );
        local(
          u - bw * 0.43,
          b.height * 0.5,
          0.24,
          0.1,
          b.height,
          0.1,
          metal,
          "#766e61",
        );
      }
      piece(
        plane,
        sign,
        "#ffffff",
        n.fx + Math.cos(n.ry) * u + n.nx * 0.42,
        4.35,
        n.fz - Math.sin(n.ry) * u + n.nz * 0.42,
        bw - 0.6,
        1.12,
        1,
        n.ry,
        (i + bay) % 8,
      );
      if (showcase) {
        const x = n.fx + Math.cos(n.ry) * (u + bw * 0.37) + n.nx * 1.2,
          z = n.fz - Math.sin(n.ry) * (u + bw * 0.37) + n.nz * 1.2;
        B(metal, "#76302c", x, 8, z, 0.15, 5.1, 1.6, n.ry);
        for (let side of [-1, 1])
          piece(
            plane,
            verticalSign,
            "#fff",
            x + Math.cos(n.ry) * side * 0.09,
            8,
            z - Math.sin(n.ry) * side * 0.09,
            1.52,
            4.8,
            1,
            n.ry + (side * Math.PI) / 2,
            (i + bay) % 8,
          );
      }
    }
    B(
      plaster,
      "#eadcbf",
      b.x,
      b.height + 0.45,
      b.z,
      b.w + 0.2,
      0.3,
      b.d + 0.2,
      0,
      false,
    );
  });
  // Flat sidewalks are visual surfaces, never new invisible collision walls. Keep intersection mouths clear.
  for (const r of d.roads) {
    const a = nodes.get(r.a)!,
      b = nodes.get(r.b)!,
      len = Math.hypot(b.x - a.x, b.z - a.z),
      ry = Math.atan2(b.x - a.x, b.z - a.z);
    if (r.shortcut) continue;
    for (const side of [-1, 1]) {
      const off = r.width / 2 + 2.3,
        x = (a.x + b.x) / 2 + Math.cos(ry) * off * side,
        z = (a.z + b.z) / 2 - Math.sin(ry) * off * side;
      B(stone, "#c6bc9f", x, 0.16, z, 4.4, 0.12, len - 36, ry, false);
      B(
        plaster,
        "#d8cbaa",
        x - Math.cos(ry) * 2.1 * side,
        0.15,
        z,
        0.17,
        0.15,
        len - 36,
        ry,
        false,
      );
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
  box.dispose();
  plane.dispose();
  return {
    root,
    update(camera: T.Vector3, quality: "low" | "medium") {
      const radius = quality === "low" ? 100 : 155;
      for (const g of shells) {
        const c = g.userData.center as T.Vector3;
        g.visible =
          Math.hypot(c.x - camera.x, c.z - camera.z) <
          (quality === "low" ? 235 : 330);
      }
      for (const g of details) {
        const c = g.userData.center as T.Vector3;
        g.visible = Math.hypot(c.x - camera.x, c.z - camera.z) < radius;
      }
    },
    dispose: () => disposeObject(root),
  };
}
