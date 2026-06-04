# Forbidden actions (global)

Hard never-dos for every `adapto:*` skill. A skill's own `## Forbidden actions` section may **add** to
this list but must not relax it. Consolidated from CLAUDE.md §8/§0 and corrected to verified ground truth.

## Secrets & tokens
- **Never** `cat`/`echo`/log/print/paste the contents of `~/.config/adapto/credentials.json` (it holds
  bearer access + refresh tokens). The agent never reads or interpolates the write token — the CLI owns it.
- **Never** put a token or API-key **value** in chat output, a commit, a file, or a log. Reference by env
  var name only (`ADAPTO_API_KEY`, `ADAPTO_TOKEN`).
- **Never** write write-side creds (`ADAPTO_TOKEN`, `ADAPTO_TENANT_ID`) into a frontend `.env`. The
  frontend `.env` is read-only: `ADAPTO_API_URL` + `ADAPTO_API_KEY` only (tenant is parsed from the key).
- **Never** commit `.env`. Ensure `.gitignore` covers it.
- **Never** pass an API key on a command line if avoidable (it leaks into shell history); set it in `.env`.
- **Never** put a *real or guessed* email, password, or token into a command (no fabrication). Placeholders
  the user fills are fine — e.g. `adapto auth login --email <your-email> --password <your-password>`. Inline
  secrets land in session/shell history, so prefer a separate terminal (where `adapto auth login` prompts).

## Mutations
- **Never** run a mutating CLI command without explicit user approval (plan-then-apply —
  [conventions.md](conventions.md) §1).
- **Never** call the Backend API (`api.adaptocms.com`) directly — only via the `adapto` CLI.
- **Never** omit `--source` on article writes (it defaults to `internal`/`CLI`, mislabeling agent content).
- **Never** run a consequential / host-modifying command (software install/upgrade, `curl … | bash`,
  `sudo`, global installs, replacing binaries, destructive FS ops outside `.adapto/`, `git push`/publish)
  without explicit **per-command** consent — inform, show the command, wait for approval, then run + verify
  ([conventions.md](conventions.md) §9, CLAUDE.md §3.12).

## Accuracy
- **Never** hallucinate CLI flags or API endpoints — verify against [cli-cheatsheet.md](cli-cheatsheet.md)
  / `adapto llm-info`.
- **Never** assume a language/locale ([conventions.md](conventions.md) §5).
- **Never** assume provenance covers pages/items, or that content can be filtered by `source.*` — neither
  is true.

## Interaction & product
- **Never** bury the user in long or numerous questions — keep interaction concise, offer examples to pick
  from, and allow a free-form answer or skip ([conventions.md](conventions.md) §10).
- **Never** compete on price in user-facing copy.
