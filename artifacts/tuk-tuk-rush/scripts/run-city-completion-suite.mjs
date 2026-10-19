import fs from "node:fs/promises";
import { spawn } from "node:child_process";
const pkg = JSON.parse(
  await fs.readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const selection = process.env.CITY_TEST_NAMES?.split(",");
const tasks = Object.entries(pkg.scripts).filter(
  ([n]) => n.startsWith("test:") && (!selection || selection.includes(n)),
);
const directory = process.env.CITY_SUITE_OUTPUT ? new URL(process.env.CITY_SUITE_OUTPUT,"file:///") : new URL(
  "../../../docs/qa/city-completion/validation/",
  import.meta.url,
);
await fs.mkdir(directory, { recursive: true });
const queue = [...tasks],
  results = [];
async function worker() {
  while (queue.length) {
    const [name, cmd] = queue.shift(),
      start = Date.now();
    const result = await new Promise((resolve) => {
      const p = spawn("bash", ["-c", cmd], {
        env: {
          ...process.env,
          PORT: "4173",
          BASE_PATH: "/",
          STARTUP_BROWSER: "0",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let log = "";
      p.stdout.on("data", (b) => (log += b));
      p.stderr.on("data", (b) => (log += b));
      p.on("exit", (code) => resolve({ code, log }));
    });
    const file = name.replace(":", "-") + ".log";
    await fs.writeFile(new URL(file, directory), result.log);
    const r = {
      name,
      pass: result.code === 0,
      exitCode: result.code,
      ms: Date.now() - start,
      log: file,
    };
    results.push(r);
    console.log(JSON.stringify(r));
  }
}
await Promise.all([worker(), worker()]);
results.sort((a, b) => a.name.localeCompare(b.name));
await fs.writeFile(
  new URL("summary.json", directory),
  JSON.stringify(
    {
      pass: results.every((r) => r.pass),
      passed: results.filter((r) => r.pass).length,
      total: results.length,
      browserQa: false,
      physicalIPhone: false,
      results,
    },
    null,
    2,
  ) + "\n",
);
if (results.some((r) => !r.pass)) process.exitCode = 1;
