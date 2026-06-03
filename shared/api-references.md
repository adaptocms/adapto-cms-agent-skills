# Adapto API & docs references

Links the skills lean on. ⚠ Where a live doc and the CLI source disagree, the **CLI source /
[cli-cheatsheet.md](cli-cheatsheet.md) win** (CLAUDE.md §0). Some public docs omit write endpoints
(e.g. collection create), and `adapto llm-info` has a known credentials-path bug — prefer the cheatsheet.

## Docs (read-first)
- Docs root: https://adaptocms.com/docs/
- Introduction: https://adaptocms.com/docs/introduction/
- Authentication: https://adaptocms.com/docs/authentication/
- CLI & AI Agents: https://adaptocms.com/docs/cli-ai-agents/ — but prefer [cli-cheatsheet.md](cli-cheatsheet.md)
- SDK Reference: https://adaptocms.com/docs/sdk-reference/ — ⚠ no npm SDK ships (CLAUDE.md §3.11)
- Data Models: https://adaptocms.com/docs/data-models/
- Pagination / Filtering: https://adaptocms.com/docs/pagination-and-filtering/
- Error Handling: https://adaptocms.com/docs/error-handling/

## API references
- Articles · Categories · Pages · Custom Collections · Micro Copy · Search · Available Languages:
  `https://adaptocms.com/docs/{articles,categories,pages,custom-collections,micro-copy,search,available-languages}-api/`

## OpenAPI specs (authoritative for request/response shapes)
- Public: https://public-api.adaptocms.com/v1/openapi.json · live docs: https://public-api.adaptocms.com/v1/docs
- Backend: https://api.adaptocms.com/openapi.json · live docs: https://api.adaptocms.com/docs

## Framework starters (read-client reference → `templates/adapto-client/`)
- Next: https://github.com/adaptocms/adapto-next-client
- Astro: https://github.com/adaptocms/adapto-astro-client
- SvelteKit: https://github.com/adaptocms/adapto-sveltekit-client

## Packages & tooling
- CLI: https://github.com/adaptocms/adapto-cms-cli — install: `curl -sSL https://raw.githubusercontent.com/adaptocms/adapto-cms-cli/main/scripts/install.sh | bash`
- Scaffolder: `npx create-adapto-app` (`--framework astro|next|sveltekit`, `--api-key`, `--pm`, `--install/--no-install`, `--git/--no-git`, `--force`, `-y`; Node 20+)
- SDK: ⚠ `@adaptocms/sdk` is **not** published on npm (404)

## Integration
- Webhooks · GitHub Workflows · Migrating Content · Backups:
  `https://adaptocms.com/docs/{integrating-webhooks,integrating-github-workflows,migrating-content,backups}/`

## Image transforms (read side, no CLI)
Edge URL params on `https://media.adaptocms.com/…`: `w`, `h`, `format` (`webp`/`avif`), `quality`. No build pipeline.
