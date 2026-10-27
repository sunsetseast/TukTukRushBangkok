#!/usr/bin/env python3
"""One full, relation-complete Geofabrik input -> bounded OSM snapshot -> offline runtime.
No network at build/play time. Full PBF stays outside git. See README for pinned command.
"""
import argparse, gzip, hashlib, json, pathlib, io, math
from shapely import normalize
from shapely.strtree import STRtree
import osmium
from pyproj import Transformer
from shapely import geometry as g, ops, make_valid, set_precision
from shapely.geometry import mapping, shape

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / 'data/bangkok/real-scale'
OUT = ROOT / 'artifacts/tuk-tuk-rush/public/assets/geography/runtime.v1.json.gz'
# Extraction extent, NOT an administrative or neighborhood boundary.
# Existing extraction plus verified legacy destinations and northern park/station footprints.
# Buffer is geographic, never a rescaling of the immutable projection.
LEGACY = json.loads((ROOT/'artifacts/tuk-tuk-rush/src/game/bangkok/cityData.v1.json').read_text())
COVERAGE_ANCHORS = [dict(id=r['id'], **r['coordinate']) for r in LEGACY['geographicReferences'] if r.get('coordinate')]
COVERAGE_ANCHORS += [dict(id='chatuchak-park-north',lon=100.555,lat=13.813),
                     dict(id='krung-thep-aphiwat',lon=100.5406,lat=13.8042),
                     dict(id='phrom-phong',lon=100.5696,lat=13.7304)]
BBOX = [min(100.46, min(r['lon'] for r in COVERAGE_ANCHORS)-.012),
        min(13.63, min(r['lat'] for r in COVERAGE_ANCHORS)-.012),
        max(100.65, max(r['lon'] for r in COVERAGE_ANCHORS)+.012),
        max(13.80, max(r['lat'] for r in COVERAGE_ANCHORS)+.012)]
BBOX = [round(v,6) for v in BBOX]
RAIL_EXTENT = g.box(100.25,13.5,100.95,14.10) # outside connections are references, not playable coverage
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
def writezip(p,x):
    # gzip.compress header OS differs between Python versions. GzipFile fixes OS=255,
    # omits filename/time and guarantees the same bytes in Python 3.12/CI.
    output=io.BytesIO()
    with gzip.GzipFile(filename='',mode='wb',fileobj=output,mtime=0,compresslevel=9) as f:f.write(encode(x))
    p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(output.getvalue())
def polygons(geom):
    if geom.is_empty:return []
    if geom.geom_type=='Polygon': return [geom]
    return [p for q in getattr(geom,'geoms',[]) for p in polygons(q)]
def xy(lon,lat):
    e,n=project.transform(lon,lat)
    return [round(e-ORIGIN[0],3), round(ORIGIN[1]-n,3)]
def project_geom(geom):
    return ops.transform(lambda lon,lat,z=None:(project.transform(lon,lat)[0]-ORIGIN[0], ORIGIN[1]-project.transform(lon,lat)[1]),geom)
def rings(p):
    p=normalize(p)
    return [[[round(x,3),round(y,3)] for x,y in r.coords] for r in [p.exterior,*p.interiors]]

