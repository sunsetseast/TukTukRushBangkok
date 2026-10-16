/** Deterministic resident buffers, including both LODs; no DOM signs or GPU estimate. */
import { createBangkokWorld } from '../src/game/bangkok/world';
import { buildBangkokGraybox } from '../src/game/bangkok/mesh';
const city = buildBangkokGraybox(createBangkokWorld());
const buffers = new Set<ArrayBufferLike>(),
  materials = new Set(),
  geometries = new Set();
city.group.traverse((o) => {
  const mesh = o as import('three').Mesh & {
    instanceMatrix?: import('three').BufferAttribute;
    instanceColor?: import('three').BufferAttribute;
  };
  if (mesh.geometry && !geometries.has(mesh.geometry)) {
    geometries.add(mesh.geometry);
    for (const a of Object.values(mesh.geometry.attributes)) buffers.add(a.array.buffer);
    if (mesh.geometry.index) buffers.add(mesh.geometry.index.array.buffer);
  }
  if (mesh.instanceMatrix) buffers.add(mesh.instanceMatrix.array.buffer);
  if (mesh.instanceColor) buffers.add(mesh.instanceColor.array.buffer);
  if (mesh.material) for (const m of [mesh.material].flat()) materials.add(m);
});
console.log(
  JSON.stringify({
    bufferBytes: [...buffers].reduce((n, b) => n + b.byteLength, 0),
    geometryObjects: geometries.size,
    materials: materials.size,
    scope:
      'Node city root including both LODs, indices and instance buffers. No DOM signs, vehicles or GPU uploads.',
  }),
);
city.dispose();
