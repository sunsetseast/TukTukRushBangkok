import * as T from "three";
import { StaticBatch } from "../staticBatch";

/** Original low-poly authored silhouettes, baked into two materials per site. */
export class LandmarkBuilder {
  // A landmark is already culled as a whole LOD. Subdividing its local facade
  // into 80m city cells multiplies draw calls without improving culling.
  private batch = new StaticBatch(256, 512);
  private plain = new T.MeshStandardMaterial({ roughness: 0.8 });
  readonly light = new T.MeshStandardMaterial({
    roughness: 0.42,
    metalness: 0.15,
    emissive: "#ffc886",
    emissiveIntensity: 0,
  });
  private unit = new T.BoxGeometry();
  private finishes=new Map<string,T.MeshStandardMaterial>();
  sculpt(geo:T.BufferGeometry,x:number,y:number,z:number,color:string,finish:'gilded'|'ceramic'|'glass'|'bronze'='ceramic',yaw=0){
    let mat=this.finishes.get(finish);if(!mat){mat=new T.MeshStandardMaterial({roughness:finish==='gilded'?.49:finish==='glass'?.25:.67,metalness:finish==='gilded'?.64:finish==='bronze'?.5:finish==='glass'?.3:.03});this.finishes.set(finish,mat);}
    this.painted(geo,mat,x,y,z,color,yaw);
  }
  painted(geo:T.BufferGeometry,mat:T.Material,x:number,y:number,z:number,color='#ffffff',yaw=0){
    this.temp.position.set(x,y,z);this.temp.rotation.set(0,yaw,0);this.temp.scale.set(1,1,1);this.temp.updateMatrix();this.batch.add(geo,mat,[this.temp.matrix.clone()],[new T.Color(color)]);
  }
  private temp = new T.Object3D();
  shape(
    geo: T.BufferGeometry,
    x: number,
    y: number,
    z: number,
    color: string,
    yaw = 0,
    lit = false,
  ) {
    this.temp.position.set(x, y, z);
    this.temp.rotation.set(0, yaw, 0);
    this.temp.scale.set(1, 1, 1);
    this.temp.updateMatrix();
    this.batch.add(
      geo,
      lit ? this.light : this.plain,
      [this.temp.matrix.clone()],
      [new T.Color(color)],
    );
  }
  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    yaw = 0,
    lit = false,
  ) {
    this.temp.position.set(x, y, z);
    this.temp.rotation.set(0, yaw, 0);
    this.temp.scale.set(w, h, d);
    this.temp.updateMatrix();
    this.batch.add(
      this.unit,
      lit ? this.light : this.plain,
      [this.temp.matrix.clone()],
      [new T.Color(color)],
    );
  }
  prang(x: number, z: number, h: number, r: number, color: string) {
    const profile: [[number, number], ...Array<[number, number]>] = [
      [0, 0],
      [0.85, 0],
      [1, 0.04],
      [0.76, 0.075],
      [0.88, 0.13],
      [0.58, 0.18],
      [0.71, 0.24],
      [0.44, 0.31],
      [0.5, 0.39],
      [0.39, 0.5],
      [0.3, 0.61],
      [0.21, 0.72],
      [0.14, 0.82],
      [0.075, 0.91],
      [0, 1],
    ];
    const g = new T.LatheGeometry(
      profile.map(([a, b]) => new T.Vector2(a * r, b * h)),
      12,
    );
    this.shape(g, x, 0.25, z, color);
    for (const y of [0.1, 0.23, 0.4, 0.61]) {
      const rr = r * (0.9 - y);
      this.shape(
        new T.CylinderGeometry(rr, rr, 0.24, 12),
        x,
        y * h + 0.25,
        z,
        "#baab83",
      );
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        this.box(
          x + Math.sin(a) * rr,
          y * h + 0.65,
          z + Math.cos(a) * rr,
          0.34,
          0.7,
          0.34,
          i % 2 ? "#638d82" : "#d9b86d",
          a,
        );
      }
    }
  }
  roof(
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    h: number,
    color: string,
  ) {
    const profile = new T.Shape([
      new T.Vector2(-w / 2, h * 0.3),
      new T.Vector2(-w * 0.42, 0),
      new T.Vector2(0, h),
      new T.Vector2(w * 0.42, 0),
      new T.Vector2(w / 2, h * 0.3),
      new T.Vector2(w * 0.42, 0.25),
      new T.Vector2(0, h + 0.25),
      new T.Vector2(-w * 0.42, 0.25),
    ]);
    this.shape(
      new T.ExtrudeGeometry(profile, {
        depth: d,
        bevelEnabled: false,
        curveSegments: 2,
      }).translate(0, 0, -d / 2),
      x,
      y,
      z,
      color,
    );
    for (const side of [-1, 1])
      this.box(
        x + side * w * 0.45,
        y + 0.25,
        z,
        0.24,
        0.24,
        d + 0.3,
        "#e5be6d",
        0,
        true,
      );
  }
  finish(id: string) {
    const root = new T.Group();
    root.userData.authoredAsset = id;
    for (const g of this.batch.finish()) root.add(g);
    root.userData.nightMaterials = root.children
      .flatMap((g) => g.children.map((m) => (m as T.Mesh).material))
      .filter((m) => (m as T.MeshStandardMaterial).emissive?.getHex() > 0);
    return root;
  }
}
