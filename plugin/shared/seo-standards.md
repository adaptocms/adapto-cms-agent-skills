# SEO / AEO / GEO standards (content writing reference)

The reference the `adapto-writer`, `adapto-editor`, and `adapto:seo-wire` skills write/validate content
against. It captures what good looks like for **classic SEO**, **AEO** (answer-engine optimization), and
**GEO** (getting cited by generative engines) — and how each maps onto Adapto storage (`_adapto_seo`,
[content-pipeline.md](content-pipeline.md) §2) and render (`seo-wire`).

> **Verified against current best practice on 2026-06-23.** This space moves fast (AI search, schema
> deprecations, `llms.txt`) — **re-verify before relying on the fast-moving sections** (§5 AEO/GEO, §6
> `llms.txt`, the FAQ note in §4). Sources at the bottom.

**Scope rule:** content is **project-scoped** and written in the brain's `voice.md` (do's & don'ts, reading
level) unless the user overrides for a piece. SEO never overrides voice — it shapes structure and metadata,
not personality.

---

## 1. Titles & meta descriptions

- **Meta title:** ~**50–60 characters** (Google truncates near ~600px). Titles over ~70 chars are rewritten
  by Google almost 100% of the time. **Front-load the primary keyword/entity**, keep it unique per page, and
  match search intent. The H1 and the meta title can differ — H1 for readers, meta title for the SERP.
- **Meta description:** ~**150–160 characters** desktop (~110–120 for mobile-critical pages). **Not a ranking
  factor**, but drives CTR; Google rewrites descriptions that don't match intent. Front-load the value, write
  it like ad copy, one per page. Never keyword-stuff.
- These map to `seo.meta_title` / `seo.meta_description` in the draft frontmatter.

## 2. Headings, structure & URLs

- **One H1**, then a logical H2/H3 outline. Each section should stand alone (good for AEO passage extraction).
- **Slugs:** short, lowercase, hyphenated, keyword-bearing, stable (changing a slug breaks links + the
  ledger id-map — avoid).
- **Front-load the answer.** Lead sections with the direct answer/definition, then expand — both readers and
  AI engines reward it.

## 3. Open Graph & social cards

Every piece should carry OG + Twitter tags (rendered by `seo-wire`, stored in `_adapto_seo`):
- `og:title`, `og:description`, `og:type` (`article` for posts, `website` for pages), `og:url`, `og:image`
  (≥1200×630), `og:site_name`, `article:published_time` / `article:modified_time` for articles.
- `twitter:card` = `summary_large_image`, plus `twitter:title`/`description`/`image`.
- These map to `seo.og.*` in the frontmatter; the image is an Adapto CDN URL or null.

## 4. Structured data (JSON-LD)

**JSON-LD is Google's recommended format** (in `<head>` or body) and is increasingly what AI engines use to
**verify claims, establish entity relationships, and assess credibility**. Emit the type(s) that match the
content; store as a stringified array in `seo.json_ld`.

| Type | Use for | Key properties |
|---|---|---|
| `Article` / `BlogPosting` | posts, news, guides | `headline`, `datePublished`, `dateModified`, `author` (Person), `publisher` (Organization), `image`, `mainEntityOfPage` |
| `BreadcrumbList` | any nested page | `itemListElement` (position, name, item) |
| `Organization` / `WebSite` | home/about (site-level, via `seo-wire`) | `name`, `url`, `logo`, `sameAs`, `SearchAction` |
| `FAQPage` | Q&A blocks | `mainEntity` → `Question` → `acceptedAnswer` |
| `HowTo` | step-by-step | `step`, `tool`, `totalTime` |
| `Product` / `Offer` | products | `name`, `offers`, `aggregateRating`, `brand` |

- **`Article` always needs** `datePublished` + `dateModified` + a real `author` (Person) + `publisher`
  (Organization). Never fabricate an author — use the brain's author/brand.
- **FAQ note (changed 2026):** Google added a **deprecation banner to FAQ rich results** (May 2026), so
  `FAQPage` markup **no longer earns the rich-result display** in classic Search. **But keep using it where
  genuinely appropriate** — `FAQPage` is still a valid Schema.org type, harmless to ship, and has one of the
  **highest AI-citation rates** (notably more likely to surface in AI Overviews). Treat FAQ schema as an
  **AEO/GEO** play now, not a rich-snippet play. Don't bolt fake FAQs onto every page (against Google's
  guidelines) — only mark up real Q&A.
