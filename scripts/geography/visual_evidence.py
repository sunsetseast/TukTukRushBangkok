#!/usr/bin/env python3
"""Two reproducible comparison figures. Right overhead panel is a real WebGL capture."""
import json,gzip,pathlib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
from matplotlib.path import Path
from matplotlib.patches import PathPatch
from PIL import Image
from pyproj import Transformer
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/real-scale'
s=json.loads(gzip.decompress((ROOT/'data/bangkok/real-scale/source.v1.json.gz').read_bytes()))
r=json.loads(gzip.decompress((ROOT/'artifacts/tuk-tuk-rush/public/assets/geography/runtime.v1.json.gz').read_bytes()))
proj=Transformer.from_crs(4326,32647,always_xy=True)
def xy(p):
 e,n=proj.transform(p[0],p[1]);return (e-660000,1520000-n)
def polygon(ax,rings,fill):
 vertices=[];codes=[]
 for ring in rings:
  vertices.extend(ring);codes.extend([Path.MOVETO]+[Path.LINETO]*(len(ring)-2)+[Path.CLOSEPOLY])
 ax.add_patch(PathPatch(Path(vertices,codes),facecolor=fill,edgecolor='none'))
def setup(ax):
 ax.set_facecolor('#c4cebb');ax.set_aspect('equal');ax.tick_params(labelsize=7);ax.set_xlabel('meters east of fixed origin',fontsize=8);ax.set_ylabel('meters south of fixed origin',fontsize=8)
def source_water(ax):
 for w in s['water']:
  for p in w['geometry']['coordinates']:polygon(ax,[[xy(v) for v in ring] for ring in p],'#196d7c')
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10})
fig,axes=plt.subplots(1,2,figsize=(16,7),layout='constrained');a,b=axes;setup(a);source_water(a)
ids={w['id'] for w in r['roads']};lines=[[(xy(p[1:])) for p in w['nodes']] for w in s['roads'] if w['id'] in ids]
a.add_collection(LineCollection(lines,colors='#424f57',linewidths=.23))
bounds=r['bounds'];a.set_xlim(bounds['minX'],bounds['maxX']);a.set_ylim(bounds['maxZ'],bounds['minZ']);a.set_title('OSM source: WGS84 ways and water polygons',fontweight='bold')
b.imshow(Image.open('/tmp/bangkok-overhead-webgl.png'));b.axis('off');b.set_title('Geographic world: genuine WebGL overhead',fontweight='bold')
fig.suptitle('Bangkok geographic foundation — same river, source topology and real meter distances',fontsize=15,fontweight='bold')
fig.supxlabel('© OpenStreetMap contributors · Geofabrik Thailand 2026-10-24 · source identities preserved · temporary bare land',fontsize=9)
fig.savefig(OUT/'overhead-comparison.png',dpi=140);plt.close(fig)
fig,axes=plt.subplots(1,2,figsize=(12,10),layout='constrained')
for ax in axes:setup(ax)
source_water(axes[0])
for poly in r['waterUnion']:polygon(axes[1],poly,'#196d7c')
places=[('Rama VIII',100.4977,13.76975),('Wat Arun',100.4888,13.7437),('Chinatown',100.5109,13.7393),('ICONSIAM',100.5105,13.7265),('Bang Rak',100.5141,13.7235),('Asiatique',100.5037,13.7048),('Rama III',100.4913,13.6873),('Bhumibol',100.5378,13.6642)]
lo=xy((100.472,13.789));hi=xy((100.56,13.648))
for ax in axes:
 ax.set_xlim(lo[0],hi[0]);ax.set_ylim(hi[1],lo[1])
 for name,lon,lat in places:
  p=xy((lon,lat));ax.plot(*p,'o',color='#b7522d',markersize=3);ax.annotate(name,p,xytext=(5,4),textcoords='offset points',fontsize=8)
 ax.plot([lo[0]+500,lo[0]+2500],[hi[1]-600]*2,color='#1d343e',linewidth=3);ax.text(lo[0]+500,hi[1]-850,'2 km',fontsize=9)
axes[0].set_title('Source riverbanks / multipolygon holes',fontweight='bold');axes[1].set_title('World water union / 1 mm bake grid',fontweight='bold')
fig.suptitle('Extended Chao Phraya — bends, changing widths and connected canals',fontsize=14,fontweight='bold')
fig.supxlabel('Actual OSM polygons; no constant-width buffer or hand-drawn centerline river · © OpenStreetMap contributors',fontsize=9)
fig.savefig(OUT/'river-comparison.png',dpi=140);plt.close(fig)
