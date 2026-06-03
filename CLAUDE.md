# Adapto CMS Agent Skills

**Repo:** `adapto-cms-agent-skills` · **Package:** `@adaptocms/agent-skills` · **Status:** v1 greenfield

Authoritative project context for Claude Code. Read first, every session.

---

## 0. Verified ground truth (read before trusting anything below)

> **Status of this doc:** §1–§13 are the original design intent. Several decisions marked "locked"
> were written **before** the CLI/SDK were inspected and turned out to be wrong. This section is the
> corrected, source-verified baseline. **Where §0 conflicts with a later section, §0 wins** (later
> sections have been patched inline too).
>
> **Verified against:** `adaptocms/adapto-cms-cli` source + its embedded `adapto llm-info`, the three
> framework starters (`adapto-{next,astro,sveltekit}-client`), the `create-adapto-app` README, and the
> live Public/Backend OpenAPI specs. **Date: 2026-06-03, CLI v1.x.** Re-verify with `adapto llm-info`
> after any CLI upgrade. Full corrected command reference lives in `shared/cli-cheatsheet.md`.

**What is real (use freely):**
- **Full CRUD via the CLI** for articles, pages, categories, custom collections (+ items), files, microcopy — all against the Backend API.
- **Collection schemas are creatable via CLI:** `adapto collections create --name --slug --description --language --fields-json --status` (+ `update`/`delete`). `--description` and `--language` are **required**. Field definitions go in `--fields-json` as a `FieldDefinitionModel[]`.
- **Auth** = `adapto auth login --email --password` → saves access + refresh tokens to `~/.config/adapto/credentials.json` (file `0600`). Also `register/refresh/logout/me/switch-tenant/orgs`, password+activation commands, and manual OAuth (`login-github` → URL, `callback-github --code`; `login-google --credential`).
- **Headless/agent auth** = env vars `ADAPTO_TOKEN` + `ADAPTO_TENANT_ID` (+ optional `ADAPTO_API_URL`), bound automatically and overriding stored creds.
- **Provenance** = `--source '<json>'` on **articles only**, parsed into `ArticleSourceModel` (`{type, name, author?, url?, published_date?, license?}`). `type` enum: `internal | external | user_submitted | ai_generated`.
- **Tenant languages are discoverable at runtime:** `adapto auth orgs` lists each tenant's enabled language codes (so does `GET /available-languages`).
- **Translations:** `<type> create-translation <source_id>` for articles, pages, collection items, categories, microcopy.

