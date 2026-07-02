# Prose standards (anti-slop reference)

The prose-quality reference `adapto-writer` writes against and `adapto-editor` **hard-gates** on. It bans
the predictable AI writing patterns ("slop") that make content read machine-made. Scope: **reader-facing
prose** — draft bodies, `meta_title`/`meta_description`, translations, microcopy values (§6). Internal
artifacts (research dossiers, briefs, brain facets, learnings) are working notes and are **not** policed.

> Adapted from **stop-slop** by Hardik Pandya (hvpandya.com), MIT-licensed. Consolidated for the studio;
> the SEO/AEO carve-outs (§5) and scope rules (§6) are ours.

**Enforcement:** the writer runs the §4 quick checks and fixes every hit *before* writing the draft file;
`content-create` runs a **deterministic em-dash gate** on each draft body (a literal grep — see its
SKILL.md) before spending an editor pass; the editor re-runs the full checks as a **hard gate** — any hit
forces verdict `revise` with the offending text quoted.

---

## 1. Core rules

1. **Cut filler.** No throat-clearing openers, no emphasis crutches, no adverbs (§2).
2. **Break formulaic structures.** No binary contrasts, negative listing, dramatic fragmentation,
   rhetorical setups, false agency (§3).
3. **Active voice.** Every sentence has a subject doing something. Never an inanimate object performing a
   human action ("the complaint becomes a fix" — someone fixed it).
4. **Be specific.** Name the thing. No vague declaratives ("the implications are significant"), no lazy
   extremes ("every", "always", "never") doing vague work.
5. **Put the reader in the room.** "You" beats "people". Specifics beat abstractions. No
   narrator-from-a-distance voice.
6. **Vary rhythm.** Mix sentence lengths. Two items beat three. End paragraphs differently. **No em
   dashes** (en dashes allowed only inside numeric ranges, `50–60`).
7. **Trust readers.** State facts directly; skip softening, justification, hand-holding.
8. **Cut quotables.** If it sounds like a pull-quote, rewrite it.

## 2. Banned phrases

**Throat-clearing openers** — cut them and state the point:
"Here's the thing:", any "here's what/this/that/why …" construction, "The uncomfortable truth is",
"It turns out", "The real X is", "Let me be clear", "The truth is,", "I'm going to be honest",
"Can we talk about", "Here's the problem though".

**Emphasis crutches** — delete; they add no meaning:
"Full stop." / "Period.", "Let that sink in.", "This matters because", "Make no mistake",
"Here's why that matters".

**Business jargon** — plain language instead:

| Avoid | Use instead |
|---|---|
| navigate (challenges) | handle, address |
| unpack (analysis) | explain, examine |
| lean into | accept, embrace |
| landscape (context) | situation, field |
| game-changer | significant, important |
| double down | commit, increase |
| deep dive | analysis, examination |
| moving forward | next, from now |
| circle back | return to, revisit |

**Adverbs** — kill all of them (-ly words; softeners, intensifiers, hedges): "really", "just", "literally",
"genuinely", "honestly", "simply", "actually", "deeply", "truly", "fundamentally", "inherently",
"inevitably", "interestingly", "importantly", "crucially". Also these fillers: "At its core",
"In today's X", "It's worth noting", "At the end of the day", "When it comes to", "In a world where",
"The reality is".

**Meta-commentary** — the piece should move, not announce its own structure: "Hint:", "Plot twist:",
"Spoiler:", "You already know this, but", "X is a feature, not a bug", "Let me walk you through…",
"In this section, we'll…", "As we'll see…", "The rest of this piece explains…".

**Telling instead of showing** — announcing significance rather than demonstrating it:
"This is genuinely hard", "This is what X actually looks like", "actually matters".

**Vague declaratives** — replace with the specific thing or cut: "The reasons are structural",
"The implications are significant", "The stakes are high", "The consequences are real",
"This is the deepest problem".

## 3. Banned structures

**Binary contrasts** — telegraphed reversals; state Y directly and drop the negation:
"Not because X. Because Y." · "X isn't the problem. Y is." · "The answer isn't X. It's Y." ·
"It feels like X. It's actually Y." · "The question isn't X. It's Y." · "not X, it's Y" ·
"not just X but also Y" · "stops being X and starts being Y" · "doesn't mean X, but actually Y".

**Negative listing** — "Not a X. Not a Y. A Z." → state Z; the reader doesn't need the runway.

