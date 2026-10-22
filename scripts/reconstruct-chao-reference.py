"""Reproduce PR36 reference, candidate maps and canonical river geometry.
Requires Python + shapely + matplotlib + numpy. OSM derived database: ODbL 1.0.
Run at repository root. --approve writes the reviewed canonical geometry.
No commercial map imagery. Source lat/lon and game x/z are stored separately.
"""
import json,gzip,pathlib,math,sys,subprocess
import numpy as np
from shapely.geometry import shape,LineString,Point,Polygon,box,mapping
from shapely.ops import unary_union,transform
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as Patch
ROOT=pathlib.Path(__file__).resolve().parents[1];out=ROOT/'docs/qa/chao-phraya';ref=out/'reference'
def load(p):return json.loads(pathlib.Path(p).read_text())
def baseline(path):return json.loads(subprocess.check_output(['git','show','9cfac02c7ccc960b2e153f407e0a6543d44b5a19:'+path],cwd=ROOT))
world=json.loads(gzip.decompress((out/'before-world.json.gz').read_bytes()))
source=unary_union([shape(f['geometry']) for f in load(ref/'riverbanks-osm.geojson')['features']])
spine=shape(load(ref/'centerline-osm.geojson')['geometry']);coords=np.array(sorted(spine.coords,key=lambda p:p[1]));
# Deliberate RIVER-ONLY local compression, independent of the global projection.
# Knot positions reference existing historic/bridge/hotel stationing. Smooth in
# each interval, monotonic in latitude. Lateral width exaggeration is explicit.
knots=[(13.667,-3000),(13.678,2820),(13.681,2750),(13.685,2670),(13.69,2580),(13.697,2420),(13.7045,2180),(13.7056,2046),(13.7119,1832),(13.71312,1652),(13.7188,1460),(13.720781,1324),(13.723302,1170),(13.72393,1130),(13.726826,933),(13.728694,835),(13.730349,740),(13.735,380),(13.7391,100),(13.742,-50),(13.7459776,-700),(13.75256,-1060),(13.7614,-1480),(13.767,-1900),(13.8154,-3000)]
# First entry below is downstream continuation; keep southing monotonic.
knots[0]=(13.667,3600)
lat=np.array([k[0] for k in knots]);zs=np.array([k[1] for k in knots]);
width_knots=[(13.667,1.5),(13.697,1.7),(13.7045,1.5),(13.7119,2),(13.7188,2.5),(13.724,3),(13.731,3),(13.739,2),(13.746,3),(13.763,3),(13.816,2)]
shift_knots=[(13.667,200),(13.7045,200),(13.7119,100),(13.7188,0),(13.816,0)]
def project(x,y,z=None):
 x=np.asarray(x);y=np.asarray(y);c=np.interp(y,coords[:,1],coords[:,0]);factor=np.interp(y,*zip(*width_knots));shift=np.interp(y,*zip(*shift_knots));return ((c-100.5)*30000-850+shift+(x-c)*30000*factor, np.interp(y,lat,zs))
# Clip only outside the game and its scenic continuation, not against old parcels.
geo=source.intersection(box(100.47,13.6678,100.54,13.79))
reference_geo=geo
# Mapped supports and stilt/boathouse exclusions are not terrain islands. Keep
# them for ambient navigation while allowing physical water beneath structures.
structure_features=load(ref/'non-terrain-structures.geojson')['features']
structure_union=unary_union([shape(f['geometry']) for f in structure_features])
removed_holes=[r for r in geo.interiors if structure_union.buffer(1e-7).covers(Polygon(r).representative_point())]
geo=Polygon(geo.exterior,[r for r in geo.interiors if r not in removed_holes])
proposed=transform(project,geo).simplify(3,preserve_topology=True)
assert proposed.is_valid and proposed.geom_type=='Polygon',proposed.geom_type
center=transform(project,spine).simplify(2)
# The research spine terminates at 13.678. Water continues in the source polygon.
ring=lambda r:[[round(x,3),round(y,3)] for x,y in r.coords]
structures=[dict(source=f['properties']['source'],kind=f['properties']['kind'],ring=ring(transform(project,shape(f['geometry'])).simplify(3,preserve_topology=True).exterior)) for f in structure_features]
river=dict(structureExclusions=structures,structurePolicy='Mapped overwater structures do not create terrain islands; retain boat clearance exclusions.',version='chao-phraya-osm-v2',coordinates='game-world-x-z',sourceCoordinates='WGS84 lon/lat in reference/riverbanks-osm.geojson',attribution='© OpenStreetMap contributors, ODbL 1.0',sourceRelations=[14038958,14038959,18576208],simplificationToleranceWorldUnits=3,polygon=[ring(proposed.exterior)]+[ring(r) for r in proposed.interiors],centerline=ring(center),compression=dict(version='river-local-v2',longitudeScale=30000,longitudeOrigin=100.5,xOffset=-850,southingKnots=knots,lateralExaggeration=width_knots,localXShift=shift_knots,globalProjectionChanged=False),southernBoundary=dict(maxZ=2750,sourceLatitude=13.681,note='After Asiatique/Anantara and the downstream west-to-east sweep; no Bang Kachao loop. Source-derived scenic water continues past the playable edge.'))
(out/'proposed-river.json').write_text(json.dumps(river,indent=2)+'\n')
ns={n['id']:n for n in world['nodes']};oldwater=unary_union([Polygon(p[0],p[1:]) for p in baseline('artifacts/tuk-tuk-rush/src/game/bangkok/roadSurfaces.generated.json')['water']]);
ids=['gate','palace','pho','arun','icon','river-city','hilton','oriental','peninsula','shangri','capella','four-seasons','asiatique','anantara'];landmarks=[l for l in world['landmarks'] if l['id'] in ids]
conflicts=[]
for r in world['roads']:
 a,b=ns[r['a']],ns[r['b']];line=LineString([(a['x'],a['z']),(b['x'],b['z'])]);overlap=line.buffer(r['width']/2).intersection(proposed)
 if not r.get('bridge') and overlap.area>.1:conflicts.append(dict(a=r['a'],b=r['b'],corridor=r.get('corridor'),area=round(overlap.area,1)))
