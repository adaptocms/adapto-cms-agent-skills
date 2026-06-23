---
name: adapto-content-plan
namespace: adapto
description: Turn research into a content slate — propose the top content directions for this cycle, work with you to pick and refine them, and produce per-piece briefs the writer executes. Schema-aware (flags when a pick needs a new content type). Writes a dated cycle plan + ledger rows; no CMS writes.
version: 0.1.0
requires:
  cli: ">=0.0.7"
  auth: false           # plans from the local dossier + brain; no CMS writes
  project_context: true # reads the brain + research dossier
mutates: false          # writes the local cycle plan + ledger rows (no CMS)
---

# adapto:content-plan

The second pipeline step ([content-pipeline.md](../../shared/content-pipeline.md)). It reads the latest
**research dossier** and the brain, proposes the **top content directions for the cycle**, works with you to
pick and shape them, and writes a **dated cycle plan** of **per-piece briefs** — the spec the writer turns
into drafts. It also writes the ledger rows that track each piece. **No CMS writes.**

> **Autonomous-safe** ([studio.md](../../shared/studio.md) §4): local, no CMS writes — an autonomous cycle can
> run this unattended; the cycle parks at the human gate before `adapto:content-upload`.

## When to use
- "Plan this week's content", "what should we write — pick the slate", "turn the research into a plan".
- After `adapto:content-research` has produced a dossier.

## When not to use
- Gathering the research itself → `adapto:content-research`.
- Writing the drafts → `adapto:content-create`.
- Creating the schema a brief needs → `adapto:schema-design` / `adapto:schema-apply`.

## Inputs
- The latest **dossier(s)** in `.adapto/research/` (and their menu of opportunities).
- **The brain** (pillars, audience, seo, voice) for fit + voice.
- **The ledger** (`.adapto/ledger.json`) — to avoid re-proposing covered/planned pieces and to size the cycle
  against the `cadence.md` target (if set).

## Outputs
- A **dated cycle plan** `.adapto/plans/<YYYY-MM-DD>-cycle.md`: the chosen pieces, each as a **brief**
  (content-pipeline.md §3 — title, slug, type, target/secondary queries, intent, audience, angle, outline,
  internal links, AEO questions, meta intent, cornerstone, references), each anchored by its slug.
- **Ledger rows** for each chosen piece (`status: proposed` → `briefed`; pillar, target_query, cycle).
- **Next step:** `adapto:content-create` — write the briefed pieces. (Or `adapto:schema-design` first if a
  piece needs a new content type — the schema loop.)

## Planning (propose → pick → brief)
1. **Synthesize** the dossier + brain into a ranked **top-N directions** (default 10) for this cycle — each a
   one-line title + angle + the query/intent it targets + its pillar. Size to `cadence.md` if set.
2. **Present them as pickable options** (conventions §10) and work with the user: keep/drop/reshape, add their
   own ideas, mark which (if any) are **cornerstone** (top-tier writing). Don't write full content — this is
   direction-setting.
3. **Schema check (the loop).** For each pick, confirm its `type` exists: built-in `article`/`page`, or a
   custom collection present in `.adapto/schema.json`. If a pick needs a **new** collection (e.g. case
   studies), flag it and route to `adapto:schema-design` → `adapto:schema-apply` before that piece can be
   created/uploaded.
4. **Write briefs** — expand each kept direction into a full brief (content-pipeline.md §3) in the dated cycle
   plan, and add/refresh its ledger row. Then state the slate and point to `adapto:content-create`.

## Preconditions
- **Preflight** with the `adapto:doctor` checks (CLAUDE.md §3.14).
- A `.adapto/project/` **brain** and at least one **research dossier** (run `adapto:content-research` first;
  or plan thin from the brain alone and say coverage is limited).
- No auth/tenant needed (no CMS writes). `adapto` CLI `>= 0.0.7`.

## Errors and recovery
- **No dossier** → suggest `adapto:content-research`; or propose from the brain alone and flag it's ungrounded.
- **A pick needs a missing content type** → flag it and route to `adapto:schema-design`; don't brief it as
  uploadable until the schema exists.
- **The user rejects the whole slate** → re-propose from a different angle; never force pieces through.
- **Ledger write conflict** (concurrent edits) → re-read the ledger, merge the new rows, don't drop existing pieces.

## Forbidden actions
- Never write to the CMS (`mutates: false`) — plans + ledger rows are local.
- Never write full content here — briefs only (full drafts are `adapto:content-create`).
- Never brief a piece against a content type that doesn't exist — resolve the schema loop first.
- Never re-propose pieces the ledger already covers without saying so.
