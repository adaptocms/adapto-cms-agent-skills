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
node skills/adapto-doctor/scripts/doctor.mjs        # add --json for machine-readable output
```

## Available skills

- **[`adapto:doctor`](skills/adapto-doctor/SKILL.md)** — a read-only health check of your Adapto
  environment. Reports `✓ / ⚠ / ✗` per item with the exact command to fix each one. Changes nothing.
- **[`adapto:install`](skills/adapto-install/SKILL.md)** — gets you set up: ensures the `adapto` CLI is
  installed and current (asking before it runs anything), then points you at the right next step.
- **[`adapto:scaffold`](skills/adapto-scaffold/SKILL.md)** — starts a **new** project: scaffolds a
  Next/Astro/SvelteKit app wired for Adapto (via `create-adapto-app`), asking before it runs.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — project context, decisions, verified API facts, roadmap.
- **[shared/cli-cheatsheet.md](shared/cli-cheatsheet.md)** — the verified `adapto` CLI command reference.
- **[shared/api-references.md](shared/api-references.md)** — Adapto docs, OpenAPI specs, and starters.
- **[shared/conventions.md](shared/conventions.md)** · **[forbidden-actions.md](shared/forbidden-actions.md)** — how the skills behave and what they never do.
- **[shared/](shared/)** — also: sub-agent tiers and reserved `_adapto_*` collections.

---

## Working on the skill pack (contributors)

```bash
npm install            # dev dependencies (tsx, typescript, js-yaml)
npm run validate       # lint every skill against the SKILL.md format spec (npm run validate:json for JSON)
npm run typecheck      # type-check the TypeScript tooling
```

- New or changed skills must pass `npm run validate` before commit — it enforces the `SKILL.md` format
  ([CLAUDE.md §6](CLAUDE.md)).
- Follow [shared/conventions.md](shared/conventions.md) and [shared/forbidden-actions.md](shared/forbidden-actions.md).
- On every major task, update this README to match what's now usable (CLAUDE.md §14).

**Repository layout**

```
CLAUDE.md            project context, decisions, roadmap
.claude-plugin/      Claude Code plugin + marketplace manifests
skills/              the skills (one folder each: SKILL.md + optional scripts/)
shared/              cross-skill reference docs
scripts/             tooling (validate-skills.ts)
```

## License

[MIT](LICENSE) © Adapto CMS.
