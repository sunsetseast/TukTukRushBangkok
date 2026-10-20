"""Reproduce bounded OSM research snapshots, stripping contributor metadata.
Usage: python scripts/extract-bangkok-osm.py /path/to/raw-tiles
Use --download to retrieve the recorded API URLs. Never import this geometry
into the runtime graph. Derived data is ODbL 1.0, © OpenStreetMap contributors.
"""
import sys,json,pathlib,urllib.request,xml.etree.ElementTree as ET,hashlib
root=pathlib.Path(__file__).resolve().parents[1];raw=pathlib.Path(sys.argv[1]);raw.mkdir(parents=True,exist_ok=True)
requests=json.loads((root/'docs/qa/world-blueprint/sources/retrieval.json').read_text())['requests']
requests=[dict(id='chinatown',url='https://api.openstreetmap.org/api/0.6/map?bbox=100.505,13.735,100.515,13.744')]+requests
ways={};places={};snapshots=[]
for r in requests:
 path=raw/f"osm-{r['id']}.osm"
 if '--download' in sys.argv:
  with urllib.request.urlopen(urllib.request.Request(r['url'],headers={'User-Agent':'TukTukRushBangkok-geographic-audit/34'}),timeout=120) as response:path.write_bytes(response.read())
 data=path.read_bytes();tree=ET.fromstring(data);nodes={e.attrib['id']:[float(e.attrib['lon']),float(e.attrib['lat'])] for e in tree.findall('node')}
 def tags(e):return {t.attrib['k']:t.attrib['v'] for t in e.findall('tag') if t.attrib['k'] in ['name','name:en','name:th','highway','waterway','bridge','railway','station','public_transport','amenity','tourism','building','shop','leisure','operator','website','addr:street','addr:housenumber']}
 for e in tree:
  if e.tag not in ['node','way']:continue
  t=tags(e);name=t.get('name:en') or t.get('name');id=f"osm:{e.tag}/{e.attrib['id']}";source=f"https://www.openstreetmap.org/{e.tag}/{e.attrib['id']}"
  coords=[nodes[n.attrib['ref']] for n in e.findall('nd') if n.attrib['ref'] in nodes] if e.tag=='way' else [nodes[e.attrib['id']]]
  if not coords:continue
  if e.tag=='way' and name and any(k in t for k in ['highway','waterway','bridge']):ways[id]=dict(type='Feature',id=id,properties={**t,'source':source},geometry=dict(type='LineString',coordinates=coords))
  if name and (t.get('tourism') or t.get('railway') in ['station','halt'] or t.get('public_transport')=='station' or t.get('amenity') in ['place_of_worship','ferry_terminal','marketplace'] or t.get('leisure')=='park' or t.get('shop') in ['mall','gold','jewelry']):
   places[id]=dict(id=id,name=name,coordinate=dict(lat=sum(p[1] for p in coords)/len(coords),lon=sum(p[0] for p in coords)/len(coords)),tags=t,accuracy='OSM point' if e.tag=='node' else 'unweighted way-vertex centroid; approximate',source=source)
 snapshots.append(dict(id=r['id'],url=r['url'],sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),date='2026-10-20',method='OSM API bbox; no contributor metadata retained'))
common=dict(schemaVersion=1,attribution='© OpenStreetMap contributors, ODbL 1.0',date='2026-10-20')
(root/'data/bangkok/osm-reference.v1.geojson').write_text(json.dumps(dict(type='FeatureCollection',**common,features=list(ways.values())),ensure_ascii=False,indent=2)+'\n')
(root/'data/bangkok/osm-places.v1.json').write_text(json.dumps(dict(**common,places=list(places.values())),ensure_ascii=False,indent=2)+'\n')
(root/'docs/qa/world-blueprint/sources/snapshots.json').write_text(json.dumps(snapshots,indent=2)+'\n')
print(len(ways),'named corridor features',len(places),'place facts')
