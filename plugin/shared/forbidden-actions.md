# Forbidden actions (global)

Hard never-dos for every `adapto:*` skill. A skill's own `## Forbidden actions` section may **add** to
this list but must not relax it. Consolidated from the project's conventions and corrected to verified ground truth.

## Secrets & tokens
- **Never** `cat`/`echo`/log/print/paste the contents of `~/.config/adapto/credentials.json` (it holds
  bearer access + refresh tokens). The agent never reads or interpolates the write token — the CLI owns it.
- **Never** put a token or API-key **value** in chat output, a commit, a file, or a log. Reference by env
  var name only (`ADAPTO_API_KEY`, `ADAPTO_TOKEN`).
- **Never** write write-side creds (`ADAPTO_TOKEN`, `ADAPTO_TENANT_ID`) into a frontend `.env`. The
  frontend `.env` is read-only: `ADAPTO_API_URL` + `ADAPTO_API_KEY` only (tenant is parsed from the key).
- **Never** commit `.env`. Ensure `.gitignore` covers it.
- **Never** pass an API key on a command line if avoidable (it leaks into shell history); set it in `.env`.
- **Never** put a *real or guessed* email, password, or token into a command (no fabrication).
- **Never** hand the user credential flags to fill in (`auth login --email <…> --password <…>`). Auth needs a
  TTY the agent doesn't have — even behind `!` — so give the **bare** command (`adapto auth login`,
  `adapto auth register`, `adapto auth activate`) and tell them to run it in a **new terminal window**, where
  the CLI prompts for each field and masks the password ([conventions.md](conventions.md) §10a).

## Mutations
- **Never** run a mutating CLI command without explicit user approval (plan-then-apply —
  [conventions.md](conventions.md) §1).
- **Never** call the Backend API (`api.adaptocms.com`) directly — only via the `adapto` CLI.
- **Never** delete CMS content — no `articles/pages/categories/microcopy/collections delete`, no
  `collections items delete`, no `api-key revoke`, and above all no **`adapto project delete`** (CLI v0.1.2+),
  which destroys a project **and all its content**. There is no rollback or backup in this pack, so a delete
  is final. **Archive instead** (`articles archive`, `pages archive`, `items archive`) — reversible and keeps
  the content. This holds even inside an approved plan, and even to "clean up" a duplicate or a failed
  partial run ([conventions.md](conventions.md) §9a).
- **Never** run a delete on the user's behalf when they ask for one: state what it destroys and hand them the
  command, so the CLI's own confirmation applies. **Never** pass `--project-id` to `project delete` — that
  flag exists to skip the retype-to-confirm prompt.
- **Never** run `adapto project update --languages` as a side effect of another task. The list **replaces**
  the enabled set, so a partial list silently drops languages and orphans their content — pass existing + new,
  and only as a step the user explicitly approved ([conventions.md](conventions.md) §5).
- **Never** omit `--source` on article writes (it defaults to `internal`/`CLI`, mislabeling agent content).
- **Never** run a consequential / host-modifying command (software install/upgrade, `curl … | bash`,
  `sudo`, global installs, replacing binaries, destructive FS ops outside `.adapto/`, `git push`/publish)
  without explicit **per-command** consent — inform, show the command, wait for approval, then run + verify
  ([conventions.md](conventions.md) §9).
- **Never** replace or modify the read-client that `create-adapto-app` provides — the thin wrapper
  `src/lib/adapto.ts` **and** the published `adapto-client-sdk` npm package it imports. This pack doesn't
  ship or maintain that client; if the
  generated frontend has fetch or render problems, **report them to the user** — don't patch the bundled client.
  (Editing the user's **own app templates** — layouts/pages — is a *different* thing and IS allowed **with §9
  consent**; that's how `adapto:seo-wire` renders metadata. The line: read-client = never; app templates = with consent.)
- **Never** invent SEO/meta fields on Articles/Pages — metadata (meta title/description, OG, JSON-LD) goes to
  the reserved **`_adapto_seo`** collection ([reserved-slugs.md](reserved-slugs.md)), mirrored from the draft
  frontmatter; the built-in types expose no such fields via the CLI.

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
- **Never** kill the user's dev server and leave it down (no `pkill astro dev` / stop "to clean up") — it's
  their live view of the site. To show new content after a CMS write, **restart** it (stop→start) and **keep
  it running**; hand back the URL ([conventions.md](conventions.md) §14).
