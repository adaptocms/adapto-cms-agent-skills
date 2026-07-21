#!/usr/bin/env tsx
/**
 * validate-skills — lints every skills/<skill>/SKILL.md against the required format spec.
 *
 *   npm run validate            # human report
 *   npm run validate:json       # machine-readable
 *   tsx scripts/validate-skills.ts [--json]
 *
 * Exit 0 if all skills are valid, 1 if any has errors. Warnings never fail the run.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = join(ROOT, "plugin", "skills");
const AGENTS_DIR = join(ROOT, "plugin", "agents");
const JSON_OUT = process.argv.includes("--json");

// Required body sections for every skill.
const REQUIRED_SECTIONS = [
  "When to use",
  "When not to use",
  "Inputs",
  "Outputs",
  "Preconditions",
  "Errors and recovery",
  "Forbidden actions",
];
// Required only when mutates: true; should be absent otherwise.
const MUTATING_SECTIONS = ["Plan phase", "Apply phase"];

const NAME_RE = /^adapto-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const RANGE_RE = /^(>=|<=|>|<|\^|~|=)?\s*\d+\.\d+\.\d+/;

type Level = "error" | "warn";
interface Issue {
  level: Level;
  msg: string;
}
interface Result {
  skill: string;
  path: string;
  issues: Issue[];
}

function splitFrontmatter(src: string): { fm: string | null; body: string } {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: null, body: src };
  return { fm: m[1], body: m[2] };
}

function headingSet(body: string): Set<string> {
  const set = new Set<string>();
  for (const line of body.split("\n")) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) set.add(m[1].toLowerCase());
  }
  return set;
}
const hasSection = (hs: Set<string>, name: string): boolean =>
  [...hs].some((h) => h === name.toLowerCase() || h.startsWith(name.toLowerCase()));

function validate(dir: string): Result {
  const path = join(SKILLS_DIR, dir, "SKILL.md");
  const issues: Issue[] = [];
  const err = (msg: string) => issues.push({ level: "error", msg });
  const warn = (msg: string) => issues.push({ level: "warn", msg });

  if (!existsSync(path)) {
    err("missing SKILL.md");
    return { skill: dir, path, issues };
  }
  const src = readFileSync(path, "utf8");
  const { fm, body } = splitFrontmatter(src);

  if (fm === null) {
    err("no YAML frontmatter (file must start with `---` ... `---`)");
    return { skill: dir, path, issues };
  }

  let data: Record<string, unknown>;
  try {
    const parsed = yaml.load(fm);
    if (typeof parsed !== "object" || parsed === null) {
      err("frontmatter is not a YAML mapping");
      return { skill: dir, path, issues };
    }
    data = parsed as Record<string, unknown>;
  } catch (e) {
    err(`frontmatter YAML parse error: ${(e as Error).message}`);
    return { skill: dir, path, issues };
  }

  // name
  if (!data.name) {
    err("frontmatter: `name` is required");
  } else if (typeof data.name !== "string" || !NAME_RE.test(data.name)) {
    err(`name "${String(data.name)}" must match adapto-<kebab-case>`);
  } else if (data.name !== dir) {
    err(`name "${data.name}" must equal the directory name "${dir}"`);
  }

  // namespace
  if (data.namespace !== "adapto") err('namespace must be "adapto"');

  // description
  if (typeof data.description !== "string" || !data.description.trim()) {
    err("description is required (non-empty)");
  } else if (data.description.length > 400) {
    warn("description is long (>400 chars); aim for 1-2 sentences");
  }

  // version
  if (!data.version) err("version is required");
  else if (!SEMVER_RE.test(String(data.version))) err(`version "${String(data.version)}" must be semver x.y.z`);

  // requires
  const req = data.requires as Record<string, unknown> | undefined;
  if (typeof req !== "object" || req === null) {
    err("requires { cli, auth, project_context } is required");
  } else {
    if (typeof req.cli !== "string" || !RANGE_RE.test(req.cli.trim())) {
      err(`requires.cli "${String(req.cli)}" must be a version range (e.g. ">=0.0.7")`);
    }
    if (typeof req.auth !== "boolean") err("requires.auth must be a boolean");
    if (typeof req.project_context !== "boolean") err("requires.project_context must be a boolean");
  }

  // mutates
  if (typeof data.mutates !== "boolean") err("mutates must be a boolean");

  // body sections
  const hs = headingSet(body);
  for (const s of REQUIRED_SECTIONS) if (!hasSection(hs, s)) err(`missing section "## ${s}"`);
  if (data.mutates === true) {
    for (const s of MUTATING_SECTIONS) if (!hasSection(hs, s)) err(`mutates: true requires "## ${s}"`);
  } else if (data.mutates === false) {
    for (const s of MUTATING_SECTIONS) {
      if (hasSection(hs, s)) warn(`"## ${s}" present but mutates: false (Plan/Apply are for mutating skills)`);
    }
  }

  return { skill: dir, path, issues };
}

// Agent files (plugin/agents/*.md) carry a lighter frontmatter contract: name, description, tools, model.
function validateAgent(file: string): Result {
  const path = join(AGENTS_DIR, file);
  const name = file.replace(/\.md$/, "");
  const issues: Issue[] = [];
  const err = (msg: string) => issues.push({ level: "error", msg });

  const src = readFileSync(path, "utf8");
  const { fm } = splitFrontmatter(src);
  if (fm === null) {
    err("no YAML frontmatter (file must start with `---` ... `---`)");
    return { skill: name, path, issues };
  }
  let data: Record<string, unknown>;
  try {
    const parsed = yaml.load(fm);
    if (typeof parsed !== "object" || parsed === null) {
      err("frontmatter is not a YAML mapping");
      return { skill: name, path, issues };
    }
    data = parsed as Record<string, unknown>;
  } catch (e) {
    err(`frontmatter YAML parse error: ${(e as Error).message}`);
    return { skill: name, path, issues };
  }

  if (typeof data.name !== "string" || !NAME_RE.test(data.name)) {
    err(`name "${String(data.name)}" must match adapto-<kebab-case>`);
  } else if (data.name !== name) {
    err(`name "${data.name}" must equal the file name "${name}"`);
  }
  if (typeof data.description !== "string" || !data.description.trim()) err("description is required (non-empty)");
  if (typeof data.tools !== "string" && !Array.isArray(data.tools)) err("tools is required (string or list)");
  if (typeof data.model !== "string" || !data.model.trim()) err("model is required (non-empty)");

  return { skill: name, path, issues };
}

// --- discover & run ---
if (!existsSync(SKILLS_DIR)) {
  console.error("no skills/ directory found");
  process.exit(1);
}
const dirs = readdirSync(SKILLS_DIR)
  .filter((d) => {
    try {
      return statSync(join(SKILLS_DIR, d)).isDirectory();
    } catch {
      return false;
    }
  })
  .sort();

const results = dirs.map(validate);
const skillErrors = results.reduce((n, r) => n + r.issues.filter((i) => i.level === "error").length, 0);
const warnCount = results.reduce((n, r) => n + r.issues.filter((i) => i.level === "warn").length, 0);
const okSkills = results.filter((r) => !r.issues.some((i) => i.level === "error")).length;

// Agents are validated only if plugin/agents/ exists (tolerant before they're authored).
const agentFiles = existsSync(AGENTS_DIR)
  ? readdirSync(AGENTS_DIR)
      .filter((f) => f.endsWith(".md"))
      .sort()
  : [];
const agentResults = agentFiles.map(validateAgent);
const agentErrors = agentResults.reduce((n, r) => n + r.issues.filter((i) => i.level === "error").length, 0);
const okAgents = agentResults.filter((r) => !r.issues.some((i) => i.level === "error")).length;

const errorCount = skillErrors + agentErrors;

function printGroup(rs: Result[]): void {
  for (const r of rs) {
    const hasErr = r.issues.some((i) => i.level === "error");
    if (r.issues.length === 0) {
      console.log(`  ✓ ${r.skill}`);
      continue;
    }
    console.log(`  ${hasErr ? "✗" : "⚠"} ${r.skill}`);
    for (const i of r.issues) console.log(`      ${i.level === "error" ? "✗" : "⚠"} ${i.msg}`);
  }
}

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        ok: errorCount === 0,
        skills: results,
        agents: agentResults,
        totals: {
          skills: results.length,
          ok: okSkills,
          agents: agentResults.length,
          agentsOk: okAgents,
          errors: errorCount,
          warnings: warnCount,
        },
      },
      null,
      2,
    ),
  );
} else {
  console.log(`\nvalidate-skills — ${results.length} skill(s) in skills/\n`);
  printGroup(results);
  if (agentResults.length) {
    console.log(`\n  agents/ —`);
    printGroup(agentResults);
  }
  const agentSummary = agentResults.length ? ` · agents: ${okAgents}/${agentResults.length} ok` : "";
  console.log(`\n  ${okSkills}/${results.length} ok${agentSummary} · ${errorCount} error(s) · ${warnCount} warning(s)\n`);
}

process.exit(errorCount === 0 ? 0 : 1);
