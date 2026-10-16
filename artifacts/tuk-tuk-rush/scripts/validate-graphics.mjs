import fs from "node:fs/promises";
import { spawn } from "node:child_process";
const pkg = JSON.parse(await fs.readFile("package.json", "utf8")),
  out = process.env.QA_OUT || "../../docs/graphics/living-bangkok/validation";
await fs.mkdir(out, { recursive: true });
const results = [];
for (const name of [
  "test:corrections",
  "test:graphics-foundation",
  "test:gameplay",
  "test:bangkok",
  "test:interface",
  "test:landmark-quality",
  "test:open-bangkok",
  "test:definitive",
  "test:cityscapes",
  "test:environment",
  "test:street-life",
  "test:roadside",
  "test:signature",
  "test:sign-layers",
  "test:assets",
  "test:startup",
]) {
  const start = Date.now(),
    child = spawn("bash", ["-c", pkg.scripts[name]], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  let log = "";
  child.stdout.on("data", (b) => (log += b));
  child.stderr.on("data", (b) => (log += b));
  const code = await new Promise((r) => child.on("exit", r));
  await fs.writeFile(`${out}/${name.slice(5)}.log`, log);
  results.push({ name, code, ms: Date.now() - start });
  console.log(name, code, Date.now() - start);
  await fs.writeFile(`${out}/suite.json`, JSON.stringify(results, null, 2));
}
if (results.some((r) => r.code !== 0)) process.exitCode = 1;
