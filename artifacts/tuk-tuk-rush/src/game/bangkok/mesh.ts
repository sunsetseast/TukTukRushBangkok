import {riverClearance,riverBank,nearestRiverShore} from './waterGeometry';
import { HISTORIC_PLAN } from './historicPlan';
import { emitHuaGrounds } from './huaLamphong';
import { emitLandmarkApproaches } from './landmarkParcels';
import { emitLandmarkContextGrounds } from './landmarkContext';
import {publicSpaceLandmark,buildPublicSpaceSigns} from './publicSpaceArt';
import {victoryMonument} from './victoryMonument';
import {historicDistrictLandmark} from './historicDistricts';
import {emitConvenienceStores,buildConvenienceStoreSigns} from './convenienceStores';
import {emitBlockCourts} from "./urbanBlocks";
import {emitUrbanCompletenessGrounds} from './urbanCompleteness';
import { emitAuthoredGrounds } from './authoredGrounds';
import { realCommercial } from './realCommercial';
import { buildRealArchitecture, buildRealPlaceSigns } from './realArchitecture';
import { installShopLight } from "./shopLighting";
import { yaowaratRoad } from "./yaowaratRoad";
import { emitYaowaratLanterns } from "./yaowarat";
import { emitStreetFrontages, emitStreetGardens } from './streetFabric';
import * as T from "three";
import { landscapeMaterial } from "./streetSurfaces";
import { emitLandscape } from "./landscape";
import { emitTropicalVegetation } from "./tropicalPlan";
import { emitMrtEntrances } from "./mrtSurface";
import { facadeFinishes, installFacadeFinish } from "./facadeFinish";
import { cityShadows } from "./cityShadows";
import { riverWater, riverMotion, emitRiverfront } from "./riverfront";
import { emitBridges } from "./bridgeArt";
import { emitDestinationGrounds } from "./destinationArt";
import { emitRailInfrastructure, buildRailTrains } from "./transit/art";
import { buildTransitSigns } from "./transit/signs";
import type { RailService } from "./transit/service";
import { environmentEffects } from "./environmentEffects";
import { emitEnvironment } from "./environmentArt";
import { emitDistrictSigns } from "./districtSigns";
import { emitCables } from "./environmentCables";
import { buildRoadSurfaces, channelGeometry } from "./roadSurfaceGraph";
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
import { ArchitecturalBatch, type ArtPiece } from "./architecturalBatch";
import { buildBangkokSigns } from "./signage";
import { buildCommercialLandmark } from "./landmarkArchitecture";

