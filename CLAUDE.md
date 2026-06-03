# Adapto CMS Agent Skills

**Repo:** `adapto-cms-agent-skills` · **Package:** `@adaptocms/agent-skills` · **Status:** v1 greenfield

Authoritative project context for Claude Code. Read first, every session.

---

## 1. What this repo is

A pack of skills for AI coding agents (Claude Code, Cursor) that lets them operate Adapto CMS end-to-end: scaffold projects, design schemas, seed content, translate, run SEO, audit content, roll back.

**Target users:** developers using agentic IDEs/CLIs to build content-backed sites on Adapto CMS.

**Boundaries:**
- We **wrap** the existing Adapto CLI and SDK. We don't replace them.
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
**Read path:** site/app → `@adaptocms/sdk` → Public API

**Content types:** Articles, Pages, Categories, Custom Collections (user-defined schemas), Micro copy, Search, Languages. Translations linked via `translation_of_id`.

**Statuses:** `draft` | `published` | `archived` | `deleted`.

**Provenance on Articles/Pages:** every item has a `source` object with `type` (enum: `internal | external | user_submitted | ai_generated`), `name`, optional `url`, `author`, `published_date`, `license`.

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

### 3.5 Token / auth handling

| Token | Where | Who touches |
|---|---|---|
| Bearer (write) | CLI-managed in `~/.adapto/credentials` (chmod 600) | CLI only. **Agent never reads or interpolates.** |
| Public API key (read) | `.env` (gitignored) | Skill can write it. Agent uses by name (`ADAPTO_API_KEY`), never echoes value. |
| Tenant ID | `.env` | Same as above. |

**Auth flow patterns:**
- Local: `adapto auth login` → browser flow (Vercel/Supabase pattern).
- Headless/SSH: `adapto auth login --device` → device-code flow (gh pattern).
- Fallback: PAT paste from dashboard.

Agent role on missing auth: tell user "run `adapto auth login`, I'll wait" → poll for completion → proceed.

### 3.6 Provenance + session tagging

Every agent write tagged via Adapto's `source` object:

```json
{
  "type": "ai_generated",
  "name": "agent_session_2026-06-03_a1b2",
  "author": "<git user.email or system user>",
  "url": "<git remote origin if available>"
}
```

`type` is fixed enum; `name` carries the session ID. Rollback filters on `source.type=ai_generated AND source.name=<session_id>`.

⚠️ **Open question (3.6.a):** does CLI's `--source` flag accept a full JSON blob, or just `--source <string>` mapped to `source.name`? Verify against `adapto llm-info` before building rollback. May need `--source-type`, `--source-name`, `--source-author` etc.

### 3.7 Rollback strategy

**v1:** provenance-based delete-by-session. Filters items by `source.type` and `source.name`. Documented limitation: doesn't restore overwrites (if agent edited an existing item, the prior version is gone).

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

Billed to: Anthropic API key (sk-ant-...4f2c)
Variance: ±30% on page size.

[approve]  [revise scope]  [cancel]
```

Three buttons. Revise reopens scope dialog.

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
│   └── adapto-rollback/            # per-repo: provenance-based
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
| 4 | `adapto:retrofit` | Per-repo | Yes | Existing repo: detect framework → install SDK → write `.env`/`.gitignore` → generate ONE example route. Does not refactor existing components. |
| 5 | `adapto:project-define` | Per-repo | Yes | Creates/syncs `_adapto_project_config` collection. Interview-driven. |
| 6 | `adapto:schema-design` | Per-repo | – | Proposes content schema from project context. Plan output. |
| 7 | `adapto:schema-apply` | Per-repo | Yes | Writes schema via CLI. Separated from design to enforce plan-then-apply. |
| 8 | `adapto:content-seed` | Per-repo | Yes | Initial content batch as drafts, with provenance + session tag. |
| 9 | `adapto:translate` | Per-repo | Yes | Single-item + corpus. Structural validation (paragraph/tag/media counts). Glossary-aware. |
| 10 | `adapto:rollback` | Per-repo | Yes | Provenance-based session rollback. v1 limitations documented. |

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
- Never `cat`, `echo`, log, or paste contents of `~/.adapto/credentials`.
- Never include token or API-key **values** in chat output. Reference by env var name only.
- Never commit `.env`. Skill must add to `.gitignore` if missing.
- Never run mutating CLI commands without explicit user approval (plan-then-apply).
- Never call existing-site flow "migration." Always "reconstruction" or "approximation."
- Never assume content language without normalizing to a BCP-47-style locale (e.g. `es-MX` not `Spanish`).

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
- SDK: `@adaptocms/sdk` (npm)
- Scaffolder: `npx create-adapto-app` (supports `--framework next|astro|sveltekit --api-key KEY`)

### CLI environment variables
- `ADAPTO_TOKEN` — Bearer for backend API (scripts/agents)
- `ADAPTO_TENANT_ID` — tenant scope
- `ADAPTO_API_URL` — optional override
- `ADAPTO_API_KEY` — public API key (for SDK in frontends)

### CLI agent-readiness signals (already shipped)
- `adapto llm-info` — full command spec, paste into `CLAUDE.md`
- `--json` on every command
- `--source` on articles/pages for provenance tagging
- `items create-batch` for bulk writes
- `create-translation` for i18n fan-out
- `files upload` returns CDN URL (used for media re-host)

### Image transforms (no skill needed, document only)
URL parameter transforms at the edge:
`https://media.adaptocms.com/<tenant>/images/<file>.png?w=800&format=webp&quality=85`
Supports: `w`, `h`, `format` (webp, avif), `quality`. No build pipeline.

