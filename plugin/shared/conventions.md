# Conventions every skill follows

Operating rules shared by all `adapto:*` skills. Skills should link here rather than restating them.
Consolidated from the project's design notes and kept consistent with the verified ground truth (§0).
See also [forbidden-actions.md](forbidden-actions.md) and [cli-cheatsheet.md](cli-cheatsheet.md).

**Local-first content studio:** the pack's source of truth is the `.adapto/` workspace in the user's project;
Adapto is the publish target. The model, layout, brain, and ledger are in §15 + [studio.md](studio.md); the
content-pipeline contracts are in [content-pipeline.md](content-pipeline.md).

## 1. Plan-then-apply (mutating skills)

Every skill with `mutates: true` is two phases — a required two-call pattern, not a flag:

1. **Plan** — print a structured, machine-parseable plan (JSON/YAML in a fence): what it will
   create/modify (counts, types, target language, draft status). Then STOP and wait for an explicit
   user `approve`. No cost/token figures — out of scope.
2. **Apply** — runs only after approval. Writes via the CLI; tags article writes for audit (§4).

Never mutate during the plan phase. Never auto-approve.

## 2. Draft-first

All content writes go in as `status=draft`. The user reviews on their local dev server, then publishes
via `adapto:publish` (v1.5) or the backoffice. This review step is the safety mechanism — there is **no
rollback/backup** in this variation.

## 3. Determinism

- Every CLI call uses `--json`; parse it, don't scrape tables.
- No free-form LLM output where a deterministic script will do. Scope LLM steps explicitly
  ("propose a schema from the project Q&A" = LLM; "write schema via CLI" = deterministic).
- Never invent CLI flags or endpoints — verify against [cli-cheatsheet.md](cli-cheatsheet.md) /
  `adapto llm-info`.
- Talk to the Backend API **only through the `adapto` CLI**, never `api.adaptocms.com` directly.

## 4. Provenance (audit tagging)

- Tag **article** writes with `--source '{"type":"ai_generated","name":"<session_id>"}'`. It defaults
  to `{"type":"internal","name":"CLI"}` when omitted — always pass it. Pages, collection items,
  categories, and microcopy have **no** `source` field and aren't tagged.
- Provenance is for backoffice **audit** only — there's no query, filter, or rollback by source.

## 5. Locale

Never assume a language. Discover the tenant's enabled codes first (`adapto auth orgs`, or
`GET /available-languages`) and use one of those strings verbatim. The accepted format is
tenant-defined (may be `en` or `en-US`) — never invent a region subtag the tenant lacks, never pass a
bare name like `Spanish`. **Enabling a *new* language is backoffice-only** — there's no CLI/API for it, so
the agent can only use languages the tenant already has; to add one, point the user to the Adapto dashboard.

## 6. Read-client (new-project setup)

`adapto:scaffold` creates new projects via `create-adapto-app`, which **installs the read-client** (`src/lib/adapto.ts`
wrapping the published `adapto-client-sdk` npm package). This pack does not vendor, edit, or maintain that
client; the scoped `@adaptocms/sdk` name is unpublished.
The agent never imports the client — agent writes go through the CLI.

**Read-client vs. app templates (important distinction).** The **read-client** (the `src/lib/adapto.ts`
wrapper + the published `adapto-client-sdk` npm package it imports) is **off-limits** — never edit it;
report frontend fetch/render problems to the user.
The user's **own app templates** (layouts/pages) are a *different* thing: a skill MAY edit them **with §9
consent** — that's how `adapto:seo-wire` installs the metadata head-render layer. App templates (with
consent) = allowed; read-client = never.

## 7. Naming & positioning (user-facing copy)

- "Adapto CMS" in prose; "Adapto" is fine in code/commands.
- Don't compete on price in generated copy.

## 8. Errors

Surface CLI errors faithfully — the CLI returns structured errors, and in non-TTY a missing required
flag is an error, not a prompt (pass every required flag explicitly when scripting). On partial batch
failure (articles/pages have no batch — they loop one-by-one), report what succeeded and stop rather
than silently continuing.

**Session expiry.** A `401/Unauthorized` from any command may mean the CLI session needs refreshing —
prompt the user to re-run `adapto auth login`, then resume the flow; don't treat it as a fatal error.

