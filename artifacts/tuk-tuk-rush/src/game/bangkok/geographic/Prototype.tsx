import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as T from "three";
import { Controls } from "../../Controls";
import { ChaseCamera } from "../../chaseCamera";
import { loadArt, disposeObject, type ArtBundle } from "../../assets";
import { buildTuk } from "../../tukMesh";
import { channelGeometry, surfaceGeometry } from "../roadSurfaceGraph";
import { riverWater } from "../riverfront";
import { distanceToSegment } from "../../world";
import {
  createGeographicDistrict,
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
      water = riverWater();
    const materials = {
      land: new T.MeshStandardMaterial({ color: "#a8b6a1", roughness: 1 }),
      roads: new T.MeshStandardMaterial({ color: "#414c56", roughness: 1 }),
      bridges: new T.MeshStandardMaterial({ color: "#c39655", roughness: 1 }),
    };
    for (const chunk of data.chunks) {
      const root = new T.Group();
      root.position.set(chunk.origin[0], 0, chunk.origin[1]);
      root.name = `GeographicChunk:${chunk.origin.join(":")}`;
      for (const kind of ["land", "water", "roads", "bridges"] as const) {
        if (!chunk[kind].length) continue;
        const geometry =
          kind === "land" || kind === "water"
            ? channelGeometry(kind, session.district, chunk[kind])
            : surfaceGeometry(chunk[kind], kind === "bridges" ? 0.18 : 0.1);
        const mesh = new T.Mesh(
          geometry,
          kind === "water" ? water.material : materials[kind],
        );
        root.add(mesh);
      }
      group.add(root);
    }
    return { group, water };
  }, [data, session]);
  const tuk = useMemo(() => buildTuk(art.hero, art.textures), [art]);
  useEffect(
    () => () => {
      disposeObject(content.group);
    },
    [content],
  );
  useFrame((state, delta) => {
    // Production controller uses its existing 90Hz collision substeps; cap stalled browser frames.
    session.update(Math.min(delta, 0.05));
    const p = session.player;
    tuk.root.position.set(p.x, 0.18, p.z);
    tuk.root.rotation.y = p.heading;
    tuk.lean.rotation.z = p.lean;
    tuk.steerPivot.rotation.y = p.steer * 0.45;
    tuk.bars.rotation.y = p.steer * 0.45;
    for (const spin of tuk.spins) spin.rotation.x = p.wheelSpin;
    content.water.time.value = state.clock.elapsedTime;
    const perspective = camera as T.PerspectiveCamera;
    if (overhead) {
      const b = data.bounds;
      camera.position.set((b.minX + b.maxX) / 2, 27000, (b.minZ + b.maxZ) / 2);
      camera.up.set(0, 0, -1);
      camera.lookAt((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
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
      camera.lookAt(chase.current.look);
      perspective.fov = chase.current.fov;
    }
    perspective.updateProjectionMatrix();
    const stats = window as typeof window & { __geography?: unknown };
    stats.__geography = {
      position: { x: p.x, z: p.z, heading: p.heading },
      coordinate: metersToGeographic(p),
      speed: p.speed,
      loadMs: loaded.loadMs,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      renderer: gl.getContext().getParameter(gl.getContext().RENDERER),
    };
  });
  return (
    <>
      <color attach="background" args={["#b9d8e2"]} />
      <hemisphereLight args={["#ffffff", "#63705f", 2.3]} />
      <directionalLight position={[40, 100, 60]} intensity={2.2} />
      <primitive object={content.group} />
      <primitive object={tuk.root} />
    </>
  );
}
function DebugMap({ loaded }: { loaded: Loaded }) {
  const { data, session } = loaded;
  const [position, setPosition] = useState({ ...session.player });
  useEffect(() => {
    const timer = setInterval(() => setPosition({ ...session.player }), 150);
    return () => clearInterval(timer);
  }, [session]);
  const b = data.bounds,
    w = b.maxX - b.minX,
    h = b.maxZ - b.minZ;
  const path = (rings: number[][][]) =>
    rings.map((r) => "M" + r.map((p) => p.join(",")).join("L") + "Z").join("");
  const roads = useMemo(
    () =>
      data.roads.map((r) => ({
        r,
        points: r.nodes.map((n) => data.nodes[n]!.join(",")).join(" "),
      })),
    [data],
  );
  const boundaries = useMemo(
    () =>
      data.boundaries.flatMap((boundary) =>
        boundary.geometry.coordinates.map((p, i) => ({
          id: boundary.id + ":" + i,
          path: path(
            p.map((r) =>
              r.map(([lon, lat]) => {
                const p = geographicToMeters({ lon: lon!, lat: lat! });
                return [p.x, p.z];
              }),
            ),
          ),
        })),
      ),
    [data],
  );
  const coord = metersToGeographic(position);
  let closest = "Open land",
    distance = Infinity;
  for (const r of data.roads)
    for (let i = 1; i < r.nodes.length; i++) {
      const a = data.nodes[r.nodes[i - 1]!]!,
        c = data.nodes[r.nodes[i]!]!,
        d = distanceToSegment(
          position,
          { x: a[0], z: a[1] },
          { x: c[0], z: c[1] },
        ).distance;
      if (d < distance) {
        distance = d;
        closest =
          r.tags["name:en"] ?? r.tags.name ?? "Unnamed " + r.tags.highway;
      }
    }
  return (
    <aside className="geo-map" data-testid="geographic-map">
      <b>{closest}</b>
      <div>
        {coord.lat.toFixed(6)}, {coord.lon.toFixed(6)} ·{" "}
        {Math.abs(position.speed * 3.6).toFixed(0)} km/h
      </div>
      <svg
        viewBox={`${b.minX} ${b.minZ} ${w} ${h}`}
        role="img"
        aria-label="Geographic source boundaries, river and streets"
      >
        <rect x={b.minX} y={b.minZ} width={w} height={h} fill="#a8b6a1" />
        {data.waterUnion.map((p, i) => (
          <path key={i} d={path(p)} fill="#176d7a" fillRule="evenodd" />
        ))}
        {boundaries.map((p) => (
          <path
            key={p.id}
            d={p.path}
            fill="none"
            stroke="#6e5aa0"
            strokeWidth="12"
            strokeDasharray="45 30"
          />
        ))}
        {roads.map(({ r, points }) => (
          <polyline
            key={r.id}
            points={points}
            fill="none"
            stroke={r.coverage === "A" ? "#f5df9d" : "#45505e"}
            strokeWidth={Math.max(r.width, 8)}
          >
            <title>{r.tags["name:en"] ?? r.tags.name ?? r.id}</title>
          </polyline>
        ))}
        <circle
          cx={position.x}
          cy={position.z}
          r="90"
          fill="#fb4561"
          stroke="white"
          strokeWidth="22"
        />
      </svg>
      <small>
        A: gold · B: dark · administrative boundaries: purple
        <br />© OpenStreetMap contributors ·{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          ODbL
        </a>
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
        const session = new GeographicSession(createGeographicDistrict(data));
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