- Validate JSON-LD before shipping (no missing required props; matches visible content — schema that
  misrepresents content violates Google's policies).

## 5. AEO / GEO — getting cited by AI engines

GEO = structuring content so ChatGPT, Perplexity, Gemini, Claude, and Google **AI Overviews** cite it.
Distinct from ranking — and increasingly where discovery happens.

- **Answer-first, passage-extractable.** Lead with a crisp, self-contained answer to a specific question;
  AI engines lift passages. The brief's `aeo_questions` are the questions each piece should directly answer
  (ideally as a clear section or a real FAQ block).
- **Entity coverage & specificity.** Name the entities (products, people, standards, places) and their
  relationships explicitly; cite concrete facts, numbers, and dates. Vague/generic copy doesn't get cited.
- **Freshness matters a lot.** Content updated within ~30 days earns materially more AI citations — keep
  `dateModified` honest and refresh cornerstone pieces. (Surface stale cornerstones in `learnings.md`.)
- **Verifiability & authority.** Perplexity rewards verifiable citations; Claude favors multi-source,
  balanced, non-promotional content; ChatGPT leans on domain reputation + readability; Gemini inherits
  Google's ranking. **Cite primary sources, link out, avoid hype** (and don't compete on price — house rule).
- **Coverage is fragmented.** Being cited by one engine doesn't transfer to another (only ~11% of domains
  are cited by both ChatGPT and Perplexity) — so write genuinely useful, broadly-sourced content rather than
  gaming one engine.
- **Structured data helps AI**, not just Search (see §4) — it's how AI Mode verifies and attributes.

## 6. `llms.txt` / `llms-full.txt`

Markdown files at the **site root** that summarize the site for LLMs (generated by `seo-wire` from
`inventory.md`):
- **Format:** a single `# Project/Brand` H1, optional blockquote summary, then sections of link lines in the
  exact shape `- [Title](https://url): one-line description`. `llms.txt` = curated index; `llms-full.txt` =
  the fuller set.
- **Adoption (2026):** a real AEO signal that major orgs (Anthropic, Stripe, Vercel, Cloudflare) publish.
- **Honest caveat:** AI crawlers (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) **still
  rarely fetch `/llms.txt`** — they mostly crawl HTML directly. So it's **low-cost and worth shipping, but
  not a guaranteed win**; don't oversell it. Keeping the HTML itself clean and well-structured matters more.

## 7. E-E-A-T (Experience, Expertise, Authoritativeness, Trust)

Drives both rich-result eligibility and AI citation. Signal it concretely:
- Real, attributed authors with credentials/bio; clear publisher/Organization identity.
- First-hand experience (original data, testing, examples) over rehashed summaries.
- Accurate `datePublished`/`dateModified`; citations to primary sources; corrections when wrong.
- No deceptive or auto-generated-looking filler. Trust is the load-bearing letter.

## 8. Internal linking

- Link only to slugs that exist in `inventory.md` (or are planned this cycle in the ledger) — `content-upload`
  warns on unresolved links and never invents them.
- **Descriptive anchor text** (not "click here"); link to the most relevant pillar/cluster pages; keep
  important pages within a few clicks of the home/pillar. Internal links pass context to both crawlers and AI.

---

## What `content-create` bakes into every draft (checklist)

`meta_title` (§1) · `meta_description` (§1) · `og.*` (§3) · the right `json_ld` type(s) (§4) · answer-first
sections + `aeo_questions` coverage (§5) · honest `datePublished`/`dateModified` (§4/§7) · resolved
`internal_links` (§8) · author/brand from the brain (never fabricated) · all in `voice.md`'s voice.

---

### Sources (verified 2026-06-23)
- GEO 2026 — frase.io/blog/what-is-generative-engine-optimization-geo ; coseom.com/generative-engine-optimization-guide
- llms.txt 2026 — aeo.press/ai/the-state-of-llms-txt-in-2026 ; codersera.com/blog/llms-txt-complete-guide-2026
- Titles/descriptions 2026 — zyppy.com/title-tags/meta-title-tag-length ; scalenut.com/blogs/meta-title-length-best-practices-2026
- Structured data / FAQ 2026 — developers.google.com/search/docs/appearance/structured-data ; digitalapplied.com/blog/structured-data-seo-2026-rich-results-guide ; getpassionfruit.com (FAQ rich results change)
