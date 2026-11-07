import assert from "node:assert/strict";
import fs from "node:fs";
import { GEO_SHOP_SIGNS } from "../src/game/bangkok/geographic/chinatownFacades";
function cmap(file: string) {
  const b = fs.readFileSync(file),
    n = b.readUInt16BE(4);
  let table = 0;
  for (let i = 0; i < n; i++) {
    const p = 12 + i * 16;
    if (b.toString("ascii", p, p + 4) === "cmap") table = b.readUInt32BE(p + 8);
  }
  assert(table);
  const count = b.readUInt16BE(table + 2),
    maps: number[] = [];
  for (let i = 0; i < count; i++) {
    const p = table + 4 + i * 8,
      at = table + b.readUInt32BE(p + 4);
    if ([4, 12].includes(b.readUInt16BE(at))) maps.push(at);
  }
  return (cp: number) =>
    maps.some((at) => {
      const format = b.readUInt16BE(at);
      if (format === 12) {
        const n = b.readUInt32BE(at + 12);
        for (let i = 0; i < n; i++) {
          const p = at + 16 + i * 12,
            a = b.readUInt32BE(p),
            z = b.readUInt32BE(p + 4);
          if (cp >= a && cp <= z) return b.readUInt32BE(p + 8) + cp - a > 0;
        }
        return false;
      }
      const seg = b.readUInt16BE(at + 6) / 2,
        end = at + 14,
        start = end + seg * 2 + 2,
        delta = start + seg * 2,
        range = delta + seg * 2;
      for (let i = 0; i < seg; i++)
        if (cp <= b.readUInt16BE(end + i * 2)) {
          if (cp < b.readUInt16BE(start + i * 2)) return false;
          const r = b.readUInt16BE(range + i * 2),
            d = b.readInt16BE(delta + i * 2);
          return r
            ? b.readUInt16BE(
                range + i * 2 + r + (cp - b.readUInt16BE(start + i * 2)) * 2,
              ) !== 0
            : ((cp + d) & 65535) !== 0;
        }
      return false;
    });
}
const thai = cmap("public/assets/fonts/thai-signs.ttf"),
  chinese = cmap("public/assets/fonts/geographic-chinese-signs.ttf");
let checked = 0;
for (const entry of GEO_SHOP_SIGNS)
  for (const text of [
    entry.text,
    entry.secondary ?? "",
    entry.verticalText ?? "",
  ])
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      if (cp >= 0xe00 && cp <= 0xe7f) {
        assert(thai(cp), `Missing Thai glyph ${ch}`);
        checked++;
      } else if (cp >= 0x3400 && cp <= 0x9fff) {
        assert(chinese(cp), `Missing Chinese glyph ${ch}`);
        checked++;
      }
    }
console.log({
  pass: true,
  checked,
  signs: GEO_SHOP_SIGNS.length,
  actualShippedCmap: true,
});
