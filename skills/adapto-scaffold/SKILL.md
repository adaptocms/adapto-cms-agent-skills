---
name: adapto-scaffold
namespace: adapto
description: Create a new Adapto-ready frontend by wrapping `npx create-adapto-app` — choose a framework (Next/Astro/SvelteKit), scaffold the project (the Adapto read-client is included), and wire up `.env`. Consent-gated — shows the exact command and runs it only after you approve. To add Adapto to an EXISTING repo, use adapto:retrofit instead.
version: 0.1.0
requires:
  cli: ">=0.0.7"         # used by later skills; scaffold itself runs `npx create-adapto-app` (see Preconditions)
  auth: false
  project_context: false
mutates: false            # no CMS writes; creating the project is a host change, consent-gated (CLAUDE.md §3.12)
---

# adapto:scaffold

The **new-project** flow. It wraps `npx create-adapto-app` to stand up a fresh framework app already wired
for Adapto. The read-client **ships with `create-adapto-app`**, so this skill does **not** vendor
`templates/adapto-client/` — that's `adapto:retrofit`'s job for existing repos.

## When to use
- Starting a brand-new site/app on Adapto: "create a new adapto project", "scaffold an adapto site",
  "new adapto app with Next/Astro/SvelteKit".
- Routed here by `adapto:install` when the target is a new project.

## When not to use
- Adding Adapto to an **existing** repo → `adapto:retrofit` (vendors the read-client; doesn't re-scaffold).
- Just checking whether the environment is ready → `adapto:doctor`.

## Inputs
- Project name / target directory.
- Framework: `next` | `astro` | `sveltekit`.
- Package manager (optional): `npm` | `pnpm` | `yarn` | `bun`.
- API key (optional) — **prefer not passing it on the command line** (see Forbidden actions); set it in
  `.env` after scaffolding instead.

## Outputs
- A new project directory scaffolded for the chosen framework, including Adapto's read-client and a `.env`
  (`ADAPTO_API_URL` + `ADAPTO_API_KEY` to fill in).
- A clear next step: set the API key in `.env`, then `npm run dev`. (Verify readiness with `adapto:doctor`.)

## Preconditions
- **Node.js 20+** and network access — `create-adapto-app` runs via `npx` and installs dependencies.
- Does **not** require the `adapto` CLI or auth at scaffold time; those are used by later skills
  (`adapto:project-define`, content skills, …). The read-client comes from `create-adapto-app`, not from
  this repo's templates.

## Flow (consent-gated — CLAUDE.md §3.12)
1. **Gather** project name and framework (ask if not provided); package manager is optional.
2. **Inform + show the exact command + get consent** before running anything, e.g.:
   > "I'll create a new `<framework>` project in `./<name>` by running:
   > `npx create-adapto-app <name> --framework <fw> [--pm <pm>]`
   > This downloads `create-adapto-app`, scaffolds the project, and installs dependencies (network access +
   > a new folder on disk). Run it?"
3. **On consent:** run it, then confirm the folder exists. **If declined:** stop and print the command so
   the user can run it themselves.
4. **After it completes:** tell the user to set `ADAPTO_API_KEY` in the generated `.env` (they paste the
   value into the file — see below), then `cd <name>` and `npm run dev`.
5. **Do not** vendor or overwrite anything from `templates/adapto-client/` — `create-adapto-app` already
   included the read-client.

### API key handling
Prefer scaffolding **without** `--api-key`, then setting `ADAPTO_API_KEY` directly in the project's `.env`
(the user supplies the value; never echo or log it). Passing `--api-key <value>` would put the secret into
the shell command and history — avoid it unless the user explicitly asks.

## Errors and recovery
- **Node < 20** → tell the user to upgrade Node; `create-adapto-app` requires 20+.
- **Target directory exists / not empty** → `create-adapto-app` errors; offer `--force` only with explicit
  consent, or choose a new name.
- **No network / `npx` fails** → surface the error and suggest checking connectivity.
- **Unsupported framework** → only `next` | `astro` | `sveltekit` are supported.

## Forbidden actions
- Never run `npx create-adapto-app` (or any project-creating/installing command) without explicit consent
  (CLAUDE.md §3.12 / [forbidden-actions.md](../../shared/forbidden-actions.md)).
- Never pass the API key on the command line if avoidable; never print or log the key **value** — set it in
  `.env` by reference.
- Never vendor or overwrite the read-client from `templates/adapto-client/` in a scaffolded project
  (that's `adapto:retrofit`-only).
- Never write CMS content (`mutates: false`).
