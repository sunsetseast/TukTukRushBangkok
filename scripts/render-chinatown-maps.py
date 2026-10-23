"""Reproducible north-up reference/current/proposed/implemented map exports.
Run from repo root. Matplotlib; source photography is never redistributed.
"""
from pathlib import Path
import json,gzip,math
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon,Patch
from matplotlib.lines import Line2D
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/qa/chinatown-reconstruction'
def world(label):
    p=OUT/f'{label}-world.json.gz'
    return json.loads(gzip.decompress(p.read_bytes())) if p.exists() else json.loads((OUT/f'{label}-world.json').read_text())
before,after=world('before'),world('after')
plan=json.loads((ROOT/'artifacts/tuk-tuk-rush/src/game/bangkok/chinatownPlan.v1.json').read_text())
colors={'yaowarat':'#d34b37','charoen_n':'#816132','charoen_s':'#816132','ratchawong':'#9b518c','mangkon':'#a4623e','mangkon-terminal':'#a4623e','plaeng-nam':'#a36f99','song-sawat':'#726b9f','songwat':'#1c857b','songwat-east':'#1c857b','songwat-central':'#1c857b','wanit-2':'#4a6b84','wanit-2-south':'#4a6b84','yotha':'#4a6b84','khao-lam':'#92513e','mittraphap':'#776a51','tri-mit':'#776a51','phadung-dao':'#b58b6c'}
def setup(title,reference=False):
    fig,ax=plt.subplots(figsize=(12,12));fig.patch.set_facecolor('#fcfaf5');ax.set_facecolor('#efeee5')
    ax.set_title(title,loc='left',fontsize=18,pad=22,fontweight='bold',color='#243f43')
    if reference:
        ax.set_xlim(100.499,100.519);ax.set_ylim(13.727,13.748);ax.set_aspect(1/math.cos(math.radians(13.74)))
        ax.ticklabel_format(useOffset=False,style='plain');ax.set_xlabel('WGS84 longitude (east)');ax.set_ylabel('WGS84 latitude (north)')
    else:
        ax.set_xlim(345,675);ax.set_ylim(845,450);ax.set_aspect('equal');ax.set_xlabel('Existing design x (east)');ax.set_ylabel('Existing design y (south)')
    ax.grid(alpha=.15);ax.annotate('N',xy=(.96,.97),xytext=(.96,.91),xycoords='axes fraction',ha='center',fontsize=14,fontweight='bold',arrowprops={'arrowstyle':'-|>','color':'#24494c'})
    fig.text(.125,.035,'Geography: © OpenStreetMap contributors · ODbL 1.0. Game controls are curated arcade compression, not surveyed parcels.',fontsize=9,color='#596766')
    return fig,ax
def xy(p):return (p['x']/4+500,p['z']/4+600)
def render_world(ax,d,parcels=True,muted=False):
    for r in d['riverPolygon']:ax.add_patch(Polygon([xy(p) for p in r],facecolor='#91c1cc',edgecolor='none',zorder=1))
    if parcels:
        for b in d['buildings']:
            x,y=xy(b)
            if not (340<x<680 and 440<y<850):continue
            c,s=math.cos(b.get('yaw',0)),math.sin(b.get('yaw',0))
            ps=[((b['x']+c*u+s*v)/4+500,(b['z']-s*u+c*v)/4+600) for u,v in [(-b['w']/2,-b['d']/2),(b['w']/2,-b['d']/2),(b['w']/2,b['d']/2),(-b['w']/2,b['d']/2)]]
            ax.add_patch(Polygon(ps,facecolor='#c58c65' if b.get('chinatown') else '#b2b39f',edgecolor='none',alpha=.9,zorder=3))
    nodes={n['id']:n for n in d['nodes']}
    for r in d['roads']:
        a,b=nodes[r['a']],nodes[r['b']];x,y=xy(a);X,Y=xy(b)
        ax.plot([x,X],[y,Y],color='#abb2a4' if muted else colors.get(r.get('corridor'),'#7a857c'),lw=.7 if muted else max(.7,r['width']/12),zorder=4)
    for l in d['landmarks']:
        q=l.get('plot',l);x,y=xy(q)
        if 345<x<675 and 450<y<845:
            ax.scatter(x,y,s=24,color='#293e4a',zorder=8);ax.annotate(l['name'],(x,y),xytext=(5,5),textcoords='offset points',fontsize=8,zorder=9)
