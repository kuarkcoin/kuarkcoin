import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

const roots = ["app", "components", "hooks", "lib", "tests", "scripts"];
const exts = new Set([".ts", ".tsx", ".js", ".jsx"]);
const errors = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(name)) continue;
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path);
    else if ([...exts].some((ext) => path.endsWith(ext))) check(path);
  }
}
function check(path) {
  const text = readFileSync(path, "utf8");
  if (/try\s*{\s*(?:await\s+)?import\s*\(/.test(text)) errors.push(`${path}: dynamic import in try block`);
  if (/catch\s*\([^)]*\)\s*{\s*}/.test(text)) errors.push(`${path}: empty catch block`);
}
for (const root of roots) walk(root);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("lint validation ok");
