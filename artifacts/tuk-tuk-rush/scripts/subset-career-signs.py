"""Optional font authoring step; never run during app startup. Requires fonttools.
Retain the shipped cmap and add Odeon Gate's photographed royal inscription.
The source and SIL OFL notice are recorded in public/assets/fonts/provenance.json.
"""
from pathlib import Path
import hashlib,json,urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont
root=Path(__file__).resolve().parents[1]
manifest=root/'public/assets/fonts/provenance.json'
entries=json.loads(manifest.read_text());entry=next(e for e in entries if e['language']=='Chinese')
raw=urllib.request.urlopen(entry['source'],timeout=120).read()
assert hashlib.sha256(raw).hexdigest()==entry['sourceSha256'], 'Upstream font changed; review before subsetting'
from io import BytesIO
font=TTFont(BytesIO(raw));
from fontTools.varLib.instancer import instantiateVariableFont
instantiateVariableFont(font,{'wght':600},inplace=True)
target=root/entry['subset'];current=TTFont(target)
unicodes=set(current.getBestCmap())|{ord(c) for c in '聖壽無疆'}
assert unicodes<=set(font.getBestCmap()), 'Source does not cover requested inscription'
options=subset.Options();options.layout_features=['*'];sub=subset.Subsetter(options=options);sub.populate(unicodes=unicodes);sub.subset(font);font.save(target)
entry.update(glyphs=len(font.getBestCmap()),bytes=target.stat().st_size,retrieved='2026-10-16')
manifest.write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
