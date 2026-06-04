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
- Project name / target directory — **ask**; if the user has no preference, default to `my-project` (or a short random name).
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
**Preflight first (CLAUDE.md §3.14):** run the `adapto:doctor` checks to learn the toolchain state. Scaffolding
the files needs only **Node 20+**, so proceed even if auth/tenant aren't set yet (the API-key step is gated on
auth — step 4). If Node < 20, stop. If the `adapto` CLI is missing/old, flag it (it's needed after scaffolding)
and offer `adapto:install` — don't silently skip it.

1. **Gather** the project name (ask; default to `my-project` if the user has no preference) and framework; package manager is optional.
2. **Inform + show the exact command + get consent** before running anything, e.g.:
   > "I'll create a new `<framework>` project in `./<name>` by running:
   > `npx create-adapto-app <name> --framework <fw> [--pm <pm>]`
   > This downloads `create-adapto-app`, scaffolds the project, and installs dependencies (network access +
   > a new folder on disk). Run it?"
3. **On consent:** run it, then confirm the folder exists. **If declined:** stop and print the command so
   the user can run it themselves.
4. **After it completes:** confirm what was created. The site needs an **API key** to pull content, and that
   step needs auth — so **gate on auth first**: probe with `adapto auth me --json 2>&1 || true` (append
   `|| true` so the expected "not logged in" exit doesn't surface as a red `Error: Exit code 1` — it's a
   normal branch, not a failure; branch on the output).
   - **Not authenticated →** the *only* next step is **register or log in** (hand off to `adapto:install` §B —
     present the **register link + the login command**). **Do not show the API-key step yet** — its URL needs
     the tenant id you won't have until login. Re-probe after the user logs in.
   - **Authenticated →** establish the **working tenant** before the API-key step (next).
5. **Confirm the working tenant — don't assume the saved/active one (CLAUDE.md §3.5):** list with
   `adapto auth orgs --json`. **2+ tenants →** ask **"Which Adapto project do you want to work in?"** (confirm
   on every flow), then `adapto auth switch-tenant --tenant-id <id>`. **Exactly one →** state it and proceed.
6. **API-key step (only once the working tenant is set):** build the **real** URL from the **chosen** tenant id,
   have the user generate + provide the key (see below), then `cd <name> && npm run dev`. Offer follow-ons
   (`adapto:doctor` to verify, `adapto:project-define` to capture brand/voice). Never end in silence.
7. **Do not** add or replace the read-client — `create-adapto-app` already included it.

### API key handling (only after authentication)
`create-adapto-app` already creates the project's `.env` — no env template needed. **Use the working tenant
id the user just confirmed** (step 5 — never assume the saved/active one), then give the user their project's
**real** API-keys URL — never show a literal `<tenant_id>` placeholder:

`https://app.adaptocms.com/projects/project-<the-resolved-tenant-id>/developer-tools/api-keys`

Tell them to **generate an API key for this project and copy it**, then either **paste it into the chat** —
the agent **writes/appends** it to `.env` on the `ADAPTO_API_KEY=` line, **never echoing the value** — or add
it to `.env` themselves. Don't pass `--api-key <value>` on the command line (it leaks into shell history),
and never print the key value. If `.env` is missing, create it with `ADAPTO_API_URL` + `ADAPTO_API_KEY` —
set `ADAPTO_API_URL=https://public-api.adaptocms.com` (the **bare host, no `/v1`**). The read-client
concatenates `baseUrl + endpoint` and its endpoint paths already carry `/v1/...`, so the host must omit it;
adding `/v1` here yields `/v1/v1/...`.

## Errors and recovery
- **Node < 20** → tell the user to upgrade Node; `create-adapto-app` requires 20+.
- **Target directory exists / not empty** → `create-adapto-app` errors; offer `--force` only with explicit
  consent, or choose a new name.
- **No network / `npx` fails** → surface the error and suggest checking connectivity.
- **Unsupported framework** → only `next` | `astro` | `sveltekit` are supported.
- **Dev server starts but every content fetch 404s** → known **upstream `create-adapto-app` bug**: the
  bundled read-client (`src/lib/adapto-sdk.ts`) shipped stale `/public/...` endpoint paths, but the live API
  serves `/v1/...` only (CLAUDE.md §10). **Flag it for an upstream fix** (SDK paths `/public/` → `/v1/`, keep
  the bare-host `.env`, republish `create-adapto-app`) — **do not patch the bundled client yourself** (§3.11 /
  Forbidden actions: never modify or replace the read-client). It's an upstream bug, not a per-project edit;
  confirm the `.env` URL is the bare host (`https://public-api.adaptocms.com`, no `/v1`) before blaming it.

## Forbidden actions
- Never run `npx create-adapto-app` (or any project-creating/installing command) without explicit consent
  (CLAUDE.md §3.12 / [forbidden-actions.md](../../shared/forbidden-actions.md)).
- Never pass the API key on the command line if avoidable; never print or log the key **value** — set it in
  `.env` by reference.
- Never **replace or modify** the read-client that `create-adapto-app` provides — including editing its
  endpoint paths to work around the `/public/`→`/v1/` 404 bug. That's an upstream fix; flag it (§3.11).
- Never write CMS content (`mutates: false`).
