import * as T from "three";
export function citySky() {
  const night = { value: 0 }, dusk={value:0},
    mat = new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { night,dusk },
      vertexShader:
        "varying vec3 skyDirection;void main(){skyDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec3 skyDirection;uniform float night;uniform float dusk;void main(){float h=smoothstep(-.06,.75,skyDirection.y);vec3 day=mix(vec3(.84,.52,.33),vec3(.32,.48,.63),h);vec3 dark=mix(vec3(.11,.15,.23),vec3(.024,.055,.11),h);float sunset=pow(max(0.,dot(normalize(skyDirection),normalize(vec3(-.7,.1,-.6)))),20.);gl_FragColor=vec4(mix(mix(day+sunset*vec3(.2,.06,.01),mix(vec3(.65,.35,.46),vec3(.2,.23,.48),h),dusk),dark,night),1.);}",
    }),
    root = new T.Mesh(new T.SphereGeometry(500, 24, 12), mat);
  root.renderOrder = -100;
  return {
    root,
    update(camera: T.Vector3, value: number, twilight=0) {
      root.position.copy(camera);
      night.value = value;dusk.value=twilight;
    },
  };
}