**Expected-failure probes.** Some checks fail by design — e.g. `adapto auth me` exits non-zero when not
logged in, which is a normal *branch*, not an outage. Run these so the exit code doesn't surface as a red
`Error: Exit code 1`: append `|| true` (e.g. `adapto auth me --json 2>&1 || true`) and branch on the
output. Don't chain such a probe after a healthy check in one compound command — the compound inherits the
*last* command's exit code, so a passing check looks failed. (The `doctor.mjs` script already does this
internally and exits 0 on findings unless `--strict`.)

**Looping writes — don't let success read as failure.** When looping CLI creates in a shell (categories,
articles, items, microcopy — these have no batch), two things make a **fully-successful** run surface as a
red `Error: Exit code 1`: a dedup `get-by-slug` *miss* exits non-zero but means "create it" (an expected
branch), and the **last** command in the loop/function sets the whole block's exit code. So: guard dedup
probes (`|| true`), **end the block cleanly** (finish with `true`/`:`), and judge success from each call's
`--json` output — **not** the shell exit code. Report from the parsed results, so created items never look
like an error.

## 9. Consent for consequential / host commands

Separate from plan-then-apply (§1, which gates CMS content). Commands that change the user's machine or
are hard to reverse — installing/upgrading software (`curl … | bash`, `npm i -g`, `brew`, `go install`),
replacing binaries, anything needing `sudo`, destructive FS ops outside `.adapto/`, or outward actions
(`git push`, publishing) — must **never run silently**. For each one: **inform** (what + why), **show the
exact command** and its side effects, **get explicit consent**, then **run only on consent** and re-verify;
if declined, print the manual command. Consent is per-command, not blanket. Read-only diagnostics
(`adapto:doctor`) never need this gate.

## 10. Concise, skippable interaction (UX)

Agent↔user interaction must be **minimal and non-invasive** — help the user decide, don't interrogate.
Keep questions short and on point (no preamble, no AI slop, no walls of text). Prefer **2–4 concrete
options to pick from** (each with a one-line "why"), and always allow a free-form answer or **skip**. Ask
only what you need, batch related questions, and default to sensible choices (state them) instead of
asking the obvious. Interview-style steps (e.g. `adapto:project-define`) are fully skippable.
**Offer pickable answers on every gate.** Whenever the choice is enumerable, present it as **selectable
options** (the user shouldn't have to type a word a button could carry) — including consent gates ("Run it?"
→ `Yes, run it` / `I'll run it myself`) and approval gates ("approve?" → `Approve` / `Change something` /
`Discuss this`). Always keep a free-form answer available; never reduce a clear choice to a bare free-text prompt.
**Drive the flow:** after each step, say what happened, surface any failure or missing input, and propose
the next step(s) — never end in silence; **narrate briefly** what you're doing; and **never fabricate** a user's email/password/token (use
placeholders the user fills; inline secrets land in session history — a separate terminal avoids it).

## 10a. Interactive (TTY) commands — hand them to the user's own terminal

**Some CLI commands can't run from inside the agent session at all, and you must say so plainly.** The CLI
prompts for missing values via `huh`, but only when stdin is a TTY; the agent has none — **not even behind the
`!` prefix**. Without a TTY the CLI doesn't prompt, it errors:
`required: --email (or provide interactively in a terminal)`. Do **not** answer that error by pasting the
flags inline — that's how a password ends up in the transcript and in shell history.

**When a step needs a TTY, disclose it and hand it over:**
1. Say it can't run here — one line, no apology: *"This one needs a real terminal — I can't run it for you."*
2. Give the **bare command** (`adapto auth login`), not a flag-stuffed version. The CLI walks the user
   through every field and masks the password; spelling out `--email <…> --password <…>` is both noisier and
   less safe.
3. Say **where**: a new terminal window (any directory — auth is global, not per-project).
4. Say **what happens next**: come back and tell me, and I'll re-verify (`adapto auth me`) and continue.

**Needs a TTY** (interactive prompts, verified against the CLI): `auth login`, `auth register`,
`auth activate`, `auth change-password`, `auth reset-password`, `auth request-password-reset`,
`auth resend-activation`, `auth callback-github`, `auth login-google`, the **tenant picker** (`switch-tenant`
with no `--tenant-id`, or login with 2+ tenants), `org create`, and `onboard`. Content commands
(`articles`/`pages`/`microcopy`/`collections` …) also prompt for missing fields — but skills always pass
every flag explicitly (§3), so they never hit this.

**Headless/CI** has no window to open: `ADAPTO_TOKEN` + `ADAPTO_TENANT_ID` replace interactive auth, and
every other command needs its flags passed in full.

## 11. Preflight (before doing work)

