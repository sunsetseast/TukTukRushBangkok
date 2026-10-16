import * as T from "three";
/** Shared key direction keeps the sky disc, local shadows and baked street shadows coherent. */
export const SUN_DIRECTION = new T.Vector3(-0.895, 0.31, -0.435).normalize();
/** Clouds/atmospheric colour are evaluated per dome vertex. One draw, no postprocess. */
export function citySky() {
  const night = { value: 0 },
    dusk = { value: 0 };
  const mat = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    uniforms: {
      night,
      dusk,
      horizon: { value: new T.Color("#ffc278") },
      zenith: { value: new T.Color("#7264b1") },
      pink: { value: new T.Color("#ed8caa") },
      blue: { value: new T.Color("#42427e") },
      nightLow: { value: new T.Color("#38486e") },
      nightHigh: { value: new T.Color("#101d40") },
      cloudGold: { value: new T.Color("#ffd2a5") },
      cloudPink: { value: new T.Color("#ed90bd") },
    },
    vertexShader: `varying vec3 skyColor;uniform float night;uniform float dusk;
   uniform vec3 horizon,zenith,pink,blue,nightLow,nightHigh,cloudGold,cloudPink;
   void main(){vec3 dir=normalize(position);float h=smoothstep(-.07,.85,dir.y);
   vec3 day=mix(horizon,zenith,h),twilight=mix(pink,blue,h),dark=mix(nightLow,nightHigh,h);
   skyColor=mix(mix(day,twilight,dusk),dark,night);
   float alignment=max(0.,dot(dir,normalize(vec3(-.895,.12,-.435))));
   skyColor+=pow(alignment,30.)*vec3(.13,.055,.012)*(1.-night);
   float ribbon=sin(dir.x*21.+dir.z*9.+sin(dir.z*17.+dir.y*11.)*1.2);
   float fine=sin(dir.z*35.-dir.x*13.+dir.y*31.)*.18;
   float cloud=smoothstep(.32,.85,ribbon+fine)*smoothstep(.035,.14,dir.y)*(1.-smoothstep(.25,.48,dir.y));
   skyColor=mix(skyColor,mix(cloudGold,cloudPink,dusk),cloud*.54*(1.-night));
   gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 skyColor;void main(){gl_FragColor=vec4(skyColor,1.);
   #include <colorspace_fragment>
  }`,
  });
  const root = new T.Mesh(new T.SphereGeometry(500, 64, 32), mat);
  root.renderOrder = -100;
  const sunMat = new T.MeshBasicMaterial({
    color: "#ffe39c",
    fog: false,
    toneMapped: false,
    transparent: true,
    depthWrite: false,
  });
  const sun = new T.Mesh(new T.CircleGeometry(8, 32), sunMat);
  sun.renderOrder = -99;
  root.add(sun);
  return {
    root,
    update(camera: T.Vector3, value: number, twilight = 0) {
      root.position.copy(camera);
      night.value = value;
      dusk.value = twilight;
      sun.position
        .set(-0.895, 0.13 - twilight * 0.2, -0.435)
        .normalize()
        .multiplyScalar(489);
      sun.lookAt(0, 0, 0);
      sunMat.opacity = 1 - T.MathUtils.smoothstep(twilight, 0.2, 0.9);
      sun.visible = sunMat.opacity > 0.005;
    },
  };
}
