# Adapto CLI cheatsheet (verified)

> **Source of truth for the `adapto` CLI write path.** Verified against `adaptocms/adapto-cms-cli`
> source + embedded `adapto llm-info` on **2026-06-03, re-verified 2026-07-21 (CLI v0.1.1, pre-1.0)**. Re-sync after any CLI upgrade
> (`adapto llm-info`), and re-apply the corrections in the "Gotchas" section below — the raw
> `llm-info` output does **not** include them, and some details are out of date.
>
> The agent talks to the Backend API **only through this CLI**. Never call `api.adaptocms.com`
> directly, never read/echo credential files. All commands accept `--json` (use it — parse, don't scrape).

---

## 0. Gotchas the raw `llm-info` won't tell you (read first)

1. **Credentials live at `~/.config/adapto/credentials.json`** (file `0600`, dir `0700`), holding the
   bearer **access + refresh tokens**. ⚠️ `adapto llm-info` wrongly says `~/.adapto/credentials.json`
   — the code is authoritative. Never `cat`/echo/log this file.
2. **`--source` is articles-only and defaults to `{"type":"internal","name":"CLI"}`.** Pages, collection
   items, categories, microcopy have **no** `source` field. Agent article writes MUST pass
   `--source '{"type":"ai_generated","name":"<session_id>"}'` or they're mislabeled.
3. **Batch exists for collection items only** (`collections items create-batch`). Articles, pages,
   categories, microcopy are one create call per item — loop, and handle partial failures.
4. **No list filter on `source.*`.** Filters are a fixed set; provenance is **audit-only** — no query,
   filter, or rollback by source. (Rollback/backup are out of scope in this variation.)
5. **Language codes are tenant-defined.** `llm-info` says ISO 639-1 (`en`); the starters use `en-US`.
   Discover the real set with `adapto auth orgs` (shows each tenant's languages) and use those strings
   verbatim. Never pass a bare name (`Spanish`).
6. **Required flags are prompted in a TTY, but ERROR in non-TTY** (agent/CI). Always pass every required
   flag explicitly when scripting.
7. **Read-client = `adapto-client-sdk` (published on npm)**, wrapped as `src/lib/adapto.ts` in the scaffold — the read side, not part of this CLI. (The scoped `@adaptocms/sdk` name is unpublished.) Frontends read
   via the client that `create-adapto-app` bundles (this pack doesn't ship one).

---

## 1. Global flags & env (every command)

| Flag | Env | Purpose |
|---|---|---|
| `--api-url` | `ADAPTO_API_URL` | Backend base URL (default `https://api.adaptocms.com`) |
| `--token` | `ADAPTO_TOKEN` | Bearer token; overrides stored credential |
| `--tenant-id` | `ADAPTO_TENANT_ID` | Tenant scope; overrides stored credential |
| `--json` | — | Machine-readable JSON instead of a table |
| `--verbose` | — | HTTP request/response debugging |

**List/pagination flags** (on `list` subcommands): `--status` (where applicable), `--keyword`,
`--language`, `--tag`/`--category`/`--parent-id` (per type), `--field` (sort field), `--order`
(`asc|desc`), `--page`, `--limit`. Responses include `total`, `page`, `pages`.

**There is no `source` filter on any list command.**

---

## 2. Auth (`adapto auth …`)

| Command | Notes |
|---|---|
| `login --email <e> --password <p>` | Saves access+refresh tokens; resolves/prompts tenant. Password prompted if omitted in a TTY. |
| `register --email --password [--first-name --last-name]` | New account; sends an activation email. Then `auth activate --token <token-or-URL>` **logs you in + saves creds** (no separate login step). |
| `refresh [--refresh-token]` / `logout [--refresh-token]` | Rotate / revoke. Defaults to stored token. |
| `me` | Current user (use as an auth-valid check). |
| `orgs` | Lists orgs → tenants **and each tenant's enabled languages** (use for locale discovery). |
| `switch-tenant [--tenant-id]` | Set active tenant (interactive picker if omitted). |
| `change-password`, `request-password-reset`, `reset-password --token`, `activate --token`, `resend-activation` | Account lifecycle. |
| `login-github [--redirect-uri]` → `callback-github --code [--redirect-uri]` | Manual two-step OAuth (returns a URL to visit). |
| `login-google --credential <id_token>` | Google ID-token login. |

**First project (brand-new account, zero tenants):** `adapto onboard --project-name "<n>" [--default-language <c>] [--languages <c,c>]` (top-level command) — creates the first org + project, issues an API key, and sets it active in one call. `--json` returns the key **value**: write it to `.env` **silently** (never print), and don't `api-key issue` another. The `register → activate → onboard → key` flow is fully terminal; the only human step is pasting the activation token.

⚠ **The agent never runs the auth commands.** `login` / `register` / `activate` (and the tenant picker) are
interactive: the CLI prompts for each field in a TTY, and the agent has none — **not even behind `!`**. Hand
the user the **bare** command to run in a **new terminal window**; don't paste credential flags inline
(conventions §10a). The flag forms above are the reference/CI shape, not what you show a user.

**Headless/agent path:** export `ADAPTO_TOKEN` + `ADAPTO_TENANT_ID`. **No device-code flow exists.**
In non-TTY with multiple tenants you must pass `--tenant-id`/`ADAPTO_TENANT_ID`.

---

## 3. Articles (`adapto articles …`) — the only type with provenance

- `list [--status draft|published|archived] [--category <id>] [--tag <t>] [--keyword] [--language] [--field --order --page --limit]`
- `create --title --content --slug --author --language [--summary --status --tags --source --media-json]`
- `get <id>` · `get-by-slug <slug>` · `update <id> [same flags]` · `delete <id>`
- `publish <id>` · `archive <id>`
- `translations <id>` · `create-translation <source_id> --title --content --slug --author --language [--summary --tags --source --media-json]`
- `categories <id>` (list category IDs)

**`--source` (JSON blob → `ArticleSourceModel`):**
```json
{ "type": "ai_generated", "name": "<session_id>", "author": "<git email>", "url": "<git remote>", "published_date": 1717286400, "license": null }
```
`type` ∈ `internal | external | user_submitted | ai_generated`. `name` required. Omitting `--source`
→ `{"type":"internal","name":"CLI"}` (wrong for agent content).

Required (non-TTY): `--title --content --slug --author --language`. **No batch — loop creates.**

⚠️ **`content` is HTML, not Markdown.** Article (and page) `content` is rendered with `set:html` by the
starters, so Markdown seeded as `##`/`-` shows up as **raw text**. Always pass HTML (`<h2>…</h2>`,
`<p>…</p>`, `<ul><li>…</li></ul>`). (The API field is just "content: string" with no format hint — this is
a starter-render convention, verified 2026-06.) The `content-seed`/`translate` skills must generate HTML.

```bash
adapto articles create \
  --title "Getting Started" --content "<p>Hi</p>" --slug getting-started \
  --author "Editorial" --language en --status draft \
  --source '{"type":"ai_generated","name":"agent_session_2026-06-03_a1b2"}' --json
```

---

## 4. Pages (`adapto pages …`) — no `source`, no batch

- `list [--status --tag --keyword --language --field --order --page --limit]`
- `create --title --content --slug --language [--menu-label --parent-id --status --tags --media-json]`
- `get <id>` · `get-by-slug <slug>` · `update <id>` · `delete <id>` · `publish <id>` · `archive <id>`
- `translations <id>` · `create-translation <source_id> --title --content --slug --language [--menu-label --parent-id --tags --media-json]`

⚠️ No `--source` — pages can't be provenance-tagged.

---

## 5. Custom collections (`adapto collections …`) — schemas ARE creatable here

**Collections (the schema):**
- `list [--keyword --language --field --order --page --limit]`
- `create --name --slug --description --language [--fields-json --status]`  ← `--description` & `--language` **required**
- `get <id>` · `get-by-slug <slug>` · `update <id> [--name --slug --description --language --fields-json --status]` · `delete <id>`

**`--fields-json` = `FieldDefinitionModel[]`:**
```json
[
  { "name": "role", "label": "Role", "type": "text", "required": true },
  { "name": "level", "label": "Level", "type": "select", "options": [{"label":"Junior","value":"jr"}], "multiple": false },
  { "name": "manager", "label": "Manager", "type": "reference", "related_collection": "<collection_id>" }
]
```
Per-field keys: `name`, `label`, `type`, `required?`, `multiple?`, `options?` (`[{label,value}]`),
`related_collection?`, `default_value?`, `description?`, `validation?`.
Field-type vocabulary (15, verified against the engine's `FieldType` enum): `text, textarea, rich_text,
number, date, date_range, boolean, select, multi_select, reference, image, file, url, email, color`.

⚠️ **`multiple: true` is only valid on some types.** The server validates this and **rejects the whole
create** — `Bad request: Field <name> of type <type> cannot be multiple`.

| `multiple: true` allowed | `multiple: true` REJECTED |
|---|---|
| `text, textarea, number, date, select, reference, image, file, url, email, color` | `multi_select`, `boolean`, `rich_text`, `date_range` |

`multi_select` is the one that bites: it's **already** multi-valued, so adding `"multiple": true` is
invalid — use `{"type": "multi_select", "options": [...]}` with no `multiple` key, or
`{"type": "select", "multiple": true}`. Safest default: **omit `multiple` unless you need it.**

**Items (the rows):**
- `items list <collection_id> [--status --keyword --language --field --order --page --limit]`
- `items create <collection_id> --title --slug --language --data-json [--status --media-json]`
- `items create-batch <collection_id> --items-json '{"items":[ {…}, {…} ]}'`  ← **the only batch endpoint**
- `items get <cid> <item_id>` · `items get-by-slug <cid> <slug>` · `items update <cid> <item_id>` · `items delete <cid> <item_id>`
- `items publish <cid> <item_id>` · `items archive <cid> <item_id>`
- `items translations <cid> <item_id>` · `items create-translation <cid> <source_id> --title --slug --language --data-json [--status --media-json]`

`--data-json` is the keyed field map, e.g. `'{"role":"Engineer","level":"jr"}'`. Items have **no** `source`.

⚠️ **`--items-json` shape (verified against Backend OpenAPI `CustomCollectionBatchItemCreateModel`, 2026-06):**
it is an **object wrapping an `items` array — NOT a bare `[…]`** (passing a bare array fails with
`cannot unmarshal array into Go value of type client.CustomCollectionBatchItemCreateModel`). Each item is a
`CustomCollectionItemCreateModel` requiring **`title`, `slug`, `language`, and `data`** (`data` = the keyed
custom-field map, same as single-create's `--data-json` — custom fields live here, **not** at the item's top
level). Optional per item: `status` (default `draft`), `media_objects_placements`, `meta_data`.

```bash
adapto collections items create-batch <collection_id> --items-json '{
  "items": [
    {"title":"Maya Tan","slug":"maya-tan","language":"en-US","status":"published","data":{"role":"Engineer"}}
  ]
}'
```

After a batch, **confirm what landed with `items list`** rather than relying on the response, and **don't
re-run a batch blindly** — it isn't idempotent (a re-run duplicates). Filter with `get-by-slug` first so a
re-run only includes new slugs.

---

## 6. Categories (`adapto categories …`)

`list [--parent-id --keyword --language …]` · `create --name --slug --language [--description --parent-id]` ·
`get`/`get-by-slug`/`update`/`delete` · `subcategories <id>` · `articles <category_id>` ·
`add-article <cid> <aid>` · `remove-article <cid> <aid>` · `translations <id>` ·
`create-translation <source_id> --name --slug --language [--description --parent-id]`. No batch, no `source`.

---

## 7. Microcopy (`adapto microcopy …`)

`list [--language --tags]` · `count [--language --tags]` ·
`create --key --value --language [--tags --translation-of <source_id>]` ·
`get <id>` · `get-by-key <key> [--language]` · `get-by-language <language>` ·
`update <id> [--key --value --language --tags]` · `delete <id>` ·
`translations <id>` · `create-translation <source_id> --key --value --language [--tags]`.

---

## 8. Files / media (`adapto files …`)

- `upload <path> [--tags]` → one-step: creates metadata + uploads, **returns full record incl. CDN URL**.
- `create-metadata --filename --content-type [--tags]` → `upload-by-id <file_id> <path>` (two-step).
- `list [--type --filename --content-type --tag --field --order --page --limit]` · `get <id>` · `update <id> [--filename --tags]` · `delete <id>`.
- Multipart: `multipart-init` → `multipart-upload` → `multipart-complete --parts '[…]'` / `multipart-abort`.

**Media placements** (`--media-json` on articles/pages/items) — JSON array of:
```json
[{ "placement_key": "hero_image",
   "media_object": { "id": "m1", "file_id": "<id>", "url": "https://media.adaptocms.com/…", "type": "image" },
   "alt_text": "…", "caption": null, "meta_data": null }]
```
`media_object.type` ∈ `image|video|audio|document|youtube|vimeo|tiktok|instagram_reel|instagram_post|other`.

---

## 9. Status / health (`adapto status`)

- `adapto status` → API health. `adapto status version` → API version. `adapto auth me` → auth valid.
  `adapto auth orgs` → tenant linked + enabled languages. (Basis for `adapto:doctor`.)

---

## 10. Status enums (shared)

`draft | published | archived | deleted` on articles, pages, collection items, collections.
⚠️ Only `draft|published|archived` are valid **filter** values; `deleted` is a state you can't filter by.

---

## 11. Image transforms (read side, no CLI)

Edge URL params on `https://media.adaptocms.com/…`: `w`, `h`, `format` (`webp`/`avif`), `quality`. No build pipeline.