class Extract(osmium.SimpleHandler):
    def __init__(self):
        super().__init__(); self.roads=[];self.water=[];self.boundaries=[];self.centerlines=[];self.repairs=[]
        self.factory=osmium.geom.GeoJSONFactory();self.tracks=[];self.stations=[];self.railRelations=[];self.platforms=[]
    def node(self,n):
        t=dict(n.tags)
        if t.get('railway') not in {'station','halt','subway_entrance','platform'} and t.get('public_transport') not in {'station','stop_position','platform'}:return
        if not n.location.valid() or not RAIL_EXTENT.covers(g.Point(n.lon,n.lat)):return
        self.stations.append({'id':f'osm:node/{n.id}','version':n.version,'tags':t,'coordinate':[n.lon,n.lat]})
    def relation(self,r):
        t=dict(r.tags)
        if t.get('route') in {'train','subway','light_rail','monorail','railway'} or t.get('public_transport')=='stop_area':
            self.railRelations.append({'id':f'osm:relation/{r.id}','version':r.version,'tags':t,
              'members':[{'id':f'osm:{dict(n="node",w="way",r="relation")[m.type]}/{m.ref}','role':m.role} for m in r.members]})
    def way(self,w):
        tags=dict(w.tags)
        if not (tags.get('highway') or tags.get('railway') or tags.get('public_transport') in {'platform','station'} or tags.get('waterway') in {'river','canal'}):return
        if not all(n.location.valid() for n in w.nodes):raise ValueError(f'Missing way node: {w.id}')
        coords=[[n.lon,n.lat] for n in w.nodes]
        if len(coords)<2:return
        xs,ys=zip(*coords)
        bb=RAIL_EXTENT.bounds if tags.get('railway') or tags.get('public_transport') in {'platform','station'} else BBOX
        if max(xs)<bb[0] or min(xs)>bb[2] or max(ys)<bb[1] or min(ys)>bb[3]:return
        line=g.LineString(coords)
        if (tags.get('railway') or tags.get('public_transport') in {'platform','station'}) and RAIL_EXTENT.intersects(line):
            obj={'id':f'osm:way/{w.id}','version':w.version,'tags':tags,'nodes':[[n.ref,n.lon,n.lat] for n in w.nodes]}
            if tags.get('railway') in {'rail','subway','light_rail','monorail','narrow_gauge','construction','proposed','disused','abandoned'}:self.tracks.append(obj)
            elif tags.get('railway') in {'station','halt'}:
                self.stations.append({'id':obj['id'],'version':w.version,'tags':tags,'coordinate':list(line.centroid.coords[0]),'nodes':obj['nodes']})
            elif tags.get('railway')=='platform' or tags.get('public_transport')=='platform':self.platforms.append(obj)
        if not EXTENT.intersects(line):return
        obj={'id':f'osm:way/{w.id}','version':w.version,'tags':{k:v for k,v in tags.items() if k in ROAD_TAGS or k=='waterway'},
             'nodes':[[n.ref,n.lon,n.lat] for n in w.nodes]}
        if tags.get('highway'):self.roads.append(obj)
        elif tags.get('waterway') in {'river','canal'}:self.centerlines.append(obj)
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
    h.apply_file(str(pbf),locations=True,idx='sparse_file_array',
        filters=[osmium.filter.KeyFilter('highway','waterway','railway','public_transport','natural','water','boundary','route')])
    snap={'schema':1,'bbox':BBOX,'source':{'url':'https://download.geofabrik.de/asia/thailand-261024.osm.pbf',
          'pbfSha256':sha,'extractedAt':'2026-10-25','license':'ODbL-1.0',
          'attribution':'© OpenStreetMap contributors','repairs':h.repairs},
          'roads':sorted(h.roads,key=lambda x:x['id']),'water':sorted(h.water,key=lambda x:x['id']),
          'tracks':sorted(h.tracks,key=lambda x:x['id']),'stations':sorted(h.stations,key=lambda x:x['id']),
          'platforms':sorted(h.platforms,key=lambda x:x['id']),'railRelations':sorted(h.railRelations,key=lambda x:x['id']),
          'coverageAnchors':COVERAGE_ANCHORS,'boundaries':sorted(h.boundaries,key=lambda x:x['id']),'centerlines':sorted(h.centerlines,key=lambda x:x['id'])}
    writezip(DATA/'source.v1.json.gz',snap)
    print('Extracted',len(h.roads),'ways,',len(h.water),'water areas,',len(h.boundaries),'administrative areas',flush=True)

def status(t):
    if t.get('railway')=='construction' or t.get('highway')=='construction' or t.get('construction') or t.get('state')=='construction':return 'construction'
    if t.get('railway')=='proposed' or t.get('highway')=='proposed' or t.get('proposed') or t.get('state')=='proposed':return 'proposed'
    if t.get('railway') in {'disused','abandoned'} or t.get('disused')=='yes':return 'disused'
    return 'operational'
def underground(t):
    return t.get("tunnel","no") not in {"no","building_passage","avalanche_protector"} or t.get("location")=="underground" or layer(t)<0
def layer(t):
    try:return float(t.get('layer','0').split(';')[0])
    except ValueError:return 0

