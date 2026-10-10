/** Self-contained screenshot review; generated output stays out of Git/deployment. */
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const out = `${root}/generated-artifacts/bangkok-reconstruction`;
const measurements = JSON.parse(await fs.readFile(`${out}/visual-measurements.json`, 'utf8'));
const inline = async path => `data:image/jpeg;base64,${(await fs.readFile(path)).toString('base64')}`;
const before = `${root}/docs/graphics/living-chinatown/screenshots`;
const after = `${out}/screenshots`;
const comparisons = [
  ['Normal chase camera', 'after-chase.jpg', 'after-chase.jpg'],
  ['Chinatown Gate / Odeon island', 'after-gate.jpg', 'after-gate.jpg'],
  ['Landscape controls', 'after-mobile-hud.jpg', 'after-mobile-landscape.jpg'],
];
let cells = '';
for (const [caption, a, b] of comparisons) {
  cells += `<section><h2>${caption}</h2><div class="pair"><figure><img src="${await inline(`${before}/${a}`)}" alt="Historical main baseline"><figcaption>Before: historical GitHub-main capture</figcaption></figure><figure><img src="${await inline(`${after}/${b}`)}" alt="Actual reconstructed game"><figcaption>After: current WebGL game capture, Linux SwiftShader</figcaption></figure></div></section>`;
}
const additional = [
  ['after-signage.jpg', 'Original dimensional lettering and frames; Hua Seng Heng name verified, brand clearance pending.'],
  ['after-shops.jpg', 'Distinct noodle-shop facade and trade-specific details.'],
  ['after-curve.jpg', 'Actual 3D geographic corridor overview; the playable game uses a chase camera.'],
  ['after-intersection.jpg', 'Connected intersection and short-edge road/sidewalk rendering.'],
  ['after-street-life.jpg', 'Road-aligned carts and safe sidewalk people.'],
  ['after-miniature.jpg', 'Sculpted shells, crown details and secondary side-wall treatment.'],
  ['after-wide-mobile.jpg', '932×430 landscape viewport; not a photograph of a physical iPhone.'],
];
for (const [file, caption] of additional) {
  cells += `<figure class="extra"><img src="${await inline(`${after}/${file}`)}" alt="${caption}"><figcaption>${caption}</figcaption></figure>`;
}
const q = measurements.qualitySamples;
const performance = `<table><tr><th>Sample</th><th>Draw calls</th><th>Triangles submitted</th></tr>${Object.entries(q).map(([name, sample]) => `<tr><td>${name === 'low' ? 'Fast' : 'Pretty'}</td><td>${sample.calls}</td><td>${sample.triangles.toLocaleString()}</td></tr>`).join('')}</table>`;
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tuk Tuk Rush — reconstruction review</title><style>
*{box-sizing:border-box}body{margin:0;background:#f1ebdf;color:#253a39;font:16px/1.6 system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:28px}h1{font-size:clamp(28px,4vw,48px);line-height:1.1}h2{font-size:22px}p{max-width:920px}a{color:#795523}.notice{background:#fff9e8;border-left:4px solid #bc7832;padding:18px;max-width:1000px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{width:100%;height:auto;display:block;background:#294143;border-radius:10px}figcaption{font-size:13px;padding:10px 2px}.extra{margin:28px 0;max-width:1100px}section{margin:38px 0}table{border-collapse:collapse;background:#fffdf8}th,td{text-align:left;padding:10px 20px;border:1px solid #d9d1c1}footer{border-top:1px solid #c4bba8;margin-top:32px;padding-top:18px}@media(max-width:750px){main{padding:18px}.pair{grid-template-columns:1fr}}
</style><main><p>TUK TUK RUSH: BANGKOK · RECONSTRUCTION REVIEW</p><h1>Curved Chinatown roads, left-hand traffic and distinctive miniature storefronts</h1><p>Actual running-game screenshots, not mockups or generated reference images. The historical baseline is the prior main branch; viewpoints are comparable, not pixel-identical, because the geography changed.</p><div class="notice"><b>Browser prototype, not native iOS.</b> Verification used Linux Chromium with a software WebGL renderer. No physical-iPhone FPS, thermal, Safari touch or safe-area certification is claimed. Commercial brand clearance and more precise signature-storefront recreation remain outstanding.</div><h2>Verified simulation</h2><p>Connected 81-node / 87-edge road graph; twelve directed left-lane vehicles; five-minute traffic simulation including clockwise circulation; 260m controller-driven pickup/delivery without teleporting, with zero collision frames (traffic disabled for that deterministic mission test); safe instanced walkers/vendors; production build and TypeScript checks.</p><h2>Render complexity, not a phone benchmark</h2>${performance}<p>These are sampled submitted geometry counts, not a worst-case profile. The capture has ${measurements.errors.length} JavaScript errors, ${measurements.failed.length} failed asset requests and WebGL error ${measurements.gpu.error}. Both local sign fonts loaded. Street-life disposal released ${measurements.cleanup.released} GPU geometry registrations; this is not a whole-game long-session leak test.</p>${cells}<footer>Source/research, licensing, location comparisons and testing limits: <code>docs/graphics/reconstruction/</code>.<br>Map data © OpenStreetMap contributors, ODbL; original procedural artwork with local SIL-OFL sign fonts.<br>Review branch: <code>graphics/authentic-cartoon-bangkok</code>. No automatic merge. Next: physical-iPhone shift profiling, then correctly located signature storefronts and frontage infill.</footer></main></html>`;
await fs.writeFile(`${out}/review.html`, html);
console.log(`${out}/review.html`);
