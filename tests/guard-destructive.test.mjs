#!/usr/bin/env node
// Checks the PreToolUse guard: the right verdict per command, and — just as important — silence on
// everything else. A guard that fires on ordinary commands gets disabled, and then it guards nothing.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const GUARD = join(dirname(fileURLToPath(import.meta.url)), '..', 'plugin', 'hooks', 'guard-destructive.mjs');

const verdict = (command) => {
  const out = execFileSync('node', [GUARD], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
  }).trim();
  return out ? JSON.parse(out).hookSpecificOutput.permissionDecision : 'pass';
};

const cases = [
  // the catastrophic one — refused outright, in every spelling
  ['adapto project delete', 'deny'],
  ['adapto project delete 0f8c-aa11', 'deny'],
  ['adapto project delete --project-id 0f8c-aa11', 'deny'],
  ['cd /tmp && adapto project delete --project-id x', 'deny'],

  // narrower destruction — surfaced, not refused
  ['adapto articles delete 123', 'ask'],
  ['adapto pages delete 123 --json', 'ask'],
  ['adapto collections items delete cid iid', 'ask'],
  ['adapto microcopy delete 9', 'ask'],
  ['adapto api-key revoke abc', 'ask'],
  ['adapto project update --languages fr-FR', 'ask'],

  // must NOT fire: ordinary work, and the words appearing inside quoted content
  ['adapto articles list --status draft', 'pass'],
  ['adapto articles create --title "How to delete a record" --content "<p>x</p>"', 'pass'],
  ['adapto microcopy create --key btn.delete --value "Delete"', 'pass'],
  ['adapto project update --name "New name"', 'pass'],
  ['adapto project list --json', 'pass'],
  ['adapto auth me --json', 'pass'],
  ['git delete-branch', 'pass'],
  ['rm -rf node_modules', 'pass'],
  ['echo "adapto project delete"', 'pass'],
];

let failed = 0;
for (const [cmd, want] of cases) {
  const got = verdict(cmd);
  const ok = got === want;
  if (!ok) failed++;
  console.log(`  ${ok ? '✓' : '✗'} ${want.padEnd(4)} ${cmd}${ok ? '' : `   -> got ${got}`}`);
}

// malformed input must never block the tool
for (const bad of ['', 'not json', '{}', '{"tool_input":{}}']) {
  const out = execFileSync('node', [GUARD], { input: bad, encoding: 'utf8' }).trim();
  const ok = out === '';
  if (!ok) failed++;
  console.log(`  ${ok ? '✓' : '✗'} fails open on malformed input: ${JSON.stringify(bad)}`);
}

console.log(failed ? `\n  ${failed} failed\n` : '\n  guard ok\n');
process.exit(failed ? 1 : 0);
