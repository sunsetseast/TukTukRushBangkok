"""Offline, deterministic network authoring from the immutable PR43 stage.
No network, randomness or broad deletion areas. The output is a runtime ledger.
"""
import json, math, gzip, pathlib, hashlib
ROOT=pathlib.Path(__file__).resolve().parents[3]
SRC=ROOT/'artifacts/tuk-tuk-rush/src/game/bangkok'
OUT=ROOT/'docs/qa/bang-rak-completion'
BASE=OUT/'validation/pr43-stage.json.gz'
d=json.loads(gzip.decompress(BASE.read_bytes()))
plan=json.loads((SRC/'bangRakCompletionPlan.v1.json').read_text())
ns={n['id']:n for n in d['nodes']}
def key(p):return (round(p['x'],6),round(p['z'],6))
coords={key(n):n['id'] for n in d['nodes']}
newnodes=[]
def node(p):
 k=key(p)
 if k in coords:return coords[k]
 id='brc:%d:%d'%(round(p['x']*1e4),round(p['z']*1e4));n=dict(p,id=id)
 coords[k]=id;ns[id]=n;newnodes.append(n);return id
def cross(a,b):return a[0]*b[1]-a[1]*b[0]
def intersection(a,b,c,e):
 v=(b['x']-a['x'],b['z']-a['z']);w=(e['x']-c['x'],e['z']-c['z']);q=(c['x']-a['x'],c['z']-a['z']);den=cross(v,w)
 if abs(den)<1e-8:return
 t=cross(q,w)/den;u=cross(q,v)/den
 if -1e-8<=t<=1+1e-8 and -1e-8<=u<=1+1e-8:return max(0,min(1,t)),max(0,min(1,u))
def volume(a,b,width,pad=0):
 return dict(x=(a['x']+b['x'])/2,z=(a['z']+b['z'])/2,w=width+pad*2,d=math.hypot(a['x']-b['x'],a['z']-b['z'])+pad*2,yaw=math.atan2(b['x']-a['x'],b['z']-a['z']))
def overlap(a,b,pad=0):
 axes=[]
 for p in [a,b]:
  y=p.get('yaw',0);axes.extend([(math.cos(y),-math.sin(y)),(math.sin(y),math.cos(y))])
 for x,z in axes:
  dist=abs((a['x']-b['x'])*x+(a['z']-b['z'])*z)
  def extent(p):
   y=p.get('yaw',0);return abs(math.cos(y)*x-math.sin(y)*z)*p['w']/2+abs(math.sin(y)*x+math.cos(y)*z)*p['d']/2
  if dist>=extent(a)+extent(b)+pad:return False
 return True
# Explicitly replace just the inherited western Silom chord.
removed=[r for r in d['roads'] if r.get('corridor')=='silom' and ns[r['a']]['x']<600 and ns[r['b']]['x']<=600]
segments=[]
for r in d['roads']:
 if r not in removed:segments.append(dict(road=r,a=ns[r['a']],b=ns[r['b']],cuts=[0.,1.],old=True))
for street in plan['streets']:
 for a,b in zip(street['points'],street['points'][1:]):
  r=dict(a='',b='',width=street['width'],name=street['name'],corridor=street['id'],oneWay=street['oneWay'],spawnTraffic=False)
  segments.append(dict(road=r,a=dict(x=a[0],z=a[1]),b=dict(x=b[0],z=b[1]),cuts=[0.,1.],old=False))
for i,s in enumerate(segments):
 for t in segments[i+1:]:
  if s['old'] and t['old']:continue
  hit=intersection(s['a'],s['b'],t['a'],t['b'])
  if hit:
   # Private arrivals do not become public shortcuts.
   if s['road'].get('destinationId') or t['road'].get('destinationId'):raise Exception('New road crosses private approach')
   s['cuts'].append(hit[0]);t['cuts'].append(hit[1])
roads=[];split=[]
for s in segments:
 cuts=sorted(set(round(c,9) for c in s['cuts']))
 if s['old'] and cuts==[0.,1.]:continue
 if s['old']:split.append(s['road'])
 for lo,hi in zip(cuts,cuts[1:]):
  span=(hi-lo)*math.hypot(s['b']['x']-s['a']['x'],s['b']['z']-s['a']['z'])
  steps=1 if s['old'] else max(1,math.ceil(span/24))
  for j in range(steps):
   def at(t):return dict(x=s['a']['x']+(s['b']['x']-s['a']['x'])*t,z=s['a']['z']+(s['b']['z']-s['a']['z'])*t)
   a=node(at(lo+(hi-lo)*j/steps));b=node(at(lo+(hi-lo)*(j+1)/steps))
   if a!=b:roads.append(dict(s['road'],a=a,b=b))
newvol=[volume(ns[r['a']],ns[r['b']],r['width'],3.3) for r in roads if not r.get('corridor') in ['sathorn','charoen_s','ramaiv','silom'] or r.get('spawnTraffic')==False]
sitevol=[dict(site['origin'],w=site['w'],d=site['d'],yaw=site['yaw']) for site in plan.get('sites',[])]
retired=[];blocked=[]
for b in d['obstacles']:
 if any(overlap(b,v) for v in newvol+sitevol):
  if b.get('landmarkId') or ((b.get('protected') or b.get('chinatown')) and b.get('environmentId') not in {'ctparcel:ctblock:0:1:6','ctparcel:ctblock:0:1:7','ctparcel:ctblock:0:1:8','br:charoen-east-3','br:charoen-east-4'}):blocked.append(b)
  else:retired.append(dict(body=b,reason='Intersects researched road/sidewalk envelope'))
used={r[k] for r in d['roads'] if r not in removed+split for k in ['a','b']}|{r[k] for r in roads for k in ['a','b']}
retiredNodes=[n for n in d['nodes'] if n['id'] not in used]
output=dict(retiredNodes=retiredNodes,version=1,baseline=plan['baseline'],baselineStageSha256=hashlib.sha256(BASE.read_bytes()).hexdigest(),nodes=newnodes,retiredRoads=removed,splitRoads=split,roads=roads,retired=retired,parcels=[],sites=[],blocked=blocked)
(SRC/'bangRakCompletionMigration.v1.json').write_text(json.dumps(output,indent=2)+'\n')
print(json.dumps(dict(nodes=len(newnodes),roads=len(roads),retiredRoads=len(removed),splitRoads=len(split),retired=len(retired),blocked=[dict(id=b.get('environmentId'),landmark=b.get('landmarkId'),x=b['x'],z=b['z'],w=b['w'],d=b['d']) for b in blocked]),indent=2))
