# Adapto CMS Agent Skills

Let your AI coding agent operate [Adapto CMS](https://adaptocms.com) for you — checking your setup,
managing the CLI, scaffolding sites, designing schemas, and seeding, translating, and publishing content —
all through the official `adapto` CLI, safely and with your approval.

It's growing into a **content studio**: your agent builds a deep understanding of your project, then
researches, plans, writes, and publishes on-brand, SEO/AEO/GEO-aware content — every draft reviewed by you
locally before anything reaches Adapto. The studio pieces land skill by skill (below shows what's ready now).

`@adaptocms/agent-skills` · **Status: early access (work in progress)**

> This README describes **what works today**. It's growing into the full install-and-use guide for
> everyone — until then it stays honest about what's ready and what isn't. Design & roadmap live in
> [CLAUDE.md](CLAUDE.md).

---

## Who it's for

Developers using **Claude Code** to build content-backed sites on Adapto CMS. You direct your agent in
plain language; these skills give it the know-how to drive Adapto correctly, and they never make
consequential changes without asking you first. (Cursor support is a planned fast-follow.)

## What you can do today

**Set up**
- ✅ **Check your environment** — *adapto:doctor* reports in one pass whether the CLI, login, tenant,
  framework, `.env`/`.gitignore`, and your `.adapto/` studio workspace are ready. Read-only.
- ✅ **Install or upgrade the Adapto CLI** — *adapto:install*, only after you approve the command.
- ✅ **Start a new Adapto site** — *adapto:scaffold* creates a Next/Astro/SvelteKit project (read-client
  included) and sets up the `.adapto/` **studio workspace**, after you approve.

**Understand the project (the "brain")**
- ✅ **Build the project brain** — *adapto:project-define* runs a short, optional interview *and* researches
  your site, competitors, and initial keywords into a rich local knowledge base (plus a summary in Adapto),
  so everything downstream is on-brand and on-scope.
- ✅ **Keep the brain sharp** — *adapto:project-learn* folds what the agent learns while working back into the
  brain (you review the diff). Local only.

**Model the content**
- ✅ **Design your content schema** — *adapto:schema-design* proposes collections + Article categories (and the
  reserved `_adapto_seo` metadata collection) to a reviewable plan; *adapto:schema-apply* creates them, after
  you approve.

**Create content (research → plan → write → upload)**
- ✅ **Research** — *adapto:content-research* digs through the web, competitors, your URLs, and your own data
  (it proactively asks for Search Console / keyword exports) into a dated research dossier. No CMS writes.
- ✅ **Plan** — *adapto:content-plan* proposes the top directions for the cycle, you pick and refine, and it
  writes per-piece briefs + an editorial ledger. No CMS writes.
- ✅ **Write** — *adapto:content-create* turns each brief into a complete, on-brand Markdown draft with
  SEO/AEO/GEO metadata, JSON-LD, and internal links — for you to review as files. Drafts are held to a
  vendored prose standard (no AI-tell writing), enforced by an editor gate. No CMS writes.
- ✅ **Upload** — *adapto:content-upload* pushes the drafts you approve to Adapto (create-or-update, as drafts),
  mirrors their metadata into `_adapto_seo`, and won't clobber backoffice edits. Plan-then-apply.
- ✅ **Quick starter content** — *adapto:content-seed* is the express lane: a condensed research→write→upload
  with sensible defaults, for a few starter drafts fast.

**Render, translate, publish**
- ✅ **Make SEO render** — *adapto:seo-wire* wires meta/OG/JSON-LD head tags + generates `llms.txt` into your
  app templates (never the read-client), one-time and only after you approve the diff.
- ✅ **Translate** — *adapto:translate* localizes content *and* its SEO metadata into another enabled language,
  with a structural check that blocks broken translations. Top model tier; glossary-aware.
- ✅ **Publish (and unpublish)** — *adapto:publish* takes reviewed drafts live (or archives them back), after
  you approve exactly what goes out.
- ✅ **Manage UI text** — *adapto:microcopy* seeds or extracts UI strings. Plan-then-apply.

Every content draft is yours to review **before** anything reaches Adapto, and every CMS write is
plan-then-apply + draft-first.

## Requirements

- An **Adapto CMS** account and a **public API key** — from the backoffice under *Settings → API Keys*.
- **Claude Code** (Cursor isn't supported yet).
- The **Adapto CLI** (`adapto`) `>= 0.0.7` — the skills can check and install it for you, or install it manually:
  ```bash
  curl -sSL https://raw.githubusercontent.com/adaptocms/adapto-cms-cli/main/scripts/install.sh | bash
  ```
- **Node.js 20+** — required to scaffold a site (`create-adapto-app`). The read-only environment check
  (`adapto:doctor`) runs on Node 18+.

## Install (Claude Code)

This pack ships as a **Claude Code plugin**. In Claude Code, add the marketplace and install:

```
/plugin marketplace add adaptocms/adapto-cms-agent-skills
/plugin install adapto@adaptocms
```

Then just ask your agent in plain language — e.g. *"check my Adapto setup"*, *"install the Adapto CLI"*,
or *"scaffold a new Adapto site"*. The skills ask before running anything consequential.

**Update or remove** (in Claude Code):

```
/plugin update adapto@adaptocms        # update to the latest version
/plugin uninstall adapto@adaptocms     # remove the plugin (aliases: remove, rm)
/plugin marketplace remove adaptocms   # also remove the marketplace (uninstalls its plugins)
```

> Cursor isn't supported yet — Claude Code only for now.

**Eval without installing:** the environment check also runs as a plain script from a clone of this repo:

```bash
node plugin/skills/adapto-doctor/scripts/doctor.mjs   # add --json for machine-readable output
```

## Available skills

**Setup**
- **[`adapto:doctor`](plugin/skills/adapto-doctor/SKILL.md)** — read-only health check (environment + studio). Changes nothing.
- **[`adapto:install`](plugin/skills/adapto-install/SKILL.md)** — ensures the `adapto` CLI is installed/current (asks first).
- **[`adapto:scaffold`](plugin/skills/adapto-scaffold/SKILL.md)** — scaffolds a Next/Astro/SvelteKit app + the `.adapto/` studio workspace (asks first).

**Project brain**
- **[`adapto:project-define`](plugin/skills/adapto-project-define/SKILL.md)** — deep guided discovery (interview + research) that builds the local project brain + a summary in Adapto. Optional; plan-then-apply.
- **[`adapto:project-learn`](plugin/skills/adapto-project-learn/SKILL.md)** — consolidates what the agent learns into the brain (you review the diff). Local only.

**Schema**
- **[`adapto:schema-design`](plugin/skills/adapto-schema-design/SKILL.md)** — proposes the content schema (+ the reserved `_adapto_seo` collection) to a reviewable plan file. No CMS changes.
- **[`adapto:schema-apply`](plugin/skills/adapto-schema-apply/SKILL.md)** — creates the collections/categories (and provisions `_adapto_seo`) from the plan, after you approve. Idempotent.

**Content pipeline**
- **[`adapto:content-research`](plugin/skills/adapto-content-research/SKILL.md)** — web/competitor/keyword research (proactively BYO-data) → a dated dossier. No CMS writes.
- **[`adapto:content-plan`](plugin/skills/adapto-content-plan/SKILL.md)** — top-N directions for the cycle → per-piece briefs + the editorial ledger. No CMS writes.
- **[`adapto:content-create`](plugin/skills/adapto-content-create/SKILL.md)** — writes each brief into an on-brand Markdown draft with SEO/AEO/GEO metadata, for your review. No CMS writes.
- **[`adapto:content-upload`](plugin/skills/adapto-content-upload/SKILL.md)** — pushes approved drafts to Adapto (create-or-update, drafts) + mirrors `_adapto_seo`; drift-guarded; plan-then-apply.
- **[`adapto:content-seed`](plugin/skills/adapto-content-seed/SKILL.md)** — the express lane: a condensed research→write→upload for a few starter drafts fast. Plan-then-apply; draft-first.
- **[`adapto:seo-wire`](plugin/skills/adapto-seo-wire/SKILL.md)** — wires meta/OG/JSON-LD rendering + `llms.txt` into your app templates (never the read-client), consent-gated, one-time.

**Localize & publish**
- **[`adapto:translate`](plugin/skills/adapto-translate/SKILL.md)** — localizes content + its SEO metadata into another enabled language, with a structural-parity gate. Top tier; glossary-aware.
- **[`adapto:publish`](plugin/skills/adapto-publish/SKILL.md)** — takes reviewed drafts live (or archives them back), under plan-then-apply.
- **[`adapto:microcopy`](plugin/skills/adapto-microcopy/SKILL.md)** — `init` seeds / `extract` pulls UI strings. key/value/language; plan-then-apply.

The three research/writing subagents (`adapto-researcher`, `adapto-writer`, `adapto-editor`) ship in
`plugin/agents/` and are dispatched by the skills above.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — project context, decisions, verified API facts, roadmap.
- **[studio.md](plugin/shared/studio.md)** — the `.adapto/` content-studio workspace: the brain + the content ledger.
- **[content-pipeline.md](plugin/shared/content-pipeline.md)** — the research→plan→create→upload contracts (draft frontmatter, briefs).
- **[seo-standards.md](plugin/shared/seo-standards.md)** — the SEO/AEO/GEO standards content is written against.
- **[prose-standards.md](plugin/shared/prose-standards.md)** — the anti-slop prose rules (no AI tells), hard-gated by the editor.
- **[cli-cheatsheet.md](plugin/shared/cli-cheatsheet.md)** — the verified `adapto` CLI command reference.
- **[api-references.md](plugin/shared/api-references.md)** — Adapto docs, OpenAPI specs, and starters.
- **[conventions.md](plugin/shared/conventions.md)** · **[forbidden-actions.md](plugin/shared/forbidden-actions.md)** — how the skills behave and what they never do.
- **[plugin/shared/](plugin/shared/)** — also: sub-agent tiers and reserved `_adapto_*` collections.

---

## Working on the skill pack (contributors)

```bash
npm install            # dev dependencies (tsx, typescript, js-yaml)
npm test               # all static checks: validate + typecheck + structural smoke (what CI runs)
npm run validate       # just the SKILL.md format lint   (validate:json for JSON output)
npm run typecheck      # just the TypeScript tooling check
```

- Run `npm test` before committing. **CI** (`.github/workflows/ci.yml`) runs it on every push and PR.
  `npm run validate` enforces the `SKILL.md` format ([CLAUDE.md §6](CLAUDE.md)); the smoke script also
  checks the plugin manifests and `.mjs` syntax.
- Follow [conventions.md](plugin/shared/conventions.md) and [forbidden-actions.md](plugin/shared/forbidden-actions.md).
- On every major task, update this README to match what's now usable (CLAUDE.md §14).

**Repository layout**

```
CLAUDE.md            project context, decisions, roadmap
.claude-plugin/      marketplace catalog (lists the plugin)
plugin/              the installable plugin
  .claude-plugin/    plugin manifest
  skills/            the 16 skills (one folder each: SKILL.md + optional scripts/)
  agents/            shipped subagents (researcher, writer, editor)
  shared/            reference docs the skills link to
scripts/ · tests/    dev tooling (validate-skills.ts, smoke.mjs)
```

## License

[MIT](LICENSE) © Adapto CMS.
