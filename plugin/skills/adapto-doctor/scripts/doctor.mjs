#!/usr/bin/env node
// adapto:doctor — read-only environment diagnostic for the Adapto CMS skill pack.
//
//   node doctor.mjs [--json] [--repo | --global]
//
// Default mode is auto: project checks run when a package.json is present in the cwd.
// NEVER prints secret values (see shared/forbidden-actions.md): no credentials file is read,
// and ADAPTO_API_KEY is reported as present/absent only. Exit 0 if no failures, else 1.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join, sep } from 'node:path';

const MIN_CLI = '0.1.3'; // latest pre-1.0 release; keep in sync with SKILL.md `requires.cli`
const CLI_REPO = 'https://github.com/adaptocms/adapto-cms-cli.git';
const CLI_INSTALL = 'curl -sSL https://raw.githubusercontent.com/adaptocms/adapto-cms-cli/main/scripts/install.sh | bash';

const args = new Set(process.argv.slice(2));
const JSON_OUT = args.has('--json');
const STRICT = args.has('--strict'); // exit non-zero on failing checks (for shell gating); off by default
const cwd = process.cwd();
const hasPkg = existsSync(join(cwd, 'package.json'));
const mode = args.has('--global') ? 'global' : (args.has('--repo') || hasPkg ? 'repo' : 'global');

const checks = [];
const add = (id, label, status, detail, fix = null) => checks.push({ id, label, status, detail, fix });

function runAdapto(argv) {
  try {
    const out = execFileSync('adapto', argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, out: out.trim() };
  } catch (e) {
    if (e.code === 'ENOENT') return { ok: false, missing: true };
    return { ok: false, out: `${e.stdout || ''}${e.stderr || ''}`.trim(), code: e.status };
  }
}
const parseJSON = (s) => { try { return JSON.parse(s); } catch { return null; } };
const safeRead = (p) => { try { return readFileSync(p, 'utf8'); } catch { return null; } };
function run(cmd, argv) {
  try {
    // Bounded: a network call inside a read-only diagnostic must never hang the flow.
    const out = execFileSync(cmd, argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 5000 });
    return { ok: true, out: out.trim() };
  } catch {
    return { ok: false, out: '' };
  }
}
function cmpSemver(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d > 0 ? 1 : -1; }
  return 0;
}

// 1–2. CLI installed + version
const ver = runAdapto(['version']);
let cliOk = false;
let localCli = null;
if (ver.missing) {
  add('cli_installed', 'Adapto CLI installed', 'fail', '`adapto` not found on PATH',
    `Install: ${CLI_INSTALL}  (or run adapto:install)`);
} else {
  cliOk = true;
  add('cli_installed', 'Adapto CLI installed', 'pass', ver.out || 'installed');
  const m = (ver.out || '').match(/\d+\.\d+\.\d+/);
  if (m) {
    localCli = m[0];
    const ok = cmpSemver(localCli, MIN_CLI) >= 0;
    add('cli_version', `CLI version >= ${MIN_CLI}`, ok ? 'pass' : 'warn', `found ${localCli}`,
      ok ? null : `Upgrade to >= ${MIN_CLI}: ${CLI_INSTALL}  (or run adapto:install)`);
  } else {
    add('cli_version', `CLI version >= ${MIN_CLI}`, 'warn', 'could not parse version', 'Check: adapto version');
  }
}

