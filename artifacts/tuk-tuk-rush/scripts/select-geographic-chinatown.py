import gzip,json,hashlib
from pathlib import Path
p=Path('artifacts/tuk-tuk-rush/public/assets/geography');d=json.loads(gzip.decompress((p/'runtime.v1.json.gz').read_bytes()));segments=[]
names=set()
for r in d['roads']:
 ps=[d['nodes'][n] for n in r['nodes']];name=r['tags'].get('name:en',r['tags'].get('name',''))
 if any(2350<x<3730 and -150<z<1080 for x,z in ps):
  names.add(name)
  if r['tunnel'] or not r['vehicleClearance']:continue
  for a,b in zip(ps,ps[1:]):
   if max(a[0],b[0])<2280 or min(a[0],b[0])>3800 or max(a[1],b[1])<-220 or min(a[1],b[1])>1160:continue
   segments.append(dict(id=r['id'],name=name,a=a,b=b,width=r['width'],bridge=r['bridge']))
out=dict(schema=1,sourceSha256=hashlib.sha256((p/'runtime.v1.json.gz').read_bytes()).hexdigest(),bounds=[2380,3730,-120,1080],songWatBounds=[2620,3530,410,1040],streets=['Yaowarat Road','Song Wat Road','Song Sawat Road','Phadung Dao Road','Plaeng Nam Road','Yaowaphanit Road','Mangkon Road','Soi Wanit 1','Phat Sai Road','Ratchawong Road'],segments=segments)
f=Path('artifacts/tuk-tuk-rush/src/game/bangkok/geographic/chinatownArea.generated.json');f.write_text(json.dumps(out,separators=(',',':'))+'\n');print('segments',len(segments));print(sorted(names))
