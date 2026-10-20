"""Regenerate review inventory from approved records and the stripped OSM snapshot.
No geometry import, no geocoding service, no fabricated coordinates.
"""
import json,pathlib,csv,re
root=pathlib.Path(__file__).resolve().parents[1]
city=json.loads((root/'artifacts/tuk-tuk-rush/src/game/bangkok/cityData.v1.json').read_text())
registry=json.loads((root/'docs/qa/world-blueprint/after-registry.json').read_text())
osm=json.loads((root/'data/bangkok/osm-places.v1.json').read_text())['places']
refs={g['id']:g for g in city['geographicReferences']}
# Explicit reviewed name aliases; matching never changes the playable world.
aliases={'palace':['Grand Palace'],'pho':['Wat Pho'],'arun':['Wat Arun'],'golden':['Golden Mount'],'swing':['Giant Swing'],'hua':['Hua Lamphong'],'gate':['Chinatown Gate'],'state':['lebua at State Tower'],'hilton':['Millennium Hilton'],'embassy':['Central Embassy'],'okura':['The Okura Prestige'],'erawan-hotel':['Grand Hyatt Erawan'],'dusit':['Dusit Thani Hotel'],'river-city':['River City'],'paknam':['Wat Paknam Bhasicharoen'],'siam-center':['Siam Center'],'paragon':['Siam Paragon'],'central':['CentralWorld'],'park':['Lumphini Park'],'peninsula':['The Peninsula Bangkok'],'oriental':['Mandarin Oriental'],'shangri':['Shangri-La'],'rosewood':['Rosewood'],'capella':['Capella'],'suthat':['Wat Suthat']}
def match(names):
 for n in names:
  exact=[x for x in osm if x['name'].casefold()==n.casefold()]
  if exact:return exact[0]
  partial=[x for x in osm if n.casefold() in x['name'].casefold() and len(n)>7]
  if len(partial)==1:return partial[0]
 return None
def record(id,name,category,owner=None,district='Requires verification',bank='not-verified',priority='P2',names=None,reference=None):
 r=next((p for p in registry if p['id']==(owner or id)),None);g=refs.get(owner or id);o=match(names or aliases.get(id,[name]));
 coordinate=o['coordinate'] if o else g['coordinate'] if g else r.get('geographicReference') if r else None
 source=[o['source']] if o else g.get('sources',[]) if g else r.get('references',[]) if r else []
 references=list(dict.fromkeys(source+([reference] if reference else [])+(r.get('references',[]) if r else [])))
 return dict(id=id,name=name,category=category,geographicSource=source,coordinate=coordinate,coordinateAccuracy=o['accuracy'] if o else 'inherited approximate center' if coordinate else 'not researched',gameCoordinate=r['world'] if r else None,modelOwner=owner or (id if r else None),modelOrigin=r.get('modelOrigin') if r else None,district=g.get('district',district) if g else district if district!='Requires verification' else r['district'] if r else district,bank=bank,requiredNeighbors=r['neighbors'] if r else [],entrance=r.get('mainEntrance') if r else None,entranceDirection='Authored approach; exact real bearing unverified' if r and r.get('mainEntrance') else 'Requires research',architectureReferences=references,implementation='compound sub-place' if owner and r else 'rendered '+category if r else 'not authored',status='present but visually inadequate' if r and id in ['gate','pho','palace','swing','golden','traimit','hua'] else 'requires further research' if r else 'missing',recognizabilityGrade='B' if r and id in ['gate','swing','hua'] else 'C' if r and id in ['palace','pho','golden','traimit'] else 'unreviewed' if r else 'F',gradeBasis='PR31–33 photographic review; PR34 benchmark review required' if r and id in ['gate','palace','pho','swing','golden','traimit','hua'] else 'No photographic recognizability certification this pass' if r else 'No site-specific rendered asset',geographicConfidence='OSM snapshot cross-check; approximate' if o else 'inherited approximate reference' if coordinate else 'research needed',missingFeatures=['Exact site boundary and entrance survey','Independent hotel orientation/height review' if category=='hotel' else 'Full architectural likeness review'],recommendedCorrection='Retain approved placement; verify massing, facade bearing and neighborhood against source photography' if r else 'Research entrance, footprint and adjacent streets before adding a protected site and named model',priority=priority)
items=[]
for r in registry:
 id=r['id'];bank='not-verified';p=next((p for p in city['infrastructure']['piers'] if 'pier:'+p['id']==id),None)
 if p:bank=p['bank']
 if id in ['arun','paknam','icon','hilton','peninsula','anantara']:bank='west'
 if id in ['palace','pho','oriental','shangri','state','river-city','four-seasons','capella','asiatique']:bank='east'
 items.append(record(id,r['name'],r['category'],district=r['district'],bank=bank,priority='P1' if r['category']=='hotel' else 'P2'))