**What is NOT real (do not design around it):**
- ❌ **No `@adaptocms/sdk` on npm** (404). All three starters vendor a hand-rolled `AdaptoSDK` class (`fetch` + `x-api-key`). The read path is "frontend → vendored client → Public API," not an installable SDK. `adapto:retrofit`/`scaffold` must generate/copy a client, **not** `npm install` one. **Strategy locked in §3.11 (vendor, don't depend) — usable, but drifts without an `npm update` path.**
- ❌ **No provenance on pages or collection items** — only articles carry `source`. Pages/items can't be tagged.
- ❌ **No filtering by `source.*`** anywhere. List filters are a fixed set (`status, language, keyword, tag, category, parent_id, field, order, page, limit`). Provenance-query rollback is impossible → rollback uses a **local session manifest of created IDs** (§3.7).
- ❌ **No batch create for articles/pages/categories/microcopy** — loop individual creates. Batch exists for **collection items only** (`collections items create-batch`).
- ❌ **No device-code / browser-poll auth flow.** (§3.5 originally invented both.)
- ❌ **`--source` defaults to `{"type":"internal","name":"CLI"}` when omitted** — agent writes MUST pass it explicitly or they're mislabeled as human/CLI content.

**Locale:** the accepted set is **tenant-defined**. CLI docs say ISO 639-1 (`en`); the starters run region-qualified codes (`en-US`, `ro-RO`). Never assume — **discover the tenant's enabled codes first** (`adapto auth orgs`) and use them verbatim. Never pass a bare language name (`Spanish`).

**Frontend `.env`** holds only `ADAPTO_API_URL` + `ADAPTO_API_KEY`; tenant ID is parsed from the key (`key.split('.')[1]`). Do **not** write `ADAPTO_TENANT_ID` into a frontend `.env` (that var is for the CLI/write side).

---

## 1. What this repo is

A pack of skills for AI coding agents (Claude Code, Cursor) that lets them operate Adapto CMS end-to-end: scaffold projects, design schemas, seed content, translate, run SEO, audit content, roll back.

**Target users:** developers using agentic IDEs/CLIs to build content-backed sites on Adapto CMS.

**Boundaries:**
- We **wrap** the existing Adapto CLI and read-side client. We don't replace them. (Note: there is no published `@adaptocms/sdk` — see §0.)
- We **don't** invent product behaviour. If `adapto-cms-cli` can't do it, the skill can't do it.
- We **don't** ship as MCP servers in v1. Skills are markdown + scripts only.

---

## 2. What Adapto CMS is (minimum needed to build)

Headless CMS. REST. Framework-agnostic (Astro / Next / SvelteKit starters shipped). Built-in i18n, media CDN with URL-parameter transforms, custom schemas, microcopy, full-text search.

**Two API surfaces:**

| Surface | Base URL | Auth | Use |
|---|---|---|---|
| Public API v1 | `https://public-api.adaptocms.com/v1` | `x-api-key` header | Read-only. Frontends, SSG builds. |
| Backend API | `https://api.adaptocms.com` | Bearer token | Full CRUD. CLI uses this. |

**Write path (this repo lives here):** agent → `adapto` CLI → Backend API
**Read path:** site/app → vendored read-client (`fetch` + `x-api-key`) → Public API. ⚠️ There is **no published `@adaptocms/sdk`** on npm today; the starters ship a hand-rolled `AdaptoSDK` class. See §0.

**Content types:** Articles, Pages, Categories, Custom Collections (user-defined schemas), Micro copy, Search, Languages. Translations linked via `translation_of_id`.

**Statuses:** `draft` | `published` | `archived` | `deleted`. Note: only `draft|published|archived` are accepted as list **filter** values; `deleted` is a state, not a filter.

**Provenance — Articles only:** only `ArticleCreateModel` has a `source` object — `type` (enum: `internal | external | user_submitted | ai_generated`), `name`, optional `url`, `author`, `published_date` (unix int), `license`. ⚠️ **Pages and Collection items have no `source` field** and cannot be provenance-tagged. (Earlier drafts said "Articles/Pages" — wrong.)

---

## 3. Locked architecture decisions

### 3.1 Skill installation model: hybrid

- **One global skill:** `adapto:install`. Bootstraps new repos via `create-adapto-app` or installs the skill pack into existing repos. Like `npm create *`.
- **All other skills are per-repo.** Live in target project's `.claude/skills/` and/or `.cursor/rules/`. Version-pinned in `.adapto/skills.lock`. Project context lives in `.adapto/`.
- Exception: `adapto:doctor` ships both globally and per-repo (debugging utility).

### 3.2 IDE targets at launch

Claude Code + Cursor. Generate per-IDE config (`CLAUDE.md`, `.cursor/rules/*.mdc`) from one source of truth in `/skills/<skill>/SKILL.md`.

Future: `AGENTS.md` for emerging IDE-agnostic convention.

### 3.3 Skill namespace

`adapto:*` (e.g. `adapto:scaffold`). Matches Anthropic plugin convention (`sales:*`, `legal:*`).

### 3.4 Project definer = single source of truth in CMS

Lives in reserved collection `_adapto_project_config`. Holds: project type, vertical, ICPs, brand voice, do's/don'ts, tone rules, positioning.

Per-session: agent fetches via CLI, caches read-only into `.adapto/project.md` for fast lookup. **All edits go agent → CLI → CMS**, never local-only.

Same pattern for `_adapto_glossary` (do-not-translate terms, brand names, technical vocabulary).

✅ **Verified buildable:** `adapto collections create` exists, so these reserved collections can be created/synced via CLI (`--name --slug --description --language --fields-json --status`; `--description` and `--language` are required). Still open: whether the server accepts `_adapto_*` slugs (§11.2).

### 3.5 Token / auth handling

| Token | Where | Who touches |
|---|---|---|
| Bearer access + refresh (write) | CLI-managed in `~/.config/adapto/credentials.json` (file `0600`, dir `0700`) | CLI only. **Agent never reads or interpolates.** |
| Public API key (read) | frontend `.env` (gitignored) | Skill can write it. Agent uses by name (`ADAPTO_API_KEY`), never echoes value. **Tenant ID is embedded in the key — no separate tenant var in the frontend `.env`.** |
| `ADAPTO_TENANT_ID` (write side) | shell env / CI secret | Selects tenant for CLI/agent writes. Not part of the frontend `.env`. |

> ⚠️ The CLI's own `adapto llm-info` text misstates the credentials path as `~/.adapto/credentials.json`. The **code** is authoritative: `~/.config/adapto/credentials.json`. Don't propagate the llm-info bug.

**Auth flows that actually exist (verified in CLI source):**
- **Interactive:** `adapto auth login --email <e> --password <p>` (password prompted if omitted in a TTY). Saves access + refresh tokens, then resolves/prompts tenant.
- **Headless/agent (the real path):** export `ADAPTO_TOKEN` (bearer) + `ADAPTO_TENANT_ID`; these override stored credentials. **No device-code flow exists.**
- **OAuth (manual two-step):** `adapto auth login-github` returns an OAuth URL → user visits it → `adapto auth callback-github --code <c>`. Also `adapto auth login-google --credential <id_token>`.
- **Tenant:** auto-selected when the account has exactly one; otherwise interactive picker, or `adapto auth switch-tenant --tenant-id <id>`. In non-TTY with multiple tenants you **must** pass `--tenant-id`/`ADAPTO_TENANT_ID`.

Agent role on missing auth: instruct the user to run `adapto auth login --email ...` (or set `ADAPTO_TOKEN`/`ADAPTO_TENANT_ID`), then re-run `adapto auth me` to confirm before proceeding. There is nothing to "poll." (Earlier drafts described browser-poll and `--device` flows — **neither exists.**)

### 3.6 Provenance + session tagging

Tag every agent **article** write via the `--source` flag, which takes a **full JSON blob**:

```json
{
  "type": "ai_generated",
  "name": "agent_session_2026-06-03_a1b2",
  "author": "<git user.email or system user>",
  "url": "<git remote origin if available>"
}
```

`type` is the fixed enum (`internal | external | user_submitted | ai_generated`); `name` carries the session ID. Pass it as `adapto articles create ... --source '<json>'`.

⚠️ **Hard requirement:** if `--source` is omitted, the CLI silently defaults to `{"type":"internal","name":"CLI"}`. Article writes that forget `--source` are mislabeled as human/CLI content — always pass it explicitly.

⚠️ **Scope limit:** `--source` exists on **articles only** (incl. article `create-translation`). Pages and collection items have no `source` field, so track those via the session manifest (§3.7) instead.

✅ **Open question 3.6.a — RESOLVED:** `--source` accepts a full JSON blob (parsed into `ArticleSourceModel`). No `--source-name`/`--source-type` sub-flags.

❌ **Provenance cannot drive rollback** — no endpoint filters by `source.*`; see §3.7.

### 3.7 Rollback strategy

**v1: local session manifest, delete-by-ID.** No list endpoint filters by `source.*` (filters are a fixed set), and only articles carry provenance — so "query by `source.name`" rollback is **impossible**. Instead, at apply time every mutating skill **appends each created item's `{type, id, collection_id?}` to `.adapto/sessions/<session_id>.json`**. Rollback reads that manifest and calls `adapto <type> delete <id>` (delete exists for every type). The `source` tag stays useful for backoffice audit, just not for querying.

Limitations (document in the skill):
- Doesn't restore **overwrites** — if the agent updated an existing item, the prior version is gone.
- Manifest is local — if `.adapto/sessions/` is lost, the rollback handle is lost. Mitigate by also stamping the session ID into article `source.name` (audit trail) and printing the manifest path at apply time.

**v2 (deferred):** backup API + restore. Flagged 🟠 — needs Adapto-side work.

### 3.8 Plan-then-apply (enforced)

Every mutating skill is **two phases**:

1. **Plan phase:** print structured plan (resources to create/modify, est. tokens, est. cost, models used). Wait for explicit user `approve`.
2. **Apply phase:** runs only after approval.

Not a flag. Required two-call pattern in skill design. Plan output must be machine-parseable (JSON or YAML in a fence).

### 3.9 Draft-first

All writes go in as `status=draft`. User reviews on local dev server (SDK reads drafts via public key today), then publishes via `adapto:publish` or backoffice.

⚠️ **Known Adapto-side issue:** any public-key holder currently reads drafts (no scope on public keys). On Adapto roadmap. Skills should be written assuming future fix lands (separate preview key or scope flag).

### 3.10 Cost estimation

No hard cap. Skill must surface estimate at plan phase:

```
Step                                Model           Tokens (est)   Cost (est)
─────────────────────────────────────────────────────────────────────────────
Fetch 24 pages                      Haiku-class     ~120k          $0.04
Infer schema from HTML              Sonnet-class    ~200k          $0.08
Reconstruct 24 posts                Sonnet-class    ~800k          $0.31
Translate to es-MX                  Opus-class      ~600k          $0.62
SEO meta (24 items)                 Sonnet-class    ~280k          $0.11
                                                                  ─────
Total                                                              $1.16

Billed to: Anthropic API key (from ANTHROPIC_API_KEY — never print the value)
Variance: ±30% on page size.

[approve]  [revise scope]  [cancel]
```

Three buttons. Revise reopens scope dialog.

⚠️ Costing note: only **collection items** support batch writes. Articles/pages/categories/microcopy are one CLI call per item — size estimates and rate-limit/retry handling must assume per-item loops.

### 3.11 Read-client strategy: vendor, don't depend

**Decision:** the frontend read-client is **vendored into the target project, not installed as a package.** There is no published `@adaptocms/sdk` (§0); each starter ships a hand-rolled `AdaptoSDK` class (`fetch` + `x-api-key`) and `create-adapto-app` drops it in. The client is **one canonical class + a ~4-line per-framework `config.ts` env shim** — verified: Next and SvelteKit `adapto-sdk.ts` differ by 2 comment lines; only env access differs (Next `process.env`, SvelteKit `$env/dynamic/private`, Astro `import.meta.env`).

The **agent never imports this client** — agent writes go through the CLI. It exists only so generated frontend code can read content. The `templates/adapto-client/` files are used by **`adapto:retrofit` only**:

- **`adapto:scaffold` (new project):** does **not** touch these templates — `create-adapto-app` already includes its own (Adapto-maintained) client. Just wrap the scaffolder; never overwrite the scaffolder's client.
- **`adapto:retrofit` (existing repo not made with `create-adapto-app`):** vendor the client = copy the framework-matching `adapto-sdk.ts` + types + `config` shim into the repo, then generate ONE example route that uses it. (The drift caveat below applies to this copy only — the scaffold path's client is Adapto-maintained.)

**Mechanic (chosen): template in the pack.** Keep `templates/adapto-client/` = one core `adapto-sdk.ts` + per-framework `config.ts` shims, each with a header comment pinning the upstream starter + commit it was copied from. Deterministic for the agent, clear provenance for updates. (Alternative considered: fetch the matching starter's file at retrofit time — single source of truth, but adds a network dependency to the skill. **Not chosen.**)

⚠️ **Usable today, with a caveat — track this:** vendoring means **no `npm update` path**. If Adapto changes the Public API, vendored copies drift silently with no version signal. Mitigations:
- Pin the upstream starter commit in the template header; periodically re-diff against upstream and refresh the template.
- `adapto:doctor` should smoke-check the vendored client against the live Public API and warn if shapes diverge.
- If/when `@adaptocms/sdk` ships on npm, **revisit this decision** — switching to the package removes the drift risk. (Founder flag: confirm whether an npm SDK is planned — see §11.)

---

## 4. Proposed repo structure

```
adapto-cms-agent-skills/
├── README.md                       # public-facing install + usage
├── CLAUDE.md                       # this file
├── LICENSE                         # MIT (TBD, see open q)
├── package.json                    # @adaptocms/agent-skills
│
├── install.sh                      # curl-pipe-bash installer
├── update.sh
│
├── skills/
│   ├── adapto-install/             # global bootstrap
│   │   ├── SKILL.md
│   │   └── scripts/
│   ├── adapto-doctor/              # global + per-repo
│   ├── adapto-scaffold/            # per-repo: wraps create-adapto-app
│   ├── adapto-retrofit/            # per-repo: existing repo integration
│   ├── adapto-project-define/      # per-repo: _adapto_project_config
│   ├── adapto-schema-design/       # per-repo: PLAN
│   ├── adapto-schema-apply/        # per-repo: APPLY
│   ├── adapto-content-seed/        # per-repo: initial content (drafts)
│   ├── adapto-translate/           # per-repo: single + corpus
│   └── adapto-rollback/            # per-repo: session-manifest (delete-by-ID)
│
├── shared/
│   ├── conventions.md              # plan-then-apply, draft-first, provenance
│   ├── forbidden-actions.md        # token hygiene, secret handling
│   ├── sub-agents.md               # model tier guide (see §6)
│   ├── cost-estimation.md          # UX pattern + API spec
│   ├── cli-cheatsheet.md           # synced from `adapto llm-info`
│   ├── reserved-slugs.md           # _adapto_project_config, _adapto_glossary
│   └── api-references.md           # links to live Adapto docs (see §7)
│
├── templates/
│   ├── claude-md.tpl               # CLAUDE.md generated into target project
│   ├── cursor-rule.mdc.tpl         # per-skill .cursor/rules/
│   ├── env-example.tpl
│   ├── gitignore.tpl
│   ├── adapto-client/              # vendored read-client (§3.11): adapto-sdk.ts + per-framework config shims
│   └── agents-md.tpl               # future
│
├── scripts/
│   ├── render-skills.ts            # SKILL.md → CLAUDE.md / Cursor format
│   ├── validate-skills.ts          # frontmatter lint
│   ├── sync-cli-spec.ts            # pull adapto llm-info → cli-cheatsheet.md
│   └── test-skill.ts
│
└── tests/                          # per-skill smoke tests
```

---

## 5. v1 ship list

10 skills. Cut hard. Everything else is v1.5 or v2.

| # | Skill | Type | Mutates | Notes |
|---|---|---|---|---|
| 1 | `adapto:install` | Global | – | Bootstrap entry point. Detects new vs existing repo. |
| 2 | `adapto:doctor` | Global + per-repo | – | CLI present? Auth valid? Tenant linked? Framework supported? |
| 3 | `adapto:scaffold` | Per-repo | – | Wraps `npx create-adapto-app`. New project flow. |
| 4 | `adapto:retrofit` | Per-repo | Yes | Existing repo: detect framework → add a vendored read-client (no npm SDK exists) → write `.env`/`.gitignore` → generate ONE example route. Does not refactor existing components. |
| 5 | `adapto:project-define` | Per-repo | Yes | Creates/syncs `_adapto_project_config` collection. Interview-driven. |
| 6 | `adapto:schema-design` | Per-repo | – | Proposes content schema from project context. Plan output. |
| 7 | `adapto:schema-apply` | Per-repo | Yes | Writes schema via CLI. Separated from design to enforce plan-then-apply. |
| 8 | `adapto:content-seed` | Per-repo | Yes | Initial content as drafts (per-item creates for articles/pages; batch for collection items), with provenance (articles) + session manifest. |
| 9 | `adapto:translate` | Per-repo | Yes | Single-item + corpus. Structural validation (paragraph/tag/media counts). Glossary-aware. |
| 10 | `adapto:rollback` | Per-repo | Yes | Session-manifest (delete-by-ID) rollback; see §3.7. v1 limitations documented. |

### v1.5 (fast follow)
`adapto:site-scrape`, `adapto:content-reconstruct`, `adapto:media-rehost`, `adapto:seo-meta`, `adapto:schema-org`, `adapto:microcopy-init`, `adapto:microcopy-extract`, `adapto:publish`.

### v2
`adapto:brand-voice-check`, `adapto:content-audit`, `adapto:faq-build`, `adapto:internal-links`, `adapto:locale-add`, `adapto:translation-audit`, `adapto:image-params`, `adapto:responsive-image`, `adapto:backup` (needs API).

---

## 6. SKILL.md format spec

Every skill ships a `SKILL.md` at `/skills/<skill>/SKILL.md`. Required structure:

```markdown
---
name: adapto-<skill-name>
namespace: adapto
description: <plain-english trigger description, 1-2 sentences>
version: 0.1.0
requires:
  cli: ">=1.0.0"        # adapto CLI version range
  auth: true            # requires authenticated CLI
  project_context: true # requires .adapto/ in repo
mutates: true           # if true, must follow plan-then-apply
---
```

Required body sections:

- `## When to use` — trigger phrases, plain-english
- `## When not to use` — anti-patterns
- `## Inputs` — what the skill needs from user/context
- `## Outputs` — what the skill produces
- `## Preconditions` — auth state, CLI version, project context
- `## Plan phase` — only if `mutates: true`
- `## Apply phase` — only if `mutates: true`
- `## Errors and recovery` — expected failure modes
- `## Forbidden actions` — skill-specific never-do list

---

## 7. Sub-agent model tier guide

| Task | Tier | Reason |
|---|---|---|
| HTML scrape, simple parse | Haiku-class | Cheap, near-deterministic |
| Image alt text (single) | Haiku-class | One-shot description |
| Schema inference from HTML | Sonnet-class | Structural reasoning |
| Content reconstruction | Sonnet-class | Style preservation |
| SEO meta generation | Sonnet-class | Pattern + creativity |
| FAQ generation | Sonnet-class | Content shaping |
| Internal link planning | Sonnet-class | Corpus reasoning |
| Brand voice check | Sonnet-class | Comparative reasoning |
| **Translation** | **Opus-class** | Lower tiers silently destroy meaning. Don't cheap out. |

---

## 8. Conventions every skill must follow

### Determinism
- All CLI calls use `--json` for parseable output.
- No free-form LLM output where a deterministic script will do.
- LLM steps explicitly scoped (e.g. "infer schema from HTML" is LLM; "write schema via CLI" is deterministic).
- Never hallucinate CLI flags or API endpoints. Verify against `adapto llm-info` or live OpenAPI specs.

### Forbidden actions (global, every skill)
- Never `cat`, `echo`, log, or paste contents of `~/.config/adapto/credentials.json` (holds bearer access + refresh tokens).
- Never include token or API-key **values** in chat output. Reference by env var name only.
- Never commit `.env`. Skill must add to `.gitignore` if missing.
- Never run mutating CLI commands without explicit user approval (plan-then-apply).
- Never call existing-site flow "migration." Always "reconstruction" or "approximation."
- Never assume content language. **Discover the tenant's enabled codes first** (`adapto auth orgs`, or `GET /available-languages`) and use one of those exact strings verbatim. Format is tenant-defined (may be `en` or `en-US`); never invent a region subtag the tenant doesn't have, and never pass a bare name like `Spanish`.
- Always pass `--source '{"type":"ai_generated","name":"<session_id>"}'` on article writes — omitting it mislabels content as `internal`/`CLI`.
- Record every created item ID into `.adapto/sessions/<session_id>.json` at apply time — it's the only rollback handle (§3.7).

### Translation-specific rules
- Validate paragraph count, tag count, media placement count match between source and translation. Fail loudly on mismatch.
- Honor `_adapto_glossary` for do-not-translate terms.
- Diff view before publish.

---

## 9. Live Adapto reference

**Docs root:** https://adaptocms.com/docs/

### Read first (core surface)
- Introduction: https://adaptocms.com/docs/introduction/
- Authentication: https://adaptocms.com/docs/authentication/
- **CLI & AI Agents:** https://adaptocms.com/docs/cli-ai-agents/ ← critical
- SDK Reference: https://adaptocms.com/docs/sdk-reference/
- Data Models: https://adaptocms.com/docs/data-models/
- Pagination / Filtering: https://adaptocms.com/docs/pagination-and-filtering/
- Error Handling: https://adaptocms.com/docs/error-handling/

### API references
- Articles: https://adaptocms.com/docs/articles-api/
- Categories: https://adaptocms.com/docs/categories-api/
- Pages: https://adaptocms.com/docs/pages-api/
- Custom Collections: https://adaptocms.com/docs/custom-collections-api/
- Micro Copy: https://adaptocms.com/docs/micro-copy-api/
- Search: https://adaptocms.com/docs/search-api/
- Available Languages: https://adaptocms.com/docs/available-languages-api/

### OpenAPI specs
- Public: https://public-api.adaptocms.com/v1/openapi.json
- Backend: https://api.adaptocms.com/openapi.json
- Public API live docs: https://public-api.adaptocms.com/v1/docs
- Backend API live docs: https://api.adaptocms.com/docs

### Framework starters
- Next.js: https://adaptocms.com/docs/nextjs-starter/ · https://github.com/adaptocms/adapto-next-client
- Astro: https://adaptocms.com/docs/astro-starter/ · https://github.com/adaptocms/adapto-astro-client
- SvelteKit: https://adaptocms.com/docs/sveltekit-starter/ · https://github.com/adaptocms/adapto-sveltekit-client

### Integration reference
- Webhooks: https://adaptocms.com/docs/integrating-webhooks/
- GitHub Workflows: https://adaptocms.com/docs/integrating-github-workflows/
- Migrating Content: https://adaptocms.com/docs/migrating-content/
- Backups: https://adaptocms.com/docs/backups/

### Key Adapto packages
- CLI: https://github.com/adaptocms/adapto-cms-cli — install: `curl -sSL https://raw.githubusercontent.com/adaptocms/adapto-cms-cli/main/scripts/install.sh | bash`
- SDK: ⚠️ **`@adaptocms/sdk` is NOT published on npm** (404 as of 2026-06-03). The starters vendor a hand-rolled `AdaptoSDK` class (`fetch` + `x-api-key`) — treat that as the read-client pattern until/unless an npm SDK ships.
- Scaffolder: `npx create-adapto-app` (flags: `--framework astro|next|sveltekit`, `--api-key KEY`, `--pm npm|pnpm|yarn|bun`, `--install/--no-install`, `--git/--no-git`, `--force`, `-y`). Requires Node 20+.

### CLI environment variables (write side; bound via viper)
- `ADAPTO_TOKEN` — Bearer for backend API (scripts/agents); overrides stored credential
- `ADAPTO_TENANT_ID` — tenant scope; overrides stored credential
- `ADAPTO_API_URL` — optional override (default `https://api.adaptocms.com`)

### Frontend `.env` (read side) — what the starters actually use
- `ADAPTO_API_URL` — e.g. `https://public-api.adaptocms.com/v1`
- `ADAPTO_API_KEY` — public read key; **tenant ID is parsed from the key**, so there is no `ADAPTO_TENANT_ID` here

### CLI agent-readiness signals (already shipped)
- `adapto llm-info` — full command spec (⚠️ has a credentials-path bug — see §3.5; prefer `shared/cli-cheatsheet.md`)
- `--json` on every command
- `--source` (JSON blob) on **articles only** for provenance tagging — not pages/items
- `collections items create-batch` for bulk writes — **collection items only** (no article/page batch)
- `create-translation` for i18n fan-out (articles, pages, items, categories, microcopy)
- `files upload <path>` returns the full record incl. CDN URL (used for media re-host)

### Image transforms (no skill needed, document only)
URL parameter transforms at the edge:
`https://media.adaptocms.com/<tenant>/images/<file>.png?w=800&format=webp&quality=85`
Supports: `w`, `h`, `format` (webp, avif), `quality`. No build pipeline.

---

## 10. Open flags / known limitations (Adapto-side)

| Flag | Issue | Impact on skills |
|---|---|---|
| ⚠️ | Public key reads drafts unscoped | Build assuming future fix; don't bake current behaviour in (confirmed: starter detail routes read drafts) |
| ✅ | Locale format is tenant-defined (CLI docs say ISO 639-1 `en`; starters use `en-US`) | RESOLVED approach: discover via `adapto auth orgs`/`available-languages`, use codes verbatim; don't hardcode region |
| ⚠️ | Docs say "published only" but live API serves drafts | Doc bug, not skill issue |
| 🟠 | No backup API + no `source` filtering + provenance on articles only | v1 rollback is **manifest-based delete-by-ID** (§3.7), not provenance-query; doesn't restore overwrites |
| 🟠 | Starters render **no** SEO meta (not just none from `custom_fields`) | Skill writes meta to `custom_fields`; render side is bare (`<title>` only) across all three starters |
| ⚠️ | No published `@adaptocms/sdk` on npm | Vendor the read-client per §3.11 (usable today; caveat: no `npm update`, drifts if the Public API changes) |
| ⚠️ | No batch for articles/pages/categories/microcopy | Loop per-item creates; only collection items batch |

---

## 11. Open questions (confirm with founder before/during dev)

1. ✅ **RESOLVED — `--source` flag shape:** full JSON blob (`ArticleSourceModel`), articles only, defaults to `{"type":"internal","name":"CLI"}` if omitted. No sub-flags.
2. **Reserved-slug enforcement:** does Adapto accept/reserve `_adapto_*` slugs server-side? The CLI does no client-side slug validation (passes through), so this is purely server-side and still unverified. **Confirm before building `project-define`.**
3. **Session ID format:** timestamp + nanoid? UUID? ULID? Decide once, use everywhere (used in `source.name` and the manifest filename).
4. **Distribution:** GitHub-only, npm-only, or both? (`@adaptocms/agent-skills` is also not yet on npm — 404.)
5. **License:** MIT for community adoption, or another choice?
6. **`_adapto_project_config` schema:** field-set proposed by skill v1 — does Adapto reserve any fields, or fully user-defined? Field defs use `FieldDefinitionModel` (`name`, `label`, `type`, `required?`, `multiple?`, `options?`, `related_collection?`, `default_value?`, `validation?`) — see `shared/cli-cheatsheet.md`.
7. ✅ **RESOLVED — locale format:** tenant-defined; discover at runtime (§0/§8).
8. **Is `@adaptocms/sdk` planned for npm?** Affects §3.11 — if a package ships, switch the read-client from vendored to installed and drop the drift risk. Until then, vendoring stands.

---

## 12. Where to start (build order)

Don't draft 10 SKILL.mds in parallel. The format will iterate. Build end-to-end on one, then scale.

0. **Verify the CLI surface first.** Run `adapto llm-info` and confirm the commands/flags this doc relies on still exist (auth, `collections create`, `--source`, batch scope, list filters). Patch §0 + `shared/cli-cheatsheet.md` if the CLI changed. Several skills hinge on this.
1. **Read** this file (especially §0). Read `shared/conventions.md` and `shared/cli-cheatsheet.md` once they exist.
2. **Set up `shared/` first:** `conventions.md`, `forbidden-actions.md`, `cli-cheatsheet.md` (synced/corrected from `adapto llm-info` — `cli-cheatsheet.md` is already seeded).
3. **Write SKILL.md format validator** (`scripts/validate-skills.ts`). Saves pain later.
4. **Build `adapto:doctor` first.** Simplest skill, no mutations. Validates the SKILL.md format and frontmatter spec end-to-end.
5. **Build `adapto:install` second.** Tests the global-skill installation path and per-repo bootstrap.
6. **Build `adapto:scaffold` third.** Tests wrapping an existing CLI command.
7. **Build `adapto:project-define` fourth.** Tests creating + reading a reserved collection.
8. **Then schema-design / schema-apply pair.** Tests plan-then-apply two-call pattern.
9. **Then content-seed.** Tests batch writes + provenance + session tagging.
10. **Then translate.** Tests sub-agent invocation + structural validation.
11. **Then rollback.** Tests the session-manifest delete-by-ID flow (§3.7), not provenance querying.

---

## 13. Naming + branding rules

- Repo: `adapto-cms-agent-skills`
- npm: `@adaptocms/agent-skills`
- Skill IDs: `adapto:<kebab-name>`
- Always "Adapto CMS" in user-facing prose, "Adapto" acceptable in command/code contexts.
- For Flow B (existing site → Adapto): **never** "migration." Use "reconstruction" or "approximation."
- Don't compete on price in any user-facing copy generated by skills (positioning rule).
