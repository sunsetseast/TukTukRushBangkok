import * as T from "three";
/** One analytic sky dome: directional warmth, clear horizon and restrained cloud ribbons. */
export function citySky() {
  const night = { value: 0 },
    dusk = { value: 0 };
  const mat = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { night, dusk },
    vertexShader: `varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 skyDirection;uniform float night;uniform float dusk;
 void main(){
 vec3 dir=normalize(skyDirection);float h=smoothstep(-.04,.72,dir.y);
 vec3 dark=mix(vec3(.085,.135,.215),vec3(.016,.037,.085),h);
 // Uniform branch: a fully nocturnal sky needs neither sun nor cloud trigonometry.
 if(night>=.999){gl_FragColor=vec4(dark,1.);return;}
 vec3 sunset=mix(vec3(.88,.49,.29),vec3(.22,.37,.55),h);
 vec3 twilight=mix(vec3(.57,.31,.42),vec3(.12,.18,.36),h);
 float alignment=max(0.,dot(dir,vec3(-.869609,.219901,.439802)));
 float halo=pow(alignment,28.),disc=smoothstep(.9990,.99965,alignment);
 vec3 sky=mix(mix(sunset,twilight,dusk),dark,night);
 sky+=(halo*vec3(.22,.065,.012)+disc*vec3(1.,.69,.34))*(1.-night);
 float band=sin(dir.x*17.+dir.z*9.+sin(dir.z*24.)*.65)*.5+.5;
 float cloud=smoothstep(.7,.92,band)*smoothstep(.1,.2,dir.y)*(1.-smoothstep(.27,.42,dir.y));
 sky=mix(sky,mix(vec3(.72,.47,.40),vec3(.14,.19,.29),night),cloud*.17*(1.-night));
 gl_FragColor=vec4(sky,1.);}
`,
  });
  const root = new T.Mesh(new T.SphereGeometry(500, 24, 12), mat);
  root.renderOrder = -100;
  return {
    root,
    update(camera: T.Vector3, value: number, twilight = 0) {
      root.position.copy(camera);
      night.value = value;
      dusk.value = twilight;
    },
  };
}