---

## 10. Open flags / known limitations (Adapto-side)

| Flag | Issue | Impact on skills |
|---|---|---|
| ⚠️ | Public key reads drafts unscoped | Build assuming future fix; don't bake current behaviour in |
| ⚠️ | Locale set BCP-47-style but accepted set unverified | Normalize and disambiguate region (`es-ES` vs `es-MX`); don't hardcode |
| ⚠️ | Docs say "published only" but live API serves drafts | Doc bug, not skill issue |
| 🟠 | No backup API | v1 rollback is provenance-only, doesn't restore overwrites |
| 🟠 | Starter templates don't render SEO meta from `custom_fields` | Skill writes meta to `custom_fields`; render side bare today |

---

## 11. Open questions (confirm with founder before/during dev)

1. **`--source` flag shape:** JSON blob, or string mapped to `source.name`? Determines rollback skill design. Verify against `adapto llm-info` first.
2. **Reserved-slug enforcement:** does Adapto reserve `_adapto_*` slugs server-side, or convention only?
3. **Session ID format:** timestamp + nanoid? UUID? ULID? Decide once, use everywhere.
4. **Distribution:** GitHub-only, npm-only, or both? npm enables `npx @adaptocms/agent-skills install`.
5. **License:** MIT for community adoption, or another choice?
6. **`_adapto_project_config` schema:** field-set proposed by skill v1 (project type, vertical, ICPs, voice, tone, do's, don'ts, glossary refs) — does Adapto reserve any fields, or fully user-defined?

---

## 12. Where to start (build order)

Don't draft 10 SKILL.mds in parallel. The format will iterate. Build end-to-end on one, then scale.

1. **Read** this file. Read `shared/conventions.md` once it exists.
2. **Set up `shared/` first:** `conventions.md`, `forbidden-actions.md`, `cli-cheatsheet.md` (sync from `adapto llm-info`).
3. **Write SKILL.md format validator** (`scripts/validate-skills.ts`). Saves pain later.
4. **Build `adapto:doctor` first.** Simplest skill, no mutations. Validates the SKILL.md format and frontmatter spec end-to-end.
5. **Build `adapto:install` second.** Tests the global-skill installation path and per-repo bootstrap.
6. **Build `adapto:scaffold` third.** Tests wrapping an existing CLI command.
7. **Build `adapto:project-define` fourth.** Tests creating + reading a reserved collection.
8. **Then schema-design / schema-apply pair.** Tests plan-then-apply two-call pattern.
9. **Then content-seed.** Tests batch writes + provenance + session tagging.
10. **Then translate.** Tests sub-agent invocation + structural validation.
11. **Then rollback.** Tests querying by provenance.

---

## 13. Naming + branding rules

- Repo: `adapto-cms-agent-skills`
- npm: `@adaptocms/agent-skills`
- Skill IDs: `adapto:<kebab-name>`
- Always "Adapto CMS" in user-facing prose, "Adapto" acceptable in command/code contexts.
- For Flow B (existing site → Adapto): **never** "migration." Use "reconstruction" or "approximation."
- Don't compete on price in any user-facing copy generated by skills (positioning rule).
