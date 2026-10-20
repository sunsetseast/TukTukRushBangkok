"""Roll up measured QA, keeping failed intermediate records and hardware limits."""
from pathlib import Path
import json,gzip
repo=Path(__file__).resolve().parents[3]
out=repo/'docs/qa/historic-visual-fidelity'
rows={}
for name in ['regression-initial-summary','regression-final-summary','regression-vegetation-summary','regression-final-geometry-summary']:
    p=out/(name+'.json')
    if p.exists():
        for r in json.loads(p.read_text())['records']:rows[r['name']]={**r,'evidencePhase':name.replace('-summary','')}
(out/'regression-summary.json').write_text(json.dumps({'pass':len(rows)==33 and all(r['exitCode']==0 for r in rows.values()),'groups':len(rows),'expected':33,'records':list(rows.values()),'method':'32 existing groups plus fidelity; later affected reruns supersede retained initial failures'},indent=2))
before=json.loads((out/'inventory-before.json').read_text());after=json.loads((out/'inventory-after.json').read_text())
bundles={}
baseline=Path(__import__('os').environ.get('CITY_BASELINE_CHECKOUT',str(repo.parent/'historic-visual-baseline')))
for label,checkout in [('before',baseline),('after',repo)]:
    js=list((checkout/'artifacts/tuk-tuk-rush/dist').rglob('*.js'))
    if not js:raise RuntimeError('Build both checkouts before the bundle comparison')
    bundles[label]={'files':[p.name for p in js],'jsBytes':sum(p.stat().st_size for p in js),'gzipBytes':sum(len(gzip.compress(p.read_bytes(),mtime=0)) for p in js)}
(out/'bundle-comparison.json').write_text(json.dumps(bundles,indent=2))
metrics=[('Retained geometry + instance buffers (bytes)','geometryBuffersBytes'),('Retained geometries','geometries'),('Materials','materials'),('Textures (Node, no canvas labels)','textures'),('All retained LOD triangles','trianglesAllLevels'),('Construction wall time (ms)','constructionMs'),('Construction CPU time (ms)','constructionCpuMs')]
lines=['# Measured performance comparison','','Same host, identical world/scene builder and dependencies. Final Node inventories run sequentially after the browser checks. Counts include retained near/far models and spatial batches; they are not on-screen draw calls. No physical iPhone or Safari measurement is claimed.','','| Metric | PR32 main | PR33 final | Change |','|---|---:|---:|---:|']
for label,key in metrics:
    b,a=before[key],after[key];lines.append(f'| {label} | {b:,} | {a:,} | {(a/b-1)*100:+.2f}% |')
for label,key in [('Production JS bytes','jsBytes'),('Production JS gzip bytes','gzipBytes')]:
    b,a=bundles['before'][key],bundles['after'][key];lines.append(f'| {label} | {b:,} | {a:,} | {(a/b-1)*100:+.2f}% |')
bcap=json.loads((out/'before/capture.json').read_text());acap=json.loads((out/'after/capture.json').read_text())
bi={(r['id'],r['view']):r for r in bcap['records']};ai={(r['id'],r['view']):r for r in acap['records']}
samples=[]
lines+=['','## Actual renderer samples','','Same 768×432 medium-quality poses and software WebGL. These are submitted call/triangle counts from actual final frames; camera-history-dependent allocated WebGL geometry counts are not substituted for retained scene inventory.','','| Matched view | Calls before → after | Triangles before → after |','|---|---:|---:|']
for key in [('palace','driving'),('palace','river'),('pho','driving'),('golden','ground'),('sanam','driving'),('traimit','ground')]:
    b,a=bi[key]['stats'],ai[key]['stats'];samples.append({'id':key[0],'view':key[1],'before':b,'after':a})
    lines.append(f"| {' / '.join(key)} | {b['calls']} → {a['calls']} | {b['triangles']:,} → {a['triangles']:,} |")
(out/'rendered-performance.json').write_text(json.dumps({'renderer':'Chrome 138 headless / SwiftShader','physicalIPhone':False,'samples':samples},indent=2))
lines+=['','SwiftShader frame intervals fluctuate with software rendering, shader compilation, screenshots and host scheduling. They are retained in raw captures for transparency and are **not** presented as device FPS or reliable GPU timing. Single-run construction timing is also host-sensitive; raw wall and CPU values are shown without claiming statistical significance.','','## Resource ownership and repeated restarts','','Both inventory disposal reports account for every retained geometry, material and texture. The browser check performs three inspection/restart cycles and asserts that allocated geometry and texture counts do not grow between the first and third cycle. See `browser/checks.json`. No texture downloads or photorealistic runtime assets were added. Landmark geometry stays batched by shared finish; tamarind crowns reuse one instanced canopy template with a reduced distant LOD.','','Physical iPhone 17 Pro Max/Safari, thermal stability, mobile memory pressure and hardware frame pacing remain unverified.']
(out/'performance.md').write_text('\n'.join(lines)+'\n')
print('Measured performance report and 33-group rollup written')
