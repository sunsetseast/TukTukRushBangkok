import { useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { GeographicTrafficSimulation } from "./traffic";
import type { GeographicNetwork } from "./network";
import type { GeographicSession } from "./session";
import type { RuntimeControlPack } from "./controlImport";
import { loadVerifiedTrafficControls, sourceApproachControls } from "./trafficControlRuntime";
import { TrafficSignActors } from "./TrafficSignActors";

type FleetMesh = T.InstancedMesh<T.BoxGeometry, T.MeshStandardMaterial>;
type Fleet = {
  root: T.Group;
  simulation: GeographicTrafficSimulation;
  carBody: FleetMesh;
  carRoof: FleetMesh;
  motorbike: FleetMesh;
  tukBody: FleetMesh;
  tukRoof: FleetMesh;
  dispose: () => void;
};
const colors = {
  taxi: new T.Color("#f567af"),
  car: new T.Color("#e2e8ec"),
  motorcycle: new T.Color("#345fdb"),
  tuktuk: new T.Color("#2d9e89"),
};
const ROUGHNESS = .66;
const CAPACITY = 16;

/** Small batched placeholders for living traffic, not individualized photo-real
 * Bangkok models. Fixed draw call budget, fixed pool, zero per-car mesh allocation.
 */
function makeFleet(network: GeographicNetwork, pack: RuntimeControlPack | null): Fleet {
  const simulation = new GeographicTrafficSimulation(
    network,20261102,sourceApproachControls(pack),pack?.restrictions ?? [],
  );
  const root = new T.Group();
  root.name = "GeographicMotorTraffic";
  const make = (w: number, h: number, l: number): FleetMesh => {
    const m = new T.InstancedMesh(
      new T.BoxGeometry(w, h, l),
      new T.MeshStandardMaterial({ color: "#ffffff", roughness: ROUGHNESS }),
      CAPACITY,
    );
    m.count = 0;
    // A tiny 16-unit stream is safer and cheaper than per-instance frustum bounds.
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(T.DynamicDrawUsage);
    root.add(m);
    return m;
  };
  const carBody = make(1.65, .72, 3.05),
    carRoof = make(1.35, .52, 1.65),
    motorbike = make(.65, .65, 1.65),
    tukBody = make(1.35, .82, 2.4),
    tukRoof = make(1.46, .16, 1.95);
  const meshes = [carBody, carRoof, motorbike, tukBody, tukRoof];
  return {
    root, simulation, carBody, carRoof, motorbike, tukBody, tukRoof,
    dispose: () => {
      for (const mesh of meshes) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    },
  };
}
export function TrafficActors({
  network, session, enabled,
}: {
  network: GeographicNetwork;
  session: GeographicSession;
  enabled: boolean;
}) {
  const [pack,setPack]=useState<RuntimeControlPack|null>(null);
  useEffect(()=>{
    let cancelled=false;
    void loadVerifiedTrafficControls(network).then(result=>{
      if(!cancelled)setPack(result);
    });
    return ()=>{cancelled=true;};
  },[network]);
  const fleet = useMemo(() => makeFleet(network,pack), [network,pack]);
  useEffect(() => () => fleet.dispose(), [fleet]);
  const dummy = useMemo(() => new T.Object3D(), []);
  useFrame((_, delta) => {
    const sim = fleet.simulation;
    const active = enabled && session.model.snapshot.phase === "playing";
    sim.update(delta, session.player, active, session.model.snapshot.quality);
    const car = { count: 0 }, motor = { count: 0 }, tuk = { count: 0 };
    const place = (
      mesh: FleetMesh, index: number, x: number, y: number, z: number,
      yaw: number, shade: T.Color,
    ) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, shade);
    };
    for (const v of sim.vehicles) {
      if (v.kind === "car" || v.kind === "taxi") {
        const i = car.count++;
        place(fleet.carBody, i, v.x, v.y + .54, v.z, v.heading, colors[v.kind]);
        place(fleet.carRoof, i, v.x - Math.sin(v.heading) * .1,
          v.y + 1.13, v.z - Math.cos(v.heading) * .1, v.heading, colors[v.kind]);
      } else if (v.kind === "motorcycle") {
        place(fleet.motorbike, motor.count++, v.x, v.y + .54, v.z,
          v.heading, colors.motorcycle);
      } else {
        const i = tuk.count++;
        place(fleet.tukBody, i, v.x, v.y + .57, v.z, v.heading, colors.tuktuk);
        place(fleet.tukRoof, i, v.x, v.y + 1.55, v.z, v.heading, colors.tuktuk);
      }
    }
    for (const [mesh, count] of [
      [fleet.carBody, car.count], [fleet.carRoof, car.count],
      [fleet.motorbike, motor.count],
      [fleet.tukBody, tuk.count], [fleet.tukRoof, tuk.count],
    ] as const) {
      mesh.count = count;
      if (count) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
    if (import.meta.env.DEV && new URLSearchParams(location.search).has("geographyQA"))
      (window as any).__geographicTraffic = {
        active: sim.vehicles.length,
        spawned: sim.stats.spawned,
        removed: sim.stats.removed,
        actors: sim.vehicles.map(v => ({
          id: v.id, kind: v.kind, edge: v.edge, from: v.from, to: v.to,
          x: v.x, z: v.z, speed: v.speed,
        })),
      };
  });
  return <><primitive object={fleet.root} />
    <TrafficSignActors pack={pack} session={session} enabled={enabled} simulation={fleet.simulation}/>
  </>;
}
