"""Compare OSM reference and exact runtime snapshots; never call game geometry surveyed."""
import pathlib,json,gzip,math
import matplotlib;matplotlib.use('Agg');matplotlib.rcParams['svg.hashsalt']='bang-rak-pr43'
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
root=pathlib.Path(__file__).resolve().parents[3];out=root/'docs/qa/bang-rak-geography'
old=json.loads(gzip.decompress((out/'validation/pr42-world.json.gz').read_bytes()));new=json.loads(gzip.decompress((out/'validation/pr43-world.json.gz').read_bytes()));plan=json.loads((out/'district-plan.json').read_text())
def ring(b):
 c,s=math.cos(b.get('yaw',0)),math.sin(b.get('yaw',0));return [(b['x']+c*u+s*v,b['z']-s*u+c*v) for u,v in [(-b['w']/2,-b['d']/2),(b['w']/2,-b['d']/2),(b['w']/2,b['d']/2),(-b['w']/2,b['d']/2)]]
def world(ax,d,title,proposal=False):
 ns={n['id']:n for n in d['nodes']}
 for r in d['riverPolygon']:ax.add_patch(Polygon([(p['x'],p['z']) for p in r],facecolor='#9fc9d1',zorder=0))
 for poly in d.get('riverStructures',[]):ax.add_patch(Polygon([(p['x'],p['z']) for p in poly],facecolor='#a08f70',zorder=1))
 for site in d.get('authoredSites',[]):
  if site['id'] in ['river-city','oriental']:ax.add_patch(Polygon([(p['x'],p['z']) for p in site['boundary']],fill=False,edgecolor='#9f7266',lw=.8,ls='--',zorder=4))
 bodies={tuple(b.get(k,0) for k in ['x','z','w','d','yaw']):b for b in d['buildings']+[o for o in d['obstacles'] if o.get('landmarkId') and not o.get('artRole')]}
 for b in bodies.values():
  if -430<b['x']<225 and 670<b['z']<1080:ax.add_patch(Polygon(ring(b),facecolor='#c18a57' if b.get('environmentId','').startswith('brg:') else '#cfb979' if b.get('landmarkId') else '#c1c2b5',edgecolor='#898e85',lw=.3,zorder=2))
 for r in d['roads']:
  a,b=ns[r['a']],ns[r['b']]
  if not(-440<a['x']<230 and 650<a['z']<1090):continue
  seam=r['a'].startswith('brg:')or r['b'].startswith('brg:');ax.plot([a['x'],b['x']],[a['z'],b['z']],lw=r['width']*.5,color='#397bab' if seam and r.get('corridor')=='river-city-interface' else '#117e80' if seam else '#65747e',solid_capstyle='round',zorder=3)
 if proposal:
  for street in plan['plan']['streets']:
   ps=street['points'];ax.plot([p['x'] for p in ps],[p['z'] for p in ps],ls='--',lw=3,color='#d46c31',zorder=6)
  ps=plan['plan']['streets'][0]['points'][:2];ax.plot([p['x'] for p in ps],[p['z'] for p in ps],ls='--',lw=3,color='#397bab',zorder=6)
  for b in plan['retired']:ax.add_patch(Polygon(ring(b),facecolor='#cc6856',alpha=.8,zorder=5))
 for l in d['landmarks']:
  if l['id'] in ['river-city','holy-rosary','warehouse-30','grand-postal','oriental']:ax.text(l['x'],l['z'],l['id'].replace('-',' '),fontsize=7,color='#492c22',ha='center',zorder=7)
 if d is new:
  ax.text(-222,828,'Local arrival ↔',fontsize=6,color='#285c84',zorder=7);ax.text(-50,810,'Si Phraya →',rotation=8,ha='center',fontsize=8,color='#005e61',zorder=7);ax.text(-174,852,'Captain Bush ↑',rotation=90,fontsize=7,color='#005e61',zorder=7)
 ax.set(xlim=(-680,210),ylim=(1080,670),xlabel='Game X (m)',ylabel='Game Z (north is up)');ax.set_aspect('equal');ax.grid(alpha=.12);ax.set_title(title,fontsize=11,loc='left')
fig,axes=plt.subplots(2,2,figsize=(15,12),facecolor='#faf8f0');ref=json.loads((root/'data/bangkok/bang-rak-reference.v1.json').read_text());ax=axes[0,0]
for f in json.loads((root/'data/bangkok/osm-reference.v1.geojson').read_text())['features']:
 if f['properties'].get('waterway')=='river' and 'Chao Phraya' in f['properties'].get('name:en',''):
  ps=f['geometry']['coordinates'];ax.plot([p[0] for p in ps],[p[1] for p in ps],color='#7caebd',lw=3,alpha=.8)
for f in json.loads((out/'heritage-reference-footprints.json').read_text())['features']:
 ax.add_patch(Polygon(f['footprint'],facecolor='#dbc48d',edgecolor='#ad8e4c',lw=.6))
 if f['id']=='grand-postal':ax.text(f['coordinate']['lon'],f['coordinate']['lat'],'Grand Postal / TCDC',fontsize=6,clip_on=True)
seen=set()
for f in ref['features']:
 if f['tags'].get('highway') not in ['primary','secondary','tertiary','residential']:continue
 ps=f['coordinates'];name=f['tags'].get('name:en','');focus=any(s in name for s in ['Si Phraya','Krung 30','Krung 32','Krung 24','Maha Set'])
 ax.plot([p[0] for p in ps],[p[1] for p in ps],lw=2 if focus else .6,color='#168283' if focus else '#9daba8')
 if focus and name not in seen and len(ps)>2:
  seen.add(name);ax.text(ps[len(ps)//2][0],ps[len(ps)//2][1],name,fontsize=6,clip_on=True)
for id,lat,lon in [('River City',13.7301721,100.5132093),('Warehouse 30',13.7279609,100.5145101),('Soi30 entry',13.7291636,100.5157633)]:ax.plot(lon,lat,'o',ms=3,color='#ba6437');ax.text(lon,lat,id,fontsize=7)
ax.set(xlim=(100.5124,100.5195),ylim=(13.7257,13.7328),xlabel='WGS84 longitude',ylabel='WGS84 latitude');ax.set_aspect(1/math.cos(math.radians(13.73)));ax.ticklabel_format(useOffset=False,style='plain');ax.grid(alpha=.2);ax.set_title('A · Real reference: OSM polylines, not a survey',loc='left',fontsize=11)
world(axes[0,1],old,'B · Immutable PR42 game world')
world(axes[1,0],old,'C · Selected proposal: new roads / retired lots',True)
world(axes[1,1],new,'D · Final production world: connected northern seam')
fig.suptitle('Bang Rak / Talat Noi interface · geographic comparison',fontsize=17,y=.99);fig.text(.05,.015,'© OpenStreetMap contributors · ODbL 1.0. A uses reference coordinates. B–D use compressed game metres. Different extents/scales; no surveyed equivalence claimed.\nC is the implemented proposal preserved for review; it is not a separate simulation. Amber: new street-facing properties. Blue: two-way local arrival spur. Wider Silom/Sathon and eastern Si Phraya remain deferred.',fontsize=9)
fig.tight_layout(rect=(0,.055,1,.97));fig.savefig(out/'geographic-comparison.svg',metadata={'Date':None});fig.savefig(out/'geographic-comparison.png',dpi=140);plt.close(fig)

svg=out/'geographic-comparison.svg';svg.write_text('\n'.join(line.rstrip() for line in svg.read_text().splitlines())+'\n')
