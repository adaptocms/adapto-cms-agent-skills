---
name: adapto-doctor
namespace: adapto
description: Diagnose whether the environment is ready for Adapto CMS — CLI installed and authenticated, a tenant selected with enabled languages, and (inside a project) a supported framework with a valid .env and .gitignore. Read-only. Run it first when Adapto commands fail or before scaffolding a project.
version: 0.1.0
requires:
  cli: ">=0.1.1"         # latest pre-1.0 release (verified); local installs may lag
  auth: false            # doctor diagnoses auth — it must run even when auth is broken
  project_context: false # global variant runs with no .adapto/ present
mutates: false
---

# adapto:doctor

Read-only health check for the Adapto CMS toolchain. It never changes anything — it reports what's
wrong and the exact command to fix each item. It ships **global + per-repo** (CLAUDE.md §3.1): run it
anywhere to check the environment, or inside a project to also check project wiring.

## When to use
- Any Adapto CLI command failed and you're not sure why (auth? tenant? CLI missing?).
- Before `adapto:scaffold` or any mutating skill, to confirm preconditions.
- After `adapto auth login` or switching tenants, to confirm the session is good.
- Triggers: "adapto doctor", "is my adapto setup ok", "why is adapto failing", "check my adapto environment".

## When not to use
- To *fix* things — doctor only diagnoses. It prints fixes; the user (or another skill) runs them.
- As a precondition gate inside other skills — call the relevant CLI check directly; doctor is for humans.

## Inputs
- None required. Optional mode flags on the check script:
  - `--repo` force project checks · `--global` skip them · (default: auto — project checks run if a `package.json` is present in the cwd).
  - `--json` machine-readable output.
  - `--strict` exit non-zero when a check fails (for shell gating). Off by default.

## Outputs
- A checklist (✓ pass / ⚠ warn / ✗ fail) with a one-line detail and a fix hint per non-passing item, plus a `pass/warn/fail` tally.
- `--json`: `{ ok, mode, checks:[{id,label,status,detail,fix}], summary:{pass,warn,fail} }`.
- Exit code `0` on a **successful run** (a report was produced) — doctor is a diagnostic, so a failing
  check is data, not a tool error. Read the JSON `ok` field (or the `✗` rows) for health. Pass `--strict`
  to make failing checks exit `1` for shell-level gating.

## Checks
**Environment (always):**
1. `cli_installed` — `adapto` on PATH (else: install hint).
2. `cli_version` — version ≥ `requires.cli` (warn if older/unparseable).
3. `auth_valid` — `adapto auth me` succeeds (shows the account email — identity, not a secret).
4. `api_reachable` — `adapto status` succeeds (gated on auth). A permission/`403` error on this check is downgraded to a **warn**, not a fail: auth already proved the backend is reachable, so it's not a blocker for content work.
5. `tenant_selected` — an active tenant exists via `adapto auth orgs`, and its enabled languages are surfaced (this is also the canonical locale list per [conventions.md](../../shared/conventions.md) §5). ℹ️ This reports the **currently-active** tenant; it is **not** an instruction to use it — work skills must still confirm the **working tenant** before scoped writes (don't assume the active one — [conventions.md](../../shared/conventions.md) §12, CLAUDE.md §3.5).

**Project (repo mode only):**
6. `framework` — Next / Astro / SvelteKit detected in `package.json` (warn otherwise — `create-adapto-app` covers only these three).
7. `env_api_key` — `.env` defines a real `ADAPTO_API_KEY` (**value never printed** — only "present").
8. `gitignore_env` — `.gitignore` ignores `.env`.
9. `project_context` — `.adapto/` exists (warn if not — optional for read-only sites).

**Studio (repo mode, if `.adapto/` present):**
10. `studio_brain` — `.adapto/project/` exists with key facets (`identity.md`, `voice.md`, …). Missing/empty →
    warn, fix: `adapto:project-define` (build the brain).
11. `studio_ledger` — `.adapto/ledger.json` is present and parses (`{version, pieces[]}`). Missing/invalid →
    warn, fix: `adapto:scaffold` re-inits it (it's also created on the first content cycle).
12. `seo_collection` *(needs auth — agent-run, not the static script)* — the reserved `_adapto_seo` collection
    exists (`adapto collections get-by-slug _adapto_seo --json`). Missing → warn, fix: `adapto:schema-apply`
    (it provisions `_adapto_seo`).
13. `seo_render` *(heuristic)* — the metadata render layer looks wired (a head component referencing
    `_adapto_seo`, or `.adapto/seo-render/` snippets). Not wired → info, fix: `adapto:seo-wire`.

## How to run
Run the bundled script — installed as a plugin: `node "$CLAUDE_PLUGIN_ROOT/skills/adapto-doctor/scripts/doctor.mjs"`;
from this repo during development: `node plugin/skills/adapto-doctor/scripts/doctor.mjs`. Add `--json` to parse,
`--repo`/`--global` to force mode. It inspects the **current working directory** for project checks, so run
it from the user's project.
The agent should: run the script, parse the result, present the checklist, and for each ✗/⚠ offer to run
the printed fix command (each fix is itself a normal CLI step — e.g. `adapto auth login`,
`adapto auth switch-tenant --tenant-id <id>`, setting `ADAPTO_API_KEY` in `.env`). Never run a fix
without the user's go-ahead. For CLI install/upgrade specifically, the consent-gated performer is
**`adapto:install`** — doctor itself never installs anything (CLAUDE.md §3.12).

## Preconditions
- A shell and **Node 18+** (to run `scripts/doctor.mjs`). This is the only hard dependency — everything
  else is what doctor *checks*, so it deliberately requires neither auth nor `.adapto/`.

## Errors and recovery
- **`adapto` not found** → every CLI check is reported `fail`/skipped with the install command; nothing crashes.
- **Not authenticated** → `auth_valid` fails; `api_reachable`/`tenant_selected` are skipped with "authenticate first" (avoids reporting a false "API down").
- **No active tenant (but authed)** → `tenant_selected` fails with the `switch-tenant` fix **if the account
  has tenants**, or the **`adapto onboard`** fix if it has **zero** tenants (a brand-new account has nothing
  to switch to — it needs to create its first project).
- **Script can't parse a CLI version / orgs payload** → degrades to `warn`, never a hard error.
- Doctor itself never throws on a failed check — a failed check is data, surfaced in the report.

## Forbidden actions
- Never print, log, or echo secret **values**: not the contents of `~/.config/adapto/credentials.json`, and
  not the `ADAPTO_API_KEY` value (report only "present (value hidden)"). See
  [forbidden-actions.md](../../shared/forbidden-actions.md).
- Never run a suggested fix command automatically — diagnose only; the user approves any action.
- Never mutate anything (`mutates: false`): no writes, no auth changes, no file edits.
