import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** All assets are same-origin, versioned with the game; no decoder CDN or API. */
export const ASSETS = {
  tuk: "assets/models/hero-tuktuk.glb",
  landmarkSigns: "assets/textures/landmark-signs.png",
  plate: "assets/textures/license-plate.png",
  asphalt: "assets/textures/asphalt.png",
  plaster: "assets/textures/plaster.png",
  verticalSigns: "assets/textures/vertical-signs.png",
  paving: "assets/textures/paving.png",
  signs: "assets/textures/signs.png",
} as const;
export const assetURL = (path: string) => `${import.meta.env.BASE_URL}${path}`;
export type ArtBundle = {
  hero: THREE.Group;
  textures: Map<string, THREE.Texture>;
  dispose: () => void;
};
export async function loadArt(): Promise<ArtBundle> {
  // Tiny local OFL subsets guarantee readable Thai/Chinese across test browsers
  // and iPhone; no remote font request or system-font assumption at runtime.
  const fonts = [
    new FontFace(
      "Rush Thai",
      `url("${assetURL("assets/fonts/thai-signs.ttf")}")`,
    ),
    new FontFace(
      "Rush Chinese",
      `url("${assetURL("assets/fonts/chinese-signs.ttf")}")`,
    ),
  ];
  const loadedFonts = await Promise.allSettled(
    fonts.map(async (f) => {
      await f.load();
      document.fonts.add(f);
    }),
  );
  if (loadedFonts.some((f) => f.status === "rejected")) {
    fonts.forEach((f) => document.fonts.delete(f));
    throw new Error("Required signage fonts could not load");
  }
  const textures = new Map<string, THREE.Texture>();
  const loader = new THREE.TextureLoader();
  const results = await Promise.allSettled([
    new GLTFLoader().loadAsync(assetURL(ASSETS.tuk)),
    ...Object.values(ASSETS)
      .filter((path) => path !== ASSETS.tuk)
      .map(async (path) => {
        const t = await loader.loadAsync(assetURL(path));
        textures.set(path, t);
        return t;
      }),
  ]);
  const heroResult = results[0]!;
  if (results.some((result) => result.status === "rejected")) {
    fonts.forEach((f) => document.fonts.delete(f));
    textures.forEach((t) => t.dispose());
    if (heroResult.status === "fulfilled")
      disposeObject((heroResult.value as { scene: THREE.Group }).scene);
    throw new Error("A required art asset could not load");
  }
  const hero = (heroResult as PromiseFulfilledResult<{ scene: THREE.Group }>)
    .value.scene;
  return {
    hero,
    textures,
    dispose() {
      fonts.forEach((f) => document.fonts.delete(f));
      disposeObject(hero);
      textures.forEach((t) => t.dispose());
    },
  };
}
export function surface(
  textures: Map<string, THREE.Texture>,
  path: string,
  repeat = 1,
) {
  const t = textures.get(path)!.clone();
  t.needsUpdate = true;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 2;
  return t;
}
/** Own each resource exactly once. No global disposed-material cache. */
export function disposeObject(
  root: THREE.Object3D,
  ownedTextures: Iterable<THREE.Texture> = [],
) {
  const gs = new Set<THREE.BufferGeometry>(),
    ms = new Set<THREE.Material>(),
    ts = new Set<THREE.Texture>(ownedTextures),
    instances = new Set<THREE.InstancedMesh>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (o instanceof THREE.InstancedMesh) instances.add(o);
    if (mesh.geometry) gs.add(mesh.geometry);
    for (const m of Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : []) {
      ms.add(m);
      for (const value of Object.values(m))
        if (value instanceof THREE.Texture) ts.add(value);
    }
  });
  ts.forEach((t) => {
    const image = t.image;
    t.dispose();
    if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap)
      image.close();
  });
  instances.forEach((mesh) => mesh.dispose());
  ms.forEach((m) => m.dispose());
  gs.forEach((g) => g.dispose());
}
