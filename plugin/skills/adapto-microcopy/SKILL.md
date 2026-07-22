---
name: adapto-microcopy
namespace: adapto
description: Manage UI micro copy (nav, buttons, labels, errors) as Adapto key/value/language entries. Two modes — init seeds a curated, on-brand starter set; extract scans your frontend for hardcoded strings and creates entries + a replacement guide (no source rewrite). Plan-then-apply.
version: 0.1.0
requires:
  cli: ">=0.1.1"
  auth: true               # writes to the CMS — needs an authenticated CLI + a selected tenant
  project_context: false   # reads .adapto/ artifacts if present; hard precondition is auth + a tenant
mutates: true
---

# adapto:microcopy

Manages a project's **micro copy** — the short UI strings (nav, buttons, labels, validation, empty/loading
states, footer) stored in Adapto as `key`/`value`/`language` entries. Two modes:
- **`init`** — seed a curated, project-aware **starter set** of UI strings with on-brand values (greenfield).
- **`extract`** — scan an existing frontend for **hardcoded** UI strings, create entries, and emit a
  `file:line → key` **replacement guide** (it never rewrites your source).

> ⚠️ Micro copy has **no draft state** — entries go **live on create**. So the plan-approval below is the
> **only** safety gate (there's no draft-review net like the content skills have). Review the plan carefully.

## When to use
- `init`: "seed UI strings", "starter microcopy", "set up my UI text".
- `extract`: "extract microcopy", "pull the hardcoded strings from my site into Adapto".

## When not to use
- Translating microcopy into another language → `adapto:translate`.
- Content (articles / pages / collection items) → `adapto:content-seed`.
- Just checking the environment → `adapto:doctor`.

## Inputs
- **Mode** — `init` or `extract`. Infer from the request; if ambiguous, ask which.
- **Project context** for voice (`.adapto/project.md` cache or `adapto collections get-by-slug
  _adapto_project_config --json`); absent → neutral defaults.
- **Tenant language** (`adapto auth orgs --json`).
- **For `extract`:** a scaffolded frontend in the current directory.
- **Key convention:** **dot-namespaced** (`nav.home`, `button.submit`, `form.email.label`) — both modes use it.

## Outputs
- Created micro copy entries (`key`/`value`/`language`); a report of created + skipped.
- **`extract` only:** a replacement guide at `.adapto/microcopy-extract-<date>.md` mapping `file:line → key`,
  so you can wire the read-client lookups yourself. **Source is never modified.**
- **Next step:** suggest `adapto:translate` to localize the micro copy into another enabled language; for
  `extract`, also wiring the read-client lookups from the guide; for `init`, `extract` mode to catch any
  hardcoded strings already in the frontend.

## Preconditions
- **Preflight** with the `adapto:doctor` checks.
- **Hard-block** on an authenticated CLI (`adapto auth me`) **and** a selected tenant — this skill writes.
  Confirm the **working tenant** first; never assume the active one.
- `adapto` CLI `>= 0.1.1`. `extract` additionally needs a scaffolded frontend in the cwd.

### How each mode gathers its candidates
- **`init`** — read project context → **auto-propose** a curated, dot-namespaced starter set (nav,
  buttons/CTAs, form labels, validation/errors, empty/loading, footer; tailored to the project type — e.g.
  e-commerce → cart/checkout, a blog → read-more/subscribe) with **on-brand values** → take **one edit pass**.
  Values follow the applicable [prose-standards.md](../../shared/prose-standards.md) rules (plain language,
  no filler/jargon — §6; rhythm/paragraph rules don't fit UI strings).
- **`extract`** — detect the framework (Next/Astro/SvelteKit, as `adapto:doctor` does) → scan
  `.astro`/`.tsx`/`.jsx`/`.svelte` for **user-facing** strings (template/JSX text + `placeholder`,
  `aria-label`, `title`, `alt`; skip code, imports, `className`) → propose a dot-namespaced key + value per
  string. LLM = Sonnet-class.

## Plan phase
Print a machine-parseable plan and wait for an explicit `approve`:
- The keys + values to create, the target language, and which keys **already exist** (skip via `get-by-key`).
- `extract` also shows the source location (`file:line`) for each proposed key.
- ⚠️ **No draft** — entries go live on create, so this plan **is** the review. No cost/token figures.
- Nothing to create → say so and stop.

## Apply phase
Loop (no batch); `--json` on each; dedup via `get-by-key`:
```bash
adapto microcopy get-by-key <key> --json        # skip if it already exists
adapto microcopy create --key <key> --value "<value>" --language <lang> [--tags "<tags>"] --json
```
- **`extract` only, after the creates:** write the replacement guide `.adapto/microcopy-extract-<date>.md`
  (`file:line → key`). Never rewrite source.
- Report created + skipped (with keys). Partial failure (no batch) → report what was created, stop; re-run is safe.
  Loop cleanly — judge success from each call's `--json`, end the loop exit 0 on success, so a created batch
  never surfaces as a red `Error: Exit code 1` (§8).
- **Then restart the dev server (stop→start) and keep it running** so the user sees the new micro copy —
  **never kill it** (starters sync content at startup — §14).

## Errors and recovery
- **`extract` with no frontend in cwd** → stop; it scans a scaffolded project — run it from the project root.
- **Key already exists** → skip (idempotent); report it, don't overwrite (use `microcopy update` manually if intended).
- **Partial failure mid-loop** (no batch) → report what was created, then stop; re-run is safe.
- **`extract` finds nothing** (or only false positives) → report; nothing to create.
- **Not authenticated / no tenant** → stop; offer both auth paths — `Log in` or `Register` ([conventions.md](../../shared/conventions.md) §11) — then tenant selection.
- **Language discovery fails** → ask the user for a language code the tenant has enabled; don't guess.

## Forbidden actions
- Never write without an **approved plan** — and since micro copy has no draft, the plan is the **only** gate.
- Never **overwrite** an existing key (dedup via `get-by-key`); skip and report instead.
- Never **rewrite source** in `extract` — emit the replacement guide only (don't touch the frontend/read-client).
- Never assume the working tenant — confirm it before any write.
