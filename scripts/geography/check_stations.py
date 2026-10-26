#!/usr/bin/env python3
"""Pinned OSM station identities/positions, cross-checked by operator name/code.
Coordinates are source GIS checks, not independently surveyed operator coordinates.
"""
import gzip,json,pathlib,math
ROOT=pathlib.Path(__file__).resolve().parents[2]
read=lambda p:json.loads(gzip.decompress(p.read_bytes()))
r=read(ROOT/'artifacts/tuk-tuk-rush/public/assets/geography/runtime.v1.json.gz');source=read(ROOT/'data/bangkok/real-scale/source.v1.json.gz')
required=[('5388599065','Mo Chit','N8','elevated'),('5391611863','Victory Monument','N3','elevated'),('5388610344','Phaya Thai','N2','elevated'),('1692209237','Siam','CEN','elevated'),('5391625873','Asok','E4','elevated'),('5391626093','Phrom Phong','E5','elevated'),('451697335','Sala Daeng','S2','elevated'),('257066790','Chong Nonsi','S3','elevated'),('7781158247','Saint Louis','S4','elevated'),('257066779','Surasak','S5','elevated'),('257067085','Saphan Taksin','S6','elevated'),('443815144','Krung Thon Buri','S7','elevated'),('5812248586','Charoen Nakhon','G2','elevated'),('5812248587','Khlong San','G3','elevated'),('280179404','Hua Lamphong','BL28','underground'),('12803915074','Wat Mangkon','BL29','underground'),('12803589960','Si Lom','BL26','underground'),('5391691787','Sukhumvit','BL22','underground'),('6711028526','Phaya Thai','A8','elevated'),('6711023184','Makkasan','A6','elevated'),('8986366369','Krung Thep Aphiwat',None,'elevated')]
by_id={s['id']:s for s in r['rail']['stations']};src={s['id']:s for s in source['stations']};checks=[]
for ident,name,code,level in required:
 s=by_id['osm:node/'+ident];assert s['playable'];assert s['status']=='operational';assert s['tags']['name:en']==name;assert s['level']==level,(name,s['level'])
 if code:assert s['tags']['ref']==code
 assert s['coordinate']==src[s['id']]['coordinate'];assert s['tags']==src[s['id']]['tags'];assert s['lines']
 checks.append({'id':s['id'],'name':name,'code':s['tags'].get('ref'),'coordinate':s['coordinate'],'lines':s['lines'],'physicalLevel':level,'thaiName':s['tags'].get('name:th',s['tags'].get('name'))})
expected_lines={'N8':['sukhumvit'],'N3':['sukhumvit'],'N2':['sukhumvit'],'CEN':['sukhumvit','silom'],'E4':['sukhumvit'],'E5':['sukhumvit'],'S2':['silom'],'S3':['silom'],'S4':['silom'],'S5':['silom'],'S6':['silom'],'S7':['silom'],'G2':['gold'],'G3':['gold'],'BL28':['blue'],'BL29':['blue'],'BL26':['blue'],'BL22':['blue'],'A8':['airport'],'A6':['airport']}
for check in checks:
 if check['code'] in expected_lines:assert check['lines']==expected_lines[check['code']],check
sala=by_id['osm:node/451697335'];silom=by_id['osm:node/12803589960']
assert sala['id']!=silom['id'] and sala['point']!=silom['point'] and silom['height']<0
assert any({t['from'],t['to']}=={sala['id'],silom['id']} and t['kind']=='pedestrian' and t['sharedMembers'] for t in r['rail']['transfers'])
# A full source route crossing the river at Saphan Taksin remains elevated, distinct from road decks.
p=by_id['osm:node/257067085']['point']
from shapely.geometry import LineString,Point,Polygon
silom=[w for w in r['rail']['tracks'] if 'silom' in w['lines'] and w['status']=='operational']
near=[w for w in silom if LineString(w['points']).distance(Point(p))<500]
assert near and all(w['level']=='elevated' for w in near)
water=[Polygon(p[0],p[1:]) for p in r['waterUnion']]
assert any(LineString(w['points']).intersects(q) for w in near for q in water)
counts={l['id']:{'playableTracks':sum(w['playable'] and l['id'] in w['lines'] for w in r['rail']['tracks']),'outsideStations':sum(not s['playable'] and l['id'] in s['lines'] for s in r['rail']['stations'])} for l in r['rail']['catalog']['lines']}
assert counts['pink']['playableTracks']==0 and counts['pink']['outsideStations']>=30
assert any('pink' in route['lines'] and route['tags'].get('ref')=='IMPACT Link' for route in r['rail']['routes'])
report={'pass':True,'positionBasis':'Pinned source WGS84, independent PROJ projection checks; operator maps verify station identities/codes and operating scope, not survey accuracy','requiredStations':checks,'railCoverage':counts,'saphanTaksinSeparateElevatedRiverCrossing':True,'stationLineIdentityAssertions':len(expected_lines),'sourcePedestrianTransfers':r['rail']['transfers']}
(ROOT/'docs/qa/expanded-geography/station-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('PASS',len(checks),'required stations; source-backed rail river crossing and outside Pink branch')
