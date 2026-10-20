import fs from "node:fs";
import { pathToFileURL } from "node:url";
import * as T from "three";
const checkout =
  process.env.CITY_CHECKOUT ?? new URL("../../../", import.meta.url).pathname;
const source = `${checkout}/artifacts/tuk-tuk-rush/src/game`;
const { createBangkokWorld } = await import(
  pathToFileURL(`${source}/bangkok/world.ts`).href
);
const { buildBangkokGraybox } = await import(
  pathToFileURL(`${source}/bangkok/mesh.ts`).href
);
const startCpu=process.cpuUsage();
const begin = performance.now(),
  d = createBangkokWorld(),
  city = buildBangkokGraybox(d),
  geometries = new Set<T.BufferGeometry>(),
  materials = new Set<T.Material>(),
  textures = new Set<T.Texture>(),
  arrays = new Set<ArrayBufferView>();
let triangles = 0,
  instances = 0;
city.group.traverse((o: any) => {
  if (o.geometry) {
    geometries.add(o.geometry);
    if (o.isMesh) triangles +=
      ((o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3) *
      (o.isInstancedMesh ? o.count : 1);
  }
  if (o.instanceMatrix) {
    arrays.add(o.instanceMatrix.array);
    instances += o.count;
  }
  if (o.instanceColor) arrays.add(o.instanceColor.array);
  for (const m of (Array.isArray(o.material)
    ? o.material
    : [o.material]
  ).filter(Boolean)) {
    materials.add(m);
    for (const v of Object.values(m))
      if ((v as any)?.isTexture) textures.add(v as T.Texture);
  }
});
for (const g of geometries) {
  for (const a of Object.values(g.attributes)) arrays.add(a.array);
  if (g.index) arrays.add(g.index.array);
}
const report = {
  method:
    "Node scene inventory without browser canvas labels, all retained LODs/chunks; not rendered calls or hardware FPS",
  physicalIPhone: false,
  buildings: d.buildings.length,
  roads: d.roads.length,
  geometryBuffersBytes: [...arrays].reduce((n, a) => n + a.byteLength, 0),
  geometries: geometries.size,
  materials: materials.size,
  textures: textures.size,
  trianglesAllLevels: triangles,
  instances,
  constructionMs: Math.round(performance.now() - begin),
  constructionCpuMs:(()=>{const c=process.cpuUsage(startCpu);return Math.round((c.user+c.system)/1000);})(),
  disposal: { geometries: 0, materials: 0, textures: 0 },
};
for (const g of geometries)
  g.addEventListener("dispose", () => report.disposal.geometries++);
for (const m of materials)
  m.addEventListener("dispose", () => report.disposal.materials++);
for (const t of textures)
  t.addEventListener("dispose", () => report.disposal.textures++);
city.dispose();
const out = process.env.CITY_INVENTORY_OUTPUT;
if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
