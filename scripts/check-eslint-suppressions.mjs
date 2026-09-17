/**
 * Rejects blanket ESLint suppression directives.
 *
 * 0B-SPEC-001 R7 requires that a suppression be narrow, local and justified,
 * and that blanket suppression of a file, a module or a rule class is not an
 * acceptable way to pass the gate. ESLint itself cannot enforce that half of
 * R7: `no-restricted-syntax` selectors do not visit comment nodes, and a
 * directive that names no rule suppresses every rule in the file including the
 * one that would have reported it. Both were verified against the pinned
 * ESLint before this script was written.
 *
 * So this check reads the source text rather than the AST. It is deliberately
 * the narrowest possible complement to ESLint, not a second lint tool: it has
 * exactly one rule, no plugin surface and no configuration.
 *
 * Rejected — the directive names no rule, so it disables everything:
 *
 *     eslint-disable
 *     eslint-disable-next-line
 *     eslint-disable-line
 *     eslint-enable
 *
 * Accepted — the directive names the rules it suppresses, so the suppression
 * is reviewable and stops applying when the rule list stops matching:
 *
 *     eslint-disable @typescript-eslint/no-explicit-any
 *     eslint-disable-next-line @typescript-eslint/no-explicit-any -- why
 *
 * Runs on Node with no dependency, so it behaves identically for a contributor
 * and in CI (0B-SPEC-005 R18).
 */
import { glob, readFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { argv, cwd, exit, stderr, stdout } from 'node:process';

/** Directory subtrees that hold no KnowHub-owned source. */
const IGNORED_SEGMENTS = new Set([
  'node_modules',
  '.next',
  '.git',
  'coverage',
  'playwright-report',
  'test-results',
]);

/**
 * The four ESLint inline-disable directive forms. `eslint-enable` is included
 * because a bare `eslint-enable` re-enables every rule, which is the same
 * blanket act in the other direction.
 */
const DIRECTIVE =
  /(?<opener>\/\*|\/\/)\s*(?<kind>eslint-disable(?:-next-line|-line)?|eslint-enable)(?<rest>[^\n]*)/g;

/**
 * Reads the rule list from the text following the directive keyword, stopping
 * at the ESLint description separator (` -- `) and at the end of a block
 * comment. A directive carrying only a description still names no rule and is
 * therefore blanket.
 */
function namedRules(rest, opener) {
  let text = rest;
  const description = text.indexOf('--');
  if (description !== -1) text = text.slice(0, description);
  if (opener === '/*') {
    const close = text.indexOf('*/');
    if (close !== -1) text = text.slice(0, close);
  }
  return text
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function lineOf(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (source[i] === '\n') line += 1;
  return line;
}

async function findings(file) {
  const source = await readFile(file, 'utf8');
  const found = [];
  for (const match of source.matchAll(DIRECTIVE)) {
    const { opener, kind, rest } = match.groups;
    if (namedRules(rest, opener).length > 0) continue;
    found.push({ line: lineOf(source, match.index), kind });
  }
  return found;
}

const roots = argv.slice(2);
const patterns = roots.length > 0 ? roots : ['**/*.{ts,tsx,js,jsx,mjs,cjs}'];
const base = cwd();

const files = [];
for await (const entry of glob(patterns, { cwd: base })) {
  if (entry.split(sep).some((segment) => IGNORED_SEGMENTS.has(segment)))
    continue;
  files.push(resolve(base, entry));
}
files.sort();

let violations = 0;
for (const file of files) {
  for (const { line, kind } of await findings(file)) {
    violations += 1;
    stderr.write(
      `${relative(base, file)}:${line}  error  Blanket \`${kind}\` names no rule. ` +
        `List the rules it suppresses (0B-SPEC-001 R7)\n`,
    );
  }
}

if (violations > 0) {
  stderr.write(
    `\n✖ ${violations} blanket ESLint suppression${violations === 1 ? '' : 's'} ` +
      `in ${files.length} file${files.length === 1 ? '' : 's'}\n`,
  );
  exit(1);
}

stdout.write(`No blanket ESLint suppressions in ${files.length} files\n`);
