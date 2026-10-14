import { spawn } from "node:child_process";
/** Observe actual HTTP readiness; CI may omit Vite's terminal URL banner. */
export async function startQaServer(port) {
  const server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      env: { ...process.env, PORT: String(port), BASE_PATH: "/" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let log = "",
    exit;
  server.stdout.on("data", (b) => (log += b));
  server.stderr.on("data", (b) => (log += b));
  server.on("exit", (c) => (exit = c));
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (exit !== undefined) throw Error(`Vite exited ${exit}: ${log}`);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/`, {
        signal: AbortSignal.timeout(1000),
      });
      if (r.ok) return server;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  server.kill();
  throw Error(`Vite did not serve HTTP within 30 seconds: ${log}`);
}
