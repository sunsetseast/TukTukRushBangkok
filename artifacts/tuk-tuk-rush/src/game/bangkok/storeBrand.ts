import * as T from "three";

/** Deliberately separate prototype brand artwork. This is our vector/canvas
 * rendition of the real identity, not a licensed/endorsed asset or fetched image.
 * Keep both the geometry palette and the one shared atlas replaceable here. */
export const CONVENIENCE_BRAND = {
  id: "7-eleven",
  name: "7-Eleven",
  orange: "#f58220",
  red: "#e3292e",
  green: "#00834b",
  white: "#fffdf4",
  artwork: "/brands/7-eleven-prototype.svg",
  status: "unlicensed prototype depiction; no affiliation or approval claimed",
} as const;
export const STORE_PROMOTIONAL_TEXT = [
  "เปิด 24 ชั่วโมง",
  "น้ำดื่ม • ขนม",
] as const;

/** One 512×256 atlas per world. No per-shop canvases or hotlinked imagery. */
export function createStoreBrandAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const c = canvas.getContext("2d")!;
  c.fillStyle = CONVENIENCE_BRAND.green;
  c.fillRect(0, 0, 256, 256);
  c.fillStyle = CONVENIENCE_BRAND.white;
  c.fillRect(13, 10, 230, 236);
  // The orange top and red descending stem are separate shapes, rather than
  // substituting an ordinary font's numeral for the recognizable mark.
  c.fillStyle = CONVENIENCE_BRAND.orange;
  c.beginPath();
  c.moveTo(48, 36);
  c.lineTo(205, 36);
  c.lineTo(205, 75);
  c.bezierCurveTo(142, 102, 128, 129, 127, 177);
  c.lineTo(84, 177);
  c.bezierCurveTo(84, 117, 108, 86, 153, 72);
  c.lineTo(48, 72);
  c.closePath();
  c.fill();
  c.fillStyle = CONVENIENCE_BRAND.red;
  c.beginPath();
  c.moveTo(161, 91);
  c.bezierCurveTo(128, 113, 124, 146, 124, 181);
  c.lineTo(85, 181);
  c.bezierCurveTo(85, 146, 93, 119, 109, 98);
  c.closePath();
  c.fill();
  c.fillStyle = CONVENIENCE_BRAND.green;
  c.font = "900 35px Arial,sans-serif";
  c.textAlign = "center";
  c.fillText("ELEVEN", 128, 215, 206);
  c.font = "700 13px Arial,sans-serif";
  c.fillText("7-ELEVEN", 128, 237);
  c.fillStyle = "#fff2c4";
  c.fillRect(256, 0, 256, 256);
  c.fillStyle = CONVENIENCE_BRAND.green;
  c.fillRect(256, 0, 256, 48);
  c.fillStyle = "#fffdf4";
  c.font = '800 27px "Rush Thai",sans-serif';
  c.fillText(STORE_PROMOTIONAL_TEXT[0], 384, 35, 238);
  c.fillStyle = CONVENIENCE_BRAND.red;
  c.font = '800 35px "Rush Thai",sans-serif';
  c.fillText(STORE_PROMOTIONAL_TEXT[1], 384, 100, 232);
  c.fillStyle = "#00834b";
  c.font = "800 48px Arial,sans-serif";
  c.fillText("24", 384, 164);
  c.font = "800 18px Arial,sans-serif";
  c.fillText("WATER  ·  SNACKS", 384, 202, 228);
  c.fillStyle = CONVENIENCE_BRAND.orange;
  c.fillRect(256, 230, 256, 9);
  c.fillStyle = CONVENIENCE_BRAND.red;
  c.fillRect(256, 241, 256, 6);
  c.fillStyle = CONVENIENCE_BRAND.green;
  c.fillRect(256, 249, 256, 7);
  const texture = new T.CanvasTexture(canvas);
  texture.name = "7-Eleven prototype brand and Thai promotion atlas";
  texture.colorSpace = T.SRGBColorSpace;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.anisotropy = 2;
  return texture;
}

export function storeBrandTile(tile: 0 | 1) {
  const g = new T.PlaneGeometry(1, 1),
    uv = g.attributes.uv!;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      (tile + 0.01 + uv.getX(i) * 0.98) / 2,
      0.01 + uv.getY(i) * 0.98,
    );
  return g;
}
