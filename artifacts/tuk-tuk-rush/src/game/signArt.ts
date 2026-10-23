import * as T from "three";
import type { Obstacle } from "./types";

export type SignStyle = NonNullable<Obstacle["style"]>;
export type SignEntry = {
  key: string;
  text: string;
  style: SignStyle;
  variant: number;
  signatureId?: string;
  secondary?: string;
  layout?: "neon" | "painted";
  palette?: [string, string, string];
};
const PAL: Record<SignStyle, [string, string, string][]> = {
  gold: [
    ["#a3262a", "#e6bb55", "#f6d27c"],
    ["#2b1f1c", "#e6bb55", "#f6d27c"],
  ],
  noodle: [
    ["#f1e2b5", "#2f7f76", "#b5461f"],
    ["#2f7f76", "#f1e2b5", "#f7e3b0"],
  ],
  pharmacy: [
    ["#f2f5ee", "#2c8a5f", "#1f7a52"],
    ["#2c8a5f", "#f2f5ee", "#f2f5ee"],
  ],
  hotel: [
    ["#25384f", "#d9b25a", "#f0d58c"],
    ["#eadfc6", "#25384f", "#25384f"],
  ],
  heritage: [
    ["#2f5d58", "#d8b36a", "#f5e5be"],
    ["#6b2c2a", "#d8b36a", "#f5e5be"],
  ],
};
const FONT = '"Rush Thai","Rush Chinese","Thonburi",sans-serif';

function motif(
  c: CanvasRenderingContext2D,
  s: SignStyle,
  x: number,
  y: number,
  r: number,
  col: string,
) {
  c.fillStyle = col;
  c.strokeStyle = col;
  c.lineWidth = 3;
  c.beginPath();
  if (s === "gold") {
    c.arc(x, y, r, 0, 7);
    c.stroke();
    c.fillRect(x - r * 0.35, y - r * 0.35, r * 0.7, r * 0.7);
    return;
  }
  if (s === "noodle") {
    c.arc(x, y + r * 0.1, r, 0, Math.PI);
    c.fill();
    return;
  }
  if (s === "pharmacy") {
    c.fillRect(x - r * 0.28, y - r, r * 0.56, r * 2);
    c.fillRect(x - r, y - r * 0.28, r * 2, r * 0.56);
    return;
  }
  if (s === "hotel") {
    c.moveTo(x, y - r);
    c.lineTo(x + r, y);
    c.lineTo(x, y + r);
    c.lineTo(x - r, y);
    c.fill();
    return;
  }
  c.arc(x, y, r * 0.8, Math.PI, 0);
  c.lineTo(x + r * 0.8, y + r * 0.8);
  c.lineTo(x - r * 0.8, y + r * 0.8);
  c.fill();
}
function frame(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bg: string,
  line: string,
) {
  c.fillStyle = bg;
  c.fillRect(x, y, w, h);
  c.strokeStyle = line;
  c.lineWidth = 7;
  c.strokeRect(x + 7, y + 7, w - 14, h - 14);
  c.lineWidth = 2.5;
  c.strokeRect(x + 17, y + 17, w - 34, h - 34);
}
function fit(
  c: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  size: number,
) {
  c.font = `800 ${size}px ${FONT}`;
  const m = c.measureText(text).width;
  if (m > maxW) c.font = `800 ${Math.floor((size * maxW) / m)}px ${FONT}`;
}

/** Hand-authored lettering layouts informed by individual shop photographs.
 * No proprietary logo bitmaps or photo textures; text is drawn with fonts
 * bundled in the game. Never silently apply one branch's design to another.
 */
