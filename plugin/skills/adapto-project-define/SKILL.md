---
name: adapto-project-define
namespace: adapto
description: Build the project's "brain" — a rich, local multi-file knowledge base — through deep guided discovery (a short skippable interview plus active web/competitor/keyword research), and store a summary in Adapto as _adapto_project_config so every other skill writes on-brand. Plan-then-apply; fully optional.
version: 0.1.0
requires:
  cli: ">=0.1.1"
  auth: true             # writes a summary to the CMS — needs an authenticated CLI + selected tenant
  project_context: false # this skill CREATES the project context; it doesn't require one
mutates: true
---

# adapto:project-define

The most important setup step: it builds the project's **brain** — the local, multi-file knowledge base at
`.adapto/project/` (see [studio.md](../../shared/studio.md) §2) that every content skill reads to stay
on-brand and on-scope. It works by **deep guided discovery**: a short, skippable interview for the things only
you know, then **active research** (your existing site + competitors + an initial keyword universe) to fill
in the rest. A flattened **summary** is stored in the CMS as `_adapto_project_config`; the rich facets stay
local. The whole step is **optional** — skills work without it, just less sharply.

## When to use
- Setting up a project and you want the agent to deeply understand it before researching or writing content.
- Triggers: "define my project", "build the project brain", "tell Adapto about my product/brand/voice".
- Re-run to refresh the brain after big changes (it reconciles, never blindly clobbers your edits).

## When not to use
- Consolidating findings you've already gathered while working → `adapto:project-learn`.
- You'd rather not answer anything → skip it; content skills fall back to neutral defaults.
- Just checking the environment → `adapto:doctor`.

## Inputs
- **A short interview** (every question optional, pickable options + free-form, asked one at a time) for the
  **human-only facts**: project type → what it does → audience/ICPs (pains, jobs-to-be-done) → brand voice →
  writing do's & don'ts → one-line pitch → named competitors (URLs welcome) → your existing site URL (if any).
- **Research inputs** the interview unlocks: competitor URLs, your site URL, and any files you drop into
  `.adapto/sources/` (keyword lists, Search Console exports, notes) — all optional.
- The tenant's language (`adapto auth orgs --json`) for the CMS summary.

## Outputs
- The filled **`.adapto/project/` brain**: `identity`, `audience`, `voice`, `glossary`, `competitors`,
  `pillars`, `seo`, `inventory`, `INDEX`, `open-questions` (+ a seeded `learnings.md` and a `cadence.md` stub).
- The CMS **`_adapto_project_config`** collection with a one-item **summary** (`identity + audience + voice +
  pitch`), status `draft`.
- A read-only cache at `.adapto/project.md`.
- **Next step:** `adapto:schema-design` — propose the content schema from the brain you just built.

## Discovery (the LLM + research step)
Three moves; everything is skippable; narrate briefly as you go (conventions §10):