def build_rail(snap):
    catalog=json.loads((ROOT/'scripts/geography/rail_catalog.json').read_text());relations=snap.get('railRelations',[])
    tracks=snap.get('tracks',[]);track_ids={w['id'] for w in tracks};way_lines={};station_lines={};routes=[];interchanges=[]
    for rel in relations:
        t=rel['tags'];text=' '.join(t.values()).lower()
        lines=[l['id'] for l in catalog['lines'] if any(p in text for p in l['patterns'])]
        members=rel['members']
        if t.get('public_transport')=='stop_area':
            interchanges.append(rel);continue
        if not any(m['id'] in track_ids for m in members):continue
        # Preserve relation sequence/roles verbatim; no station-to-station synthetic rail.
        routes.append({**rel,'lines':lines or ['conventional'],'status':status(t)})
        for m in members:
            target=way_lines if m['id'].startswith('osm:way/') and m['id'] in track_ids else station_lines
            target.setdefault(m['id'],set()).update(lines or ['conventional'])
    # Read area membership from direct route relations, never previously enriched
    # areas. Shared entrances must not propagate lines recursively between stations.
    direct_station_lines={k:set(v) for k,v in station_lines.items()}
    for area in interchanges:
        members=area['members'];lines=set().union(*(direct_station_lines.get(m['id'],set())|way_lines.get(m['id'],set()) for m in members))
        for member in members:station_lines.setdefault(member['id'],set()).update(lines)
    priority={l['id']:i for i,l in enumerate(catalog['lines'])}
    result=[]
    for w in tracks:
        t=w['tags'];coords=[xy(n[1],n[2]) for n in w['nodes']];line=g.LineString([(n[1],n[2]) for n in w['nodes']])
        text=' '.join(t.values()).lower();lines=sorted(way_lines.get(w['id'],set()) or {l['id'] for l in catalog['lines'] if any(p in text for p in l['patterns'])} or {'conventional'},key=lambda k:priority[k])
        level='underground' if underground(t) else 'elevated' if t.get('bridge','no')!='no' or layer(t)>0 else 'at-grade'
        # Rendering datum only, not surveyed rail elevations. Original ele/layer tags retained.
        height=(-8 if level=='underground' else 11+max(0,layer(t)-1)*5 if level=='elevated' else .25)
        result.append({**w,'points':coords,'lines':lines,'status':status(t),'level':level,'height':height,'heightBasis':'visual-estimate-not-surveyed','playable':EXTENT.intersects(line)})
    track_geometries=[g.LineString(w['points']) for w in result];track_tree=STRtree(track_geometries)
    line_trees={}
    for line_id in priority:
        selected=[i for i,w in enumerate(result) if line_id in w['lines']]
        if selected:line_trees[line_id]=(STRtree([track_geometries[i] for i in selected]),selected)
    stations=[]
    for s in snap.get('stations',[]):
        t=s['tags'];p=s['coordinate'];point=g.Point(p)
        if t.get('railway') not in {'station','halt','subway_entrance'} and not (t.get('public_transport')=='station' and any(t.get(k)=='yes' for k in ['train','subway','monorail','light_rail'])):continue
        lines=sorted(station_lines.get(s['id'],set()),key=lambda k:priority[k])
        ref=t.get('ref','')
        primary=next((line for prefix,line in [('BL','blue'),('PP','purple'),('YL','yellow'),('PK','pink'),('MT','pink'),('RN','dark-red'),('RW','light-red'),('G','gold'),('S','silom'),('N','sukhumvit'),('E','sukhumvit'),('A','airport')] if ref.startswith(prefix)),lines[0] if lines else None)
        projected=g.Point(xy(*p));nearby=[(projected.distance(track_geometries[i]),result[i]) for i in [int(track_tree.nearest(projected))]] if result else []
        if primary in line_trees:
            index,selected=line_trees[primary];i=selected[int(index.nearest(projected))];nearby=[(projected.distance(track_geometries[i]),result[i])]
        nearest=nearby[0][1] if nearby else None
        # A stop-area transfer does not confer the other operator's route on a station.
        # Explicit source station code wins over inherited area membership.
        if primary and ref:lines=[primary] if ref!='CEN' else lines
        if not lines and nearby and nearby[0][0]<220:lines=nearby[0][1]['lines']
        # OSM station=subway denotes mode, not burial: BTS also uses it.
        level='underground' if t.get('location')=='underground' or t.get('railway')=='subway_entrance' else nearest['level'] if nearest else 'at-grade'
        yaw=0
        if nearest:
            pts=nearest['points'];q=xy(*p);i=min(range(1,len(pts)),key=lambda i:g.LineString([pts[i-1],pts[i]]).distance(g.Point(q)))
            yaw=math.atan2(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1])
        stations.append({**s,'point':xy(*p),'lines':lines,'level':level,'height':-8 if level=='underground' else nearest['height'] if nearest else 0,'yaw':yaw,'status':status(t),'playable':EXTENT.covers(point)})
    # Link separate station identities only where source stop areas share a member
    # (entrance/foot connection). This states pedestrian connectivity, not paid fare integration.
    transfers=[]
    station_ids={s['id'] for s in stations if s['tags'].get('railway') in {'station','halt'}}
    for i,a in enumerate(interchanges):
        am={m['id'] for m in a['members']}
        for b in interchanges[i+1:]:
            bm={m['id'] for m in b['members']};shared=sorted(am & bm)
            if not shared:continue
            for sa in sorted(am & station_ids):
                for sb in sorted(bm & station_ids):
                    if sa!=sb:transfers.append({'from':sa,'to':sb,'kind':'pedestrian','sourceAreas':[a['id'],b['id']],'sharedMembers':shared})
    # Keep source stop areas, original route geometry and ordered membership.
    return {'catalog':catalog,'tracks':result,'stations':stations,'routes':routes,'interchanges':interchanges,'transfers':transfers,'platforms':snap.get('platforms',[])}

