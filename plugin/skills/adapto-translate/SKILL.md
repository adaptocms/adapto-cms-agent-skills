---
name: adapto-translate
namespace: adapto
description: Translate existing Adapto content (Articles, Pages, collection items, Categories, Microcopy) into another enabled language via create-translation. Structural-parity gate blocks broken translations; glossary-aware; single-item and corpus modes. Plan-then-apply; runs at the top model tier.
version: 0.1.0
requires:
  cli: ">=0.1.1"
  auth: true               # writes to the CMS — needs an authenticated CLI + a selected tenant
  project_context: false   # reads .adapto/ artifacts if present; hard precondition is auth + a tenant
mutates: true
---

# adapto:translate

Translates existing content into another **already-enabled** language, linked to the source via
`translation_of_id`. A **structural-parity gate** prevents broken translations (lost paragraphs, dropped
markup/media, mangled placeholders). Works **single-item** or across a **corpus**.

> **Model tier (hard rule):** the translation step runs at the **top tier (Opus-class)** — lower tiers
> silently destroy meaning (§7 / [sub-agents.md](../../shared/sub-agents.md)). If the current session/sub-agent
> can't run at the top tier, **warn and stop**; never translate at a lower tier.

## When to use
- "Translate this article/page into `<lang>`", "localize my site into `<lang>`", "translate the blog corpus".
- After source content exists (e.g. from `adapto:content-seed`) and the target language is enabled on the tenant.

## When not to use
- Adding/enabling a **new** language — backoffice-only; the agent can't (translate only into enabled codes).
- Creating source content → `adapto:content-seed`.
- Just checking the environment → `adapto:doctor`.

