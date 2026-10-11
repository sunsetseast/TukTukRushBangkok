import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { GameEngine } from "./engine";
import { buildCity, buildSky } from "./cityMesh";
import { buildTuk } from "./tukMesh";
import { TrafficLayer } from "./trafficMesh";
import { architectureShadows, vehicleShadow } from "./contactShadows";
import { buildStreetLife } from "./streetLife";
import { buildStreetscape } from "./streetscape";
import { loadArt, type ArtBundle, disposeObject } from "./assets";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { clamp } from "./meshUtil";
import { obstacleLocal } from "./world";

function buildBeacon() {
  const g = new THREE.Group();
  g.name = "MissionBeacon";
  const colMat = new THREE.MeshBasicMaterial({
    color: "#ffd23f",
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const col = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 70, 20, 1, true),
    colMat,
  );
  col.position.y = 35;
  const ringMat = new THREE.MeshBasicMaterial({
    color: "#ffd23f",
    transparent: true,
    opacity: 0.8,
    fog: false,
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(9, 0.3, 6, 28).rotateX(Math.PI / 2),
    ringMat,
  );
  ring.position.y = 0.4;
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.8),
    new THREE.MeshBasicMaterial({ color: "#fff7d0", fog: false }),
  );
  gem.position.y = 24;
  g.add(col, ring, gem);
  return { g, colMat, ringMat, ring, gem };
}

