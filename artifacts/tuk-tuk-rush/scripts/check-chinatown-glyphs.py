from fontTools.ttLib import TTFont
import re,json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
text=''.join((root/'src/game/bangkok/geographic'/f).read_text() for f in ['chinatownSites.ts','chinatownFacades.ts'])
chinese=set(re.findall(r'[\u3400-\u9fff]',text))
cmap=TTFont(root/'public/assets/fonts/geographic-chinese-signs.ttf').getBestCmap()
missing=sorted(c for c in chinese if ord(c)not in cmap)
print(json.dumps({'characters':''.join(sorted(chinese)),'missing':missing},ensure_ascii=False))
assert not missing,'Sign atlas characters need bundled font support'