## Inputs
- **Source item(s)** by id or slug (`get` / `get-by-slug` / `list`).
- **Source + target language.** The target **must be enabled on the tenant** — discover via
  `adapto auth orgs --json`; an unsupported target → stop (can't add languages; backoffice-only).
- **Glossary** `_adapto_glossary` if present (cache to `.adapto/glossary.md`) — its terms/brand names are
  preserved **verbatim**. Optional; proceed without if absent (note it wasn't applied).
- **Project context** (`.adapto/project.md` / `_adapto_project_config`) for voice consistency.
- **Mode:** *single-item* (`<type>` + id/slug) or *corpus* (`<type>` + filter, e.g. `--status published`).

## Outputs
- Translated entries created via `create-translation` (linked by `translation_of_id`, `slug = source slug`).
- A **local per-language draft** at `.adapto/drafts/<YYYY-MM-DD>-<slug>.<lang>.md` (frontmatter with
  `language` + `translation_of`, and the translated body) — the reviewable file artifact, matching how
  `content-create` writes originals so a translation isn't reviewable only in the CMS.
- For pieces that have one, a **target-language `_adapto_seo` item** (meta/OG/JSON-LD localized), and the
  **ledger** updated (`pieces[].translations[<lang>]`).
- A report of **written + skipped** (with parity-failure reasons). Article translations carry `ai_generated`
  provenance.
- **Next step:** suggest **reviewing the per-language drafts** (the local md or the dev server), then
  **`adapto:publish`** to take them live. Offer to translate into another enabled language too.

## Preconditions
- **Preflight** with the `adapto:doctor` checks (CLAUDE.md §3.14).
- **Hard-block** on an authenticated CLI (`adapto auth me`) **and** a selected tenant — this skill writes.
  Confirm the **working tenant** first (CLAUDE.md §3.5); never assume the active one.
- **Top model tier required:** if the session/sub-agent can't run at Opus-class, **warn and stop** — don't
  translate at a lower tier.
- `adapto` CLI `>= 0.1.1`.

## Plan phase
Generate + validate; **no CMS writes** yet.
1. List the items to translate (per type), source → target language, counts.
2. **Translate each item — Opus-class.** Translate human-readable text only; **preserve** HTML markup,
   paragraph breaks, media placements, references/ids, dates, enums, and glossary terms. **Microcopy:
   translate the `value` only — never the `key`.** Apply the
   [prose-standards.md](../../shared/prose-standards.md) **principles** in the target language (§6: active
   voice, no filler, no formulaic contrasts) — never *introduce* slop the source doesn't have, and never
   rewrite a slop-y source (structural parity wins).
3. **Type-aware structural-parity gate** (deterministic, on the generated output):
   ```
   Articles / Pages (HTML content): paragraph count, HTML-tag count, media-placement count must match source.
   Collection items: HTML/rich_text fields get the HTML parity check; plain-text non-empty; non-text fields copied unchanged.
   Categories: HTML description → tag-parity; else non-empty.
   Microcopy: key unchanged AND interpolation tokens ({x}, {{x}}, %s, %d) preserved exactly.
   All types: every glossary term appears verbatim in the output.
   Mismatch on any check → SKIP that item and report the reason; never write a broken translation.
   ```
4. Present a **per-item pass/skip summary** + a few **spot-check diffs** (source vs translation), then wait for
   **one explicit `approve`**. No cost/token figures (§3.10). Nothing passes / empty set → say so and stop.

## Apply phase
Write the passing translations. `slug = source slug`, `--language <target>`. `--json` on every call.

```bash
SESSION_ID="agent_$(date -u +%Y-%m-%dT%H-%MZ)_$(printf '%04x' $RANDOM)"   # for Article --source

adapto articles create-translation <source_id> --title "<t>" --content "<HTML>" --slug <slug> \
  --author "<author>" --language <target> [--summary "<s>" --tags "<tags>"] \
  --source '{"type":"ai_generated","name":"'"$SESSION_ID"'"}' --json
adapto pages create-translation <source_id> --title "<t>" --content "<HTML>" --slug <slug> \
  --language <target> [--menu-label "<m>" --tags "<tags>"] --json
adapto collections items create-translation <cid> <source_id> --title "<t>" --slug <slug> \
  --language <target> --data-json '<translated text fields; non-text copied>' --status draft --json
adapto categories create-translation <source_id> --name "<n>" --slug <slug> --language <target> \
  [--description "<d>"] --json
adapto microcopy create-translation <source_id> --key <unchanged_key> --value "<translated>" \
  --language <target> [--tags "<tags>"] --json

# Idempotency — before creating, check existing translations for the target language:
adapto articles translations <source_id> --json     # (and the analogous `<type> translations <id>`)
```

- **Idempotent:** skip items already translated into the target language (or offer to update).
- **Translate the piece's SEO metadata too.** If the source has an `_adapto_seo` item, translate its text
  fields (`meta_title`, `meta_description`, `og_*`, and the human-readable text inside `json_ld`) — Opus, with
  HTML parity on any markup — and create/update the **target-language `_adapto_seo` item** (keep `target_slug`,
  `content_type`, `content_id`, and enums **unchanged**). Then record it in the ledger
  (`pieces[].translations[<lang>]` = the new content + seo ids/status).
- ⚠️ `articles`/`pages` `create-translation` have **no `--status` flag** — the translation may inherit the
  source status, so translating a *published* item could publish the translation. The batch
  approval-before-write is the safety gate; this is an item to **verify live** (don't assume `draft`).
  Collection items support `--status draft`.
- **Persist a local draft** for each written translation: `.adapto/drafts/<YYYY-MM-DD>-<slug>.<lang>.md`
  (frontmatter with `language` + `translation_of: <source-slug>`, and the translated body) — so translations
  are reviewable as files like originals, not only in the CMS/dev server.
- Report **written + skipped** (with parity reasons) — judge success from each call's `--json`, not the shell
  exit code, and end the loop exit 0 on success so a clean batch never shows a red `Error: Exit code 1` (§8).
- **Then restart the dev server (stop→start) and keep it running** so the user sees the new translations —
  **never kill it** (starters sync content at startup — §14).

## Errors and recovery
- **Target language not enabled** → stop; list the tenant's enabled codes and note adding one is
  backoffice-only.
- **Source not found** (bad id/slug) → stop with the lookup error.
- **Parity mismatch** → skip that item, report the failing check; never write it. Offer a re-translate retry.
- **Partial failure in a corpus loop** → report what was written, then stop (re-run is safe — idempotent).
- **Glossary missing** → proceed without it; note it wasn't applied.
- **Not authenticated / no tenant** → stop; route to `adapto auth login` + tenant selection.
- **Top model tier unavailable** → warn and stop; don't downgrade.

## Forbidden actions
- Never translate at a lower model tier — translation is Opus-class only (§7).
- Never write a translation that fails the structural-parity gate.
- Never introduce AI-tell prose the source doesn't have ([prose-standards.md](../../shared/prose-standards.md)
  §6) — and never "fix" the source's prose at the cost of parity.
- Never translate a microcopy `key` (it's an identifier) — only the `value`.
- Never invent or "enable" a language — translate only into tenant-enabled codes (§5).
- Never omit `--source` on an Article translation (it would mislabel as `internal`/`CLI`).
- Never write without an approved plan (§3.8); never assume the working tenant (§3.5).
- Never modify the scaffolded read-client (§3.11 / [forbidden-actions.md](../../shared/forbidden-actions.md)).
