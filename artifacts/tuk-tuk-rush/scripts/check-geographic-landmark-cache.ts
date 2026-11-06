import assert from 'node:assert/strict';
import * as T from 'three';
import {releaseMigratedArtGPU,disposeMigratedArt} from '../src/game/bangkok/geographic/migratedArt';
class Bitmap {closed=false;close(){this.closed=true;}}
Object.assign(globalThis,{ImageBitmap:Bitmap});
const bitmap=new Bitmap(), texture=new T.Texture(bitmap as any), material=new T.MeshStandardMaterial({map:texture}),geometry=new T.BoxGeometry();
const root=new T.Group(),parent=new T.Group();root.add(new T.Mesh(geometry,material));parent.add(root);
let textures=0,materials=0,geometries=0;
texture.addEventListener('dispose',()=>textures++);material.addEventListener('dispose',()=>materials++);geometry.addEventListener('dispose',()=>geometries++);
releaseMigratedArtGPU(root);
assert.equal(root.parent,null);assert.equal(root.children.length,1);assert(!bitmap.closed);assert.equal(textures,1);assert.equal(materials,1);assert.equal(geometries,1);
parent.add(root);assert(geometry.getAttribute('position').count>0);assert.equal(texture.image,bitmap);
releaseMigratedArtGPU(root);assert(!bitmap.closed);assert.equal(root.children.length,1);
disposeMigratedArt(root);assert(bitmap.closed);assert.equal(root.children.length,0);
console.log({pass:true,evictionReleasesGPU:true,CPUArtworkReusable:true,texturePixelsRetainedUntilFinalDisposal:true});
