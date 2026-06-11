---
name: adapto-project-define
namespace: adapto
description: Capture project context (type, audience, voice, writing rules, one-line pitch) through a short, skippable Q&A and store it in Adapto as the reserved _adapto_project_config collection, so other skills write on-brand. Plan-then-apply; fully optional.
version: 0.1.0
requires:
  cli: ">=0.0.7"
  auth: true             # writes to the CMS — needs an authenticated CLI + selected tenant
  project_context: false # this skill CREATES the project context; it doesn't require one
mutates: true
---

# adapto:project-define

The project's single source of truth, stored **in the CMS** (not the repo): a reserved
`_adapto_project_config` collection holding one config item. It's gathered through a **short, skippable
Q&A** and cached read-only to `.adapto/project.md` for fast lookup. Other skills (`adapto:content-seed`,
`adapto:translate`) read it to stay on-brand. The whole step is **optional** — skills work without it.

## When to use
- Setting up a project and you want agent-generated content to match your brand, voice, and audience.
- Triggers: "define my project", "set up project context", "tell Adapto about my brand/voice".

## When not to use
- The user would rather not answer questions → skip it entirely (skills fall back to no project context).
- Just checking the environment → `adapto:doctor`.

## Inputs
- A short Q&A, **every question optional**, asked **one at a time** — each question and its example options
  are tailored to the user's earlier answers: project type → vertical/industry → audience (ICPs) → brand
  voice → writing do's & don'ts → one-line pitch. Every question offers options to pick from plus a free-form answer.
- The tenant's language (discovered via `adapto auth orgs`).

## Outputs
- A reserved collection `_adapto_project_config` (created once) with one config **item** holding the answers (status `draft`).
- A read-only cache at `.adapto/project.md` (gitignored) noting the values and the slug actually used.
- A report: collection id, slug used, item id.

## The Q&A (interaction UX — §3.13)
Ask **one question at a time, in sequence**, and use each answer to **re-tailor the next question and its
example options** to what the user has said so far. **Never show examples that don't fit the project** — if
it's a food blog, don't offer "fintech / devtools" verticals. Offer **"skip all"** up front; every question
is individually skippable; stop as soon as the user is done. Each question presents a few selectable options
**plus a "write your own"** choice — never a blank prompt.

**1. Project type — ask first; it frames everything.** Offer a broad predefined set **and** an own-answer
option, e.g.: marketing / landing site · blog or publication · documentation · e-commerce / store ·
portfolio · news / magazine · help center / knowledge base · community / forum · events · nonprofit —
**or describe your own.**

**2. What it does — ask right after the type; it grounds everything.** One question:
*"In one sentence, what does {project-name} do — its purpose and scope?"* (offer a draft inferred from the
type + a free-form answer). This is the **agent's working understanding of the project's domain**: use it to
sharpen every later question's examples **and** to lead proactively — surface domain-relevant approaches,
insights, content ideas, and use cases rather than just recording the answer.

**3+. Derive every later question from the answers so far.** For each remaining field, generate 2–4 example
options that fit the type + what-it-does (and the vertical, audience, etc. as they accumulate):
vertical/industry → audience (ICPs) → brand voice → writing do's & don'ts (concrete words/phrasing/formatting
to use or avoid) → one-line pitch (draft it from the earlier answers; the user confirms or edits). If earlier
answers already cover a later question, skip it rather than asking redundantly.

**Worked example — shows the intent, don't hardcode it.** If project type = *food blog*:
- What it does → *"Publishes tested weeknight recipes and cooking guides for home cooks."* (then the agent leans
  on that domain — e.g. proposes recipe/collection structure, seasonal content, nutrition notes).
- Vertical → *home cooking · baking · vegan / plant-based · restaurant reviews · meal prep* (NOT fintech / devtools).
- Audience → *busy home cooks · new bakers · budget families*.
- Brand voice → *warm & encouraging · playful · no-nonsense*.
- Do's & don'ts → *Do: short numbered steps, metric + imperial units; Don't: long life-story intros, hype words*.
- Pitch draft → *"Approachable weeknight recipes for busy home cooks — dinner on the table in 30 minutes."*

