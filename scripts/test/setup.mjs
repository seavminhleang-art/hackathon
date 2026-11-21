// Lets plain Node run the TypeScript mock API without a build step:
// - resolves the "@/..." alias and extensionless imports to .ts files
// - fakes window.localStorage so sessions and the mock DB work
// Needs Node 22.18+ (built-in TypeScript type stripping + module.registerHooks).
import { registerHooks } from "node:module";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SRC = fileURLToPath(new URL("../../src/", import.meta.url));
const isFile = (p) => existsSync(p) && !statSync(p).isDirectory();
const find = (base) => [base + ".ts", base + ".tsx", path.join(base, "index.ts"), base].find(isFile);

registerHooks({
  resolve(specifier, context, nextResolve) {
    let base = null;
    if (specifier.startsWith("@/")) base = path.join(SRC, specifier.slice(2));
    else if (/^\.\.?\//.test(specifier) && context.parentURL?.startsWith("file:"))
      base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    const file = base && find(base);
    return nextResolve(file ? pathToFileURL(file).href : specifier, context);
  },
});

const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
};
