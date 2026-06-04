# Sub-agent model tier guide

When a skill delegates a sub-task to a model, pick the cheapest tier that won't degrade quality. Tiers
are abstract ("Haiku-class" etc.) on purpose — map them to the current cheapest/mid/frontier model at
runtime rather than hardcoding model IDs that go stale.

| Task | Tier | Why |
|---|---|---|
| Image alt text (single) | Haiku-class | One-shot description |
| Schema proposal from project context | Sonnet-class | Structural reasoning |
| Content drafting (seed) | Sonnet-class | Style + structure |
| SEO meta generation | Sonnet-class | Pattern + creativity |
| FAQ generation | Sonnet-class | Content shaping |
| Internal-link planning | Sonnet-class | Corpus reasoning |
| Brand-voice check | Sonnet-class | Comparative reasoning |
| **Translation** | **Opus-class** | Lower tiers silently destroy meaning. Don't cheap out. |

## Rules
- Choose the cheapest adequate tier **internally** — the pack does not surface cost or token estimates
  to the user (out of scope; CLAUDE.md §3.10).
- Deterministic work — CLI calls, JSON parsing, structural validation — uses **no** model; it's a script.
- Translation is the one place not to downgrade. Structural validation (paragraph / tag / media-placement
  counts must match source) still runs deterministically **after** the model step
  ([conventions.md](conventions.md) §3).