extra=[
('wat-phra-kaew','Wat Phra Kaew','temple','palace','Phra Nakhon','east','P1'),
('loha-prasat','Loha Prasat','temple',None,'Phra Nakhon','east','P1'),
('ratchanatdaram','Wat Ratchanatdaram','temple',None,'Phra Nakhon','east','P1'),
('benchamabophit','Wat Benchamabophit','temple',None,'Dusit','east','P2'),
('bowonniwet','Wat Bowonniwet','temple',None,'Phra Nakhon','east','P2'),
('phra-sumen','Phra Sumen Fort','fort',None,'Phra Nakhon','east','P2'),
('ananta-samakhom','Ananta Samakhom Throne Hall','palace',None,'Dusit','east','P2'),
('national-museum','Bangkok National Museum','museum',None,'Phra Nakhon','east','P2'),
('wat-mangkon','Wat Mangkon Kamalawat','temple',None,'Samphanthawong','east','P1'),
('holy-rosary','Holy Rosary Church','church',None,'Samphanthawong','east','P1'),
('grand-postal','Grand Postal Building','cultural-building',None,'Bang Rak','east','P1'),
('songwat-warehouses','Song Wat warehouses','heritage-streetscape',None,'Samphanthawong','east','P1'),
('talat-noi','Talat Noi','heritage-neighborhood',None,'Samphanthawong','east','P1'),
('hua-seng-heng','Hua Seng Heng','gold-shop',None,'Samphanthawong','east','P1'),
('tang-to-kang','Tang To Kang','gold-shop',None,'Samphanthawong','east','P2'),
('siam-discovery','Siam Discovery','mall','siam-center','Pathum Wan','east','P2'),
('central-embassy','Central Embassy','mall','embassy','Pathum Wan','east','P1'),
('park-hyatt','Park Hyatt Bangkok','hotel','embassy','Pathum Wan','east','P1'),
('lebua','Lebua at State Tower','hotel','state','Bang Rak','east','P1'),
('dusit-central-park','Dusit Central Park','mixed-use','dusit','Bang Rak','east','P1'),
('silom-complex','Silom Complex','mall',None,'Bang Rak','east','P2'),
('qsncc','Queen Sirikit National Convention Center','convention-center',None,'Khlong Toei','east','P2'),
('wat-kalayanamit','Wat Kalayanamit','temple',None,'Thon Buri','west','P1'),
('santa-cruz','Santa Cruz Church','church',None,'Thon Buri','west','P1'),
('kudi-chin','Kudi Chin','heritage-neighborhood',None,'Thon Buri','west','P2'),
('wang-lang','Wang Lang Market','market',None,'Bangkok Noi','west','P2'),
('queen-sirikit-park','Queen Sirikit Park','park',None,'Chatuchak','east','P2'),
('or-tor-kor','Or Tor Kor Market','market',None,'Chatuchak','east','P2'),
('krung-thep-aphiwat','Krung Thep Aphiwat Central Terminal','railway-station',None,'Chatuchak','east','P1'),
('marriott-marquis','Bangkok Marriott Marquis Queen’s Park','hotel',None,'Khlong Toei','east','P2'),
('siam-kempinski','Siam Kempinski Hotel Bangkok','hotel',None,'Pathum Wan','east','P2'),
('chatrium-riverside','Chatrium Hotel Riverside Bangkok','hotel',None,'Bang Kho Laem','east','P2'),
('sheraton-orchid','Royal Orchid Sheraton','hotel',None,'Bang Rak','east','P2'),
('the-siam','The Siam','hotel',None,'Dusit','east','P3'),
('sukhothai-hotel','The Sukhothai Bangkok','hotel',None,'Sathon','east','P2'),
('banyan-tree','Banyan Tree Bangkok','hotel',None,'Sathon','east','P2'),
('phra-pinklao-bridge','Phra Pinklao Bridge','bridge',None,'Phra Nakhon / Bangkok Noi','both','P1'),
('rama-viii-bridge','Rama VIII Bridge','bridge',None,'Bang Phlat / Phra Nakhon','both','P2'),
('memorial-bridge','Memorial Bridge','bridge',None,'Phra Nakhon / Thon Buri','both','P1'),
('taksin-bridge','Taksin Bridge','bridge',None,'Bang Rak / Khlong San','both','P1'),
('rama-iii-bridge','Rama III Bridge','bridge',None,'Bang Kho Laem / Thon Buri','both','P2'),
('sena-ruam-bts','Sena Ruam (N6)','bts-station',None,'Phaya Thai','east','P2')]
for row in extra:
 id,name,cat,owner,dist,bank,pri=row
 item=record(*row[:3],owner,dist,bank,pri,reference='https://www.huasengheng.com/en/contact/' if id=='hua-seng-heng' else 'https://www.bts.co.th/eng/routemap.html' if id=='sena-ruam-bts' else None)
 if cat in ['bridge','heritage-neighborhood','heritage-streetscape']:
  item['status']='requires further research';item['implementation']='Generic corridor/bridge fabric may exist; no separate named site/model certified';item['recognizabilityGrade']='unreviewed'
 if id=='sena-ruam-bts':item['status']='requires further research';item['recommendedCorrection']='Check current operator station coverage and deliberate arcade station omissions; preserve existing train IDs until reviewed'
 items.append(item)
out={'schemaVersion':1,'version':'bangkok-icons-2026.1','date':'2026-10-20','approval':'Coverage audit, not blanket geographic or art certification','attribution':'OSM-derived facts © OpenStreetMap contributors, ODbL 1.0. No OSM geometry imported into the playable graph.','places':items}
(root/'data/bangkok/iconic-inventory.v1.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
with (root/'docs/qa/world-blueprint/coverage.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['id','name','category','status','district','bank','coordinate','gameCoordinate','recognizability','confidence','priority','sources'])
 for p in items:w.writerow([p[k] if k not in ['coordinate','gameCoordinate','geographicSource'] else json.dumps(p[k],ensure_ascii=False) for k in ['id','name','category','status','district','bank','coordinate','gameCoordinate','recognizabilityGrade','geographicConfidence','priority','geographicSource']])
print(len(items),'inventory records;',sum(bool(p['coordinate']) for p in items),'have reference coordinates;',sum(p['status']=='missing' for p in items),'missing')
