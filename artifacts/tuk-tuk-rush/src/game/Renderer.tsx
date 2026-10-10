import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { GameEngine } from './engine';
import { buildCity, buildSky } from './cityMesh';
import { buildTuk } from './tukMesh';
import { TrafficLayer } from './trafficMesh';
import { clamp } from './meshUtil';

function buildBeacon() {
  const g = new THREE.Group();
  const colMat = new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const col = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 70, 20, 1, true), colMat);
  col.position.y = 35;
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.8, fog: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(9, 0.3, 6, 28).rotateX(Math.PI / 2), ringMat);
  ring.position.y = 0.4;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.8), new THREE.MeshBasicMaterial({ color: '#fff7d0', fog: false }));
  gem.position.y = 24;
  g.add(col, ring, gem);
  return { g, colMat, ringMat, ring, gem };
}

function Scene({ engine }: { engine: GameEngine }) {
  const { camera } = useThree();
  const city = useMemo(() => buildCity(engine.model.district), [engine]);
  const sky = useMemo(() => buildSky(), []);
  const tuk = useMemo(() => buildTuk(), []);
  const traffic = useMemo(() => new TrafficLayer(), []);
  const beacon = useMemo(() => buildBeacon(), []);
  const cam = useRef({ init: false, phase: '', heading: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 60 });
  const stageRef = useRef('');
  useEffect(() => () => city.dispose(), [city]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    engine.update(delta);
    const m = engine.model, p = m.player, s = m.snapshot, c = cam.current;
    const t = state.clock.elapsedTime;

    tuk.root.position.set(p.x, 0, p.z);
    tuk.root.rotation.y = p.heading;
    tuk.lean.rotation.z = clamp(p.lean, -0.3, 0.3);
    tuk.lean.position.y = Math.sin(p.wheelSpin * 0.35) * Math.min(0.045, Math.abs(p.speed) * 0.003);
    tuk.lean.position.x = p.collision > 0 ? Math.sin(t * 70) * Math.min(1, p.collision) * 0.05 : 0;
    tuk.steerPivot.rotation.y = -clamp(p.steer, -1, 1) * 0.45;
    tuk.bars.rotation.y = -clamp(p.steer, -1, 1) * 0.45;
    for (const w of tuk.spins) w.rotation.x = p.wheelSpin;
    tuk.passenger.visible = s.stage === 'delivery';
    traffic.sync(m.traffic);

    // beacon
    beacon.g.position.set(s.target.x, 0, s.target.z);
    if (stageRef.current !== s.stage) {
      stageRef.current = s.stage;
      const col = s.stage === 'pickup' ? '#ffd23f' : '#ff4f8b';
      beacon.colMat.color.set(col); beacon.ringMat.color.set(col);
    }
    const pulse = 1 + Math.sin(t * 4) * 0.025;
    beacon.ring.scale.set(pulse, 1, pulse);
    beacon.gem.rotation.y = t * 2; beacon.gem.position.y = 24 + Math.sin(t * 2) * 1.2;

    // camera
    if (c.phase !== s.phase && (c.phase === 'title' || c.phase === '')) c.init = false;
    c.phase = s.phase;
    const cp = camera as THREE.PerspectiveCamera;
    if (s.phase === 'title') {
      const a = t * 0.18 + 0.6;
      const sa = Math.sin(a), ca = Math.cos(a);
      c.pos.set(p.x + sa * 12, 4.2, p.z + ca * 12);
      c.look.set(p.x - ca * 3.6, 1.4, p.z + sa * 3.6);
      cp.position.copy(c.pos); cp.lookAt(c.look);
      c.init = false; c.fov = 56;
    } else {
      const sp = clamp(Math.abs(p.speed) / 31, 0, 1);
      const snapNow = !c.init;
      if (snapNow) { c.heading = p.heading; c.init = true; }
      let dh = p.heading - c.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      c.heading += dh * (1 - Math.exp(-4.5 * dt));
      const dist = 8.5 + 3 * sp, h = 4 + 1.3 * sp;
      const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
      const hx = p.x, hy = 1.6, hz = p.z;
      const dx = p.x - fx * dist, dy = h, dz = p.z - fz * dist;
      let k = 1;
      for (; k > 0.25; k -= 0.1) {
        const px = hx + (dx - hx) * k, py = hy + (dy - hy) * k, pz = hz + (dz - hz) * k;
        let hit = false;
        for (const b of m.district.buildings) {
          if (py < b.height + 0.5 && Math.abs(px - b.x) < b.w / 2 + 0.8 && Math.abs(pz - b.z) < b.d / 2 + 0.8) { hit = true; break; }
        }
        if (!hit) break;
      }
      const tx = hx + (dx - hx) * k, ty = hy + (dy - hy) * k, tz = hz + (dz - hz) * k;
      if (snapNow || !isFinite(c.pos.x) || Math.hypot(c.pos.x - tx, c.pos.z - tz) > 30) c.pos.set(tx, ty, tz);
      const f = 1 - Math.exp(-(k < 1 ? 14 : 9) * dt);
      c.pos.x += (tx - c.pos.x) * f; c.pos.y += (ty - c.pos.y) * f; c.pos.z += (tz - c.pos.z) * f;
      cp.position.copy(c.pos);
      c.look.set(p.x + fx * 6, 1.4, p.z + fz * 6);
      cp.lookAt(c.look);
      c.fov += ((58 + sp * 14) - c.fov) * (1 - Math.exp(-3 * dt));
    }
    if (Math.abs(cp.fov - c.fov) > 0.1) { cp.fov = c.fov; cp.updateProjectionMatrix(); }
    sky.position.copy(cp.position);
  });

  return (
    <>
      <color attach="background" args={['#e07a68']} />
      <fog attach="fog" args={['#e07a68', 90, 470]} />
      <hemisphereLight args={['#ffd7b0', '#5a3350', 1.5]} />
      <directionalLight position={[-120, 45, 60]} intensity={2.2} color="#ffb070" />
      <primitive object={sky} />
      <primitive object={city.group} />
      <primitive object={tuk.root} />
      <primitive object={traffic.group} />
      <primitive object={beacon.g} />
    </>
  );
}

export default function GameCanvas({ engine, quality }: { engine: GameEngine; quality: 'low' | 'medium' }) {
  const dpr = quality === 'low' ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
  return (
    <Canvas
      className="tt-canvas"
      dpr={dpr}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      camera={{ fov: 58, near: 0.5, far: 1200, position: [-282, 5, 40] }}
      style={{ touchAction: 'none' }}
    >
      <Scene engine={engine} />
    </Canvas>
  );
}
