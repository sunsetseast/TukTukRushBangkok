#!/usr/bin/env python3
"""Make small licensed GeoJSON game maps from Bangkok's published OSM PBF.
Source: BBBike Bangkok PBF, © OpenStreetMap contributors under ODbL 1.0.
Real road nodes / bridges, not invented routes. Requires pyosmium.
"""
import json,os,math,sys,datetime
import osmium
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg=json.load(open(os.path.join(root,'public/maps/bangkok-map-config.json')))
b=cfg['bbox']; south,west,north,east=b['south'],b['west'],b['north'],b['east']
allowed={'motorway','trunk','primary','secondary','tertiary','residential','unclassified','living_street','service'}
road,water,bridge=[],[],[]
def inside(lat,lon):
 return south<=lat<=north and west<=lon<=east
def feature(w,coords,kind,polygon=False):
 props={key:value for key,value in w.tags if key in ('highway','name','name:en','name:th','oneway','lanes','width','maxspeed','access','motorcar','motor_vehicle','service','bridge','layer','tunnel','water','waterway','natural')}
 props.update(osm_id=int(w.id),osm_type='way',license='ODbL-1.0',category=kind)
 return dict(type='Feature',id='osm-way-'+str(w.id),properties=props,
  geometry=dict(type='Polygon' if polygon else 'LineString',
   coordinates=[coords] if polygon else coords))
class Handler(osmium.SimpleHandler):
 def way(self,w):
  tags=w.tags
  highway=tags.get('highway')
  wt=tags.get('waterway')
  isroad=highway in allowed
  iswater=wt in ('river','canal') or tags.get('water')=='river' or tags.get('waterway')=='riverbank'
  if not isroad and not iswater:return
  # The published PBF uses shared OSM node IDs. Read all segments and only
  # retain intersecting city bounds, without inventing any connectivity.
  pts=[]
  for n in w.nodes:
   try:
    if n.location.valid():
     pts.append((n.lon,n.lat))
   except (osmium.InvalidLocationError,ValueError):
    return
  if len(pts)<2:return
  if not any(inside(lat,lon) for lon,lat in pts):return
  # Crop by segment endpoints; use original shared vertices in intersections.
  lines=[];current=[]
  for p in pts:
   if inside(p[1],p[0]):
    current.append([round(p[0],7),round(p[1],7)])
   else:
    if len(current)>1:lines.append(current)
    current=[]
  if len(current)>1:lines.append(current)
  if not lines:return
  for idx,coords in enumerate(lines):
   f=feature(w,coords,'road' if isroad else 'water')
   if len(lines)>1:f['id']+='-'+str(idx)
   if isroad:
    road.append(f)
    if tags.get('bridge') not in (None,'no','false','0'):bridge.append(f)
   if iswater:water.append(f)
h=Handler();h.apply_file(sys.argv[1],locations=True)
os.makedirs(os.path.join(root,'public/maps/imported'),exist_ok=True)
meta=dict(attribution='© OpenStreetMap contributors',license='ODbL-1.0',
 source='BBBike.org Bangkok OpenStreetMap PBF',bbox=b,
 extractedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),method='original OSM way coordinates')
def save(name,features):
 p=os.path.join(root,'public/maps/imported',name)
 with open(p,'w') as f:json.dump(dict(type='FeatureCollection',metadata=meta,features=features),f,separators=(',',':'),ensure_ascii=False)
 print(name,len(features),os.stat(p).st_size,'bytes')
save('roads.geojson',road)
save('waterways.geojson',water)
save('bridges.geojson',bridge)
with open(os.path.join(root,'public/maps/imported/manifest.json'),'w') as f:
 json.dump({**meta,'roadWays':len(road),'waterFeatures':len(water),'bridgeWays':len(bridge),'readyForGameplay':len(road)>1000,
 'notes':['Centerlines preserve true OSM coordinates but not legal turn restrictions.',
 'Osmium way clips exclude portions outside target bbox.',
 'Proper riverbank multipolygon polygons require later processing.']},f,indent=2)
if len(road)<1000 or len(bridge)<1:raise RuntimeError('Data incomplete, refusing to mark city ready')
