/** Bangkok assets are source-gzipped files with optional generated .pack aliases.
 * Vite/Replit may answer a missing .pack URL with index.html and HTTP 200.
 * A 200 response is NOT proof an asset exists. If a generated alias is missing,
 * use the unchanged, committed .gz source; do not block city loading on Replit
 * having restarted a build process. Never mistake HTML for road data.
 */
export async function unpackGeographicBytes(raw: ArrayBuffer, url: string): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(raw);
  if (!bytes.length) throw Error(`Empty Bangkok map asset: ${url}`);
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return raw;
  try {
    return await new Response(
      new Blob([raw]).stream().pipeThrough(new DecompressionStream("gzip")),
    ).arrayBuffer();
  } catch (error) {
    throw Error(`Invalid gzip-compressed Bangkok map asset: ${url}`, { cause: error });
  }
}

type GeographicPayload<T> = {
  value: T;
  sourceUrl: string;
  fetchHeadersMs: number;
  decodeAndBodyMs: number;
  compressedBytes: number;
  decodedBytes: number;
};
const candidates = (url: string) =>
  url.endsWith(".pack") ? [url, url.slice(0, -5) + ".gz"] : [url];

function isHtml(bytes: ArrayBuffer) {
  const head = new TextDecoder().decode(new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 96))).trimStart();
  return /^<(?:!doctype\s+html|html|head|body|script|div|title)(?:\s|>)/i.test(head);
}

/** Each candidate must be a real binary/json payload, not an HTTP 200 SPA fallback.
 * Validation errors also trigger the source fallback; a stale .pack cannot
 * force the game to fail while the original gzip source is healthy.
 */
export async function fetchGeographicPayload<T>(
  url: string,
  parse: (decoded: ArrayBuffer) => T,
  signal?: AbortSignal,
): Promise<GeographicPayload<T>> {
  const failures: string[] = [];
  const started = performance.now();
  for (const candidate of candidates(url)) {
    try {
      const response = await fetch(candidate, { signal });
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const headersAt = performance.now();
      if (/text\/html/i.test(response.headers.get("content-type") ?? ""))
        throw Error("HTML page returned instead of map asset (SPA fallback)");
      const raw = await response.arrayBuffer();
      if (isHtml(raw)) throw Error("HTML page returned instead of map asset (SPA fallback)");
      const decoded = await unpackGeographicBytes(raw, candidate);
      if (isHtml(decoded)) throw Error("HTML page returned instead of map asset (SPA fallback)");
      const decodedAt = performance.now();
      const value = parse(decoded);
      return {
        value,
        sourceUrl: candidate,
        fetchHeadersMs: headersAt - started,
        decodeAndBodyMs: decodedAt - headersAt,
        compressedBytes: Number(response.headers.get("content-length") ?? raw.byteLength),
        decodedBytes: decoded.byteLength,
      };
    } catch (error) {
      if (signal?.aborted) throw error;
      failures.push(`${candidate}: ${String(error)}`);
    }
  }
  throw Error(`Bangkok geography could not load; generated alias and original source both failed. ${failures.join(" | ")}`);
}

export async function fetchGeographicBytes(url: string, signal?: AbortSignal) {
  return (await fetchGeographicPayload(url, (bytes) => bytes, signal)).value;
}

export async function fetchGeographicJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return (await fetchGeographicPayload(url, (bytes) => JSON.parse(new TextDecoder().decode(bytes)) as T, signal)).value;
}
