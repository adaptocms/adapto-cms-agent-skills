#!/usr/bin/env node
/**
 * Structural smoke checks for the Adapto skill pack — static only (no auth, no network).
 * Run via `npm test` (which runs `validate` + `typecheck` first, then this).
 * Checks: plugin/marketplace manifests, plugin↔marketplace name match, every skill has a SKILL.md,
 * and `node --check` syntax on every bundled .mjs. Exit 0 if all pass, 1 otherwise.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const ok = (name, detail = "") => results.push({ name, pass: true, detail });
const fail = (name, detail = "") => results.push({ name, pass: false, detail });
const readJSON = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

// 1. plugin.json — valid, kebab name, has license
let pluginName = null;
try {
  const p = readJSON("plugin/.claude-plugin/plugin.json");
  pluginName = p.name;
  if (!p.name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.name)) fail("plugin.json name", `invalid: ${p.name}`);
  else ok("plugin.json", `name=${p.name} v${p.version || "?"}`);
  if (!p.license) fail("plugin.json license", "missing (set after the license decision)");
} catch (e) {
  fail("plugin.json", e.message);
}

// 2. marketplace.json — valid, has name + non-empty plugins[]
let mpPluginNames = [];
try {
  const m = readJSON(".claude-plugin/marketplace.json");
  if (!m.name) fail("marketplace.json name", "missing");
  if (!Array.isArray(m.plugins) || m.plugins.length === 0) {
    fail("marketplace.json plugins", "missing or empty");
  } else {
    mpPluginNames = m.plugins.map((x) => x.name);
    ok("marketplace.json", `name=${m.name}, plugins=[${mpPluginNames.join(", ")}]`);
  }
} catch (e) {
  fail("marketplace.json", e.message);
}

// 3. plugin name must appear in the marketplace's plugins (else the entry won't resolve)
if (pluginName) {
  if (mpPluginNames.includes(pluginName)) ok("plugin↔marketplace name match", pluginName);
  else fail("plugin↔marketplace name match", `"${pluginName}" not in [${mpPluginNames.join(", ")}]`);
}

// 4. every skills/<dir> has a SKILL.md
const skillsDir = join(ROOT, "plugin", "skills");
if (existsSync(skillsDir)) {
  for (const d of readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory())) {
    existsSync(join(skillsDir, d, "SKILL.md"))
      ? ok(`skill ${d}`, "SKILL.md present")
      : fail(`skill ${d}`, "missing SKILL.md");
  }
} else {
  fail("skills/", "directory not found");
}

// 4b. agents — every known agent file present (only enforced once plugin/agents/ exists)
const agentsDir = join(ROOT, "plugin", "agents");
const KNOWN_AGENTS = ["adapto-researcher", "adapto-writer", "adapto-editor"];
if (existsSync(agentsDir)) {
  for (const a of KNOWN_AGENTS) {
    existsSync(join(agentsDir, `${a}.md`))
      ? ok(`agent ${a}`, "present")
      : fail(`agent ${a}`, `missing plugin/agents/${a}.md`);
  }
}

// 4c. shared contract docs present (added as each is authored)
const sharedDir = join(ROOT, "plugin", "shared");
for (const doc of ["studio.md", "content-pipeline.md", "seo-standards.md"]) {
  existsSync(join(sharedDir, doc))
    ? ok(`shared ${doc}`, "present")
    : fail(`shared ${doc}`, `missing plugin/shared/${doc}`);
}

// 5. node --check on every bundled .mjs (syntax)
function walkMjs(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && e.name !== ".git") out.push(...walkMjs(join(dir, e.name)));
    } else if (e.name.endsWith(".mjs")) {
      out.push(join(dir, e.name));
    }
  }
  return out;
}
for (const f of walkMjs(ROOT)) {
  const rel = relative(ROOT, f);
  try {
    execFileSync(process.execPath, ["--check", f], { stdio: "ignore" });
    ok(`syntax ${rel}`);
  } catch {
    fail(`syntax ${rel}`, "node --check failed");
  }
}

// report
const failed = results.filter((r) => !r.pass);
console.log("\nsmoke — structural checks\n");
for (const r of results) console.log(`  ${r.pass ? "✓" : "✗"} ${r.name}${r.detail ? ": " + r.detail : ""}`);
console.log(`\n  ${results.length - failed.length}/${results.length} passed\n`);
process.exit(failed.length ? 1 : 0);