// 2a. CLI current with the latest release.
// `cli_version` above is a floor — "will the skills run". This is drift — "are you on what the pack was
// verified against". The CLI is pre-1.0 and its command surface moves between releases (CLAUDE.md §0), so
// being behind surfaces as a missing flag or a changed subcommand rather than an obvious "you're old".
// Always a warn, never a fail: an older-but-supported CLI still runs every skill, and nagging someone into
// replacing a binary mid-project is worse than the drift. Tags come from `git ls-remote` rather than the
// GitHub API, which rate-limits unauthenticated callers.
if (cliOk && localCli) {
  const tags = run('git', ['ls-remote', '--tags', '--refs', CLI_REPO]);
  const latest = tags.ok
    ? tags.out.split('\n')
        .map((l) => (l.match(/refs\/tags\/v?(\d+\.\d+\.\d+)$/) || [])[1])
        .filter(Boolean)
        .sort(cmpSemver)
        .pop()
    : null;
  if (!latest) {
    add('cli_current', 'CLI on the latest release', 'warn', 'could not reach GitHub to check (offline?)',
      'Optional — check manually: https://github.com/adaptocms/adapto-cms-cli/releases/latest');
  } else if (cmpSemver(localCli, latest) >= 0) {
    add('cli_current', 'CLI on the latest release', 'pass', `v${localCli} is current`);
  } else {
    add('cli_current', 'CLI on the latest release', 'warn', `found v${localCli}, latest is v${latest}`,
      `Upgrade (asks first — it replaces the binary on PATH): ${CLI_INSTALL}`);
  }
}

// 2b. Skill pack up to date (installed plugin vs. origin/main)
// Only meaningful for a marketplace install: the plugin carries no `version` field, so Claude Code keys the
// cache on the git commit SHA (one commit = one version). Comparing the installed SHA to the remote main
// HEAD is therefore exactly the check Claude Code itself would make on update. Skipped in a dev checkout,
// and skipped if the pack ever adopts an explicit semver (the SHA compare would no longer apply).
const PACK_REPO = 'https://github.com/adaptocms/adapto-cms-agent-skills.git';
const isSha = (s) => /^[0-9a-f]{7,40}$/i.test(s || '');

function installedPluginSha() {
  // Authoritative: Claude Code's own install record (has the full SHA).
  const home = process.env.HOME || process.env.USERPROFILE;
  if (home) {
    const rec = parseJSON(safeRead(join(home, '.claude', 'plugins', 'installed_plugins.json')));
    const entries = rec?.plugins?.['adapto@adaptocms'];
    const sha = Array.isArray(entries) ? entries.find((e) => e?.gitCommitSha)?.gitCommitSha : null;
    if (isSha(sha)) return sha;
  }
  // Fallback: the install directory is named for the version — .../cache/adaptocms/adapto/<sha>.
  const root = process.env.CLAUDE_PLUGIN_ROOT;
  const dir = root && root.includes(`${sep}plugins${sep}cache${sep}`) ? basename(root) : null;
  return isSha(dir) ? dir : null;
}

const installedSha = installedPluginSha();
if (installedSha) {
  const ls = run('git', ['ls-remote', PACK_REPO, 'refs/heads/main']);
  const remoteSha = ls.ok ? (ls.out.split(/\s+/)[0] || '') : '';
  const short = (s) => s.slice(0, 7);
  if (!isSha(remoteSha)) {
    add('pack_current', 'Skill pack up to date', 'warn', 'could not reach GitHub to check (offline?)',
      'Optional — check manually with: /plugin update adapto@adaptocms');
  } else if (remoteSha.startsWith(installedSha) || installedSha.startsWith(remoteSha)) {
    add('pack_current', 'Skill pack up to date', 'pass', `on main @ ${short(installedSha)}`);
  } else {
    add('pack_current', 'Skill pack up to date', 'warn',
      `installed ${short(installedSha)}, main is ${short(remoteSha)} — behind`,
      'Update: /plugin marketplace update adaptocms then /plugin update adapto@adaptocms (or `claude plugin update adapto@adaptocms` in a terminal), then /reload-plugins');
  }
}

