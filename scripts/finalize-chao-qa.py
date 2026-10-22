"""Reproduce the PR36 final runtime overlay and evidence manifests, offline."""
import json,pathlib,gzip,math,hashlib,subprocess,statistics
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as Patch
from shapely.geometry import Polygon,Point,LineString
from shapely.ops import unary_union
ROOT=pathlib.Path(__file__).resolve().parents[1];out=ROOT/'docs/qa/chao-phraya'
def load(p):return json.loads(pathlib.Path(p).read_text())
a=json.loads(gzip.decompress((out/'before-world.json.gz').read_bytes()));d=json.loads(gzip.decompress((out/'after-world.json.gz').read_bytes()));n={p['id']:p for p in d['nodes']}
canonical=load(ROOT/'artifacts/tuk-tuk-rush/src/game/bangkok/cityData.v1.json')['waterApproval'];proposal=load(out/'proposed-river.json');assert canonical['polygon']==proposal['polygon'],'Candidate/runtime geographic shape drift'
fig,ax=plt.subplots(figsize=(10,12),layout='constrained');ax.set_facecolor('#f3eee0');ax.set_title('D · FINAL LIVE-WORLD RIVER / NORTH UP',loc='left',fontweight='bold',pad=14)
water=load(ROOT/'artifacts/tuk-tuk-rush/src/game/bangkok/roadSurfaces.generated.json')['water']
for polygon in water:
 for i,ring in enumerate(polygon):ax.add_patch(Patch(ring,facecolor='#4faebd' if i==0 else '#f3eee0',edgecolor='#276579',lw=.4))
for r in d['roads']:
 x,y=n[r['a']],n[r['b']];ax.plot([x['x'],y['x']],[x['z'],y['z']],color='#9e396b' if r.get('corridor')=='arrival:asiatique' else '#9a8350' if r.get('bridge') else '#93978c',lw=1.2 if r.get('bridge') else .4)
old=load(out/'base-water.json') if (out/'base-water.json').exists() else json.loads(subprocess.check_output(['git','show','9cfac02c7ccc960b2e153f407e0a6543d44b5a19:artifacts/tuk-tuk-rush/src/game/bangkok/roadSurfaces.generated.json'],cwd=ROOT))['water']
for p in old:
 ps=p[0];ax.plot([v[0] for v in ps],[v[1] for v in ps],ls='--',color='#a16c98',lw=.8)
ids=['palace','pho','arun','gate','icon','river-city','hilton','oriental','peninsula','shangri','capella','four-seasons','asiatique','anantara']
for l in d['landmarks']:
 if l['id'] not in ids:continue
 p=l['plot'];ax.scatter(p['x'],p['z'],s=18,color='#352e4d',zorder=4);ax.annotate('Chinatown / Yaowarat' if l['id']=='gate' else l['id'],(p['x'],p['z']),xytext=(4,2),textcoords='offset points',fontsize=6.6)