function heroHorizontal(
  c: CanvasRenderingContext2D,
  e: SignEntry,
  kind: string,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  if (!kind) return false;
  c.save();
  if (kind === "naiek") {
    // Nai Ek 442: unpretentious white Thai menu board rather than gold neon.
    c.fillStyle = "#f6f3e8";
    c.fillRect(x, y, w, h);
    c.fillStyle = "#b8292e";
    c.fillRect(x, y, w, 9);
    c.fillStyle = "#4e463c";
    c.fillRect(x, y + h - 7, w, 7);
    c.textAlign = "left";
    c.textBaseline = "middle";
    c.fillStyle = "#c2292b";
    fit(c, "ก๋วยจั๊บนายเอ็ก", w - 60, 58);
    c.fillText("ก๋วยจั๊บนายเอ็ก", x + 28, y + 46);
    c.font = `500 22px ${FONT}`;
    c.fillStyle = "#50453e";
    c.fillText("ก๋วยจั๊บ   ข้าวหมูกรอบ   ข้าวขาหมู", x + 29, y + 97);
    c.restore();
    return true;
  }
  if (kind === "hua") {
    // Cream stone and deep-red inset correspond to the modern Yaowarat shop.
    c.fillStyle = "#e4d8c6";
    c.fillRect(x, y, w, h);
    c.fillStyle = "#8b1825";
    c.fillRect(x + 16, y + 10, w - 32, h - 20);
    c.strokeStyle = "#d5ab67";
    c.lineWidth = 5;
    c.strokeRect(x + 21, y + 15, w - 42, h - 30);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#f4e5c1";
    fit(c, e.text, w - 88, 78);
    c.fillText(e.text, x + w / 2, y + h / 2 + 3);
    c.restore();
    return true;
  }
  if (kind === "thong") {
    // Branch 444 sign is intentionally a NEW design: do not copy the vivid
    // lightbox photographed at branch 152–154 and call it the same location.
    c.fillStyle = "#941e2e";
    c.fillRect(x, y, w, h);
    for (const [col, inset] of [
      ["#e9c05d", 5],
      ["#236a58", 11],
      ["#e5ae4f", 17],
    ] as const) {
      c.strokeStyle = col;
      c.lineWidth = 5;
      c.strokeRect(x + inset, y + inset, w - 2 * inset, h - 2 * inset);
    }
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#fff1cc";
    fit(c, e.text, w - 90, 70);
    c.fillText(e.text, x + w / 2, y + h / 2 + 3);
    c.restore();
    return true;
  }
  // So Seng Heng: antique-style deep-red inset and gilded rectangular border.
  c.fillStyle = "#e1d3bd";
  c.fillRect(x, y, w, h);
  c.fillStyle = "#85252a";
  c.fillRect(x + 12, y + 9, w - 24, h - 18);
  c.strokeStyle = "#e9be62";
  c.lineWidth = 6;
  c.strokeRect(x + 19, y + 16, w - 38, h - 32);
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "#ffe5a5";
  fit(c, e.text, w - 85, 70);
  c.fillText(e.text, x + w / 2, y + h / 2 + 1);
  c.restore();
  return true;
}
/** Side-facing sign text always stays legible. Thai diacritics are never
 * separated into individual boxes or rendered in invented Chinese glyphs. */
function heroVertical(
  c: CanvasRenderingContext2D,
  e: SignEntry,
  kind: string,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  if (!kind) return false;
  c.save();
  const red = kind === "naiek" ? "#f1efe3" : "#9a1f2b";
  const gold = kind === "naiek" ? "#ba2d2b" : "#efd075";
  c.fillStyle = red;
  c.fillRect(x, y, w, h);
  c.strokeStyle = gold;
  c.lineWidth = kind === "naiek" ? 4 : 7;
  c.strokeRect(x + 9, y + 11, w - 18, h - 22);
  if (kind === "soseng") {
    for (let i = 0; i < 7; i++) {
      c.fillStyle = i % 2 ? "#6d1723" : "#bd3940";
      c.fillRect(x + 20, y + 21 + i * 69, w - 40, 2);
    }
  }
  c.fillStyle = gold;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.translate(x + w / 2, y + h / 2);
  c.rotate(Math.PI / 2);
  fit(c, e.text, h - 65, kind === "naiek" ? 42 : 51);
  c.fillText(e.text, 0, 0);
  c.restore();
  return true;
}

