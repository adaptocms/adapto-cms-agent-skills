#!/usr/bin/env node
// PreToolUse(Bash) guard for the Adapto skill pack.
//
// conventions.md §9a says no skill deletes CMS content. That's an instruction, and instructions are
// advisory — the CLI is still reachable through Bash. This is the enforcement: a destructive `adapto`
// command can't run without the user seeing it first. There is no rollback or backup in this pack, so a
// delete is final.
//
// Contract (docs: hooks / PreToolUse): read the tool call on stdin, exit 0, and print
// {hookSpecificOutput:{hookEventName,permissionDecision,permissionDecisionReason}} to decide.
//   deny — refuse outright (only `project delete`, which destroys a project and all its content)
//   ask  — show the user a permission dialog naming what gets destroyed
//   (no output) — stay out of the way; every other command flows normally
//
// FAIL OPEN. This runs before *every* Bash call for *every* user of the plugin. A guard that breaks the
// tool on a parse bug is worse than the risk it covers, so anything unexpected exits silently with 0.

const decide = (permissionDecision, permissionDecisionReason) => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision, permissionDecisionReason },
  }));
  process.exit(0);
};

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const cmd = JSON.parse(raw)?.tool_input?.command;
    if (typeof cmd !== 'string' || !/\badapto\b/.test(cmd)) process.exit(0);

    // Strip quoted strings first: an --arg containing the word "delete" is content, not a subcommand.
    const bare = cmd.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');

    // `adapto project delete` — the project and everything in it. Irreversible, and `--project-id`
    // exists to skip the CLI's own retype-to-confirm. Never from inside a session.
    if (/\badapto\s+project\s+delete\b/.test(bare)) {
      decide('deny',
        'adapto project delete destroys a project and ALL its content, and this pack has no rollback or '
        + 'backup (conventions §9a). Run it yourself in a terminal, where the CLI makes you retype the '
        + 'project name to confirm — and never with --project-id, which skips that prompt.');
    }

    // Any other `adapto … delete` (articles, pages, categories, microcopy, collections, items) and
    // `api-key revoke`. Recoverable-ish or narrower, so surface it rather than refuse it.
    const del = bare.match(/\badapto\s+([a-z-]+)(?:\s+items)?\s+delete\b/);
    if (del) {
      decide('ask',
        `This deletes ${del[1]} content permanently — there's no rollback or backup here. `
        + 'Archive is the reversible alternative (conventions §9a). Approve only if you mean it.');
    }
    if (/\badapto\s+api-key\s+revoke\b/.test(bare)) {
      decide('ask', 'Revoking the API key breaks any site reading with it until a new key is issued.');
    }

    // Replaces the enabled-language set rather than appending — a partial list drops languages and
    // orphans their content (conventions §5).
    if (/\badapto\s+project\s+update\b/.test(bare) && /--languages\b/.test(bare)) {
      decide('ask',
        '--languages REPLACES the project\'s enabled languages, it does not add to them. Any code missing '
        + 'from this list gets disabled and its content orphaned. Check it lists existing + new.');
    }
  } catch {
    // fall through — fail open
  }
  process.exit(0);
});
