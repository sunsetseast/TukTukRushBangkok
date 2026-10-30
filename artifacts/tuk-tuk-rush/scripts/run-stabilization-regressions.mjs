import fs from "node:fs";
import { spawnSync } from "node:child_process";
const root = new URL("../../../", import.meta.url);
const out = new URL("docs/qa/geographic-stabilization/regressions/", root);
fs.mkdirSync(out, { recursive: true });
const commands = [];
for (const workflow of ["tuktuk-checks.yml", "real-geography.yml"]) {
  const text = fs.readFileSync(new URL(`.github/workflows/${workflow}`, root), "utf8");
  for (const match of text.matchAll(/^\s+- run: (pnpm --filter @workspace\/tuk-tuk-rush .+)$/gm)) {
    const command = match[1].replace(" run ", " ");
    if (!commands.includes(command)) commands.push(command);
  }
  for (const match of text.matchAll(/^\s+- run: (node scripts\/browser-geographic-streaming\.mjs)$/gm)) {
    const command = `pnpm --filter @workspace/tuk-tuk-rush exec ${match[1]}`;
    if (!commands.includes(command)) commands.push(command);
  }
}
const compiledCheck = "pnpm --filter @workspace/tuk-tuk-rush exec node --import tsx scripts/check-geographic-compiled.ts";
if (!commands.includes(compiledCheck)) commands.push(compiledCheck);
commands.push(...["check_data", "check_stations", "check_buildings"].map(s => `python scripts/geography/${s}.py`));
const only = process.argv.find(a => a.startsWith("--only="))?.slice(7);
const retry = process.argv.includes("--retry-failed") || Boolean(only);
const results = retry ? JSON.parse(fs.readFileSync(new URL("results.json", out), "utf8")) : [];
const selected = only ? commands.filter(c => c.includes(only)) : retry ? results.filter(r => r.exitCode !== 0).map(r => r.command) : commands;
for (let i = 0; i < selected.length; i++) {
  const command = selected[i], started = Date.now(), number = commands.indexOf(command) + 1;
  console.log(`[${number}/${commands.length}] ${command}`);
  const result = spawnSync("bash", ["-c", command], {
    cwd: root, env: { PORT: "24177", BASE_PATH: "/", ...process.env }, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, timeout: 1_200_000,
  });
  const log = `${result.stdout ?? ""}\n${result.stderr ?? ""}${result.error ? `\n${result.error.stack}` : ""}`;
  const file = `${String(number).padStart(2, "0")}${retry ? "-retry" : ""}.log`;
  fs.writeFileSync(new URL(file, out), log);
  const receipt = { command, exitCode: result.status, signal: result.signal, elapsedMs: Date.now() - started, log: file };
  if (retry) {
    const index = results.findIndex(r => r.command === command), old = results[index];
    if (index < 0) results.push(receipt);
    else results[index] = { ...receipt, previousAttempts: [...(old.previousAttempts ?? []), { exitCode: old.exitCode, log: old.log, elapsedMs: old.elapsedMs }] };
  } else results.push(receipt);
  fs.writeFileSync(new URL("results.json", out), JSON.stringify(results, null, 2) + "\n");
  console.log(`  ${result.status === 0 ? "PASS" : "FAIL"} ${Date.now() - started}ms`);
}
console.log(`${results.filter(r => r.exitCode === 0).length}/${results.length} passed`);
process.exitCode = results.every(r => r.exitCode === 0) ? 0 : 1;
