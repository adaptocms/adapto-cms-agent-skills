---
name: adapto-content-upload
namespace: adapto
description: Push approved content drafts to Adapto — convert each reviewed Markdown draft to HTML, create or update the Article/Page/collection item (one-way push via the ledger id-map), mirror its SEO metadata into _adapto_seo, and drift-guard against out-of-band CMS edits. Schema-gated; everything lands as draft. Plan-then-apply.
version: 0.1.0
requires:
  cli: ">=0.0.7"
  auth: true               # writes to the CMS — needs an authenticated CLI + a selected tenant
  project_context: true    # reads drafts + the ledger + schema.json
mutates: true
---

# adapto:content-upload

The pipeline's **gated writer** ([content-pipeline.md](../../shared/content-pipeline.md)). It takes the
Markdown drafts you've approved and pushes them to Adapto: body **md→HTML**, **create-or-update** via the
ledger's local↔CMS id-map (one-way push — local is the source of truth), the SEO metadata mirrored into the
reserved **`_adapto_seo`** collection, everything landing as **draft**. It is **schema-gated** (every target
type must exist first) and **drift-guarded** (it won't silently overwrite backoffice edits).

## When to use
- "Upload the drafts", "push the approved content to Adapto", "update the content in Adapto".
- After you've reviewed `.adapto/drafts/` and want the approved pieces in the CMS.

## When not to use
- Writing/revising the drafts → `adapto:content-create`.
- Taking CMS drafts **live** → `adapto:publish` (upload lands drafts; publish flips them to published).
- Rendering metadata on the site → `adapto:seo-wire`.

## Inputs
- The **approved drafts** in `.adapto/drafts/` (frontmatter per content-pipeline.md §2). The user names which
  to upload, or "all reviewed".
- **The ledger** (`.adapto/ledger.json`) — the local↔CMS id-map (create vs update) + drift fingerprints.
- **`.adapto/schema.json`** — collection + `_adapto_seo` ids (the schema gate).
- **`inventory.md`** — to resolve `internal_links` / `category_slugs`.
- The working **tenant** + language (confirm the tenant — §3.5).

## Outputs
- Created/updated **Articles / Pages / collection items** in Adapto (`draft`), provenance-tagged on Articles.
- A mirrored **`_adapto_seo`** item per piece (meta/OG/JSON-LD), `json_ld` stringified.
- The **ledger** advanced to `status: uploaded` with `cms.content_id`, `cms.seo_id`, `last_push_hash`,
  `cms_updated_at`; `calendar.md` refreshed.
- **Next step:** `adapto:seo-wire` (if the render layer isn't wired yet) so the metadata shows on the site;
  then review on the dev server and `adapto:publish` to take it live; `adapto:translate` to localize.

## Preconditions
- **Preflight** with the `adapto:doctor` checks (CLAUDE.md §3.14).
- **Hard-block** on an authenticated CLI (`adapto auth me`) **and** a selected tenant (this skill writes);
  confirm the **working tenant** (§3.5).
- `.adapto/schema.json` must exist with the targets the drafts need (else the schema gate routes you to
  `adapto:schema-design` / `adapto:schema-apply`).
- `adapto` CLI `>= 0.0.7`.

## Plan phase
Build + validate; **no writes yet**. Print a machine-parseable plan and ask as a **pickable question**
(`Approve` / `Change something` / `Discuss this`):
- Per draft: **create** vs **update** (from the ledger id-map), its `type`/`slug`/`language`, and the
  `_adapto_seo` item it will write.
- **Schema gate:** confirm every draft's target type/collection exists in `.adapto/schema.json`. Any missing →
  **STOP and route** to `adapto:schema-design` / `adapto:schema-apply`; don't upload that piece.
- **Drift check:** for each already-uploaded piece, compare the live CMS item's `updated_at` to the ledger's
  `cms_updated_at`. If it changed, flag it **drifted** and ask per piece: overwrite / skip / import-CMS — never
  silently clobber.
- **Unresolved links:** list any `internal_links`/`category_slugs` not in `inventory.md` (written but flagged).
- The provenance **session id** that will tag Article writes. No cost/token figures (§3.10). Nothing to upload →
  say so and stop.

## Apply phase
Runs only after approval. Deterministic CLI calls (`--json` on each).

```bash
SESSION_ID="agent_$(date -u +%Y-%m-%dT%H-%MZ)_$(printf '%04x' $RANDOM)"   # for Article --source
```

For each approved draft:
1. **Body md→HTML.** Convert the Markdown body to HTML (the CMS `content` renders HTML — cheatsheet §3).
   Resolve `internal_links` + `category_slugs` against `inventory.md`; warn on unresolved (write anyway).
2. **Create or update** the content via the ledger id-map:
   - **Article** — `articles create` (new) / `articles update <id>` (known), with
     `--source '{"type":"ai_generated","name":"'"$SESSION_ID"'"}'`, `--status draft`, `--author <from draft>`;
     then `categories add-article <cat_id> <article_id>` per resolved category.
   - **Page** — `pages create` / `pages update <id>` (no `--source`).
   - **Collection item** — `collections items create <cid>` / `items update <cid> <item_id>`, `--data-json`
     keyed to the collection's fields, `--status draft`.
3. **Mirror `_adapto_seo`.** Upsert one `_adapto_seo` item for the piece (keyed `target_slug` + `content_type`,
   `content_id` once known; `json_ld` stringified) via `items create`/`items update` on the `_adapto_seo`
   collection id from `schema.json`.
4. **Update the ledger** row → `status: uploaded` with `content_id`, `seo_id`, `last_push_hash` (sha256 of the
   draft body), `last_push_at`, `cms_updated_at` (the item's returned `updated_at`); refresh `calendar.md`.
5. **Drift:** if the Plan flagged a piece as drifted and the user didn't choose overwrite, **skip** it and report.

**Loop cleanly** — judge success from each call's `--json`, not the shell exit code; end the loop exit 0 on
success so a created batch never surfaces as a red `Error: Exit code 1` (conventions §8). **Then restart the
dev server (stop→start) and keep it running** so the new content appears — **never kill it** (starters sync at
startup — §14). Finally point to `adapto:seo-wire` / review + `adapto:publish` / `adapto:translate`.

## Errors and recovery
- **Schema gate fails** (target type/collection missing) → stop that piece; route to `adapto:schema-design` /
  `adapto:schema-apply`; upload the rest.
- **Drift detected** → ask per piece (overwrite / skip / import); never silently overwrite backoffice edits.
- **Item `data` doesn't match collection fields** → surface which field; don't send unknown keys.
- **Partial failure mid-loop** (Articles/Pages have no batch) → report what uploaded, update those ledger rows,
  then stop; re-running is safe (the id-map makes it an update, not a duplicate).
- **`_adapto_seo` write fails but content succeeded** → report the content id, mark the seo mirror pending, and
  retry the metadata only (don't re-create the content).
- **Not authenticated / no tenant** → stop; route to `adapto auth login` + tenant selection.

## Forbidden actions
- Never write without an approved plan (plan-then-apply, §3.8); never assume the working tenant (§3.5).
- Never omit `--source` on an Article write — it mislabels content as `internal`/`CLI` (forbidden-actions.md).
- Never **silently overwrite** a drifted CMS item — drift-guard and ask.
- Never publish — everything lands `draft` (draft-first, §3.9); the user reviews then `adapto:publish`.
- Never invent collection-item `data` keys, `_adapto_seo` fields, or article/page fields not in the schema.
- Never modify the read-client; never blind-retry a non-idempotent write (use the ledger id-map).
