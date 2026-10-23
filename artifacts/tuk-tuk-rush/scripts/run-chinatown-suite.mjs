import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { spawn } from "node:child_process";
const out = new URL(
  "../../../docs/qa/chinatown-reconstruction/validation/suite/",
  import.meta.url,
);
await fs.mkdir(out, { recursive: true });
const pkg = JSON.parse(
  await fs.readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const selected = process.env.TEST_ONLY?.split(",");
const queue = Object.keys(pkg.scripts).filter(
  (k) => k.startsWith("test:") && (!selected || selected.includes(k)),
);
let previous = [];
if (selected) {
  try {
    previous = JSON.parse(
      await fs.readFile(new URL("summary.json", out), "utf8"),
    ).results.filter((r) => !selected.includes(r.key));
  } catch {}
}
const results = [];
async function worker() {
  for (;;) {
    const key = queue.shift();
    if (!key) return;
    const begin = Date.now(),
      file = key.replaceAll(":", "-") + ".log",
      stream = createWriteStream(new URL(file, out));
    const code = await new Promise((resolve) => {
      const child = spawn("bash", ["-c", pkg.scripts[key]], {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          PORT: "24671",
          BASE_PATH: "/",
          PATH:
            new URL("../node_modules/.bin/", import.meta.url).pathname +
            ":" +
            process.env.PATH,
        },
      });
      child.stdout.pipe(stream, { end: false });
      child.stderr.pipe(stream, { end: false });
      child.on("error", (e) => {
        stream.write(e.stack);
        resolve(127);
      });
      child.on("exit", (c) => resolve(c ?? 128));
    });
    stream.end();
    results.push({
      key,
      command: pkg.scripts[key],
      exitCode: code,
      wallMs: Date.now() - begin,
      log: file,
    });
    await fs.writeFile(
      new URL("summary.json", out),
      JSON.stringify(
        { complete: false, results: [...previous, ...results] },
        null,
        2,
      ),
    );
    console.log(
      key,
      code === 0 ? "PASS" : "FAIL",
      Math.round((Date.now() - begin) / 1000) + "s",
    );
  }
}
await Promise.all(
  Array.from({ length: Number(process.env.TEST_WORKERS ?? 3) }, () => worker()),
);
const combined = [...previous, ...results];
const final = {
  complete:
    combined.length ===
    Object.keys(pkg.scripts).filter((k) => k.startsWith("test:")).length,
  pass: combined.every((r) => r.exitCode === 0),
  results: combined,
};
await fs.writeFile(
  new URL("summary.json", out),
  JSON.stringify(final, null, 2),
);
console.log(
  JSON.stringify({
    passed: results.filter((r) => r.exitCode === 0).length,
    failed: results.filter((r) => r.exitCode !== 0).map((r) => r.key),
  }),
);
if (!final.pass) process.exitCode = 1;
