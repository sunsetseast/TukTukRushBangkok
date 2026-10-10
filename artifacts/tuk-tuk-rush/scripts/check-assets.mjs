import assert from "node:assert/strict";
import fs from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const dir = new URL("../public/assets/", import.meta.url);
const bytes = await fs.readFile(new URL("models/hero-tuktuk.glb", dir));
const buffer = bytes.buffer.slice(
  bytes.byteOffset,
  bytes.byteOffset + bytes.byteLength,
);
const gltf = await new GLTFLoader().parseAsync(buffer, "");
for (const name of [
  "Body",
  "Steering",
  "SteeringSpin",
  "RearLeftSpin",
  "RearRightSpin",
  "Handlebars",
  "Driver",
  "Passenger",
])
  assert(gltf.scene.getObjectByName(name), `Missing articulated node ${name}`);
const bounds = new T.Box3().setFromObject(gltf.scene),
  size = bounds.getSize(new T.Vector3());
assert(
  size.x < 2.3 && size.z < 4 && size.y < 2.8,
  "Hero must fit the arcade vehicle envelope",
);
assert(bounds.min.y >= -0.02, "Wheel/ground alignment");
let triangles = 0,
  materials = new Set();
gltf.scene.traverse((o) => {
  if (o.isMesh) {
    triangles +=
      (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    assert(o.geometry.attributes.normal, "Normals required");
    materials.add(o.material);
  }
});
assert(triangles < 32000, "Hero triangle budget");
assert(bytes.length < 800000, "Hero transfer budget");
const textures = [
  "asphalt.png",
  "plaster.png",
  "paving.png",
  "signs.png",
  "vertical-signs.png",
  "license-plate.png",
  "landmark-signs.png",
];
let textureBytes = 0,
  gpuBytes = 0;
for (const path of textures) {
  const png = await fs.readFile(new URL("textures/" + path, dir));
  assert(png.readUInt32BE(0) === 0x89504e47);
  const w = png.readUInt32BE(16),
    h = png.readUInt32BE(20);
  assert(w <= 2048 && h <= 2048);
  textureBytes += png.length;
  gpuBytes += (w * h * 4 * 4) / 3;
}
console.log(
  JSON.stringify(
    {
      modelBytes: bytes.length,
      triangles,
      materials: materials.size,
      dimensions: size.toArray(),
      textureTransferBytes: textureBytes,
      estimatedTextureBytesWithMips: Math.round(gpuBytes),
    },
    null,
    2,
  ),
);
