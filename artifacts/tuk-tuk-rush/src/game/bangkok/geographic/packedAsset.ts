/** Safely load already-gzipped geographic assets across Safari, Vite and CDNs.
 *
 * Browser-facing files end with .pack, not .gz. This prevents static servers
 * from treating the *file extension* as the HTTP Content-Encoding. A proxy can
 * still transparently decode a response: detect the actual magic bytes, never
 * blindly gunzip or assume Content-Encoding reflects JavaScript-visible bytes.
 */
export async function unpackGeographicBytes(raw: ArrayBuffer, url: string): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(raw);
  if (!bytes.length) throw Error(`Empty Bangkok map asset: ${url}`);
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return raw;
  try {
    return await new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
    ).arrayBuffer();
  } catch (error) {
    throw Error(`Invalid gzip-compressed Bangkok map asset: ${url}`, { cause: error });
  }
}

export async function fetchGeographicBytes(url: string, signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(url, { signal });
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const raw = await response.arrayBuffer();
    return await unpackGeographicBytes(raw, url);
  } catch (error) {
    if (signal?.aborted) throw error;
    throw Error(`Could not load Bangkok geography ${url}. Check its deployment and HTTP gzip headers. ${String(error)}`, {
      cause: error,
    });
  }
}

export async function fetchGeographicJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const bytes = await fetchGeographicBytes(url, signal);
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch (error) {
    throw Error(`Invalid Bangkok map JSON from ${url}`, { cause: error });
  }
}