function Scene({ engine, art }: { engine: GameEngine; art: ArtBundle }) {
  const { camera, gl, scene } = useThree();
  const city = useMemo(() => {
    const c = buildCity(engine.model.district, art.textures);
    c.group.name = "City";
    return c;
  }, [engine, art]);
  const sky = useMemo(() => {
    const s = buildSky();
    s.scale.setScalar(0.18);
    return s;
  }, []);
  const tuk = useMemo(() => buildTuk(art.hero, art.textures), [art]);
  const streets = useMemo(() => {
    const s = buildStreetscape(engine.model.district, art.textures);
    s.root.name = "Facades";
    return s;
  }, [engine, art]);
  const life = useMemo(
    () => buildStreetLife(engine.model.district),
    [engine, city],
  );
  const shadows = useMemo(
    () => architectureShadows(engine.model.district),
    [engine],
  );
  const contact = useMemo(() => vehicleShadow(), []);
  const traffic = useMemo(() => new TrafficLayer(), []);
  const beacon = useMemo(() => buildBeacon(), []);
  const cam = useRef({
    init: false,
    phase: "",
    heading: 0,
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    fov: 60,
  });
  const stageRef = useRef("");
  const frameId = useRef(0);
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = generator.fromScene(room, 0.04, 0.1, 50);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.38;
    room.dispose();
    generator.dispose();
    return () => {
      scene.environment = null;
      env.dispose();
      city.dispose();
      streets.dispose();
      traffic.dispose();
      life.dispose();
      disposeObject(sky);
      disposeObject(beacon.g);
      disposeObject(shadows);
      disposeObject(contact);
    };
  }, [city, streets, traffic, life, sky, beacon, shadows, contact, gl, scene]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    engine.update(delta);
    const m = engine.model,
      p = m.player,
      s = m.snapshot,
      c = cam.current;
    const t = state.clock.elapsedTime;

    tuk.root.position.set(p.x, 0, p.z);
    tuk.root.rotation.y = p.heading;
    contact.position.set(p.x, 0.2, p.z);
    contact.rotation.y = p.heading;
    tuk.lean.rotation.z = clamp(p.lean, -0.3, 0.3);
    tuk.lean.position.y =
      Math.sin(p.wheelSpin * 0.35) * Math.min(0.045, Math.abs(p.speed) * 0.003);
    tuk.lean.position.x =
      p.collision > 0 ? Math.sin(t * 70) * Math.min(1, p.collision) * 0.05 : 0;
    tuk.steerPivot.rotation.y = -clamp(p.steer, -1, 1) * 0.45;
    tuk.bars.rotation.y = -clamp(p.steer, -1, 1) * 0.45;
    for (const w of tuk.spins) w.rotation.x = p.wheelSpin;
    tuk.passenger.visible = s.stage === "delivery";
    traffic.sync(m.traffic);

    // beacon
    beacon.g.position.set(s.target.x, 0, s.target.z);
    if (stageRef.current !== s.stage) {
      stageRef.current = s.stage;
      const col = s.stage === "pickup" ? "#ffd23f" : "#ff4f8b";
      beacon.colMat.color.set(col);
      beacon.ringMat.color.set(col);
    }
    const pulse = 1 + Math.sin(t * 4) * 0.025;
    beacon.ring.scale.set(pulse, 1, pulse);
    beacon.gem.rotation.y = t * 2;
    beacon.gem.position.y = 24 + Math.sin(t * 2) * 1.2;

    // camera
    if (c.phase !== s.phase && (c.phase === "title" || c.phase === ""))
      c.init = false;
    c.phase = s.phase;
    const cp = camera as THREE.PerspectiveCamera;
    if (s.phase === "title") {
      const a = t * 0.18 + 0.6;
      const sa = Math.sin(a),
        ca = Math.cos(a);
      c.pos.set(p.x + sa * 12, 4.2, p.z + ca * 12);
      c.look.set(p.x - ca * 3.6, 1.4, p.z + sa * 3.6);
      cp.position.copy(c.pos);
      cp.lookAt(c.look);
      c.init = false;
      c.fov = 56;
    } else {
      const sp = clamp(Math.abs(p.speed) / 31, 0, 1);
      const snapNow = !c.init;
      if (snapNow) {
        c.heading = p.heading;
        c.init = true;
      }
      let dh = p.heading - c.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      c.heading += dh * (1 - Math.exp(-4.5 * dt));
      const dist = 7.8 + 3 * sp,
        h = 3.3 + 1.3 * sp;
      const fx = Math.sin(c.heading),
        fz = Math.cos(c.heading);
      const hx = p.x,
        hy = 1.6,
        hz = p.z;
      const dx = p.x - fx * dist,
        dy = h,
        dz = p.z - fz * dist;
      let k = 1;
      for (; k > 0.25; k -= 0.1) {
        const px = hx + (dx - hx) * k,
          py = hy + (dy - hy) * k,
          pz = hz + (dz - hz) * k;
        let hit = false;
        for (const b of m.district.buildings) {
          const local = obstacleLocal({ x: px, z: pz }, b);
          if (
            py < b.height + 0.5 &&
            Math.abs(local.x) < b.w / 2 + 0.8 &&
            Math.abs(local.z) < b.d / 2 + 0.8
          ) {
            hit = true;
            break;
          }
        }
        if (!hit) break;
      }
      const tx = hx + (dx - hx) * k,
        ty = hy + (dy - hy) * k,
        tz = hz + (dz - hz) * k;
      if (
        snapNow ||
        !isFinite(c.pos.x) ||
        Math.hypot(c.pos.x - tx, c.pos.z - tz) > 30
      )
        c.pos.set(tx, ty, tz);
      const f = 1 - Math.exp(-(k < 1 ? 14 : 9) * dt);
      c.pos.x += (tx - c.pos.x) * f;
      c.pos.y += (ty - c.pos.y) * f;
      c.pos.z += (tz - c.pos.z) * f;
      cp.position.copy(c.pos);
      c.look.set(p.x + fx * 6, 1.4, p.z + fz * 6);
      cp.lookAt(c.look);
      c.fov += (58 + sp * 14 - c.fov) * (1 - Math.exp(-3 * dt));
    }
    if (Math.abs(cp.fov - c.fov) > 0.1) {
      cp.fov = c.fov;
      cp.updateProjectionMatrix();
    }
    if (import.meta.env.DEV) {
      const override = (
        window as typeof window & {
          __artCamera?: { position: number[]; look: number[] };
        }
      ).__artCamera;
      if (override) {
        cp.position.fromArray(override.position);
        cp.lookAt(new THREE.Vector3().fromArray(override.look));
      }
    }
    sky.position.copy(cp.position);
    streets.update(cp.position, s.quality);
    life.update(
      delta,
      cp.position,
      s.quality,
      s.phase === "playing" || s.phase === "title",
      p,
    );
    city.update(cp.position, s.quality, engine.intersectionHorizontalGreen);
    const far = s.quality === "low" ? 240 : 340;
    if (cp.far !== far) {
      cp.far = far;
      cp.updateProjectionMatrix();
    }
    const fog = scene.fog as THREE.Fog;
    fog.near = s.quality === "low" ? 95 : 135;
    fog.far = s.quality === "low" ? 205 : 310;
    if (import.meta.env.DEV) {
      const debug = window as typeof window & { __graphics?: unknown };
      debug.__graphics = {
        frameId: ++frameId.current,
        engine,
        gl,
        scene,
        three: THREE,
        camera: cp,
        hero: tuk.root,
        life,
        stats: {
          calls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
          geometries: gl.info.memory.geometries,
          textures: gl.info.memory.textures,
          frameMs: delta * 1000,
        },
      };
    }
  });

  return (
    <>
      <color attach="background" args={["#b2a1aa"]} />
      <fog attach="fog" args={["#b2a1aa", 125, 430]} />
      <hemisphereLight args={["#bddcf0", "#70616a", 1.05]} />
      <directionalLight
        position={[-120, 45, 60]}
        intensity={1.95}
        color="#ffc78f"
      />
      <primitive object={sky} />
      <primitive object={city.group} />
      <primitive object={streets.root} />
      <primitive object={life.root} />
      <primitive object={shadows} />
      <primitive object={contact} />
      <primitive object={tuk.root} />
      <primitive object={traffic.group} />
      <primitive object={beacon.g} />
    </>
  );
}

