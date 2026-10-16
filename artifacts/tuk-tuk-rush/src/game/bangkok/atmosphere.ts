import * as T from "three";
/** Vertex-lit atmosphere: expensive sky math runs on a small dome, not every pixel. */
export function citySky() {
  const night = { value: 0 },
    dusk = { value: 0 };
  const mat = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { night, dusk },
    vertexShader: `varying vec3 skyColor;uniform float night;uniform float dusk;
 void main(){
 vec3 dir=normalize(position);float h=smoothstep(-.04,.72,dir.y);
 vec3 dark=mix(vec3(.085,.135,.215),vec3(.016,.037,.085),h);
 skyColor=dark;
 if(night<.999){
 vec3 sunset=mix(vec3(.88,.49,.29),vec3(.22,.37,.55),h);
 vec3 twilight=mix(vec3(.57,.31,.42),vec3(.12,.18,.36),h);
 float alignment=max(0.,dot(dir,vec3(-.869609,.219901,.439802)));
 float halo=pow(alignment,28.);
 skyColor=mix(mix(sunset,twilight,dusk),dark,night);
 skyColor+=halo*vec3(.22,.065,.012)*(1.-night);
 float band=sin(dir.x*17.+dir.z*9.+sin(dir.z*24.)*.65)*.5+.5;
 float cloud=smoothstep(.7,.92,band)*smoothstep(.1,.2,dir.y)*(1.-smoothstep(.27,.42,dir.y));
 skyColor=mix(skyColor,mix(vec3(.72,.47,.40),vec3(.14,.19,.29),night),cloud*.17*(1.-night));
 }
 gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
 }`,
    fragmentShader:
      "varying vec3 skyColor;void main(){gl_FragColor=vec4(skyColor,1.);}",
  });
  const root = new T.Mesh(new T.SphereGeometry(500, 48, 24), mat);
  root.renderOrder = -100;
  // A tiny geometric disc keeps the sunset crisp without a screen-wide pow/smoothstep.
  const sunMaterial = new T.MeshBasicMaterial({
    color: "#ffcc83",
    fog: false,
    toneMapped: false,
    transparent: true,
    depthWrite: false,
  });
  const sun = new T.Mesh(new T.CircleGeometry(5.2, 24), sunMaterial);
  sun.position.set(-0.869609, 0.219901, 0.439802).multiplyScalar(490);
  sun.lookAt(0, 0, 0);
  sun.renderOrder = -99;
  root.add(sun);
  return {
    root,
    update(camera: T.Vector3, value: number, twilight = 0) {
      root.position.copy(camera);
      night.value = value;
      dusk.value = twilight;
      sunMaterial.opacity = 1 - value;
      sun.visible = value < 0.995;
    },
  };
}
