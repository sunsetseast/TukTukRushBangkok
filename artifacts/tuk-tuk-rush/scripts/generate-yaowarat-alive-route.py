import json,math
from pathlib import Path
root=Path(__file__).resolve().parent.parent
a=json.loads((root/'src/game/bangkok/geographic/chinatownArea.generated.json').read_text())
roads=[s for s in a['segments']if s['name']=='Yaowarat Road'and s['width']>=10 and not s['bridge']]
p=(3338.5924459331404,519.9831348426495);gate=(3580,830)
def project(p,s):
 x,z=s['a'];dx,dz=s['b'][0]-x,s['b'][1]-z;t=max(0,min(1,((p[0]-x)*dx+(p[1]-z)*dz)/(dx*dx+dz*dz)));return(x+dx*t,z+dz*t)
s=min(roads,key=lambda s:math.dist(p,project(p,s)));start=project(p,s);end=min([s['a'],s['b']],key=lambda q:math.dist(q,gate));path=[start,end];used={id(s)}
while sum(math.dist(x,y)for x,y in zip(path,path[1:]))<145:
 choices=[(r,q)for r in roads if id(r)not in used for q,e in [(r['a'],r['b']),(r['b'],r['a'])]if math.dist(e,path[-1])<.01]
 assert choices,'Disconnected source route'
 r,q=min(choices,key=lambda rq:math.dist(rq[1],gate));used.add(id(r));path.append(q)
poses=[]
for i in range(121):
 distance=i*140/120
 for x,y in zip(path,path[1:]):
  length=math.dist(x,y)
  if distance<=length:
   t=distance/length;poses.append({'x':x[0]+(y[0]-x[0])*t,'z':x[1]+(y[1]-x[1])*t,'dx':(y[0]-x[0])/length,'dz':(y[1]-x[1])/length});break
  distance-=length
out={'sourceSha256':a['sourceSha256'],'street':'Yaowarat Road','meters':140,'poses':poses}
(root/'scripts/yaowarat-alive-benchmark-route.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print(len(poses),'poses, source-derived',out['meters'],'meters')
