import * as T from "three";
/** Positions/topology stay exact. Compact bounded attributes with aligned strides. */
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
    // Three-byte vectors are valid WebGL, but cause inefficient unaligned reads
    // on some backends. Match the four-byte stride used by quantized glTF assets.
    const stride = !uv && a.itemSize === 3 ? 4 : a.itemSize;
    const values = signed
      ? new Int8Array(a.count * stride)
      : uv
        ? new Uint16Array(a.count * stride)
        : new Uint8Array(a.count * stride);
    for (let vertex = 0; vertex < a.count; vertex++)
      for (let component = 0; component < a.itemSize; component++)
        values[vertex * stride + component] = Math.round(
          T.MathUtils.clamp(
            a.array[vertex * a.itemSize + component]!,
            signed ? -1 : 0,
            1,
          ) * limit,
        );
    if (stride !== a.itemSize)
      g.setAttribute(
        key,
        new T.InterleavedBufferAttribute(
          new T.InterleavedBuffer(values, stride),
          a.itemSize,
          0,
          true,
        ),
      );
    else g.setAttribute(key, new T.BufferAttribute(values, a.itemSize, true));
  }
  return g;
}
