// Tiny test helpers shared by every *.test.mjs file.
export const { api } = await import("../../src/lib/api/index.ts");

let failed = 0;
let passed = 0;
export function ok(cond, name) {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}`);
  }
}
export async function expectErr(promise, code, name) {
  try {
    await promise;
    ok(false, `${name} (expected ${code}, got success)`);
  } catch (e) {
    ok(e?.code === code, `${name} -> ${e?.code ?? e}`);
  }
}
/** Log in as a demo account (password demo1234). */
export const as = (phone) => api.login({ phone, password: "demo1234" });
export const logout = () => api.logout();
export const inDays = (d) => new Date(Date.now() + d * 864e5).toISOString();
export function done() {
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}
