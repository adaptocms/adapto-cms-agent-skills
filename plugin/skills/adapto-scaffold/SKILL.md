---
name: adapto-scaffold
namespace: adapto
description: Create a new Adapto-ready frontend by wrapping `npx create-adapto-app` — choose a framework (Next/Astro/SvelteKit), scaffold the project (the Adapto read-client is included), and wire up `.env`. Consent-gated — shows the exact command and runs it only after you approve. New projects only.
version: 0.1.0
requires:
  cli: ">=0.1.1"         # used by later skills; scaffold itself runs `npx create-adapto-app` (see Preconditions)
  auth: false
  project_context: false
mutates: false            # no CMS writes; creating the project is a host change, consent-gated
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
- The **`.adapto/` studio workspace** initialized in the project (empty brain dir, empty ledger,
  `.adapto/.gitignore`) — the agent's local source of truth ([studio.md](../../shared/studio.md)).
- A clear next step: set the API key in `.env`, run `npm run dev`, then `adapto:project-define` to build the
  project brain. (Verify readiness with `adapto:doctor`.)

## Preconditions
- **Node.js 20+** and network access — `create-adapto-app` runs via `npx` and installs dependencies.
- Does **not** require the `adapto` CLI or auth at scaffold time; those are used by later skills
  (`adapto:project-define`, content skills, …). The read-client comes from `create-adapto-app`, not from
  this repo's templates.

