# Reserved Adapto collections (`_adapto_*`)

The skill pack stores its own project context inside Adapto as custom collections, by convention
prefixed `_adapto_`. They are created/synced via the CLI like any collection (`adapto collections
create …` — see [cli-cheatsheet.md](cli-cheatsheet.md)).

| Slug | Purpose | Owned by |
|---|---|---|
| `_adapto_project_config` | Single source of truth: project type, vertical, ICPs, brand voice, writing do's & don'ts, one-line pitch | `adapto:project-define` |
| `_adapto_glossary` | Do-not-translate terms, brand names, technical vocabulary | written by `adapto:project-define`; read by `adapto:translate` |
| `_adapto_seo` | Per-piece SEO metadata: meta title/description, canonical, keywords, OG, JSON-LD — one item per content piece per language | provisioned by `adapto:schema-apply`; written by `adapto:content-upload` (mirrored from draft frontmatter); read by `adapto:seo-wire` |

## Rules
- **Source of truth is the CMS, not the repo.** Per session, fetch via CLI and cache read-only into
  `.adapto/project.md` / `.adapto/glossary.md` (gitignored). All edits go agent → CLI → CMS, never
  local-only.
- **`adapto:project-define` is a short, skippable Q&A** — concise questions with
  example options to pick from or a free-form answer; the user can skip the whole step.
- Create with required fields `--name --slug --description --language`, plus `--fields-json`
  (`FieldDefinitionModel[]`: `name`, `label`, `type`, `required?`, `multiple?`, `options?`,
  `related_collection?`, `default_value?`, `validation?` — field-type vocabulary in
  [cli-cheatsheet.md](cli-cheatsheet.md)).

## ⚠ Unverified — confirm before building `adapto:project-define` (open question §11.2)
Whether Adapto accepts/reserves `_adapto_*` slugs server-side is **not confirmed** — the CLI does no
client-side slug validation, so this is purely a server-side question. If underscore-prefixed slugs are
rejected, fall back to a non-underscore convention (e.g. `adapto-project-config`) and update this file — the
local project brain; server-side `_adapto_*` reservation is still unverified.

## `_adapto_project_config` field-set (CMS summary of the local brain)
A flattened **summary** of the local `.adapto/project/` brain (the rich facets stay local — see
[studio.md](studio.md) §2): `project_type`, `summary` (one-sentence purpose), `vertical`, `icps`,
`brand_voice`, `tone_rules` (writing do's & don'ts), `value_prop` (one-line pitch). Open (§11.6): whether
Adapto reserves any fields or it's fully user-defined.

## `_adapto_seo` field-set (`FieldDefinitionModel[]`)
One item per content piece per language; keyed by `target_slug` + `content_type`. Fields:
`target_slug` (text, required), `content_type` (select: `article|page|collection_item`), `content_id` (text),
`meta_title` (text), `meta_description` (textarea), `canonical_url` (url), `keywords` (text, comma-sep),
`og_title` (text), `og_description` (textarea), `og_image` (url), `json_ld` (textarea — a **stringified** JSON
array). Item `slug` = `seo-<target_slug>`, `status` = `draft`. **Reserved-slug fallback:** if `_adapto_seo` is
rejected server-side, fall back to `adapto-seo` (same pattern as `_adapto_project_config`).
