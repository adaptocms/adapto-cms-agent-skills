# The Adapto content studio (`.adapto/` workspace)

The pack is a **local-first content studio that publishes to Adapto**. The agent's source of truth is the
`.adapto/` workspace **in the user's scaffolded project** (not this skills repo); Adapto CMS is the publish
target. Every studio skill reads/writes here. See also [conventions.md](conventions.md) §12 and
[content-pipeline.md](content-pipeline.md).

> **Never put secrets in `.adapto/`.** Write tokens live only in `~/.config/adapto/credentials.json` (CLI-owned).
> Nothing under `.adapto/` is ever a credential, so the committed set below is safe to share.

---

## 1. Layout (committed vs. ignored)

The **share/private split is by path** so "share the studio with my team" is a one-line gitignore flip later
(there's no team-sync infra in this phase — git is the sharing mechanism). `adapto:scaffold` creates this tree
+ `.adapto/.gitignore`; brain files are filled by `adapto:project-define`; cycle artifacts by the content pipeline.

```
.adapto/
  .gitignore                 # carves out the private/derived bits; everything else commits
  project/                   # ── COMMITTED ── the "brain" (knowledge base), §2
    INDEX.md  identity.md  audience.md  voice.md  glossary.md  competitors.md
    pillars.md  seo.md  inventory.md  learnings.md  open-questions.md  cadence.md
    # ^ written by adapto:project-define. scaffold leaves this dir empty (.gitkeep only) —
    #   no stub files, so "facet exists" always means "facet has content".
  research/                  # ── COMMITTED ── dated research dossiers   <YYYY-MM-DD>-<topic>.md
  plans/                     # ── COMMITTED ── dated cycle plans         <YYYY-MM-DD>-cycle.md
  drafts/                    # ── COMMITTED ── dated content drafts (md)  <YYYY-MM-DD>-<slug>.md
  sources/                   # ── COMMITTED ── user-dropped URLs / CSVs / GSC exports / notes
  calendar.md                # ── COMMITTED ── human editorial calendar (rendered from the ledger)
  ledger.json                # ── COMMITTED ── machine content ledger (state + local↔CMS id map), §3
  schema-plan.json           # ── COMMITTED ── schema-design output (reviewable / hand-editable)

  # ── IGNORED via .adapto/.gitignore (machine / secret / derived caches) ──
  project.md                 # flat cache of the CMS _adapto_project_config summary
  schema.json                # slug→id map written by schema-apply
  tenant.json                # working-tenant binding (id + name)
  glossary.md                # cache of _adapto_glossary
  *.cache
```

**`.adapto/.gitignore` (the carve-out) — exact content:**
```gitignore
project.md
schema.json
tenant.json
glossary.md
*.cache
```

Why this split: `project/`, `research/`, `plans/`, `drafts/`, `sources/`, `calendar.md`, `ledger.json`,
`schema-plan.json` are **team knowledge** — committing them gives PR review + full history of how the
project's understanding and content evolved. The ignored files are machine-specific or derived caches
(regenerable), so they'd only cause churn/conflicts.

---

## 2. The brain — multi-file knowledge base (`.adapto/project/`)

One file per facet so a skill loads only what it needs. Plain markdown. `adapto:project-define` builds it;
`adapto:project-learn` keeps it sharp.

| File | Holds |
|---|---|
| `INDEX.md` | One-screen overview + pointers; the "read me first". |
| `identity.md` | What it is/does, scope, one-line pitch, positioning, differentiation. |
| `audience.md` | ICPs, their pains, jobs-to-be-done, objections, where they gather. |
| `voice.md` | Brand voice, tone, do's & don'ts, reading level, formatting preferences. |
| `glossary.md` | Do-not-translate terms, brand/product names, technical vocab, preferred spellings. |
| `competitors.md` | Competitor profiles, positioning, notable content, gaps to exploit. |
| `pillars.md` | Content pillars/themes, topic taxonomy, target outcome per pillar. |
| `seo.md` | Keyword universe + clusters, search-intent map, AEO question-targets, target locales/geos, entities to own. |
| `inventory.md` | Existing site content + URLs → the internal-link map (`slug → title → topic`). |
| `learnings.md` | **Append-only**, dated trail of new findings (the self-update log). |
| `open-questions.md` | Assumptions + things-to-learn the agent should resolve. |
| `cadence.md` | Autonomous cadence config (target volume, day/time, pillars in rotation) — see §4. |

**CMS mirror:** the reserved `_adapto_project_config` collection holds a **flattened summary** of
`identity + audience + voice + pitch` only (what the backoffice/other tooling can see). The rich facets stay
local.

### Self-improvement loop (capture fast, consolidate deliberately)
- **Capture** — any skill that learns something durable appends a **dated bullet** to `learnings.md` while it
  works (cheap, never blocks the flow). Example: a competitor angle, a query that converts, a voice
  correction the user gave.
- **Consolidate** — `adapto:project-learn` distills `learnings.md` into the structured facets and closes
  items in `open-questions.md`. It's plan-then-apply so the user reviews how the brain changed (it changes
  how all future content gets written).