`adapto:install` is the entry point for setup. Otherwise, when a skill is invoked, **preflight once** with
the `adapto:doctor` checks, **hard-block only on that skill's own preconditions**, and proceed otherwise
(surface the rest + the fix). Scaffolding files needs only Node 20+ (not auth); auth-dependent skills block
until logged in. Check once per flow and re-check only what changed after a fix. Don't auto-run on session
start.

**Not authenticated → always offer both paths, as pickable options — and both run in the user's own terminal
window** (auth is TTY work — §10a). Never present login alone: a first-time user has no account, and
registration is fully CLI-native (`adapto auth register` → `activate`), so the browser is a fallback, not the
route. Say what's blocked in one line, then offer:

- **`Log in` — I already have an Adapto account.** In a new terminal window, in any directory:
  ```
  adapto auth login
  ```
- **`Register` — I'm new to Adapto; create my account from the terminal.** In a new terminal window:
  ```
  adapto auth register
  ```
  It prompts for email, password, and name, then sends an **activation email** — the one step neither of us
  can automate is reading your inbox. With the token from that email, still in that terminal:
  ```
  adapto auth activate
  ```
  Activation **logs you in and saves credentials** — no separate login step. Prefer the browser?
  `https://app.adaptocms.com/auth/register?ref=agent-skills`, then **Log in** above.

Both are bare commands on purpose: the CLI prompts for every field (password masked), so **don't spell out
`--email` / `--password` / `--first-name` flags** — they're noise here, and typing a password as an argument
puts it in shell history. Tell the user to come back when it's done, then re-probe
(`adapto auth me --json 2>&1 || true`). Headless/CI has no terminal to open: set `ADAPTO_TOKEN` +
`ADAPTO_TENANT_ID` instead.

Brand-new account with **zero tenants** → nothing to switch to yet; create the first org + project with
`adapto onboard`. This one the agent *can* run — but only with **every value passed as a flag**
(`--project-name`, `--default-language`, …), since bare `onboard` prompts. See `adapto:install` §B, then
continue with §12.

## 12. Working tenant (pick at setup, then remember per project)

A logged-in `adapto auth me` proves *who* the user is, **not which project they want** — never inherit the
saved/last-active tenant. The working tenant is **chosen once at setup and remembered per project**:

- **Fresh setup (no binding), before scaffolding, 2+ tenants →** present a **specific tenant picker** (the
  tenants as **pickable options**) so the user **chooses the project this app connects to**; then
  `adapto auth switch-tenant --tenant-id <id>`. **Exactly one →** state it and proceed (§10). In non-TTY, pass
  `--tenant-id`/`ADAPTO_TENANT_ID`.
- **Remember it** — cache the working tenant (id + name) to `.adapto/tenant.json` (gitignored); the project's
  `.env` API key also encodes the tenant id.
- **Existing project (has a binding) →** read the remembered tenant and **use it** (switch the CLI to it if
  needed); don't re-pick, and never fall back to the CLI's last-active. Re-pick only with no binding, or if the
  user asks to switch projects.

The chosen tenant scopes everything downstream. Confirm the working tenant; never assume the active one.

## 13. Skill flow (what to suggest next)

Per §10, every skill **drives the flow** — when a step finishes, state what happened and propose the next
logical step(s). The canonical happy path is:

```
install → scaffold → project-define(discovery) → schema-design → schema-apply
  → content-research → content-plan → content-create → content-upload
  → seo-wire(one-time) → translate → review drafts → publish
```

Each skill ends by pointing to the next: `install`→`scaffold`; `scaffold`→`project-define`;
`project-define`→`schema-design`; `schema-design`→`schema-apply`; `schema-apply`→`content-research`;
`content-research`→`content-plan`; `content-plan`→`content-create` (or back to `schema-design` first when a
pick needs a new content type — the **schema loop**); `content-create`→`content-upload`;
`content-upload`→`seo-wire` (if unwired), then `translate`, then review drafts; `translate`→review then
`publish`; `adapto:publish` is the **terminal step** (review drafts first, then it takes them live).
**Suggestions, not rails** — the user can jump to any skill, skip steps (`project-define` is optional), or
stop. `adapto:doctor` is read-only, available anytime, never a forced step.

**Off the main chain:**
- `adapto:project-learn` — consolidate the brain (learnings → facets), off-cycle, anytime.
- `adapto:content-seed` — the **express lane**: runs research→plan→create→upload with greenfield defaults
  (a shortcut over the same steps, not a separate write path).
- `adapto:microcopy` — UI strings (parallel branch); suggest after `scaffold`; points onward to `translate`.

