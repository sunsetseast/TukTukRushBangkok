import * as T from "three";
import type { District } from "../types";
import { planEnvironment } from "./environmentPlan";
/** Bounded spill and signal lenses; no grid of real-time point lights. */
export function environmentEffects(d: District) {
  const root = new T.Group(),
    sites = planEnvironment(d),
    lamps = sites.filter((s) =>
      ["lamp", "noodle", "grill", "tea"].includes(s.kind),
    ),
    signals = sites.filter((s) => s.kind === "signal"),
    night = { value: 0 };
  root.name = "BangkokEnvironmentEffects";
  const mat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    uniforms: { night },
    vertexShader:
      "varying vec2 localUV;void main(){localUV=uv;vec4 p=vec4(position,1.);\n#ifdef USE_INSTANCING\np=instanceMatrix*p;\n#endif\ngl_Position=projectionMatrix*modelViewMatrix*p;}",
    fragmentShader:
      "varying vec2 localUV;uniform float night;void main(){float a=pow(max(0.,1.-length(localUV-.5)*2.),2.);gl_FragColor=vec4(.95,.48,.14,a*night*.24);}",
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
  const temp = new T.Object3D(),
    color = new T.Color();
  return {
    root,
    update(
      camera: T.Vector3,
      quality: string,
      n: number,
      horizontalGreen: boolean,
    ) {
      night.value = n;
      let slot = 0;
      for (const l of lamps) {
        if (
          slot >= (quality === "low" ? 32 : 64) ||
          Math.hypot(l.body.x - camera.x, l.body.z - camera.z) > 145
        )
          continue;
        temp.position.set(l.body.x, 0.245, l.body.z);
        temp.rotation.set(0, l.body.yaw ?? 0, 0);
        temp.scale.set(1, 1, 1);
        temp.updateMatrix();
        spill.setMatrixAt(slot++, temp.matrix);
      }
      spill.count = slot;
      spill.visible = n > 0.01;
      spill.instanceMatrix.needsUpdate = true;
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
