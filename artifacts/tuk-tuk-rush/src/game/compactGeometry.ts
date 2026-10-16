import * as T from "three";
/** Positions and topology stay exact. Compress only bounded static attributes. */
export function compactGeometry(g: T.BufferGeometry) {
  for (const key of ["normal", "color", "uv"]) {
    const a = g.getAttribute(key);
    if (
      !a ||
      "isInterleavedBufferAttribute" in a ||
      !(a.array instanceof Float32Array)
    )
      continue;
    const signed = key === "normal",
      uv = key === "uv";
    if (uv && a.array.some((v) => v < 0 || v > 1)) continue;
    const limit = signed ? 127 : uv ? 65535 : 255;
    const values = signed
      ? new Int8Array(a.array.length)
      : uv
        ? new Uint16Array(a.array.length)
        : new Uint8Array(a.array.length);
    for (let i = 0; i < values.length; i++)
      values[i] = Math.round(
        T.MathUtils.clamp(a.array[i]!, signed ? -1 : 0, 1) * limit,
      );
    g.setAttribute(key, new T.BufferAttribute(values, a.itemSize, true));
  }
  return g;
}
