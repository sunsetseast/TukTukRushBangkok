"""Refresh OSM river research (network) or reproduce from retained GeoJSON (offline).
Run at repository root. This command deliberately does not approve game geometry.
Requires shapely; strips contributor metadata. Derived database: ODbL 1.0.
Upstream OSM is mutable: use the committed GeoJSON for exact PR36 reproduction.
"""
import pathlib,json,urllib.request,xml.etree.ElementTree as ET,hashlib,datetime
from shapely.geometry import LineString,box,mapping
from shapely.ops import polygonize,unary_union,linemerge
ROOT=pathlib.Path(__file__).resolve().parents[1];out=ROOT/'docs/qa/chao-phraya/reference';out.mkdir(parents=True,exist_ok=True)
def request(id):
 url=f'https://api.openstreetmap.org/api/0.6/relation/{id}/full'
 b=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'TukTukRushBangkok-geographic-research/36'}),timeout=90).read();r=ET.fromstring(b)
 nodes={e.attrib['id']:[float(e.attrib['lon']),float(e.attrib['lat'])] for e in r.findall('node')};ways={e.attrib['id']:[nodes[n.attrib['ref']] for n in e.findall('nd')] for e in r.findall('way')};rel=next(e for e in r.findall('relation') if e.attrib['id']==str(id))
 return rel,ways,{e.attrib['id']:{t.attrib['k']:t.attrib['v'] for t in e.findall('tag')} for e in r.findall('way')},dict(url=url,rawSha256=hashlib.sha256(b).hexdigest(),rawBytes=len(b),relationVersion=rel.attrib.get('version'),retrievedAtUTC=datetime.datetime.now(datetime.timezone.utc).isoformat())
features=[];structures=[];retrieval=[]
for id in [14038958,14038959,18576208]:
 rel,ways,tags,provenance=request(id);retrieval.append(provenance)
 def rings(role):return list(polygonize(unary_union([LineString(ways[m.attrib['ref']]) for m in rel.findall('member') if m.attrib.get('role')==role])))
 polygon=unary_union(rings('outer')).difference(unary_union(rings('inner')));assert polygon.is_valid
 for m in rel.findall('member'):
  if m.attrib.get('role')!='inner':continue
  way_id=m.attrib['ref'];t=tags[way_id]
  if t.get('bridge:support')=='yes' or t.get('building')=='boathouse':structures.append(dict(type='Feature',id='osm:way/'+way_id,properties=dict(kind='bridge-support' if t.get('bridge:support')=='yes' else 'boathouse',source='https://www.openstreetmap.org/way/'+way_id,interpretation='Overwater structure exclusion, not a natural terrain island'),geometry=dict(type='Polygon',coordinates=[ways[way_id]])))
 features.append(dict(type='Feature',id=f'osm:relation/{id}',properties=dict(source=f'https://www.openstreetmap.org/relation/{id}',tags={t.attrib['k']:t.attrib['v'] for t in rel.findall('tag')}),geometry=mapping(polygon)))
(out/'riverbanks-osm.geojson').write_text(json.dumps(dict(type='FeatureCollection',attribution='© OpenStreetMap contributors, ODbL 1.0',license='https://www.openstreetmap.org/copyright',features=features),ensure_ascii=False,separators=(',',':'))+'\n')
(out/'non-terrain-structures.geojson').write_text(json.dumps(dict(type='FeatureCollection',attribution='© OpenStreetMap contributors, ODbL 1.0',features=structures),indent=2)+'\n')
rel,ways,tags,provenance=request(227317);retrieval.append(provenance)
lines=[LineString(ways[m.attrib['ref']]) for m in rel.findall('member') if m.attrib.get('type')=='way' and m.attrib.get('role') in ['main_stream',''] and m.attrib['ref'] in ways]
spine=linemerge(unary_union(lines)).intersection(box(100.47,13.678,100.535,13.767));assert spine.geom_type=='LineString'
if spine.coords[0][1]<spine.coords[-1][1]:spine=LineString(list(spine.coords)[::-1])
(out/'centerline-osm.geojson').write_text(json.dumps(dict(type='Feature',properties=dict(source='https://www.openstreetmap.org/relation/227317',attribution='© OpenStreetMap contributors, ODbL 1.0'),geometry=mapping(spine)),separators=(',',':'))+'\n')
(out/'refresh-provenance.json').write_text(json.dumps(retrieval,indent=2)+'\n');print('Research refreshed. Review the new maps before --approve; do not overwrite PR36 provenance.')
