import * as T from 'three';
/** Eight original tactile finishes adapted from facadeFinish.ts. One sample
 * packs albedo, tangent relief (RG normal), roughness: 512KiB + mipmaps total.
 * No URLs, normal/PBR companion maps, env maps, lights or extra draws. */
export function geographicFinishTexture() {
  const size=128,layers=8,data=new Uint8Array(size*size*layers*4),height=new Float32Array(size*size);
  const rough=[.94,.97,.91,.42,.79,.32,.96,.21];
  for(let layer=0;layer<layers;layer++){
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const n=((Math.imul(x+19,73856093)^Math.imul(y+37,19349663))>>>0)%101/100;
      const cloud=Math.sin(x*Math.PI/32+Math.sin(y*Math.PI/32)) * Math.sin(y*Math.PI/64)*.5+.5;
      let a=.94+n*.035,h=n*.025,r=rough[layer]!;
      if(layer===0){a-=cloud*.04;h+=cloud*.04;}
      if(layer===1){a-=cloud*.065;h+=cloud*.025;}
      if(layer===2){const joint=y%16<1.3||(x+(Math.floor(y/16)%2)*16)%32<1.4;a=joint?.61:.88+n*.09;h=joint?-.2:n*.05;}
      if(layer===3){const joint=x%32<1.2||y%32<1.2;a=joint?.7:.97;h=joint?-.12:.01;r=joint?.9:.42;}
      if(layer===4){const grain=Math.sin(x*Math.PI/8+Math.sin(y*Math.PI/32));a=.84+n*.03+grain*.07;h=grain*.09;}
      if(layer===5){const rib=.5+.5*Math.cos(y*Math.PI/4);a=.79+rib*.19;h=rib*.2;}
      if(layer===6){a=.91+Math.sin(x*Math.PI/8)*.035+n*.025;h=Math.sin(x*Math.PI/8)*.04;}
      if(layer===7){a=.92+Math.sin(x*Math.PI/64)*.04;h=0;}
      const at=((layer*size+y)*size+x)*4;data[at]=Math.round(a*255);data[at+3]=Math.round(r*255);height[y*size+x]=h;
    }
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const at=(xx:number,yy:number)=>height[((yy+size)%size)*size+(xx+size)%size]!;
      const dx=(at(x-1,y)-at(x+1,y))*1.5,dy=(at(x,y-1)-at(x,y+1))*1.5,l=Math.hypot(dx,dy,1),i=((layer*size+y)*size+x)*4;
      data[i+1]=Math.round((dx/l*.5+.5)*255);data[i+2]=Math.round((dy/l*.5+.5)*255);
    }
  }
  const texture=new T.DataArrayTexture(data,size,size,layers);texture.name='Geographic architectural finishes / albedo-relief-roughness';texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
export type GeographicFinishState={night:{value:number};dusk:{value:number};detail:{value:number}};
/** Fragment lighting is bounded and independent of Three's dynamic light count.
 * Retains ArchitecturalBatch's existing merged UV tiles and instance surface IDs. */
export function installGeographicFinish(material:T.MeshBasicMaterial,texture:T.DataArrayTexture,state:GeographicFinishState){
 material.onBeforeCompile=shader=>{
  shader.uniforms.geoFinish={value:texture};shader.uniforms.geoNight=state.night;shader.uniforms.geoDusk=state.dusk;shader.uniforms.geoDetail=state.detail;
  shader.vertexShader=`attribute vec3 artGlow;varying vec3 geoGlow;varying vec3 geoWorld;varying vec3 geoNormal;varying vec2 geoMetric;varying vec2 geoEdge;varying float geoLayer;\n#ifdef USE_INSTANCING\nattribute float artSurface;\n#endif\n`+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   geoGlow=artGlow;vec4 world=vec4(position,1.);vec3 gn=normal;
   vec2 tile=floor(uv*vec2(4.,2.));geoLayer=tile.x+tile.y*4.;geoEdge=(uv*vec2(4.,2.)-tile-vec2(.025))/.95;
   #ifdef USE_INSTANCING
   world=instanceMatrix*world;
   vec3 extent=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
   gn=mat3(instanceMatrix)*(gn/max(extent*extent,vec3(.0001)));geoLayer=artSurface;geoEdge=uv;
   #endif
   geoWorld=(modelMatrix*world).xyz;geoNormal=normalize(mat3(modelMatrix)*gn);
   vec3 an=abs(geoNormal);geoMetric=an.y>.6?geoWorld.xz:(an.x>an.z?geoWorld.zy:geoWorld.xy);
  `);
  shader.fragmentShader=`varying vec3 geoGlow;uniform highp sampler2DArray geoFinish;uniform float geoNight,geoDusk,geoDetail;varying vec3 geoWorld,geoNormal;varying vec2 geoMetric,geoEdge;varying float geoLayer;\n`+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float layer=floor(geoLayer+.5);vec4 finish=texture(geoFinish,vec3(geoMetric/1.8,layer));
   vec3 n=normalize(geoNormal);
   if(geoDetail>.5){vec3 axis=abs(n.y)>.8?vec3(1.,0.,0.):normalize(cross(vec3(0.,1.,0.),n)),up=cross(n,axis);n=normalize(n+(axis*(finish.g*2.-1.)+up*(finish.b*2.-1.))*.75);}
   vec3 sun=normalize(mix(vec3(-.45,.82,-.35),vec3(-.895,.31,-.435),geoDusk));float direct=max(0.,dot(n,sun));
   vec3 dayFill=mix(vec3(.56,.64,.76),vec3(.38,.43,.62),geoDusk);
   vec3 dayKey=mix(vec3(.92,.87,.70),vec3(1.32,.78,.38),geoDusk);
   vec3 lit=mix(dayFill+dayKey*direct,vec3(.095,.135,.23)+vec3(.12,.17,.26)*direct,geoNight);
   float edge=smoothstep(0.,.08,min(min(geoEdge.x,1.-geoEdge.x),min(geoEdge.y,1.-geoEdge.y)));
   float ao=mix(.84,1.,edge);diffuseColor.rgb*=finish.r*lit*ao;
   float polished=step(4.5,layer)*(1.-step(5.5,layer))+step(6.5,layer);
   if(polished>.5){
    vec3 viewDir=normalize(cameraPosition-geoWorld);
    if(geoDetail>.5){vec3 halfDir=normalize(sun+viewDir);float spec=pow(max(0.,dot(n,halfDir)),mix(10.,55.,1.-finish.a));diffuseColor.rgb+=vec3(1.,.82,.54)*spec*.32*(1.-geoNight*.7);}
    if(layer>6.5){float fresnel=pow(1.-abs(dot(n,viewDir)),3.);diffuseColor.rgb+=(vec3(.065,.13,.18)*fresnel+vec3(.02,.035,.045))*(1.-geoNight*.8);}
   }
   diffuseColor.rgb+=geoGlow*geoNight;
  `);
 };
 material.customProgramCacheKey=()=> 'geographic-premium-packed-finish-v1';
 // Explicit ownership/introspection. Disposed by the scene, never by chunks.
 material.userData.finishTexture=texture;
}
