import * as T from "three";
import type { Obstacle } from "./types";

export type SignStyle = NonNullable<Obstacle["style"]>;
export type SignEntry = { key: string; text: string; style: SignStyle; variant: number };
const PAL: Record<SignStyle, [string, string, string][]> = {
  gold: [["#a3262a", "#e6bb55", "#f6d27c"], ["#2b1f1c", "#e6bb55", "#f6d27c"]],
  noodle: [["#f1e2b5", "#2f7f76", "#b5461f"], ["#2f7f76", "#f1e2b5", "#f7e3b0"]],
  pharmacy: [["#f2f5ee", "#2c8a5f", "#1f7a52"], ["#2c8a5f", "#f2f5ee", "#f2f5ee"]],
  hotel: [["#25384f", "#d9b25a", "#f0d58c"], ["#eadfc6", "#25384f", "#25384f"]],
  heritage: [["#2f5d58", "#d8b36a", "#f5e5be"], ["#6b2c2a", "#d8b36a", "#f5e5be"]],
};
const FONT = '"Rush Thai","Rush Chinese","Thonburi",sans-serif';

function motif(c: CanvasRenderingContext2D, s: SignStyle, x: number, y: number, r: number, col: string) {
  c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 3;
  c.beginPath();
  if (s === "gold") { c.arc(x, y, r, 0, 7); c.stroke(); c.fillRect(x - r * 0.35, y - r * 0.35, r * 0.7, r * 0.7); return; }
  if (s === "noodle") { c.arc(x, y + r * 0.1, r, 0, Math.PI); c.fill(); return; }
  if (s === "pharmacy") { c.fillRect(x - r * 0.28, y - r, r * 0.56, r * 2); c.fillRect(x - r, y - r * 0.28, r * 2, r * 0.56); return; }
  if (s === "hotel") { c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.fill(); return; }
  c.arc(x, y, r * 0.8, Math.PI, 0); c.lineTo(x + r * 0.8, y + r * 0.8); c.lineTo(x - r * 0.8, y + r * 0.8); c.fill();
}
function frame(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, bg: string, line: string) {
  c.fillStyle = bg; c.fillRect(x, y, w, h);
  c.strokeStyle = line; c.lineWidth = 7; c.strokeRect(x + 7, y + 7, w - 14, h - 14);
  c.lineWidth = 2.5; c.strokeRect(x + 17, y + 17, w - 34, h - 34);
}
function fit(c: CanvasRenderingContext2D, text: string, maxW: number, size: number) {
  c.font = `800 ${size}px ${FONT}`;
  const m = c.measureText(text).width;
  if (m > maxW) c.font = `800 ${Math.floor((size * maxW) / m)}px ${FONT}`;
}
/** Original sign plates: two atlases (horizontal fascia, vertical blade), drawn once on canvas. */
export function buildSignAtlas(entries: SignEntry[]) {
  const n = Math.max(1, entries.length);
  const make = (cw: number, ch: number, cols: number) => {
    const rows = Math.ceil(n / cols), canvas = document.createElement("canvas");
    canvas.width = cw * cols; canvas.height = ch * rows;
    return { canvas, c: canvas.getContext("2d")!, rows, cols, cw, ch };
  };
  const H = make(512, 128, 2), V = make(128, 512, 8);
  const index = new Map<string, number>();
  entries.forEach((e, i) => {
    index.set(e.key, i);
    const signature = e.text === "ฮั่วเซ่งเฮง" ? "hua" :
      e.text === "ทองใบเยาวราช" ? "thong" : "";
    // Original, distinctly composed reference-inspired signage: verified
    // business names, no copied brand logos or photographic textures.
    const colors: [string, string, string] = signature === "hua"
      ? ["#971c22", "#eac05d", "#fff0bf"]
      : signature === "thong"
        ? ["#b7272e", "#e5bd55", "#fff5cd"]
        : PAL[e.style][e.variant % 2]!;
    const [bg, line, ink] = colors;
    let x = (i % H.cols) * H.cw, y = Math.floor(i / H.cols) * H.ch;
    frame(H.c, x, y, H.cw, H.ch, bg, line);
    if (signature) {
      H.c.fillStyle = signature === "hua" ? "#166947" : "#174f9a";
      H.c.fillRect(x + 4, y + 4, H.cw - 8, 7);
      H.c.fillRect(x + 4, y + H.ch - 11, H.cw - 8, 7);
      H.c.strokeStyle = "#f3d989"; H.c.lineWidth = 3;
      H.c.strokeRect(x + 24, y + 23, H.cw - 48, H.ch - 46);
    }
    motif(H.c, e.style, x + 50, y + 64, 20, line);
    motif(H.c, e.style, x + H.cw - 50, y + 64, 20, line);
    H.c.fillStyle = ink; H.c.textAlign = "center"; H.c.textBaseline = "middle";
    fit(H.c, e.text, H.cw - 150, 74);
    H.c.fillText(e.text, x + H.cw / 2, y + 68);
    x = (i % V.cols) * V.cw; y = Math.floor(i / V.cols) * V.ch;
    frame(V.c, x, y, V.cw, V.ch, bg, line);
    if (signature) {
      const trim = signature === "hua" ? "#156a4c" : "#17539c";
      V.c.strokeStyle = trim; V.c.lineWidth = 11;
      V.c.strokeRect(x + 13, y + 12, V.cw - 26, V.ch - 24);
      V.c.strokeStyle = "#f8d873"; V.c.lineWidth = 2;
      V.c.strokeRect(x + 21, y + 22, V.cw - 42, V.ch - 44);
      for (let k = 0; k < 5; k++) {
        V.c.fillStyle = k % 2 ? trim : line;
        V.c.fillRect(x + 28, y + 70 + k * 72, V.cw - 56, 3);
      }
    }
    motif(V.c, e.style, x + 64, y + 40, 16, line);
    // Chinese supports stacked characters; Thai syllables/diacritics must stay
    // together. Never truncate a Thai business name into invented vertical text.
    const thai = /[\u0E00-\u0E7F]/.test(e.text);
    const glyphs = thai ? [] : (e.text.match(/\p{L}\p{M}*|\p{N}/gu) ?? [e.text]).slice(0, 4);
    const cell = Math.min(104, (512 - 90) / glyphs.length);
    glyphs.forEach((g, k) => {
      const cy = y + 70 + k * cell;
      V.c.strokeStyle = line; V.c.lineWidth = 3; V.c.strokeRect(x + 14, cy + 4, 100, cell - 8);
      V.c.fillStyle = line; V.c.beginPath(); V.c.arc(x + 64, cy + cell / 2, cell * 0.38, 0, 7); V.c.fill();
      V.c.fillStyle = bg; V.c.beginPath(); V.c.arc(x + 64, cy + cell / 2, cell * 0.32, 0, 7); V.c.fill();
      V.c.fillStyle = ink; V.c.font = `800 ${cell * 0.42}px ${FONT}`; V.c.textAlign = "center"; V.c.textBaseline = "middle";
      V.c.fillText(g, x + 64, cy + cell / 2 + 2);
    });
    if (thai) {
      V.c.save();
      V.c.translate(x + V.cw / 2, y + V.ch / 2);
      V.c.rotate(Math.PI / 2);
      V.c.fillStyle = ink;
      V.c.textAlign = "center";
      V.c.textBaseline = "middle";
      fit(V.c, e.text, V.ch - 80, 46);
      V.c.fillText(e.text, 0, 0);
      V.c.restore();
    }
  });
  const tex = (a: typeof H) => {
    const t = new T.CanvasTexture(a.canvas);
    t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true;
    return t;
  };
  return { h: { tex: tex(H), cols: H.cols, rows: H.rows }, v: { tex: tex(V), cols: V.cols, rows: V.rows }, index };
}
