import * as T from 'three';
/** Low-poly vertex sky derived from the condensed world's atmospheric ribbons.
 * Camera translation only; world orientation remains fixed. One opaque draw. */
export function geographicSky(){
 const dusk={value:0},night={value:0};
 const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,toneMapped:false,uniforms:{dusk,night},vertexShader:`varying vec3 skyColor;uniform float dusk,night;
 void main(){vec3 d=normalize(position);float h=smoothstep(-.08,.85,d.y);
 vec3 day=mix(vec3(.67,.82,.91),vec3(.16,.40,.66),h);
 vec3 gold=mix(vec3(1.,.60,.32),vec3(.30,.27,.53),h);
 vec3 dark=mix(vec3(.045,.075,.14),vec3(.009,.019,.055),h);
 skyColor=mix(mix(day,gold,dusk),dark,night);
 float ribbons=sin(d.x*21.+d.z*9.+sin(d.z*17.+d.y*11.)*1.2);
 float clouds=smoothstep(.35,.86,ribbons)*smoothstep(.04,.13,d.y)*(1.-smoothstep(.25,.48,d.y));
 skyColor=mix(skyColor,mix(vec3(.86,.92,.96),vec3(1.,.74,.57),dusk),clouds*.42*(1.-night));
 gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 skyColor;void main(){gl_FragColor=vec4(skyColor,1.);#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
 const root=new T.Mesh(new T.SphereGeometry(1800,40,20),material);root.name='Geographic cinematic sky';root.renderOrder=-100;
 return{root,setTime(time:'day'|'dusk'|'night'){dusk.value=time==='dusk'?1:0;night.value=time==='night'?1:0;},dispose(){root.geometry.dispose();material.dispose();}};
}
