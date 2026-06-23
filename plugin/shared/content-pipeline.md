# The content pipeline (research → plan → create → upload)

The studio turns project understanding into published content through four skills. Each is independently
re-runnable, each seam is a review gate, and **only the last one writes to the CMS**. This doc is the
contract the four skills share — the draft frontmatter, the brief shape, and the handoffs. See
[studio.md](studio.md) for the workspace + ledger and [seo-standards.md](seo-standards.md) for the
SEO/AEO/GEO rules content is written against.

```
content-research → content-plan → content-create → content-upload → (seo-wire) → translate → publish
   dossier           cycle plan      md drafts        CMS drafts
   (no CMS write)     (no CMS write)  (no CMS write)   (gated write)
```

Ledger status moves: `proposed` → `briefed` → `drafted` → `uploaded` → `translated` → `published`.

---

## 1. Handoffs (who reads / writes what)

| Skill | Reads | Writes | Ledger |
|---|---|---|---|
| `content-research` | brain (`identity/audience/pillars/seo/competitors/inventory`), user URLs, `.adapto/sources/`, ledger (dedup), optional SEO MCP | `.adapto/research/<date>-<topic>.md`; patches `seo.md`/`competitors.md`/`inventory.md`; appends `learnings.md` | reads (skip covered) |
| `content-plan` | latest dossier(s), brain, ledger | `.adapto/plans/<date>-cycle.md` (top-N + briefs) | adds rows `proposed`→`briefed` |
| `content-create` | approved briefs, brain, `seo-standards.md` | `.adapto/drafts/<date>-<slug>.md` (md + frontmatter) | → `drafted` |
| `content-upload` | approved drafts, ledger (id-map + drift), `.adapto/schema.json` | CMS article/page/item (draft) + `_adapto_seo` item | → `uploaded` (+ ids, hash, `cms_updated_at`) |

**Proactive BYO-data (convention).** `content-research` **asks up front**: "Do you have Search Console
exports, a keyword list, or analytics? Drop them in `.adapto/sources/` and I'll treat them as ground truth."
Don't silently wait for the user to think of it. Keyword research is web-search-first and degrades
gracefully; it auto-uses an SEO data MCP **if one is connected**, but never requires it.

**Schema loop.** `content-plan` is schema-aware: if a chosen direction needs a content type that doesn't
exist (e.g. a `case-studies` collection), it flags it and routes to `adapto:schema-design` →
`adapto:schema-apply`. `content-upload` is **schema-gated**: it hard-checks that every piece's target
type/collection exists in `.adapto/schema.json` before writing, routing back to the schema skills if not.

---

## 2. Content draft — frontmatter contract (`content-create` → `content-upload`)

Drafts are authored in **Markdown** (readable for the user's review) at
`.adapto/drafts/<YYYY-MM-DD>-<slug>.md`. `content-upload` converts the body **md → HTML** at upload time
(the CMS `content` field renders as HTML — see [cli-cheatsheet.md](cli-cheatsheet.md) §3).

```yaml
---
adapto:
  type: article                 # article | page | collection_item
  collection_slug: null         # required iff type == collection_item
  slug: getting-started
  language: en-US               # a tenant-enabled code (discover via `adapto auth orgs`)
  status: draft
  pillar: onboarding
  category_slugs: [tutorials]   # articles → categories (resolved at upload)
  author: Editorial             # brand/author from the brain; NEVER a fabricated person
  cornerstone: false            # true → the writer agent runs Opus-class
seo:
  meta_title: "Getting Started with X — A 5-Minute Guide"
  meta_description: "Set up X in five minutes: install, connect, and publish your first piece."
  canonical: null
  keywords: [getting started, onboarding, setup]
  og: { title: "...", description: "...", image: null }   # image = CDN url or null
  json_ld:                      # array of JSON-LD objects (Article, FAQPage, BreadcrumbList, ...)
    - { "@context": "https://schema.org", "@type": "Article", "headline": "Getting Started with X" }
  internal_links:               # planned links; targets are inventory slugs
    - { anchor: "the onboarding guide", target_slug: onboarding }
ledger_id: <stable local id>
---

## Body in Markdown

Readable prose with [internal links](/onboarding), headings, lists, etc. The writer bakes in
AEO question-answering structure and the planned internal links; `content-upload` converts this to HTML.
```

`content-upload` responsibilities for each draft: md→HTML body · resolve `category_slugs` + `internal_links`
against `inventory.md` (warn on unresolved, don't block) · create-or-update the article/page/item via the
ledger id-map (`--source` on articles) · **mirror the `seo:` block into the `_adapto_seo` collection** (its
own item; `json_ld` stored stringified) · update the ledger (ids, body hash, `cms_updated_at`) + `calendar.md`.

---

## 3. Per-piece brief — contract (`content-plan` → `content-create`)

Each chosen direction in the cycle plan becomes a brief block. It's the spec the writer executes, so good
briefs are what make `content-create` produce something sharp instead of generic. Anchor each brief with the
slug so the ledger `brief_path` can deep-link it.

```markdown
### Brief: Getting Started with X            <!-- anchor: #getting-started -->
- slug: getting-started
- type: article                              # article | page | collection_item (+ collection_slug)
- pillar: onboarding
- target_query: "how to get started with X"
- secondary_queries: ["X setup", "X quickstart"]
- intent: informational                      # informational | commercial | transactional | navigational
- audience: new self-serve users
- angle: "Fastest path to first value — five concrete steps, no theory."
- outline: ["What you need", "Install", "Connect your data", "Publish your first piece", "Next steps"]
- internal_links: [onboarding, pricing]      # target slugs from inventory.md
- aeo_questions: ["How do I get started with X?", "How long does X setup take?"]
- meta_intent: "Lead with speed + the 5-minute promise; reassure no-code."
- cornerstone: false
- references: ["https://competitor.example/guide", "https://docs.example/quickstart"]
```

---

## 4. Quality rules content is written against

- **Voice** — always `voice.md` (do's & don'ts, reading level) unless the user overrides for a piece.
- **SEO/AEO/GEO** — follow [seo-standards.md](seo-standards.md): title/meta patterns, OG/Twitter, the right
  JSON-LD type, question-shaped AEO passages, entity coverage, internal linking, E-E-A-T.
- **Internal links** — only to slugs that exist in `inventory.md` (or are planned this cycle in the ledger);
  unresolved links are surfaced, never invented.
- **Provenance** — articles carry `--source '{"type":"ai_generated","name":"<session>"}'` at upload (the only
  type with a `source` field). Pages/items/`_adapto_seo` items have none.
- **Draft-first** — everything lands `draft`; the user reviews on the dev server, then `adapto:publish`.