/** Reuse the tested city graph with regional streetscape art and mobile culling. */
export function buildBangkokGraybox(
  d: District,
  railService?: RailService,
): City & {
  setNight: (night: number) => void;
  setInspection: (id?: string) => void;
  animate: (time: number, quality: string, green: boolean) => void;
} {
  const group = new T.Group();
  group.name = "CompactBangkokGraybox";
  const ground = new T.Mesh(channelGeometry("land",d), landscapeMaterial());
  ground.name = "DevelopedLand";
  group.add(ground);
  const batch = new StaticBatch(),
    detailBatch = new StaticBatch(),
    nightBatch = new StaticBatch();
  const unit = new T.BoxGeometry(1, 1, 1),
    temp = new T.Object3D();
  const material = new T.MeshStandardMaterial({ roughness: 0.9 });
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
    if (!r.shortcut && !r.oneWay && !r.roundabout)
      for (
        let t = degrees.get(r.a)! > 2 ? 15 : 2;
        t < len - (degrees.get(r.b)! > 2 ? 15 : 2);
        t += 12
      )
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
  }
  const roadSurfaces = buildRoadSurfaces(d);
  group.add(roadSurfaces);
  group.add(
    yaowaratRoad(
      d,
      (
        roadSurfaces.getObjectByName("RoadSurface:asphalt") as T.Mesh<
          T.BufferGeometry,
          T.MeshStandardMaterial
        >
      ).material,
    ),
  );
  const waterStyle = riverWater();
  const waterSurface = new T.Mesh(
    channelGeometry("water",d),
    waterStyle.material,
  );
  waterSurface.name = "BangkokChannels";
  group.add(waterSurface);
  const designs = designBuildings(d);
  const finishes = facadeFinishes();
  const facadeMaterial = new T.MeshStandardMaterial({
    map: finishes.albedo,
    roughnessMap: finishes.pbr,
    metalnessMap: finishes.pbr,
    normalMap: finishes.normal,
    normalScale: new T.Vector2(0.42, 0.42),
    vertexColors: true,
    roughness: 1,
    metalness: 1,
  });
  installFacadeFinish(facadeMaterial);
  const grounding = cityShadows(d);
  for (const chunk of [...grounding.root.children]) group.add(chunk);
  nightMaterial.vertexColors = true;
  nightMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "varying float windowLight;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      windowLight=1.;
      #ifdef USE_INSTANCING
      float seed=fract(sin(dot(instanceMatrix[3].xyz,vec3(12.9898,78.233,39.43)))*43758.5453);
      windowLight=seed<.16?.05:mix(.48,1.25,seed);
      #endif`,
      );
    shader.fragmentShader =
      "varying float windowLight;\n" +
      shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
      totalEmissiveRadiance*=windowLight;
      #if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
      totalEmissiveRadiance*=vColor.rgb;
      #endif`,
      );
  };
  nightMaterial.customProgramCacheKey = () => "bangkok-occupied-windows-v2";
  const architecture = new ArchitecturalBatch(facadeMaterial, nightMaterial);
  const shopNight = { value: 0 };
  const benchmarkFacade = facadeMaterial.clone();
  installFacadeFinish(benchmarkFacade);
  installShopLight(benchmarkFacade, shopNight);
  const benchmarkNight = nightMaterial.clone();
  benchmarkNight.onBeforeCompile = nightMaterial.onBeforeCompile;
  benchmarkNight.customProgramCacheKey = nightMaterial.customProgramCacheKey;
  benchmarkNight.userData.cinematic = true;
  benchmarkNight.emissiveIntensity = 0.25;
  const benchmarkArchitecture = new ArchitecturalBatch(
    benchmarkFacade,
    benchmarkNight,
  );
  const scala = scalaParcel(d),
    ordinary = designs.filter((p) => p.parcel !== scala);
  emitDistrictArchitecture(ordinary, (piece: ArtPiece) =>
    (piece.siteId === "yaowarat" ? benchmarkArchitecture : architecture).add(
      piece,
    ),
  );
  emitScala(scala, (piece) => architecture.add(piece));
  emitStreetFrontages(d, ordinary, p=>architecture.add(p));
  emitConvenienceStores(d,p=>architecture.add(p));
  emitUrbanCompletenessGrounds(d,p=>architecture.add(p));
  emitBlockCourts(d,p=>architecture.add(p));
  emitStreetGardens(d, p=>architecture.add(p));
  emitUrbanLayers(d, ordinary, (piece) => architecture.add(piece));
  emitEnvironment(d, (piece) => architecture.add(piece));
  emitCables(d, (piece) => architecture.add(piece));
  emitDistrictSigns(ordinary, (piece) => architecture.add(piece));
  emitYaowaratLanterns(d, (piece) => benchmarkArchitecture.add(piece));
  emitRiverfront(d, (piece) => architecture.add(piece));
  emitLandscape(d, (piece) => architecture.add(piece));
  emitTropicalVegetation(d, (piece) => architecture.add(piece));
  emitMrtEntrances(d, (piece) => architecture.add(piece));
  emitAuthoredGrounds(d,piece=>architecture.add(piece));
  emitHuaGrounds(d,piece=>architecture.add(piece));
  emitLandmarkApproaches(d,piece=>architecture.add(piece));
  emitLandmarkContextGrounds(d,piece=>architecture.add(piece));
  emitBridges(d, (piece) => architecture.add(piece));
  emitDestinationGrounds(d, (piece) => architecture.add(piece));
  emitRailInfrastructure(d, (piece) => architecture.add(piece));
  for (const l of d.landmarks.filter((l) => l.kind === "mall")) {
    const site = l.plot!,
      size = l.size!;
    const plaza =
      riverClearance(d, site) > ((size + 24) * Math.SQRT2) / 2 + 3
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
      surface: "concrete",
    });
  }
  for (const o of d.obstacles.filter(
    (o) => o.artRole === "furniture" && !o.environmentId,
  )) {
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
  const benchmarkChunks = new Map<string, T.Group>();
  for (const chunk of benchmarkArchitecture.finish()) {
    const center = chunk.userData.center as T.Vector3;
    const key = `${chunk.name}:${center.x}:${center.z}`;
    const existing = benchmarkChunks.get(key);
    if (existing) existing.add(...[...chunk.children]);
    else benchmarkChunks.set(key, chunk);
  }
  benchmarkChunks.forEach((chunk) => {
    chunk.userData.cinematic = true;
    group.add(chunk);
  });
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
  const publicSigns=buildPublicSpaceSigns(d);
  for(const child of [...publicSigns.children])group.add(child);
  const storeSigns=buildConvenienceStoreSigns(d);
  for(const child of [...storeSigns.children])group.add(child);
  const realSigns = buildRealPlaceSigns(d);
  group.add(realSigns);
  const scalaSigns = buildScalaSigns(scala);
  group.add(scalaSigns);
  const motion = riverMotion(d),
    effects = environmentEffects(d, ordinary),
    trains = buildRailTrains(d, railService),
    transitSigns = buildTransitSigns(d);
  group.add(motion.root, effects.root, trains.root, transitSigns);
  group.userData.railService = trains.service;
  let lightLevel = 0,
    horizontalGreen = true,
    animationTime = 0;
  const heroes = d.landmarks.map((l) => {
    const root = publicSpaceLandmark(d,l) ?? victoryMonument(l) ?? historicDistrictLandmark(l) ?? blockout(l, finishes);
    root.position.set(l.plot?.x ?? l.x, 0, l.plot?.z ?? l.z);
    root.rotation.y = l.yaw ?? 0;
    if(l.id === "palace") root.scale.set(HISTORIC_PLAN.palaceScale,1,HISTORIC_PLAN.palaceScale);
    root.name = `BangkokLandmark:${l.id}`;
    group.add(root);
    return root;
  });
  // River sections span several cells. A cell-center test can hide their near
  // bank while the player is still looking at it; cull the full geometry bounds.
  group.updateMatrixWorld(true);
  const parkBounds = new Map(heroes.filter(h=>h.userData.publicSpace).map(h=>[h,new T.Box3().setFromObject(h)]));
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
  const finishMaterials = new Set<T.MeshStandardMaterial>();
  group.traverse((o) => {
    if (o instanceof T.Mesh)
      for (const m of [o.material].flat())
        if (m instanceof T.MeshStandardMaterial && m.map === finishes.albedo)
          finishMaterials.add(m);
  });
  let inspectionId: string | undefined;
  let lastX = Infinity,
    lastZ = Infinity,
    lastQuality = "",
    lastNight = -1;
  return {
    group,
    animate(time: number, quality: string, green: boolean) {
      horizontalGreen = green;
      animationTime = time;
      motion.update(time, quality);
      waterStyle.time.value = time;
    },
    setNight(night: number) {
      waterStyle.night.value = night;
      lightLevel = night;
      shopNight.value = 0.12 + night * 0.88;
      grounding.setNight(night);
      if (Math.abs(night - lastNight) < 0.015) return;
      lastNight = night;
      for (const m of transitSigns.userData.materials ?? [])
        m.emissiveIntensity = 0.2 + night * 0.7;
      for (const mat of new Set(glowing))
        mat.emissiveIntensity = mat.userData.cinematic
          ? 0.25 + Math.max(0, night) * 1.5
          : Math.max(0, night) * 1.55;
      for (const hero of heroes) {
        for (const m of hero.userData.nightMaterials ?? [])
          m.emissiveIntensity = night * (hero.userData.nightScale ?? 0.75);
        const mat = hero.userData.nightMaterial as
          T.MeshStandardMaterial | undefined;
        if (mat) {
          mat.emissiveIntensity = night * 1.5;
          mat.opacity = night * 0.58;
          mat.visible = night > 0.02;
        }
      }
      const scalaMat = scalaSigns.userData.nightMaterial as
        T.MeshStandardMaterial | undefined;
      for(const m of realSigns.userData.materials??[])m.emissiveIntensity=.1+night*.45;
      if (scalaMat) scalaMat.emissiveIntensity = 0.12 + night * 0.85;
      for (const mat of new Set(signMaterials))
        mat.emissiveIntensity = 0.12 + Math.max(0, night) * 1.15;
    },
    update(camera, quality) {
      trains.update(animationTime, camera, quality, lightLevel);
      effects.update(
        camera,
        quality,
        lightLevel,
        horizontalGreen,
        animationTime,
      );
      if (
        Math.hypot(camera.x - lastX, camera.z - lastZ) < 16 &&
        quality === lastQuality
      )
        return;
      if (quality !== lastQuality)
        for (const mat of finishMaterials) {
          const fast = quality === "low",
            normal = fast ? null : finishes.normal,
            pbr = fast ? null : finishes.pbr;
          if (mat.normalMap !== normal || mat.roughnessMap !== pbr) {
            mat.normalMap = normal;
            mat.roughnessMap = mat.metalnessMap = pbr;
            mat.roughness = fast ? 0.86 : 1;
            mat.metalness = fast ? 0.04 : 1;
            mat.needsUpdate = true;
          }
        }
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
      for (const hero of heroes){
        const bounds=parkBounds.get(hero);
        hero.visible=bounds?Math.hypot(Math.max(bounds.min.x-camera.x,0,camera.x-bounds.max.x),Math.max(bounds.min.z-camera.z,0,camera.z-bounds.max.z))<radius:Math.hypot(hero.position.x-camera.x,hero.position.z-camera.z)<radius+180;
      }
    },
    setInspection(id?: string) {
      if (id === inspectionId) return;
      inspectionId = id;
      for (const hero of heroes) {
        if (hero instanceof T.LOD) {
          hero.autoUpdate = hero.name !== `BangkokLandmark:${id}`;
          if (!hero.autoUpdate) {
            hero.levels.forEach((l, i) => (l.object.visible = i === 0));
          }
        }
      }
    },
    dispose() {
      disposeObject(group, Object.values(finishes));
    },
  };
}
function blockout(l: Landmark, finishes?: ReturnType<typeof facadeFinishes>) {
  const real = buildRealArchitecture(l) ?? realCommercial(l);
  if (real) return real;
  const authored = sculptedLandmark(l);
  if (authored) return authored;
  if (l.kind === "park") return new T.Group();
  if (l.kind === "mall") return buildCommercialLandmark(l, finishes);
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
export { shiftLighting } from "./lighting";
