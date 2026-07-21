---
name: adapto-content-seed
namespace: adapto
description: The express lane — quickly stand up a few on-brand starter drafts by running a condensed research→plan→create→upload cycle with greenfield defaults and minimal questions. For "just give me a few starter pieces fast"; the full pipeline is the considered path. Plan-then-apply; everything lands as draft.
version: 0.1.0
requires:
  cli: ">=0.1.1"
  auth: true               # ends by uploading drafts to the CMS — needs auth + a selected tenant
  project_context: false   # uses the brain if present; falls back to neutral defaults
mutates: true
---

# adapto:content-seed

The **express lane** over the content pipeline ([content-pipeline.md](../../shared/content-pipeline.md)). It
runs a **condensed research → plan → create → upload** cycle with **greenfield defaults and minimal
questions**, to quickly fill a fresh site with a few on-brand **draft** pieces. It is **not a separate write
path** — it uses the same drafts, `_adapto_seo`, ledger, and gated upload as the full pipeline; it just skips
the deliberation. For a real content cycle, use the full pipeline.

## When to use
- "Seed some starter content", "give me a few starter drafts fast", "populate the site so it isn't empty" —
  typically right after `adapto:schema-apply`.

## When not to use
- A considered content cycle (research, top-N planning, cornerstone writing) → the full pipeline
  (`adapto:content-research` → `adapto:content-plan` → `adapto:content-create` → `adapto:content-upload`).
- Translating existing content → `adapto:translate`. · Just checking the environment → `adapto:doctor`.

## Inputs
- **The brain** (`.adapto/project/`) if present — for voice/audience; absent → neutral, generic starters.
- **`.adapto/schema.json`** — collection targets (for any collection-item starters); absent → Articles/Pages only.
- **Tenant** + language (confirm the working tenant — §3.5).
- A tiny bit of direction: how many pieces / which types (defaults below).

## Outputs
- A few **draft** pieces in Adapto: ~2–3 Articles (provenance-tagged), home + about Pages, and 2–3 rows per
  custom collection — created via the pipeline's md→draft→upload path (so they carry `_adapto_seo` + ledger rows).
- **Next step:** review the drafts on the dev server, then `adapto:publish` to take them live; or run the full
  pipeline (`adapto:content-research` …) for a proper cycle; `adapto:seo-wire` to render their metadata.

## Preconditions
- **Preflight** with the `adapto:doctor` checks (CLAUDE.md §3.14).
- **Hard-block** on an authenticated CLI (`adapto auth me`) **and** a selected tenant — it ends by writing
  drafts to the CMS; confirm the **working tenant** (§3.5).
- `.adapto/schema.json` for collection-item starters (else Articles/Pages only). `adapto` CLI `>= 0.1.1`.

## Plan phase
A condensed cycle, gated before any CMS write:
1. **Auto-propose a small slate** from the brain (or neutral defaults): titles/topics + counts (defaults:
   ~3 Articles, home + about Pages, 2–3 rows per custom collection in `schema.json`). Take **one edit pass**
   (add/remove/rename, adjust counts) — don't interrogate field-by-field. Mark which Articles link to which
   categories.
2. **Draft the pieces** as Markdown (the `adapto-writer` path, content-pipeline.md §2) so the user can review
   them, and write them to `.adapto/drafts/` with ledger rows. The express lane skips deliberation, **not
   the quality gates** — drafts follow [seo-standards.md](../../shared/seo-standards.md) and
   [prose-standards.md](../../shared/prose-standards.md) like the full pipeline: the writer's prose
   self-check, the deterministic em-dash grep on each draft body, and the `adapto-editor` critique pass all
   run exactly as in `adapto:content-create`.
3. **Print the upload plan** (the `adapto:content-upload` plan): create-vs-update, the schema gate, `_adapto_seo`
   items, provenance session id — and ask as a **pickable question** (`Approve` / `Change something` /
   `Discuss this`). No cost/token figures (§3.10). Nothing to create → say so and stop.

## Apply phase
Runs only after approval — the same write path as `adapto:content-upload`:
- Convert each approved draft md→HTML, **create** the Article/Page/collection item as `draft`
  (`--source '{"type":"ai_generated","name":"<session>"}'` on Articles), mirror `_adapto_seo`, advance the
  ledger to `uploaded`; link Articles to categories.
- Loop cleanly (judge success from each call's `--json`, exit 0 on success — §8).
- **Then restart the dev server (stop→start) and keep it running** so the new drafts appear — **never kill it**
  (§14). Point to review → `adapto:publish`, or the full pipeline for the next cycle.

## Errors and recovery
- **No `.adapto/schema.json`** → seed Articles + Pages only; skip collection items; point to `adapto:schema-apply`.
- **No brain** → use neutral generic starters; note content will be sharper after `adapto:project-define`.
- **Slug already exists** (dedup via the ledger / `get-by-slug`) → skip that piece; never duplicate.
- **Schema gate / drift / partial failure** → handled exactly as `adapto:content-upload` (it's the same path).
- **Not authenticated / no tenant** → stop; route to `adapto auth login` + tenant selection.

## Forbidden actions
- Never omit `--source` on an Article write — it mislabels content as `internal`/`CLI` (forbidden-actions.md).
- Never publish — everything lands `draft` (draft-first, §3.9); the user reviews then `adapto:publish`.
- Never write without an approved plan (§3.8); never assume the working tenant (§3.5).
- Never fabricate an author; never invent fields outside the schema; never modify the read-client.
