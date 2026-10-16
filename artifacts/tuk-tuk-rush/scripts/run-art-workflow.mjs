import { spawn } from "node:child_process";
import { startQaServer } from "./browser-vite.mjs";
const server = await startQaServer(24177);
try {
  for (const [script, url] of [
    ["capture-signature.mjs", "http://127.0.0.1:24177/?world=chinatown"],
    ["capture-bangkok.mjs", "http://127.0.0.1:24177/"],
  ]) {
    console.log("BEGIN", script);
    const child = spawn(process.execPath, [`scripts/${script}`], {
      stdio: "inherit",
      env: { ...process.env, GAME_URL: url },
    });
    const code = await new Promise((r) => child.on("exit", r));
    if (code !== 0) throw Error(`${script} exited ${code}`);
    console.log("PASS", script);
  }
} finally {
  server.kill();
}
