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
import { bangkokPeople } from './bangkok/urbanLayers';
import { buildBangkokGraybox, shiftLighting } from './bangkok/mesh';
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
  const bangkok = engine.model.district.worldId === 'bangkok';
  const cameraBlend=useRef({key:'',time:0,room:false,from:new THREE.Vector3(),look:new THREE.Vector3(),last:new THREE.Vector3(),lastLook:new THREE.Vector3()});
  const railView=useRef({next:0,y:1.4,target:1.4});
  const lookPose=useRef({position:[0,0,0] as [number,number,number],target:[0,0,0] as [number,number,number]});
  const atmosphere=useMemo(()=>bangkok?citySky():undefined,[bangkok]);
  const sun = useRef<THREE.DirectionalLight>(null), ambient = useRef<THREE.HemisphereLight>(null);
  const city = useMemo(() => {
    const c = bangkok ? buildBangkokGraybox(engine.model.district,engine.railService) : buildCity(engine.model.district, art.textures);
    c.group.name = "City";
    return c;
  }, [engine, art]);
  const sky = useMemo(() => {
    const s = bangkok ? atmosphere!.root : buildSky();
    s.scale.setScalar(bangkok?1:.18);
    return s;
  }, []);
  const tuk = useMemo(() => buildTuk(art.hero, art.textures), [art]);
  const streets = useMemo(() => {
    const s = bangkok ? { root: new THREE.Group(), update() {}, dispose() {} } : buildStreetscape(engine.model.district, art.textures);
    s.root.name = "Facades";
    return s;
  }, [engine, art]);
  const life = useMemo(
    () => buildStreetLife(engine.model.district, bangkok ? bangkokPeople(engine.model.district) : undefined),
    [engine, city],
  );
  const shadows = useMemo(
    () => bangkok ? new THREE.Group() : architectureShadows(engine.model.district),
    [engine],
  );
  const contact = useMemo(() => vehicleShadow(), []);
  const traffic = useMemo(() => new TrafficLayer(), []);
  const beacon = useMemo(() => {const b=buildBeacon();if(bangkok){b.colMat.opacity=.065;b.ringMat.opacity=.5;}return b;}, []);
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
    if (bangkok) {
      const lighting = shiftLighting(s.elapsed ?? 0);
      (scene.background as THREE.Color).copy(lighting.sky); (scene.fog as THREE.Fog).color.copy(lighting.sky);
      if (sun.current) sun.current.intensity = lighting.sun;
      if (ambient.current) ambient.current.intensity = lighting.ambient;
      gl.toneMappingExposure = lighting.exposure;
      scene.environmentIntensity = .38 - lighting.night * .2;
      (city as ReturnType<typeof buildBangkokGraybox>).setNight(lighting.night);
      (city as ReturnType<typeof buildBangkokGraybox>).animate(s.elapsed??0,s.quality,engine.intersectionHorizontalGreen);
      atmosphere!.update(state.camera.position,lighting.night,THREE.MathUtils.smoothstep(s.elapsed??0,45,150));
      if(sun.current)sun.current.color.set(lighting.night>.6?"#9bb7df":"#ffdeb1");
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

    // A small horizon adjustment near genuine rail corridors exposes overhead
    // trains without changing driving position, FOV or historic-district views.
    const rv=railView.current;if(t>rv.next){rv.next=t+.25;rv.target=m.district.transit?.lines.some(line=>line.samples.some((q,i)=>i%8===0&&Math.hypot(q.x-p.x,q.z-p.z)<65))?3.65:1.4;}rv.y+=(rv.target-rv.y)*(1-Math.exp(-3*dt));
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
      if(Math.hypot(p.x-c.pos.x,p.z-c.pos.z)>45)c.init=false;
      const snapNow = !c.init;
      const arrival=Math.abs(p.speed)<1.8&&!m.input.gas?m.district.destinations?.find(a=>{
        const n=m.district.nodes.find(n=>n.id===a.arrivalNode)!;return Math.hypot(p.x-n.x,p.z-n.z)<a.arrivalRadius+1;
      }):undefined;
      const destination=arrival?m.district.landmarks.find(l=>l.id===arrival.landmarkId):undefined;
      const heading=destination?Math.atan2(destination.plot!.x-p.x,destination.plot!.z-p.z):p.heading;
      if (snapNow) {
        c.heading = heading;
        c.init = true;
      }
      let dh = heading - c.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      c.heading += dh * (1 - Math.exp(-4.5 * dt));
      const boosted=s.boostState==='active' ? 1 : 0;
      const dist = 7.8 + 3 * sp + boosted*.7,
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
      if(destination){const y=destination.id==='paknam'?30:destination.id==='arun'?22:destination.id==='pho'?8:destination.kind==='palace'?18:17;c.look.set(destination.plot!.x,y,destination.plot!.z);}
      else c.look.set(p.x + fx * 6, rv.y, p.z + fz * 6);
      cp.lookAt(c.look);
      c.fov += (58 + sp * 14 + boosted*3 - c.fov) * (1 - Math.exp(-3 * dt));
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
    beacon.g.visible=!s.viewingLandmark;
    const blend=cameraBlend.current,key=s.viewingLandmark??'';
    if(key!==blend.key){blend.from.copy(blend.key?blend.last:cp.position);blend.look.copy(blend.key?blend.lastLook:c.look);const room=!!engine.inspection.view?.room;blend.time=room||blend.room?t-1:t;blend.room=room;blend.key=key;}
    if(s.viewingLandmark&&engine.inspection.update(delta,lookPose.current,m.district)){
      cp.position.fromArray(lookPose.current.position);c.look.fromArray(lookPose.current.target);cp.fov=62;cp.updateProjectionMatrix();c.init=false;
    }
    const mix=THREE.MathUtils.smoothstep(t-blend.time,0,.45);
    if(mix<1){cp.position.lerpVectors(blend.from,cp.position,mix);c.look.lerpVectors(blend.look,c.look,mix);}
    if(key||mix<1)cp.lookAt(c.look);blend.last.copy(cp.position);blend.lastLook.copy(c.look);

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
    const far = bangkok ? s.quality === "low" ? 500 : 800 : s.quality === "low" ? 240 : 340;
    if (cp.far !== far) {
      cp.far = far;
      cp.updateProjectionMatrix();
    }

    const fog = scene.fog as THREE.Fog;
    fog.near = bangkok ? 260 : s.quality === "low" ? 95 : 135;
    fog.far = bangkok ? s.quality === "low" ? 600 : 780 : s.quality === "low" ? 205 : 310;
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
