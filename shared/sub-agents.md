# Sub-agent model tier guide

When a skill delegates a sub-task to a model, pick the cheapest tier that won't degrade quality. Tiers
are abstract ("Haiku-class" etc.) on purpose — map them to the current cheapest/mid/frontier model at
runtime rather than hardcoding model IDs that go stale.

| Task | Tier | Why |
|---|---|---|
| HTML scrape, simple parse | Haiku-class | Cheap, near-deterministic |
| Image alt text (single) | Haiku-class | One-shot description |
| Schema inference from HTML | Sonnet-class | Structural reasoning |
| Content reconstruction | Sonnet-class | Style preservation |
| SEO meta generation | Sonnet-class | Pattern + creativity |
| FAQ generation | Sonnet-class | Content shaping |
| Internal-link planning | Sonnet-class | Corpus reasoning |
| Brand-voice check | Sonnet-class | Comparative reasoning |
| **Translation** | **Opus-class** | Lower tiers silently destroy meaning. Don't cheap out. |

## Rules
- Surface the tier **per step** in the cost plan (see [cost-estimation.md](cost-estimation.md)) so the
  user sees where spend goes.
- Deterministic work — CLI calls, JSON parsing, structural validation — uses **no** model; it's a script.
- Translation is the one place not to downgrade. Structural validation (paragraph / tag / media-placement
  counts must match source) still runs deterministically **after** the model step
  ([conventions.md](conventions.md) §3).
