#!/usr/bin/env python3
"""Independent offline source/runtime QA; no network."""
import gzip,json,hashlib,pathlib,math
from shapely.geometry import shape,Point,Polygon,MultiPolygon
from shapely.ops import unary_union
from pyproj import Transformer
ROOT=pathlib.Path(__file__).resolve().parents[2];data=ROOT/'data/bangkok/real-scale'
source=json.loads(gzip.decompress((data/'source.v1.json.gz').read_bytes()))
runtime=ROOT/'artifacts/tuk-tuk-rush/public/assets/geography/runtime.v1.json.gz'
r=json.loads(gzip.decompress(runtime.read_bytes()));m=json.loads((data/'manifest.v1.json').read_bytes())
assert hashlib.sha256(runtime.read_bytes()).hexdigest()==m['runtimeSha256']
assert hashlib.sha256((data/'source.v1.json.gz').read_bytes()).hexdigest()==m['sourceSnapshotSha256']
water=unary_union([shape(w['geometry']) for w in source['water']]);assert water.is_valid
parts=list(water.geoms) if water.geom_type=='MultiPolygon' else [water];main=max(parts,key=lambda p:p.area)
assert main.bounds[1]<=13.64 and main.bounds[3]>=13.79,main.bounds
report={'mainRiverBounds':main.bounds,'sourceHoles':sum(len(p.interiors) for p in parts)}
water_overlap=land_overlap=bridge_area=0
for c in r['chunks']:
 def geom(name):return MultiPolygon([Polygon(p[0],p[1:]) for p in c[name]])
 land,w,roads,bridges=[geom(n) for n in ['land','water','roads','bridges']]
 assert land.is_valid and w.is_valid
 water_overlap+=roads.intersection(w).area;land_overlap+=land.intersection(w).area;bridge_area+=bridges.intersection(w).area
# Millimeter rounding permits only tiny numeric slivers across all ~400 sq km.
assert water_overlap<1,water_overlap
assert land_overlap<1,land_overlap
assert bridge_area>5000,bridge_area
report.update(nonBridgeRoadWaterOverlapM2=water_overlap,landWaterOverlapM2=land_overlap,bridgeWaterAreaM2=bridge_area)
proj=Transformer.from_crs(4326,32647,always_xy=True);sourceways={w['id']:w for w in source['roads']};maximum=0
for way in r['roads']:
 src=sourceways[way['id']]
 assert way['nodes']==[f'osm:node/{p[0]}' for p in src['nodes']]
 assert way['tags']==src['tags']
 for ident,lon,lat in src['nodes']:
  x,z=r['nodes'][f'osm:node/{ident}'];E,N=proj.transform(lon,lat)
  maximum=max(maximum,math.hypot(x-(E-660000),z-(1520000-N)))
assert maximum<.00072
report['maxProjectionRoundingM']=maximum;report['narrowWays']=sum(w['width']<3 for w in r['roads']);assert report['narrowWays']>200
assert len(r['references'])==len(source['roads'])
report['counts']=m['counts'];report['runtimeGzipBytes']=runtime.stat().st_size
(ROOT/'docs/qa/real-scale/data-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
