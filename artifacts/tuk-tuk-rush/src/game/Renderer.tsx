import { lightingState } from "./bangkok/lighting";
import { citySky } from "./bangkok/atmosphere";
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
import { bangkokPeople } from "./bangkok/urbanLayers";
import { buildBangkokGraybox, shiftLighting } from "./bangkok/mesh";
import { clamp } from "./meshUtil";
import { ChaseCamera, ArtCameraLease } from "./chaseCamera";

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
  const bangkok = engine.model.district.worldId === "bangkok";
  const cameraBlend = useRef({
    key: "",
    time: 0,
    room: false,
    from: new THREE.Vector3(),
    look: new THREE.Vector3(),
    last: new THREE.Vector3(),
    lastLook: new THREE.Vector3(),
  });
  const railView = useRef({ next: 0, y: 1.4, target: 1.4 });
  const lookPose = useRef({
    position: [0, 0, 0] as [number, number, number],
    target: [0, 0, 0] as [number, number, number],
  });
  const lightState = useMemo(() => lightingState(), []);
  const atmosphere = useMemo(
    () => (bangkok ? citySky() : undefined),
    [bangkok],
  );
  const sun = useRef<THREE.DirectionalLight>(null),
    ambient = useRef<THREE.HemisphereLight>(null);
  const city = useMemo(() => {
    const c = bangkok
      ? buildBangkokGraybox(engine.model.district, engine.railService)
      : buildCity(engine.model.district, art.textures);
    c.group.name = "City";
    return c;
  }, [engine, art]);
  const sky = useMemo(() => {
    const s = bangkok ? atmosphere!.root : buildSky();
    s.scale.setScalar(bangkok ? 1 : 0.18);
    return s;
  }, []);
  const tuk = useMemo(() => buildTuk(art.hero, art.textures), [art]);
  const streets = useMemo(() => {
    const s = bangkok
      ? { root: new THREE.Group(), update() {}, dispose() {} }
      : buildStreetscape(engine.model.district, art.textures);
    s.root.name = "Facades";
    return s;
  }, [engine, art]);
  const life = useMemo(
    () =>
      buildStreetLife(
        engine.model.district,
        bangkok ? bangkokPeople(engine.model.district) : undefined,
      ),
    [engine, city],
  );
  const shadows = useMemo(
    () =>
      bangkok ? new THREE.Group() : architectureShadows(engine.model.district),
    [engine],
  );
  const contact = useMemo(() => vehicleShadow(), []);
  const traffic = useMemo(() => new TrafficLayer(), []);
  const beacon = useMemo(() => {
    const b = buildBeacon();
    if (bangkok) {
      b.colMat.opacity = 0.065;
      b.ringMat.opacity = 0.5;
    }
    return b;
  }, []);
  const cam = useRef(new ChaseCamera());
  const cameraRevision = useRef(-1);
  const artLease = useRef(new ArtCameraLease());
  const qaCamera = import.meta.env.DEV && new URLSearchParams(window.location.search).get("qa") === "1";
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
      delete (window as typeof window & {__artCamera?: unknown}).__artCamera;
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
    // R3F resets clock.elapsedTime on demand/always transitions (opening the
    // map). A retained blend timestamp on that clock can replay the last LOOK
    // pose for minutes. Presentation deadlines require a monotonic clock.
    const t = performance.now() / 1000;
    if (bangkok) {
      const lighting = shiftLighting(s.elapsed ?? 0, lightState);
      (scene.background as THREE.Color).copy(lighting.sky);
      (scene.fog as THREE.Fog).color.copy(lighting.sky);
      if (sun.current) {
        sun.current.intensity = lighting.sun;
        sun.current.color.copy(lighting.key);
      }
      if (ambient.current) {
        ambient.current.intensity = lighting.ambient;
        ambient.current.color.copy(lighting.fill);
        ambient.current.groundColor.copy(lighting.ground);
      }
      gl.toneMappingExposure = lighting.exposure;
      scene.environmentIntensity = 0.38 - lighting.night * 0.2;
      (city as ReturnType<typeof buildBangkokGraybox>).setInspection(
        s.viewingLandmark,
      );
      (city as ReturnType<typeof buildBangkokGraybox>).setNight(lighting.night);
      (city as ReturnType<typeof buildBangkokGraybox>).animate(
        s.elapsed ?? 0,
        s.quality,
        engine.intersectionHorizontalGreen,
      );
      atmosphere!.update(
        state.camera.position,
        lighting.night,
        THREE.MathUtils.smoothstep(s.elapsed ?? 0, 45, 150),
      );
    }

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
    traffic.sync(m.traffic, camera.position, bangkok ? lightState.night : 0);

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

    // A small horizon adjustment near genuine rail corridors exposes overhead
    // trains without changing driving position, FOV or historic-district views.
    const rv = railView.current;
    if (t > rv.next) {
      rv.next = t + 0.25;
      rv.target = m.district.transit?.lines.some((line) =>
        line.samples.some(
          (q, i) => i % 8 === 0 && Math.hypot(q.x - p.x, q.z - p.z) < 65,
        ),
      )
        ? 3.65
        : 1.4;
    }
    rv.y += (rv.target - rv.y) * (1 - Math.exp(-3 * dt));
    // A session/recovery/LOOK exit invalidates both follow history and inspection blend.
    const cp = camera as THREE.PerspectiveCamera;
    if (cameraRevision.current !== engine.cameraRevision) {
      cameraRevision.current = engine.cameraRevision;
      cameraBlend.current.key = "";
      cameraBlend.current.time = -Infinity;
      rv.y = rv.target = 1.4;
    }
    c.update(m.district,p,dt,engine.cameraRevision,s.phase === "title",s.boostState === "active",rv.y);
    cp.position.copy(c.pos);
    cp.lookAt(c.look);
    if (Math.abs(cp.fov-c.fov)>.1) {cp.fov=c.fov;cp.updateProjectionMatrix();}
    const debugCamera = window as typeof window & {__artCamera?: {position:number[];look:number[]}};
    const override = artLease.current.read(debugCamera.__artCamera,qaCamera,t,engine.cameraRevision);
    if (override) {cp.position.fromArray(override.position);c.look.fromArray(override.look);cp.lookAt(c.look);}
    else if(debugCamera.__artCamera) delete debugCamera.__artCamera;
    beacon.g.visible = !s.viewingLandmark;
    const blend = cameraBlend.current,
      key = s.viewingLandmark ?? "";
    if (key !== blend.key) {
      blend.from.copy(blend.key ? blend.last : cp.position);
      blend.look.copy(blend.key ? blend.lastLook : c.look);
      const room = !!engine.inspection.view?.room;
      blend.time = !key || room || blend.room ? t - 1 : t;
      blend.room = room;
      blend.key = key;
    }
    if (
      s.viewingLandmark &&
      engine.inspection.update(delta, lookPose.current, m.district)
    ) {
      cp.position.fromArray(lookPose.current.position);
      c.look.fromArray(lookPose.current.target);
      cp.fov = 62;
      cp.updateProjectionMatrix();

    }
    const mix = THREE.MathUtils.smoothstep(t - blend.time, 0, 0.45);
    if (mix < 1) {
      cp.position.lerpVectors(blend.from, cp.position, mix);
      c.look.lerpVectors(blend.look, c.look, mix);
    }
    if (key || mix < 1) cp.lookAt(c.look);
    blend.last.copy(cp.position);
    blend.lastLook.copy(c.look);

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
    const far = bangkok
      ? s.quality === "low"
        ? 500
        : 800
      : s.quality === "low"
        ? 240
        : 340;
    if (cp.far !== far) {
      cp.far = far;
      cp.updateProjectionMatrix();
    }

    const fog = scene.fog as THREE.Fog;
    fog.near = bangkok ? 260 : s.quality === "low" ? 95 : 135;
    fog.far = bangkok
      ? s.quality === "low"
        ? 600
        : 780
      : s.quality === "low"
        ? 205
        : 310;
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
      <hemisphereLight ref={ambient} args={["#bddcf0", "#70616a", 1.05]} />
      <directionalLight
        ref={sun}
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
  mapOpen = false,
}: {
  engine: GameEngine;
  mapOpen?: boolean;
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
          <b>{error || "Preparing Bangkok…"}</b>
          {error && (
            <button className="tt-btn" onClick={() => location.reload()}>
              Retry
            </button>
          )}
        </div>
      )}
      <Canvas
        className="tt-canvas"
        frameloop={mapOpen ? "demand" : "always"}
        dpr={dpr}
        gl={{
          antialias: false,
          stencil: false,
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