// 3–5. CLI-dependent checks
if (cliOk) {
  const me = runAdapto(['auth', 'me', '--json']);
  if (me.ok) {
    const u = parseJSON(me.out);
    const who = u?.user?.email || u?.email || 'authenticated'; // email = identity, not a secret token
    add('auth_valid', 'Authenticated', 'pass', who);
  } else {
    add('auth_valid', 'Authenticated', 'fail', 'not logged in',
      'Needs a real terminal (the agent has no TTY) — open a new terminal window and run `adapto auth login` if you have an account. New to Adapto? Two ways to register: `adapto auth register` then `adapto auth activate` with the token from the activation email, or sign up at https://app.adaptocms.com/auth/register (guided setup creates your first project) and come back to `adapto auth login`. All prompt for every field; don\'t pass --email/--password inline.');
  }

  if (me.ok) {
    const st = runAdapto(['status', '--json']);
    if (st.ok) {
      add('api_reachable', 'Backend API reachable', 'pass', 'status OK');
    } else if (/forbidden|permission|\b403\b/i.test(st.out || '')) {
      // The status check can require a permission this account doesn't have. Auth already proved the backend
      // is reachable, so a permission error here is non-blocking for content work — report it as a warn.
      add('api_reachable', 'Backend API reachable', 'warn',
        'reachable (auth OK); `status` endpoint not permitted for this account — not needed for content work');
    } else {
      add('api_reachable', 'Backend API reachable', 'fail', st.out || 'request failed',
        'Check network / ADAPTO_API_URL — the API may be unreachable.');
    }

    const orgs = runAdapto(['auth', 'orgs', '--json']);
    if (orgs.ok) {
      const data = parseJSON(orgs.out);
      let active = null, tenantCount = 0;
      for (const o of (Array.isArray(data) ? data : [])) for (const t of (o.tenants || [])) { tenantCount++; if (t.active) active = t; }
      if (active) {
        const langs = (active.languages || []).join(', ') || 'none enabled';
        add('tenant_selected', 'Active tenant + languages', 'pass',
          `${active.tenant_name || active.tenant_id} · languages: ${langs}`);
      } else if (tenantCount === 0) {
        // Brand-new user with zero tenants — switch-tenant has nothing to switch to; onboarding is the fix.
        add('tenant_selected', 'Active tenant + languages', 'fail', 'no tenant yet (new account)',
          'Run: adapto onboard --project-name "<name>"   (creates your first project + API key)');
      } else {
        add('tenant_selected', 'Active tenant + languages', 'fail', 'no active tenant',
          'Run: adapto auth switch-tenant --tenant-id <id>   (list with: adapto auth orgs)');
      }
    } else {
      add('tenant_selected', 'Active tenant + languages', 'warn', 'could not list orgs', 'Try: adapto auth orgs');
    }
  } else {
    add('api_reachable', 'Backend API reachable', 'warn', 'skipped — authenticate first', 'Log in, then re-run doctor.');
    add('tenant_selected', 'Active tenant + languages', 'warn', 'skipped — authenticate first', 'Log in, then re-run doctor.');
  }
}

