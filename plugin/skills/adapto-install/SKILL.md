---
name: adapto-install
namespace: adapto
description: Bootstrap entry point for Adapto CMS. Ensures the `adapto` CLI is installed and at the supported baseline (consent-gated), then hands off to adapto:scaffold to create a new project. Run this first to get started or to install/upgrade the CLI.
version: 0.1.0
requires:
  cli: ">=0.0.7"         # the baseline this skill ENSURES; not a hard precondition (see Preconditions)
  auth: false
  project_context: false
mutates: false            # no CMS content writes; host-level changes are consent-gated (CLAUDE.md §3.12)
---

# adapto:install

The global bootstrap — like `npm create`. It makes the toolchain ready, then hands off to the right
setup skill. It writes **no CMS content** (`mutates: false`), but it does perform **host-level** changes
(installing/upgrading the CLI), which are gated by explicit consent per CLAUDE.md §3.12.

## When to use
- First-time setup / **the front door**: "set up adapto", "get started", "adapto init". It preflights
  (`adapto:doctor`), ensures the CLI, then routes to `adapto:scaffold`. (No separate `adapto:init` — this is it.)
- The `adapto` CLI is missing or out of date (e.g. `adapto:doctor` flagged it).
- Starting a new Adapto project.

## When not to use
- Routine content/schema/translation work → the specific skill.
- Only checking whether things are OK → `adapto:doctor` (read-only; it never installs anything).

## Inputs
- New project vs existing repo (auto-detect from cwd; confirm with the user).
- New projects: framework (`next` | `astro` | `sveltekit`) and, optionally, a public API key.
- Optional: a specific CLI version to install (defaults to the supported baseline, `>=0.0.7`).

## Outputs
- `adapto` CLI installed and at/above the baseline, **verified** via `adapto version`.
- The user routed to `adapto:scaffold` to create a new project.
- (v1, spec-level) per-repo skill pack installed under `.claude/skills/` + `.adapto/skills.lock` pins.

## Preconditions
- A shell, network, and `curl` or `wget`. Node 20+ for the `create-adapto-app` path.
- **Does NOT require the CLI** — installing/upgrading it is this skill's job (same self-bootstrapping
  exception as `adapto:doctor` not requiring auth). The `requires.cli` range above is the target it
  ensures, not a gate that blocks the skill from running.

## Flow

### A. Ensure the CLI — consent-gated (CLAUDE.md §3.12)
1. **Check:** run `adapto version`. Three cases:
   - **Missing** (`adapto` not found on PATH) → propose install.
   - **Below baseline** (`< 0.0.7`) → propose upgrade.
   - **At/above baseline** → skip to (B).
2. **Inform + show the exact command + get explicit consent** before running anything, e.g.:
   > "Your Adapto CLI is `<missing | vX, below the supported v0.0.7>`. I'd like to install it by running:
   > `curl -sSL https://raw.githubusercontent.com/adaptocms/adapto-cms-cli/main/scripts/install.sh | bash`
   > This downloads the latest release binary to `/usr/local/bin/adapto` and may prompt for your password. Run it?"
3. **On consent:** run the command, then re-verify with `adapto version` and report the new version.
   **If declined:** stop, and print the command so the user can run it themselves.

⚠️ `install.sh` installs **latest**, which may be newer than the verified baseline (`v0.0.7`). If the
result is ahead of the baseline, say so and recommend re-running `adapto:doctor` and re-syncing
`shared/cli-cheatsheet.md` (the CLI is pre-1.0 — module names can change between releases). To install
the **exact** pinned version instead, download
`https://github.com/adaptocms/adapto-cms-cli/releases/download/v0.0.7/adapto-<os>-<arch>` and place it on
PATH (advanced; bypasses `install.sh`). Either way, the §3.12 consent flow still applies.

### B. Authenticate — register or log in (the ONLY step until auth succeeds)
Probe auth with `adapto auth me --json 2>&1 || true`. **Append `|| true`** (or branch on the JSON) so the
expected "not logged in" result — which exits non-zero — doesn't surface as a red `Error: Exit code 1`; a
not-authenticated state is a normal branch here, not a failure. Don't chain it after `adapto version` in one
compound command: the compound takes the last command's exit code, so a clean `version` check looks failed.

If the probe shows **not authenticated**, present **exactly these two items and nothing else yet** — no
API-key step, no `npm run dev` (the API-key step comes *after* auth, because its URL needs the tenant id that
only auth provides):

1. **New to Adapto? Register:** `https://app.adaptocms.com/auth/register?ref=agent-skills`
   (offer to open it — macOS `open <url>` / Linux `xdg-open <url>` / Windows `start <url>`). Registering does
   **not** log you in — once it's done, run the **Log in** command below.
2. **Log in** — run this in the prompt, **replacing the placeholders with your own credentials**:
   ```
   ! adapto auth login --email <your-email> --password <your-password>
   ```
   Interactive login isn't available inside the agent session (no TTY), so credentials go on the command line.
   ⚠ That records the password in session history — to avoid it, run **`adapto auth login`** (bare) in a
   **separate terminal**, where it prompts securely. Headless/CI: set `ADAPTO_TOKEN` + `ADAPTO_TENANT_ID`.

The **agent never fills in real values** — only the user types into the placeholders. After login, **re-run
the probe** (`adapto auth me --json 2>&1 || true`) to confirm.

**Then establish the working tenant — don't assume the saved/active one (CLAUDE.md §3.5).** List with
`adapto auth orgs --json`:
- **2+ tenants →** show them and ask **"Which Adapto project do you want to work in?"** — confirm this on
  every flow; never inherit the active one silently. Then `adapto auth switch-tenant --tenant-id <id>`.
- **Exactly one →** state it and proceed (nothing to choose).

**Only then** continue (→ scaffold / API-key step). The chosen tenant scopes everything downstream. (See `adapto:doctor`.)

### C. Route the project
- Route to `adapto:scaffold` (wraps `create-adapto-app`; the read-client ships with it). This variation
  supports **new projects only** — there is no existing-repo/retrofit flow.

### D. Install the per-repo skill pack — v1, spec-level
Copy the per-repo skills into `.claude/skills/` and write `.adapto/skills.lock` with version pins.
(Detailed in a later build pass.)

## Errors and recovery
- **No `curl`/`wget`** → instruct a manual download from GitHub Releases (no silent fallback).
- **`install.sh` needs sudo / permission denied** → surface the prompt; the user types their password.
  The agent never fabricates, echoes, or logs it.
- **Version still below baseline after install** → likely a stale PATH shadow; suggest `which -a adapto`.
- **User declines the upgrade** → proceed with the manual command printed; `adapto:doctor` will keep
  flagging the version until it's upgraded.

## Forbidden actions
- Never run the install/upgrade (or any host-modifying command) **without explicit per-command consent**
  (CLAUDE.md §3.12 / [forbidden-actions.md](../../shared/forbidden-actions.md)): inform → show command →
  consent → run → verify.
- Never echo or log a `sudo` password or any secret value.
- Never replace the read-client that `create-adapto-app` provides.
- Never write CMS content (`mutates: false`).
