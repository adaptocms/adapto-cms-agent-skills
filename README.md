# Adapto CMS Agent Skills

Let your AI coding agent operate [Adapto CMS](https://adaptocms.com) for you — checking your setup,
managing the CLI, and (as the pack grows) scaffolding sites, designing schemas, and seeding and
translating content — all through the official `adapto` CLI, safely and with your approval.

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

- ✅ **Check your environment** — *adapto:doctor* tells you, in one pass, whether the Adapto CLI, your
  login, your selected tenant, and (in a project) your framework, `.env`, and `.gitignore` are ready.
- ✅ **Install or upgrade the Adapto CLI** — *adapto:install* does it for you, and only ever runs the
  install command **after you approve it**.
- ✅ **Start a new Adapto site** — *adapto:scaffold* creates a Next/Astro/SvelteKit project (Adapto
  read-client included) via `create-adapto-app`, after you approve the command.
- ✅ **Capture your brand & voice** — *adapto:project-define* records your project's type, audience, voice,
  and tone in Adapto (a short, **optional** Q&A) so generated content stays on-brand. Asks before writing.
- ✅ **Design your content schema** — *adapto:schema-design* proposes the custom collections and Article
  categories your project needs (and which built-in types cover the rest), saved to a reviewable plan file —
  no CMS changes. *adapto:schema-apply* then creates them in Adapto, after you approve the plan.
- ✅ **Seed starter content** — *adapto:content-seed* fills a fresh site with on-brand draft Articles, Pages,
  and collection rows from your schema, so it isn't empty. Plan-then-apply; everything lands as draft.
- ✅ **Translate your content** — *adapto:translate* translates Articles, Pages, collection items, Categories,
  and Microcopy into another enabled language, with a structural check that blocks broken translations.
  Glossary-aware; plan-then-apply; runs at the top model tier.

Only the skills listed under [Available skills](#available-skills) are ready right now; more are in
active development and will appear here as they ship.

## Requirements

- An **Adapto CMS** account and a **public API key** — from the backoffice under *Settings → API Keys*.
- **Claude Code** (Cursor isn't supported yet).
- The **Adapto CLI** (`adapto`) `>= 0.0.7` — the skills can check and install it for you, or install it manually:
  ```bash
  curl -sSL https://raw.githubusercontent.com/adaptocms/adapto-cms-cli/main/scripts/install.sh | bash
  ```
- **Node.js 18+**.

## Install (Claude Code)

This pack ships as a **Claude Code plugin**. In Claude Code, add the marketplace and install:

```
/plugin marketplace add adaptocms/adapto-cms-agent-skills
/plugin install adapto@adaptocms
```

Then just ask your agent in plain language — e.g. *"check my Adapto setup"*, *"install the Adapto CLI"*,
or *"scaffold a new Adapto site"*. The skills ask before running anything consequential.

> Requires the repository to be public on GitHub. Cursor isn't supported yet — Claude Code only for now.

**Eval without installing:** the environment check also runs as a plain script from a clone of this repo:

```bash
node plugin/skills/adapto-doctor/scripts/doctor.mjs   # add --json for machine-readable output
```

## Available skills

- **[`adapto:doctor`](plugin/skills/adapto-doctor/SKILL.md)** — a read-only health check of your Adapto
  environment. Reports `✓ / ⚠ / ✗` per item with the exact command to fix each one. Changes nothing.
- **[`adapto:install`](plugin/skills/adapto-install/SKILL.md)** — gets you set up: ensures the `adapto` CLI is
  installed and current (asking before it runs anything), then points you at the right next step.
- **[`adapto:scaffold`](plugin/skills/adapto-scaffold/SKILL.md)** — starts a **new** project: scaffolds a
  Next/Astro/SvelteKit app wired for Adapto (via `create-adapto-app`), asking before it runs.
- **[`adapto:project-define`](plugin/skills/adapto-project-define/SKILL.md)** — a short, **optional** Q&A that
  stores your project's brand/voice/audience in Adapto so other skills write on-brand. Plan-then-apply.
- **[`adapto:schema-design`](plugin/skills/adapto-schema-design/SKILL.md)** — proposes your content schema
  (custom collections + Article categories) from your project context and writes a reviewable plan file.
  Makes no CMS changes.
- **[`adapto:schema-apply`](plugin/skills/adapto-schema-apply/SKILL.md)** — creates the proposed collections
  and categories in Adapto from that plan file, after you approve it. Idempotent; plan-then-apply.
- **[`adapto:content-seed`](plugin/skills/adapto-content-seed/SKILL.md)** — populates your collections,
  Articles, and Pages with on-brand starter drafts (Articles are provenance-tagged). Plan-then-apply; draft-first.
- **[`adapto:translate`](plugin/skills/adapto-translate/SKILL.md)** — translates existing content into another
  enabled language via create-translation, validating paragraph/tag/media (and microcopy placeholder) parity
  before writing. Glossary-aware; plan-then-apply.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — project context, decisions, verified API facts, roadmap.
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
  skills/            the skills (one folder each: SKILL.md + optional scripts/)
  shared/            reference docs the skills link to
scripts/ · tests/    dev tooling (validate-skills.ts, smoke.mjs)
```

## License

[MIT](LICENSE) © Adapto CMS.
