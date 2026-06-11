# Conventions every skill follows

Operating rules shared by all `adapto:*` skills. Skills should link here rather than restating them.
Consolidated from CLAUDE.md §0/§3/§8/§13 and kept consistent with the verified ground truth (§0).
See also [forbidden-actions.md](forbidden-actions.md) and [cli-cheatsheet.md](cli-cheatsheet.md).

## 1. Plan-then-apply (mutating skills)

Every skill with `mutates: true` is two phases — a required two-call pattern, not a flag:

1. **Plan** — print a structured, machine-parseable plan (JSON/YAML in a fence): what it will
   create/modify (counts, types, target language, draft status). Then STOP and wait for an explicit
   user `approve`. No cost/token figures — out of scope (CLAUDE.md §3.10).
2. **Apply** — runs only after approval. Writes via the CLI; tags article writes for audit (§4).

Never mutate during the plan phase. Never auto-approve.

## 2. Draft-first

All content writes go in as `status=draft`. The user reviews on their local dev server, then publishes
via `adapto:publish` (v1.5) or the backoffice. This review step is the safety mechanism — there is **no
rollback/backup** in this variation (CLAUDE.md §3.7).

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

`adapto:scaffold` creates new projects via `create-adapto-app`, which **bundles the read-client**. This
pack does not vendor, install, or maintain a client, and there's no `@adaptocms/sdk` on npm
(CLAUDE.md §3.11). The agent never imports the client — agent writes go through the CLI.

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
(`adapto:doctor`) never need this gate. See CLAUDE.md §3.12.

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
placeholders the user fills; inline secrets land in session history — a separate terminal avoids it). See
CLAUDE.md §3.13.

## 11. Preflight (before doing work)

`adapto:install` is the entry point for setup. Otherwise, when a skill is invoked, **preflight once** with
the `adapto:doctor` checks, **hard-block only on that skill's own preconditions**, and proceed otherwise
(surface the rest + the fix). Scaffolding files needs only Node 20+ (not auth); auth-dependent skills block
until logged in. Check once per flow and re-check only what changed after a fix. Don't auto-run on session
start. See CLAUDE.md §3.14.

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

The chosen tenant scopes everything downstream. See CLAUDE.md §3.5.

## 13. Skill flow (what to suggest next)

Per §10, every skill **drives the flow** — when a step finishes, state what happened and propose the next
logical step(s). The canonical happy path is:

```
adapto:install → adapto:scaffold → adapto:project-define → adapto:schema-design
  → adapto:schema-apply → adapto:content-seed → adapto:translate → review drafts → adapto:publish
```

Each skill should end by pointing to the next: `install`→`scaffold`; `scaffold`→`project-define` (and the
schema step); `project-define`→`schema-design`; `schema-design`→`schema-apply`; `schema-apply`→`content-seed`;
`content-seed`→`translate` (and review drafts on the dev server); `translate`→review then `adapto:publish`;
`adapto:publish` is the **terminal step** (review drafts first, then it takes them live). These are
**suggestions, not rails** — the user can jump to
any skill directly, skip steps (e.g. `project-define` is optional), or stop. `adapto:doctor` is available
anytime as a read-only check, never a forced step.

**Parallel branch — UI strings:** `adapto:microcopy` is off the main content chain. Suggest it after
`scaffold` (a frontend + brand exist) to seed/extract UI strings; it points onward to `adapto:translate`
(localize the microcopy).

**Authoring rule:** when a new skill is added, insert it into this chain and wire its neighbors' "Next step"
pointers (both directions) so it's part of the flow, not a dead end (CLAUDE.md §15).

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
- Any content-writing skill (`content-seed`, `schema-apply`, `translate`, `microcopy`, `publish`), after
  applying, should **restart (or offer to restart) and keep the dev server running** so the user can see the
  result. Persist this in every current and future content-writing skill.
