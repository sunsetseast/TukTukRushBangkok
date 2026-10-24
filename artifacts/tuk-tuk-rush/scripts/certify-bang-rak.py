import json,subprocess,time,os,concurrent.futures,pathlib
root=pathlib.Path(__file__).resolve().parents[3]
game=root/'artifacts/tuk-tuk-rush';out=root/'docs/qa/bang-rak/validation/suite';out.mkdir(parents=True,exist_ok=True)
scripts=json.loads((game/'package.json').read_text())['scripts'];jobs=[(k,v) for k,v in scripts.items() if k.startswith('test:') and (not os.environ.get('QA_ONLY') or k in os.environ['QA_ONLY'].split(','))]
env=os.environ.copy();env.update(BASE_PATH='/',PORT='24690',NODE_OPTIONS='--max-old-space-size=4096')
# Capture all package commands verbatim; do not use pnpm's local lockfile
# auto-install, which can rewrite workspace policy under pnpm 11.
def run(job):
 name,command=job;t=time.time();head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
 with (out/(name.replace(':','-')+'.log')).open('w') as f:
  p=subprocess.run(command,shell=True,cwd=game,env=env,stdout=f,stderr=subprocess.STDOUT)
 r=dict(name=name,command=command,checkoutCommit=head,exitCode=p.returncode,seconds=round(time.time()-t,2));print(json.dumps(r),flush=True);return r
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=int(os.environ.get("QA_WORKERS","3"))) as pool:
 for r in pool.map(run,jobs):
  results.append(r);(out/'summary.json').write_text(json.dumps(dict(passAll=all(x['exitCode']==0 for x in results),completed=len(results),total=len(jobs),results=results),indent=2)+'\n')
