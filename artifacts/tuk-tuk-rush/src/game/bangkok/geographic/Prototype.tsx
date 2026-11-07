import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as T from "three";
import { Inspection } from "../../Inspection";
import type { Vec3 } from "../../inspection";
import { Controls } from "../../Controls";
import { ChaseCamera } from "../../chaseCamera";
import { loadArt, disposeObject, type ArtBundle } from "../../assets";
import { buildTuk } from "../../tukMesh";
import { guidanceFor } from "../../navigation";
import type { GameSnapshot, RoadNode } from "../../types";
import { GeographicStream } from "./streaming";
import {
  buildGeographicChunk,
  geographicMaterials,
  disposeGeographicChunk,
} from "./rendering";
import { riverWater } from "../riverfront";
import { type GeographicChunkData } from "./dataset";
import { GeographicChunkLoader } from "./chunkLoader";
import { loadGameplayGeography, type GeographicNetwork } from "./network";
import { createGameplayDistrict, type GeographicPlace } from "./places";
import { buildMigratedArt, disposeMigratedArt, releaseMigratedArtGPU } from "./migratedArt";
import { geographicToMeters, metersToGeographic } from "./projection";
import {
  buildingObstacles,
  updateBuildingLOD,
  buildingFogFar,
} from "./buildings";
import { sfx } from "../../audio";
import { readPreferences, usePreferences } from "../../ui/preferences";
import { GeographicSession } from "./session";
import { GeographicFrameProfiler, type GeographicPerfSample } from "./performance";
import { GeographicPerformanceOverlay } from "./PerformanceOverlay";
import { TrafficActors } from "./TrafficActors";
import { setStreamedPhysicsObstacles } from "../clearanceIndex";
import "./prototype.css";
import {updateChinatownLife} from "./chinatownLife";
import {chinatownMaterials,updateChinatownLOD} from "./chinatownRendering";

