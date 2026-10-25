import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as T from "three";
import { Controls } from "../../Controls";
import { ChaseCamera } from "../../chaseCamera";
import { loadArt, disposeObject, type ArtBundle } from "../../assets";
import { buildTuk } from "../../tukMesh";
import { GeographicStream } from "./streaming";
import {
  buildGeographicChunk,
  geographicMaterials,
  disposeGeographicChunk,
  buildGeographicOverview,
} from "./rendering";
import { drawGeographicMap } from "./debugMap";
import { riverWater } from "../riverfront";
import {
  createGeographicDistrict,
  loadGeographicChunk,
  type GeographicChunkData,
  loadGeographicDataset,
  type GeographicDataset,
} from "./dataset";
import { geographicToMeters, metersToGeographic } from "./projection";
import { GeographicSession } from "./session";
import "./prototype.css";

type Loaded = {
  data: GeographicDataset;
  session: GeographicSession;
  art: ArtBundle;
  loadMs: number;
};
function Scene({ loaded, overhead }: { loaded: Loaded; overhead: boolean }) {
  const { data, session, art } = loaded,
    { camera, gl } = useThree(),
    chase = useRef(new ChaseCamera());
  const content = useMemo(() => {
    const group = new T.Group(),
      water = riverWater(),
      materials = geographicMaterials(data);
    const resident = new Map<string, GeographicChunkData>();
    let revision = 0;
    const stream = new GeographicStream<{
      chunk: GeographicChunkData;
      root?: T.Group;
    }>(
      data.chunks,
      async (ref, signal) => ({
        chunk: await loadGeographicChunk(ref, signal),
      }),
      (v, ref) => {
        v.root = buildGeographicChunk(v.chunk, materials, water.material);
        group.add(v.root);
        resident.set(ref.id, v.chunk);
        revision++;
      },
      (v) => {
        if (v.root) disposeGeographicChunk(v.root);
        if (v.root && resident.get(v.chunk.origin.join(":")) === v.chunk) {
          resident.delete(v.chunk.origin.join(":"));
          revision++;
        }
      },
    );
    return {
      group,
      water,
      materials,
      stream,
      resident,
      get revision() {
        return revision;
      },
      lastRevision: -1,
      look: new T.Vector3(),
    };
  }, [data]);
  const overview = useMemo(
    () => (overhead ? buildGeographicOverview(data) : undefined),
    [overhead, data],
  );
  const tuk = useMemo(() => buildTuk(art.hero, art.textures), [art]);
  useEffect(
    () => () => {
      content.stream.close();
      for (const m of [
        content.materials.land,
        content.materials.roads,
        content.materials.deck,
        content.materials.support,
        ...content.materials.lines.values(),
        content.water.material,
      ])
        m.dispose();
    },
    [content],
  );
  useEffect(
    () => () => {
      if (overview) disposeObject(overview);
    },
    [overview],
  );
  useFrame((state, delta) => {
    session.update(Math.min(delta, 0.05));
    const p = session.player;
    tuk.root.position.set(p.x, session.height + 0.18, p.z);
    tuk.root.scale.setScalar(overhead ? 18 : 1);
    tuk.root.rotation.y = p.heading;
    tuk.lean.rotation.z = p.lean;
    tuk.steerPivot.rotation.y = p.steer * 0.45;
    tuk.bars.rotation.y = p.steer * 0.45;
    for (const spin of tuk.spins) spin.rotation.x = p.wheelSpin;
    content.water.time.value = state.clock.elapsedTime;
    const perspective = camera as T.PerspectiveCamera;
    if (overhead) {
      const b = data.bounds,
        x = (b.minX + b.maxX) / 2,
        z = (b.minZ + b.maxZ) / 2;
      const fit = Math.max(
        b.maxZ - b.minZ,
        (b.maxX - b.minX) / perspective.aspect,
      );
      camera.position.set(x, fit * 1.14, z);
      camera.up.set(0, 0, -1);
      camera.lookAt(x, 0, z);
      perspective.fov = 52;
    } else {
      camera.up.set(0, 1, 0);
      chase.current.update(
        session.district,
        p,
        delta,
        0,
        false,
        session.boost.state === "active",
      );
      camera.position.copy(chase.current.pos);
      camera.position.y += session.height;
      content.look.copy(chase.current.look);
      content.look.y += session.height;
      camera.lookAt(content.look);
      perspective.fov = chase.current.fov;
    }
    perspective.updateProjectionMatrix();
    content.stream.update(
      p,
      overhead ? undefined : { x: camera.position.x, z: camera.position.z },
    );
    // Supports are installed/disposed with their physical chunk; no solid guideway boxes at ground level.
    if (content.lastRevision !== content.revision) {
      content.lastRevision = content.revision;
      session.district.obstacles = [...content.resident.values()].flatMap((c) =>
        (c.supports ?? []).map((s) => ({
          x: s.point[0],
          z: s.point[1],
          w: 1.4,
          d: 1.4,
          height: s.height - 1,
          color: "#aaa",
        })),
      );
    }
    (window as typeof window & { __geography?: unknown }).__geography = {
      position: { x: p.x, z: p.z, heading: p.heading },
      coordinate: metersToGeographic(p),
      height: session.height,
      speed: p.speed,
      loadMs: loaded.loadMs,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      renderer: gl.getContext().getParameter(gl.getContext().RENDERER),
      stream: {
        ...content.stream.stats,
        active: content.stream.active.size,
        ids: [...content.stream.active.keys()],
        settled: content.stream.settled,
        total: data.chunks.length,
      },
    };
    // Explicit development query only, used to inspect source-backed coordinates in browser QA.
    if (
      location.search.includes("geographyQA") &&
      !(window as any).__geographyQA
    )
      (window as any).__geographyQA = {
        closeup: () => {
          const canvas = document.createElement("canvas");
          canvas.width = 1280;
          canvas.height = 900;
          const a = geographicToMeters({ lon: 100.501, lat: 13.75 }),
            b = geographicToMeters({ lon: 100.529, lat: 13.714 });
          const dataView = {
            ...data,
            bounds: { minX: a.x, minZ: a.z, maxX: b.x, maxZ: b.z },
          };
          drawGeographicMap(canvas.getContext("2d")!, dataView, 1280, 900);
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#172a37";
          ctx.fillRect(14, 14, 870, 70);
          ctx.fillStyle = "white";
          ctx.font = "22px sans-serif";
          ctx.fillText(
            "Yaowarat · Talat Noi · Bang Rak — source network",
            28,
            43,
          );
          ctx.font = "16px sans-serif";
          ctx.fillText(
            "Gray streets · ochre passages · line-colored rail · dashed underground · white stations",
            28,
            68,
          );
          return canvas.toDataURL("image/png");
        },
        move: (lon: number, lat: number, heading?: number) => {
          const q = geographicToMeters({ lon, lat });
          Object.assign(p, q, {
            speed: 0,
            ...(heading === undefined ? {} : { heading }),
          });
          session.height = 0;
          session.controller.reset();
          session.clearInput();
        },
      };
  });
  return (
    <>
      <color attach="background" args={["#b9d8e2"]} />
      <hemisphereLight args={["#ffffff", "#63705f", 2.3]} />
      <directionalLight position={[40, 100, 60]} intensity={2.2} />
      <primitive object={content.group} visible={!overhead} />
      {overview && <primitive object={overview} />}
      <primitive object={tuk.root} />
    </>
  );
}
function DebugMap({ loaded }: { loaded: Loaded }) {
  const { data, session } = loaded,
    canvas = useRef<HTMLCanvasElement>(null),
    label = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = canvas.current!,
      ctx = target.getContext("2d")!,
      background = document.createElement("canvas");
    background.width = 900;
    background.height = 900;
    const { screen } = drawGeographicMap(
      background.getContext("2d")!,
      data,
      900,
      900,
    );
    const draw = () => {
      ctx.drawImage(background, 0, 0);
      const p = screen([session.player.x, session.player.z]);
      ctx.beginPath();
      ctx.arc(p[0]!, p[1]!, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ff3158";
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();
      const c = metersToGeographic(session.player);
      label.current!.textContent = `${c.lat.toFixed(6)}, ${c.lon.toFixed(6)} · ${Math.abs(session.player.speed * 3.6).toFixed(0)} km/h`;
    };
    draw();
    const timer = setInterval(draw, 200);
    return () => clearInterval(timer);
  }, [data, session]);
  return (
    <aside className="geo-map" data-testid="geographic-map">
      <b>Source streets, waterways and rail</b>
      <div ref={label} />
      <canvas
        ref={canvas}
        width={900}
        height={900}
        aria-label="Bangkok roads, passages, rail lines, stations, interchanges and administrative boundaries"
      />
      <small>
        Streets: gray · passages: ochre · boundaries: purple
        <br />
        Dashed rail: underground · dotted rail: inactive · white circles:
        stations
        <br />
        {data.rail.catalog.lines.map((l) => (
          <span key={l.id} style={{ color: l.color, marginRight: 8 }}>
            {l.name}{" "}
          </span>
        ))}
        <br />© OpenStreetMap contributors ·{" "}
        <a href="https://www.openstreetmap.org/copyright">ODbL</a>
      </small>
    </aside>
  );
}
export default function GeographicPrototype() {
  const [loaded, setLoaded] = useState<Loaded>(),
    [error, setError] = useState(""),
    [overhead, setOverhead] = useState(false),
    [map, setMap] = useState(false);
  useEffect(() => {
    let cancelled = false,
      dispose: (() => void) | undefined;
    const start = performance.now();
    Promise.all([loadGeographicDataset(), loadArt()])
      .then(([data, art]) => {
        if (cancelled) {
          art.dispose();
          return;
        }
        const session = new GeographicSession(
          createGeographicDistrict(data),
          data,
        );
        dispose = () => {
          session.clearInput();
          art.dispose();
        };
        setLoaded({ data, session, art, loadMs: performance.now() - start });
      })
      .catch((e) => setError(String(e)));
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);
  useEffect(() => loaded?.session.attach(), [loaded]);
  if (error) return <div className="geo-error">{error}</div>;
  if (!loaded)
    return <div className="geo-error">Loading geographic proof…</div>;
  return (
    <main className="tt-root geo-root" data-testid="geographic-prototype">
      <Canvas
        dpr={1}
        camera={{ near: 0.1, far: 60000 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <Scene loaded={loaded} overhead={overhead} />
      </Canvas>
      <nav className="geo-toolbar">
        <b>BANGKOK · REAL SCALE</b>
        <button onClick={() => setOverhead((v) => !v)}>
          {overhead ? "Drive view" : "Overhead"}
        </button>
        <button onClick={() => setMap((v) => !v)}>Source map</button>
        <button onClick={() => loaded.session.reset()}>
          Reset to Yaowarat
        </button>
        <a href={location.pathname}>Default game</a>
      </nav>
      <p className="geo-note">
        Geography proof · 1 unit = 1 meter · temporary bare land
        <br />
        Arrows / WASD or touch controls · B boost
        <br />© OpenStreetMap contributors · ODbL 1.0
      </p>
      {map && <DebugMap loaded={loaded} />}
      {!overhead && <Controls engine={loaded.session} onHorn={() => {}} />}
    </main>
  );
}
