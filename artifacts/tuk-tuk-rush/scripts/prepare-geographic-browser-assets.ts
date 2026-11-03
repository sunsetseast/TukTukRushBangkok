/** Copy the immutable, pinned gzip gameplay sources to URLs without .gz.
 *
 * .gz ends trigger auto Content-Encoding on Vite/Sirv and some proxies. Browsers
 * (especially iOS Safari) may decode them once before our stream reaches JS.
 * The .pack aliases contain THE SAME compressed bytes, not a new map or build.
 * Compiled geometry uses .bin.pack directly and is not duplicated here.
 */
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";

const root = new URL("../public/assets/geography/", import.meta.url);
const aliases = [
  ["gameplay.v2.json.gz", "gameplay.v2.json.pack"],
  ["navigation.v2.bin.gz", "navigation.v2.bin.pack"],
  ["road-rules.v1.json.gz", "road-rules.v1.json.pack"],
  ["traffic-controls.v1.json.gz", "traffic-controls.v1.json.pack"],
  ["runtime.v1.json.gz", "runtime.v1.json.pack"],
] as const;

for (const [sourceName, browserName] of aliases) {
  const source = fs.readFileSync(new URL(sourceName, root));
  if (source[0] !== 0x1f || source[1] !== 0x8b) {
    throw Error(`Invalid compressed source: ${sourceName}`);
  }
  // Refuse to publish a stale or corrupt mapping asset.
  gunzipSync(source);
  const dest = new URL(browserName, root);
  // Reuse byte-for-byte copies; no map rebuild, no changed coordinates.
  if (!fs.existsSync(dest) || createHash("sha256").update(fs.readFileSync(dest)).digest("hex") !==
      createHash("sha256").update(source).digest("hex")) fs.writeFileSync(dest, source);
}
console.log("Prepared browser-safe Bangkok assets:", aliases.map(([, name]) => name).join(", "));