## Flow (consent-gated)
**Preflight first:** run the `adapto:doctor` checks to learn the toolchain state. Scaffolding
the files needs only **Node 20+**, so proceed even if auth/tenant aren't set yet (the API-key step is gated on
auth — step 4). If Node < 20, stop. If the `adapto` CLI is missing/old, flag it (it's needed after scaffolding)
and offer `adapto:install` — don't silently skip it.

**Pick the project (tenant) first when authed:** if the user is **already logged in** with
**2+ tenants**, present the **tenant picker** and choose the project this app will connect to **before**
scaffolding — so the whole setup is scoped to the chosen project. If not yet authed, scaffold the files first
and establish the tenant at the API-key step (step 5). Either way it's picked **before** the project is wired
to a tenant.

1. **Gather** the project name (ask; default to `my-project` if the user has no preference) and framework; package manager is optional. The name must be a **bare, URL-friendly slug** — `create-adapto-app` rejects `/` and other non-URL-safe characters, so don't pass a path (`cd` into the intended parent dir first if you want it nested).
2. **Inform + show the exact command, then ask as a pickable question** (conventions §10) — show the command
   and side effects, then offer two options: **`Yes, run it`** and **`I'll run it myself`** (plus free-form). E.g.:
   > "I'll create a new `<framework>` project in `./<name>` by running:
   > `npx create-adapto-app <name> --framework <fw> [--pm <pm>]`
   > This downloads `create-adapto-app`, scaffolds the project, and installs dependencies (network access +
   > a new folder on disk)."
   > — then the options `Yes, run it` / `I'll run it myself`.
3. **If "Yes, run it":** run it, then confirm the folder exists. **If "I'll run it myself" (or declined):** stop
   and print the exact command so the user can run it themselves.
   - **Then create the `.adapto/` studio workspace** (the agent's source of truth — [studio.md](../../shared/studio.md)),
     idempotently, inside the new project, **without clobbering anything that already exists**:
     - `.adapto/project/` — the brain directory, **empty except a `.gitkeep`**. Don't pre-create header-only
       stub facets: `adapto:project-define` writes the real files, and a stub it would have to read-then-
       overwrite buys nothing (it also makes doctor's `studio_brain` check report a brain that isn't there).
       The facet set it creates is in [studio.md](../../shared/studio.md) §2.
     - empty `.adapto/research/`, `.adapto/plans/`, `.adapto/drafts/`, `.adapto/sources/` (a `.gitkeep` in each).
     - `.adapto/ledger.json` = `{"version":1,"updated_at":null,"pieces":[]}` and `.adapto/calendar.md`
       (a `# Editorial calendar` header).
     - `.adapto/.gitignore` carving out the machine/secret/derived caches (studio.md §1):
       ```
       /project.md
       /schema.json
       /tenant.json
       /glossary.md
       *.cache
       ```
       The leading `/` anchors each to `.adapto/` itself — these are top-level caches. Without it,
       `glossary.md` would also ignore the committed brain facet `project/glossary.md`.
     The committed parts (`project/`, research/plans/drafts/sources, ledger, calendar) are **team knowledge**;
     the ignored parts are per-machine. `adapto:project-define` fills the brain next.
4. **After it completes:** confirm what was created. The site needs an **API key** to pull content, and that
   step needs auth — so **gate on auth first**: probe with `adapto auth me --json 2>&1 || true` (append
   `|| true` so the expected "not logged in" exit doesn't surface as a red `Error: Exit code 1` — it's a
   normal branch, not a failure; branch on the output).
   - **Not authenticated →** the *only* next step is **register or log in** (hand off to `adapto:install` §B —
     both are **bare commands the user runs in a new terminal window**, since auth needs a TTY the agent
     doesn't have; conventions §10a). **Do not show the API-key step yet** — its URL needs
     the tenant id you won't have until login. Re-probe after the user logs in.
   - **Authenticated →** establish the **working tenant** before the API-key step (next).
5. **Working tenant (picked before scaffolding when authed; otherwise establish it now):** if not
   already chosen this flow, list with `adapto auth orgs --json` and, for **2+ tenants**, present a **specific
   picker** (the tenants as **pickable options**) under **"Which Adapto project do you want to work in?"** —
   never inherit/confirm the active one — then `adapto auth switch-tenant --tenant-id <id>`. **Exactly one →**
   state it and proceed.
6. **API-key step (only once the working tenant is set):** build the **real** URL from the **chosen** tenant id,
   have the user generate + provide the key (see below), then `cd <name> && npm run dev`. Offer follow-ons
   (`adapto:doctor` to verify, `adapto:project-define` to capture brand/voice, `adapto:schema-design` to
   model the content, and `adapto:microcopy` to seed UI strings). Never end in silence.
   - If **you** start the dev server (e.g. in the background to verify it loads), **leave it running** and hand
     the user the URL — **never kill it** to "clean up" (conventions §14). To show new content later, restart it.
7. **Remember the project ↔ tenant binding:** once the working tenant is set (and the key is
   in `.env`), **persist it** — write the chosen tenant's id + name to `.adapto/tenant.json` (gitignored) so
   later flows in this project use it **without re-asking** (and don't fall back to the CLI's last-active). The
   project's `.env` API key also encodes the tenant id as a cross-check.
8. **Do not** add or replace the read-client — `create-adapto-app` already included it.

### API key handling (only after authentication)
`create-adapto-app` already creates the project's `.env` — no env template needed. **Use the working tenant
id the user just confirmed** (step 5 — never assume the saved/active one), then give the user their project's
**real** API-keys URL — never show a literal `<tenant_id>` placeholder:

`https://app.adaptocms.com/projects/project-<the-resolved-tenant-id>/developer-tools/api-keys`

Tell them to **generate an API key for this project and copy it**, then either **paste it into the chat** —
the agent **writes/appends** it to `.env` on the `ADAPTO_API_KEY=` line, **never echoing the value** — or add
it to `.env` themselves. Don't pass `--api-key <value>` on the command line (it leaks into shell history),
and never print the key value. If `.env` is missing, create it with `ADAPTO_API_URL` + `ADAPTO_API_KEY` —
set `ADAPTO_API_URL=https://public-api.adaptocms.com/v1` (**include the `/v1` path**). The read-client
(`adapto-client-sdk`) concatenates `baseUrl + endpoint`, and the SDK's endpoint paths are **bare**
(`/articles`, `/pages`, `/custom-collections`, …), so the host **must carry `/v1`**. The scaffold's
`.env.example` already ships exactly this value, so normally you only fill in the key and leave the URL.

## Errors and recovery
- **Node < 20** → tell the user to upgrade Node; `create-adapto-app` requires 20+.
- **Target directory exists / not empty** → `create-adapto-app` errors; offer `--force` only with explicit
  consent, or choose a new name.
- **No network / `npx` fails** → surface the error and suggest checking connectivity.
- **Unsupported framework** → only `next` | `astro` | `sveltekit` are supported.
- **Dev server starts but content fetches fail** → the bundled read-client is upstream code this skill does
  not own. Confirm `.env` first (`ADAPTO_API_URL` = `https://public-api.adaptocms.com/v1`, **including the
  `/v1` path**; `ADAPTO_API_KEY` set), then **report the symptom to the user** — **do not patch the bundled client**
  (Forbidden actions: never modify or replace the read-client).

## Forbidden actions
- Never run `npx create-adapto-app` (or any project-creating/installing command) without explicit consent
  ([forbidden-actions.md](../../shared/forbidden-actions.md)).
- Never pass the API key on the command line if avoidable; never print or log the key **value** — set it in
  `.env` by reference.
- Never **replace or modify** the read-client that `create-adapto-app` provides — including editing its
  endpoint paths. If the frontend misbehaves, report it to the user; don't patch the client.
- Never write CMS content (`mutates: false`).