geometry=load(out/'validation/geometry.json')
for p in geometry['piers']:ax.scatter(p['point']['x'],p['point']['z'],s=10,color='#db7548',marker='^',zorder=4)
for w,color,ls in [(a['bounds'],'#777b70',':'),(d['bounds'],'#9b4c2a','-.')]:ax.add_patch(Patch([[w['minX'],w['minZ']],[w['maxX'],w['minZ']],[w['maxX'],w['maxZ']],[w['minX'],w['maxZ']]],fill=False,ec=color,ls=ls,lw=1.2))
ax.text(.97,.98,'N ↑',transform=ax.transAxes,ha='right',va='top',fontweight='bold');ax.set_xlim(-2080,2580);ax.set_ylim(2870,-2470);ax.set_aspect('equal');ax.grid(alpha=.15);ax.set_xlabel('Game X · orange triangles: actual piers · purple dash: PR35 water');ax.set_ylabel('Game Z · brown outline: playable boundary');fig.text(.02,.005,'© OpenStreetMap contributors · ODbL 1.0 | Live generated world, not surveyed game coordinates',fontsize=7);fig.savefig(out/'maps/map-D.png',dpi=180);fig.savefig(out/'maps/map-D.svg');plt.close(fig)
# Explicitly account for reflow, including the existing capped solver's remote deltas.
key=lambda b:':'.join(f'{v:.4f}' for v in [b['x'],b['z'],b['w'],b['d'],b.get('yaw',0)])
ak={key(b) for b in a['buildings']};dk={key(b) for b in d['buildings']};removed=[b for b in a['buildings'] if key(b) not in dk];added=[b for b in d['buildings'] if key(b) not in ak];bank=Polygon([(p['x'],p['z']) for p in d['riverPolygon'][0]]).boundary
reflow=dict(before=len(a['buildings']),after=len(d['buildings']),removed=len(removed),added=len(added),fartherThan400FromNewBank=[dict(id=b.get('environmentId'),key=key(b),distance=round(Point(b['x'],b['z']).distance(bank),2)) for b in removed+added if Point(b['x'],b['z']).distance(bank)>400]);(out/'reflow-summary.json').write_text(json.dumps(reflow,indent=2)+'\n')
# Resource and browser samples; software frame times are diagnostic, not iPhone FPS.
b=load(out/'validation/before-inventory.json');c=load(out/'validation/after-inventory.json');resources=['geometryBuffersBytes','geometries','materials','textures','trianglesAllLevels','instances','constructionMs','constructionCpuMs'];lines=['# Measured performance','', 'Node inventory retains every LOD/chunk and counts shared buffers once. Browser measurements use Chromium/SwiftShader on a shared host. Neither is a physical iPhone result.','', '| Resource | PR35 | River v2 | Change |','|---|---:|---:|---:|']
for k in resources:lines.append(f'| {k} | {b[k]:,} | {c[k]:,} | {(c[k]/b[k]-1)*100:+.2f}% |')
lines+=['','Every inventoried geometry, material and texture disposes exactly once in both reports. The buffer total includes instance matrices/colors; it is not process RSS or total browser memory. Construction values are single shared-host samples, not a speedup claim.','', '[Before inventory](validation/before-inventory.json) · [After inventory](validation/after-inventory.json).','']
if (out/'browser/before-qa.json').exists() and (out/'browser/after-qa.json').exists():
 before=load(out/'browser/before-qa.json');after=load(out/'browser/after-qa.json');lines+=['## Matched production-distance views','', '640×360, medium, elapsed sunset=40, traffic disabled. Eight warm-up frames and 24 measured frames per view. These views use production fog/clipping; the raised overview captures are excluded.','', '| View | Calls before → after | Triangles before → after | Software frame median before → after, ms |','|---|---:|---:|---:|']
 for p,q in zip(before['performance'],after['performance']):
  assert p['scene']==q['scene'];bp=p['samples'];ap=q['samples'];lines.append(f"| {p['id']} | {statistics.median(x['calls'] for x in bp):.0f} → {statistics.median(x['calls'] for x in ap):.0f} | {statistics.median(x['triangles'] for x in bp):.0f} → {statistics.median(x['triangles'] for x in ap):.0f} | {statistics.median(x['frameMs'] for x in bp):.1f} → {statistics.median(x['frameMs'] for x in ap):.1f} |")
 lines+=['','Visible waterfront cost increases more than the retained-buffer total. Corrected banks expose more developed frontage and bank detail. This cost is reported rather than presented as a mobile performance win. Software frame medians reflect host scheduling/contention and cannot establish hardware FPS, thermal stability or Safari performance.','', '[Raw before samples](browser/before-qa.json) · [Raw after samples, GC heap snapshots and restart resources](browser/after-qa.json). The three identical ICONSIAM restart cycles retain stable geometry/texture counts. GC heap snapshots show retained JS heap only, not total GPU/process memory.','', 'Physical iPhone 17 Pro Max Safari, long touch sessions, power/thermals and sustained device frame times remain open acceptance gates.']
