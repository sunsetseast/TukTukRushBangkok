"""Create review maps and a photographic/WebGL gallery from committed evidence."""
from pathlib import Path
import gzip, json, math, html
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Circle

repo=Path(__file__).resolve().parents[3]
out=repo/'docs/qa/historic-visual-fidelity'
before=json.loads(gzip.decompress((out/'baseline-world.json.gz').read_bytes()))
after=json.loads((out/'map-after.json').read_text())
deltas=json.loads((out/'footprint-deltas.json').read_text())
def corners(b):
    c,s=math.cos(b.get('yaw',0)),math.sin(b.get('yaw',0))
    return [(b['x']+c*x+s*z,b['z']-s*x+c*z) for x,z in [(-b['w']/2,-b['d']/2),(b['w']/2,-b['d']/2),(b['w']/2,b['d']/2),(-b['w']/2,b['d']/2)]]
def key(b):return tuple(round(b.get(k,0),4) for k in ['x','z','w','d','yaw'])
removed={key(b) for b in deltas['removed']}
buildings=[b for b in before['buildings'] if key(b) not in removed]+deltas['added']
fig,axes=plt.subplots(1,2,figsize=(13,10),layout='constrained')
for ax,title,bs in zip(axes,['PR32 main: inherited frontage','PR33: public approach and pier alley'],[before['buildings'],buildings]):
    ax.set(facecolor='#ece4d4',xlim=(-1120,-660),ylim=(-580,-1120),aspect='equal',title=title)
    river=before['river']
    for a,b in zip(river,river[1:]):
        dx,dz=b['x']-a['x'],b['z']-a['z'];length=math.hypot(dx,dz);rx,rz=dz/length*before['riverWidth']/2,-dx/length*before['riverWidth']/2
        ax.add_patch(Polygon([(a['x']+rx,a['z']+rz),(b['x']+rx,b['z']+rz),(b['x']-rx,b['z']-rz),(a['x']-rx,a['z']-rz)],facecolor='#62b8c4',zorder=0))
        ax.add_patch(Circle((a['x'],a['z']),before['riverWidth']/2,facecolor='#62b8c4',zorder=0))
    nodes={n['id']:n for n in before['nodes']}
    for r in before['roads']:
        a,b=nodes[r['a']],nodes[r['b']]
        dx,dz=b['x']-a['x'],b['z']-a['z'];length=math.hypot(dx,dz)
        if not length:continue
        rx,rz=dz/length*r['width']/2,-dx/length*r['width']/2
        ax.add_patch(Polygon([(a['x']+rx,a['z']+rz),(b['x']+rx,b['z']+rz),(b['x']-rx,b['z']-rz),(a['x']-rx,a['z']-rz)],facecolor='#727979',zorder=1))
    for b in bs:
        if -1140<b['x']<-650 and -1130<b['z']<-560:
            color='#cc7368' if title.startswith('PR32') and key(b) in removed else '#b8a47e'
            ax.add_patch(Polygon(corners(b),facecolor=color,edgecolor='#70674f',linewidth=.25,zorder=2))
    for id,w,d in [('palace',202.5,202.5),('pho',115,100)]:
        l=next(l for l in before['landmarks'] if l['id']==id);p=l['plot']
        o={'x':p['x']+(7.5 if id=='pho' else 0),'z':p['z']+(18 if id=='pho' else 0),'w':w,'d':d}
        ax.add_patch(Polygon(corners(o),facecolor='#edc466',edgecolor='#79571f',zorder=2))
        ax.text(p['x'],p['z'],id.upper(),ha='center',fontsize=10,zorder=5)
    if title.startswith('PR33'):
        for p in after['parcels'][:2]:
            # The two new parcels precede inherited Pho arrival reservations.
            ax.add_patch(Polygon([(q['x'],q['z']) for q in p['boundary']],facecolor='#58a58a',alpha=.7,zorder=4))
    ax.text(-1105,-1095,'N ↑',fontsize=14)
    ax.set_xlabel('Game metres, east →');ax.set_ylabel('Game north-up z')
fig.suptitle('Palace–Tha Tien–Wat Pho: same roads and river; bounded footprint corrections\nPlan view from actual world data; authored compressed parcels, not cadastral mapping',fontsize=12)
fig.savefig(out/'riverfront-before-after.png',dpi=150);plt.close(fig)

