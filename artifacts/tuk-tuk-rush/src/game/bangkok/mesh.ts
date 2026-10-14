import * as T from "three";
import { emitEnvironment } from "./environmentArt";
import { emitCables } from "./environmentCables";
import { asphaltMaterial } from "./streetSurfaces";
import { sculptedLandmark } from "./sculptedLandmarks";
import { scalaParcel, emitScala, buildScalaSigns } from "./scala";
import type { District, Landmark } from "../types";
import type { City } from "../cityMesh";
import { StaticBatch } from "../staticBatch";
import { disposeObject } from "../assets";
import { buildLandmarkArt } from "../landmarkArt";
import { emitDistrictArchitecture } from "./architecture";
import { designBuildings } from "./buildingGrammar";
import { emitUrbanLayers } from "./urbanLayers";
import { riverDistance } from "./world";
import {
  ArchitecturalBatch,
  architecturalTexture,
  installSurfaceAtlas,
  architecturalSurfaceMap,
} from "./architecturalBatch";
import { buildBangkokSigns } from "./signage";
import { buildCommercialLandmark } from "./landmarkArchitecture";

/** Reuse the tested city graph with regional streetscape art and mobile culling. */
export function buildBangkokGraybox(
  d: District,
): City & { setNight: (night: number) => void } {
  const group = new T.Group();
  group.name = "CompactBangkokGraybox";
  const ground = new T.Mesh(
    new T.PlaneGeometry(14000, 14000).rotateX(-Math.PI / 2),
    new T.MeshStandardMaterial({ color: "#53645c", roughness: 1 }),
  );
  ground.position.y = -0.25;
  group.add(ground);
  const batch = new StaticBatch(),
    detailBatch = new StaticBatch(),
    nightBatch = new StaticBatch();
  const unit = new T.BoxGeometry(1, 1, 1),
    temp = new T.Object3D();
  const material = new T.MeshStandardMaterial({ roughness: 0.9 }), asphalt=asphaltMaterial();
  const nightMaterial = new T.MeshStandardMaterial({
    roughness: 0.38,
    metalness: 0.12,
    emissive: "#f7be76",
    emissiveIntensity: 0,
  });
  const add = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    depth: number,
    color: string,
    yaw = 0,
    destination = batch,
    surface: T.Material = material,
  ) => {
    temp.position.set(x, y, z);
    temp.rotation.set(0, yaw, 0);
    temp.scale.set(w, h, depth);
    temp.updateMatrix();
    destination.add(unit, surface, [temp.matrix.clone()], [new T.Color(color)]);
  };
  const nodes = new Map(d.nodes.map((n) => [n.id, n])),
    widths = new Map<string, number>(),
    degrees = new Map<string, number>();
  for (const r of d.roads) {
    const a = nodes.get(r.a)!,
      b = nodes.get(r.b)!,
      dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz),
      yaw = Math.atan2(dx, dz);
    const x = (a.x + b.x) / 2,
      z = (a.z + b.z) / 2;
    for (const id of [r.a, r.b]) {
      widths.set(id, Math.max(widths.get(id) ?? 0, r.width));
      degrees.set(id, (degrees.get(id) ?? 0) + 1);
    }
    add(
      x,
      -0.02,
      z,
      r.width + 12,
      0.16,
      len + 0.5,
      r.bridge ? "#bbcbc9" : "#aaa79b",
      yaw,
    );
    add(
      x,
      0.08,
      z,
      r.width,
      0.12,
      len + 0.7,
      r.shortcut ? "#796857" : "#ffffff",
      yaw, batch, r.shortcut?material:asphalt,
    );
    if (!r.shortcut && !r.oneWay && !r.roundabout)
      for (let t = 8; t < len - 4; t += 12)
        add(
          a.x + (dx * t) / len,
          0.155,
          a.z + (dz * t) / len,
          0.22,
          0.02,
          4,
          "#e6dba1",
          yaw,
        );
    if (r.bridge) {
      add(x, -0.9, z, r.width + 2, 1.4, len + 0.5, "#778b93", yaw);
      for (const side of [-1, 1]) {
        const off = r.width / 2 + 1;
        add(
          x + Math.cos(yaw) * off * side,
          1.05,
          z - Math.sin(yaw) * off * side,
          0.4,
          1.6,
          len + 0.5,
          "#68c1c4",
          yaw,
        );
      }
    }
  }
  const disc = new T.CylinderGeometry(1, 1, 0.12, 20);
  for (const [id, degree] of degrees)
    if (degree > 2) {
      const n = nodes.get(id)!,
        width = widths.get(id)!;
      temp.position.set(n.x, 0.08, n.z);
      temp.rotation.set(0, 0, 0);
      temp.scale.set(width / 2, 1, width / 2);
      temp.updateMatrix();
      batch.add(
        disc,
        material,
        [temp.matrix.clone()],
        [new T.Color("#343e49")],
      );
    }
  const water = new T.MeshBasicMaterial({ color: "#285877" }),
    waterDisc = new T.CylinderGeometry(1, 1, 0.04, 32);
  for (let i = 1; i < d.river!.length; i++) {
    const a = d.river![i - 1]!,
      b = d.river![i]!,
      len = Math.hypot(b.x - a.x, b.z - a.z);
    temp.position.set((a.x + b.x) / 2, -0.15, (a.z + b.z) / 2);
    temp.rotation.set(0, Math.atan2(b.x - a.x, b.z - a.z), 0);
    temp.scale.set(d.riverWidth!, 0.04, len);
    temp.updateMatrix();
    batch.add(unit, water, [temp.matrix.clone()]);
    for (const p of [a, b]) {
      temp.position.set(p.x, -0.15, p.z);
      temp.rotation.set(0, 0, 0);
      temp.scale.set(d.riverWidth! / 2, 1, d.riverWidth! / 2);
      temp.updateMatrix();
      batch.add(waterDisc, water, [temp.matrix.clone()]);
    }
  }
  const designs = designBuildings(d);
  const surfaceMap = architecturalSurfaceMap();
  const facadeMaterial = new T.MeshStandardMaterial({
    map: architecturalTexture(),
    roughnessMap: surfaceMap,
    metalnessMap: surfaceMap,
    vertexColors: true,
    roughness: 1,
    metalness: 1,
  });
  installSurfaceAtlas(facadeMaterial);
  nightMaterial.vertexColors = true;
  const architecture = new ArchitecturalBatch(facadeMaterial, nightMaterial);
  const scala=scalaParcel(d), ordinary=designs.filter(p=>p.parcel!==scala);
  emitDistrictArchitecture(ordinary, (piece) => architecture.add(piece));
  emitScala(scala, piece=>architecture.add(piece));
  emitUrbanLayers(d, ordinary, (piece) => architecture.add(piece));
  emitEnvironment(d,piece=>architecture.add(piece));
  emitCables(d,piece=>architecture.add(piece));
  for (const l of d.landmarks.filter((l) => l.kind === "mall")) {
    const site = l.plot!,
      size = l.size!;
    const plaza =
      riverDistance(d, site) >
      d.riverWidth! / 2 + ((size + 24) * Math.SQRT2) / 2 + 3
        ? size + 24
        : size;
    architecture.add({
      x: site.x,
      y: -0.19,
      z: site.z,
      w: plaza,
      h: 0.06,
      d: plaza,
      color: l.id === "icon" ? "#bdb99c" : "#b8c3bc",
      yaw: 0,
      surface: "tile",
    });
  }
  for (const o of d.obstacles.filter((o) => o.artRole === "furniture" && !o.environmentId)) {
    architecture.add({
      x: o.x,
      y: 0.5,
      z: o.z,
      w: o.w,
      h: 1,
      d: o.d,
      color: "#b0a986",
      yaw: 0,
      surface: "concrete",
    });
    architecture.add({
      x: o.x,
      y: 3.5,
      z: o.z,
      w: 0.38,
      h: 6,
      d: 0.38,
      color: "#897156",
      yaw: 0,
      shape: "cylinder",
    });
    architecture.add({
      x: o.x,
      y: 6.8,
      z: o.z,
      w: 5.8,
      h: 2.6,
      d: 5.3,
      color: "#608464",
      yaw: 0,
      shape: "orb",
    });
    architecture.add({
      x: o.x,
      y: 7.3,
      z: o.z,
      w: 3.3,
      h: 1.7,
      d: 6.5,
      color: "#73966a",
      yaw: 0.4,
      shape: "orb",
    });
  }
  architecture.finish().forEach((chunk) => group.add(chunk));
  group.userData.architecture = {
    parcels: designs.length,
    bays: designs.reduce((n, p) => n + p.bays.length, 0),
    pieces: architecture.pieces,
  };
  batch.finish().forEach((chunk) => {
    chunk.name = "BangkokSector";
    group.add(chunk);
  });
  detailBatch.finish().forEach((chunk) => {
    chunk.name = "BangkokDetail";
    group.add(chunk);
  });
  nightBatch.finish().forEach((chunk) => {
    chunk.name = "BangkokNight";
    group.add(chunk);
  });
  if (typeof document !== "undefined") {
    const signs = buildBangkokSigns(d, ordinary);
    for (const child of [...signs.children]) group.add(child);
  }
  const scalaSigns=buildScalaSigns(scala);group.add(scalaSigns);
  const heroes = d.landmarks.map((l) => {
    const root = blockout(l);
    root.position.set(l.plot?.x ?? l.x, 0, l.plot?.z ?? l.z);
    root.name = `BangkokLandmark:${l.id}`;
    group.add(root);
    return root;
  });
  // River sections span several cells. A cell-center test can hide their near
  // bank while the player is still looking at it; cull the full geometry bounds.
  group.updateMatrixWorld(true);
  const chunks = group.children
    .filter(
      (c) =>
        c.name === "BangkokSector" ||
        c.name === "BangkokArchitecture" ||
        c.name === "BangkokFacade" ||
        c.name === "BangkokCoarse" ||
        c.name === "BangkokDetail" ||
        c.name === "BangkokNight" ||
        c.name === "BangkokSign",
    )
    .map((chunk) => ({
      chunk,
      bounds: new T.Box3().setFromObject(chunk),
      core: chunk.name !== "BangkokDetail",
    }));
  const glowing = group.children
    .filter((c) => c.name === "BangkokNight")
    .flatMap((c) => c.children)
    .map((c) => (c as T.Mesh).material as T.MeshStandardMaterial);
  const signMaterials = group.children
    .filter((c) => c.name === "BangkokSign")
    .flatMap((c) => c.children)
    .map((c) => (c as T.Mesh).material as T.MeshStandardMaterial);
  let lastX = Infinity,
    lastZ = Infinity,
    lastQuality = "",
    lastNight = -1;
  return {
    group,
    setNight(night: number) {
      if (Math.abs(night - lastNight) < 0.015) return;
      lastNight = night;
      for (const mat of new Set(glowing))
        mat.emissiveIntensity = Math.max(0, night) * 1.55;
      for (const hero of heroes) {
        for(const m of hero.userData.nightMaterials ?? [])m.emissiveIntensity=night*.75;
        const mat = hero.userData.nightMaterial as
          T.MeshStandardMaterial | undefined;
        if (mat) {
          mat.emissiveIntensity = night * 1.5;
          mat.opacity = night * 0.58;
          mat.visible = night > 0.02;
        }
      }
      const scalaMat=scalaSigns.userData.nightMaterial as T.MeshStandardMaterial | undefined;
      if(scalaMat)scalaMat.emissiveIntensity=.12+night*.85;
      for (const mat of new Set(signMaterials))
        mat.emissiveIntensity = 0.12 + Math.max(0, night) * 1.55;
    },
    update(camera, quality) {
      if (
        Math.hypot(camera.x - lastX, camera.z - lastZ) < 16 &&
        quality === lastQuality
      )
        return;
      lastX = camera.x;
      lastZ = camera.z;
      lastQuality = quality;
      const radius = quality === "low" ? 420 : 650;
      for (const { chunk, bounds, core } of chunks) {
        const dx = Math.max(
          bounds.min.x - camera.x,
          0,
          camera.x - bounds.max.x,
        );
        const dz = Math.max(
          bounds.min.z - camera.z,
          0,
          camera.z - bounds.max.z,
        );
        let distance = Math.hypot(dx, dz);
        if (chunk.name === "BangkokFacade" || chunk.name === "BangkokCoarse") {
          const center = chunk.userData.center as T.Vector3;
          distance = Math.max(
            0,
            Math.hypot(center.x - camera.x, center.z - camera.z) - 85,
          );
        }
        const near = quality === "low" ? 120 : 195;
        if (chunk.name === "BangkokFacade") chunk.visible = distance < near;
        else if (chunk.name === "BangkokCoarse")
          chunk.visible = distance >= near && distance < radius;
        else if (chunk.name === "BangkokDetail")
          chunk.visible = quality === "medium" && distance < 150;
        else chunk.visible = distance < radius;
      }
      for (const hero of heroes)
        hero.visible =
          Math.hypot(hero.position.x - camera.x, hero.position.z - camera.z) <
          radius + 180;
    },
    dispose() {
      disposeObject(group);
    },
  };
}
function blockout(l: Landmark) {
  const authored=sculptedLandmark(l);if(authored)return authored;
  if (l.kind === "park") return new T.Group();
  if (l.kind === "mall") return buildCommercialLandmark(l);
  const g = new T.Group(),
    size = l.size ?? 20;
  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    color: string,
  ) => {
    const m = new T.Mesh(
      new T.BoxGeometry(w, h, d),
      new T.MeshStandardMaterial({ color, roughness: 0.85 }),
    );
    m.position.set(x, y, z);
    g.add(m);
  };
  if (
    l.kind === "gate" ||
    l.kind === "station" ||
    (l.kind === "temple" && l.id !== "arun")
  ) {
    const model = buildLandmarkArt({ ...l, x: 0, z: 0 });
    model.scale.setScalar(Math.min(1, size / (l.kind === "station" ? 85 : 55)));
    g.add(model);
    return g;
  }
  if (l.kind === "temple") {
    for (let i = 0; i < 7; i++) {
      const width = size * (1 - i / 9);
      box(width, 5, width, 0, 2.5 + i * 5, 0, "#eee3c9");
    }
  } else if (l.kind === "tower") {
    for (let i = 0; i < 10; i++)
      box(
        size - (i % 4) * 2,
        10,
        size - (i % 3) * 2,
        ((i % 3) - 1) * 2,
        5 + i * 10,
        0,
        "#7196b6",
      );
  } else if (l.kind === "palace") {
    box(size, 6, size, 0, 3, 0, "#eee3c9");
    for (const side of [-1, 1]) {
      box(size * 0.28, 16, size * 0.38, side * size * 0.28, 14, 0, "#bf6f49");
      box(size * 0.34, 2, size * 0.44, side * size * 0.28, 23, 0, "#e5c071");
    }
  } else if (l.kind === "wheel") {
    const radius = Math.min(size / 2, 22);
    box(2, radius, 2, 0, radius / 2, 0, "#ead7a6");
    const wheel = new T.Mesh(
      new T.TorusGeometry(radius, 0.6, 5, 32),
      new T.MeshBasicMaterial({ color: "#f1bf94" }),
    );
    wheel.position.y = radius + 2;
    g.add(wheel);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI * 2) / 12;
      box(
        2,
        2,
        2,
        Math.cos(a) * radius,
        radius + 2 + Math.sin(a) * radius,
        0,
        "#e6a487",
      );
    }
  } else {
    const height = l.kind === "monument" ? 12 : 16;
    box(size, height, size, 0, height / 2, 0, "#d2b884");
    box(size * 0.9, 2, size * 0.9, 0, height + 1, 0, "#dec595");
  }
  return g;
}
export function shiftLighting(elapsed: number) {
  const blue = T.MathUtils.smoothstep(elapsed, 0, 4 * 60),
    night = T.MathUtils.smoothstep(elapsed, 4 * 60, 9 * 60);
  const sky = new T.Color("#c99585")
    .lerp(new T.Color("#576482"), blue)
    .lerp(new T.Color("#17263d"), night);
  return {
    sky,
    night,
    ambient: 1.15 - night * 0.85,
    sun: 1.8 - blue * 0.7 - night * 1.03,
    exposure: 0.9 + night * 0.12,
  };
}
