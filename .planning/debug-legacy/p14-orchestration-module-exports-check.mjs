// Phase 14-2 follow-up smoke test — module-export completeness check.
//
// For every runtime module that exposes `window.TT_BEAMER_RUNTIME_X =
// { ... }`, compare the export list to what orchestration destructures
// from `window.TT_BEAMER_RUNTIME_X`. Flags exports that are mentioned
// in orchestration as bare references (e.g. inside arrow wrappers)
// but NOT destructured — those throw ReferenceError at first call.
//
// Also flags modules whose export object is referenced in orchestration
// but never `.init()`'d (since the module won't have its ctx bag set).

import { readFileSync, readdirSync } from "node:fs";

const repoRoot = new URL("../", import.meta.url);
const runtimeDir = new URL("src/app/runtime/", repoRoot).pathname;
const orchestration = readFileSync(
  new URL("src/app/runtime/runtime-orchestration.js", repoRoot),
  "utf8",
);

// Walk runtime/ and collect all module files except orchestration.
function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}${entry.name}`;
    if (entry.isDirectory()) walk(`${p}/`, acc);
    else if (entry.name.endsWith(".js") && entry.name !== "runtime-orchestration.js") {
      acc.push(p);
    }
  }
  return acc;
}

const moduleFiles = walk(runtimeDir);
const modules = []; // [{ name, exports: Set }]

for (const file of moduleFiles) {
  const src = readFileSync(file, "utf8");
  // Match every `window.TT_BEAMER_X = { ... };`
  const re = /window\.(TT_BEAMER_[A-Z_]+)\s*=\s*\{([\s\S]*?)\};/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    const body = m[2];
    const exports = new Set();
    // Parse entries: `foo,` or `foo: alias,` or `foo,\n`
    for (const line of body.split("\n")) {
      const t = line.trim().replace(/,$/, "");
      if (!t || t.startsWith("//")) continue;
      const em = t.match(/^([A-Za-z_$][\w$]*)(?:\s*:\s*.*)?$/);
      if (em) exports.add(em[1]);
    }
    exports.delete("init"); // init is an implementation detail
    modules.push({ name, file: file.replace(repoRoot.pathname, ""), exports });
  }
}

// For each module, find exports that are referenced in orchestration
// but NOT destructured from `window.MODNAME`. Pattern matches both
// sides: orchestration.includes(export) outside a `= window.MODNAME`
// destructure block.
// Build a global set of every identifier destructured anywhere in
// orchestration — from any `const { ... } = X` form. Used to suppress
// false positives when an export is already provided via another
// source (e.g. `getLiveTraceSnapshot` comes from LIVE_SYNC_STATE
// even though LIVE_SYNC_DEBUG also re-exports it as a ctx passthrough).
const allDestructured = new Set();
{
  const globalRe = /const\s*\{([^{}]*?)\}\s*=/g;
  let gm;
  while ((gm = globalRe.exec(orchestration))) {
    for (const line of gm[1].split("\n")) {
      const t = line.trim().replace(/,$/, "");
      if (!t || t.startsWith("//")) continue;
      const em = t.match(/^([A-Za-z_$][\w$]*)(?:\s*:\s*([A-Za-z_$][\w$]*))?(?:\s*=.*)?$/);
      if (em) allDestructured.add(em[2] ?? em[1]);
    }
  }
}

const issues = [];

for (const mod of modules) {
  // Find destructure block for this module, if any.
  // Use `[^{}]*?` so the brace body can't cross another destructure
  // block. `[\s\S]*?` would backtrack across the whole file looking
  // for any `}` followed by `= window.MOD` and produce false positives.
  const destructureRe = new RegExp(
    `const\\s*\\{([^{}]*?)\\}\\s*=\\s*window\\.${mod.name}\\b`,
    "g",
  );
  const destructured = new Set();
  let dm;
  while ((dm = destructureRe.exec(orchestration))) {
    for (const line of dm[1].split("\n")) {
      const t = line.trim().replace(/,$/, "");
      if (!t || t.startsWith("//")) continue;
      const em = t.match(/^([A-Za-z_$][\w$]*)(?:\s*:\s*([A-Za-z_$][\w$]*))?$/);
      if (em) destructured.add(em[2] ?? em[1]);
    }
  }
  // Does orchestration call this module's init?
  const hasInit = orchestration.includes(`window.${mod.name}.init(`);
  const moduleReferencedByOrch = orchestration.includes(mod.name);

  // For each exported name, check: does orchestration reference it
  // as a bare identifier and the destructure doesn't carry it?
  //
  // Skip: method-style invocation `window.MOD.exp(...)` — those don't
  // need destructuring. Also skip exports whose only reference in
  // orchestration is inside the module's own `.init({...})` block
  // (those are orchestration-side arrow wrappers passing local helpers
  // back into the module, not consumers of the module's exports).
  const missing = [];
  for (const exp of mod.exports) {
    if (destructured.has(exp)) continue;
    if (allDestructured.has(exp)) continue; // provided by another module
    const methodStyleRe = new RegExp(`window\\.${mod.name}\\.${exp}\\b`);
    if (methodStyleRe.test(orchestration)) continue;
    // bare identifier reference outside this module's window assignment?
    const bareRe = new RegExp(`\\b${exp}\\b`);
    if (bareRe.test(orchestration)) {
      missing.push(exp);
    }
  }

  if (missing.length > 0) {
    issues.push({
      kind: "missing-destructure",
      module: mod.name,
      file: mod.file,
      missing,
    });
  }
  if (moduleReferencedByOrch && !hasInit && mod.exports.size > 0) {
    // Some modules (POLYGON_NORMALIZERS, POLYGON_CONTRACT, DOM_REFS) export
    // helpers that don't require init. Only flag if the module file
    // defines a local `let ctx = null` pattern (init-required convention).
    const src = readFileSync(new URL(mod.file, repoRoot), "utf8");
    const looksInitRequired = /let\s+ctx\s*=\s*null\s*;/.test(src);
    if (looksInitRequired) {
      issues.push({ kind: "no-init-call", module: mod.name, file: mod.file });
    }
  }
}

if (issues.length === 0) {
  console.log(`PASS - all ${modules.length} runtime modules have complete destructures`);
} else {
  console.log(`FAIL - ${issues.length} module wiring issue(s):`);
  for (const issue of issues) {
    if (issue.kind === "missing-destructure") {
      console.log(
        `  [missing-destructure] ${issue.module}: ${issue.missing.join(", ")}`,
      );
      console.log(`    module file: ${issue.file}`);
    } else {
      console.log(`  [no-init-call] ${issue.module} — init() never called`);
      console.log(`    module file: ${issue.file}`);
    }
  }
  process.exit(1);
}
