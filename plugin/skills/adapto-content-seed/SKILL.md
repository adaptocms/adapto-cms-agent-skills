---
name: adapto-content-seed
namespace: adapto
description: Populate a fresh Adapto site with on-brand starter drafts — a few Articles (provenance-tagged, linked to categories), key Pages, and rows for each custom collection. Reads your project context + schema; plan-then-apply; everything lands as draft. Generates HTML bodies.
version: 0.1.0
requires:
  cli: ">=0.0.7"
  auth: true               # writes to the CMS — needs an authenticated CLI + a selected tenant
  project_context: false   # reads .adapto/ artifacts if present; hard precondition is auth + a tenant
mutates: true
---

# adapto:content-seed

After `adapto:schema-apply` has created your collections + categories, this skill **populates a fresh site
with on-brand starter drafts** — a few Articles (provenance-tagged, linked to categories), key Pages, and a
few rows per custom collection — so the site isn't empty and you have examples to edit. A single skill under
plan-then-apply; **everything lands as `draft`**.

## When to use
- "Seed content", "add starter content", "populate my site with examples" — typically right after `adapto:schema-apply`.

## When not to use
- Creating the schema (collections/categories) → `adapto:schema-apply`.
- Translating existing content → `adapto:translate`.
- Just checking the environment → `adapto:doctor`.

## Inputs
- **Project context** for voice/audience: the `.adapto/project.md` cache, or `adapto collections get-by-slug
  _adapto_project_config --json`. Absent → proceed with neutral, generic starter content.
- **Schema map** `.adapto/schema.json` (`slug → id`, written by `adapto:schema-apply`) → the collection targets.
- **Tenant language** (`adapto auth orgs --json`).
- **Existing content** for dedup (`get-by-slug` per planned slug).
- Then **auto-propose a seed set** — titles/topics + counts (defaults: **~3 Articles**, **home + about
  Pages**, **2–3 rows per custom collection**) — and take **one edit pass** (add/remove/rename, adjust
  counts). Don't interrogate field-by-field.

## Outputs
- Starter **draft** content: Articles (provenance-tagged, optionally category-linked), Pages, and
  custom-collection items.
- A report of created counts + ids per type, and a reminder that everything is `draft` — review on the dev
  server, then publish (`adapto:publish` / backoffice).
- **Next step:** suggest **`adapto:translate`** to localize the seeded content into another enabled language,
  and/or reviewing the drafts on the dev server, then **`adapto:publish`** to take them live.

## Preconditions
- **Preflight** with the `adapto:doctor` checks (CLAUDE.md §3.14).
- **Hard-block** on an authenticated CLI (`adapto auth me`) **and** a selected tenant — this skill writes.
  Confirm the **working tenant** first (CLAUDE.md §3.5); never assume the active one.
- `adapto` CLI `>= 0.0.7`.
- No `.adapto/schema.json`? You can still seed Articles + Pages; collection items are skipped (run
  `adapto:schema-apply` first to seed those).

## Plan phase
Print a machine-parseable plan and wait for an explicit `approve`:
- Per type: the titles/slugs to create, target collection ids, `draft` status.
- Which Articles get **`ai_generated` provenance**, and which **category** each links to.
- Which planned slugs **already exist** and will be **skipped** (resolved via `get-by-slug`).
- The provenance **session id** that will tag this run's Articles.
- No cost/token figures (CLAUDE.md §3.10). Nothing to create (all exist / empty proposal) → say so and stop.

## Apply phase
Runs only after approval. Bodies are generated on-brand at apply time (Sonnet-class, §7 — content drafting;
Articles/Pages bodies are **HTML**, cheatsheet §3). Writes are deterministic CLI calls (`--json` on each):

```bash
# 1. Resolve language; load .adapto/schema.json (slug->id) + project context; mint the provenance session id:
adapto auth orgs --json
SESSION_ID="agent_$(date -u +%Y-%m-%dT%H-%MZ)_$(printf '%04x' $RANDOM)"

# 2. Articles (loop — no batch). --author = project author/brand if present, else the project name;
#    NEVER a fabricated person. content is HTML. Dedup via get-by-slug first.
adapto articles get-by-slug <slug> --json        # skip this article if it already exists
adapto articles create --title "<t>" --content "<HTML body>" --slug <slug> \
  --author "<author>" --language <lang> --status draft \
  --source '{"type":"ai_generated","name":"'"$SESSION_ID"'"}' --json
adapto categories add-article <category_id> <article_id>   # if the plan links it to a category

# 3. Pages (loop — no batch, no --source). content is HTML. Dedup via get-by-slug.
adapto pages get-by-slug <slug> --json
adapto pages create --title "<t>" --content "<HTML body>" --slug <slug> \
  --language <lang> --status draft --json

# 4. Collection items (batch per collection; only slugs not already present). <collection_id> from schema.json.
adapto collections items create-batch <collection_id> --items-json \
  '{"items":[ {"title":"<t>","slug":"<s>","language":"<lang>","status":"draft","data":{ /* keyed to the collection fields */ }} ]}' --json
# Then VERIFY by listing — the batch response can report an error even when items were created. Don't trust
# the response string; confirm what landed, and never blind-re-run a batch (it isn't idempotent — a re-run
# duplicates). The pre-batch get-by-slug dedup is what keeps re-runs safe (only new slugs go in).
adapto collections items list <collection_id> --status draft --json

# 5. Report created counts/ids per type; remind: everything is draft — review, then publish.
#    Loop cleanly: judge success from each call's --json, end the loop exit 0 on success (conventions §8),
#    so a created batch never shows as a red "Error: Exit code 1".
#    Then tell the user to RESTART `npm run dev` to see the new content (starters load at startup — §14).
```

- `--source` is **required** on every Article and carries `$SESSION_ID` (omitting it mislabels content as
  `internal`/`CLI`).
- Collection-item `data` keys must match the **target collection's field `name`s** (from the schema). Items
  require `title`, `slug`, `language`, `data`; `--items-json` is the object-wrapped `{"items":[…]}` shape.

## Errors and recovery
- **No `.adapto/schema.json`** → seed Articles + Pages anyway; **skip collection items** and point the user to
  `adapto:schema-apply` to create the schema first.
- **Item `data` doesn't match the collection's fields** → surface which field; don't send unknown keys.
- **Slug already exists** → skip that item (dedup); report it as skipped, never duplicate.
- **Partial failure mid-loop** (Articles/Pages have no batch) → report what was created so far, then stop;
  re-running is safe (dedup).
- **Batch reports an error** (collection items) → **don't assume it failed** — the batch can report an error
  while still creating items. **Verify via `items list`** (above), report what actually landed, and **never
  blind-retry** the batch (it isn't idempotent — a re-run duplicates). Re-running the whole skill is safe
  because the pre-batch `get-by-slug` dedup excludes existing slugs.
- **Not authenticated / no tenant** → stop; route to `adapto auth login` + tenant selection.
- **Language discovery fails** → ask for a language code the tenant has enabled; don't guess.

## Forbidden actions
- Never omit `--source` on an Article write — it defaults to `{"type":"internal","name":"CLI"}` and mislabels
  agent content ([forbidden-actions.md](../../shared/forbidden-actions.md)).
- Never publish — everything lands `draft` (draft-first, CLAUDE.md §3.9); the user reviews then publishes.
- Never invent collection-item `data` keys that aren't in the schema's field set.
- Never write without an approved plan (plan-then-apply, §3.8); never assume the working tenant (§3.5).
- Never fabricate a person as `--author`; never modify the scaffolded read-client (§3.11).
