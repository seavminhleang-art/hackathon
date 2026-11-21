// Runs every *.test.mjs in its own process (fresh mock DB each time).
// Usage: npm run test:mock            (all)
//        npm run test:mock emergency  (files whose name contains "emergency")
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const only = process.argv[2];
const files = readdirSync(dir).filter((f) => f.endsWith(".test.mjs") && (!only || f.includes(only))).sort();
let failed = 0;
for (const f of files) {
  console.log(`\n▶ ${f}`);
  const r = spawnSync(process.execPath, ["--no-warnings", "--import", `${dir}setup.mjs`, `${dir}${f}`], { stdio: "inherit" });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n✗ ${failed} file(s) failed` : `\n✓ all ${files.length} files passed`);
process.exit(failed ? 1 : 0);