1. **Interview — human-only facts, one question at a time.** Offer "skip all" up front. Tailor each question's
   examples to prior answers (don't offer fintech verticals to a food blog). Cover, in order: project **type**
   → **what it does** (one sentence — grounds everything) → **audience/ICPs** (who, their pains,
   jobs-to-be-done) → **brand voice** → **do's & don'ts** → **one-line pitch** (draft it from the answers; the
   user confirms) → **named competitors** (URLs if handy) → **existing site URL** (if any). Stop as soon as the
   user is done.

2. **Research — dispatch `adapto-researcher` in parallel** (one angle each; it returns cited findings and
   never writes content — [sub-agents.md](../../shared/sub-agents.md)):
   - **your site URL** → crawl for existing pages/URLs → the internal-link **inventory**;
   - **each named competitor** → positioning, notable content, gaps → **competitors**;
   - **type + what-it-does + audience** → an initial **keyword universe** + search intent + AEO questions →
     **seo**, and candidate **content pillars** → **pillars**;
   - anything unresolved → **open-questions**.
   Proactively offer: "drop any keyword lists / Search Console exports into `.adapto/sources/` and I'll fold
   them in." Skip research entirely if the user prefers interview-only.

3. **Synthesize** the interview + research into every brain facet (Sonnet-class, §7). Be proactive — surface
   domain-relevant content ideas and angles, not just recorded answers. Seed `learnings.md` with a dated
   "discovery" entry; write a `cadence.md` stub (unset by default; optionally ask target volume/day/pillars).

## Preconditions
- **Preflight** with the `adapto:doctor` checks (CLAUDE.md §3.14).
- **Authenticated CLI + a selected tenant** (the CMS summary write needs it; confirm the **working tenant** —
  §3.5; never assume the active one).
- The `.adapto/` workspace should exist (created by `adapto:scaffold`); if missing, create the brain stubs first.
- `adapto` CLI `>= 0.1.1`.

## Plan phase
After discovery (interview + research), **before any writes**, print a machine-parseable plan and ask as a
**pickable question** (`Approve` / `Change something` / `Discuss this`, plus free-form):
- The **brain facets** to be written, with a one-line summary of each (so the user sees what was learned).
- The **CMS `_adapto_project_config` summary** fields + values (identity/audience/voice/pitch), `draft`.
- Whether `_adapto_project_config` already exists (reuse) or will be created, and the slug used.
- The cache `.adapto/project.md`. No cost/token figures (§3.10). If the user skipped everything → nothing to
  apply; say so and stop.

## Apply phase
Runs only after approval. Research already happened (read-only); now write:

1. **Brain files** — write/update each `.adapto/project/*.md` facet from the synthesis. **Reconcile, don't
   clobber:** if a facet already holds user content, merge rather than overwrite.
2. **Resolve language** — `adapto auth orgs --json` → the active tenant's first enabled code, verbatim.
3. **CMS summary** — find or create `_adapto_project_config`:
   - `adapto collections get-by-slug _adapto_project_config --json` → reuse its id if present.
   - else `adapto collections create --name "Adapto Project Config" --slug _adapto_project_config --description "Project context summary for Adapto agent skills" --language <lang> --status draft --fields-json '<fields below>'`.
   - ⚠️ **Reserved-slug fallback:** if `_adapto_` is rejected, retry once with `adapto-project-config`; record which slug worked.
   - Write the summary item: `adapto collections items create <id> --title "Project Config" --slug project-config --language <lang> --status draft --data-json '<summary>'` (or `items update` if it exists).
4. **Cache** `.adapto/project.md` (read-only): the summary + the slug used + a pointer to the local brain.
5. **Report** the brain facets written + the CMS collection/item ids. (No `--source` — collections/items have no provenance.)
6. **Next step:** `adapto:schema-design`.

Fields (`FieldDefinitionModel[]` — the CMS **summary**, not the whole brain):
```json
[
  {"name":"project_type","label":"Project type","type":"text"},
  {"name":"summary","label":"What it does (one-sentence purpose + scope)","type":"textarea"},
  {"name":"vertical","label":"Vertical / industry","type":"text"},
  {"name":"icps","label":"Target audience / ICPs","type":"textarea"},
  {"name":"brand_voice","label":"Brand voice","type":"text"},
  {"name":"tone_rules","label":"Writing do's and don'ts","type":"textarea"},
  {"name":"value_prop","label":"One-line pitch (value proposition)","type":"textarea"}
]
```
The item's `--data-json` is the keyed summary; include only fields the interview/research produced.

## Errors and recovery
- **Not authenticated / no tenant** → stop the CMS write; route to `adapto auth login` (+ `switch-tenant`).
  The brain is local, so you may still write it and defer the summary until login if the user wants.
- **`_adapto_` slug rejected** → auto-retry `adapto-project-config`; if that also fails, surface the error and stop.
- **Research yields little** (no site, no competitors, thin web results) → proceed with the interview facts,
  note the gaps in `open-questions.md`, and don't fabricate.
- **Config item already exists** → update it; never duplicate.
- **Language discovery fails** → ask for a tenant-enabled code; don't guess.
- **`adapto-researcher` unavailable** → fall back to interview-only; write the brain from the interview and log
  research as an open question.

## Forbidden actions
- Never write without an approved plan (plan-then-apply, §3.8); never assume the working tenant (§3.5).
- Never pad the interview or force answers — every question and the whole step is skippable (§3.13).
- Never **clobber** brain facets the user has edited — reconcile/merge.
- Never write CMS content beyond `_adapto_project_config`; the rich facets stay local.
- Never cache secrets into `.adapto/` (studio.md); never fabricate competitor facts — cite via the researcher.
