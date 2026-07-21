---
name: adapto-seo-wire
namespace: adapto
description: Make stored SEO metadata actually render — a one-time, consent-gated, framework-aware setup that wires a head-render layer (title, meta, OG/Twitter, JSON-LD) reading the _adapto_seo collection, plus generates llms.txt / llms-full.txt from your content inventory. Edits your app templates (never the read-client), only after you approve the exact changes.
version: 0.1.0
requires:
  cli: ">=0.1.1"
  auth: false              # no CMS writes; reads _adapto_seo via the frontend at runtime
  project_context: true    # needs the scaffolded frontend + inventory
mutates: false             # no CMS content writes; the frontend/file edits are consent-gated (like scaffold/install)
---

# adapto:seo-wire

`adapto:content-upload` **stores** SEO metadata in `_adapto_seo`, but the starters render only `<title>`. This
skill **makes it render**: a **one-time, per-project** setup that installs a head-render layer reading
`_adapto_seo` (emitting `<title>`, meta description, OG/Twitter tags, and JSON-LD) and generates `llms.txt` /
`llms-full.txt` from your inventory. It is **consent-gated** and **only edits your own app templates** —
**never the read-client** ([forbidden-actions.md](../../shared/forbidden-actions.md); see
[seo-standards.md](../../shared/seo-standards.md) for what's rendered).

## When to use
- "Make my SEO/meta render", "wire up the head tags", "generate llms.txt", "the OG tags aren't showing".
- Once per project, after `adapto:content-upload` has written `_adapto_seo` items (or alongside the first upload).

## When not to use
- Storing metadata (that's `adapto:content-upload`, into `_adapto_seo`).
- Writing or uploading content → the content pipeline.
- Just checking the environment → `adapto:doctor`.

## Inputs
- The **scaffolded frontend** in the cwd, and its **framework** (Next / Astro / SvelteKit — detected as
  `adapto:doctor` does).
- The **`_adapto_seo`** collection (read at render time, by `target_slug`).
- **`inventory.md`** — the content list `llms.txt` is generated from.

## Outputs
- A **head-render layer** in the app's own templates (per framework: Next `generateMetadata` / Astro `<head>`
  in the layout / SvelteKit `<svelte:head>`) that reads `_adapto_seo` and emits title/description/OG/Twitter/JSON-LD.
- Generated **`llms.txt`** + **`llms-full.txt`** at the site root, from `inventory.md`.
- If you decline the edits: the exact per-framework **snippets** written to `.adapto/seo-render/<framework>/`
  for you to paste, plus instructions. Nothing is changed without consent.
- **Next step:** restart the dev server and check a page's `<head>` (and `/llms.txt`); re-run after big
  inventory changes to refresh `llms.txt`.

## Wiring (consent-gated)
1. **Detect the framework** and locate the layout/head entry point + the static/`public` dir.
2. **Inform + show the exact files/diffs** you'd add/change (the head component + the `llms.txt` generator/route),
   noting it edits **app templates, not the read-client**. Ask as a **pickable question**:
   **`Yes, wire it`** / **`Just give me the snippets`** (plus free-form).
3. **On consent:** write the head-render layer (reads `_adapto_seo` by `target_slug`; falls back to the
   content title when no metadata exists) and generate `llms.txt`/`llms-full.txt` from `inventory.md`.
   Idempotent — re-running updates rather than duplicating. **Per framework the real work differs — the
   scaffolds ship dynamic detail routes with little or no metadata:**
   - **Astro:** add meta/OG/JSON-LD to the single head component (`src/layouts/Layout.astro`).
   - **Next (App Router):** dynamic routes (`app/**/[slug]/page.tsx`, `[collection_slug]/[item_slug]`) export
     **no `generateMetadata`** — add an `async generateMetadata(props)` to each (`await params`), and inject
     JSON-LD as a `<script type="application/ld+json">` in the component tree.
   - **SvelteKit:** each detail route sets **only `<title>`** in `<svelte:head>` — thread SEO through the
     route's `+page.server.ts` `load` → `data` prop → `<svelte:head>` (env is server-private, so the fetch
     stays in `.server.ts`).
   - All three ship `src/lib/reserved.ts` (hides `_`-prefixed collections + shadow slugs
     `articles/collections/micro-copies/pages`) — respect it in nav/sitemap/`llms.txt`.
   - ⚠️ **`_adapto_seo` visibility:** `content-upload` writes those items as **draft**, and `adapto:publish`
     may have published only the content piece, not its SEO item — so a published site's read-client may not
     see the metadata. Ensure the piece's `_adapto_seo` item is **published too** (or that the fetch includes
     drafts via the key). **Verify a real page's rendered `<head>` after wiring — don't assume it renders.**
4. **If declined:** write the snippets to `.adapto/seo-render/<framework>/` + a short how-to; change nothing else.
5. **Then** tell the user to restart the dev server and verify the `<head>` + `/llms.txt`. If **you** started
   the dev server, leave it running (conventions §14).

## Preconditions
- **Preflight** with the `adapto:doctor` checks.
- A **scaffolded frontend** in the cwd (run `adapto:scaffold` first) on a supported framework.
- `_adapto_seo` should exist (provisioned by `adapto:schema-apply`); if absent, the layer still installs and
  simply renders title-only until metadata lands.
- `adapto` CLI `>= 0.1.1`. No auth/tenant needed (no CMS writes).

## Errors and recovery
- **Unsupported / undetected framework** → stop; emit the generic snippets to `.adapto/seo-render/` and explain.
- **Layout/head entry point not found** (starter changed) → don't guess-edit; show the user where to add the
  component and write the snippet.
- **User declines** → snippets-only path (above); never edit without consent.
- **`llms.txt` would expose unpublished/draft URLs** → include only published inventory entries; note the skip.

## Forbidden actions
- Never edit or replace the **read-client** (`src/lib/adapto.ts` + the published `adapto-client-sdk` it
  imports) — app templates only, and only with consent (forbidden-actions.md).
- Never make host/file changes without explicit **consent** — inform, show the diff, wait, then write.
- Never write CMS content (`mutates: false`).
- Never put draft-only or secret data into `llms.txt` / rendered tags.