(out/'performance.md').write_text('\n'.join(lines)+'\n')
# Optional production bundle inventory, measured after matching local builds.
if (out/'validation/bundle-size.json').exists():
 bundle=load(out/'validation/bundle-size.json');text=['','## Built JavaScript download size','','Both local production builds use the locked toolchain. No deployment occurs.','','| Measure | PR35 | River v2 |','|---|---:|---:|']
 for key,label in [('initialLargest','Largest initial JS chunk, gzip bytes'),('totalGzipBytes','All JS chunks, summed gzip bytes')]:
  vals=[bundle[k][key]['gzipBytes'] if key=='initialLargest' else bundle[k][key] for k in ['before','after']];text.append(f'| {label} | {vals[0]:,} | {vals[1]:,} |')
 text+=['','[Bundle-size inventory](validation/bundle-size.json). Gzip uses level 9; the complete inventory distinguishes initial and lazy downloads.']
 with (out/'performance.md').open('a') as f:f.write('\n'.join(text)+'\n')
# A reproducible gallery requires both supplementary facade captures to finish.
for phase in ['before','after']:
 extra=out/(phase+'-facades')/'capture.json'
 if extra.exists():
  supplement=load(extra)
  if len(supplement['records'])==8:
   p=out/phase/'capture.json';report=load(p);records={r['file']:r for r in report['records']}
   for r in supplement['records']:
    if r['file'] not in records:records[r['file']]=r;(out/phase/r['file']).write_bytes((extra.parent/r['file']).read_bytes())
   report['records']=list(records.values());report.setdefault('captureStages',[])
   if 'Matched river-facing hotel facade views' not in report['captureStages']:report['captureStages'].append('Matched river-facing hotel facade views')
   p.write_text(json.dumps(report,indent=2)+'\n')
scenes=load(out/'scenes.json');expected={f"{s['id']}-{light}.jpg" for s in scenes for light in s['lights']};before=load(out/'before/capture.json');after=load(out/'after/capture.json');bm={r['file']:r for r in before['records']};am={r['file']:r for r in after['records']}
if set(bm)==expected==set(am):
 records=[];gallery=['# Matched actual WebGL gallery','', 'PR35 before; implemented branch after. 768×432, medium quality, FOV and camera matched per record; elapsed=40 for sunset and 720 for night. No AI-generated implementation images.','', 'Raised geographic views explicitly extend the 800-unit driving clip and fog. The full overview submits all coarse city batches; normal driving/riverfront images retain production settings. These inspection images are not mobile performance samples.','']
 for s in scenes:
  for light in s['lights']:
   file=f"{s['id']}-{light}.jpg";br,ar=bm[file],am[file];assert br['stats']['camera']==ar['stats']['camera'];assert br['scene']['look']==ar['scene']['look'];assert br['stats']['fov']==ar['stats']['fov'];assert br['stats']['elapsed']==ar['stats']['elapsed'];assert br['stats']['quality']==ar['stats']['quality']=='medium';assert br['stats']['glError']==ar['stats']['glError']==0
   records.append(dict(file=file,matched=True,geographicInspection=bool(ar.get('geographicInspection')),beforeSha256=hashlib.sha256((out/'before'/file).read_bytes()).hexdigest(),afterSha256=hashlib.sha256((out/'after'/file).read_bytes()).hexdigest(),beforeCamera=br['stats']['camera'],afterCamera=ar['stats']['camera'],beforeSource=br.get('sourceCommit',before['sourceCommit']),afterSource=ar.get('sourceCommit',after['sourceCommit'])))
   gallery += [f"## {s['id']} · {light}",'','| PR35 | Corrected river |','|---|---|',f'| ![Before](before/{file}) | ![After](after/{file}) |','']
 (out/'gallery.md').write_text('\n'.join(gallery).rstrip()+'\n');(out/'visual-manifest.json').write_text(json.dumps(dict(pairs=len(records),allMatched=True,records=records),indent=2)+'\n')
 print('Gallery:',len(records),'matched pairs')
else:print('Supplementary captures still running; final gallery deferred',len(bm),len(am),len(expected))
print('Final map, reflow summary and performance report written')

# Matplotlib emits trailing spaces in SVG path data; normalize without changing geometry.
for svg_path in (out/'maps').glob('*.svg'):
 svg_path.write_text('\n'.join(line.rstrip() for line in svg_path.read_text().splitlines())+'\n')
