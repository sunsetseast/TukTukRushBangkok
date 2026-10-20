from pathlib import Path
import json,html,math
OUT=Path(__file__).resolve().parents[3]/'docs/qa/historic-bangkok'
ids=['palace','sanam','pho','swing','golden','democracy','hua','traimit','gate','yaowarat']
names=['Grand Palace / Wat Phra Kaew','Sanam Luang','Wat Pho','Giant Swing / Wat Suthat','Golden Mount / Wat Saket','Democracy Monument','Hua Lamphong','Wat Traimit','Chinatown Gate / Odeon Circle','Connecting Yaowarat approach']
refs={i:f'../landmark-accuracy/references/{i}.jpg' for i in ids};refs['sanam']='references/sanam.jpg';refs['traimit']='references/traimit-full.jpg'
rows=[]
for i,name in zip(ids,names):
 rows.append(f"| {name} | ![Real reference]({refs[i]}) | ![PR31 game](before/{i}-ground.jpg) | ![Reconstructed game](final/{i}-ground.jpg) |")
(OUT/'comparisons.md').write_text('''# Real photographs and actual game views

All game frames come from the live WebGL renderer. No AI-generated images or selectively hidden city objects are used. HUD and traffic are disabled for architectural capture. Driving views use the ordinary follow camera on a public road, facing along its legal graph direction; they are stationary capture poses, not route-completion evidence. Controller journeys are documented separately.

PR31 baseline frames are 960×540; final frames are 768×432, both 16:9 and medium quality. Road changes require equivalent legal street approaches. Inspection views look toward the architecture; ordinary driving views intentionally retain the normal camera. River frames use a water-level boat viewpoint; elevated frames are inspection views. Photographs have different dates and angles and do not prove a surveyed reconstruction.

| Place | Licensed real photograph | PR31 baseline street view | Reconstructed street view |
|---|---|---|---|
'''+ '\n'.join(rows)+'\n\n[Full comparison gallery](comparisons.html) · [Photographic licences](references/ATTRIBUTION.md) · [Geographic maps](geography-before-after.png)\n')
css='body{margin:0;background:#f3f1ea;color:#20333b;font:16px system-ui}main{max-width:1440px;margin:auto;padding:36px}h1{font-size:36px}h2{margin-top:48px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}figure{margin:0;background:white;padding:10px;border-radius:10px}img{width:100%;height:250px;object-fit:contain;background:#e8e6de}figcaption{font-size:13px;padding:8px 2px}.note{max-width:1050px;line-height:1.6}.maps img{height:auto}a{color:#14758b}@media(max-width:750px){main{padding:18px}.cards{grid-template-columns:1fr}h1{font-size:28px}}'
parts=[f'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Historic Bangkok reconstruction review</title><style>{css}</style><main><h1>Historic Bangkok reconstruction</h1><p class="note">Real-world references, PR31 baseline, and actual game captures. No generated illustrations. These are researched arcade interpretations, not surveyed property models. <a href="README.md">Read the complete QA report</a>.</p><div class="maps"><img src="geography-before-after.png"><img src="geographic-reference.png"></div>']
for i,name in zip(ids,names):
 parts.append(f'<h2>{html.escape(name)}</h2><div class="cards">')
 for src,caption in [(refs[i],'REAL · licensed reference photograph'),(f'before/{i}-ground.jpg','BEFORE · PR31 road-level inspection'),(f'final/{i}-ground.jpg','AFTER · legal road-level inspection'),(f'before/{i}-elevated.jpg','BEFORE · elevated placement'),(f'final/{i}-elevated.jpg','AFTER · elevated placement'),(f'final/{i}-driving.jpg','AFTER · ordinary driving camera')]:
  parts.append(f'<figure><a href="{src}"><img loading="lazy" src="{src}"></a><figcaption>{caption}</figcaption></figure>')
 parts.append('</div>')
parts.append('<p class="note">See references/ATTRIBUTION.md for photographers and licences. The street graph, districts and property outlines are compressed design controls. City objects were not hidden for a passing view.</p></main>');(OUT/'comparisons.html').write_text(''.join(parts))
# Explicit nominal centers, with the visible Swing distinguished from its
# combined Swing/Suthat asset origin.
before=json.load(open(OUT/'registry-before.json'));after=json.load(open(OUT/'registry-after.json'))
text='# Localized geographic corrections\n\nNorth is up in both game maps. Design +x points east and +y south; one design unit is four game metres. Real coordinates are independently recorded nominal site centers. No footprint is claimed to be cadastral or surveyed.\n\n![Before and after](geography-before-after.png)\n\n![Reference site centers](geographic-reference.png)\n\n| Site | Real WGS84 center (approximate) | Before game feature / center | After game feature / center |\n|---|---|---|---|\n'
for i,name in zip(ids,names):
 if i=='yaowarat':continue
 a=next(r for r in after if r['id']==i);b=next(r for r in before if r['id']==i);bp=dict(b['map']);
 if i=='swing':bp['y']-=43/4
 p=a.get('geographicReference');real=f"{p['lat']:.5f}, {p['lon']:.5f}" if p else 'not independently verified'
 text+=f"| {name} | {real} | {bp['x']:.2f}, {bp['y']:.2f} | {a['map']['x']:.2f}, {a['map']['y']:.2f} |\n"
text+='''
The visible Giant Swing was at (410, 416.25), south of the Palace at (295, 365). It is now at (410, 350.5), east and north. The combined asset origin remains separately recorded at (410, 365), with Wat Suthat behind the public road to its south. Treating the asset origin as the Swing center would repeat the original registry ambiguity; the registry now exposes both.

Wat Pho moves from (290, 443) to (300, 425), southeast of the Palace. Maha Rat and Sanam Chai follow the actual game compound boundaries instead of leaving entire generic blocks between temples and their named perimeter streets. Thai Wang connects their public exteriors. Palace interiors remain closed, and its old invented loop is replaced by a Na Phra Lan curbside stop.

Golden Mount moves from a fallback plot at (477.5, 352) to the explicit (480, 330), northeast of the Swing and southeast of Democracy Monument. Its wider hill, summit, southern lower compound, Boripat and Maha Chai approaches share protected physical space. Democracy Monument moves from the fallback (437.87, 261.07) to the intersection center (435, 270), with four live road arms and a clockwise ring.

Hua Lamphong's improved PR31 facade stays at (600, 528), facing south. The shed and five ground-level rail pairs extend north into its protected yard. Wat Traimit moves from fallback (574.55, 578.78) to explicit (564, 574), southwest of the station and northeast of Odeon. Tri Mit bends around the compound to a connected outer drop-off. The Gate and Yaowarat alignment remain in place.

Compression remains deliberate: Ratchadamnoen runs diagonally toward Lan Luang; the game is not an exact east–west street trace. Bamrung Mueang and the eastern Rama I connector share an arcade transition. Wat Pho's distance and footprint, the civic plaza, rectangular temple boundaries, station yard length, Tri Mit southern bend and Odeon ring radius are design approximations. No newly drawn reference road line or invented reference footprint is presented as measured Bangkok geometry.
'''
(OUT/'geography.md').write_text(text)
