import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Obstacle } from "./types";

export type Style = NonNullable<Obstacle["style"]>;
export type MatKey = "plaster" | "metal" | "glass" | "cloth";
/** Building-local frame: u along the facade, y up, v out of the shop front (+v is the road side). */
export type FacadeApi = {
  add(m: MatKey, color: string, geo: T.BufferGeometry, u: number, y: number, v: number, detail?: boolean): void;
  sign(id: number, u: number, y: number, v: number, w: number, h: number): void;
  vsign(id: number, u: number, y: number, v: number, w: number, h: number): void;
};
const cache = new Map<string, T.BufferGeometry>();
const get = (k: string, f: () => T.BufferGeometry) => {
  let g = cache.get(k);
  if (!g) cache.set(k, (g = f()));
  return g;
};
const q = (n: number) => Math.max(0.02, Math.round(n * 20) / 20);
export const clearFacadeCache = () => {
  cache.forEach((g) => g.dispose());
  cache.clear();
};
const RB = (w: number, h: number, d: number, r: number) => {
  w = q(w); h = q(h); d = q(d);
  r = Math.min(r, Math.min(w, h, d) / 2 - 0.005);
  // Sub-pixel bevels on thin glazing/rails waste nine times a box's triangles.
  // Keep sculpted shells, pillars, canopies and large trim rounded.
  if (r <= 0.12) return BX(w, h, d);
  return get(`r${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 1, r));
};
const BX = (w: number, h: number, d: number) => get(`b${q(w)},${q(h)},${q(d)}`, () => new T.BoxGeometry(q(w), q(h), q(d)));
const BALL = (x: number, y: number, z: number) => get(`s${q(x)},${q(y)},${q(z)}`, () => new T.SphereGeometry(1, 10, 7).scale(q(x), q(y), q(z)));
/** Horizontal half-round vault along u. */
const VAULT = (len: number, r: number) =>
  get(`v${q(len)},${q(r)}`, () => new T.CylinderGeometry(r, r, q(len), 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2));
const DISC = (r: number) => get(`d${q(r)}`, () => new T.CylinderGeometry(r, r, 0.1, 14).rotateX(Math.PI / 2));
const CYL = (r: number, h: number) => get(`c${q(r)},${q(h)}`, () => new T.CylinderGeometry(q(r), q(r), q(h), 10));
/** Triangular prism, ridge parallel to u. */
const GABLE = (w: number, h: number, d: number) =>
  get(`g${q(w)},${q(h)},${q(d)}`, () => {
    const s = new T.Shape([new T.Vector2(-d / 2, 0), new T.Vector2(d / 2, 0), new T.Vector2(0, h)]);
    return new T.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }).translate(0, 0, -w / 2).rotateY(Math.PI / 2);
  });
const TORUS = (r: number) => get(`t${q(r)}`, () => new T.TorusGeometry(r, r * 0.22, 5, 12));

const PAL: Record<Style, { wall: string; wall2: string; a: string; b: string; glass: string }> = {
  gold: { wall: "#cfa97d", wall2: "#bf9366", a: "#a3282b", b: "#e1b24e", glass: "#3a2325" },
  noodle: { wall: "#eadfba", wall2: "#d9c797", a: "#2f7f76", b: "#d9732f", glass: "#2c4a47" },
  pharmacy: { wall: "#dde6dc", wall2: "#c7d6c9", a: "#2c8a5f", b: "#f3f6ee", glass: "#486f6b" },
  hotel: { wall: "#d6c7aa", wall2: "#bfae8f", a: "#2c4059", b: "#d9b25a", glass: "#34495e" },
  heritage: { wall: "#e3c48c", wall2: "#cc8f62", a: "#3a6f66", b: "#a2503a", glass: "#3b3a33" },
};
export const defaultSign: Record<Style, string> = {
  gold: "ร้านทอง", noodle: "ก๋วยเตี๋ยว", pharmacy: "ร้านขายยา", hotel: "โรงแรม", heritage: "เยาวราช",
};

export function composeFacade(
  api: FacadeApi,
  o: { style: Style; W: number; D: number; H: number; i: number; sign: number; showcase: boolean },
) {
  const { style, W, D, H, i } = o, F = D / 2, p = PAL[style];
  const side = i % 2 ? 1 : -1, ux = side * (W / 2 - 0.95);
  const dp = 0.22 + (i % 3) * 0.16; // varied fascia depth
  const R = (m: MatKey, c: string, w: number, h: number, d: number, u: number, y: number, v: number, r = 0.14, det = true) =>
    api.add(m, c, RB(w, h, d, r), u, y, v, det);
  const Bx = (m: MatKey, c: string, w: number, h: number, d: number, u: number, y: number, v: number, det = true) =>
    api.add(m, c, BX(w, h, d), u, y, v, det);
  const nf = Math.max(1, Math.floor((H - 4.4) / 3.5));
  const fy = (f: number) => 5.7 + f * 3.5;

  // Ground floor: dark display glazing between plastered piers.
  Bx("glass", p.glass, W - 1.5, 2.7, 0.1, 0, 1.6, F + 0.04);
  for (const k of [-1, 1]) R("plaster", p.wall2, 0.75, 3.7, 0.55, k * (W / 2 - 0.42), 1.85, F + 0.14, 0.14);
  R("plaster", p.wall2, W + 0.1, 0.3, 0.75, 0, 0.15, F + 0.2, 0.1);
  R("plaster", p.wall2, W - 0.1, 0.4, 0.62, 0, 3.8, F + 0.15, 0.14);
  // Merchandise: shelves + goods tied to the trade.
  const goods = style === "gold" ? p.b : style === "noodle" ? "#f4ead0" : style === "pharmacy" ? "#d7efe2" : style === "hotel" ? "#a55b3a" : "#7f5638";
  for (let s = 0; s < 3; s++) {
    Bx("metal", "#6f5a44", W - 2.2, 0.07, 0.5, 0, 0.9 + s * 0.65, F - 0.2);
    for (let k = 0; k < 6; k++)
      api.add(style === "gold" ? "metal" : "plaster", goods, style === "gold" ? TORUS(0.17) : BALL(0.15, 0.13, 0.13),
        ((k - 2.5) * (W - 2.8)) / 6, 1.08 + s * 0.65, F - 0.08);
  }

  // Style silhouettes ----------------------------------------------------
  if (style === "gold") {
    for (const k of [-1, 1]) R("plaster", p.a, 0.95, H - 3.8, 0.55, k * (W / 2 - 0.5), (H + 3.8) / 2, F + 0.2, 0.18);
    R("metal", p.b, W - 1.0, 2.0, 0.3 + dp * 0.3, 0, 4.75, F + 0.25, 0.1);
    R("plaster", p.a, W - 1.3, 1.65, 0.12, 0, 4.75, F + 0.38, 0.05);
    api.sign(o.sign, 0, 4.75, F + 0.47, W - 1.55, 1.45);
    for (let f = 0; f < nf; f++) {
      for (const k of W > 9 ? [-1, 1] : [0]) {
        const wx = k * W * 0.2;
        R("metal", p.b, W * 0.28 + 0.4, 2.35, 0.2, wx, fy(f), F + 0.1, 0.1);
        R("glass", "#46686f", W * 0.28, 2.05, 0.1, wx, fy(f), F + 0.22, 0.05);
        R("metal", p.b, W * 0.3 + 0.5, 0.2, 0.4, wx, fy(f) + 1.3, F + 0.2, 0.08);
      }
      R("plaster", p.wall2, W - 1.2, 0.18, 0.95, 0, fy(f) - 1.35, F + 0.42, 0.07);
      for (let k = 0; k < 9; k++) Bx("metal", p.a, 0.05, 0.5, 0.05, ((k - 4) * (W - 1.5)) / 8.2, fy(f) - 1.05, F + 0.84, o.showcase);
      Bx("metal", p.a, W - 1.5, 0.06, 0.06, 0, fy(f) - 0.78, F + 0.84, o.showcase);
    }
    R("plaster", p.b, W + 0.4, 0.5, 1.0, 0, H + 0.25, F + 0.05, 0.16);
    api.add("plaster", p.a, GABLE(W * 0.42, 2.1, 1.5), 0, H + 0.5, F - 0.6);
    api.add("metal", p.b, GABLE(W * 0.3, 1.3, 1.9), 0, H + 2.4, F - 0.6);
    api.add("metal", p.b, GABLE(W * 0.18, 0.9, 1.3), 0, H + 3.5, F - 0.6);
    api.add("metal", p.b, BALL(0.35, 0.35, 0.35), 0, H + 4.6, F - 0.6);
    // Blade sign on twin brackets, deeper than the fascia.
    Bx("metal", p.b, 0.12, 0.12, 1.5, ux, 6.2, F + 0.75);
    Bx("metal", p.b, 0.12, 0.12, 1.5, ux, 11.8, F + 0.75);
    R("metal", p.b, 0.34, 7.6, 1.2, ux, 9.2, F + 1.5, 0.1);
    api.vsign(o.sign, ux, 9.2, F + 1.5, 1.0, 7.3);
    api.add("metal", p.b, BALL(0.55, 0.55, 0.2), ux, 13.3, F + 1.5);
    R("metal", p.a, 0.34, 0.5, 1.5, ux, 13.0, F + 1.5, 0.12);
  } else if (style === "noodle") {
    api.add("cloth", p.a, VAULT(W - 1.0, 1.05), 0, 3.35, F + 0.95);
    api.add("cloth", p.b, VAULT(W - 0.9, 0.98), 0, 3.32, F + 0.96);
    for (let k = 0; k < 6; k++) api.add("cloth", p.wall, VAULT(0.22, 1.06), ((k - 2.5) * (W - 1.4)) / 6, 3.36, F + 0.95);
    R("metal", p.b, W - 1.5, 1.55, 0.26, 0, 5.15, F + 0.2 + dp * 0.5, 0.12);
    R("plaster", p.wall, W - 1.8, 1.25, 0.1, 0, 5.15, F + 0.38 + dp * 0.5, 0.05);
    api.sign(o.sign, 0, 5.15, F + 0.47 + dp * 0.5, W - 1.9, 1.2);
    for (let k = 0; k < 5; k++) {
      const x = ((k - 2) * (W - 2)) / 5;
      Bx("metal", "#5a4638", 0.03, 0.5, 0.03, x, 2.95, F + 1.1);
      api.add("cloth", "#c3382b", BALL(0.24, 0.3, 0.24), x, 2.55, F + 1.1);
    }
    for (let f = 0; f < nf; f++)
      for (const k of [-1, 1]) {
        const wx = k * W * 0.23;
        R("plaster", p.wall2, W * 0.3, 2.2, 0.2, wx, fy(f) + 0.7, F + 0.1, 0.1);
        R("glass", "#496f72", W * 0.22, 1.7, 0.1, wx, fy(f) + 0.7, F + 0.22, 0.05);
        Bx("metal", p.a, 0.06, 1.7, 0.06, wx, fy(f) + 0.7, F + 0.3);
        for (const s of [-1, 1]) R("metal", p.a, 0.4, 1.9, 0.07, wx + s * W * 0.14, fy(f) + 0.7, F + 0.3, 0.04);
        R("plaster", "#527a52", W * 0.3, 0.3, 0.45, wx, fy(f) - 0.35, F + 0.42, 0.1);
      }
    for (let k = 0; k < Math.floor(W / 1.4); k++) api.add("plaster", p.wall, BALL(0.42, 0.34, 0.42), (k - (Math.floor(W / 1.4) - 1) / 2) * 1.4, H + 0.1, F - 0.2);
    api.add("cloth", p.b, BALL(1.5, 0.9, 1.5), ux, H + 0.9, F - 1.4);
    Bx("metal", "#f0dfb7", 0.05, 1.6, 0.05, ux - 0.3, H + 2.2, F - 1.4);
    Bx("metal", "#f0dfb7", 0.05, 1.6, 0.05, ux + 0.3, H + 2.2, F - 1.4);
    api.add("metal", "#8a9a97", CYL(0.9, 1.7), -ux, H + 0.85, -F + 1.4);
    R("metal", p.b, 0.3, 6.0, 1.3, -ux, 8.4, F + 1.0, 0.1);
    api.vsign(o.sign, -ux, 8.4, F + 1.0, 1.15, 5.7);
    Bx("metal", p.a, 0.1, 0.1, 1.0, -ux, 5.8, F + 0.5);
    Bx("metal", p.a, 0.1, 0.1, 1.0, -ux, 10.6, F + 0.5);
  } else if (style === "pharmacy") {
    R("metal", p.a, W - 0.4, 0.38, 1.25, 0, 4.0, F + 0.65, 0.18);
    for (let k = 0; k < 7; k++) R("cloth", p.b, (W - 0.8) / 14, 0.4, 1.27, ((k - 3) * (W - 0.8)) / 7, 4.0, F + 0.65, 0.05);
    R("metal", p.b, W - 1.0, 1.4, 0.26, 0, 5.1, F + 0.2 + dp * 0.4, 0.12);
    R("metal", p.a, W - 1.3, 1.1, 0.1, 0, 5.1, F + 0.36 + dp * 0.4, 0.05);
    api.sign(o.sign, 0, 5.1, F + 0.45 + dp * 0.4, W - 1.45, 1.05);
    // Projecting cross emblem.
    const cx = -ux;
    R("metal", p.b, 2.8, 2.8, 0.55, cx, 8.0, F + 0.95, 0.2);
    R("metal", p.a, 0.8, 2.3, 0.62, cx, 8.0, F + 0.97, 0.12);
    R("metal", p.a, 2.3, 0.8, 0.62, cx, 8.0, F + 0.97, 0.12);
    Bx("metal", "#7b8c84", 0.1, 0.1, 0.9, cx, 6.5, F + 0.5);
    for (let f = 0; f < nf; f++) {
      R("plaster", p.a, W - 0.7, 0.55, 0.3, 0, fy(f) - 1.35, F + 0.15, 0.1);
      R("plaster", p.b, W * 0.74, 2.0, 0.2, 0, fy(f) + 0.2, F + 0.1, 0.12);
      R("glass", "#5f8f8a", W * 0.7, 1.7, 0.1, 0, fy(f) + 0.2, F + 0.22, 0.06);
      for (let k = 1; k < 4; k++) Bx("metal", p.b, 0.06, 1.7, 0.05, (k - 2) * W * 0.17, fy(f) + 0.2, F + 0.28);
    }
    R("plaster", p.wall2, W + 0.3, 0.55, 0.8, 0, H + 0.25, F, 0.16);
    R("metal", p.a, W * 0.45, 1.3, 0.5, -ux * 0.4, H + 1.2, F - 1.2, 0.15);
    R("plaster", "#d2d8d0", 1.4, 0.9, 1.1, ux, H + 0.9, -F + 1.5, 0.12);
    R("metal", p.a, 0.3, 5.6, 1.15, ux, 9.4, F + 0.8, 0.1);
    api.vsign(o.sign, ux, 9.4, F + 0.8, 1.0, 5.3);
    Bx("metal", p.a, 0.1, 0.1, 0.9, ux, 6.9, F + 0.45);
    Bx("metal", p.a, 0.1, 0.1, 0.9, ux, 11.8, F + 0.45);
  } else if (style === "hotel") {
    for (const k of [-1, 1]) R("plaster", p.wall2, 1.15, H - 0.4, 0.8, k * (W / 2 - 0.55), H / 2, F + 0.3, 0.3);
    for (let k = -2; k <= 2; k++) if (k) R("plaster", p.b, 0.28, H - 5, 0.55, k * (W / 6), (H + 4.6) / 2, F + 0.2, 0.1, o.showcase);
    R("metal", p.a, W * 0.66, 0.5, 1.5, 0, 4.15, F + 0.75, 0.2);
    for (const k of [-1, 1]) Bx("metal", p.b, 0.08, 0.7, 0.08, k * W * 0.28, 3.7, F + 1.35);
    R("metal", p.b, W - 2.0, 1.55, 0.3 + dp * 0.3, 0, 5.2, F + 0.25, 0.12);
    R("plaster", p.a, W - 2.3, 1.25, 0.1, 0, 5.2, F + 0.4, 0.05);
    api.sign(o.sign, 0, 5.2, F + 0.5, W - 2.4, 1.15);
    for (let f = 0; f < nf; f++) {
      R("plaster", p.wall, W - 1.8, 0.28, 1.1, 0, fy(f) - 1.3, F + 0.55, 0.1);
      Bx("metal", p.a, W - 1.8, 0.07, 0.07, 0, fy(f) - 0.7, F + 1.05, o.showcase);
      R("glass", p.glass, W - 3.6, 1.8, 0.1, 0, fy(f) + 0.1, F + 0.1, 0.05);
      R("metal", p.b, W - 3.5, 0.08, 0.12, 0, fy(f) + 1.05, F + 0.16, 0.03);
    }
    R("plaster", p.wall2, W - 1.2, 2.8, D * 0.62, 0, H + 1.4, 0, 0.35);
    R("plaster", p.b, W - 0.9, 0.35, D * 0.7, 0, H + 2.9, 0, 0.12);
    Bx("metal", p.b, 0.12, 4.4, 0.12, ux, H + 4.6, 0);
    R("metal", p.b, 0.6, 7, 0.45, W / 2 - 0.4 - (side > 0 ? 0 : W - 0.8), H - 3.4, F + 1.1, 0.12);
    api.vsign(o.sign, W / 2 - 0.4 - (side > 0 ? 0 : W - 0.8), H - 3.4, F + 1.1, 0.9, 6.6);
  } else {
    // heritage shophouse: arched openings, shutters, clay roof
    for (let k = -1; k <= 1; k += 2) {
      const x = k * W * 0.22;
      api.add("glass", p.glass, DISC(0.85), x, 3.4, F + 0.02);
      R("plaster", p.wall2, 2.0, 0.28, 0.35, x, 4.4, F + 0.2, 0.1);
      api.add("metal", p.b, BALL(0.14, 0.16, 0.12), x, 4.55, F + 0.35);
    }
    R("metal", "#5f4330", W - 1.6, 1.3, 0.3 + dp * 0.4, 0, 5.15, F + 0.2, 0.12);
    R("plaster", "#f1ddb0", W - 1.9, 1.0, 0.1, 0, 5.15, F + 0.38, 0.05);
    api.sign(o.sign, 0, 5.15, F + 0.46, W - 2.0, 0.95);
    for (let f = 0; f < nf; f++)
      for (const k of [-1, 1]) {
        const wx = k * W * 0.22;
        R("plaster", "#f3e3bd", 2.0, 2.45, 0.22, wx, fy(f) + 0.7, F + 0.1, 0.12);
        R("glass", "#41585a", 1.25, 1.95, 0.1, wx, fy(f) + 0.7, F + 0.24, 0.5);
        for (const s of [-1, 1]) R("metal", p.a, 0.62, 2.0, 0.08, wx + s * 0.8, fy(f) + 0.7, F + 0.3, 0.1);
        R("plaster", p.wall2, 2.3, 0.2, 0.7, wx, fy(f) - 0.55, F + 0.35, 0.08);
        if (o.showcase) for (let j = 0; j < 6; j++) Bx("metal", "#4c3a2c", 0.04, 0.35, 0.04, wx + (j - 2.5) * 0.36, fy(f) - 0.3, F + 0.68);
      }
    for (const k of [-1, 1]) {
      Bx("metal", "#6a4a34", 0.12, 0.7, 0.85, k * (W * 0.46), 3.9, F + 0.35);
    }
    api.add("plaster", p.b, GABLE(W + 0.7, 2.7, D + 0.7), 0, H + 0.3, 0);
    api.add("plaster", "#ead8ae", GABLE(W * 0.35, 1.3, 0.5), 0, H + 0.4, F + 0.4);
    R("plaster", p.wall2, W + 0.3, 0.4, 0.5, 0, H + 0.2, F + 0.1, 0.12);
    R("metal", "#5f4330", 0.3, 6.6, 1.3, ux, 8.8, F + 1.3, 0.08);
    Bx("metal", "#5f4330", 0.1, 0.1, 1.3, ux, 11.6, F + 0.65);
    Bx("metal", "#5f4330", 0.1, 0.1, 1.3, ux, 6.2, F + 0.65);
    api.vsign(o.sign, ux, 8.8, F + 1.3, 1.1, 6.3);
    api.add("metal", p.b, BALL(0.4, 0.4, 0.2), ux, 12.3, F + 1.3);
  }
  if (o.showcase) {
    // downpipe + AC compressor + louvres on the facade side
    Bx("metal", "#7b7466", 0.12, H, 0.12, -W / 2 + 0.2, H / 2, F + 0.06);
    R("metal", "#d4d0b6", 0.85, 0.5, 0.55, W * 0.32, 6.3, F + 0.4, 0.08);
  }
}

/** Secondary treatment for exposed side walls: floor bands, window strips, cornice, ground shutters. Plain boxes only. */
export function composeSide(api: FacadeApi, o: { style: Style; W: number; D: number; H: number; i: number }) {
  const { style, W, D, H } = o, p = PAL[style];
  const nf = Math.max(1, Math.floor((H - 4.4) / 3.5)), n = Math.min(4, Math.max(1, Math.floor((D - 2.5) / 3.2)));
  const bx = (m: MatKey, c: string, w: number, h: number, d: number, u: number, y: number, v: number) =>
    api.add(m, c, BX(w, h, d), u, y, v, false);
  for (const s of [-1, 1]) {
    const x = s * (W / 2);
    bx("plaster", p.wall2, 0.5, 0.35, D + 0.1, x, H + 0.1, 0);
    bx("plaster", p.b === "#f3f6ee" ? p.a : p.b, 0.28, 0.2, D, x, 3.9, 0);
    bx("metal", style === "hotel" ? p.b : p.a, 0.14, 2.6, D - 1.2, x, 1.6, 0);
    for (let k = 0; k < 8; k++) bx("metal", "#4c4a42", 0.05, 0.05, D - 1.3, x, 0.6 + k * 0.32, 0);
    for (let f = 0; f < nf; f++) {
      const y = 5.7 + f * 3.5;
      bx("plaster", p.wall2, 0.2, 0.2, D - 0.4, x, y - 1.15, 0);
      for (let k = 0; k < n; k++) {
        const v = (k - (n - 1) / 2) * 3.2;
        bx("plaster", "#efe0bd", 0.14, 2.0, 1.7, x, y, v);
        bx("glass", style === "pharmacy" ? "#5f8f8a" : "#3f5d63", 0.1, 1.7, 1.4, x + s * 0.04, y, v);
        bx("metal", p.a, 0.12, 0.08, 1.8, x + s * 0.06, y + 1.05, v);
      }
    }
    bx("plaster", p.wall2, 0.4, H - 3.8, 0.45, x, (H + 3.8) / 2, -D / 2 + 0.1);
  }
}
