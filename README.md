# knowhub-frontend

The KnowHub web application: the Next.js / React / TypeScript frontend, one of
the two independently versioned KnowHub repositories
([ADR-016](docs/adr/) — canonical file in `knowhub-specs`).

This repository installs, checks, tests and builds **on its own**. It does not
require a `knowhub-backend` checkout, a running backend, a git submodule, a
shared DTO source package or any workstation-specific service. The versioned
OpenAPI artifact is the only integration boundary between the two repositories;
no backend source is imported here.

> **Milestone status.** This repository is at milestone **0B — frontend
> foundation**. 0B delivers the repository, toolchain, design system, contract
> pipeline and session boundary. It delivers **no product capability**. Portfolio,
> Ask, Search, Evidence, Architecture, Sources, Traceability and Impact arrive at
> M1 and later.

## Runtime baseline

| Tool    | Version                                   | Declared in                                                          |
| ------- | ----------------------------------------- | -------------------------------------------------------------------- |
| Node.js | **24.21.0** (Active LTS; `>=24.21.0 <25`) | [`.nvmrc`](.nvmrc), `engines.node` in [`package.json`](package.json) |
| pnpm    | **12.4.2**                                | `packageManager` in [`package.json`](package.json)                   |
| Next.js | **16.3.5**                                | `dependencies` in [`package.json`](package.json)                     |
| React   | **19.3.0**                                | `dependencies` in [`package.json`](package.json)                     |

Contributors and CI run the **same** declared Node baseline. `engineStrict: true`
in [`pnpm-workspace.yaml`](pnpm-workspace.yaml) makes the engine ranges that
**dependencies** declare enforced rather than advisory, so an install on an
unsupported runtime fails instead of silently diverging. That setting does not
by itself police this repository's own `engines.node` range; CI selects the
version from [`.nvmrc`](.nvmrc), and that is what enforces the baseline at the
repository level.

If you use a Node version manager, `nvm use` (or the equivalent) reads `.nvmrc`
and selects the declared version.

## Dependencies

**pnpm with the committed `pnpm-lock.yaml` is the single resolution path.** Every
dependency is pinned to an exact version, and `frozenLockfile: true` in
[`pnpm-workspace.yaml`](pnpm-workspace.yaml) means an install that would change
the resolution **fails** rather than drifting — on a bare `pnpm install`, not
only when `--frozen-lockfile` is passed. There is no second dependency path: no
npm, no yarn, no vendored tree and no globally installed package is required to
obtain a working environment.

Under pnpm 12 these settings live in `pnpm-workspace.yaml` and **not** in
[`.npmrc`](.npmrc): the kebab-case `frozen-lockfile` and `engine-strict` keys are
not read from that file. `.npmrc` keeps them as a labelled compatibility
restatement for npm-family tooling, never as the enforcement location.

If you change a dependency, regenerate the lockfile in the same change and commit
both files. A manifest whose lockfile is stale is rejected mechanically by
`pnpm install --frozen-lockfile`.

Dependency lifecycle scripts do not run unless the package is named in the
`allowBuilds` allowlist in [`pnpm-workspace.yaml`](pnpm-workspace.yaml). Entries
are added only after pnpm has reported a build as ignored and that build is
confirmed to be a genuine native compilation step.

## Local workflow

```bash
pnpm install    # resolves strictly from the committed lockfile
pnpm verify     # the full local gate sequence
```

`pnpm verify` runs the same sequence CI runs:

```
lint → format:check → typecheck → test → contract:verify → build
```

Individual steps are also available: `pnpm lint`, `pnpm lint:fix`,
`pnpm format`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`,
`pnpm test:watch`, `pnpm test:e2e`, `pnpm build`.

`pnpm lint` is two checks, both blocking:

```
eslint .                                  the lint rules
node scripts/check-eslint-suppressions.mjs   suppression discipline
```

A suppression must be narrow, local and justified. Name the rules it covers and
say why:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- why this is unavoidable
```

A directive that names no rule — `/* eslint-disable */` and the same bare form of
`eslint-disable-next-line`, `eslint-disable-line` and `eslint-enable` — disables
everything and **fails the gate**. The second check exists because ESLint cannot
see those directives itself: a rule-less directive suppresses the very rule that
would report it. A suppression that has stopped suppressing anything is an error
too, so stale ones cannot be left behind.

Development server: `pnpm dev`. Production server from a built artifact:
`pnpm build && pnpm start`.

> Each gate in `pnpm verify` becomes available with the task that introduces it
> during milestone 0B. Until the whole sequence is wired, run the individual
> steps that exist.

## Server and client components

**Server components are the default.**

A component becomes a client component only where interactivity genuinely
requires it, and that boundary is a deliberate, visible choice rather than an
accident:

- every `'use client'` file lives under `src/components/`;
- a client component never imports `src/lib/auth/**` or the server half of
  `src/lib/config/`;
- authentication, session, token and identity-provider protocol logic is
  **server-only by placement** and is not reachable from any client bundle.

The rule is enforced mechanically, not by review: the `server-only` package makes
a client bundle that reaches such a module fail to build, and a module-boundary
lint rule rejects the import in the first place.

## Layout

| Path              | Contents                                                                         |
| ----------------- | -------------------------------------------------------------------------------- |
| `src/app/`        | App Router routes and layouts: one root layout, one provider-composition point   |
| `src/components/` | UI primitives, state components, application shell                               |
| `src/lib/`        | API boundary, configuration boundary, server-only session boundary, query client |
| `src/styles/`     | Design tokens and global styles                                                  |
| `contracts/`      | The governed location for a pinned backend OpenAPI artifact                      |
| `scripts/`        | Repository check and contract generation/verification entry points               |
| `tests/`          | Unit, component, contract, accessibility and browser layers                      |
| `docs/adr/`       | Frontend-scoped Architectural Decision Records                                   |

A directory is created by the change that delivers its first real content. An
empty directory is never added to mirror the target tree.

## Architectural Decision Records

Frontend-scoped ADRs live in [`docs/adr/`](docs/adr/). The workspace-wide ADR
register in `knowhub-specs/02-adrs/README.md` is authoritative for every ADR
number and its canonical location; ADR decision text is never duplicated across
repositories.

## Secrets

No secret, credential, token, data snapshot or model API key is ever committed to
this repository. Configuration values arrive from the environment through the
single typed configuration boundary; secret-bearing configuration is expressed as
a reference, resolved server-side, and never reaches a browser bundle.
