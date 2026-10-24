"""Assemble review evidence without fabricating renderer or device results."""
import json,pathlib,hashlib,gzip,subprocess,html,statistics
root=pathlib.Path(__file__).resolve().parents[3];out=root/'docs/qa/bang-rak-geography'
def read(p):return json.loads((out/p).read_text())
before=read('before/capture.json');after=read('after/capture.json');old={s['id']:s for s in before['scenes']};rows=[]
for s in after['scenes']:
 b=old[s['id']]
 for key in ['id','mode','elapsed','viewport','quality','dpr','replay']:
  assert b[key]==s[key],(s['id'],key)
 for key in ['position','quaternion']:
  if key in b.get('cameraPose',{}):assert all(abs(x-y)<1e-6 for x,y in zip(b['cameraPose'][key],s['cameraPose'][key])),(s['id'],'camera '+key)
 assert b['cameraPose']['fov']==s['cameraPose']['fov']
 assert (out/'before'/f"{s['id']}.jpg").exists() and (out/'after'/f"{s['id']}.jpg").exists()
 rows.append(dict(id=s['id'],viewport=s['viewport'],elapsed=s['elapsed'],before=f"before/{s['id']}.jpg",after=f"after/{s['id']}.jpg",beforeCalls=b['samples'][-1]['calls'],afterCalls=s['samples'][-1]['calls']))
assert len(rows)>=18
assert not before['errors'] and not after['errors']
seam=read('validation/seam.json');ui=read('validation/browser-state.json');assert seam['pass'] and ui['pass']
legal=[]
for matrix in ['chinatown','retained-bang-rak','new-seam']:
 for seed in [982,41,67]:
  file=f'validation/{matrix}-legal-{seed}.json';d=read(file);assert d['pass'];assert all(r['complete'] and not any(r['physical'].values()) for r in d['results']);legal.append(dict(matrix=matrix,seed=seed,journeys=len(d['results']),vehicles=d['trafficVehicles'],pass_=True,file=file))
perfBefore=read('validation/performance-baseline-sequential.json');perfAfter=read('validation/performance-after.json');tests=read('validation/tests.json');ci=read('validation/ci.json') if (out/'validation/ci.json').exists() else None
runtimeFiles={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((root/'artifacts/tuk-tuk-rush/src/game').rglob('*')) if p.is_file()}
runtimeRoot=root/'artifacts/tuk-tuk-rush/src/game'
runtimePairs=sorted([[str(p.relative_to(runtimeRoot)),hashlib.sha256(p.read_bytes()).hexdigest()] for p in runtimeRoot.rglob('*') if p.is_file()])
finalRuntimeHash=hashlib.sha256(json.dumps(runtimePairs,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
assert after['runtimeSourceSha256']==finalRuntimeHash,'After captures must match the final runtime source bytes'
assert len(rows)==len(before['scenes'])==len(after['scenes'])==24

manifest={str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in out.rglob('*') if p.is_file() and (p.suffix in ['.jpg','.png','.svg','.gz'])}
proof=dict(baselineCommit='dbd15109924bb89898b94a838e3c39d69c25f55a',physicalIPhone=False,localCheckout=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),captureSourceEpochs=dict(before=before['runtimeSourceSha256'],after=after['runtimeSourceSha256']),runtimeFiles=runtimeFiles,artifactSha256=manifest,cameraFixtureMatches=rows,legalDriving=legal,uiState=ui.get('pass'),restartCount=len(ui.get('resets',[])),performance=dict(before=perfBefore,after=perfAfter),localTests=tests,ci=ci)
(out/'validation/certification.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
gallery=['# Matched production WebGL gallery','',f'{len(rows)} matched pairs. Original JPEGs from the game renderer; no generated imagery or composited gameplay evidence. Camera, time, viewport, quality, player and 38-car fixture equality are asserted by the certification script.','', '**Clock labels:** filenames ending `day` are shift-start sunset at 0s, not midday. `sunset` is 100s dusk; `night` is 1000s. The current game has no midday lighting mode. Portrait views verify the rotate guard separately in UI evidence.','', '| View | Before | After |','|---|---|---|']
for r in rows:gallery.append(f"| {r['id']} · {r['viewport'][0]}×{r['viewport'][1]} | [![Before]({r['before']})]({r['before']}) | [![After]({r['after']})]({r['after']}) |")
(out/'GALLERY.md').write_text('\n'.join(gallery)+'\n')
page='''<!doctype html><meta charset="utf-8"><title>Bang Rak geographic reconstruction</title><style>body{margin:0;background:#18272b;color:#eee9d9;font:16px system-ui}header,main{max-width:1200px;margin:auto;padding:24px}h1{font-size:30px}section{padding:20px 0;border-top:1px solid #496064}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}img{width:100%;display:block}a{color:#a6dbd1}figcaption{padding:6px 0;font-size:13px}@media(max-width:600px){.pair{grid-template-columns:1fr}}</style><header><h1>Bang Rak · northern geographic phase</h1><p>Actual matched game renderer captures. Shift-start sunset, dusk and night; medium quality, DPR1. No physical iPhone benchmark.</p><p><a href="README.md">Certification and limitations</a> · <a href="geographic-comparison.png">Reference / baseline / proposal / final map</a></p></header><main>'''
for r in rows:page+=f"<section><h2>{html.escape(r['id'])}</h2><div class='pair'><figure><img loading='lazy' src='{r['before']}'><figcaption>PR42 baseline</figcaption></figure><figure><img loading='lazy' src='{r['after']}'><figcaption>PR43 implemented geometry</figcaption></figure></div></section>"
(out/'gallery.html').write_text(page+'</main>')
print(json.dumps(dict(matchedPairs=len(rows),legalJourneys=sum(x['journeys'] for x in legal),ui=ui.get('pass'),restarts=len(ui.get('resets',[])),localGroups=len(tests['results']))))
