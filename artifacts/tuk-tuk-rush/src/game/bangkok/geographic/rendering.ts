import * as T from "three";
import { geographicToMeters } from "./projection";
import type { GeographicChunkData, GeographicDataset } from "./dataset";
import { surfaceGeometry } from "../roadSurfaceGraph";
export type GeographicMaterials = ReturnType<typeof geographicMaterials>;
export function geographicMaterials(data: {rail: Pick<GeographicDataset['rail'],'catalog'>}) {
  return {
    land: new T.MeshStandardMaterial({ color: "#a8b6a1", roughness: 1 }),
    roads: new T.MeshStandardMaterial({ color: "#414c56", roughness: 1 }),
    deck: new T.MeshStandardMaterial({
      color: "#a28f77",
      roughness: 1,
      side: T.DoubleSide,
    }),
    support: new T.MeshStandardMaterial({ color: "#c5c0b0", roughness: 1 }),
    lines: new Map(
      data.rail.catalog.lines.map((l) => [
        l.id,
        new T.MeshStandardMaterial({ color: l.color, roughness: 0.85 }),
      ]),
    ),
  };
}
function strip(points: [number, number, number][], width: number) {
  const pos: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!,
      b = points[i]!,
      len = Math.hypot(b[0] - a[0], b[2] - a[2]);
    if (len < 0.001) continue;
    const x = (((b[2] - a[2]) / len) * width) / 2,
      z = ((-(b[0] - a[0]) / len) * width) / 2;
    const v = [
      [a[0] - x, a[1] + 0.12, a[2] - z],
      [a[0] + x, a[1] + 0.12, a[2] + z],
      [b[0] - x, b[1] + 0.12, b[2] - z],
      [b[0] + x, b[1] + 0.12, b[2] + z],
    ];
    for (const n of [0, 2, 1, 1, 2, 3]) pos.push(...v[n]!);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  geometry.computeVertexNormals();
  return geometry;
}
function boxes(
  root: T.Group,
  items: {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    d: number;
    yaw: number;
  }[],
  material: T.Material,
) {
  if (!items.length) return;
  const mesh = new T.InstancedMesh(
      new T.BoxGeometry(1, 1, 1),
      material,
      items.length,
    ),
    pose = new T.Object3D();
  items.forEach((b, i) => {
    pose.position.set(b.x, b.y, b.z);
    pose.rotation.y = b.yaw;
    pose.scale.set(b.w, b.h, b.d);
    pose.updateMatrix();
    mesh.setMatrixAt(i, pose.matrix);
  });
  mesh.computeBoundingSphere();
  root.add(mesh);
}
export function buildGeographicChunk(
  c: GeographicChunkData,
  m: GeographicMaterials,
  water: T.Material,
) {
  const root = new T.Group();
  root.position.set(c.origin[0], 0, c.origin[1]);
  root.name = `GeographicChunk:${c.origin.join(":")}`;
  for (const kind of ["land", "water", "roads"] as const)
    if (c[kind].length)
      root.add(
        new T.Mesh(
          surfaceGeometry(
            c[kind],
            kind === "land" ? -0.25 : kind === "water" ? -0.48 : 0.1,
          ),
          kind === "water" ? water : m[kind],
        ),
      );
  if (c.decks.length) {
    const positions: number[] = [];
    for (const d of c.decks) {
      const g = strip(d.points, d.width);
      positions.push(...g.getAttribute("position").array);
      g.dispose();
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.computeVertexNormals();
    root.add(new T.Mesh(g, m.deck));
  }
  for (const [line, material] of m.lines) {
    const spans = [];
    for (const r of c.rail.filter((r) => r.line === line))
      for (let i = 1; i < r.points.length; i++) {
        const a = r.points[i - 1]!,
          b = r.points[i]!,
          length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (length < 0.01) continue;
        spans.push({
          x: (a[0] + b[0]) / 2,
          y: r.height - 0.5,
          z: (a[1] + b[1]) / 2,
          w: r.level === "elevated" ? 2.4 : 1.1,
          h: r.level === "elevated" ? 1 : 0.2,
          d: length + 0.04,
          yaw: Math.atan2(b[0] - a[0], b[1] - a[1]),
        });
      }
    boxes(root, spans, material);
    boxes(
      root,
      c.stations
        .filter(
          (s) =>
            s.status === "operational" &&
            s.level !== "underground" &&
            s.lines[0] === line,
        )
        .flatMap((s) => {
          const x = s.point[0] - c.origin[0],
            z = s.point[1] - c.origin[1];
          return [
            { x, y: s.height + 1, z, w: 14, h: 1, d: 100, yaw: s.yaw },
            { x, y: s.height + 6, z, w: 16, h: 0.6, d: 105, yaw: s.yaw },
          ];
        }),
      material,
    );
  }
  boxes(
    root,
    (c.supports ?? []).map((s) => ({
      x: s.point[0] - c.origin[0],
      y: (s.height - 1) / 2,
      z: s.point[1] - c.origin[1],
      w: 1.4,
      h: s.height - 1,
      d: 1.4,
      yaw: 0,
    })),
    m.support,
  );
  return root;
}
/** Shared materials survive chunk eviction. Each chunk exclusively owns its GPU geometry. */
export function disposeGeographicChunk(root: T.Group) {
  root.removeFromParent();
  root.traverse((o) => {
    if (o instanceof T.Mesh) o.geometry.dispose();
    if (o instanceof T.InstancedMesh) o.dispose();
  });
  root.clear();
}
/** One coarse batched network for city inspection. No detailed chunks are initialized. */
export function buildGeographicOverview(data: GeographicDataset) {
  const root = new T.Group();
  root.name = "GeographicOverview";
  root.add(
    new T.Mesh(
      surfaceGeometry(data.waterUnion, -0.2),
      new T.MeshBasicMaterial({ color: "#277b94" }),
    ),
  );
  const line = (paths: [number, number][][], color: string, y: number) => {
    const p: number[] = [];
    for (const points of paths)
      for (let i = 1; i < points.length; i++)
        p.push(
          points[i - 1]![0],
          y,
          points[i - 1]![1],
          points[i]![0],
          y,
          points[i]![1],
        );
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
    root.add(new T.LineSegments(g, new T.LineBasicMaterial({ color })));
  };
  line(
    data.roads.map((r) => r.nodes.map((n) => data.nodes[n]!)),
    "#485a61",
    0.2,
  );
  for (const l of data.rail.catalog.lines)
    line(
      data.rail.tracks
        .filter(
          (r) =>
            r.playable && r.lines.includes(l.id) && r.status === "operational",
        )
        .map((r) => r.points),
      l.color,
      2,
    );
  const stations = data.rail.stations.filter(
    (s) =>
      s.playable &&
      s.status === "operational" &&
      s.tags.railway !== "subway_entrance",
  );
  const markers = new T.BufferGeometry();
  markers.setAttribute(
    "position",
    new T.Float32BufferAttribute(
      stations.flatMap((s) => [s.point[0], 4, s.point[1]]),
      3,
    ),
  );
  root.add(
    new T.Points(
      markers,
      new T.PointsMaterial({
        color: "#ffffff",
        size: 4,
        sizeAttenuation: false,
      }),
    ),
  );
  line(
    data.boundaries.flatMap((b) =>
      b.geometry.coordinates.flatMap((p) =>
        p.map((r) =>
          r.map(([lon, lat]) => {
            const q = geographicToMeters({ lon: lon!, lat: lat! });
            return [q.x, q.z] as [number, number];
          }),
        ),
      ),
    ),
    "#8b6cab",
    0.4,
  );
  return root;
}
