#!/usr/bin/env python3
"""Extract source-attributed real OpenStreetMap Bangkok road graph from public
university XLSX research files. No fictitious road geometry inserted.
Source: Todai-ops/Planarization-in-Urban-Road-Networks, OSM-derived.
"""
import os,sys,re,json,math,datetime,ast
import pandas as pd
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg=json.load(open(os.path.join(root,'public/maps/bangkok-map-config.json')))
b=cfg['bbox'];north,south,west,east=b['north'],b['south'],b['west'],b['east']
repo=sys.argv[1]
nodes=pd.read_excel(os.path.join(repo,'Bangkok_nodes_osm.xlsx'))
edges=pd.read_excel(os.path.join(repo,'Bangkok_edges_osm.xlsx'))
coord={}
for _,r in nodes.iterrows():
 try:coord[int(r['Unnamed: 0'])]=(float(r.x),float(r.y))
 except (ValueError,TypeError):continue
def inside(pt):return west<=pt[0]<=east and south<=pt[1]<=north
def clean(x):
 if pd.isna(x) if not isinstance(x,list) else False:return None
 if isinstance(x,(int,float,bool)):return x
 return str(x)
def line_coords(wkt):
 if not isinstance(wkt,str) or not wkt.startswith('LINESTRING'):return None
 nums=re.findall(r'-?\d+\.\d+|-?\d+',wkt)
 if len(nums)<4 or len(nums)%2:return None
 return [(float(nums[i]),float(nums[i+1])) for i in range(0,len(nums),2)]
features=[];excluded=0;referenced=0
for _,row in edges.iterrows():
 try:sid,tid=int(row.source),int(row.target)
 except (ValueError,TypeError):continue
 if sid not in coord or tid not in coord:continue
 a,z=coord[sid],coord[tid]
 if not inside(a) and not inside(z):continue
 highway=clean(row.highway)
 if isinstance(highway,str) and highway.startswith('['):
  try:highway=ast.literal_eval(highway)[0]
  except (ValueError,IndexError,SyntaxError):highway=None
 if highway is None:continue
 highway=str(highway)
 if highway not in ('motorway','motorway_link','trunk','trunk_link','primary','primary_link',
                    'secondary','secondary_link','tertiary','tertiary_link',
                    'residential','living_street','unclassified','service'):continue
 access=str(clean(row.access) or '')
 if access in ('private','no'):excluded+=1;continue
 poly=line_coords(row.geometry)
 if poly is None:poly=[a,z]
 # Ensure the coordinates of the first point match graph source direction.
 if math.dist(poly[0],a)>math.dist(poly[-1],a):poly.reverse()
 # Anchor route graph endpoints to exact OSMnx node coordinates.
 poly[0]=a;poly[-1]=z
 if any(not inside(p) for p in poly):
  # Clip only at original vertex boundaries; no new road/river crossing.
  pieces=[];piece=[]
  for p in poly:
   if inside(p):piece.append(p)
   else:
    if len(piece)>=2:pieces.append(piece)
    piece=[]
  if len(piece)>=2:pieces.append(piece)
 else:pieces=[poly]
 for i,points in enumerate(pieces):
  props=dict(osm_id=str(clean(row.osmid)),highway=highway,
   name=str(clean(row['name']) or highway),
   oneway='yes' if str(clean(row.oneway)).lower() in ('true','1','yes') else 'no',
   reversed=bool(clean(row.reversed)),
   lanes=clean(row.lanes),bridge=clean(row.bridge),
   maxspeed=clean(row.maxspeed),access=clean(row.access),
   osm_source_node=sid,osm_target_node=tid,license='ODbL-1.0')
  props={k:v for k,v in props.items() if v is not None}
  features.append({'type':'Feature','id':'research-osm-edge-'+str(referenced)+'-'+str(i),
   'properties':props,'geometry':{'type':'LineString',
    'coordinates':[[round(x,7),round(y,7)] for x,y in points]}})
  referenced+=1
out=os.path.join(root,'public/maps/imported');os.makedirs(out,exist_ok=True)
metadata={'source':'OSM-derived Bangkok urban street network research dataset',
 'source_url':'https://github.com/Todai-ops/Planarization-in-Urban-Road-Networks',
 'source_files':['Bangkok_nodes_osm.xlsx','Bangkok_edges_osm.xlsx'],
 'attribution':'© OpenStreetMap contributors','license':'ODbL-1.0',
 'bounds':b,'generated':datetime.datetime.now(datetime.timezone.utc).isoformat()}
def write(file,features):
 with open(os.path.join(out,file),'w') as f:
  json.dump({'type':'FeatureCollection','metadata':metadata,'features':features},
   f,separators=(',',':'),ensure_ascii=False)
write('roads.geojson',features)
write('bridges.geojson',[f for f in features if str(f['properties'].get('bridge')).lower() in ('yes','true','1')])
# Strictly no invented river geodata. Draw later when OSM river relations become available.
write('waterways.geojson',[])
with open(os.path.join(out,'manifest.json'),'w') as f:
 json.dump({**metadata,'roadWays':len(features),'bridgeWays':sum(1 for x in features if x['properties'].get('bridge')),
  'waterFeatures':0,'riverReady':False,
  'notes':['Research graph may contain simplified street topology.',
   'Some lanes, legal turns, road directions and ferry piers remain unverified.',
   'Do not invent river water polygons or fictitious bridge connections.']},f,indent=2)
print('OSM-derived edges:',len(features),'bridges:',sum(1 for f in features if f['properties'].get('bridge')), 'excluded:',excluded)
if len(features)<500:raise RuntimeError('Incomplete road network, refusing to publish.')
