import * as THREE from "three";
import { ASSETS, surface } from "./assets";
export type Tuk = {
  root: THREE.Group;
  lean: THREE.Group;
  steerPivot: THREE.Object3D;
  bars: THREE.Object3D;
  spins: THREE.Object3D[];
  passenger: THREE.Object3D;
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
  plate.position.set(0, 0.78, -1.718);
  plate.rotation.y = Math.PI;
  named("Body").add(plate);
  const passenger = named("Passenger");
  passenger.visible = false;
  return {
    root,
    lean: named("Body") as THREE.Group,
    steerPivot: named("Steering"),
    bars: named("Handlebars"),
    spins: ["SteeringSpin", "RearLeftSpin", "RearRightSpin"].map(named),
    passenger,
  };
}
