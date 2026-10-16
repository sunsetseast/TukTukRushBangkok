import * as THREE from "three";
import { ASSETS, surface } from "./assets";
export type Tuk = {
  root: THREE.Group;
  lean: THREE.Group;
  steerPivot: THREE.Object3D;
  bars: THREE.Object3D;
  spins: THREE.Object3D[];
  passenger: THREE.Object3D;
  setLights: (night: number, braking: boolean) => void;
};
export function buildTuk(
  root: THREE.Group,
  textures: Map<string, THREE.Texture>,
): Tuk {
  const named = (name: string) => {
    const o = root.getObjectByName(name);
    if (!o) throw new Error(`Hero model missing ${name}`);
    return o;
  };
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.195),
    new THREE.MeshStandardMaterial({
      map: surface(textures, ASSETS.plate),
      roughness: 0.8,
    }),
  );
  plate.position.set(0, 0.76, -1.798);
  plate.rotation.y = Math.PI;
  named("Body").add(plate);
  const passenger = named("Passenger");
  passenger.visible = false;
  const lamps = new Set<THREE.MeshStandardMaterial>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      if (
        o.material instanceof THREE.MeshStandardMaterial &&
        ["lamp-lens", "tail-lens"].includes(o.material.name)
      )
        lamps.add(o.material);
    }
  });
  return {
    setLights(night, braking) {
      for (const m of lamps)
        m.emissiveIntensity =
          m.name === "tail-lens"
            ? braking
              ? 2.3
              : 0.6 + night * 0.9
            : 0.4 + night * 1.5;
    },
    root,
    lean: named("Body") as THREE.Group,
    steerPivot: named("Steering"),
    bars: named("Handlebars"),
    spins: ["SteeringSpin", "RearLeftSpin", "RearRightSpin"].map(named),
    passenger,
  };
}
