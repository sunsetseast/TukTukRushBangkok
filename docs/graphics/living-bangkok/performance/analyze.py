"""Summarize committed diagnostic samples; no dependencies or hardware FPS claims."""
from pathlib import Path
import json, math, statistics
root = Path(__file__).parent

def distribution(values):
    values = sorted(values)
    if not values:
        return None
    return dict(n=len(values), mean=statistics.mean(values),
                p50=values[math.ceil(len(values)*.5)-1],
                p95=values[math.ceil(len(values)*.95)-1],
                p99=values[math.ceil(len(values)*.99)-1], max=values[-1])

def summarize(d):
    r = d['resources']
    texture_estimate = sum((t.get('bytes') or (t.get('width',0)*t.get('height',0)*4)) * (4/3 if t['mipmaps'] else 1) for t in r['textures'])
    return dict(startupMs=d['startupMs'], interactiveMs=d['interactiveMs'],
                frames=distribution([s['intervalMs'] for s in d['frames']]),
                drawCalls=distribution([s['calls'] for s in d['frames']]),
                triangles=distribution([s['triangles'] for s in d['frames']]),
                geometryBytes=r['geometryBytes'], sceneGeometries=r['geometries'], materials=r['materials'],
                referencedTextureCount=len(r['textures']), referencedRgbaTextureEstimateBytes=texture_estimate,
                heapBefore=r.get('heapBytes'), heapAfter=d['endResources'].get('heapBytes'),
                shaderProgramsBefore=r['programs'], warmResources=d.get('warmResources'), endResources=d['endResources'],
                mapMount=distribution([m['mountMs'] for m in d['maps'] if 'mountMs' in m]),
                mapRaf=distribution([m['rafMs'] for m in d['maps'] if 'rafMs' in m]),
                mapTimeouts=sum(bool(m.get('timeout')) for m in d['maps']),
                longTasks=distribution([s['duration'] for s in d['stalls']]),
                errors=d['errors'])

report={'percentiles':'Nearest rank; small samples, software-rendered diagnostics only', 'runs':{}, 'scenes':{}}
for name in ['main-1','main-2','pr-1','pr-2','stability-180s']:
    p=root/name/'profile.json'
    if p.exists():
        report['runs'][name]=summarize(json.loads(p.read_text()))
for name in ['scenes-main','scenes-pr']:
    p=root/name/'scene-profile.json'
    if p.exists():
        d=json.loads(p.read_text())
        report['scenes'][name]=[dict(scene=c['filename'], frames=distribution([f['intervalMs'] for f in c['frameSamples']]),
                                    calls=statistics.mean([f['calls'] for f in c['frameSamples']]), triangles=statistics.mean([f['triangles'] for f in c['frameSamples']])) for c in d['captures']]
(root/'summary.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
