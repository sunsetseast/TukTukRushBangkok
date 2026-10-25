#!/usr/bin/env python3
"""One full, relation-complete Geofabrik input -> bounded OSM snapshot -> offline runtime.
No network at build/play time. Full PBF stays outside git. See README for pinned command.
"""
import argparse, gzip, hashlib, json, pathlib, datetime
import osmium
from pyproj import Transformer
from shapely import geometry as g, ops, make_valid, set_precision
from shapely.geometry import mapping, shape

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / 'data/bangkok/real-scale'
OUT = ROOT / 'artifacts/tuk-tuk-rush/public/assets/geography/runtime.v1.json.gz'
# Extraction extent, NOT an administrative or neighborhood boundary.
BBOX = [100.46, 13.63, 100.65, 13.80]
EXTENT = g.box(*BBOX)
# Authored coverage boundary covers Chinatown/Sampeng/Song Wat/Talat Noi/historic Bang Rak.
FEATURED = g.Polygon([(100.493,13.751),(100.520,13.751),(100.536,13.736),
                     (100.533,13.716),(100.512,13.717),(100.501,13.735)])
MAJOR = {'motorway','motorway_link','trunk','trunk_link','primary','primary_link',
         'secondary','secondary_link','tertiary','tertiary_link'}
PATHS = {'footway','path','pedestrian','steps','cycleway'}
ROAD_TAGS = {'highway','name','name:en','name:th','width','est_width','lanes','oneway',
             'access','motor_vehicle','motorcar','foot','bridge','tunnel','layer','surface',
             'covered','incline','service','junction','ford','area','barrier','bridge:name','bridge:name:en','bridge:name:th','ele','height','maxheight','min_height','level','indoor','ref','wheelchair','ramp','smoothness','width:carriageway'}
project = Transformer.from_crs(4326,32647,always_xy=True)
ORIGIN = [660000,1520000] # fixed forever; x east, z south

def encode(x): return json.dumps(x,ensure_ascii=False,separators=(',',':'),sort_keys=True).encode()
def digest(x): return hashlib.sha256(x).hexdigest()
def readzip(p): return json.loads(gzip.decompress(p.read_bytes()))
def writezip(p,x): p.write_bytes(gzip.compress(encode(x),mtime=0))
def polygons(geom):
    if geom.is_empty:return []
    if geom.geom_type=='Polygon': return [geom]
    return [p for q in getattr(geom,'geoms',[]) for p in polygons(q)]
def xy(lon,lat):
    e,n=project.transform(lon,lat)
    return [round(e-ORIGIN[0],3), round(ORIGIN[1]-n,3)]
def project_geom(geom):
    return ops.transform(lambda lon,lat,z=None:(project.transform(lon,lat)[0]-ORIGIN[0], ORIGIN[1]-project.transform(lon,lat)[1]),geom)
def rings(p):return [[[round(x,3),round(y,3)] for x,y in r.coords] for r in [p.exterior,*p.interiors]]