Keep each question to one line, no preamble.

## Preconditions
- Authenticated CLI (`adapto auth me` succeeds) with a selected tenant — run `adapto:doctor` if unsure.
- `adapto` CLI `>= 0.0.7`.

## Plan phase
After the Q&A (or skip), print a machine-parseable plan, then ask as a **pickable question** (conventions §10)
with options **`Approve`** / **`Change something`** / **`Discuss this`** (plus free-form) — don't make the user
type "approve". The plan covers:
- Whether `_adapto_project_config` already exists (reuse) or will be created, and under which slug.
- The fields it will define and the config item it will create/update, with the gathered values (`draft`).
- The cache file `.adapto/project.md` it will write.
- No cost/token figures (§3.10). If the user skipped everything, there's nothing to apply — say so and stop.

## Apply phase
Runs only after approval. Deterministic CLI calls (the Q&A was the only LLM step):

1. **Resolve language:** `adapto auth orgs --json` → use the active tenant's first enabled language code, verbatim.
2. **Find or create the collection:**
   - `adapto collections get-by-slug _adapto_project_config --json` → if it exists, reuse its `id`.
   - Else create it:
     `adapto collections create --name "Adapto Project Config" --slug _adapto_project_config --description "Project context for Adapto agent skills" --language <lang> --status draft --fields-json '<fields below>'`
   - ⚠️ **Reserved-slug fallback (§11.2, server-side acceptance unverified):** if the create is rejected because of the `_adapto_` slug, retry **once** with slug `adapto-project-config`. Record which slug succeeded.
3. **Write the config item:** `adapto collections items create <collection_id> --title "Project Config" --slug project-config --language <lang> --status draft --data-json '<answers>'`. If a config item already exists, `items update` it instead of creating a duplicate.
4. **Cache** read-only to `.adapto/project.md` (gitignored) — the values plus the slug used — so other skills can read it.
5. **Report** collection id, slug used, item id. (No `--source` — collections/items have no provenance field.)
6. **Next step:** suggest **`adapto:schema-design`** — now that the brand/voice is captured, propose the
   content schema (collections + categories) from it. (Or, if skipped, content skills still work without context.)

Fields (`FieldDefinitionModel[]` for `--fields-json`):
```json
[
  {"name":"project_type","label":"Project type","type":"text"},
  {"name":"summary","label":"What it does (one-sentence purpose + scope)","type":"textarea"},
  {"name":"vertical","label":"Vertical / industry","type":"text"},
  {"name":"icps","label":"Target audience / ICPs","type":"textarea"},
  {"name":"brand_voice","label":"Brand voice","type":"text"},
  {"name":"tone_rules","label":"Writing do's and don'ts","type":"textarea"},
  {"name":"value_prop","label":"One-line pitch (value proposition)","type":"textarea"}
]
```
The item's `--data-json` is the keyed map of answers, e.g. `{"project_type":"SaaS marketing site","brand_voice":"friendly"}` — include only the fields the user answered.

## Errors and recovery
- **Not authenticated / no tenant** → stop; tell the user to run `adapto auth login` (and `auth switch-tenant` if needed). Never attempt writes unauthenticated.
- **`_adapto_` slug rejected** → auto-retry with `adapto-project-config` (step 2). If that also fails, surface the exact CLI error and stop.
- **Config item already exists** → update it; don't create a duplicate.
- **Language discovery fails** → ask the user for a language code that the tenant has enabled (don't guess).

## Forbidden actions
- Never write without an approved plan (plan-then-apply, §3.8).
- Never pad the Q&A or force answers — every question is skippable and the whole step is optional (§3.13).
- Never write CMS content beyond this skill's `_adapto_project_config` collection + item.
- Never cache secrets into `.adapto/project.md` — it holds only the project answers.
