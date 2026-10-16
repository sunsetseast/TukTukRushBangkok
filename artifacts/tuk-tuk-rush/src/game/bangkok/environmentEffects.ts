import * as T from "three";
import { cinematicParcel } from "./yaowarat";
import { designBuildings, type ParcelDesign } from "./buildingGrammar";
import type { District } from "../types";
import { planEnvironment } from "./environmentPlan";
/** Bounded spill and signal lenses; no grid of real-time point lights. */
export function environmentEffects(
  d: District,
  designs: ParcelDesign[] = designBuildings(d),
) {
  const root = new T.Group(),
    sites = planEnvironment(d),
    lamps = sites.filter((s) =>
      ["lamp", "noodle", "grill", "tea", "wok", "dessert"].includes(s.kind),
    ),
    signals = sites.filter((s) => s.kind === "signal"),
    night = { value: 0 };
  root.name = "BangkokEnvironmentEffects";
  const frontages = designs
    .filter((p) => p.hero && !p.parcel.artRole)
    .flatMap((p) =>
      p.bays
        .filter((a) => a.occupied)
        .map((a) => {
          const yaw = p.parcel.yaw ?? 0,
            s = Math.sin(yaw),
            c = Math.cos(yaw),
            v = a.front + (cinematicParcel(p) ? 4.1 : 1.8);
          return {
            body: {
              x: p.parcel.x + c * a.u + s * v,
              z: p.parcel.z - s * a.u + c * v,
              yaw,
            },
            tint: cinematicParcel(p)
              ? a.trade === "gold"
                ? "#efb25f"
                : a.trade === "noodle"
                  ? "#ef7857"
                  : "#4fb7bb"
              : a.trade === "gold"
                ? "#eac581"
                : ["siam", "silom", "sukhumvit"].includes(p.region)
                  ? "#8eb9d7"
                  : a.trade === "noodle"
                    ? "#e7a275"
                    : "#cba982",
            scale: Math.min(1.2, a.width / 10),
          };
        }),
    );
  const pools = [
    ...lamps.map((s) => ({ body: s.body, tint: "#f5bc75", scale: 1 })),
    ...frontages,
  ];
  const mat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    uniforms: { night },
    vertexShader:
      "varying vec2 localUV;varying vec3 spillTint;void main(){localUV=uv;spillTint=vec3(1.);\n#ifdef USE_INSTANCING_COLOR\nspillTint=instanceColor;\n#endif\nvec4 p=vec4(position,1.);\n#ifdef USE_INSTANCING\np=instanceMatrix*p;\n#endif\ngl_Position=projectionMatrix*modelViewMatrix*p;}",
    fragmentShader:
      "varying vec2 localUV;varying vec3 spillTint;uniform float night;void main(){float a=pow(max(0.,1.-length(localUV-.5)*2.),2.);gl_FragColor=vec4(spillTint,a*night*.19);}",
  });
  const spill = new T.InstancedMesh(
    new T.PlaneGeometry(12, 10).rotateX(-Math.PI / 2),
    mat,
    64,
  );
  spill.name = "BangkokSpill";
  spill.userData.environmentEffect = true;
  spill.frustumCulled = false;
  root.add(spill);
  const lenses = new T.InstancedMesh(
    new T.SphereGeometry(0.16, 6, 4),
    new T.MeshBasicMaterial({ color: "#ffffff" }),
    Math.max(1, signals.length),
  );
  lenses.name = "BangkokSignalLenses";
  lenses.userData.environmentEffect = true;
  lenses.frustumCulled = false;
  root.add(lenses);
  const cooking = sites.filter((s) =>
      ["noodle", "grill", "wok"].includes(s.kind),
    ),
    steamPositions = new Float32Array(32 * 3);
  const steamGeo = new T.BufferGeometry();
  steamGeo.setAttribute("position", new T.BufferAttribute(steamPositions, 3));
  const steam = new T.Points(
    steamGeo,
    new T.PointsMaterial({
      color: "#e3d5c1",
      size: 0.6,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  (steam.material as T.PointsMaterial).onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_particle_fragment>",
      "#include <map_particle_fragment>\ndiffuseColor.a*=pow(max(0.,1.-length(gl_PointCoord-.5)*2.),2.);",
    );
  };
  (steam.material as T.PointsMaterial).customProgramCacheKey = () =>
    "bangkok-soft-steam-v1";
  steam.name = "BangkokCookingSteam";
  steam.frustumCulled = false;
  root.add(steam);
  const temp = new T.Object3D(),
    color = new T.Color();
  return {
    root,
    update(
      camera: T.Vector3,
      quality: string,
      n: number,
      horizontalGreen: boolean,
      time = 0,
    ) {
      night.value = 0.12 + n * 0.88;
      let particle = 0;
      for (const site of cooking) {
        if (
          particle >= (quality === "low" ? 16 : 32) ||
          Math.hypot(site.body.x - camera.x, site.body.z - camera.z) > 70
        )
          continue;
        for (let j = 0; j < 3 && particle < 32; j++) {
          const life = (time * 0.4 + j * 0.33 + site.seed * 0.01) % 1,
            idx = particle++ * 3;
          steamPositions[idx] =
            site.body.x + Math.sin(time + site.seed + j) * 0.28;
          steamPositions[idx + 1] = 1.8 + life * 1.9;
          steamPositions[idx + 2] =
            site.body.z + Math.cos(time * 0.7 + j) * 0.2;
        }
      }
      steamGeo.setDrawRange(0, particle);
      steamGeo.attributes.position!.needsUpdate = true;
      let slot = 0;
      for (const l of pools) {
        if (
          slot >= (quality === "low" ? 32 : 64) ||
          Math.hypot(l.body.x - camera.x, l.body.z - camera.z) > 145
        )
          continue;
        temp.position.set(l.body.x, 0.245, l.body.z);
        temp.rotation.set(0, l.body.yaw ?? 0, 0);
        temp.scale.set(l.scale, 1, 0.75);
        temp.updateMatrix();
        spill.setColorAt(slot, color.set(l.tint));
        spill.setMatrixAt(slot++, temp.matrix);
      }
      spill.count = slot;
      spill.visible = true;
      spill.instanceMatrix.needsUpdate = true;
      if (spill.instanceColor) spill.instanceColor.needsUpdate = true;
      signals.forEach((l, i) => {
        const green = l.axis === horizontalGreen,
          yaw = l.body.yaw ?? 0;
        temp.position.set(
          l.body.x + Math.sin(yaw) * 0.36,
          green ? 5.2 : 6.2,
          l.body.z + Math.cos(yaw) * 0.36,
        );
        temp.rotation.set(0, 0, 0);
        temp.scale.set(1, 1, 1);
        temp.updateMatrix();
        lenses.setMatrixAt(i, temp.matrix);
        color.set(green ? "#70e5a6" : "#f17362");
        lenses.setColorAt(i, color);
      });
      lenses.count = signals.length;
      lenses.instanceMatrix.needsUpdate = true;
      if (lenses.instanceColor) lenses.instanceColor.needsUpdate = true;
    },
  };
}