class Extract(osmium.SimpleHandler):
    def __init__(self):
        super().__init__(); self.roads=[];self.water=[];self.boundaries=[];self.centerlines=[];self.repairs=[]
        self.factory=osmium.geom.GeoJSONFactory()
    def way(self,w):
        tags=dict(w.tags)
        if not (tags.get('highway') or tags.get('waterway') in {'river','canal'}):return
        if not all(n.location.valid() for n in w.nodes):raise ValueError(f'Missing way node: {w.id}')
        coords=[[n.lon,n.lat] for n in w.nodes]
        if len(coords)<2 or not EXTENT.intersects(g.LineString(coords)):return
        obj={'id':f'osm:way/{w.id}','version':w.version,'tags':{k:v for k,v in tags.items() if k in ROAD_TAGS or k=='waterway'},
             'nodes':[[n.ref,n.lon,n.lat] for n in w.nodes]}
        if tags.get('highway'):self.roads.append(obj)
        else:self.centerlines.append(obj)
    def area(self,a):
        tags=dict(a.tags)
        water=tags.get('natural')=='water' and tags.get('water') in {'river','canal'} or tags.get('waterway')=='riverbank'
        admin=tags.get('boundary')=='administrative' and tags.get('admin_level') in {'6','8'}
        if not(water or admin):return
        outer=[(n.lon,n.lat) for ring in a.outer_rings() for n in ring]
        if not outer:return
        xs,ys=zip(*outer)
        if max(xs)<BBOX[0] or min(xs)>BBOX[2] or max(ys)<BBOX[1] or min(ys)>BBOX[3]:return
        geom=shape(json.loads(self.factory.create_multipolygon(a)))
        if not geom.intersects(EXTENT):return
        ident=f'osm:{"way" if a.from_way() else "relation"}/{a.orig_id()}'
        if not geom.is_valid:
            self.repairs.append(ident);geom=make_valid(geom)
        clipped=geom.intersection(EXTENT)
        parts=polygons(clipped)
        if not parts:return
        obj={'id':ident,'tags':{k:v for k,v in tags.items() if k in {'name','name:en','name:th','natural','water','waterway','boundary','admin_level','ref'}},
             'geometry':mapping(g.MultiPolygon(parts))}
        (self.water if water else self.boundaries).append(obj)

def extract(pbf):
    DATA.mkdir(parents=True,exist_ok=True)
    sha=hashlib.file_digest(pbf.open('rb'),'sha256').hexdigest()
    if sha!='e8373240cf0be47cc641f2c8627e674064d8c47f4ff2a11f6a33fcbfc9a50949':raise ValueError('Expected pinned thailand-261024 Geofabrik input; create a versioned import for a different snapshot')
    h=Extract()
    # Osmium area assembler sees complete relations from the country source BEFORE clipping.
    # sparse disk-backed node locations avoid a country-sized Python node dictionary.
    h.apply_file(str(pbf),locations=True,idx='sparse_file_array')
    snap={'schema':1,'bbox':BBOX,'source':{'url':'https://download.geofabrik.de/asia/thailand-261024.osm.pbf',
          'pbfSha256':sha,'extractedAt':'2026-10-25','license':'ODbL-1.0',
          'attribution':'© OpenStreetMap contributors','repairs':h.repairs},
          'roads':sorted(h.roads,key=lambda x:x['id']),'water':sorted(h.water,key=lambda x:x['id']),
          'boundaries':sorted(h.boundaries,key=lambda x:x['id']),'centerlines':sorted(h.centerlines,key=lambda x:x['id'])}
    writezip(DATA/'source.v1.json.gz',snap)
    print('Extracted',len(h.roads),'ways,',len(h.water),'water areas,',len(h.boundaries),'administrative areas',flush=True)

