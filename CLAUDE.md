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
> live Public/Backend OpenAPI specs. **Date: 2026-06-03, CLI `main` ≈ v0.0.7 (latest; pre-1.0 — expect churn).** Re-verify with `adapto llm-info`
> after any CLI upgrade. Full corrected command reference lives in `plugin/shared/cli-cheatsheet.md`.

**What is real (use freely):**
- **Full CRUD via the CLI** for articles, pages, categories, custom collections (+ items), files, microcopy — all against the Backend API.
- **Collection schemas are creatable via CLI:** `adapto collections create --name --slug --description --language --fields-json --status` (+ `update`/`delete`). `--description` and `--language` are **required**. Field definitions go in `--fields-json` as a `FieldDefinitionModel[]`.
- **Auth** = `adapto auth login --email --password` → saves access + refresh tokens to `~/.config/adapto/credentials.json` (file `0600`). Also `register/refresh/logout/me/switch-tenant/orgs`, password+activation commands, and manual OAuth (`login-github` → URL, `callback-github --code`; `login-google --credential`).
- **Headless/agent auth** = env vars `ADAPTO_TOKEN` + `ADAPTO_TENANT_ID` (+ optional `ADAPTO_API_URL`), bound automatically and overriding stored creds.
- **Provenance** = `--source '<json>'` on **articles only**, parsed into `ArticleSourceModel` (`{type, name, author?, url?, published_date?, license?}`). `type` enum: `internal | external | user_submitted | ai_generated`.
- **Tenant languages are discoverable at runtime:** `adapto auth orgs` lists each tenant's enabled language codes (so does `GET /available-languages`).
- **Translations:** `<type> create-translation <source_id>` for articles, pages, collection items, categories, microcopy.

**What is NOT real (do not design around it):**
- ❌ **No `@adaptocms/sdk` on npm** (404). The read-client ships **inside `create-adapto-app`** (used by `adapto:scaffold`) — there's nothing to `npm install`, and this pack does **not** vendor or maintain a client. See §3.11.
- ❌ **No provenance on pages or collection items** — only articles carry `source`. Pages/items can't be tagged.
- ❌ **No filtering by `source.*`** anywhere — list filters are a fixed set (`status, language, keyword, tag, category, parent_id, field, order, page, limit`). Provenance is **audit-only** (no query by source).
- ❌ **No batch create for articles/pages/categories/microcopy** — loop individual creates. Batch exists for **collection items only** (`collections items create-batch`).
- ❌ **No device-code / browser-poll auth flow.** (§3.5 originally invented both.)
- ❌ **`--source` defaults to `{"type":"internal","name":"CLI"}` when omitted** — agent writes MUST pass it explicitly or they're mislabeled as human/CLI content.

**Locale:** the accepted set is **tenant-defined**. CLI docs say ISO 639-1 (`en`); the starters run region-qualified codes (`en-US`, `ro-RO`). Never assume — **discover the tenant's enabled codes first** (`adapto auth orgs`) and use them verbatim. Never pass a bare language name (`Spanish`).

**Frontend `.env`** holds only `ADAPTO_API_URL` + `ADAPTO_API_KEY`; tenant ID is parsed from the key (`key.split('.')[1]`). Do **not** write `ADAPTO_TENANT_ID` into a frontend `.env` (that var is for the CLI/write side).

---

## 1. What this repo is

A pack of skills for AI coding agents (Claude Code; Cursor planned) that lets them operate Adapto CMS end-to-end: scaffold projects, design schemas, seed content, translate, run SEO, and audit content. (No rollback/backup — §3.7.)

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
**Read path:** site/app → read-client (`fetch` + `x-api-key`) → Public API. The read-client is bundled by `create-adapto-app` (there's no published `@adaptocms/sdk`; this pack doesn't ship one). See §3.11.

**Content types:** Articles, Pages, Categories, Custom Collections (user-defined schemas), Micro copy, Search, Languages. Translations linked via `translation_of_id`.

**Statuses:** `draft` | `published` | `archived` | `deleted`. Note: only `draft|published|archived` are accepted as list **filter** values; `deleted` is a state, not a filter.

