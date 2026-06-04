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
rollback/backup** in this variation (CLAUDE.md §3.7). (⚠ Adapto-side: public keys currently read drafts
unscoped — build assuming the scope fix lands; don't depend on the leak.)

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
bare name like `Spanish`.

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
asking the obvious. Interview-style steps (e.g. `adapto:project-define`) are fully skippable. See
CLAUDE.md §3.13.