def build():
    snap=readzip(DATA/'source.v1.json.gz');nodes={};roads=[];references=[]
    water_parts=[project_geom(shape(w['geometry'])) for w in snap['water']]
    water=set_precision(ops.unary_union(water_parts),.001)
    if not water.is_valid:raise ValueError('Invalid water union')
    extent=set_precision(project_geom(EXTENT),.001);land=extent.difference(water)
    ribbons=[];bridge_ribbons=[]
    for way in snap['roads']:
        t=way['tags']; coords=way['nodes'];line=g.LineString([(p[1],p[2]) for p in coords])
        tier='A' if FEATURED.intersects(line) else 'B' if t['highway'] in MAJOR else 'C'
        references.append({'id':way['id'],'coverage':tier})
        if tier=='C' or t.get('area')=='yes' or t.get('highway') in {'construction','proposed'}:continue
        tagged=t.get('width',t.get('est_width',''))
        try:width=float(tagged.replace(' m',''));basis='tagged' if 'width' in t else 'osm-estimate'
        except ValueError:
            width=2 if t['highway'] in PATHS else 4 if t['highway'] in {'service','living_street'} else 6 if t['highway']=='residential' else 10 if t['highway'] in {'tertiary','tertiary_link'} else 14
            basis='class-estimate'
        if not .25<=width<=80:raise ValueError(f'Unsupported width {tagged} on {way["id"]}')
        # Keep node identities; never join grade-separated geometric crossings by proximity.
        ids=[]
        for ident,lon,lat in coords:
            key=f'osm:node/{ident}';nodes[key]=xy(lon,lat);ids.append(key)
        bridge=t.get('bridge','no')!='no';tunnel=t.get('tunnel','no')!='no'
        roads.append({'id':way['id'],'nodes':ids,'tags':t,'coverage':tier,'width':width,'widthBasis':basis,
                      'vehicleClearance':width>=3,'pedestrianClearance':width>=.6,'bridge':bridge,'tunnel':tunnel})
        if tunnel:continue # retain topology, defer subterranean rendering and driving
        geo=project_geom(line).buffer(width/2,cap_style=1,join_style=1)
        if bridge:bridge_ribbons.append(geo.intersection(extent))
        else:ribbons.append(geo.intersection(land))
    road_surface=ops.unary_union(ribbons);bridges=ops.unary_union(bridge_ribbons)
    # Clipped/baked land prevents any plane under open river water. Source rings remain available independently.
    chunks=[]
    minx,minz,maxx,maxz=extent.bounds
    for x in range(int(minx//1024)*1024,int(maxx)+1024,1024):
      for z in range(int(minz//1024)*1024,int(maxz)+1024,1024):
        box=g.box(x,z,x+1024,z+1024)
        chunk={'origin':[x,z]}
        for name,geom in [('land',land),('water',water),('roads',road_surface),('bridges',bridges)]:
            part=set_precision(geom.intersection(box),.001)
            chunk[name]=[rings(ops.transform(lambda a,b,c=None:(a-x,b-z),p)) for p in polygons(part)]
        if any(chunk[k] for k in ['land','water','roads','bridges']):chunks.append(chunk)
    bounds=extent.bounds
    result={'schema':1,'crs':'EPSG:32647','origin':ORIGIN,'bbox':BBOX,'snapshotSha256':digest((DATA/'source.v1.json.gz').read_bytes()),
      'nodes':nodes,'roads':roads,'references':references,'water':[{**w,'polygons':[rings(p) for p in polygons(project_geom(shape(w['geometry'])))]} for w in snap['water']],
      'waterUnion':[rings(p) for p in polygons(water)],'boundaries':snap['boundaries'],'featuredBoundary':mapping(FEATURED),'chunks':chunks,
      'bounds':{'minX':bounds[0],'minZ':bounds[1],'maxX':bounds[2],'maxZ':bounds[3]}}
    # Strip duplicate WGS water geometry from runtime; source snapshot is the authoritative WGS identity.
    for w in result['water']:del w['geometry']
    OUT.parent.mkdir(parents=True,exist_ok=True)
    writezip(OUT,result)
    manifest={'schema':1,'source':snap['source'],'bbox':BBOX,'projection':{'crs':'EPSG:32647','origin':ORIGIN,'worldAxes':'x=easting-originE; z=originN-northing','units':'meters'},
      'sourceSnapshotSha256':result['snapshotSha256'],'runtimeSha256':digest(OUT.read_bytes()),
      'counts':{'sourceWays':len(snap['roads']),'runtimeWays':len(roads),'nodes':len(nodes),'waterAreas':len(snap['water']),
      'administrativeAreas':len(snap['boundaries']),'chunks':len(chunks),'coverage':{tier:sum(r['coverage']==tier for r in references) for tier in 'ABC'}},
      'toolchain':{'osmium':'4.3.2','pyproj':'3.8.0','shapely':'2.2.0'},'runtimeBytes':OUT.stat().st_size}
    (DATA/'manifest.v1.json').write_bytes(encode(manifest)+b'\n')
    print(json.dumps(manifest['counts']), 'runtime',OUT.stat().st_size,flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--pbf',type=pathlib.Path);a=p.parse_args()
    if a.pbf:extract(a.pbf)
    build()
