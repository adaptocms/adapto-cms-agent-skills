---
name: adapto-schema-apply
namespace: adapto
description: Apply an approved .adapto/schema-plan.json to the CMS — create Article categories and custom collections (with a two-pass step for references), idempotently, via the adapto CLI. Plan-then-apply; writes content. Pairs with adapto:schema-design.
version: 0.1.0
requires:
  cli: ">=0.0.7"
  auth: true               # writes to the CMS — needs an authenticated CLI + a selected tenant
  project_context: false   # real precondition is the plan file, checked in-skill (not generic .adapto/ setup)
mutates: true
---

# adapto:schema-apply

The **gated writer** of the schema pair. It reads `.adapto/schema-plan.json` (produced by
`adapto:schema-design`) and creates the **Article categories** and **custom collections** it describes via
the `adapto` CLI. It is **idempotent and re-runnable** — existing collections/categories are reused or
updated, never duplicated.

## When to use
- After `adapto:schema-design` produced (and you've eyeballed or hand-edited) `.adapto/schema-plan.json`, and
  you're ready to create those collections + categories in Adapto.
- Triggers: "apply the schema", "create the collections", "build my schema in Adapto".

## When not to use
- No plan file yet → run `adapto:schema-design` first.
- Seeding content rows into the collections → `adapto:content-seed`.

## Inputs
- **`.adapto/schema-plan.json`** — the approved plan (collections, categories, language). Missing/invalid →
  stop and route to `adapto:schema-design`.
- **The working tenant** — confirm it explicitly (CLAUDE.md §3.5); never assume the saved/active one. With
  2+ tenants, have the user pick; with one, state it and proceed.

## Outputs
- The plan's **Article categories** and **custom collections** created (or updated) in the CMS, `draft`
  unless the plan says otherwise.
- The reserved **`_adapto_seo`** collection ensured (the CMS home for per-piece SEO metadata —
  [reserved-slugs.md](../../shared/reserved-slugs.md)), so `adapto:content-upload` can write metadata.
- A realized **`.adapto/schema.json`** — a `{"<slug>": "<id>", …}` map of every collection's slug to its CMS
  id (incl. `_adapto_seo`) — for `adapto:content-upload` (and `adapto:content-seed`) to target.
- A report: which collections/categories were created vs reused, with ids.
- **Next step:** suggest **`adapto:content-research`** to start a content cycle (research → plan → create →
  upload), or **`adapto:content-seed`** for a quick set of starter drafts. Both read `.adapto/schema.json`.

## Preconditions
- **Preflight** with the `adapto:doctor` checks (CLAUDE.md §3.14).
- **Hard-block** on an authenticated CLI (`adapto auth me`) **and** a selected tenant — this skill writes.
- `.adapto/schema-plan.json` must exist (else route to `adapto:schema-design`).
- `adapto` CLI `>= 0.0.7`.

## Plan phase
Read and validate `.adapto/schema-plan.json`, then print a machine-parseable plan and wait for an explicit
`approve`:
- For each **category** and **collection**: whether it will be **created** or **reused** (resolved live via
  `get-by-slug`), plus its fields, the **target language**, and `draft` status.
- The realized `.adapto/schema.json` it will write.
- That the reserved **`_adapto_seo`** collection will be **ensured** (created if absent) for content metadata.
- No cost/token figures (CLAUDE.md §3.10). If the plan is empty, say so and stop — nothing to apply.

Validate before proposing: every field `type` is in the safe vocabulary (cheatsheet §5), and every
`reference` field's `related_collection` slug exists in the plan. Surface any problem here, before writing.

## Apply phase
Runs only after approval. Deterministic CLI calls — `--json` on every one.

1. **Resolve language.** Use the plan's `language` if the tenant has it enabled; otherwise fall back to the
   tenant's first enabled code and note the substitution. Discover with:
   ```bash
   adapto auth orgs --json
   ```
2. **Categories** — idempotent (no `--status` flag on categories):
   ```bash
   adapto categories get-by-slug <slug> --json        # reuse the id on a hit
   adapto categories create --name "<name>" --slug <slug> --language <lang> [--description "<desc>"] --json
   ```
3. **Collections — TWO PASS** (robust even to circular references):
   - **Pass 1** — create each collection with its **non-reference** fields only; capture each `slug → id`.
     On a `get-by-slug` hit, reuse the id (and `update` if fields differ):
     ```bash
     adapto collections get-by-slug <slug> --json
     adapto collections create --name "<name>" --slug <slug> \
       --description "<desc>" --language <lang> --status <status> \
       --fields-json '<fields WITHOUT type:reference entries>' --json
     ```
   - **Pass 2** — add the `reference` fields now that their targets exist, resolving each
     `related_collection` slug → the real id captured in Pass 1:
     ```bash
     adapto collections update <id> --fields-json '<full fields incl. resolved reference ids>' --json
     ```
3b. **Ensure the reserved `_adapto_seo` collection** (idempotent) — the CMS home for per-piece SEO metadata
   that `adapto:content-upload` writes and `adapto:seo-wire` reads ([reserved-slugs.md](../../shared/reserved-slugs.md)):
   ```bash
   adapto collections get-by-slug _adapto_seo --json        # reuse the id on a hit
   adapto collections create --name "Adapto SEO" --slug _adapto_seo \
     --description "Per-piece SEO metadata for Adapto content" --language <lang> --status draft \
     --fields-json '<the _adapto_seo field-set — reserved-slugs.md>' --json
   ```
   ⚠️ **Reserved-slug fallback:** if `_adapto_` is rejected, retry once with `adapto-seo`; record which slug
   worked. Capture its id into `.adapto/schema.json` alongside the user collections.
4. **Report + persist.** Print created-vs-reused with ids, then write `.adapto/schema.json` as
   `{"<slug>": "<id>", …}` (incl. `_adapto_seo`) for `adapto:content-upload`. **Loop cleanly** — judge success from each call's `--json`,
   not the shell exit code, and make the loop/function exit 0 on success so a created batch never surfaces as a
   red `Error: Exit code 1` (conventions §8). **Then restart the dev server (stop→start) and keep it running** so
   the new collections/categories appear — **never kill it** (starters sync content at startup — conventions §14).

`--fields-json` is a `FieldDefinitionModel[]`. No `--source` — collections and categories carry no provenance.

## Errors and recovery
- **Plan missing/invalid** → stop; tell the user to run `adapto:schema-design`.
- **Server rejects a field `type`** → surface which collection/field, and suggest a safe-vocabulary type
  (cheatsheet §5); don't retry blindly.
- **A `reference`'s `related_collection` slug isn't in the plan** → stop before writing; the plan is
  inconsistent.
- **Collection/category already exists** → reuse/update via `get-by-slug`; never create a duplicate.
- **Partial failure mid-apply** (collections have no batch — they're per-call) → report what was created so
  far, then stop. Re-running is safe (idempotent).
- **Not authenticated / no tenant** → stop; route to `adapto auth login` and tenant selection.
- **Language discovery fails** → ask the user for a language code the tenant has enabled; don't guess.

## Forbidden actions
- Never write without an **approved plan** (plan-then-apply, CLAUDE.md §3.8).
- Never pass `--source` here — collections/categories have no provenance field.
- Never create built-in Articles/Pages — the plan's `advisory` map is documentation only.
- Never assume the working tenant — confirm it before any write (CLAUDE.md §3.5).
- Never modify the scaffolded read-client (CLAUDE.md §3.11 / [forbidden-actions.md](../../shared/forbidden-actions.md)).
