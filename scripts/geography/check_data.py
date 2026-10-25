#!/usr/bin/env python3
"""Independent bounded-source completeness, geometry and rail checks. Offline only."""
import gzip,json,hashlib,pathlib,math
from collections import Counter
from shapely.geometry import shape,Point,Polygon,MultiPolygon,LineString
from shapely.ops import unary_union
from pyproj import Transformer
ROOT=pathlib.Path(__file__).resolve().parents[2];data=ROOT/'data/bangkok/real-scale';assets=ROOT/'artifacts/tuk-tuk-rush/public/assets/geography'
read=lambda p:json.loads(gzip.decompress(p.read_bytes()))
source=read(data/'source.v1.json.gz');r=read(assets/'runtime.v1.json.gz');m=json.loads((data/'manifest.v1.json').read_bytes())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(assets/'runtime.v1.json.gz')==m['runtimeSha256']
assert sha(data/'source.v1.json.gz')==m['sourceSnapshotSha256']
for a in r['coverageAnchors']:
 assert r['bbox'][0]<a['lon']<r['bbox'][2] and r['bbox'][1]<a['lat']<r['bbox'][3],a
water=unary_union([shape(w['geometry']) for w in source['water']]);assert water.is_valid
parts=list(water.geoms) if water.geom_type=='MultiPolygon' else [water];main=max(parts,key=lambda p:p.area)
assert main.bounds[1]<=13.64 and main.bounds[3]>=13.79,main.bounds
report={'mainRiverBounds':main.bounds,'sourceHoles':sum(len(p.interiors) for p in parts),'coverageAnchors':len(r['coverageAnchors'])}
eligible={w['id'] for w in source['roads'] if w['tags']['highway'] not in {'construction','proposed','abandoned','razed','disused'} and not w['tags'].get('construction') and not w['tags'].get('proposed') and w['tags'].get('state') not in {'construction','proposed'}}
assert {w['id'] for w in r['roads']}==eligible
proj=Transformer.from_crs(4326,32647,always_xy=True);sourceways={w['id']:w for w in source['roads']};maximum=0
for way in r['roads']:
 src=sourceways[way['id']]
 assert way['nodes']==[f'osm:node/{p[0]}' for p in src['nodes']]
 assert way['tags']==src['tags']
 assert len(way['heights'])==len(way['nodes'])
 for ident,lon,lat in src['nodes']:
  x,z=r['nodes'][f'osm:node/{ident}'];E,N=proj.transform(lon,lat)
  maximum=max(maximum,math.hypot(x-(E-660000),z-(1520000-N)))
assert maximum<.00072
source_tracks={w['id']:w for w in source['tracks']};tracks={w['id']:w for w in r['rail']['tracks']}
for w in tracks.values():
 assert w['tags']==source_tracks[w['id']]['tags']
 assert len(w['points'])==len(source_tracks[w['id']]['nodes'])
 for point,(_,lon,lat) in zip(w['points'],source_tracks[w['id']]['nodes']):
  E,N=proj.transform(lon,lat);assert math.dist(point,[E-660000,1520000-N])<.00072
 if w['tags'].get('tunnel','no') not in {'no','building_passage','avalanche_protector'} or float(w['tags'].get('layer','0').split(';')[0])<0:assert w['level']=='underground'
relations={a['id']:a for a in source['railRelations']}
for route in r['rail']['routes']:assert route['members']==relations[route['id']]['members']
chunks={tuple(c['origin']):c for c in r['chunks']};edges={};overlap=land_overlap=0;deckwater=0;rail_length=0
for ref in r['chunks']:
 assert sha(assets/ref['file'])==ref['sha256']
 c=read(assets/ref['file']);x,z=c['origin'];edges[(x,z)]={}
 def geom(name):return MultiPolygon([Polygon(p[0],p[1:]) for p in c[name]])
 land,w,roads=[geom(n) for n in ['land','water','roads']]
 assert land.is_valid and w.is_valid
 overlap+=roads.intersection(w).area;land_overlap+=land.intersection(w).area
 for kind in ['land','water','roads']:
  geo=geom(kind)
  edges[(x,z)][kind]=[geo.intersection(LineString([[0,0],[0,1024]])),geo.intersection(LineString([[1024,0],[1024,1024]])),geo.intersection(LineString([[0,0],[1024,0]])),geo.intersection(LineString([[0,1024],[1024,1024]]))]
 for track in c['rail']:
  original=tracks[track['id']]
  assert original['level']!='underground' and original['status']=='operational'
  rail_length+=LineString(track['points']).length
 for deck in c['decks']:
  poly=LineString([[p[0],p[2]] for p in deck['points']]).buffer(deck['width']/2)
  deckwater+=poly.intersection(w).area
assert overlap<1,overlap
assert land_overlap<1,land_overlap
assert deckwater>5000,deckwater
# Independently compare complete rendered rail length with the clipped source graph.
b=r['bbox'];corners=[(b[0],b[1]),(b[2],b[1]),(b[2],b[3]),(b[0],b[3])]
extent=Polygon([(proj.transform(lon,lat)[0]-660000,1520000-proj.transform(lon,lat)[1]) for lon,lat in corners])
expected_rail=sum(LineString(w['points']).intersection(extent).length for w in tracks.values() if w['status']=='operational' and w['level']!='underground')
assert abs(rail_length-expected_rail)<2,(rail_length,expected_rail)
report['sourceVsRenderedRailLengthErrorM']=abs(rail_length-expected_rail)
from shapely.affinity import translate
seams=0
for (x,z),kinds in edges.items():
 for kind,edge in kinds.items():
  for neighbor,a,b,dx,dz in [((x+1024,z),1,0,1024,0),((x,z+1024),3,2,0,1024)]:
   if neighbor not in edges:continue
   other=translate(edges[neighbor][kind][b],xoff=dx,yoff=dz)
   assert edge[a].difference(other.buffer(.002)).length<.01,(x,z,kind,'seam')
   assert other.difference(edge[a].buffer(.002)).length<.01,(x,z,kind,'seam')
   seams+=1
report.update(maxProjectionRoundingM=maximum,narrowWays=sum(w['width']<3 for w in r['roads']),sourceWaysRetained=len(eligible),roadWaterOverlapM2=overlap,landWaterOverlapM2=land_overlap,deckWaterAreaM2=deckwater,seamChecks=seams,railRenderedMeters=rail_length,railLevels=dict(Counter(w['level'] for w in tracks.values())),railStatuses=dict(Counter(w['status'] for w in tracks.values())),counts=m['counts'],runtimeGzipBytes=m['runtimeBytes'],chunkGzipBytes=m['chunkBytes'])
out=ROOT/'docs/qa/expanded-geography';out.mkdir(exist_ok=True);(out/'data-checks.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
