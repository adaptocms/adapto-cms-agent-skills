---
name: adapto-content-research
namespace: adapto
description: Research content opportunities for the project — web, competitors, your own URLs, and an initial keyword/intent map — using parallel researcher subagents grounded in the project brain. Proactively asks for your own data (Search Console, keyword lists). Writes a dated research dossier; no CMS writes.
version: 0.1.0
requires:
  cli: ">=0.1.1"        # reads the local ledger; preflight parity
  auth: false           # research is web + local brain; no CMS writes
  project_context: true # reads the .adapto/project/ brain
mutates: false          # writes local research artifacts only (no CMS)
---

# adapto:content-research

The first step of the content pipeline ([content-pipeline.md](../../shared/content-pipeline.md)). It
**researches what's worth writing** — grounded in the project brain — and produces a **dated research
dossier** the planning step turns into a content slate. It fans out `adapto-researcher` subagents across
angles, proactively pulls in **your own data**, and reads the ledger so it never re-researches covered
ground. **No CMS writes** — safe and re-runnable.

> **Autonomous-safe** ([studio.md](../../shared/studio.md) §4): local, no CMS writes — an autonomous cycle can
> run this unattended; the cycle parks at the human gate before `adapto:content-upload`.

## When to use
- "Research content ideas", "what should we write about", "do content research", "look at competitor X".
- Start of a content cycle, after the brain exists (`adapto:project-define`).

## When not to use
- Turning research into a plan/slate → `adapto:content-plan`.
- Writing drafts → `adapto:content-create`.
- Consolidating learnings into the brain → `adapto:project-learn`.

## Inputs
- **The brain** (`.adapto/project/`: identity, audience, pillars, seo, competitors, inventory).
- **Your data, proactively requested** — ask up front: "drop any Search Console exports, keyword lists, or
  analytics into `.adapto/sources/` and I'll treat them as ground truth." (conventions §16)
- **URLs you provide** — competitor pages or interesting web content to factor in.
- **The ledger** (`.adapto/ledger.json`) — to skip already-covered/planned topics.
- Optional: a connected SEO-data MCP (used automatically if present; never required).

## Outputs
- A **dated dossier** `.adapto/research/<YYYY-MM-DD>-<topic>.md`: findings by angle (cited), a keyword/intent
  map, competitor gaps, and a **menu of content opportunities** for planning.
- **Additive** enrichment of `seo.md` / `competitors.md` / `inventory.md` (append new findings — never rewrite;
  deliberate consolidation is `adapto:project-learn`'s job) and a dated `learnings.md` entry.
- **Next step:** `adapto:content-plan` — turn the dossier into a cycle slate of briefs.

## Research (the fan-out step)
1. **Ask for BYO data** (above) and any URLs the user wants considered.
2. **Scope** from the brain + the request: the pillars/queries/competitors to investigate this run; read the
   ledger to exclude covered topics.
3. **Fan out `adapto-researcher`** — one angle per subagent, in parallel ([sub-agents.md](../../shared/sub-agents.md)):
   query clusters, competitor recent content, PAA/related questions, the user's URLs, and (if there's no site
   inventory yet) a crawl of the user's site. Each returns cited findings. For volume/difficulty: **auto-use a
   connected SEO MCP** if present; otherwise the researcher runs the **no-paid-tool keyword playbook** —
   Google/Bing/YouTube **autocomplete expansion**, **PAA / related recursion**, and a **SERP-composition
   difficulty heuristic** — reporting **qualitative bands**, never fabricated numbers. It does **not**
   auto-crawl competitor sitemaps/indexes.
4. **Synthesize** into the dossier: group findings, build the keyword/intent map + AEO question targets, list
   competitor gaps, and surface a ranked **menu of opportunities** (titles/angles) — not full plans.
5. Append the additive facet enrichments + a `learnings.md` note, then point to `adapto:content-plan`.

## Preconditions
- **Preflight** with the `adapto:doctor` checks (CLAUDE.md §3.14).
- A `.adapto/project/` **brain** (run `adapto:project-define` first; or proceed thin with a one-line
  description and note the gap).
- No auth/tenant needed (no CMS writes). `adapto` CLI `>= 0.1.1`.

## Errors and recovery
- **No brain** → suggest `adapto:project-define`; or proceed from a short description and flag it's ungrounded.
- **Thin web results / no data** → report what was found, write the dossier with what you have, note gaps;
  never fabricate findings or metrics.
- **`adapto-researcher` unavailable** → do a reduced single-pass research inline and say coverage is limited.
- **A URL won't fetch** → note it and continue with the rest.

## Forbidden actions
- Never write to the CMS (`mutates: false`).
- Never **rewrite** brain facets — only append additive findings (consolidation is `adapto:project-learn`).
- Never invent keyword metrics — qualitative bands unless a real data source provided numbers (conventions §16).
- Never re-research topics the ledger shows as covered without saying so.
