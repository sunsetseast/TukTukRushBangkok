"""Certify recorded production captures without editing any screenshot."""
import json,hashlib,pathlib,gzip,os
root=pathlib.Path(__file__).resolve().parents[3];out=root/'docs/qa/bang-rak';validation=out/'validation'
a=json.loads((out/'after/capture.json').read_text());b=json.loads((out/'before/capture.json').read_text())
source=root/'artifacts/tuk-tuk-rush/src/game';pairs=sorted([[str(p.relative_to(source)),hashlib.sha256(p.read_bytes()).hexdigest()] for p in source.rglob('*') if p.is_file()]);source_hash=hashlib.sha256(json.dumps(pairs,separators=(',',':')).encode()).hexdigest()
assert a['pass'] and b['pass'];assert a['runtimeSourceSha256']==source_hash
old={s['id']:s for s in b['scenes']};assert len(old)==len(a['scenes'])==18
comparisons=[]
for s in a['scenes']:
 p=old[s['id']]
 for k in ['viewport','cameraPose','replay','elapsed','mode','quality','dpr']:assert s[k]==p[k],(s['id'],k)
 assert len(s['replay']['traffic'])==38
 files={label:hashlib.sha256((out/label/(s['id']+'.jpg')).read_bytes()).hexdigest() for label in ['before','after']}
 comparisons.append(dict(id=s['id'],mode=s['mode'],viewport=s['viewport'],matchedCameraClockReplay=True,imageSha256=files,before=p['samples'][-1],after=s['samples'][-1],signPopulationBefore=p['signDepth']['population'],signPopulationAfter=s['signDepth']['population'],obscuredBefore=p['signDepth']['obscured'],obscuredAfter=s['signDepth']['obscured']))
report=dict(passAll=True,runtimeSourceSha256=source_hash,baselineCommit='14919cdc70e4cd832cb3cfbc124603c2385ad932',localEvidenceCommit=a['checkoutCommit'],method='Original game-rendered JPEGs; no crop/compositing. Before uses 30 fixed controller ticks. After restores the complete baseline 38-car/player fixture after the same advancement to hold rendered traffic and pose constant. Independent production-controller route matrices certify physical gameplay. Medium/DPR1; inspection cameras explicit; four production chase fixtures. Two portrait images retain the rotate guard and do not certify portrait driving.',physicalIPhone=False,comparisons=comparisons)
(validation/'comparisons.json').write_text(json.dumps(report,indent=2)+'\n')
refresh=os.environ.get('REFRESH_ROUTE_EVIDENCE')=='1'
for seed in [982,41,67]:
 for stem,source_file in [('chinatown-legal',root/f'docs/qa/chinatown-completion/validation/legal-{seed}.json'),('district-legal',validation/f'legal-{seed}.json')]:
  archive=validation/f'{stem}-{seed}.json.gz'
  raw=source_file.read_bytes() if refresh else gzip.decompress(archive.read_bytes())
  r=json.loads(raw);assert r['pass'] and r['trafficVehicles']==38 and r['trafficSeed']==seed
  assert all(x['complete'] and all(v==0 for v in x['physical'].values()) for x in r['results'])
  if refresh:archive.write_bytes(gzip.compress(raw))
historical=root/'docs/qa/chinatown-reconstruction/traffic-routes.json'
archive=validation/'historical-nonyielding.json.gz'
raw=historical.read_bytes() if refresh else gzip.decompress(archive.read_bytes())
r=json.loads(raw);assert not r['legal']
if refresh:archive.write_bytes(gzip.compress(raw))
route_summary={'legalOldJourneys':42,'legalDistrictJourneys':24,'seeds':[982,41,67],'vehicles':38,'allCompleteWithZeroContacts':True,'historicalNonYielding':{'contactFrames':sum(x['physical']['traffic'] for x in r['results']),'encounters':sum(x['encounters'] for x in r['results']),'separateDiagnostic':True}}
(validation/'routes.json').write_text(json.dumps(route_summary,indent=2)+'\n')
print(json.dumps({'comparisons':18,'sourceHash':source_hash,'routes':route_summary}))