def build():
    snap=readzip(DATA/'source.v1.json.gz')
    if snap['bbox']!=BBOX:raise ValueError('Expanded source required: run once with --pbf pinned-source.pbf')
    nodes={};roads=[];references=[];rail=build_rail(snap)
    water=set_precision(ops.unary_union([project_geom(shape(w['geometry'])) for w in snap['water']]),.001)
    if not water.is_valid:raise ValueError('Invalid water union')
    extent=set_precision(project_geom(EXTENT),.001);land=extent.difference(water)
    ribbons=[];elevated=[]
    eligible={'motorway','motorway_link','trunk','trunk_link','primary','primary_link','secondary','secondary_link','tertiary','tertiary_link','unclassified','residential','living_street','service','road','track','footway','path','pedestrian','steps','cycleway','bridleway','corridor','busway','bus_guideway','escape','raceway'}
    for way in snap['roads']:
        t=way['tags'];coords=way['nodes'];line=g.LineString([(p[1],p[2]) for p in coords])
        tier='A' if FEATURED.intersects(line) else 'B' if t['highway'] in MAJOR else 'C'
        references.append({'id':way['id'],'coverage':tier,'status':status(t)})
        if t['highway'] in {'construction','proposed','abandoned','razed','disused'} or status(t)!='operational':continue
        tagged=t.get('width',t.get('est_width',''))
        try:width=float(tagged.replace(' m',''));basis='tagged' if 'width' in t else 'osm-estimate'
        except ValueError:
            width=2 if t['highway'] in PATHS else 4 if t['highway'] in {'service','living_street','track','corridor'} else 6 if t['highway'] in {'residential','unclassified','road'} else 10 if t['highway'] in {'tertiary','tertiary_link'} else 14
            basis='class-estimate'
        if not .25<=width<=80:
            width=4;basis='class-estimate' # preserve unusual raw source widths without rejecting the whole network
        ids=[]
        for ident,lon,lat in coords:
            key=f'osm:node/{ident}';nodes[key]=xy(lon,lat);ids.append(key)
        bridge=t.get('bridge','no')!='no';tunnel=underground(t)
        roads.append({'id':way['id'],'nodes':ids,'tags':t,'coverage':tier,'width':width,'widthBasis':basis,
                      'vehicleClearance':width>=3 and t['highway']!='steps','pedestrianClearance':width>=.6,'bridge':bridge,'tunnel':tunnel})
    # Preserve source shared nodes, while separating graph identities by physical layer at runtime.
    # Elevated road heights taper along their source chain to connected ground nodes at <=6%.
    import heapq
    adj={};ground=set()
    for r in roads:
        raised=r['bridge'] or layer(r['tags'])>0
        if r['tunnel']:continue
        if not raised:ground.update(r['nodes']);continue
        for a,b in zip(r['nodes'],r['nodes'][1:]):
            length=math.dist(nodes[a],nodes[b]);adj.setdefault(a,[]).append((b,length));adj.setdefault(b,[]).append((a,length))
    dist={n:0 for n in ground if n in adj};queue=[(0,n) for n in sorted(dist)];heapq.heapify(queue)
    while queue:
        d,n=heapq.heappop(queue)
        if d!=dist[n]:continue
        for b,length in adj[n]:
            if d+length<dist.get(b,math.inf):dist[b]=d+length;heapq.heappush(queue,(d+length,b))
    for r in roads:
        t=r['tags'];line=g.LineString([nodes[n] for n in r['nodes']]);raised=r['bridge'] or layer(t)>0
        r['heights']=[round(min(7*max(1,layer(t)),dist.get(n,math.inf)*.06),3) if raised else -6 if r['tunnel'] else 0 for n in r['nodes']]
        r['heightBasis']='source-topology-ramp-estimate' if raised else 'datum-estimate'
        # A two-node bridge has ground endpoints but still needs an interior deck.
        # Densify its existing source segment only; no new topological connections.
        if raised:
            r['profiles']=[]
            for i,(a,b) in enumerate(zip(r['nodes'],r['nodes'][1:])):
                length=math.dist(nodes[a],nodes[b]);steps=max(1,math.ceil(length/8));profile=[]
                for k in range(steps+1):
                    f=k/steps;h=r['heights'][i]*(1-f)+r['heights'][i+1]*f
                    if r['heights'][i]==0 and r['heights'][i+1]==0:
                        h=min(7*max(1,layer(t)),min(f,1-f)*length*.06)
                    profile.append([round(nodes[a][0]*(1-f)+nodes[b][0]*f,3),round(nodes[a][1]*(1-f)+nodes[b][1]*f,3),round(h,3)])
                r['profiles'].append(profile)
        if r['tunnel']:continue
        if raised:elevated.append((r,line));continue
        if t.get('area')=='yes' and line.is_closed and len(r['nodes'])>=4:
            poly=make_valid(g.Polygon(line.coords));ribbons.extend(polygons(poly.intersection(land)))
        else:ribbons.append(line.buffer(r['width']/2,quad_segs=2,cap_style=1,join_style=1).intersection(land))
    tree=STRtree(ribbons);rail_lines=[g.LineString(w['points']) for w in rail['tracks']];rail_tree=STRtree(rail_lines)
    # Conservative temporary pier candidates: source-aligned, no roads/junctions or water.
    # Skipping an obstructed candidate is preferable to inventing a ground-level collision.
    supports=[];taken=set()
    for w,line in zip(rail['tracks'],rail_lines):
        if not w['playable'] or w['level']!='elevated' or w['status']!='operational':continue
        for d in range(20,int(line.length),45):
            p=line.interpolate(d);key=(round(p.x/12),round(p.y/12))
            if key in taken or not extent.covers(p) or water.distance(p)<3:continue
            if any(ribbons[i].distance(p)<3 for i in tree.query(p.buffer(4))):continue
            # Elevated roads are also excluded, independently of their estimated height.
            if any(q.distance(p)<r['width']/2+3 for r,q in elevated if q.bounds[0]-50<p.x<q.bounds[2]+50 and q.bounds[1]-50<p.y<q.bounds[3]+50):continue
            taken.add(key);supports.append({'point':[round(p.x,3),round(p.y,3)],'height':w['height'],'line':w['lines'][0]})
    rail['supports']=supports
    chunks=[];minx,minz,maxx,maxz=extent.bounds
    for x in range(int(minx//1024)*1024,int(maxx)+1024,1024):
      for z in range(int(minz//1024)*1024,int(maxz)+1024,1024):
        box=g.box(x,z,x+1024,z+1024);ident=f'{x}:{z}';chunk={'origin':[x,z]}
        road_surface=ops.unary_union([ribbons[i].intersection(box) for i in sorted(tree.query(box))])
        for name,geom in [('land',land),('water',water),('roads',road_surface)]:
            part=normalize(set_precision(geom.intersection(box),.001))
            chunk[name]=[rings(ops.transform(lambda a,b,c=None:(a-x,b-z),p)) for p in polygons(part)]
        chunk['bridges']=[] # legacy schema channel, physical road decks are now height-aware
        chunk['decks']=[]
        for r,line in elevated:
            if not line.intersects(box):continue
            for profile in r['profiles']:
              for a,b in zip(profile,profile[1:]):
                seg=g.LineString([a[:2],b[:2]]);part=seg.intersection(box).intersection(extent)
                if part.geom_type!='LineString' or part.length<.001:continue
                points=[]
                for p in part.coords:
                    f=seg.project(g.Point(p))/max(seg.length,.001)
                    points.append([round(p[0]-x,3),round(a[2]*(1-f)+b[2]*f,3),round(p[1]-z,3)])
                chunk['decks'].append({'id':r['id'],'points':points,'width':r['width']})
        chunk['rail']=[]
        for i in sorted(rail_tree.query(box)):
            w=rail['tracks'][i]
            if w['level']=='underground' or w['status']!='operational':continue
            part=rail_lines[i].intersection(box).intersection(extent)
            parts=[part] if part.geom_type=='LineString' else list(getattr(part,'geoms',[]))
            for part in parts:
                if part.geom_type=='LineString' and part.length>.001:
                    chunk['rail'].append({'id':w['id'],'points':[[round(a-x,3),round(b-z,3)] for a,b in part.coords],'height':w['height'],'level':w['level'],'line':w['lines'][0]})
        chunk['supports']=[s for s in supports if int(s['point'][0]//1024)*1024==x and int(s['point'][1]//1024)*1024==z]
        chunk['stations']=[s for s in rail['stations'] if s['playable'] and s['tags'].get('railway')!='subway_entrance' and int(s['point'][0]//1024)*1024==x and int(s['point'][1]//1024)*1024==z]
        if any(chunk[k] for k in ['land','water','roads','decks','rail']):
            file=f'chunks/{x}_{z}.json.gz';writezip(OUT.parent/file,chunk)
            chunks.append({'id':ident,'origin':[x,z],'file':file,'sha256':digest((OUT.parent/file).read_bytes()),'bytes':(OUT.parent/file).stat().st_size})
    expected={c['file'] for c in chunks}
    for stale in (OUT.parent/'chunks').glob('*.json.gz'):
        if stale.relative_to(OUT.parent).as_posix() not in expected:stale.unlink()
    result={'schema':1,'crs':'EPSG:32647','origin':ORIGIN,'bbox':BBOX,'snapshotSha256':digest((DATA/'source.v1.json.gz').read_bytes()),
      'nodes':nodes,'roads':roads,'references':references,'water':[{**w,'polygons':[rings(p) for p in polygons(normalize(project_geom(shape(w['geometry']))))]} for w in snap['water']],
      'waterUnion':[rings(p) for p in polygons(normalize(water))],'boundaries':snap['boundaries'],'featuredBoundary':mapping(FEATURED),'chunks':chunks,'rail':rail,
      'coverageAnchors':snap['coverageAnchors']+json.loads((DATA/'coverage-targets.v1.json').read_text()),'bounds':{'minX':minx,'minZ':minz,'maxX':maxx,'maxZ':maxz}}
    for w in result['water']:del w['geometry']
    for w in rail['tracks']:del w['nodes'] # original WGS nodes remain in versioned source snapshot
    writezip(OUT,result)
    manifest={'schema':1,'source':snap['source'],'bbox':BBOX,'projection':{'crs':'EPSG:32647','origin':ORIGIN,'worldAxes':'x=easting-originE; z=originN-northing','units':'meters'},
      'sourceSnapshotSha256':result['snapshotSha256'],'runtimeSha256':digest(OUT.read_bytes()),
      'counts':{'sourceWays':len(snap['roads']),'runtimeWays':len(roads),'nodes':len(nodes),'waterAreas':len(snap['water']),'administrativeAreas':len(snap['boundaries']),'chunks':len(chunks),
                'railTracks':len(rail['tracks']),'playableRailTracks':sum(w['playable'] for w in rail['tracks']),'stations':len(rail['stations']),'playableStations':sum(w['playable'] for w in rail['stations']),'routes':len(rail['routes']),
                'coverage':{tier:sum(r['coverage']==tier for r in references) for tier in 'ABC'}},
      'toolchain':{'osmium':'4.3.2','pyproj':'3.8.0','shapely':'2.2.0'},'runtimeBytes':OUT.stat().st_size,'chunkBytes':sum(c['bytes'] for c in chunks)}
    (DATA/'manifest.v1.json').write_bytes(encode(manifest)+b'\n')
    print(json.dumps(manifest['counts']), 'runtime',OUT.stat().st_size,flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--pbf',type=pathlib.Path);p.add_argument('--buildings-pbf',type=pathlib.Path);a=p.parse_args()
    if a.pbf:extract(a.pbf)
    build()
    import buildings
    if a.buildings_pbf:buildings.extract(a.buildings_pbf)
    buildings.build()
