import { useEffect, useMemo, useRef, useState } from "react";
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
import { loadGeographicChunk, type GeographicChunkData } from "./dataset";
import { loadGameplayGeography, type GeographicNetwork } from "./network";
import { createGameplayDistrict, type GeographicPlace } from "./places";
import { buildMigratedArt } from "./migratedArt";
import { geographicToMeters, metersToGeographic } from "./projection";
import { GeographicSession } from "./session";
import "./prototype.css";

type Loaded = {
  network: GeographicNetwork;
  session: GeographicSession;
  art: ArtBundle;
  places: GeographicPlace[];
  loadMs: number;
};
function Scene({ loaded, target }: { loaded: Loaded; target?: RoadNode }) {
  const { network, session, art, places } = loaded,
    { camera, gl } = useThree(),
    chase = useRef(new ChaseCamera()),
    targetRef = useRef(target),
    inspectionPose = useRef({
      position: [0, 0, 0] as Vec3,
      target: [0, 0, 0] as Vec3,
    });
  targetRef.current = target;
  const content = useMemo(() => {
    const group = new T.Group(),
      water = riverWater(),
      materials = geographicMaterials(network.metadata),
      resident = new Map<string, GeographicChunkData>(),
      assets = new Map<string, ReturnType<typeof buildMigratedArt>[]>();
    let revision = 0;
    const stream = new GeographicStream<{
      chunk: GeographicChunkData;
      root?: T.Group;
      id?: string;
    }>(
      network.metadata.chunks,
      async (ref, signal) => ({
        chunk: await loadGeographicChunk(ref, signal),
      }),
      (v, ref) => {
        v.id = ref.id;
        v.root = buildGeographicChunk(v.chunk, materials, water.material);
        group.add(v.root);
        resident.set(ref.id, v.chunk);
        const local = places
          .filter(
            (p) =>
              Math.floor(p.landmark.x / 1024) * 1024 === ref.origin[0] &&
              Math.floor(p.landmark.z / 1024) * 1024 === ref.origin[1],
          )
          .map((p) => buildMigratedArt(p));
        assets.set(ref.id, local);
        for (const a of local) group.add(a.root);
        revision++;
      },
      (v) => {
        if (v.root) disposeGeographicChunk(v.root);
        if (v.id) {
          resident.delete(v.id);
          for (const a of assets.get(v.id) ?? []) disposeObject(a.root);
          assets.delete(v.id);
          revision++;
        }
      },
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
      water,
      materials,
      resident,
      assets,
      stream,
      ring,
      route,
      get revision() {
        return revision;
      },
      lastRevision: -1,
      routeTime: 0,
      look: new T.Vector3(),
    };
  }, [network, places]);
  const tuk = useMemo(() => buildTuk(art.hero, art.textures), [art]);
  useEffect(
    () => () => {
      content.stream.close();
      content.ring.geometry.dispose();
      (content.ring.material as T.Material).dispose();
      content.route.geometry.dispose();
      (content.route.material as T.Material).dispose();
      for (const m of [
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
  useFrame((state, delta) => {
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
    content.stream.update(p, { x: camera.position.x, z: camera.position.z });
    if (content.lastRevision !== content.revision) {
      content.lastRevision = content.revision;
      session.district.obstacles = [...content.resident.values()]
        .flatMap((c) =>
          (c.supports ?? []).map((v) => ({
            x: v.point[0],
            z: v.point[1],
            w: 1.4,
            d: 1.4,
            height: v.height - 1,
            color: "#aaa",
          })),
        )
        .concat(
          [...content.assets.values()].flatMap((a) => a.map((v) => v.obstacle)),
        );
      session.district.buildings = session.district.obstacles;
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
      content.route.geometry.dispose();
      content.route.geometry = new T.BufferGeometry();
      content.route.geometry.setAttribute(
        "position",
        new T.Float32BufferAttribute(positions, 3),
      );
    }
    (window as any).__geography = {
      position: { x: p.x, z: p.z, heading: p.heading },
      coordinate: metersToGeographic(p),
      height: session.height,
      speed: p.speed,
      loadMs: loaded.loadMs,
      decodedNavigationBytes: network.allocatedBytes,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
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
  });
  return (
    <>
      <color attach="background" args={["#c3dce6"]} />
      <fog attach="fog" args={["#c3dce6", 320, 1350]} />
      <hemisphereLight args={["#fff6de", "#697667", 2.3]} />
      <directionalLight position={[40, 100, 60]} intensity={2.2} />
      <primitive object={content.group} />
      <primitive object={tuk.root} />
    </>
  );
}
function PreviewHud({
  loaded,
  onTarget,
}: {
  loaded: Loaded;
  onTarget: (n?: RoadNode) => void;
}) {
  const { session, network } = loaded,
    [snapshot, setSnapshot] = useState(session.model.snapshot),
    [chosen, setChosen] = useState(""),
    [map, setMap] = useState(false),
    [guide, setGuide] = useState<{
      name: string;
      distance: number | null;
      road: string;
      thai?: string;
    }>({ name: "", distance: null, road: "" });
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
      const ctx = canvas.getContext("2d")!,
        b = network.metadata.bounds,
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
  }, [session, network, chosen, map]);
  return (
    <>
      <nav className="geo-toolbar">
        <b>REAL-SCALE BANGKOK · GAMEPLAY PREVIEW</b>
        <button
          onClick={() => {
            if (snapshot.phase === "playing") session.pause();
            else session.resume();
          }}
        >
          {snapshot.phase === "playing" ? "Pause" : "Resume"}
        </button>
        <button onClick={() => setMap(!map)}>Route map</button>
        <button onClick={() => session.recover()}>Recover</button>
        <a href={location.pathname}>Full legacy game</a>
      </nav>
      <section className="geo-status" aria-live="polite">
        <div className="geo-street">
          <b>{guide.road}</b>
          <small>{guide.thai}</small>
        </div>
        <strong>
          {snapshot.stage === "pickup" ? "PICK UP" : "DELIVER"} ·{" "}
          {snapshot.passenger}
        </strong>
        <div>{guide.name}</div>
        <b>
          {guide.distance === null
            ? "No connected route"
            : `${Math.round(guide.distance).toLocaleString()} m via roads`}{" "}
          · {Math.round(snapshot.speed)} km/h
        </b>
        <div>
          ฿{snapshot.earnings} earned · {snapshot.deliveries} trips · Wallet ฿
          {snapshot.wallet ?? session.career.profile.wallet}
          {snapshot.mode === "shift"
            ? ` · Shift ${Math.ceil(snapshot.shiftTime / 60)} min`
            : ""}
        </div>
        <div className="geo-message">
          {snapshot.message || "Stop within the gold ring to board or deliver."}
          {snapshot.boarding > 0
            ? ` ${Math.round(snapshot.boarding * 100)}%`
            : ""}
        </div>
        <label>
          Navigate{" "}
          <select
            aria-label="Geographic destination"
            value={chosen}
            onChange={(e) => setChosen(e.target.value)}
          >
            <option value="">Follow passenger fare</option>
            {network.stops.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name?.split(" · ")[0]}
              </option>
            ))}
          </select>
        </label>
        {chosen && (
          <small>
            Passenger fare remains active. Select “Follow passenger fare” to
            resume fare guidance.
          </small>
        )}
      </section>
      {map && (
        <aside className="geo-map" data-testid="geographic-map">
          <b>Connected source roads · gold route</b>
          <canvas
            ref={mapRef}
            width={800}
            height={800}
            aria-label="Real Bangkok destination route map"
          />
          <small>© OpenStreetMap contributors · ODbL</small>
        </aside>
      )}
      {(snapshot.phase === "title" || snapshot.phase === "ended") && (
        <section className="geo-menu">
          <h1>Bangkok, at real scale</h1>
          <p>
            Production driving, passengers and career earnings on Bangkok’s
            mapped streets. Four destinations; neighborhood artwork migration is
            in progress.
          </p>
          <button
            data-testid="button-start-shift"
            onClick={() => session.start("shift")}
          >
            Start shift · 24 minutes
          </button>
          <button
            data-testid="button-free-roam"
            onClick={() => session.start("free")}
          >
            Free roam
          </button>
          <a href={location.pathname}>Return to full legacy game</a>
        </section>
      )}
      {snapshot.viewingLandmark && <Inspection engine={session} />}
      {snapshot.phase === "paused" && !snapshot.viewingLandmark && (
        <section className="geo-menu">
          <h2>Drive paused</h2>
          <button onClick={() => session.resume()}>Resume drive</button>
          <button onClick={() => session.returnToTitle()}>End session</button>
        </section>
      )}
      {snapshot.phase === "playing" && (
        <Controls engine={session} onHorn={() => {}} />
      )}
      <small className="geo-credit">
        Preview · 1 unit = 1 meter · © OpenStreetMap contributors · ODbL 1.0
      </small>
    </>
  );
}
export default function GeographicPrototype() {
  const [loaded, setLoaded] = useState<Loaded>(),
    [error, setError] = useState(""),
    [target, setTarget] = useState<RoadNode>();
  useEffect(() => {
    let cancelled = false,
      cleanup: (() => void) | undefined;
    const start = performance.now();
    Promise.all([loadGameplayGeography(), loadArt()])
      .then(([network, art]) => {
        if (cancelled) {
          art.dispose();
          return;
        }
        const { district, places } = createGameplayDistrict(network),
          session = new GeographicSession(district);
        cleanup = () => {
          session.dispose();
          art.dispose();
        };
        setLoaded({
          network,
          session,
          art,
          places,
          loadMs: performance.now() - start,
        });
      })
      .catch((e) => setError(String(e)));
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
  if (error)
    return (
      <div className="geo-error">
        {error}
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
        dpr={1}
        camera={{ near: 0.1, far: 1800 }}
        gl={{ antialias: true, preserveDrawingBuffer: import.meta.env.DEV }}
      >
        <Scene loaded={loaded} target={target} />
      </Canvas>
      <PreviewHud loaded={loaded} onTarget={setTarget} />
    </main>
  );
}
