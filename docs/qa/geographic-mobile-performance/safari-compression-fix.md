# iPhone Safari — “TypeError: Failed to Decode Data” fix (draft)

## Observed on device
The geographic preview on a user's iPhone displayed `TypeError: Failed to Decode Data.` before loading the game. The historical runtime requested `.gz` files directly and decided whether to apply `DecompressionStream("gzip")` based entirely on the HTTP `Content-Encoding` header.

Vite/Sirv can attach `Content-Encoding: gzip` based on the **.gz file extension**, and browsers/proxies can transparently decompress those bytes. Safari and intermediary host configurations may produce different JavaScript-visible data, including a failed decode. The screenshot alone does not identify which specific asset was failing, so do not claim a confirmed per-file network root cause until tested on the actual Replit/iPhone host.

## Change
1. The pinned `.gz` gameplay metadata, navigation and one-way rule binaries remain completely unchanged.
2. On `pnpm install`/prepare, `pnpm dev` and `pnpm build`, a script validates and copies those source bytes into generated `.pack` files. Identical bytes; different extension; no map reconstruction.
3. Generated compiled building chunks now use `.bin.pack` filenames, not `.bin.gz`. They are still gzip-compressed, encoded with precisely the same codec and source hashes; all source validation continues unchanged. The build compiler writes these filenames directly; no double 471-chunk copies are created.
4. Client loaders detect the **actual gzip magic bytes** `1f 8b` in the JavaScript response body and decompress **exactly once**. If the browser/proxy already returned decoded data, decoding is skipped. HTTP failures include the failing asset path or chunk ID to distinguish missing assets, invalid content and network issues.
5. Legacy default Bangkok, 222,123 building footprints, traffic directions, geometry buffers and player physics are unchanged.

## Tests
- `pnpm --filter @workspace/tuk-tuk-rush test:geographic-asset-delivery`: identical pinned/source bytes; raw gzip → decoded; already-decoded response remains unchanged; corrupt/empty gzip errors are informative.
- `pnpm --filter @workspace/tuk-tuk-rush test:geographic-streaming`: executes the asset tests plus all existing stream/abort/retention checks.
- `pnpm --filter @workspace/tuk-tuk-rush build`: generates all `.pack` and `compiled/*.bin.pack` outputs.
- `browser-geographic-gzip-webkit.mjs`: fetches gameplay, navigation, rules and a compiled source chunk through the actual Vite server under Playwright's desktop **WebKit** and checks the binary signatures.
- Existing Chromium real-scale browser QA and gameplay certification still run.

## Replit/iPhone follow-up
Replit needs to sync to the fixing PR's branch (or merged `main` when explicitly approved) and restart the development server so that `.pack` assets are generated. Reload `?world=geographic&geoPerf=1` in iPhone Safari, inspect the streaming counter, and drive across chunk boundaries. Clearing a stale service-worker cache may be needed if the previous app version is cached; no player saves need to be wiped. WebKit desktop QA is not physical iOS Safari coverage.

Do not merge until CI passes; mobile Safari proof should be recorded separately. This fix is for asset delivery, not a claim of 30 FPS.