**Provenance — Articles only:** only `ArticleCreateModel` has a `source` object — `type` (enum: `internal | external | user_submitted | ai_generated`), `name`, optional `url`, `author`, `published_date` (unix int), `license`. ⚠️ **Pages and Collection items have no `source` field** and cannot be provenance-tagged. (Earlier drafts said "Articles/Pages" — wrong.)

---

## 3. Locked architecture decisions

### 3.1 Skill installation model: one Claude Code plugin

**v1 distributes all skills as a single Claude Code plugin** (`name: adapto`), installed from this repo
acting as its own marketplace (§3.2). Installing the plugin makes every `adapto:*` skill available — there
is **no per-repo skill copying and no `skills.lock`** (Claude Code's plugin system owns install / versioning
/ updates).

- `adapto:install` and `adapto:doctor` ship inside the plugin; once it's installed they're available everywhere.
- The very first install is `/plugin install` (the agent can't install the pack that defines its own skills). `adapto:install` runs *after* — it ensures the `adapto` CLI and hands off to `adapto:scaffold`.
- **Per-repo state** still lives in the target project's `.adapto/` (project-config cache, §3.4) — that's project context, not skills.

(Earlier drafts proposed copying per-repo skills into `.claude/skills/` pinned by `.adapto/skills.lock`; the plugin model supersedes that.)

### 3.2 IDE targets at launch

**v1 ships Claude Code only**, as a Claude Code **plugin** distributed via a marketplace — this repo is its
own single-plugin marketplace (`.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json`). Install:
`/plugin marketplace add adaptocms/adapto-cms-agent-skills` → `/plugin install adapto@adaptocms`. Skills are
authored once as `/skills/<skill>/SKILL.md` and auto-discovered by the plugin.

**Cursor is deferred** (fast-follow): it uses a different format/location (`.cursor/rules/*.mdc`) and needs a
renderer (`render-skills.ts`) — cut from v1 to keep go-live simple.

Future: `AGENTS.md` for an emerging IDE-agnostic convention.

### 3.3 Skill namespace

`adapto:*` (e.g. `adapto:scaffold`). Matches Anthropic plugin convention (`sales:*`, `legal:*`).

### 3.4 Project definer = single source of truth in CMS

Lives in reserved collection `_adapto_project_config`. Holds: project type, vertical, ICPs, brand voice, writing do's & don'ts, and a one-line pitch (value proposition).

Gathered through a **short, skippable Q&A** — concise questions, each offering a few example options to pick from (or a free-form answer), per the interaction UX rules (§3.13). The whole step is **optional**: the user can skip it entirely and proceed with no project config.

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

> ⚠️ **Never assume the saved/last-active tenant is the one to work in.** A logged-in `adapto auth me` only
> proves *who* you are, not *which* project the user wants this time. **Before any tenant-scoped step**
> (scaffold's API-key URL, schema/content/translation writes), confirm the **working tenant** explicitly:
> list with `adapto auth orgs --json`, and — when the account has **2+ tenants** — have the user **pick one
> every flow** (don't inherit the active one silently), then `adapto auth switch-tenant --tenant-id <id>` to
> set it. With **exactly one** tenant there's nothing to choose: state it and proceed (§3.13 — don't ask the
> obvious). The chosen tenant scopes everything downstream.

Agent role on missing auth: instruct the user to run `adapto auth login --email ...` (or set `ADAPTO_TOKEN`/`ADAPTO_TENANT_ID`), then re-run `adapto auth me` to confirm before proceeding. There is nothing to "poll." (Earlier drafts described browser-poll and `--device` flows — **neither exists.**)

### 3.6 Provenance (audit tagging)

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

⚠️ **Scope limit:** `--source` exists on **articles only** (incl. article `create-translation`). Pages and collection items have no `source` field and aren't tagged.

✅ **Open question 3.6.a — RESOLVED:** `--source` accepts a full JSON blob (parsed into `ArticleSourceModel`). No `--source-name`/`--source-type` sub-flags.

Provenance is for backoffice **audit** only — there's no query (or rollback) by source.

### 3.7 Rollback & backup — out of scope (this variation)

No rollback skill, no session manifest, and no backup/restore. The safety mechanism is **draft-first**
(§3.9): writes land as drafts and the user reviews before publishing. (Earlier drafts specced a
session-manifest rollback; removed to keep scope minimal.)

### 3.8 Plan-then-apply (enforced)

Every mutating skill is **two phases**:

1. **Plan phase:** print a structured plan of what it will create/modify (counts, types, target language, draft status). Wait for explicit user `approve`. No cost/token figures (§3.10).
2. **Apply phase:** runs only after approval.

Not a flag. Required two-call pattern in skill design. Plan output must be machine-parseable (JSON or YAML in a fence).

### 3.9 Draft-first

All writes go in as `status=draft`. User reviews on local dev server (SDK reads drafts via public key today), then publishes via `adapto:publish` or backoffice.

⚠️ **Known Adapto-side issue:** any public-key holder currently reads drafts (no scope on public keys). On Adapto roadmap. Skills should be written assuming future fix lands (separate preview key or scope flag).

### 3.10 Cost / token estimation — out of scope (this variation)

The agent runs under the user's own API key, so the pack does **not** show cost or token estimates. The
plan phase (§3.8) still lists *what* it will create/modify — just no spend/usage figures.

(Note: batch writes exist for **collection items only** — articles/pages/categories/microcopy loop one
call per item; see §0. That affects timing/rate-limit handling, not any cost display.)

### 3.11 Read-client: provided by `create-adapto-app`

The frontend read-client ships **inside `create-adapto-app`** (which `adapto:scaffold` wraps). This pack
does **not** vendor, maintain, or install a read-client, and there is no published `@adaptocms/sdk` on npm.

The agent **never imports** the client — agent writes go through the CLI; the client exists only so the
generated frontend can *read* content from the Public API (`fetch` + `x-api-key`). If `@adaptocms/sdk` is
ever published, revisit this (open question §11.8). (Earlier drafts vendored a client into existing repos
for a `retrofit` flow; both the templates and `retrofit` are out of scope in this variation.)

### 3.12 Consent for consequential / host-level commands

Plan-then-apply (§3.8) gates **CMS content** writes. A second, separate gate governs commands that change
the **user's machine or environment** or are otherwise consequential / hard to reverse — these must
**never run silently**:

- Installing or upgrading software: `curl … | bash`, `npm i -g`, `brew install`, `go install`, etc.
- Replacing binaries or writing outside the project (especially anything needing `sudo`).
- Destructive filesystem ops outside the skill's `.adapto/` working area.
- Outward / network actions (publishing, `git push`, opening PRs).

**Required flow for any such command:**
1. **Inform** — say what you're about to run and why, in one or two plain sentences.
2. **Show the exact command**, and note side effects (writes to `/usr/local/bin`, may prompt for `sudo`,
   fetches from the network, etc.).
3. **Get explicit consent** — wait for approval. Consent is **per command**: approval for one is not
   approval for the next.
4. **Run only on consent**, then **re-verify** (e.g. `adapto version`) and report. If declined, stop and
   print the manual command so the user can run it themselves.

Read-only work never needs this gate (e.g. `adapto:doctor` only diagnoses and prints the command).
The `mutates` frontmatter field means **CMS content mutation only** (→ §3.8); a skill can be
`mutates: false` and still perform host changes under this §3.12 gate (e.g. `adapto:install`).

### 3.13 Interaction UX — concise, minimal, helpful

Agent↔user interaction must be **minimal and non-invasive**. The job is to help the user decide quickly,
not to interrogate them.

- Keep questions **short and on point** — no preamble, no filler, no AI slop, no walls of text.
- Prefer **offering 2–4 concrete options to pick from** (each with a one-line "why"), and always allow a
  free-form answer or **skip**. Present examples, not a blank prompt.
- Ask only what you need; batch related questions; never re-ask what the context already answers.
- Default to sensible choices and **state them**, rather than asking when the answer is obvious.
- Interview-style steps (e.g. `adapto:project-define`) are **fully skippable** — the user can opt out
  entirely and proceed with defaults.
- **Drive the flow — never end in silence.** When a step finishes, say what happened and propose the next
  logical step(s) as pickable options; don't stall waiting for the user to guess what's next. The experience
  should feel like one continuous agentic flow, not a series of dead ends.
- **Narrate briefly.** In a few words, say what you're doing now ("Checking your Adapto setup…",
  "Scaffolding the Astro project…") — enough to orient, never a wall of text.
- **Stay context-aware after each step.** Surface what succeeded, what (if anything) failed, and what you
  still need from the user, so they always know where they are.
- **Never fabricate the user's identity.** Don't put a real/guessed email, password, or token in a command —
  use placeholders the user fills (`--email <your-email> --password <your-password>`). Inline secrets land in
  session history; a separate terminal (where `adapto auth login` prompts) avoids that.

### 3.14 Preflight & entry point

- **`adapto:install` is the front door** for setup ("get started", "set up Adapto", "adapto init"): it
  preflights, ensures the CLI, then hands off to `adapto:scaffold`. There is **no separate `adapto:init`**.
- **Every work skill preflights.** A user may name any skill directly, so each one first runs the
  `adapto:doctor` checks to learn the state, then **hard-blocks only on its own preconditions** (its
  `requires`) and proceeds otherwise — surfacing the rest as info + the fix. (e.g. `adapto:scaffold` needs
  Node 20+ but **not** auth, so it scaffolds the files and gates the API-key step on auth; `adapto:project-define`
  needs auth, so it blocks until logged in.)
- **Check once per flow; re-check only what changed.** Don't re-run doctor on every step — after a fix
  (login, key set, switch-tenant) re-verify just that item.
- **No session-start auto-run.** Preflight triggers when the user starts an Adapto task, not on every
  session — don't ship a SessionStart hook that fires for non-Adapto work.

---

## 4. Proposed repo structure

```
adapto-cms-agent-skills/
├── README.md                       # public-facing install + usage
├── CLAUDE.md                       # this file
├── LICENSE                         # MIT (§11.5)
├── package.json                    # dev tooling (validator); @adaptocms/agent-skills
│
├── .claude-plugin/
│   └── marketplace.json            # marketplace catalog (lists the plugin; source: ./plugin)
│
├── .github/workflows/ci.yml        # CI: runs `npm test` (validate + typecheck + smoke) on push/PR
│
├── plugin/                         # the installable Claude Code plugin (what `/plugin install` fetches)
│   ├── .claude-plugin/
│   │   └── plugin.json             # plugin manifest (§3.2)
│   ├── skills/
│   │   ├── adapto-install/         # global bootstrap (SKILL.md + scripts/)
│   │   ├── adapto-doctor/          # global + per-repo
│   │   ├── adapto-scaffold/        # per-repo: wraps create-adapto-app (new projects)
│   │   ├── adapto-project-define/  # per-repo: _adapto_project_config (skippable Q&A)
│   │   ├── adapto-schema-design/   # per-repo: PLAN
│   │   ├── adapto-schema-apply/    # per-repo: APPLY
│   │   ├── adapto-content-seed/    # per-repo: initial content (drafts)
│   │   └── adapto-translate/       # per-repo: single + corpus
│   └── shared/                     # cross-skill reference docs the skills link to
│       ├── conventions.md          # plan-then-apply, draft-first, provenance
│       ├── forbidden-actions.md    # token hygiene, secret handling
│       ├── sub-agents.md           # model tier guide (see §6)
│       ├── cli-cheatsheet.md       # synced from `adapto llm-info`
│       ├── reserved-slugs.md       # _adapto_project_config, _adapto_glossary
│       └── api-references.md       # links to live Adapto docs (see §7)
│
├── scripts/
│   ├── render-skills.ts            # SKILL.md → Cursor .mdc (deferred — Cursor is fast-follow)
│   ├── validate-skills.ts          # frontmatter lint (scans plugin/skills/)
│   ├── sync-cli-spec.ts            # pull adapto llm-info → cli-cheatsheet.md
│   └── test-skill.ts
│
└── tests/
    └── smoke.mjs                   # structural checks (manifests, SKILL.md presence, .mjs syntax) — via `npm test`
```

---

## 5. v1 ship list

8 skills. Cut hard. Everything else is v1.5 or v2. (No retrofit, no rollback — see §3.7/§3.11.)

| # | Skill | Type | Mutates | Notes |
|---|---|---|---|---|
| 1 | `adapto:install` | Global | – | Bootstrap entry point. Ensures the CLI (consent-gated, §3.12), then hands off to `adapto:scaffold`. |
| 2 | `adapto:doctor` | Global + per-repo | – | CLI present? Auth valid? Tenant linked? Framework supported? Read-only. |
| 3 | `adapto:scaffold` | Per-repo | – | Wraps `npx create-adapto-app` (consent-gated). New-project flow only. |
| 4 | `adapto:project-define` | Per-repo | Yes | Creates/syncs `_adapto_project_config` via a short, **skippable** Q&A (§3.4). |
| 5 | `adapto:schema-design` | Per-repo | – | Proposes content schema from project context. Plan output. |
| 6 | `adapto:schema-apply` | Per-repo | Yes | Writes schema via CLI. Separated from design to enforce plan-then-apply. |
| 7 | `adapto:content-seed` | Per-repo | Yes | Initial content as drafts (per-item creates for articles/pages; batch for collection items), with provenance on articles. |
| 8 | `adapto:translate` | Per-repo | Yes | Single-item + corpus. Structural validation (paragraph/tag/media counts). Glossary-aware. |

### v1.5 (fast follow)
`adapto:seo-meta`, `adapto:schema-org`, `adapto:microcopy-init`, `adapto:microcopy-extract`, `adapto:publish`.

### v2
`adapto:brand-voice-check`, `adapto:content-audit`, `adapto:faq-build`, `adapto:internal-links`, `adapto:translation-audit`, `adapto:image-params`, `adapto:responsive-image`.

> ⚠️ `adapto:locale-add` was dropped: there is **no CLI/API to enable a tenant's languages** (verified — §10). Enabling a locale is backoffice-only, so a skill could only link the user to the dashboard.

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
  cli: ">=0.0.7"        # adapto CLI version range (CLI is pre-1.0 today — see §0)
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
| Image alt text (single) | Haiku-class | One-shot description |
| Schema proposal from project context | Sonnet-class | Structural reasoning |
| Content drafting (seed) | Sonnet-class | Style + structure |
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
- LLM steps explicitly scoped (e.g. "propose a schema from the project Q&A" is LLM; "write schema via CLI" is deterministic).
- Never hallucinate CLI flags or API endpoints. Verify against `adapto llm-info` or live OpenAPI specs.

### Forbidden actions (global, every skill)
- Never `cat`, `echo`, log, or paste contents of `~/.config/adapto/credentials.json` (holds bearer access + refresh tokens).
- Never include token or API-key **values** in chat output. Reference by env var name only.
- Never commit `.env`. Skill must add to `.gitignore` if missing.
- Never run mutating CLI commands without explicit user approval (plan-then-apply).
- Never assume content language. **Discover the tenant's enabled codes first** (`adapto auth orgs`, or `GET /available-languages`) and use one of those exact strings verbatim. Format is tenant-defined (may be `en` or `en-US`); never invent a region subtag the tenant doesn't have, and never pass a bare name like `Spanish`.
- Always pass `--source '{"type":"ai_generated","name":"<session_id>"}'` on article writes — omitting it mislabels content as `internal`/`CLI`.
- Keep agent↔user interaction concise and skippable (§3.13): short questions, examples to pick from, or a free-form answer.

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

### Key Adapto packages
- CLI: https://github.com/adaptocms/adapto-cms-cli — install: `curl -sSL https://raw.githubusercontent.com/adaptocms/adapto-cms-cli/main/scripts/install.sh | bash`
- SDK: ⚠️ **`@adaptocms/sdk` is NOT published on npm** (404 as of 2026-06-03). The read-client ships inside `create-adapto-app`; this pack doesn't ship one (§3.11).
- Scaffolder: `npx create-adapto-app` (flags: `--framework astro|next|sveltekit`, `--api-key KEY`, `--pm npm|pnpm|yarn|bun`, `--install/--no-install`, `--git/--no-git`, `--force`, `-y`). Requires Node 20+.

### CLI environment variables (write side; bound via viper)
- `ADAPTO_TOKEN` — Bearer for backend API (scripts/agents); overrides stored credential
- `ADAPTO_TENANT_ID` — tenant scope; overrides stored credential
- `ADAPTO_API_URL` — optional override (default `https://api.adaptocms.com`)

### Frontend `.env` (read side) — what the starters actually use
- `ADAPTO_API_URL` — the **bare host**: `https://public-api.adaptocms.com` (⚠ **no `/v1`**). The read-client
  builds URLs by **plain concatenation** (`baseUrl + endpoint`) — it does *not* append a version. The `/v1`
  segment lives in the client's **endpoint paths** (`/v1/articles`, …), so `host` + `/v1/articles` =
  `https://public-api.adaptocms.com/v1/articles` (the only shape the live API serves — verified 2026-06).
  Putting `/v1` in `.env` *too* yields `/v1/v1/articles`. (The §2 API-surface base is `.../v1` because that's
  where endpoints live — but the `.env` value must omit it; the version is carried by the paths.)
- `ADAPTO_API_KEY` — public read key; **tenant ID is parsed from the key**, so there is no `ADAPTO_TENANT_ID` here

### CLI agent-readiness signals (already shipped)
- `adapto llm-info` — full command spec (⚠️ has a credentials-path bug — see §3.5; prefer `plugin/shared/cli-cheatsheet.md`)
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
| ⚠️ | No `source.*` filtering; provenance on articles only | Provenance is audit-only — no query/rollback by source |
| 🟠 | Starters render **no** SEO meta (not just none from `custom_fields`) | Skill writes meta to `custom_fields`; render side is bare (`<title>` only) across all three starters |
| ⚠️ | No published `@adaptocms/sdk` on npm | Read-client ships inside `create-adapto-app` (§3.11); this pack doesn't ship one |
| ⚠️ | No batch for articles/pages/categories/microcopy | Loop per-item creates; only collection items batch |
| ⚠️ | `adapto status` needs a `read:status` permission many accounts lack → `403 Forbidden` (string truncated to `read:statu` server-side — Adapto bug) | A 403 there is **not** an outage; `auth me`/`orgs` already prove reachability. `adapto:doctor` treats a permission 403 on `status` as a **warn**, not a fail (verified live, 2026-06). |
| ⚠️ | **No CLI/API to add or enable a tenant's languages** (verified against CLI v0.0.7 + Backend OpenAPI) | Languages are **read-only** to the agent: discover via `adapto auth orgs` / `available-languages`; *enabling* a new locale is **backoffice-only**. Skills use enabled languages; they can't add one. |
| 🟠 | **`create-adapto-app` read-client shipped stale `/public/...` endpoint paths** → every content fetch 404s. Live API serves `/v1/...` only (`/public/articles` *and* `/v1/public/articles` both 404; verified 2026-06). | **Upstream `create-adapto-app` bug**, not a skill issue. Correct fix is in the SDK template (`src/lib/adapto-sdk.ts`: `/public/` → `/v1/`) + bare-host `.env` — both must agree. Per §3.11 the skill **must not** patch the bundled client; flag it for upstream fix. Re-verify after a `create-adapto-app` republish. |

---

## 11. Open questions (confirm with founder before/during dev)

1. ✅ **RESOLVED — `--source` flag shape:** full JSON blob (`ArticleSourceModel`), articles only, defaults to `{"type":"internal","name":"CLI"}` if omitted. No sub-flags.
2. **Reserved-slug enforcement:** does Adapto accept/reserve `_adapto_*` slugs server-side? The CLI does no client-side slug validation (passes through), so this is purely server-side and still unverified. **Confirm before building `project-define`.**
3. **Session ID format:** timestamp + nanoid? UUID? ULID? Decide once (used in article `source.name` for audit).
4. ✅ **RESOLVED — Distribution:** v1 = Claude Code **plugin** via this repo as its own marketplace
   (`/plugin marketplace add adaptocms/adapto-cms-agent-skills` → `/plugin install adapto@adaptocms`).
   Requires the repo public on GitHub. No npm/`install.sh` and no Cursor in v1 (deferred — §3.2).
5. ✅ **RESOLVED — License:** **MIT** (permissive; maximizes adoption of a pack whose goal is to spread Adapto CMS). Copyright holder: Adapto CMS. `LICENSE` at repo root; `license: "MIT"` set in `package.json` + both plugin manifests.
6. **`_adapto_project_config` schema:** field-set proposed by skill v1 — does Adapto reserve any fields, or fully user-defined? Field defs use `FieldDefinitionModel` (`name`, `label`, `type`, `required?`, `multiple?`, `options?`, `related_collection?`, `default_value?`, `validation?`) — see `plugin/shared/cli-cheatsheet.md`.
7. ✅ **RESOLVED — locale format:** tenant-defined; discover at runtime (§0/§8).
8. **Is `@adaptocms/sdk` planned for npm?** Today the read-client ships inside `create-adapto-app` (§3.11); a published package would be an alternative.

---

## 12. Where to start (build order)

Don't draft 10 SKILL.mds in parallel. The format will iterate. Build end-to-end on one, then scale.

0. **Verify the CLI surface first.** Run `adapto llm-info` and confirm the commands/flags this doc relies on still exist (auth, `collections create`, `--source`, batch scope, list filters). Patch §0 + `plugin/shared/cli-cheatsheet.md` if the CLI changed. Several skills hinge on this.
1. **Read** this file (especially §0). Read `plugin/shared/conventions.md` and `plugin/shared/cli-cheatsheet.md` once they exist.
2. **Set up `plugin/shared/` first:** `conventions.md`, `forbidden-actions.md`, `cli-cheatsheet.md` (synced/corrected from `adapto llm-info` — `cli-cheatsheet.md` is already seeded).
3. **Write SKILL.md format validator** (`scripts/validate-skills.ts`). Saves pain later.
4. **Build `adapto:doctor` first.** Simplest skill, no mutations. Validates the SKILL.md format and frontmatter spec end-to-end.
5. **Build `adapto:install` second.** Tests the global-skill installation path and per-repo bootstrap.
6. **Build `adapto:scaffold` third.** Tests wrapping an existing CLI command.
7. **Build `adapto:project-define` fourth.** Tests creating + reading a reserved collection.
8. **Then schema-design / schema-apply pair.** Tests plan-then-apply two-call pattern.
9. **Then content-seed.** Tests per-item writes + batch (collection items) + provenance on articles.
10. **Then translate.** Tests sub-agent invocation + structural validation. (Last v1 skill.)

---

## 13. Naming + branding rules

- Repo: `adapto-cms-agent-skills`
- npm: `@adaptocms/agent-skills`
- Skill IDs: `adapto:<kebab-name>`
- Always "Adapto CMS" in user-facing prose, "Adapto" acceptable in command/code contexts.
- Don't compete on price in any user-facing copy generated by skills (positioning rule).

---

## 14. README upkeep (living, human-facing "what's done")

`README.md` is the **public, human-readable front door** — written for the people who will install and use
the skill pack, not only the agents/devs building it. It documents **only what works today** (never planned
or future features; the roadmap and design intent live here in `CLAUDE.md`). As capabilities ship, it grows
into the full install-and-use guide for end users.

Two audiences, both served, both kept truthful:
- **Users / clients** (primary, growing) — what the pack lets them do, requirements, and how to install/use
  the parts that are ready. Plain language, not agent-speak.
- **Contributors** — how to work on the pack, in a clearly separated section.

**Rule — on every major task** (a skill built or changed, tooling added, a decision locked, or a fix that
changes how something is used), update `README.md` **in the same change** so it reflects:
- what is now usable,
- how to use it (plain-language steps + commands / entry points), and
- a link/index to any new or relevant doc — point to it, don't restate it.

Add an entry only once it's real and usable; correct or remove entries that no longer match. If a task
didn't change what's usable or how, the README doesn't need touching. Keep it scannable and written for a
human reader.
