---
name: adapto-schema-design
namespace: adapto
description: Propose a content schema from your project context — the custom collections (and Article categories) the site needs, plus an advisory map of which built-in types cover the rest. Writes a reviewable .adapto/schema-plan.json; no CMS writes. Pairs with adapto:schema-apply.
version: 0.1.0
requires:
  cli: ">=0.1.1"
  auth: false              # reads project context if authed; degrades to a short description otherwise
  project_context: false
mutates: false             # writes only a local plan file, never the CMS
---

# adapto:schema-design

Derives a **content schema** from your project context: the **custom collections** (and their fields) the
site needs, the **Article categories** worth setting up, and an **advisory map** of which built-in types
cover everything else. Its output is a reviewable, hand-editable **`.adapto/schema-plan.json`** that
`adapto:schema-apply` reads to do the actual writing. This skill makes **no CMS writes** — it's safe and
re-runnable.

## When to use
- "Design my content schema", "what collections do I need", "model my content".
- Right after `adapto:project-define`, and before `adapto:content-seed`.

## When not to use
- To actually create the collections/categories in Adapto → `adapto:schema-apply`.
- To seed content rows → `adapto:content-seed`.
- Just checking the environment → `adapto:doctor`.

## Inputs
- **Project context, if available** — read from the `.adapto/project.md` cache, or (when authenticated)
  `adapto collections get-by-slug _adapto_project_config --json`.
- **Existing collections, when authenticated** — `adapto collections list --json`, so the proposal reuses or
  skips what already exists instead of duplicating it.
- **If there's no project context** — ask for a **1–2 line site description** (a single, skippable question).

## Outputs
- **`.adapto/schema-plan.json`** — the reviewable proposal that `adapto:schema-apply` consumes. Shape:

```json
{
  "version": 1,
  "language": "en-US",
  "collections": [
    { "name": "Team", "slug": "team", "description": "Team members", "status": "draft",
      "fields": [
        { "name": "role", "label": "Role", "type": "text", "required": true },
        { "name": "manager", "label": "Manager", "type": "reference", "related_collection": "team" }
      ] }
  ],
  "categories": [ { "name": "Tutorials", "slug": "tutorials" } ],
  "advisory": { "articles": "blog posts / news", "pages": "static & marketing pages" }
}
```

- `related_collection` holds the **target collection's slug** — `adapto:schema-apply` resolves it to the real
  id at write time. `fields[]` entries are `FieldDefinitionModel` (keys: `name`, `label`, `type`, `required?`,
  `multiple?`, `options?` as `[{label,value}]`, `related_collection?`, `default_value?`, `description?`,
  `validation?` — see [cli-cheatsheet.md](../../shared/cli-cheatsheet.md) §5).
- A compact on-screen summary: N collections, M categories, and the advisory map. **No CMS writes.**

## The proposal (LLM step — Sonnet-class)

Present it as **pickable options**, not a wall of JSON ([conventions.md](../../shared/conventions.md) §10): what
it proposes, what it deliberately leaves to built-in types, and `Approve` / `Change something` / `Discuss this`.
Propose, from the context (or description):
- **Custom collections** — `name`, `slug`, `description`, and `fields[]` using only the **safe field-type
  vocabulary** (`text, textarea, rich_text, number, date, boolean, select, multi_select, reference, image,
  file, url, email, color` — cheatsheet §5). **Flag, don't guess,** on edge types.
- **Recommended Article categories** — a small, sensible taxonomy for the site.
- **An advisory map** — which built-in types cover the rest (`articles`, `pages`).

**Bias against over-creating.** If built-in Articles already cover blog posts, *say so in the advisory map* —
do **not** propose a "Posts" collection. Only propose a custom collection for genuinely structured,
repeating content the built-in types don't model (team members, case studies, products, events, …).

**Reserved collections are auto-managed — don't propose them.** `_adapto_seo` (per-piece SEO metadata),
`_adapto_project_config`, and `_adapto_glossary` are provisioned by their owning skills (`adapto:schema-apply`
ensures `_adapto_seo`; [reserved-slugs.md](../../shared/reserved-slugs.md)) — never put them in the plan.
**Schema loop:** `adapto:content-plan` may discover a content type a new piece needs and route back here;
re-running this skill to add a collection mid-cycle is expected and safe.

Present the proposal **compactly**, then take **one pass of edits** (add/remove/rename collections, tweak
fields) — don't interrogate field-by-field. Then write `.adapto/schema-plan.json` and report the path +
summary. Tell the user the next step is `adapto:schema-apply` (which they can run after eyeballing or
hand-editing the file).

## Preconditions
- **Preflight** with the `adapto:doctor` checks to learn the toolchain state.
- Auth is **not** required — but if the CLI is authenticated, use it to read project context and list
  existing collections so the proposal is grounded and dedup-aware.
- `adapto` CLI `>= 0.1.1`.

## Errors and recovery
- **No project context and the user skips the description** → stop; suggest running `adapto:project-define`
  first (or provide a one-line description) so the proposal isn't a guess.
- **Not authenticated** (can't list existing collections) → proceed from the project context/description and
  note that `adapto:schema-apply` reconciles against what's already in the CMS via `get-by-slug` (idempotent),
  so duplicates are avoided at apply time.
- **Project config cache and CMS disagree** → prefer the live CMS value when authed; otherwise use the cache
  and say which source was used.

## Forbidden actions
- Never write to the CMS — this skill is `mutates: false` (it only writes the local plan file).
- Never invent field `type`s outside the safe vocabulary; flag edge types for the user instead of guessing.
- Never propose a custom collection for content the built-in Articles/Pages already cover (use the advisory map).
- Never modify the scaffolded read-client ([forbidden-actions.md](../../shared/forbidden-actions.md)).
