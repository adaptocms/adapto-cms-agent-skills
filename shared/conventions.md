# Conventions every skill follows

Operational rules shared by all `adapto:*` skills. Skills should link here rather than restating
these. Consolidated from CLAUDE.md §0/§3/§8/§13 and kept consistent with the verified ground truth
(§0). See also [forbidden-actions.md](forbidden-actions.md), [cli-cheatsheet.md](cli-cheatsheet.md),
[cost-estimation.md](cost-estimation.md).

## 1. Plan-then-apply (mutating skills)

Every skill with `mutates: true` is two phases — a required two-call pattern, not a flag:

1. **Plan** — print a structured, machine-parseable plan (JSON/YAML in a fence): resources to
   create/modify, counts, model tiers, and a token + cost estimate (see
   [cost-estimation.md](cost-estimation.md)). Then STOP and wait for an explicit user `approve`.
2. **Apply** — runs only after approval. Writes via the CLI; records provenance + the session manifest.

Never mutate during the plan phase. Never auto-approve.

## 2. Draft-first

All content writes go in as `status=draft`. The user reviews on their local dev server, then publishes
via `adapto:publish` (v1.5) or the backoffice. (⚠ Adapto-side: public keys currently read drafts
unscoped — build assuming the scope fix lands; don't depend on the leak.)

## 3. Determinism

- Every CLI call uses `--json`; parse it, don't scrape tables.
- No free-form LLM output where a deterministic script will do. Scope LLM steps explicitly
  ("infer schema from HTML" = LLM; "write schema via CLI" = deterministic).
- Never invent CLI flags or endpoints — verify against [cli-cheatsheet.md](cli-cheatsheet.md) /
  `adapto llm-info`.
- Talk to the Backend API **only through the `adapto` CLI**, never `api.adaptocms.com` directly.

## 4. Provenance + session manifest (every mutating skill)

- Tag **article** writes with `--source '{"type":"ai_generated","name":"<session_id>"}'`. It defaults
  to `{"type":"internal","name":"CLI"}` when omitted — always pass it. Pages, collection items,
  categories, and microcopy have **no** `source` field and cannot be tagged.
- At apply time, append every created item's `{type, id, collection_id?}` to
  `.adapto/sessions/<session_id>.json`. This is the **only** rollback handle (CLAUDE.md §3.7) — no API
  filters by `source.*`. Print the manifest path after applying.
- Use the same session ID in `source.name` and the manifest filename. (ID format: open question §11.3.)

## 5. Locale

Never assume a language. Discover the tenant's enabled codes first (`adapto auth orgs`, or
`GET /available-languages`) and use one of those strings verbatim. The accepted format is
tenant-defined (may be `en` or `en-US`) — never invent a region subtag the tenant lacks, never pass a
bare name like `Spanish`.

## 6. Read-client (frontend-setup skills)

There is no `@adaptocms/sdk` on npm. `adapto:scaffold` gets the client from `create-adapto-app`;
`adapto:retrofit` vendors it from `templates/adapto-client/` (CLAUDE.md §3.11). Never overwrite a
scaffolder-provided client with the templates.

## 7. Naming & positioning (user-facing copy)

- "Adapto CMS" in prose; "Adapto" is fine in code/commands.
- The existing-site flow is **"reconstruction"/"approximation," never "migration."**
- Don't compete on price in generated copy.

## 8. Errors

Surface CLI errors faithfully — the CLI returns structured errors, and in non-TTY a missing required
flag is an error, not a prompt (pass every required flag explicitly when scripting). On partial batch
failure (articles/pages have no batch — they loop one-by-one), report what succeeded, record those IDs
in the manifest, and stop rather than silently continuing.

## 9. Consent for consequential / host commands

Separate from plan-then-apply (§1, which gates CMS content). Commands that change the user's machine or
are hard to reverse — installing/upgrading software (`curl … | bash`, `npm i -g`, `brew`, `go install`),
replacing binaries, anything needing `sudo`, destructive FS ops outside `.adapto/`, or outward actions
(`git push`, publishing) — must **never run silently**. For each one: **inform** (what + why), **show the
exact command** and its side effects, **get explicit consent**, then **run only on consent** and re-verify;
if declined, print the manual command. Consent is per-command, not blanket. Read-only diagnostics
(`adapto:doctor`) never need this gate. See CLAUDE.md §3.12.