/** Original sign plates: two atlases (horizontal fascia, vertical blade), drawn once on canvas. */
export function buildSignAtlas(entries: SignEntry[], compact = false) {
  const n = Math.max(1, entries.length);
  const make = (cw: number, ch: number, cols: number) => {
    const rows = Math.ceil(n / cols),
      canvas = document.createElement("canvas");
    canvas.width = cw * cols;
    canvas.height = ch * rows;
    return { canvas, c: canvas.getContext("2d")!, rows, cols, cw, ch };
  };
  const H = make(512, 128, compact ? 4 : 2),
    V = make(128, 512, compact ? 8 : 8);
  const index = new Map<string, number>();
  entries.forEach((e, i) => {
    index.set(e.key, i);
    const signature =
      e.signatureId === "hua418"
        ? "hua"
        : e.signatureId === "thong444"
          ? "thong"
          : e.signatureId === "so456"
            ? "soseng"
            : e.signatureId === "nai442"
              ? "naiek"
              : "";
    // Original, distinctly composed reference-inspired signage: verified
    // business names, no copied brand logos or photographic textures.
    const colors: [string, string, string] =
      e.palette ??
      (signature === "hua"
        ? ["#971c22", "#eac05d", "#fff0bf"]
        : signature === "thong"
          ? ["#b7272e", "#e5bd55", "#fff5cd"]
          : signature === "soseng"
            ? ["#a91f2b", "#edc255", "#fff1bf"]
            : signature === "naiek"
              ? ["#f2eee1", "#b82d30", "#ab252e"]
              : e.key.startsWith("khao-")
                ? ([
                    ["#203f4b", "#f9cc6a", "#fff0bd"],
                    ["#52304e", "#f397c9", "#ffe0f0"],
                    ["#174e49", "#73dfba", "#e0ffdf"],
                    ["#2c3855", "#87bced", "#d5f6ff"],
                  ][e.variant % 4] as [string, string, string])
                : PAL[e.style][e.variant % 2]!);
    const [bg, line, ink] = colors;
    let x = (i % H.cols) * H.cw,
      y = Math.floor(i / H.cols) * H.ch;
    if (e.layout) {
      const c = H.c;
      frame(c, x, y, H.cw, H.ch, bg, line);
      c.fillStyle = ink;
      c.textAlign = "center";
      c.textBaseline = "middle";
      fit(c, e.text, H.cw - 55, 70);
      c.fillText(e.text, x + H.cw / 2, y + 49);
      if (e.secondary) {
        c.fillStyle = line;
        fit(c, e.secondary, H.cw - 60, 24);
        c.fillText(e.secondary, x + H.cw / 2, y + 101);
      }
      if (e.layout === "neon") {
        c.fillStyle = ink;
        for (let k = 0; k < 10; k++) c.fillRect(x + 32 + k * 49, y + 9, 3, 3);
      }
    } else if (!heroHorizontal(H.c, e, signature, x, y, H.cw, H.ch)) {
      frame(H.c, x, y, H.cw, H.ch, bg, line);
      motif(H.c, e.style, x + 50, y + 64, 20, line);
      motif(H.c, e.style, x + H.cw - 50, y + 64, 20, line);
      H.c.fillStyle = ink;
      H.c.textAlign = "center";
      H.c.textBaseline = "middle";
      fit(H.c, e.text, H.cw - 150, 74);
      H.c.fillText(e.text, x + H.cw / 2, y + 68);
    }
    x = (i % V.cols) * V.cw;
    y = Math.floor(i / V.cols) * V.ch;
    if (e.layout) {
      const c = V.c;
      frame(c, x, y, V.cw, V.ch, bg, line);
      c.textAlign = "center";
      c.textBaseline = "middle";
      const chinese = /[\u3400-\u9fff]/.test(e.text);
      if (chinese) {
        const chars = [...e.text],
          cell = 350 / chars.length;
        chars.forEach((ch, j) => {
          const cy = y + 60 + (j + 0.5) * cell;
          c.font = `800 ${Math.min(88, cell * 0.78)}px ${FONT}`;
          if (e.layout === "neon") {
            c.strokeStyle = line;
            c.lineWidth = 3.5;
            c.strokeText(ch, x + 64, cy);
            c.fillStyle = ink;
            c.fillText(ch, x + 64, cy);
          } else {
            c.fillStyle = ink;
            c.fillText(ch, x + 64, cy);
          }
        });
        c.fillStyle = line;
        c.fillRect(x + 20, y + 429, 88, 2);
        if (e.secondary) {
          fit(c, e.secondary, 100, 21);
          c.fillText(e.secondary, x + 64, y + 463);
        }
      } else {
        c.save();
        c.translate(x + 64, y + 256);
        c.rotate(Math.PI / 2);
        c.fillStyle = ink;
        fit(c, e.text, 410, 54);
        c.fillText(e.text, 0, 0);
        c.restore();
      }
    } else if (!heroVertical(V.c, e, signature, x, y, V.cw, V.ch)) {
      frame(V.c, x, y, V.cw, V.ch, bg, line);
      motif(V.c, e.style, x + 64, y + 40, 16, line);
      // Fictional Chinese trade signs use real words and stacked characters.
      // Thai stays intact and is rotated as a single correctly shaped phrase.
      const thai = /[\u0E00-\u0E7F]|[A-Za-z]/.test(e.text);
      const glyphs = thai
        ? []
        : (e.text.match(/\p{L}\p{M}*|\p{N}/gu) ?? [e.text]).slice(0, 4);
      const cell = Math.min(104, (512 - 90) / Math.max(1, glyphs.length));
      glyphs.forEach((g, k) => {
        const cy = y + 70 + k * cell;
        V.c.strokeStyle = line;
        V.c.lineWidth = 3;
        if (e.variant % 2 === 0) V.c.strokeRect(x + 14, cy + 4, 100, cell - 8);
        V.c.fillStyle = line;
        V.c.beginPath();
        if (e.style === "heritage" && e.variant % 2 === 0) {
          V.c.arc(x + 64, cy + cell / 2, cell * 0.4, 0, 7);
          V.c.fill();
        }
        V.c.fillStyle = bg;
        V.c.beginPath();
        if (e.style === "heritage" && e.variant % 2 === 0) {
          V.c.arc(x + 64, cy + cell / 2, cell * 0.36, 0, 7);
          V.c.fill();
        }
        V.c.fillStyle = ink;
        V.c.font = `800 ${cell * 0.63}px ${FONT}`;
        V.c.textAlign = "center";
        V.c.textBaseline = "middle";
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
    }
  });
  const tex = (a: typeof H) => {
    let canvas = a.canvas;
    if (compact) {
      const reduced = document.createElement("canvas");
      reduced.width = canvas.width / 2;
      reduced.height = canvas.height / 2;
      reduced
        .getContext("2d")!
        .drawImage(canvas, 0, 0, reduced.width, reduced.height);
      canvas = reduced;
    }
    const t = new T.CanvasTexture(canvas);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    t.generateMipmaps = true;
    return t;
  };
  return {
    h: { tex: tex(H), cols: H.cols, rows: H.rows },
    v: { tex: tex(V), cols: V.cols, rows: V.rows },
    index,
  };
}
