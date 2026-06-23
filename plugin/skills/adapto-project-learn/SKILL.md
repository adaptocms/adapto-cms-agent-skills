---
name: adapto-project-learn
namespace: adapto
description: Consolidate what the agent has learned while working — distill the dated notes in .adapto/project/learnings.md into the structured brain facets and close items in open-questions.md — so the project brain gets sharper over time. Reviews a diff before writing; local only (no CMS writes).
version: 0.1.0
requires:
  cli: ">=0.0.7"        # not used directly; preflight parity with the other skills
  auth: false           # operates on local brain files only
  project_context: true # needs an existing .adapto/project/ brain to consolidate
mutates: false          # writes only local brain files (no CMS); still gated by a review diff (see Consolidation)
---

# adapto:project-learn

The brain's **consolidation** step. While the content skills work, they append dated findings to
`.adapto/project/learnings.md` (capture fast). This skill does the deliberate half: it **distills those raw
learnings into the structured facets** (`audience.md`, `seo.md`, `competitors.md`, …) and **closes resolved
items in `open-questions.md`**, so the project brain genuinely improves over time instead of drifting. Local
only — no CMS writes — and it shows you a **diff to approve before writing** (the brain is your source of
truth; conventions §15 / [studio.md](../../shared/studio.md)).

## When to use
- "Consolidate what you've learned", "update the project brain", "fold my notes into the brain".
- After a content cycle, or whenever `learnings.md` / `open-questions.md` has grown.

## When not to use
- Building the brain from scratch (interview + research) → `adapto:project-define`.
- Writing content → the content pipeline (`content-research` → … → `content-upload`).
- Just checking the environment → `adapto:doctor`.

## Inputs
- `.adapto/project/learnings.md` (the append-only capture log) and `open-questions.md`.
- The current facet files (`identity`, `audience`, `voice`, `glossary`, `competitors`, `pillars`, `seo`,
  `inventory`) — to merge into, not overwrite.

## Outputs
- Updated facet files reflecting the consolidated learnings.
- `open-questions.md` with resolved items closed (and any new ones added).
- `learnings.md` with consolidated entries **marked as consolidated** (kept for history, not deleted) plus a
  dated consolidation note.
- **Next step:** back into the flow — usually `adapto:content-research` for the next cycle (now sharper), or
  `adapto:content-plan` if research is still fresh.

## Consolidation (review, then write — no CMS)
1. **Read** `learnings.md` + `open-questions.md` + the facet files.
2. **Distill** (Sonnet-class, §7): group raw learnings by facet; decide what each changes (a new audience
   pain, a keyword that converts, a competitor angle, a voice correction); identify which open questions are
   now answered.
3. **Show a diff** of the proposed facet changes + which open-questions close + which learnings get marked
   consolidated, and ask as a **pickable question** (`Approve` / `Change something` / `Discuss this`). Because
   this rewrites a brain the user may have hand-edited, **merge — never clobber** — and surface anything
   ambiguous instead of guessing.
4. **On approval, write** the facet updates, close the open-questions, mark the consolidated learnings, and
   append a dated `learnings.md` note ("consolidated N items on `<date>`"). Then state what changed and propose
   the next step.

## Preconditions
- **Preflight** with the `adapto:doctor` checks (CLAUDE.md §3.14).
- A `.adapto/project/` **brain must exist** (run `adapto:project-define` first if not).
- No auth/tenant needed — local files only.

## Errors and recovery
- **No brain** (`.adapto/project/` absent) → stop; route to `adapto:project-define`.
- **`learnings.md` empty / nothing new** → say there's nothing to consolidate and stop.
- **A learning contradicts a curated facet** → don't silently overwrite; surface the conflict in the diff and
  let the user decide.
- **Ambiguous learning** → leave it in `learnings.md` (unconsolidated) and add an `open-questions.md` entry.

## Forbidden actions
- Never write to the CMS (`mutates: false`) — this skill only touches local brain files.
- Never **clobber** user-edited facets — merge, and review the diff before writing.
- Never **delete** raw learnings — mark them consolidated and keep them for history.
- Never fabricate facts to "resolve" an open question — only close what the learnings actually answer.