export default function GameCanvas({
  engine,
  quality,
}: {
  engine: GameEngine;
  quality: "low" | "medium";
}) {
  const [art, setArt] = useState<ArtBundle | null>(null);
  const [error, setError] = useState("");
  const [contextLost, setContextLost] = useState(false);
  const contextCleanup = useRef(() => {});
  useEffect(() => () => contextCleanup.current(), []);
  useEffect(() => {
    let cancelled = false,
      owned: ArtBundle | null = null;
    loadArt()
      .then((bundle) => {
        owned = bundle;
        if (cancelled) owned.dispose();
        else setArt(owned);
      })
      .catch(() => {
        if (!cancelled) setError("The Bangkok art assets could not load.");
      });
    return () => {
      cancelled = true;
      if (owned) owned.dispose();
    };
  }, []);
  const dpr =
    quality === "low" ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
  return (
    <>
      {contextLost && (
        <div className="tt-asset-status" role="status">
          Restoring graphics…
        </div>
      )}
      {!art && (
        <div className="tt-asset-status" role="status">
          <b>{error || "Preparing Chinatown…"}</b>
          {error && (
            <button className="tt-btn" onClick={() => location.reload()}>
              Retry
            </button>
          )}
        </div>
      )}
      <Canvas
        className="tt-canvas"
        dpr={dpr}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          contextCleanup.current();
          const lost = (e: Event) => {
            e.preventDefault();
            engine.pause();
            setContextLost(true);
          };
          const restored = () => setContextLost(false);
          gl.domElement.addEventListener("webglcontextlost", lost);
          gl.domElement.addEventListener("webglcontextrestored", restored);
          contextCleanup.current = () => {
            gl.domElement.removeEventListener("webglcontextlost", lost);
            gl.domElement.removeEventListener("webglcontextrestored", restored);
          };
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.84;
        }}
        camera={{ fov: 58, near: 0.2, far: 1200, position: [-282, 5, 40] }}
        style={{ touchAction: "none" }}
      >
        {art && <Scene engine={engine} art={art} />}
      </Canvas>
    </>
  );
}