---

## 3. The content ledger (`ledger.json` + `calendar.md`)

One artifact tracks every piece through its whole journey. It powers **cadence, dedup, "what's next" UX, and
upload idempotency** at once — research/plan read it to avoid re-proposing covered topics; `content-upload`
uses the id-map to decide create-vs-update; publish/translate update status.

`ledger.json`:
```json
{
  "version": 1,
  "updated_at": "<iso8601>",
  "pieces": [
    {
      "ledger_id": "<stable local id>",
      "title": "Getting Started",
      "slug": "getting-started",
      "type": "article",                 // article | page | collection_item
      "collection_slug": null,           // required iff type == collection_item
      "pillar": "onboarding",
      "target_query": "how to get started with X",
      "intent": "informational",
      "cornerstone": false,
      "status": "proposed",              // proposed → briefed → drafted → uploaded → translated → published
      "cycle": "2026-06-23",
      "brief_path": ".adapto/plans/2026-06-23-cycle.md#getting-started",
      "draft_path": ".adapto/drafts/2026-06-23-getting-started.md",
      "cms": {
        "content_id": null,              // article/page/item id once uploaded
        "seo_id": null,                  // _adapto_seo item id
        "last_push_hash": null,          // sha256 of the draft body at last push
        "last_push_at": null,
        "cms_updated_at": null           // CMS item's updated_at recorded at last push (drift detection)
      },
      "translations": {},                // { "ro-RO": { "content_id": "...", "status": "uploaded" } }
      "created_at": "<iso8601>",
      "updated_at": "<iso8601>"
    }
  ]
}
```

`calendar.md` is a human-readable table rendered from the ledger (cycle · title · pillar · status · dates) —
regenerated whenever the ledger changes, so the user has a glanceable editorial calendar.

**Drift guard (one-way push, local wins).** Content flows local → CMS; the local draft is the source of
truth. The studio never auto-pulls CMS edits. On re-upload, `adapto:content-upload` compares the live CMS
item's `updated_at` to the ledger's `cms.cms_updated_at`. If they differ, the backoffice changed the item
out-of-band → **warn and ask** (overwrite / skip / import-CMS-into-local). Never silently clobber backoffice
work.

---

## 4. Cadence & autonomy (foundation built now; scheduler later)

`cadence.md` holds the project's content cadence: target volume, day/time, and which pillars are in rotation
(e.g. "3 articles/week, Mondays, pillars: onboarding + comparisons").

The pipeline is built with a hard boundary between:
- **Autonomous-safe phases** — `content-research`, `content-plan` (proposal), `content-create` (drafts):
  all local, **no CMS writes**.
- **Human-gated phases** — `content-upload`, `adapto:publish`: writes/go-live, always plan-then-apply +
  draft-first.

An **autonomous-cycle entrypoint** can run the autonomous-safe phases unattended (research → plan → draft)
and **hard-stops at the first human gate**, parking a dated plan + drafts and notifying the user. It never
uploads or publishes on its own. The runtime cron/loop that *fires* this entrypoint on a schedule is a later
opt-in — the entrypoint and `cadence.md` exist now; the scheduler wiring does not.
