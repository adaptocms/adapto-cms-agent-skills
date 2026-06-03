# `templates/adapto-client/` — vendored read-client

Implements the **§3.11 decision** in `CLAUDE.md`: the frontend read-client is **vendored into the
target project, not installed** (there is no published `@adaptocms/sdk`). These files are
byte-faithful copies of the official starters, pinned to the commits below, with provenance headers
prepended and one sanitization (Astro `settings.ts`).

The **agent never imports this** — it's only for the generated frontend to read content from the
Public API (`fetch` + `x-api-key`). It's used by **`adapto:retrofit` only** — copying these files into
an existing app that wasn't created with `create-adapto-app`. **`adapto:scaffold` does not use this
directory:** `create-adapto-app` already includes its own (Adapto-maintained, possibly newer) client,
and scaffold must never overwrite it.

## Provenance (pinned)

| Framework | Upstream repo | Commit | Source paths |
|---|---|---|---|
| Next / SvelteKit | `adaptocms/adapto-next-client` (client ≡ `adapto-sveltekit-client`) | `2a151d7` / `4f96ce4` | `src/lib/adapto-sdk.ts`, `src/types/*`, `src/config.ts` |
| Astro | `adaptocms/adapto-astro-client` | `6cee8e5` | `src/lib/adapto-sdk.ts`, `src/content/schemas/*`, `settings.ts` |

Fetched 2026-06-03. **Next and SvelteKit ship an identical client + identical types** — only
`config.ts` (env access) differs, so they share one tree here. **Astro is a distinct, heavier variant**
(Zod content-layer schemas).

## What `adapto:retrofit` copies (destination map)

**Next** — copy `next-sveltekit/` into the project:
| Template file | → Destination |
|---|---|
| `next-sveltekit/lib/adapto-sdk.ts` | `src/lib/adapto-sdk.ts` |
| `next-sveltekit/types/*.ts` | `src/types/*.ts` |
| `next-sveltekit/config.next.ts` | `src/config.ts` |

**SvelteKit** — same as Next, but use `config.sveltekit.ts`:
| `next-sveltekit/config.sveltekit.ts` | → `src/config.ts` |

**Astro** — copy `astro/` (preserve structure):
| Template file | → Destination |
|---|---|
| `astro/lib/adapto-sdk.ts` | `src/lib/adapto-sdk.ts` |
| `astro/content/schemas/**` | `src/content/schemas/**` |
| `astro/settings.ts` | `settings.ts` (project root) |

Relative imports inside the clients (`../config`, `../types/*`, `../../settings.ts`,
`../content/schemas/*`) resolve once placed at these destinations. Astro additionally needs `zod`
(already an Astro dep) and the Astro content-layer; for **new** Astro projects prefer
`create-adapto-app` over retrofit.

## Required env (both paths)

Frontend `.env` (gitignored) — **only** these two; tenant ID is parsed from the key:
```
ADAPTO_API_URL=https://public-api.adaptocms.com/v1
ADAPTO_API_KEY=...   # public read key
```
Do **not** add `ADAPTO_TENANT_ID` here (that's the CLI/write side — CLAUDE.md §3.5).

## ⚠ Drift — this is usable, but track it

No `npm update` path. If Adapto changes the Public API, these copies go stale silently. Keep them honest:
- **Refresh:** re-clone each starter, `diff` against the pinned commit, copy forward, bump the commit
  in the file headers + the table above. (A `scripts/sync-cli-spec.ts`-style helper could automate this.)
- **Detect:** `adapto:doctor` should smoke-read each resource via the vendored client against the live
  Public API and warn on shape mismatches.
- **Revisit:** if `@adaptocms/sdk` ships on npm (open question §11.8), switch from vendoring to the
  package and delete this directory.

> Do not hand-edit the vendored `adapto-sdk.ts` / schema / type files — they are faithful copies.
> Project-specific values (e.g. Astro's `CUSTOM_COLLECTIONS`, `DEFAULT_LANGUAGE`) belong in the
> `config`/`settings` shim, which is meant to be edited per project.