// 6–9. Project checks
if (mode === 'repo') {
  let fw = null, fwVer = null;
  if (hasPkg) {
    const pkg = parseJSON(readFileSync(join(cwd, 'package.json'), 'utf8')) || {};
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (deps.next) [fw, fwVer] = ['Next.js', deps.next];
    else if (deps.astro) [fw, fwVer] = ['Astro', deps.astro];
    else if (deps['@sveltejs/kit']) [fw, fwVer] = ['SvelteKit', deps['@sveltejs/kit']];
  }
  add('framework', 'Supported framework', fw ? 'pass' : 'warn',
    fw ? `${fw} ${fwVer}` : 'none of Next/Astro/SvelteKit detected',
    fw ? null : 'create-adapto-app supports Next/Astro/SvelteKit; other frameworks are not covered.');

  const envPath = join(cwd, '.env');
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, 'utf8').match(/^\s*ADAPTO_API_KEY\s*=\s*(.+)$/m);
    const val = m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
    const set = val && val !== 'your_api_key_here';
    add('env_api_key', '.env has ADAPTO_API_KEY', set ? 'pass' : 'fail',
      set ? 'present (value hidden)' : '.env present but ADAPTO_API_KEY missing/placeholder',
      set ? null : 'Set ADAPTO_API_KEY in .env — generate one in your project Developer Tools -> API Keys. Never commit it.');
  } else {
    add('env_api_key', '.env has ADAPTO_API_KEY', 'fail', '.env not found',
      'Create .env and set ADAPTO_API_KEY — generate one in your project Developer Tools -> API Keys.');
  }

  const giPath = join(cwd, '.gitignore');
  const gi = existsSync(giPath) ? readFileSync(giPath, 'utf8') : '';
  const ignoresEnv = /^\s*\.env(\b|\*|\.\*)?\s*$/m.test(gi) || /^\s*\.env\*/m.test(gi);
  add('gitignore_env', '.gitignore ignores .env', ignoresEnv ? 'pass' : 'fail',
    ignoresEnv ? 'ok' : (existsSync(giPath) ? '.gitignore does not cover .env' : 'no .gitignore'),
    ignoresEnv ? null : 'Add .env to your .gitignore so it is never committed.');

  const hasCtx = existsSync(join(cwd, '.adapto'));
  add('project_context', '.adapto/ project context', hasCtx ? 'pass' : 'warn',
    hasCtx ? 'present' : 'not initialized',
    hasCtx ? null : 'Run adapto:project-define to create project context (optional for read-only sites).');

  // 10–11. Studio checks (local; richer studio checks — _adapto_seo, render layer — are agent-run, see SKILL.md)
  if (hasCtx) {
    const projDir = join(cwd, '.adapto', 'project');
    const brainOk = existsSync(join(projDir, 'identity.md')) && existsSync(join(projDir, 'voice.md'));
    add('studio_brain', 'Project brain (.adapto/project/)', brainOk ? 'pass' : 'warn',
      brainOk ? 'present' : 'missing or incomplete',
      brainOk ? null : 'Run adapto:project-define to build the project brain.');

    const ledgerPath = join(cwd, '.adapto', 'ledger.json');
    if (existsSync(ledgerPath)) {
      const led = parseJSON(readFileSync(ledgerPath, 'utf8'));
      const valid = led && typeof led === 'object' && Array.isArray(led.pieces);
      add('studio_ledger', 'Content ledger (.adapto/ledger.json)', valid ? 'pass' : 'warn',
        valid ? `${led.pieces.length} piece(s) tracked` : 'present but invalid',
        valid ? null : 'Re-init via adapto:scaffold, or it is rebuilt on the next content cycle.');
    } else {
      add('studio_ledger', 'Content ledger (.adapto/ledger.json)', 'warn', 'not found',
        'Created by adapto:scaffold or on the first content cycle.');
    }
  }
}

const summary = { pass: 0, warn: 0, fail: 0 };
for (const c of checks) summary[c.status]++;
const ok = summary.fail === 0;
const report = { ok, mode, checks, summary };

if (JSON_OUT) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  const icon = (s) => (s === 'pass' ? '✓' : s === 'warn' ? '⚠' : '✗');
  console.log(`\nadapto:doctor — ${mode} mode\n`);
  for (const c of checks) {
    console.log(`  ${icon(c.status)} ${c.label}: ${c.detail}`);
    if (c.fix && c.status !== 'pass') console.log(`      -> ${c.fix}`);
  }
  console.log(`\n  ${summary.pass} pass · ${summary.warn} warn · ${summary.fail} fail`);
  console.log(ok ? '\n  Environment looks ready.\n' : '\n  Fix the ✗ items above, then re-run.\n');
}
// A successful run exits 0 (the report IS the output — read `ok`/`status` for health).
// Only `--strict` turns failing checks into a non-zero exit, for shell-level gating.
process.exit(STRICT && !ok ? 1 : 0);
