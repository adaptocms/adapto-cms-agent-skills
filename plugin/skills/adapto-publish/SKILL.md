---
name: adapto-publish
namespace: adapto
description: Take reviewed draft content live — publish Articles and collection items (draft → published), or archive them back (published → archived). Discovers drafts, you select, then it publishes under plan-then-apply. Closes the draft-first loop. (Pages need a CLI that registers the pages command.)
version: 0.1.0
requires:
  cli: ">=0.0.7"
  auth: true               # writes to the CMS — needs an authenticated CLI + a selected tenant
  project_context: false   # reads .adapto/schema.json if present; hard precondition is auth + a tenant
mutates: true
---

# adapto:publish

The **terminal step of the draft-first loop**: every other skill writes `draft` content; this one takes the
reviewed drafts **live** (`draft → published`), or **archives** them back (`published → archived`) as a
walk-back. It's **stateless** — it *discovers* what's publishable rather than remembering a session.

## When to use
- "Publish", "publish my drafts", "take it live", "go live", "unpublish/archive this" — typically after
  reviewing the seeded/translated drafts on the dev server.

## When not to use
- Creating or editing content → `adapto:content-seed` / `adapto:translate`.
- Just checking the environment → `adapto:doctor`.

## Inputs
- **Mode:** `publish` (default) or `archive` (the inverse / walk-back).
- **Optional filters:** type (Articles / collection items), language, or a specific collection / item set.
- Collections enumerated from `.adapto/schema.json` (if present) or `adapto collections list --json`.

## Outputs
- The selected Articles / collection items moved `draft → published` (or `published → archived`).
- A report of acted-on + skipped, with ids.

## Preconditions
- **Preflight** with the `adapto:doctor` checks (CLAUDE.md §3.14).
- **Hard-block** on an authenticated CLI (`adapto auth me`) **and** a selected tenant — this skill writes.
  Confirm the **working tenant** first (CLAUDE.md §3.5); never assume the active one.
- `adapto` CLI `>= 0.0.7`.
- ⚠️ **Pages caveat:** the `pages` command isn't registered in CLI v0.0.7 (`adapto pages …` →
  `unknown command "pages"`), so **page publishing isn't available**. If asked to publish Pages, detect the
  missing command and say so — never fake it (see Errors).

## Plan phase
1. **Discover candidates** in the relevant status (publish → `draft`; archive → `published`):
   ```bash
   adapto articles list --status draft --json [--language <lang>]
   adapto collections list --json                                  # enumerate collections (or read .adapto/schema.json)
   adapto collections items list <collection_id> --status draft --json
   ```
2. **Present** them as `type · title · slug · language · status`.
3. **Let the user select** — **all** or a **subset** (by type, language, or specific items). "Publish
   everything I just seeded" = select all; targeted = pick a few.
4. Print a machine-parseable plan: the exact set to act on (count, per type, titles/slugs, languages) and the
   transition (`draft → published` or `published → archived`). List items already in the target state as
   **skipped**. Wait for an explicit `approve`. No cost/token figures (§3.10). Nothing to act on → say so and stop.

## Apply phase
Runs only after approval. Per-item loop (no batch on publish); `--json` on each. Verified verbs (CLI v0.0.7):

```bash
# publish (draft → published)
adapto articles publish <id> --json
adapto collections items publish <collection_id> <item_id> --json
# archive (published → archived) — the walk-back
adapto articles archive <id> --json
adapto collections items archive <collection_id> <item_id> --json
```

- **Idempotent:** skip items already in the target state (re-publishing a published item is a no-op skip).
- **Partial failure:** report what was acted on, then stop; re-running is safe.
- Collection items require **iterating collections** (per-collection `items list` then per-item publish).
- Report acted-on + skipped, with ids — judge success from each call's `--json`, not the shell exit code, and
  end the loop exit 0 on success so a clean batch never shows a red `Error: Exit code 1` (§8).
- **Then remind the user to restart `npm run dev`** so the now-published content appears (starters load content at startup — §14).

## Errors and recovery
- **No candidates in the requested status** → say so; suggest `adapto:content-seed` / `adapto:translate` first
  (publish mode), or note nothing is published yet (archive mode).
- **Pages requested** → run `adapto pages --help`; on `unknown command "pages"`, tell the user page publishing
  needs a CLI build that registers the `pages` command, then continue with the types that work.
- **Item already in the target state** → skip (idempotent); report it, don't error.
- **Partial failure mid-loop** (no batch on publish) → report what was acted on, then stop; re-run is safe.
- **Not authenticated / no tenant** → stop; route to `adapto auth login` + tenant selection.

## Forbidden actions
- Never publish without an **approved plan** (plan-then-apply, §3.8) — publishing makes content **live**.
- Never claim to publish a type the CLI can't (Pages) — detect and flag the gap instead.
- Never assume the working tenant — confirm it before any write (§3.5).
- Never modify the scaffolded read-client (§3.11 / [forbidden-actions.md](../../shared/forbidden-actions.md)).