refs={
 'palace':('../landmark-accuracy/references/palace-gate.jpg','Palace north gate; see inherited attribution'),
 'pho':('../landmark-accuracy/references/pho.jpg','Wat Pho chedi court; does not prove every street frontage'),
 'palace-river':('references/palace-river.jpg','Mda, public domain; river-facing Palace context'),
 'golden':('../landmark-accuracy/references/golden.jpg','Golden Mount; inherited CC BY 4.0 reference'),
 'traimit':('../historic-bangkok/references/traimit-full.jpg','Ovedc, CC BY-SA 4.0'),
 'democracy':('../landmark-accuracy/references/democracy.jpg','Marcin Konsek, CC BY-SA 4.0'),
 'swing':('../landmark-accuracy/references/swing.jpg','KOSIN SUKHUM, CC BY-SA 4.0'),
 'sanam':('../historic-bangkok/references/sanam.jpg','Adbar, CC BY-SA 3.0'),
 'hua':('../landmark-accuracy/references/hua.jpg','KarlDubost, CC BY-SA 3.0'),
 'gate':('../landmark-accuracy/references/gate.jpg','Marcin Konsek, CC BY-SA 4.0'),
 'tha-tien':('references/tha-tien.jpg','Weerayas, CC BY-SA 3.0; street-facing heritage blocks'),
}
if not (out/'references/tha-tien.jpg').exists():refs['tha-tien']=('https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/%E0%B8%96%E0%B8%99%E0%B8%99.JPG/960px-%E0%B8%96%E0%B8%99%E0%B8%99.JPG','Weerayas, CC BY-SA 3.0; external image, network required')
cards=[]
for id in ['palace','pho','palace-river','tha-tien','golden','traimit','democracy','swing','sanam','hua','gate']:
    landmark='palace' if id=='palace-river' else 'pho' if id=='tha-tien' else id
    primary='river' if id in ['palace-river','tha-tien'] else 'ground'
    imgs=[('Real photograph',*refs[id]),('PR32 before',f'before/{landmark}-{primary}.jpg','Actual unchanged-main WebGL'),('PR33 after',f'after/{landmark}-{primary}.jpg','Actual new WebGL'),('Elevated before',f'before/{landmark}-elevated.jpg','PR32 inspection camera'),('Elevated after',f'after/{landmark}-elevated.jpg','PR33 inspection camera'),('Normal driving before',f'before/{landmark}-driving.jpg','Unmodified PR32 chase camera'),('Normal driving after',f'after/{landmark}-driving.jpg','Unmodified PR33 chase camera')]
    night=f'after/{landmark}-night.jpg' if (out/f'after/{landmark}-night.jpg').exists() else f'night/{landmark}-night.jpg'
    if (out/night).exists():imgs.append(('Night after',night,'Actual sunset/night-cycle WebGL'))
    cards.append('<section><h2>'+html.escape(id)+'</h2><div class="grid">'+''.join(f'<figure><figcaption>{html.escape(title)}</figcaption><a href="{src}"><img src="{src}"></a><small>{html.escape(note)}</small></figure>' for title,src,note in imgs)+'</div></section>')
page='''<!doctype html><meta charset="utf-8"><title>Historic Bangkok fidelity review</title><style>body{background:#15212b;color:#f5efdd;font:16px system-ui;margin:2rem}h1,h2{color:#f7c76b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:14px}figure{margin:0;background:#243440;padding:10px}img{width:100%;height:230px;object-fit:contain}small{display:block;color:#c4c9c7}section{margin-block:40px}a{color:#7fdbc5}</style><h1>Historic Bangkok visual-fidelity review</h1><p>Real photographs and actual medium-quality WebGL. Photographs show architectural reference, not identical camera/compression. HUD hidden; city objects retained. Low river views and remaining obstructions are included. No hardware-iPhone or full cadastral certification.</p><p><a href="README.md">Results and limitations</a> · <a href="sources.md">Source/photograph licences</a> · <a href="obstructions.md">Six obstruction investigations</a></p>'''+''.join(cards)
(out/'comparisons.html').write_text(page)
(out/'comparisons.md').write_text('# Real photographs and actual WebGL\n\n[Open the full comparison gallery](comparisons.html). This includes all ten requested locations/corridors, the waterfront and Tha Tien. Each has a real photograph, unchanged PR32 main view, new same-pose view, elevated inspection and ordinary driving view.\n\n[Photograph attribution](sources.md). Photographs are architectural references rather than matched lens/projection surveys. Negative river and blocked approach views remain in the evidence.\n\n| PR32 Palace waterfront | PR33 Palace waterfront |\n|---|---|\n| ![Before](before/palace-river.jpg) | ![After](after/palace-river.jpg) |\n\n| PR32 Golden Mount | PR33 Golden Mount |\n|---|---|\n| ![Before](before/golden-elevated.jpg) | ![After](after/golden-elevated.jpg) |\n')
print(out/'comparisons.html')