**Dramatic fragmentation** — "[Noun]. That's it. That's the [thing]." · staccato "X. And Y. And Z." ·
"This unlocks something. [Word]." → complete sentences; trust content over presentation.

**Rhetorical setups** — "What if [reframe]?", "Here's what I mean:", "Think about it:",
"And that's okay." → make the point; let readers draw conclusions.

**Pull-quote enders** — sentences ending "X, not Y." engineered to sound quotable → rewrite as a plain
statement.

**Narrator tics** — "the kicker", "the catch is", "the thing is", "the pattern that jumps out" → show
the point; put the reader in the room.

**False agency** — inanimate things doing human verbs hide the actor: "the decision emerges",
"the data tells us", "the culture shifts", "the market rewards", "a complaint becomes a fix",
"the conversation moves toward". Name the human ("the team fixed it that week"); if no specific person
fits, use "you".

**Narrator-from-a-distance** — "Nobody designed this.", "This happens because…", "This is why…",
"People tend to…" → put the reader in the scene ("You don't sit down one day and decide to…").

**Passive voice** — "X was created", "mistakes were made", "it is believed that", "the decision was
reached" → find the actor, put them at the front of the sentence.

**Sentence starters** — don't open sentences with What/When/Where/Which/Who/Why/How (restructure: lead
with the subject or the verb — AEO question headings are the exception, §5); don't open paragraphs with
"So"; never "Look,".

**Rhythm patterns** — three-item lists (use two or one) · questions answered immediately · every paragraph
ending punchy · **em dashes anywhere** (use commas or periods) · stacked short punchy sentences ·
"Not always. Not perfectly." hedging.

**Lazy extremes** — "every", "always", "never", "everyone", "everybody", "nobody" as false authority →
use specifics instead of sweeping claims.

## 4. Quick checks (writer self-check · editor gate)

Run on the body **and** `meta_title`/`meta_description` before delivering. The editor runs the same list;
**any hit forces `revise`**:

- Any adverbs? Kill them.
- Any passive voice? Find the actor, make them the subject.
- Inanimate thing doing a human verb ("the decision emerges")? Name the person.
- Sentence starts with a Wh- word (outside an AEO question heading, §5)? Restructure it.
- Any "here's what/this/that" throat-clearing? Cut to the point.
- Any "not X, it's Y" contrast? State Y directly.
- Three consecutive sentences match length? Break one.
- Paragraph ends with a punchy one-liner? Vary it.
- Em dash anywhere in the body or meta text? Remove it (`content-create` greps the body — the count must
  be 0; en dashes only inside numeric ranges).
- Vague declarative ("The implications are significant")? Name the specific implication.
- Narrator-from-a-distance ("Nobody designed this")? Put the reader in the scene.
- Meta-joiner ("The rest of this piece…")? Delete. Let the piece move.

## 5. SEO/AEO carve-outs (NOT slop)

These rules never override [seo-standards.md](seo-standards.md) structure. Do **not** flag:

- **Question-form headings** for FAQ/AEO blocks ("How long does X setup take?") — they mirror real queries
  and seo-standards §5 requires them. The Wh-starter ban applies to body sentences, not these headings.
- **Answer-first openings** — leading with the direct answer is required (seo-standards §2/§5), not
  throat-clearing.
- **Frontmatter data fields** — `keywords`, `json_ld`, `og.*`, slugs, enums are data, not prose.
  `meta_title` and `meta_description` **are** prose and follow these rules within their length budgets
  (seo-standards §1).

## 6. Scope & language

- **Applies to:** draft bodies + meta text (`content-create`, `content-seed`), translations
  (`adapto:translate`, in the target language), and microcopy values (`adapto:microcopy` — the applicable
  rules: plain language, no filler/jargon; rhythm/paragraph rules don't fit button labels).
- **Does not apply to:** research dossiers, cycle plans/briefs, brain facets, learnings — internal working
  notes (a brief may quote a competitor's slop verbatim without triggering anything).
- **Other languages:** the §2/§3 ban-lists are English. For other locales apply the **principles** (active
  voice, no filler, no formulaic contrasts, varied rhythm), not the literal strings.
- **Translations never rewrite:** apply the principles to the prose you produce, but stay faithful to the
  source — never "fix" a slop-y source at the cost of structural parity (the translate parity gate wins).
