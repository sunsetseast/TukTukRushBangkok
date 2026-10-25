"""Source topology / pre-PR / final comparison. Explicitly separate coordinate frames."""
import json,gzip,pathlib,matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
ROOT=pathlib.Path(__file__).resolve().parents[3];OUT=ROOT/'docs/qa/bang-rak-completion'
plan=json.loads((ROOT/'artifacts/tuk-tuk-rush/src/game/bangkok/bangRakCompletionPlan.v1.json').read_text())
old=json.loads(gzip.decompress((OUT/'validation/pr43-world.json.gz').read_bytes()));new=json.loads(gzip.decompress((OUT/'validation/final-world.json.gz').read_bytes()))
colors={'si-phraya':'#d4852e','surawong':'#9c4c88','silom':'#2878b3','maha-set':'#668d3c','mahesak':'#668d3c','surasak-road':'#668d3c','pan':'#4e9696','decho':'#4e9696','naret':'#4e9696','charoen_s':'#9f5545','sathorn':'#525f7d','narathiwas':'#525f7d','charoen-krung-30':'#8e764a','charoen-krung-32':'#8e764a'}
nameids={'Si Phraya Road':'si-phraya','Surawong Road':'surawong','Si Lom Road':'silom','Maha Set Road':'maha-set','Mahesak Road':'mahesak','Surasak Road':'surasak-road','Pan Road':'pan','Decho Road':'decho','Naret Road':'naret','Sathon Nuea Road':'sathorn','Sathon Tai Road':'sathorn','Charoen Krung Road':'charoen_s'}
fig,axs=plt.subplots(1,3,figsize=(19,8),layout='constrained');fig.patch.set_facecolor('#f5f2e9')
ax=axs[0]
source=json.loads((ROOT/'data/bangkok/osm-reference.v1.geojson').read_text())['features'];more=json.loads((ROOT/'data/bangkok/bang-rak-reference.v1.json').read_text())['features'];seen=set()
for f in source:
 name=f['properties'].get('name:en','');corr=nameids.get(name)
 if not corr or f['geometry']['type']!='LineString':continue
 pts=f['geometry']['coordinates'];ax.plot([p[0] for p in pts],[p[1] for p in pts],c=colors[corr],lw=1.6);seen.add(f['id'].replace('osm:',''))
for f in more:
 corr=nameids.get(f['tags'].get('name:en',''))
 if not corr or f['id'] in seen or not f['tags'].get('highway'):continue
 pts=f['coordinates'];ax.plot([p[0] for p in pts],[p[1] for p in pts],c=colors[corr],lw=1.6)
ax.set_xlim(100.512,100.536);ax.set_ylim(13.717,13.735);ax.set_aspect(1/.972);ax.set_xlabel('Longitude (OSM reference)');ax.set_ylabel('Latitude');ax.set_title('SOURCE TOPOLOGY\nAttributed OSM snapshots; selected named ways',loc='left',fontweight='bold',fontsize=11)
for ax,d,title in zip(axs[1:],[old,new],['BEFORE · PR43','AFTER · PR44']):
 ns={n['id']:n for n in d['nodes']}
 for r in d['roads']:
  a,b=ns[r['a']],ns[r['b']]
  ax.plot([a['x'],b['x']],[a['z'],b['z']],c=colors.get(r.get('corridor'),'#d3d1ca'),lw=1.7 if r.get('corridor') in colors else .65)
 for l in d['landmarks']:
  p=l.get('plot',l)
  if l['id'] in ['state','mahanakhon','river-city','grand-postal','warehouse-30','oriental','assumption']:
   ax.scatter(p['x'],p['z'],s=16,c='#272e35');ax.annotate(l['id'],(p['x'],p['z']),xytext=(3,4),textcoords='offset points',fontsize=6.3)
 ax.set_xlim(-420,1120);ax.set_ylim(1540,230);ax.set_aspect('equal');ax.set_xlabel('Game x · east');ax.set_ylabel('Game z · south');ax.set_title(title+'\nNorth-up compressed controls; not a survey',loc='left',fontweight='bold',fontsize=11)
for ax in axs:ax.set_facecolor('#fffdf7');ax.grid(alpha=.18);ax.tick_params(labelsize=7)
fig.legend(handles=[Line2D([0],[0],color=colors[k],lw=3,label=k) for k in ['si-phraya','surawong','silom','maha-set','pan','charoen_s','sathorn']],loc='outside lower center',ncols=7,frameon=False,fontsize=9)
fig.suptitle('BANG RAK · CONNECTED CORRIDORS',x=.01,ha='left',fontsize=19,fontweight='bold')
fig.savefig(OUT/'geographic-comparison.png',dpi=150);fig.savefig(OUT/'geographic-comparison.svg')
