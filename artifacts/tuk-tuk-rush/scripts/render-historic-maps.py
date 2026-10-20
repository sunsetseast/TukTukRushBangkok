"""North-up QA maps from the actual shared graphs, not simulated screenshots."""
from pathlib import Path
import json, math, gzip
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
from matplotlib.collections import LineCollection, PatchCollection
OUT=Path(__file__).resolve().parents[3]/'docs/qa/historic-bangkok'
colors={'palace':'#986719','pho':'#187963','sanam':'#79a74b','swing':'#cc3b3f','golden':'#c59b17','democracy':'#6661a8','hua':'#2c77aa','traimit':'#d4782d','gate':'#ad3d6e'}
labels={'palace':'Grand Palace','pho':'Wat Pho','sanam':'Sanam Luang','swing':'Giant Swing','golden':'Golden Mount','democracy':'Democracy','hua':'Hua Lamphong','traimit':'Wat Traimit','gate':'Odeon / Gate'}
def mp(p):return (p['x']/4+500,p['z']/4+600)
def game(ax,label):
 d=json.load(gzip.open(OUT/f'map-{label}.json.gz','rt'));nodes={n['id']:n for n in d['nodes']}
 ax.set_facecolor('#f3f0e7')
 river=[mp(p) for p in d['river']];ax.plot(*zip(*river),color='#8fc8db',lw=68,zorder=0,solid_capstyle='round')
 buildings=[]
 # Draw all actual buildings in the map window; the fixed survey region is
 # narrower and must not create artificial blank neighborhoods in this view.
 snapshot='baseline-world.json.gz' if label=='before' else 'after-world.json.gz'
 world=json.load(gzip.open(OUT/snapshot,'rt'))
 for b in world['buildings']:
  c=math.cos(b.get('yaw',0));s=math.sin(b.get('yaw',0));points=[]
  for u,v in [(-1,-1),(1,-1),(1,1),(-1,1)]:
   points.append(mp({'x':b['x']+c*u*b['w']/2+s*v*b['d']/2,'z':b['z']-s*u*b['w']/2+c*v*b['d']/2}))
  buildings.append(Polygon(points))
 ax.add_collection(PatchCollection(buildings,facecolor='#c6b7a1',edgecolor='#a99d8c',linewidth=.12))
 for p in d['spaces']:
  if p['id']=='sanam':
   ax.add_patch(Polygon([mp(q) for q in p['boundary']],color='#ded9c9' if p.get('lawnBoundary') else '#b4c897'))
   if p.get('lawnBoundary'):ax.add_patch(Polygon([mp(q) for q in p['lawnBoundary']],color='#b4c897'))
 for p in d['parcels']:
  if p['landmarkId'] in colors:ax.add_patch(Polygon([mp(q) for q in p['boundary']],facecolor=colors[p['landmarkId']],alpha=.11,lw=.5,edgecolor=colors[p['landmarkId']]))
 lines=[]
 for r in d['roads']:lines.append([mp(nodes[r['a']]),mp(nodes[r['b']])])
 ax.add_collection(LineCollection(lines,colors='#4f5960',linewidths=[max(.6,r['width']/10) for r in d['roads']]))
 for l in d['landmarks']:
  if l['id'] not in colors:continue
  p=l if l['id']=='swing' else l.get('plot',l);x,y=mp(p)
  ax.scatter(x,y,s=38,color=colors[l['id']],edgecolor='white',lw=.7,zorder=5)
  offset={'sanam':(-18,-7),'palace':(-48,6),'pho':(-23,13),'swing':(-9,-12),'golden':(8,-4),'democracy':(9,-13),'hua':(-11,-9),'traimit':(7,-10),'gate':(-31,14)}[l['id']]
  ax.annotate(labels[l['id']],(x,y),xytext=offset,textcoords='offset points',fontsize=8,color='#233138',weight='bold',bbox=dict(facecolor='white',alpha=.8,pad=1,edgecolor='none'),zorder=7)
 ax.set(xlim=(230,640),ylim=(635,225),aspect='equal',xlabel='East → · compressed design units',ylabel='← North · South →')
 ax.set_title('PR31 baseline' if label=='before' else 'Historic reconstruction',loc='left',weight='bold')
 ax.grid(alpha=.12);ax.annotate('N ↑',(.96,.97),xycoords='axes fraction',ha='right',va='top',fontsize=12,weight='bold')
 return d
fig,axes=plt.subplots(1,2,figsize=(14,7.8));fig.subplots_adjust(left=.05,right=.99,bottom=.10,top=.89,wspace=.16);game(axes[0],'before');game(axes[1],'after')
fig.suptitle('Historic Bangkok · actual playable graphs and protected grounds',weight='bold',fontsize=15)
fig.text(.5,.018,'Roads, footprints and grounds are game geometry. 1 design unit = 4 game metres; arcade compression varies from real Bangkok. Tan = buildings; color = protected landmark parcels.',ha='center',fontsize=8)
fig.savefig(OUT/'geography-before-after.png',dpi=170);plt.close(fig)
# Independent WGS84 observations are plotted in a local easting/northing frame.
r=json.load(open(OUT/'registry-after.json'));fig,ax=plt.subplots(figsize=(8.2,7.2),layout='constrained');ax.set_facecolor('#f4f2eb')
for entry in r:
 if entry['id'] not in colors or not entry.get('geographicReference'):continue
 p=entry['geographicReference'];x=(p['lon']-100.49)*108000;y=(p['lat']-13.74)*111000
 ax.scatter(x,y,s=65,c=colors[entry['id']],edgecolor='white',zorder=3)
 ax.annotate(labels[entry['id']],(x,y),xytext=(7,6),textcoords='offset points',fontsize=9)
ax.set(aspect='equal',xlabel='Approximate eastings from 100.490° E (metres)',ylabel='Approximate northings from 13.740° N (metres)',title='Real Bangkok · independently recorded site centers')
ax.grid(alpha=.2);fig.text(.5,.01,'Nominal site pins from the reference inventory. Not a cadastral map; no invented reference footprints or roads.',ha='center',fontsize=8)
fig.savefig(OUT/'geographic-reference.png',dpi=170);plt.close(fig)
fig,axes=plt.subplots(1,2,figsize=(13,6.6),layout='constrained')
uses={'developed':'#ac9b82','water':'#85baca','road':'#525d65','authored-reservation':'#dec084','public-space':'#9eba7f','vacant':'#e64949'}
for ax,label in zip(axes,['before','after']):
 d=json.load(open(OUT/f'land-{label}.json'))
 for use,color in uses.items():
  p=[mp(c) for c in d['cells'] if c['use']==use]
  if p:ax.scatter(*zip(*p),c=color,s=15,marker='s',label=use)
 ax.set(xlim=(240,630),ylim=(620,235),aspect='equal',title=f"{label.capitalize()} · {d['local']['uses'].get('vacant',0)} unclassified cells",xlabel='East → design units');ax.grid(alpha=.12)
axes[1].legend(loc='upper left',bbox_to_anchor=(1,1),fontsize=8)
fig.suptitle('Same 1,014-cell grid · red cells require individual review',weight='bold');fig.savefig(OUT/'land-classification.png',dpi=170);plt.close(fig)