def save(fig,name):
    fig.savefig(OUT/'maps'/f'{name}.png',dpi=160,bbox_inches='tight');fig.savefig(OUT/'maps'/f'{name}.svg',bbox_inches='tight');plt.close(fig);p=OUT/'maps'/f'{name}.svg';p.write_text('\n'.join(line.rstrip() for line in p.read_text().splitlines())+'\n')
fig,ax=setup('A · PR37 actual game — roads, footprints, landmarks and river');render_world(ax,before);save(fig,'current-game')
fig,ax=setup('B · Real Chinatown — retained geographic reference',True)
ref=json.loads((OUT/'references/osm-buildings-water.geojson').read_text())
for f in ref['features']:
    if f['geometry']['type']!='Polygon':continue
    ps=f['geometry']['coordinates'][0];water=f['properties'].get('natural')=='water'
    ax.add_patch(Polygon(ps,facecolor='#90c0cb' if water else '#b8b5a3',edgecolor='none',alpha=.8,zorder=1))
# Authoritative retained OSM riverbank polygons; a centerline stroke is not a bank.
riverbanks=json.loads((ROOT/'docs/qa/chao-phraya/reference/riverbanks-osm.geojson').read_text())
for f in riverbanks['features']:
    g=f['geometry'];polys=[g['coordinates']] if g['type']=='Polygon' else g['coordinates'] if g['type']=='MultiPolygon' else []
    for poly in polys:
        ax.add_patch(Polygon(poly[0],facecolor='#8ab9c6',edgecolor='none',zorder=1))
roads=json.loads((OUT/'references/osm-selected-roads.json').read_text());selected={v for s in plan['streets'] for v in s['sourceWays']};labeled=set()
for f in roads:
    ps=f['geometry'];name=f['tags'].get('name:en','');chosen=f['id'] in selected
    ax.plot([p[0] for p in ps],[p[1] for p in ps],color='#b9b8a8' if not chosen else '#b96342',lw=.45 if not chosen else 1.8,zorder=3)
    if chosen and name not in labeled and len(ps)>2:
        p=ps[len(ps)//2];ax.text(*p,name,fontsize=7,color='#283e42',bbox={'facecolor':'#fcfaf5','alpha':.8,'edgecolor':'none','pad':1},zorder=5);labeled.add(name)
for label,lon,lat in [('Odeon',100.51303,13.73717),('Wat Traimit',100.51363,13.7377),('Hua Lamphong',100.51676,13.73922),('Wat Mangkon',100.50944,13.74345),('Holy Rosary',100.51345,13.73126),('River City',100.5138,13.7302)]:
    ax.scatter(lon,lat,s=24,color='#263e48',zorder=6);ax.annotate(label,(lon,lat),xytext=(4,4),textcoords='offset points',fontsize=8,zorder=6)
save(fig,'reference-map')
fig,ax=setup('C · Approved compressed plan — preserved world overlaid');render_world(ax,before,parcels=False,muted=True)
poly=plan['boundary'];ax.add_patch(Polygon(poly,facecolor='#ead4a0',edgecolor='#b99555',alpha=.18,zorder=2))
for r in plan['streets']:
    xs=[p[0] for p in r['points']];ys=[p[1] for p in r['points']];col=colors.get(r['corridor'],'#655e4b');ax.plot(xs,ys,color=col,lw=2.5,zorder=7)
    if r['oneWay'] and len(xs)>2:
        i=len(xs)//2;ax.annotate('',xy=(xs[i],ys[i]),xytext=(xs[i-1],ys[i-1]),arrowprops={'arrowstyle':'-|>','color':col,'lw':1.2},zorder=8)
for p in plan['pedestrianPassages']:ax.plot([q[0] for q in p['points']],[q[1] for q in p['points']],ls=':',color='#918268',lw=2,zorder=6)
ax.legend(handles=[Line2D([0],[0],color='#aab2a4',label='Preserved PR37 context'),Line2D([0],[0],color='#d34b37',label='Yaowarat'),Line2D([0],[0],color='#1c857b',label='Song Wat'),Line2D([0],[0],color='#4a6b84',label='Talat Noi curated lanes')],loc='lower right',fontsize=9)
save(fig,'proposed-compressed-map')
fig,ax=setup('D · Implemented game — actual street-derived blocks and parcels')
render_world(ax,after)
blocks=json.loads((OUT/'blocks.json').read_text())
for b in blocks:ax.add_patch(Polygon([xy(p) for p in b['boundary']],facecolor='none',edgecolor='#b28b4b',lw=.45,zorder=2))
save(fig,'implemented-game')
print('Wrote four SVG/PNG comparison maps from retained source data and runtime snapshots.')
