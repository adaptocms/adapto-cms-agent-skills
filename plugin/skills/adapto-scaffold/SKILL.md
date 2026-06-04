---
name: adapto-scaffold
namespace: adapto
description: Create a new Adapto-ready frontend by wrapping `npx create-adapto-app` — choose a framework (Next/Astro/SvelteKit), scaffold the project (the Adapto read-client is included), and wire up `.env`. Consent-gated — shows the exact command and runs it only after you approve. New projects only.
version: 0.1.0
requires:
  cli: ">=0.0.7"         # used by later skills; scaffold itself runs `npx create-adapto-app` (see Preconditions)
  auth: false
  project_context: false
mutates: false            # no CMS writes; creating the project is a host change, consent-gated (CLAUDE.md §3.12)
---

# adapto:scaffold

The **new-project** flow. It wraps `npx create-adapto-app` to stand up a fresh framework app already wired
for Adapto. The read-client **ships with `create-adapto-app`**, so this skill doesn't add, vendor, or
maintain any client of its own.

## When to use
- Starting a brand-new site/app on Adapto: "create a new adapto project", "scaffold an adapto site",
  "new adapto app with Next/Astro/SvelteKit".
- Routed here by `adapto:install` when the target is a new project.

## When not to use
- Adding Adapto to an **existing** repo — out of scope in this variation (`create-adapto-app` is for new projects).
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
5. **Do not** add or replace the read-client — `create-adapto-app` already included it.

### API key handling
`create-adapto-app` already creates the project's `.env` — there's no separate env template to copy. To
set the key: scaffold **without** `--api-key`, then **write/append** `ADAPTO_API_KEY=<value>` into that
`.env` (the user supplies the value; the agent writes it to the file but **never** echoes or logs it). If
`.env` is somehow missing, create it with `ADAPTO_API_URL` + `ADAPTO_API_KEY`. Avoid passing
`--api-key <value>` on the command line — it leaks the secret into shell history — unless the user asks.

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
- Never replace the read-client that `create-adapto-app` provides.
- Never write CMS content (`mutates: false`).
