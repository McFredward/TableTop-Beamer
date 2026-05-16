// Phase 14-2 follow-up smoke test.
//
// The existing p*.mjs harnesses are regex over source and cannot catch
// runtime reference errors at module load. This script does a static
// top-down scan of runtime-orchestration.js looking for identifiers
// used as object-shorthand arguments inside `.init({ ... })` calls
// whose lexical binding is NOT declared earlier in the same file.
//
// It catches two failure modes:
//   (a) TDZ — const/let declared LATER in file, used as direct shorthand
//   (b) Undefined — never declared at all in orchestration scope
//
// Arrow-wrapped shorthand (`name: (x) => name(x)`) is safe because the
// closure defers binding lookup, so those are excluded.

import { readFileSync } from "node:fs";

const src = readFileSync(
  new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url),
  "utf8",
);
const lines = src.split("\n");

// Pass 1: collect every identifier declared in orchestration with
// its declaration line. Sources:
//   - const/let/var NAME = ...
//   - function NAME(...)
//   - destructure:  NAME,   or   ALIAS: NAME,   (inside const { ... } = ...)
//
// We walk line-by-line and track depth of `{ }` inside `const { ... } =`
// destructure blocks so we can tag the lines those names appear on.

const declaredAt = new Map();

function markDeclaration(name, lineIdx) {
  if (!declaredAt.has(name)) declaredAt.set(name, lineIdx);
}

let inDestructure = false;
let destructureBraceDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (!inDestructure) {
    // function NAME(
    const fnMatch = line.match(/^\s*function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (fnMatch) markDeclaration(fnMatch[1], i);

    // const/let/var NAME =    (scalar binding, not a destructure)
    const letMatch = line.match(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?:=|;)/);
    if (letMatch) markDeclaration(letMatch[1], i);

    // const { ... destructure block opens ?
    const destructureStart = line.match(/^\s*(?:const|let|var)\s*\{/);
    if (destructureStart) {
      inDestructure = true;
      destructureBraceDepth =
        (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      // also scan the current line for any inline destructure names
      scanDestructureLine(line, i);
      if (destructureBraceDepth === 0) inDestructure = false;
      continue;
    }
    continue;
  }

  // inside destructure block
  scanDestructureLine(line, i);
  destructureBraceDepth +=
    (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
  if (destructureBraceDepth <= 0) {
    inDestructure = false;
    destructureBraceDepth = 0;
  }
}

function scanDestructureLine(line, lineIdx) {
  // Strip the opening/closing braces + leading keyword for this scan.
  // Possible forms per entry:
  //   NAME,
  //   NAME
  //   ALIAS: NAME,
  //   ALIAS: NAME,
  //   NAME = defaultValue,
  //   NAME: RENAMED = defaultValue,
  // We want the BINDING NAME on the right of `:` (if present), else the
  // bare identifier.
  //
  // Skip commented-out lines.
  const trimmed = line.trim();
  if (trimmed.startsWith("//")) return;

  // Split on commas at top level is hard; we'll use a regex that
  // matches `ident`, `ident:ident`, or `ident=...`
  const entryRe = /([A-Za-z_$][\w$]*)\s*(?::\s*([A-Za-z_$][\w$]*))?/g;
  let m;
  while ((m = entryRe.exec(line))) {
    const alias = m[1];
    const renamed = m[2];
    const name = renamed ?? alias;
    // Filter out JS keywords that could match
    if (/^(const|let|var|function|return|if|else|true|false|null|undefined|window|this)$/.test(name)) continue;
    markDeclaration(name, lineIdx);
  }
}

// Pass 2: find every `xxx.init({` block and the block range.
// Inside each block, enumerate shorthand-arg lines of the form
//   `  NAME,` or `  NAME`  (must not contain `:` which would be a key).
// Arrow-wrapped shorthand `NAME: (x) => NAME(x)` is fine because the
// BINDING LOOKUP is deferred. Detect those and skip.

const violations = [];

let i = 0;
while (i < lines.length) {
  const line = lines[i];
  const initMatch = line.match(/\.init\s*\(\s*\{\s*$/);
  if (!initMatch) {
    i++;
    continue;
  }
  // Find the matching closing `});`
  let depth = 1;
  let j = i + 1;
  while (j < lines.length && depth > 0) {
    const l = lines[j];
    depth += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
    j++;
  }
  const initEnd = j;

  for (let k = i + 1; k < initEnd; k++) {
    const l = lines[k];
    const trimmed = l.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;

    // Skip any line that contains `:` (explicit key:value, arrow-wrapped, etc.)
    if (l.includes(":")) continue;
    // Skip lines with `=>` just in case
    if (l.includes("=>")) continue;
    // Match bare shorthand  `  NAME,`  at end
    const mm = l.match(/^\s+([A-Za-z_$][\w$]*)\s*,?\s*$/);
    if (!mm) continue;
    const name = mm[1];
    // Ignore the tokens that are clearly block boundaries
    if (/^(init|ctx)$/.test(name)) continue;

    const declLine = declaredAt.get(name);
    if (declLine === undefined) {
      violations.push({ kind: "undefined", name, usedAt: k + 1 });
    } else if (declLine > k) {
      violations.push({ kind: "tdz", name, usedAt: k + 1, declaredAt: declLine + 1 });
    }
  }

  i = initEnd;
}

// Pass 3: scan arrow-wrapper bodies of the form
//    `name: (args) => IDENT(args)`
// and check that IDENT is declared somewhere in orchestration.
// These are the late-binding ctx wrappers — they don't fail at init
// time but throw ReferenceError the first time they're actually called.
for (let k = 0; k < lines.length; k++) {
  const l = lines[k];
  // match `IDENT: (any args) => IDENT2(` — capture IDENT2
  const m = l.match(/^\s+[A-Za-z_$][\w$]*\s*:\s*\([^)]*\)\s*=>\s*([A-Za-z_$][\w$]*)\s*\(/);
  if (!m) continue;
  const ident = m[1];
  if (/^(new|return|await|typeof|void|delete|this|true|false|null|undefined|Object|Array|Math|JSON|String|Number|Boolean|Date|Promise|Set|Map|window|document|console)$/.test(ident)) continue;
  if (!declaredAt.has(ident)) {
    violations.push({ kind: "arrow-undefined", name: ident, usedAt: k + 1 });
  }
}

if (violations.length === 0) {
  console.log("PASS - all init-arg shorthand names declared before use");
} else {
  console.log(`FAIL - ${violations.length} init-arg binding issue(s):`);
  for (const v of violations) {
    if (v.kind === "undefined") {
      console.log(`  [undefined] ${v.name} @ line ${v.usedAt}`);
    } else if (v.kind === "arrow-undefined") {
      console.log(`  [arrow-undefined] ${v.name} @ line ${v.usedAt} (call-time ReferenceError)`);
    } else {
      console.log(`  [TDZ] ${v.name} @ line ${v.usedAt} — declared later at line ${v.declaredAt}`);
    }
  }
  process.exit(1);
}