parcel_conflicts=[]
for b in world['buildings']:
 c,s=math.cos(b.get('yaw',0)),math.sin(b.get('yaw',0));poly=Polygon([(b['x']+u*c+v*s,b['z']-u*s+v*c) for u,v in [(-b['w']/2,-b['d']/2),(b['w']/2,-b['d']/2),(b['w']/2,b['d']/2),(-b['w']/2,b['d']/2)]]);
 if poly.intersects(proposed):parcel_conflicts.append(dict(x=b['x'],z=b['z'],id=b.get('environmentId')))
(out/'initial-conflicts.json').write_text(json.dumps(dict(ordinaryRoadSegments=conflicts,proceduralParcels=parcel_conflicts,landmarkMoves=[dict(id='asiatique',before=[next(l for l in landmarks if l['id']=='asiatique')['plot']['x'],2046.1939766255643],after=[-450.86582838174553,2046.1939766255643],reason='Verified east-bank riverfront; close the inherited 300+ unit disconnected arrival-to-bank gap while retaining its model and identity.')]),indent=2)+'\n')
def drawpoly(ax,p,color,alpha=1,edge=None):
 for q in p.geoms if hasattr(p,'geoms') else [p]:
  if q.geom_type!='Polygon':continue
  ax.add_patch(Patch(np.asarray(q.exterior.coords),facecolor=color,edgecolor=edge or color,alpha=alpha,lw=.6))
  for r in q.interiors:ax.add_patch(Patch(np.asarray(r.coords),facecolor='#f3eee0',edgecolor=color,lw=.5))
def common(ax,title):
 ax.set_title(title,loc='left',fontweight='bold',fontsize=13,pad=15);ax.set_facecolor('#f3eee0');ax.set_aspect('equal');ax.grid(alpha=.15);ax.text(.97,.97,'N ↑',ha='right',va='top',transform=ax.transAxes,fontweight='bold');
def game(ax,proposal=False,full=False):
 drawpoly(ax,proposed if proposal else oldwater,'#4faebd');
 if proposal:
  x,y=oldwater.exterior.xy if oldwater.geom_type=='Polygon' else ([],[])
  for q in oldwater.geoms if hasattr(oldwater,'geoms') else [oldwater]:ax.plot(*q.exterior.xy,color='#a16c98',lw=1,ls='--')
 conflicts_set={(r['a'],r['b']) for r in conflicts}
 for r in world['roads']:
  a,b=ns[r['a']],ns[r['b']];color='#bb4038' if proposal and (r['a'],r['b']) in conflicts_set else '#a68e5a' if r.get('bridge') else '#8f958d';ax.plot([a['x'],b['x']],[a['z'],b['z']],color=color,lw=1.2 if r.get('bridge') else .35,alpha=.8)
 if proposal:
  for b in parcel_conflicts:ax.scatter(b['x'],b['z'],s=4,color='#e37b32')
 for l in landmarks:
  p=l['plot'];ax.scatter(p['x'],p['z'],s=14,color='#352e4d',zorder=5);ax.annotate('Chinatown / Yaowarat' if l['id']=='gate' else l['id'],(p['x'],p['z']),xytext=(4,2),textcoords='offset points',fontsize=6.4,zorder=6)
  if proposal and l['id']=='asiatique':ax.annotate('',xy=(-450.866,p['z']),xytext=(p['x'],p['z']),arrowprops=dict(arrowstyle='->',color='#8a286e'));ax.scatter(-450.866,p['z'],marker='s',s=15,color='#8a286e')
 bd=world['bounds'];ax.add_patch(Patch([[bd['minX'],bd['minZ']],[bd['maxX'],bd['minZ']],[bd['maxX'],bd['maxZ']],[bd['minX'],bd['maxZ']]],fill=False,ls=':',ec='#4e534d',lw=1));
 if proposal:ax.axhline(2750,color='#9b4c2a',lw=1.3,ls='-.');ax.text(-1900,2710,'Proposed southern playable edge',fontsize=7,color='#9b4c2a')
 ax.set_xlim((-2080,2580) if full else (-1960,480));ax.set_ylim(2870,-2470 if full else -2050);ax.set_xlabel('Game X · same scale in A/C');ax.set_ylabel('Game Z · north up')
