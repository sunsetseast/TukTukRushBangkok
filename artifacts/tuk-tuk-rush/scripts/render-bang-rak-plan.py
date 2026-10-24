"""Plot exact approved game geometry; this is not a real-world survey map."""
import json,gzip,math,pathlib
import matplotlib;matplotlib.use('Agg');matplotlib.rcParams['svg.hashsalt']='bang-rak-v1'
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon,Patch
root=pathlib.Path(__file__).resolve().parents[3];out=root/'docs/qa/bang-rak'
old=json.loads(gzip.decompress((out/'validation/pr41-world.json.gz').read_bytes()));plan=json.loads((out/'district-plan.json').read_text())
def ring(b):
 c=math.cos(b.get('yaw',0));s=math.sin(b.get('yaw',0));return [(b['x']+c*u+s*v,b['z']-s*u+c*v) for u,v in [(-b['w']/2,-b['d']/2),(b['w']/2,-b['d']/2),(b['w']/2,b['d']/2),(-b['w']/2,b['d']/2)]]
def key(b):return tuple(round(b.get(k,0),4) for k in ['x','z','w','d','yaw'])
removed={key(b) for b in plan['removed']};fig,ax=plt.subplots(figsize=(12,7),facecolor='#f5f3eb');ax.set_facecolor('#eeeadd')
for r in old.get('riverPolygon',[])[:1]:ax.add_patch(Polygon([(p['x'],p['z']) for p in r],color='#83b5c6'))
for b in old['buildings']:
 if -460<b['x']<260 and 700<b['z']<1130 and key(b) not in removed:ax.add_patch(Polygon(ring(b),facecolor='#b9b8ac',edgecolor='#92978e',lw=.35))
ns={n['id']:n for n in old['nodes']}
for r in old['roads']:
 a,b=ns[r['a']],ns[r['b']]
 if not(-480<a['x']<280 and 680<a['z']<1150):continue
 ax.plot([a['x'],b['x']],[a['z'],b['z']],color='#79878b',lw=r['width']*.75,solid_capstyle='round',zorder=3)
for lane in plan['plan']['lanes']:
 a,b=lane['near'],lane['end'];ax.plot([a['x'],b['x']],[a['z'],b['z']],color='#374b55',lw=lane['width']*.85,zorder=4,solid_capstyle='round');ax.text(-46,(a['z']+b['z'])/2-3,'Soi 30 · Captain Bush Lane' if lane['id'].endswith('30') else 'Soi 32',ha='center',va='bottom',fontsize=8,color='#203943',zorder=8)
for p in plan['parcels']:
 b=p['body'];color='#3f8a84' if p['family']=='warehouse' else '#c68e58';ax.add_patch(Polygon(ring(b),facecolor=color,edgecolor='#fff9ec',lw=.6,zorder=5))
 yaw=b.get('yaw',0);start=(b['x']+math.sin(yaw)*b['d']/2,b['z']+math.cos(yaw)*b['d']/2);ax.annotate('',xy=(start[0]+math.sin(yaw)*9,start[1]+math.cos(yaw)*9),xytext=start,arrowprops=dict(arrowstyle='-|>',color='#16383d',lw=.8),zorder=7)
for p in plan['protectedParcels']:
 if p['landmarkId']=='grand-postal':ax.add_patch(Polygon([(q['x'],q['z']) for q in p['boundary']],facecolor='#d7b85c' if p['use']=='structure' else '#e3d6ad',edgecolor='#947c3d',lw=.7,zorder=6 if p['use']=='structure' else 2))
for site in old['authoredSites']:
 if site['id'] in ['river-city','oriental']:
  ax.add_patch(Polygon([(q['x'],q['z']) for q in site['boundary']],fill=False,edgecolor='#725f58',ls='--',lw=1.3,zorder=8));ax.text(site['origin']['x'],site['origin']['z'], 'RIVER CITY\nprotected' if site['id']=='river-city' else 'MANDARIN ORIENTAL\nprotected',ha='center',va='center',fontsize=8,color='#5c4841',zorder=9)
ax.add_patch(Polygon([(p['x'],p['z']) for p in plan['approvedBoundary']],fill=False,edgecolor='#856492',lw=1.2,ls=':',zorder=9))
ax.text(61,987,'POSTAL / TCDC',rotation=90,ha='center',fontsize=8,zorder=9);ax.text(-66,908,'WAREHOUSE 30',ha='center',fontsize=8,color='white',zorder=8);ax.text(140,1025,'Charoen Krung',rotation=74,fontsize=9,color='#354b52',zorder=8)
ax.set(xlim=(-420,235),ylim=(1110,720),xlabel='Game-world X · east →',ylabel='Game-world Z · north is up')
ax.set_aspect('equal');ax.grid(alpha=.13);ax.set_title('Historic Bang Rak · exact game-world parcel plan',loc='left',fontweight='bold',pad=12)
ax.legend(handles=[Patch(color='#3f8a84',label='Eight warehouse sheds'),Patch(color='#c68e58',label='Authored merchant / creative properties'),Patch(color='#d7b85c',label='Postal civic masses'),Patch(color='#b9b8ac',label='Preserved existing buildings')],loc='upper left',bbox_to_anchor=(0,-.13),ncol=2,frameon=False,fontsize=9)
fig.text(.13,.02,'Arrows show actual facade normals. Dotted line: fitted work collar. Dashed lines: protected compounds. Compressed game geometry, not GPS / cadastral accuracy.',fontsize=8,color='#5d6262')
fig.subplots_adjust(bottom=.2);fig.savefig(out/'district-plan.svg',bbox_inches='tight',metadata={'Date':None});plt.close(fig)
svg=out/'district-plan.svg';svg.write_text('\n'.join(line.rstrip() for line in svg.read_text().splitlines())+'\n')
