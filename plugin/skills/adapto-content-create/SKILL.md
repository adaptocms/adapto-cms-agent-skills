---
name: adapto-content-create
namespace: adapto
description: Write the briefed content — for each approved brief, dispatch the writer agent (top-tier for cornerstone pieces) to produce a complete, on-brand Markdown draft with SEO/AEO/GEO metadata and internal links, then run the editor critic and revise. Writes dated md drafts for your review; no CMS writes.
version: 0.1.0
requires:
  cli: ">=0.0.7"
  auth: false           # writing is local; no CMS writes
  project_context: true # reads the brain + briefs
mutates: false          # writes local md drafts only (no CMS)
---

# adapto:content-create

The third pipeline step ([content-pipeline.md](../../shared/content-pipeline.md)). It executes the briefs
from the cycle plan into **complete Markdown drafts** — on-brand, with SEO/AEO/GEO metadata, JSON-LD, and
internal links baked into the frontmatter — for you to **review as files** before anything reaches Adapto. It
uses `adapto-writer` to draft and `adapto-editor` to critique, and writes nothing to the CMS.

> **Autonomous-safe** ([studio.md](../../shared/studio.md) §4): local, no CMS writes — an autonomous cycle can
> run this unattended; the cycle parks at the human gate before `adapto:content-upload`.

## When to use
- "Write the planned content", "draft these pieces", "create the articles from the plan".
- After `adapto:content-plan` has produced briefs (status `briefed` in the ledger).

## When not to use
- Choosing what to write → `adapto:content-plan`.
- Pushing approved drafts to Adapto → `adapto:content-upload`.
- Translating existing content → `adapto:translate`.

## Inputs
- The **approved briefs** in the latest `.adapto/plans/<date>-cycle.md` (and their ledger rows).
- **The brain** — `voice.md`, `glossary.md`, `identity.md`, `audience.md`, `inventory.md` (for internal links).
- **The standards** — [seo-standards.md](../../shared/seo-standards.md) and the frontmatter contract
  (content-pipeline.md §2).

## Outputs
- A **dated Markdown draft** per piece at `.adapto/drafts/<YYYY-MM-DD>-<slug>.md` with full frontmatter
  (the `adapto:` + `seo:` blocks) and an on-brand body — the artifact **you review**.
- Ledger rows advanced to `status: drafted` (with `draft_path`).
- **Next step:** review the drafts, then `adapto:content-upload` to push the ones you approve to Adapto (as
  drafts).

## Creation (write → critique → revise)
1. **Select** the briefs to write this run (default: all `briefed` in the latest cycle; or a subset the user names).
2. **Write each brief — dispatch `adapto-writer`** (one per brief). For briefs marked `cornerstone: true`,
   dispatch the writer at the **top model tier (Opus-class)**; otherwise Sonnet-class
   ([sub-agents.md](../../shared/sub-agents.md) §7). The writer reads the brain + standards and produces the
   md draft with full frontmatter.
3. **Critique — dispatch `adapto-editor`** on each draft (voice fit, SEO/AEO/GEO completeness, internal-link
   coverage, structure). If the verdict is `revise`, hand the gaps back to the writer and revise until solid.
4. **Write the drafts** to `.adapto/drafts/`, advance the ledger to `drafted`, and tell the user **which files
   to read** (perfectly named + dated). Point to `adapto:content-upload` for the ones they approve.

## Preconditions
- **Preflight** with the `adapto:doctor` checks (CLAUDE.md §3.14).
- A cycle plan with **briefs** (run `adapto:content-plan` first).
- No auth/tenant needed (no CMS writes). `adapto` CLI `>= 0.0.7`.

## Errors and recovery
- **No briefs** → suggest `adapto:content-plan`.
- **`adapto-writer` unavailable** → write inline at the best available tier and say so; never silently
  downgrade a cornerstone piece without flagging it.
- **Editor keeps returning `revise`** → after a couple of passes, surface the remaining gaps to the user
  rather than looping forever.
- **A brief references a missing internal-link target** → write the link as planned but flag it;
  `content-upload` re-checks against the inventory and warns.

## Forbidden actions
- Never write to the CMS (`mutates: false`) — drafts are local md for review.
- Never write raw HTML bodies — drafts are Markdown; `content-upload` converts to HTML.
- Never fabricate an author or invent facts/metrics — use the brief's references + the brain.
- Never skip the voice — every draft matches `voice.md` unless the user overrode it for that piece.