for id,title in [('A','A · CURRENT MAIN / PR35'),('B','B · OPENSTREETMAP REFERENCE'),('C','C · PROPOSED COMPRESSED RIVER')]:
 fig,ax=plt.subplots(figsize=(9,12),layout='constrained');common(ax,title)
 if id in 'AC':game(ax,id=='C')
 else:
  drawpoly(ax,reference_geo,'#4faebd');ax.plot(*spine.xy,color='#276579',lw=.65,ls='--');city=baseline('artifacts/tuk-tuk-rush/src/game/bangkok/cityData.v1.json');
  for r in city['geographicReferences']:
   if r['id'] not in ids:continue
   x,y=r['coordinate']['lon'],r['coordinate']['lat'];ax.scatter(x,y,s=15,color='#352e4d');ax.annotate(r['id'],(x,y),xytext=(3,2),textcoords='offset points',fontsize=6.4)
  for f in load(ref/'bridges-osm.geojson')['features']:
   if f['geometry']['type']!='LineString':continue
   ps=np.asarray(f['geometry']['coordinates']);ax.plot(ps[:,0],ps[:,1],color='#a68e5a',lw=.8)
  inventory=load(ROOT/'data/bangkok/iconic-inventory.v1.json')['places']
  for item in inventory:
   if item['id'] not in ['gate','arun'] or not item.get('coordinate'):continue
   x,y=item['coordinate']['lon'],item['coordinate']['lat'];ax.scatter(x,y,s=15,color='#352e4d');ax.annotate('Chinatown / Yaowarat' if item['id']=='gate' else 'wat-arun',(x,y),xytext=(3,2),textcoords='offset points',fontsize=6.4)
  observation=next(f for f in load(ref/'asiatique-observation.json')['features'] if f['type']=='way' and f['id']=='342522015');x,y=observation['coordinate']['lon'],observation['coordinate']['lat'];ax.scatter(x,y,s=15,color='#352e4d');ax.annotate('asiatique (wheel)',(x,y),xytext=(3,2),textcoords='offset points',fontsize=6.4)
  ax.set_xlim(100.476,100.53);ax.set_ylim(13.678,13.769);ax.set_aspect(1/math.cos(math.radians(13.73)));ax.set_xlabel('WGS84 longitude');ax.set_ylabel('WGS84 latitude')
 fig.text(.02,.005,'© OpenStreetMap contributors · ODbL 1.0 | PR36 source geometry / explicit arcade compression, not surveyed game coordinates',fontsize=7,color='#555');suffix='' if id=='B' else '-detail';fig.savefig(out/f'maps/map-{id}{suffix}.png',dpi=180);fig.savefig(out/f'maps/map-{id}{suffix}.svg');plt.close(fig)
 if id in 'AC':
  fig,ax=plt.subplots(figsize=(10,12),layout='constrained');common(ax,title+' · FULL WORLD');game(ax,id=='C',True);fig.text(.02,.005,'© OpenStreetMap contributors · ODbL 1.0 | Exact generated game geometry, explicit arcade compression',fontsize=7);fig.savefig(out/f'maps/map-{id}.png',dpi=180);fig.savefig(out/f'maps/map-{id}.svg');plt.close(fig)
if '--approve' in sys.argv:
 target=ROOT/'artifacts/tuk-tuk-rush/src/game/bangkok/cityData.v1.json';data=load(target);data['waterApproval']=river;data['baseLayout']['river']['centerline']=[[(x+2000)/4,(z+2400)/4] for x,z in river['centerline']];target.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(dict(waterVertices=len(river['polygon'][0]),spineVertices=len(river['centerline']),roadConflicts=len(conflicts),parcelConflicts=len(parcel_conflicts),valid=proposed.is_valid))

# Matplotlib emits trailing spaces in SVG path data; normalize without changing geometry.
for svg_path in (out/'maps').glob('*.svg'):
 svg_path.write_text('\n'.join(line.rstrip() for line in svg_path.read_text().splitlines())+'\n')