type Loaded = {
  network: GeographicNetwork;
  session: GeographicSession;
  art: ArtBundle;
  places: GeographicPlace[];
  loadMs: number;
  landmarkArt: Map<string, ReturnType<typeof buildMigratedArt>[]>;
};
function Scene({
  loaded, target, perfEnabled, onPerfSample, trafficEnabled, onError, onReady, time,
}: {
  time: 'day'|'dusk'|'night';
  onError: (message: string) => void;
  onReady: () => void;
  loaded: Loaded;
  target?: RoadNode;
  perfEnabled: boolean;
  trafficEnabled: boolean;
  onPerfSample: (sample: GeographicPerfSample) => void;
}) {
  const { network, session, art, places } = loaded,
    { camera, gl } = useThree(),
    chase = useRef(new ChaseCamera()),
    targetRef = useRef(target),
    inspectionPose = useRef({
      position: [0, 0, 0] as Vec3,
      target: [0, 0, 0] as Vec3,
    });
  const qaView = useRef<{ position: number[]; target: number[] } | undefined>(
    undefined,
  );
  targetRef.current = target;
  const atmosphere = time==='day'?{sky:'#c3dce6',sun:'#fff1d1',ambient:2.3,direct:2.2,night:0}:time==='dusk'?{sky:'#515a80',sun:'#ffbe83',ambient:1.65,direct:1.35,night:.7}:{sky:'#101d35',sun:'#b6cbe9',ambient:1.25,direct:.55,night:1};
  const profiler = useMemo(() => new GeographicFrameProfiler(), []);
  const perfAt = useRef(0);
  const qaSnapshotAt = useRef(0);
  const content = useMemo(() => {
    const group = new T.Group(),
      water = riverWater(),
      materials = geographicMaterials(network.metadata),
      decorationMaterials = chinatownMaterials(),
      resident = new Map<string, GeographicChunkData>(),
      colliders = new Map<string, ReturnType<typeof buildingObstacles>>(),
      assets = new Map<string, ReturnType<typeof buildMigratedArt>[]>();
    const loader = new GeographicChunkLoader();
    let revision = 0;
    const activationMs: number[] = [];
    let readyNotified = false;
    const stream = new GeographicStream<{
      chunk: GeographicChunkData;
      root?: T.Group;
      id?: string;
    }>(
      network.metadata.chunks,
      async (ref, signal) => ({
        chunk: await loader.load(ref, signal),
      }),
      (v, ref) => {
        const started = performance.now();
        v.id = ref.id;
        v.root = buildGeographicChunk(v.chunk, materials, water.material, decorationMaterials);
        group.add(v.root);
        resident.set(ref.id, v.chunk);
        colliders.set(
          ref.id,
          [...(v.chunk.preparedColliders ?? buildingObstacles(v.chunk.buildings ?? [], v.chunk.origin)), ...(v.chunk.decoration?.props ?? [])],
        );
        // Four fixed migrated landmarks are prepared once before the first drive.
        // Eviction releases GPU resources but retains their bounded CPU art for revisit.
        const local = loaded.landmarkArt.get(ref.id) ?? [];
        assets.set(ref.id, local);
        for (const a of local) group.add(a.root);
        activationMs.push(performance.now() - started);
        if (activationMs.length > 25) activationMs.shift();
        revision++;
      },
      (v) => {
        if (v.root) disposeGeographicChunk(v.root);
        if (v.id) {
          resident.delete(v.id);
          colliders.delete(v.id);
          for (const a of assets.get(v.id) ?? []) {
            releaseMigratedArtGPU(a.root);
          }
          assets.delete(v.id);
          revision++;
        }
      },
      error => { session.pause(); onError(String(error)); },
    );
    const ring = new T.Mesh(
      new T.TorusGeometry(5, 0.16, 6, 48),
      new T.MeshBasicMaterial({ color: "#ffd14d" }),
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    const route = new T.Line(
      new T.BufferGeometry(),
      new T.LineBasicMaterial({ color: "#ffe16a", depthTest: false }),
    );
    route.renderOrder = 10;
    group.add(route);
    return {
      group,
      loader,
      activationMs,
      decorationMaterials,
      water,
      materials,
      resident,
      colliders,
      assets,
      stream,
      ring,
      route,
      notifyReady() { if (!readyNotified) { readyNotified = true; onReady(); } },
      get revision() {
        return revision;
      },
      lastRevision: -1,
      lastActivationCount: 0,
      routeTime: 0,
      lodTime: 0,
      metrics: {} as Record<string, unknown>,
      look: new T.Vector3(),
      forward: new T.Vector3(),
    };
  }, [network, places]);
  useEffect(()=>{content.decorationMaterials.setNight(atmosphere.night);gl.toneMapping=T.ACESFilmicToneMapping;gl.toneMappingExposure=time==='night'?1.12:1;content.materials.buildings.color.set(time==='night'?'#a0a6b4':time==='dusk'?'#d7c4b1':'#ffffff');},[content,gl,time]);
  const tuk = useMemo(() => buildTuk(art.hero, art.textures), [art]);
  useEffect(
    () => () => {
      content.stream.close();
      content.loader.close();
      content.decorationMaterials.dispose();
      content.ring.geometry.dispose();
      (content.ring.material as T.Material).dispose();
      content.route.geometry.dispose();
      (content.route.material as T.Material).dispose();
      for (const m of [
        content.materials.buildings,
        content.materials.land,
        content.materials.roads,
        content.materials.deck,
        content.materials.support,
        ...content.materials.lines.values(),
        content.water.material,
      ])
        m.dispose();
      disposeObject(tuk.root);
    },
    [content, tuk],
  );
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault(); session.pause();
      onError('The 3D graphics connection was lost. Your career is saved. Retry Bangkok to restore the scene.');
    };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, session, onError]);
  useFrame((state, delta) => {
    const now = performance.now();
    session.update(delta);
    const p = session.player,
      s = session.model.snapshot;
    tuk.root.position.set(p.x, session.height + 0.18, p.z);
    tuk.root.rotation.y = p.heading;
    tuk.lean.rotation.z = p.lean;
    tuk.steerPivot.rotation.y = p.steer * 0.45;
    tuk.bars.rotation.y = p.steer * 0.45;
    for (const spin of tuk.spins) spin.rotation.x = p.wheelSpin;
    content.water.time.value = state.clock.elapsedTime;
    chase.current.update(
      session.district,
      p,
      delta,
      session.cameraRevision,
      false,
      session.boost.state === "active",
    );
    camera.position.copy(chase.current.pos);
    camera.position.y += session.height;
    content.look.copy(chase.current.look);
    content.look.y += session.height;
    camera.lookAt(content.look);
    const perspective = camera as T.PerspectiveCamera;
    perspective.fov = chase.current.fov;
    perspective.updateProjectionMatrix();
    if (
      s.viewingLandmark &&
      session.inspection.update(delta, inspectionPose.current)
    ) {
      camera.position.fromArray(inspectionPose.current.position);
      content.look.fromArray(inspectionPose.current.target);
      camera.lookAt(content.look);
    }
    if (import.meta.env.DEV && qaView.current) {
      camera.position.fromArray(qaView.current.position);
      camera.lookAt(new T.Vector3().fromArray(qaView.current.target));
    }
    const streamStarted = performance.now();
    content.stream.update(p, { x: camera.position.x, z: camera.position.z });
    if (content.stream.active.has(`${Math.floor(p.x / 1024) * 1024}:${Math.floor(p.z / 1024) * 1024}`)) content.notifyReady();
    const fog = state.scene.fog as T.Fog;
    fog.far = buildingFogFar(s.quality);
    fog.near = s.quality === "low" ? 260 : 320;
    content.lodTime += delta;
    if (content.lodTime > 0.2) {
      content.lodTime = 0;
      camera.getWorldDirection(content.forward);
      for (const v of content.stream.active.values())
        if (v.root)
          {updateChinatownLOD(v.root,camera.position,s.quality,p);updateBuildingLOD(
            v.root,
            camera.position,
            s.quality,
            content.forward,
          );}
    }
    for(const v of content.stream.active.values())if(v.root?.userData.chinatownRoot)
      updateChinatownLife(v.root.userData.chinatownRoot,state.clock.elapsedTime,s.quality,camera.position,p,s.phase==='playing');
    if (content.lastRevision !== content.revision) {
      content.lastRevision = content.revision;
      setStreamedPhysicsObstacles(session.district, [...content.resident.values()]
        .map<import("../../types").Obstacle[]>((c) =>
          (c.supports ?? []).map((v) => ({
            x: v.point[0],
            z: v.point[1],
            w: 1.4,
            d: 1.4,
            height: v.height - 1,
            color: "#aaa",
          })),
        )
        .concat([...content.colliders.values()])
        .concat(
          [...content.assets.values()].map((a) => a.map((v) => v.obstacle)),
        ));
      session.district.buildings = session.district.obstacles;
      content.metrics = {
        chinatown: {facades:[...content.resident.values()].flatMap(c=>c.decoration?.facades??[]),bytes:[...content.resident.values()].reduce((n,c)=>n+(c.decoration?.bytes??0),0)},
        buildings: [...content.resident.values()].reduce(
          (n, c) => n + (c.buildings?.length ?? 0),
          0,
        ),
        buildingGPUBytes: (() => {
          let bytes = 0;
          content.group.traverse((o) => {
            if (o.name === "SourceBuildings") bytes += o.userData.gpuBytes ?? 0;
          });
          return bytes;
        })(),
        activeMeshes: (() => {
          let n = 0;
          content.group.traverse((o) => {
            if (o instanceof T.Mesh) n++;
          });
          return n;
        })(),
        chunkTiming: [...content.resident].map(([id, c]) => ({
          id,
          ...c.timing,
        })),
        activeAssetBytes: [...content.resident.values()].reduce((n, c) => n + (c.timing?.compressedBytes ?? 0), 0),
        sourceAssetBytes: network.metadata.chunks.filter(c => content.resident.has(c.id)).reduce((n, c) => n + c.bytes, 0),
        buildingBuildMs: [...content.stream.active.values()].map(
          (v) => v.root?.userData.buildingBuildMs ?? 0,
        ),
      };
    }
    if (content.lastActivationCount !== content.stream.stats.loaded) {
      content.lastActivationCount = content.stream.stats.loaded;
      content.activationMs[content.activationMs.length - 1] = performance.now() - streamStarted;
    }
    const dest = targetRef.current ?? s.target;
    content.ring.visible = s.phase === "playing";
    content.ring.position.set(
      dest.x,
      0.3 + (network.y[Number(dest.id.slice(4))] ?? 0),
      dest.z,
    );
    content.routeTime += delta;
    if (content.routeTime > 0.2) {
      content.routeTime = 0;
      const path = network.path(p, dest),
        positions: number[] = [];
      // The global path exists regardless of visual residency. Draw only nearby guidance.
      for (const q of path) {
        if (Math.hypot(q.x - p.x, q.z - p.z) > 600) break;
        const id = (q as RoadNode).id;
        positions.push(
          q.x,
          0.25 +
            (id?.startsWith("geo:")
              ? (network.y[Number(id.slice(4))] ?? 0)
              : session.height),
          q.z,
        );
      }
      // Avoid disposing/recreating a WebGL geometry every 200ms while driving.
      // A reusable growing buffer removes this steady stream of GPU/GC churn.
      const geometry = content.route.geometry;
      let attribute = geometry.getAttribute("position") as T.BufferAttribute | undefined;
      if (!attribute || attribute.array.length < positions.length) {
        const capacity = Math.max(96, positions.length, (attribute?.array.length ?? 0) * 2);
        attribute = new T.BufferAttribute(new Float32Array(capacity), 3);
        attribute.setUsage(T.DynamicDrawUsage);
        geometry.setAttribute("position", attribute);
      }
      (attribute.array as Float32Array).set(positions);
      attribute.needsUpdate = true;
      geometry.setDrawRange(0, positions.length / 3);
      // Three's bounding sphere reads the complete allocated buffer; disable
      // frustum culling for this single short near-player guide line instead
      // of letting unused capacity create a misleading bound.
      content.route.frustumCulled = false;
    }
    // Debug snapshots used to traverse the entire scene and allocate dozens of
    // arrays *every frame*. Throttle them instead of charging every player frame.
    // Production is monitored by the opt-in local overlay below, not a QA global.
    if (import.meta.env.DEV && (qaSnapshotAt.current === 0 || now - qaSnapshotAt.current >= 250)) {
      qaSnapshotAt.current = now;
      (window as any).__geography = {
      timeOfDay: time,
      position: { x: p.x, z: p.z, heading: p.heading },
      coordinate: metersToGeographic(p),
      height: session.height,
      speed: p.speed,
      loadMs: loaded.loadMs,
      decodedNavigationBytes: network.allocatedBytes,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      ...content.metrics,
      activationMs: content.activationMs.slice(-25),
      quality: s.quality,
      stream: {
        ...content.stream.stats,
        active: content.stream.active.size,
        ids: [...content.stream.active.keys()],
        settled: content.stream.settled,
        total: network.metadata.chunks.length,
      },
      snapshot: { ...s },
      landmarks: [...content.assets.keys()],
    };
    if (import.meta.env.DEV && location.search.includes("geographyQA"))
      (window as any).__geographyQA = {
        project: geographicToMeters,
        inspectBuilding: (id: string) => {
          for (const c of content.resident.values()) {
            const building = c.buildings?.find((b) => b.id === id);
            if (building) return { origin: c.origin, ...building };
          }
          return undefined;
        },
        view: (position: number[], target: number[]) => {
          qaView.current = { position, target };
        },
        session,
        network,
        places,
        move: (lon: number, lat: number, heading?: number) => {
          const q = geographicToMeters({ lon, lat });
          Object.assign(p, q, { speed: 0, heading: heading ?? p.heading });
          session.district.driving?.reset(p);
          session.recover();
          session.clearInput();
        },
      };
    }
    if (perfEnabled) {
      profiler.record(now, !document.hidden);
      if (now - perfAt.current >= 750) {
        perfAt.current = now;
        const stats = profiler.snapshot();
        onPerfSample({
          ...stats,
          drawCalls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
          geometries: gl.info.memory.geometries,
          activeChunks: content.stream.active.size,
          pendingChunks: content.stream.pendingCount,
          queuedChunks: content.stream.queuedCount,
          readyChunks: content.stream.readyCount,
          residentBuildings: Number(content.metrics.buildings ?? 0),
          maxChunkActivationMs: Math.max(0, ...content.activationMs),
          quality: s.quality,
          streamErrors: content.stream.stats.errors,
          decorativeBufferBytes: [...content.resident.values()].reduce((n,c)=>n+(c.decoration?.bytes??0),0),
          decorativeFacades: [...content.resident.values()].reduce((n,c)=>n+(c.decoration?.facades.length??0),0),
        });
      }
    } else if (perfAt.current !== 0) {
      profiler.reset();
      perfAt.current = 0;
    }
  });
  return (
    <>
      <color attach="background" args={[atmosphere.sky]} />
      <fog attach="fog" args={[atmosphere.sky, 320, 1350]} />
      <hemisphereLight args={[atmosphere.sun, time==='night'?'#24334a':'#697667', atmosphere.ambient]} />
      <directionalLight position={[40, 100, 60]} color={atmosphere.sun} intensity={atmosphere.direct} />
      <primitive object={content.group} />
      <primitive object={tuk.root} />
      <TrafficActors network={network} session={session} enabled={trafficEnabled} />
    </>
  );
}
function PreviewHud({
  loaded,
  ready,
  time,
  onTime,
  onTarget,
  perfEnabled,
  onPerfToggle,
  trafficEnabled,
  onTrafficToggle,
}: {
  loaded: Loaded;
  ready: boolean;
  time: 'day'|'dusk'|'night';
  onTime: (value:'day'|'dusk'|'night')=>void;
  onTarget: (n?: RoadNode) => void;
  perfEnabled: boolean;
  onPerfToggle: () => void;
  trafficEnabled: boolean;
  onTrafficToggle: () => void;
}) {
  const { session, network } = loaded,
    [snapshot, setSnapshot] = useState(session.model.snapshot),
    [chosen, setChosen] = useState(""),
    [map, setMap] = useState(false),
    [mapCity, setMapCity] = useState(false),
    [settings, setSettings] = useState(false),
    [guide, setGuide] = useState<{
      name: string;
      distance: number | null;
      road: string;
      thai?: string;
    }>({ name: "", distance: null, road: "" });
  const [prefs, updatePreferences] = usePreferences();
  const resumeAfterMap = useRef(false);
  const toggleMap = () => {
    if (map) {
      setMap(false);
      if (resumeAfterMap.current && !document.hidden && window.matchMedia('(orientation: landscape)').matches) session.resume();
    } else {
      resumeAfterMap.current = session.model.snapshot.phase === 'playing';
      session.pause(); session.clearInput(); setMap(true);
    }
  };
  const start = (mode: 'shift' | 'free') => {
    sfx.unlock(); setChosen(''); setMap(false); setSettings(false); session.start(mode);
    if (window.matchMedia('(orientation: portrait)').matches) session.pause();
  };
  useEffect(() => { sfx.enabled = prefs.audio; }, [prefs.audio]);
  useEffect(() => {
    const timer = setInterval(() => {
      const s = session.model.snapshot;
      sfx.update(s.speed / 3.6, session.model.input.gas, s.phase === 'playing', s.boostState === 'active');
    }, 100);
    const orientation = window.matchMedia('(orientation: portrait)');
    const changed = () => { if (orientation.matches) { session.clearInput(); session.pause(); } };
    orientation.addEventListener('change', changed);
    return () => { clearInterval(timer); orientation.removeEventListener('change', changed); sfx.update(0, false, false); };
  }, [session]);
  useEffect(() => {
    // A keyboard resume cannot run the simulation behind an open route map/settings.
    if ((map || settings) && snapshot.phase === 'playing') session.pause();
  }, [map, settings, snapshot.phase, session]);
  const mapRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => session.subscribe((s) => setSnapshot(s)), [session]);
  useEffect(() => {
    const target = network.stops.find((n) => n.id === chosen);
    onTarget(target);
  }, [chosen, network, onTarget]);
  useEffect(() => {
    let background: HTMLCanvasElement | undefined;
    const update = () => {
      const target =
          network.stops.find((n) => n.id === chosen) ??
          session.model.snapshot.target,
        g = guidanceFor(
          session.district,
          session.player,
          session.player.heading,
          target,
        ),
        road = network.nearest(session.player);
      setGuide({
        name: target.name ?? "",
        distance: g.distance,
        road: road.name,
        thai: road.thai,
      });
      const canvas = mapRef.current;
      if (!canvas) return;
      // Default to the connected fare route, not a 30km city squeezed into a phone.
      // The paused map keeps this background stable until target/view changes.
      let minX = session.player.x, maxX = minX, minZ = session.player.z, maxZ = minZ;
      for (const point of [...g.path, target]) {
        minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
        minZ = Math.min(minZ, point.z); maxZ = Math.max(maxZ, point.z);
      }
      const extent = Math.max(1200, maxX - minX, maxZ - minZ) * 1.2;
      const centerX = (minX + maxX) / 2, centerZ = (minZ + maxZ) / 2;
      const ctx = canvas.getContext("2d")!,
        b = mapCity ? network.metadata.bounds : {
          minX: centerX - extent / 2, maxX: centerX + extent / 2,
          minZ: centerZ - extent / 2, maxZ: centerZ + extent / 2,
        },
        w = canvas.width,
        h = canvas.height,
        scale = Math.min(w / (b.maxX - b.minX), h / (b.maxZ - b.minZ)),
        xy = (p: { x: number; z: number }) => [
          (p.x - b.minX) * scale,
          (p.z - b.minZ) * scale,
        ];
      if (!background) {
        background = document.createElement("canvas");
        background.width = w;
        background.height = h;
        const base = background.getContext("2d")!;
        base.fillStyle = "#152d3b";
        base.fillRect(0, 0, w, h);
        base.strokeStyle = "#71878d";
        base.lineWidth = 0.5;
        base.beginPath();
        for (let i = 0; i < network.a.length; i++) {
          const a = network.a[i]!,
            bb = network.b[i]!,
            p = xy({ x: network.x[a]!, z: network.z[a]! }),
            q = xy({ x: network.x[bb]!, z: network.z[bb]! });
          base.moveTo(p[0]!, p[1]!);
          base.lineTo(q[0]!, q[1]!);
        }
        base.stroke();
      }
      ctx.drawImage(background, 0, 0);
      ctx.strokeStyle = "#ffe16a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      g.path.forEach((p, i) => {
        const q = xy(p);
        if (i) ctx.lineTo(q[0]!, q[1]!);
        else ctx.moveTo(q[0]!, q[1]!);
      });
      ctx.stroke();
      for (const stop of network.stops) {
        const q = xy(stop);
        ctx.fillStyle = stop.id === target.id ? "#ffcd57" : "white";
        ctx.beginPath();
        ctx.arc(q[0]!, q[1]!, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      const p = xy(session.player);
      ctx.fillStyle = "#ff4e75";
      ctx.beginPath();
      ctx.arc(p[0]!, p[1]!, 5, 0, Math.PI * 2);
      ctx.fill();
    };
    update();
    const timer = setInterval(update, map ? 500 : 250);
    return () => clearInterval(timer);
  }, [session, network, chosen, map, mapCity]);
  return (
    <>
      <nav className="geo-toolbar" aria-label="Real-scale Bangkok controls">
        <b>REAL-SCALE BANGKOK</b>
        {(snapshot.phase === 'playing' || snapshot.phase === 'paused') && <>
          <button onClick={() => snapshot.phase === 'playing' ? session.pause() : session.resume()} disabled={map || settings}>
            {snapshot.phase === 'playing' ? 'Pause' : 'Resume'}
          </button>
          <button onClick={toggleMap}>Route map</button>
        </>}
        <button onClick={() => { session.pause(); setSettings(true); }}>Settings</button>
      </nav>
      {(snapshot.phase === 'playing' || snapshot.phase === 'paused') && !map && !settings && <>
        <section className="geo-street-banner" aria-label="Current street">
          <b>{guide.road}</b><small lang="th">{guide.thai}</small>
        </section>
        <section className="geo-status" aria-label="Passenger and navigation">
          <strong>{snapshot.stage === 'pickup' ? 'PICK UP' : 'DELIVER'} · {snapshot.passenger}</strong>
          <div>{guide.name}</div>
          <b>{guide.distance === null ? 'No connected route — choose another destination on Route map' : `${Math.round(guide.distance).toLocaleString()} m via roads`}</b>
          <div>฿{snapshot.earnings} earned · {snapshot.deliveries} trips · Wallet ฿{snapshot.wallet ?? session.career.profile.wallet}</div>
          <div className="geo-message">{snapshot.message || 'Stop in the gold ring to board or deliver.'}{snapshot.boarding > 0 ? ` ${Math.round(snapshot.boarding * 100)}%` : ''}</div>
          {chosen && <small>GPS override · passenger fare remains active</small>}
        </section>
        <div className="geo-speed"><b>{Math.round(snapshot.speed)}</b><small>km/h{snapshot.mode === 'shift' ? ` · ${Math.ceil(snapshot.shiftTime / 60)} min` : ''}</small></div>
      </>}
      {map && <aside className="geo-map" data-testid="geographic-map" role="dialog" aria-modal="true" aria-label="Bangkok route map">
        <header><b>Bangkok route map</b><button onClick={toggleMap} aria-label="Close route map">Close</button></header>
        <label>GPS destination
          <select aria-label="Geographic destination" value={chosen} onChange={e => setChosen(e.target.value)}>
            <option value="">Follow passenger fare</option>
            {network.stops.map(n => <option key={n.id} value={n.id}>{n.name?.split(' · ')[0]}</option>)}
          </select>
          Map view
          <select aria-label="Map view" value={mapCity ? 'city' : 'route'} onChange={e => setMapCity(e.target.value === 'city')}>
            <option value="route">Nearby route</option><option value="city">City overview</option>
          </select>
        </label>
        <canvas ref={mapRef} width={800} height={800} aria-label="Real Bangkok destination route map" />
        <small>Gold: road route · Pink: your tuk-tuk · © OpenStreetMap contributors · ODbL</small>
      </aside>}
      {settings && <section className="geo-menu geo-settings" role="dialog" aria-modal="true" aria-label="Driving settings">
        <h2>Driving settings</h2>
        <label>Bangkok light <select aria-label="Time of day" value={time} onChange={e=>onTime(e.target.value as 'day'|'dusk'|'night')}><option value="day">Daylight</option><option value="dusk">Golden dusk</option><option value="night">Chinatown night</option></select></label>
        <label>Graphics quality <select aria-label="Graphics quality" value={snapshot.quality} onChange={e => {
          const quality = e.target.value as 'low' | 'medium'; session.setQuality(quality); updatePreferences({ quality });
        }}><option value="low">Fast</option><option value="medium">Pretty</option></select></label>
        <button onClick={() => { sfx.unlock(); updatePreferences({ audio: !prefs.audio }); }}>Sound {prefs.audio ? 'ON' : 'OFF'}</button>
        <button data-testid="geographic-traffic-toggle" aria-pressed={trafficEnabled} onClick={onTrafficToggle}>Local traffic {trafficEnabled ? 'ON' : 'OFF'}</button>
        <button data-testid="geographic-performance-toggle" aria-pressed={perfEnabled} onClick={onPerfToggle}>Performance {perfEnabled ? 'ON' : 'OFF'}</button>
        <button onClick={() => setSettings(false)}>Close settings</button>
      </section>}
      {(snapshot.phase === 'title' || snapshot.phase === 'ended') && !settings && <section className="geo-menu">
        <small>ตุ๊กตุ๊ก รัช · TUK TUK RUSH</small>
        <h1>Real-Scale Bangkok</h1>
        <p>Your next fare awaits. Explore Bangkok’s mapped streets at your pace, or start a 24-minute shift.</p>
        {!ready && <p role="status">Preparing roads and building collisions…</p>}
        {snapshot.phase === 'ended' && <strong>Shift complete · ฿{snapshot.earnings} earned · {snapshot.deliveries} trips</strong>}
        <button data-testid="button-start-shift" disabled={!ready} onClick={() => start('shift')}>Start shift · 24 minutes</button>
        <button data-testid="button-free-roam" disabled={!ready} onClick={() => start('free')}>Free roam</button>
        <a href={location.pathname}>Main menu · Compact Bangkok</a>
      </section>}
      {snapshot.viewingLandmark && <Inspection engine={session} />}
      {snapshot.phase === "paused" && !snapshot.viewingLandmark && !map && !settings && (
        <section className="geo-menu">
          <h2>Drive paused</h2>
          <button onClick={() => session.resume()}>Resume drive</button>
          <button onClick={() => session.recover()}>Recover vehicle</button>
          <button onClick={() => { setChosen(''); session.returnToTitle(); }}>Real-Scale Bangkok menu</button>
        </section>
      )}
      {snapshot.phase === "playing" && !map && !settings && (
        <Controls engine={session} onHorn={() => { sfx.unlock(); sfx.horn(); }} />
      )}
      <small className="geo-credit">
        1 unit = 1 meter · © OpenStreetMap contributors · ODbL 1.0
      </small>
    </>
  );
}
export default function GeographicPrototype() {
  const [loaded, setLoaded] = useState<Loaded>(),
    [error, setError] = useState(""),
    [target, setTarget] = useState<RoadNode>(),
    [trafficEnabled, setTrafficEnabled] = useState(() => new URLSearchParams(location.search).get("geoTraffic") !== "0"),
    [perfEnabled, setPerfEnabled] = useState(() => new URLSearchParams(location.search).has("geoPerf")),
    [perfSample, setPerfSample] = useState<GeographicPerfSample>();
  const [time,setTime]=useState<'day'|'dusk'|'night'>(()=>{const value=new URLSearchParams(location.search).get('geoTime');return value==='night'||value==='day'?value:'dusk';});
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onPerfSample = useCallback((sample: GeographicPerfSample) => setPerfSample(sample), []);
  useEffect(() => {
    let cancelled = false,
      cleanup: (() => void) | undefined;
    const start = performance.now();
    Promise.all([
      loadGameplayGeography().catch((error) => {
        throw Error(`Bangkok road/map data failed to load: ${String(error)}`, { cause: error });
      }),
      loadArt().catch((error) => {
        throw Error(`Bangkok 3D artwork failed to load: ${String(error)}`, { cause: error });
      }),
    ]).then(async ([network, art]) => {
        if (cancelled) {
          art.dispose();
          return;
        }
        const { district, places } = createGameplayDistrict(network),
          session = new GeographicSession(district);
        session.setQuality(readPreferences().quality);
        const landmarkArt = new Map<string, ReturnType<typeof buildMigratedArt>[]>();
        cleanup = () => {
          session.dispose();
          for (const entries of landmarkArt.values()) for (const entry of entries) disposeMigratedArt(entry.root);
          art.dispose();
        };
        for (const place of places) {
          await new Promise<void>(resolve => setTimeout(resolve, 0));
          if (cancelled) { cleanup(); return; }
          const key = `${Math.floor(place.landmark.x / 1024) * 1024}:${Math.floor(place.landmark.z / 1024) * 1024}`;
          const entries = landmarkArt.get(key) ?? [];
          entries.push(buildMigratedArt(place));
          landmarkArt.set(key, entries);
        }
        setLoaded({
          landmarkArt,
          network,
          session,
          art,
          places,
          loadMs: performance.now() - start,
        });
      })
      .catch((e) => { cleanup?.(); if (!cancelled) setError(String(e)); });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
  if (error)
    return (
      <div className="geo-error" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => location.reload()}>Retry Bangkok map</button>
        <p>
          <a href={location.pathname}>Return to game</a>
        </p>
      </div>
    );
  if (!loaded)
    return <div className="geo-error">Loading real-scale Bangkok…</div>;
  return (
    <main className="tt-root geo-root" data-testid="geographic-prototype">
      <Canvas
        fallback={<div className="geo-error" role="alert">3D graphics unavailable. <button onClick={() => location.reload()}>Retry Bangkok</button><a href={location.pathname}>Main menu</a></div>}
        dpr={1}
        camera={{ near: 0.1, far: 1800 }}
        gl={{ antialias: true, preserveDrawingBuffer: import.meta.env.DEV }}
      >
        <Scene loaded={loaded} target={target} perfEnabled={perfEnabled}
          onPerfSample={onPerfSample} trafficEnabled={trafficEnabled}
          onError={setError} onReady={onReady} time={time} />
      </Canvas>
      <PreviewHud
        loaded={loaded}
        ready={ready}
        time={time} onTime={setTime}
        onTarget={setTarget}
        perfEnabled={perfEnabled}
        onPerfToggle={() => { setPerfSample(undefined); setPerfEnabled((value) => !value); }}
        trafficEnabled={trafficEnabled}
        onTrafficToggle={() => setTrafficEnabled((value) => !value)}
      />
      <div className="tt-rotate" data-testid="hint-rotate"><b>Turn your phone sideways</b><span>หมุนจอเป็นแนวนอน</span></div>
      {perfEnabled && (
        <GeographicPerformanceOverlay
          sample={perfSample}
          onClose={() => { setPerfEnabled(false); setPerfSample(undefined); }}
        />
      )}
    </main>
  );
}
