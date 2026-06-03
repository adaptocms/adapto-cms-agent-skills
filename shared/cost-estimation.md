# Cost estimation (plan-phase UX)

Every mutating skill surfaces a token + cost estimate in its plan phase
([conventions.md](conventions.md) §1). There's no hard cap — the goal is informed consent before spend.

## Format

A per-step table (model tier from [sub-agents.md](sub-agents.md), est. tokens, est. cost), a total, the
billing source by name, the variance driver, and three actions:

```
Step                                Model           Tokens (est)   Cost (est)
─────────────────────────────────────────────────────────────────────────────
Fetch 24 pages                      Haiku-class     ~120k          $0.04
Infer schema from HTML              Sonnet-class    ~200k          $0.08
Reconstruct 24 posts                Sonnet-class    ~800k          $0.31
Translate (per tenant locale)       Opus-class      ~600k          $0.62
SEO meta (24 items)                 Sonnet-class    ~280k          $0.11
                                                                  ─────
Total                                                              $1.16

Billed to: Anthropic API key (from ANTHROPIC_API_KEY — never print the value)
Variance: ±30% on page size.

[approve]  [revise scope]  [cancel]
```

`approve` → apply phase. `revise` → reopen the scope dialog. `cancel` → abort.

## Rules
- Tiers, not model IDs (avoid staleness) — see [sub-agents.md](sub-agents.md).
- Reference the billing key by env var name only; never print the value (see
  [forbidden-actions.md](forbidden-actions.md)).
- Writes are mostly per-item: **only collection items batch** (`collections items create-batch`);
  articles, pages, categories, and microcopy are one CLI call each — size token/time estimates as
  per-item loops.
- State the variance driver explicitly (page size, item count, translation length).
