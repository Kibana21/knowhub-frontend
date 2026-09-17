/**
 * ESLint is the single lint mechanism for this repository (0B-SPEC-001 R23),
 * and `pnpm lint` executes it as a blocking gate (0B-SPEC-005 R13). There is no
 * second lint tool and no second configuration file: 0B-T04 extends *this* file
 * with the module-boundary, server-only and unsafe-DOM rules rather than adding
 * a parallel mechanism.
 *
 * Composition order matters and is deliberate:
 *
 *   1. ignores            — output and generated files no gate should read
 *   2. @eslint/js          — the ESLint core recommended rule set
 *   3. eslint-config-next  — framework rules; also registers the `react-hooks`,
 *                            `react`, `import`, `jsx-a11y` and `@next/next`
 *                            plugins and selects the parser per file type
 *   4. typescript-eslint   — TYPE-AWARE configuration, scoped to the TypeScript
 *                            files the `tsconfig.json` program covers
 *   5. eslint-plugin-react-hooks — hook correctness, pinned explicitly rather
 *                            than inherited from the framework config
 *   6. project rules       — the suppression discipline 0B-SPEC-001 R7 requires
 *
 * One control 0B-SPEC-001 R7 needs cannot live here. ESLint cannot detect its
 * own blanket file-level disable directive: `no-restricted-syntax` does not
 * visit comment nodes, and a directive that names no rule suppresses the very
 * rule that would report it. `scripts/check-eslint-suppressions.mjs` carries
 * that one check and runs inside the same `pnpm lint` gate.
 */
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // 1. Build output and generated files no gate should read.
  globalIgnores([
    '.next/',
    'coverage/',
    'playwright-report/',
    'test-results/',
    'next-env.d.ts',
  ]),

  // 2. ESLint core recommended.
  js.configs.recommended,

  // 3. Framework rules.
  next,

  // 4. Type-aware linting. `projectService` resolves each file through the
  //    nearest `tsconfig.json`, so the rules below reason over the same program
  //    `pnpm typecheck` compiles rather than over a second, divergent one
  //    (0B-SPEC-005 R15). Scoped to TypeScript files: the `.mjs` configuration
  //    files in this repository are not in that program.
  {
    name: 'knowhub/typescript-type-aware',
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // 5. Hook correctness.
  reactHooks.configs.flat['recommended-latest'],

  // 6. Suppression discipline.
  //
  //    0B-SPEC-001 R7: KnowHub-owned application source carries no blanket
  //    `any` escape hatch, and a suppression is narrow, local and justified —
  //    blanket suppression of a file, a module or a rule class is not an
  //    acceptable way to pass this gate.
  {
    name: 'knowhub/suppression-discipline',
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // No blanket `any`. An unavoidable dynamic value is `unknown` and is
      // narrowed at the point of use.
      '@typescript-eslint/no-explicit-any': 'error',

      // A TypeScript suppression must say why it is there. `@ts-ignore` and
      // `@ts-nocheck` stay banned outright: the first suppresses silently even
      // when the error it was written for has gone, and the second is the
      // file-level blanket suppression R7 names.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': { descriptionFormat: '^: .+$' },
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 10,
        },
      ],
    },
  },

  // A suppression that no longer suppresses anything is itself an error, so a
  // disable directive cannot be left behind after the code it covered changed.
  {
    name: 'knowhub/unused-suppressions-block',
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
]);
