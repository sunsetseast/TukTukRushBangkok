import { spawnSync } from "node:child_process";
import fs from "node:fs";
const checks = [
  ["geographic source topology", "check-real-geography.ts"],
  ["geographic streaming", "check-geographic-streaming.ts"],
  ["production gameplay", "check-gameplay.ts"],
  ["driven mission", "check-driven-mission.ts"],
  ["career and legacy saves", "check-career.ts"],
  ["Chinatown geography", "check-chinatown.ts"],
  ["Bang Rak", "check-bang-rak.ts"],
  ["service route preference", "check-service-route-preference.ts"],
  ["Bang Rak seam", "check-bang-rak-seam.ts"],
  [
    "Bang Rak driven routes",
    "check-chinatown-drives.ts",
    { BANG_RAK_ROUTES: "1", CHINATOWN_LANES: "1" },
  ],
  [
    "Chinatown driven lanes",
    "check-chinatown-drives.ts",
    { CHINATOWN_LANES: "1" },
  ],
  ["sign visibility", "check-sign-visibility.ts"],
  ["Chinatown visual assertions", "check-chinatown-visual.ts"],
  ["Chinatown completion", "check-chinatown-completion.ts"],
  ["Chinatown legal traffic", "check-chinatown-legal-traffic.mjs"],
  [
    "Chinatown traffic",
    "check-chinatown-drives.ts",
    { CHINATOWN_TRAFFIC: "1" },
  ],
  ["waterfront clearance", "check-waterfront-clearance.ts"],
  ["waterfront drives", "check-waterfront-drives.ts"],
  ["waterfront lanes", "check-waterfront-drives.ts", { WATERFRONT_LANES: "1" }],
  ["Bangkok gameplay", "check-bangkok.ts"],
  ["Bangkok driven routes", "check-bangkok-driven.ts"],
  ["Bangkok map", "check-bangkok-map.tsx"],
  ["Bangkok architecture", "check-bangkok-architecture.ts"],
  ["historic fidelity", "check-historic-fidelity.ts"],
];
const out = new URL(
  process.env.GEOGRAPHIC_REGRESSION_REPORT ??
    "../../../docs/qa/geographic-gameplay/regressions.json",
  import.meta.url,
);
fs.mkdirSync(new URL("./", out), { recursive: true });
const previous =
  process.env.GEOGRAPHIC_REGRESSION_RESUME === "1" && fs.existsSync(out)
    ? JSON.parse(fs.readFileSync(out, "utf8"))
    : undefined;
const result = previous?.checks?.filter((c) => c.pass) ?? [];
const checkpoint = () =>
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        complete: result.length === checks.length,
        pass: result.length === checks.length && result.every((c) => c.pass),
        ...(previous?.note ? { note: previous.note } : {}),
        checks: result,
      },
      null,
      2,
    ) + "\n",
  );
let failed = false;
for (const [name, file, env] of checks) {
  if (result.some((c) => c.name === name && c.pass)) {
    console.log(`RESUME ${name}`);
    continue;
  }
  const started = performance.now();
  const r = spawnSync(
    process.execPath,
    [...(file.endsWith(".mjs") ? [] : ["--import", "tsx"]), `scripts/${file}`],
    {
      encoding: "utf8",
      env: { ...process.env, ...env },
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const pass = r.status === 0;
  result.push({
    name,
    pass,
    seconds: (performance.now() - started) / 1000,
    ...(!pass ? { output: (r.stdout + r.stderr).slice(-7000) } : {}),
  });
  checkpoint();
  console.log(
    `${pass ? "PASS" : "FAIL"} ${name} ${result.at(-1).seconds.toFixed(1)}s`,
  );
  if (!pass) {
    console.log(result.at(-1).output);
    failed = true;
  }
}
checkpoint();
if (failed) process.exitCode = 1;