**Authoring rule:** when a new skill is added, insert it into this chain and wire its neighbors' "Next step"
pointers (both directions) so it's part of the flow, not a dead end.

## 14. Dev server — keep it running; restart (never kill) to show new content

The dev server is the **user's live view** of their site — don't take it away. The starters fetch CMS content
**at startup** (content-collection loaders), so newly created/updated/published content **won't appear on a
running `npm run dev` until it restarts**.

- **Never kill the dev server and leave it down** — no `pkill`/stop "to clean up". A bare stop leaves the user
  with nothing to see; a kill alone doesn't show new content either.
- **To show new content after a CMS write, RESTART it** — stop **then start again** — and **leave it running**,
  then give the user the URL. The restart re-runs the startup sync so the new content appears.
- If the **agent** started the dev server (e.g. in the background to verify), keep it up and hand the URL back —
  don't tear it down. If the **user** started it, ask before restarting (don't disrupt their process), or tell
  them to restart.
- Any content-writing skill (`content-upload`, `schema-apply`, `translate`, `microcopy`, `publish`,
  `content-seed`), after applying, should **restart (or offer to restart) and keep the dev server running** so
  the user can see the result. Persist this in every current and future content-writing skill.

## 15. Content studio — local-first (`.adapto/`)

The pack is a local-first content studio (full detail: [studio.md](studio.md), [content-pipeline.md](content-pipeline.md)):

- **`.adapto/` in the user's project is the source of truth**; Adapto CMS is the publish target. Brain +
  research + plans + drafts + ledger live locally; only approved content + its metadata reach the CMS.
- **The brain** (`.adapto/project/`) is a multi-file knowledge base built by `adapto:project-define` and kept
  sharp by `adapto:project-learn` (capture findings to `learnings.md`, consolidate deliberately).
- **The ledger** (`.adapto/ledger.json` + `calendar.md`) tracks every piece (status + local↔CMS id map) and
  drives cadence, dedup, "what's next", and upload idempotency.
- **One-way push, local wins.** `content-upload` is create-or-update via the id-map; it never auto-pulls CMS
  edits and **drift-guards** (warn before overwriting out-of-band backoffice changes) — never silently clobbers.
- **Drafts are Markdown**, converted **md→HTML at upload** (the CMS body renders HTML).
- **Autonomous-safe vs human-gated phases.** Research/plan/draft are local (autonomous-safe); upload/publish
  are human-gated (plan-then-apply + draft-first). See [studio.md](studio.md) §4.
- **Never put secrets in `.adapto/`** (tokens stay in `~/.config/adapto/`); the committed/ignored split is in
  studio.md §1.
- **Read an existing file before overwriting it.** Agent harnesses refuse a `Write` to a file that exists but
  hasn't been read this session — a safeguard against blind clobbering. When a skill rewrites files that may
  already exist (brain facets, `cadence.md`, `calendar.md`, a draft being revised), **batch-read them in one
  call first**, then write. Skipping this doesn't fail safely — it prints a wall of red `Error writing file`
  that reads as a broken skill, and you recover by doing the reads anyway. Two rules of thumb: a **fresh
  file** (new draft, dated plan) needs no read; **anything the scaffold or an earlier cycle created** does.
  Reading first is also correct on the merits — `project-learn` and re-runs of `project-define` must merge
  with what's there, not silently replace a brain the user has edited.

## 16. Research data & metadata

- **Proactive BYO-data.** `adapto:content-research` asks up front for Search Console exports / keyword lists /
  analytics (→ `.adapto/sources/`, treated as ground truth — GSC is the gold standard once a site is live).
  Keyword research is **web-search-first** — real public query data via **autocomplete expansion**, **PAA /
  related recursion**, and a **SERP-composition difficulty heuristic** (the `adapto-researcher` agent carries
  the method) — reporting qualitative bands, never fabricated numbers. It auto-uses a connected SEO MCP if
  present (never required) and **does not auto-crawl competitor sitemaps/indexes**.
- **Metadata storage.** SEO meta / OG / JSON-LD go to the reserved `_adapto_seo` collection (CLI-writable
  today), mirrored from the draft frontmatter — never invented article/page fields.
- **Metadata rendering (`adapto:seo-wire`).** The **read-client is off-limits**; the user's **own app
  templates** MAY be edited **with §9 consent** to render metadata. `seo-wire` is the one-time, consent-gated
  setup that wires the head-render layer + `llms.txt`/`llms-full.txt`. What's written follows
  [seo-standards.md](seo-standards.md).
