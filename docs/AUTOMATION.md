# Automated validation

Use **Node.js 22 or 24 LTS** and npm. The pinned reproducibility baseline is
**22.23.3** in [.nvmrc](../.nvmrc). Install that version directly or select it with your
Node version manager. CI also checks the latest Node 24
release resolved by setup-node. Unsupported Node majors are rejected by the
validation runner.

## Clean setup

From a new checkout, run these commands in PowerShell, bash or zsh:

```sh
npm ci
npm run browsers:install
npm run validate
npm run audit:dependencies
```

[`npm ci`](https://docs.npmjs.com/cli/v11/commands/npm-ci/) installs the checked-in
lockfile and fails if it disagrees with `package.json`. It replaces that checkout's
`node_modules`; close development processes before reinstalling in a working
checkout. Keep dev dependencies installed to build/test/run the QA fixtures.
Installation and live advisory review need registry access. Browser installation
downloads test binaries. On Linux, use
`node node_modules/@playwright/test/cli.js install --with-deps chromium firefox webkit`
to install browser OS dependencies as in CI.

These checks do not use the personal save directory. Server/smoke tests and every
browser case create an isolated temporary profile and ephemeral loopback port,
then stop their own servers and remove their own profiles. Browser contexts are
new for every case, contain only fictional data and never reuse an ordinary app
tab. No fixed review-room port needs to be free.

## Commands and coverage

| Command | What it proves |
| --- | --- |
| `npm run check` | CJS syntax; all frontend and server/launcher/policy tests; strict production build; real development and production entry-point smoke. No browser download required. |
| `npm run validate` | Everything in `check`, then all production browser regressions. |
| `npm run test:ci` | Frontend tests once, in band, without watch mode. |
| `npm run test:server` | Server/launcher/policy tests through an explicit file list, avoiding shell wildcard differences. |
| `npm run build:check` | Production compilation and source lint; CRA warnings fail through `CI=true`. |
| `npm run test:e2e` | Chromium, Firefox and WebKit against the current production build. Run `build:check` first after changing app code. |
| `npm run audit:dependencies` | Live advisory review against specific, expiring tooling exceptions; see [DEPENDENCIES.md](DEPENDENCIES.md). |
| `npm test` | Interactive frontend watch mode for development. |

[check.cjs](../scripts/check.cjs) invokes Node directly with structured arguments.
No PowerShell environment assignment or forwarded Jest flags are required. It
sets unattended test/build variables itself and checks subprocess exit statuses.
It also forces build lint/error gates on instead of inheriting disabling flags.
Jest uses relative discovery patterns within CRA's `src` root, avoiding an
absolute-glob escaping failure when Windows checkouts have hidden path components.

[Production smoke tests](../scripts/production-smoke.test.cjs) launch the real
development launcher, compile its browser bundle and write/read through its
frontend save proxy. They also launch the real
`server/index.cjs` executable, test platform-specific default path resolution in
an isolated OS profile, verify a custom data-directory override, serve the actual
built HTML/JS/CSS/public artwork, write a fictional note, restart the process and
check persistence and stale-revision rejection. Existing server tests cover
backup recovery, unsafe storage locations, origin checks and port collisions.

[Browser tests](../e2e/release.spec.cjs) check timer start/pause/resume/finish,
note persistence across service
restart/reload, loaded production art, an egg purchase, F19 compact Journal
concealment and keyboard routes, F20 opaque purchase-label colors, F08's 44px Nest
target, F21 visible
Finish with docked notes, and F22 keyboard access to Pause/notes plus outage/retry.
They assert observable behavior and saved state rather than screenshot pixels.

## CI and failure evidence

[Checks workflow](../.github/workflows/checks.yml) runs on pushes, pull requests
and manual dispatch. Six core jobs cover Windows/macOS/Linux with Node 22.23.3
and Node 24. A separate Linux job installs the three browser engines, builds and
runs the regression suite. All jobs start with `npm ci`. Successful test runs
have no retries that could hide flaky behavior.

[Dependency review](../.github/workflows/dependencies.yml) additionally runs every
Monday. It reads the lockfile without installing dependencies or running package
lifecycle scripts. [Dependabot](../.github/dependabot.yml) prepares weekly updates.
Actions are pinned to full commit hashes; permissions are read-only and checkout
credentials are not persisted. No deployment or automatic merge is configured.

Browser failures retain local screenshots/traces in ignored `test-results/` and
an HTML report in ignored `playwright-report/`. The CI browser job uploads only
those fictional failure artifacts for seven days. View the report with
`node node_modules/@playwright/test/cli.js show-report`, or inspect the trace path
printed with a failing test using `show-trace`. A missing browser executable
requires `browsers:install`; a missing build requires `build:check`. Fix failing
assertions or app behavior rather than weakening checks or adding unconditional
retries.

## Limits and acceptance

Hosted results for the verified source checkpoint are recorded in
[publication status](PUBLICATION_STATUS.md). These browser checks are headless
engine regressions, not complete acceptance of Firefox or Safari on real devices.
They also do not cover screen-reader speech, genuine browser zoom, physical touch,
software keyboards or audible alarms. Those release gates remain in
[the release checklist](RELEASE_PLAN.md#acceptance-checklist).

## Phase 4 verification record

October 9, 2026; implementation checkpoint **`6594f62`**. Exported only the tracked
files of that commit to a disposable temporary checkout, then performed a fresh
`npm ci` with each runtime's bundled npm. No existing `node_modules`, build or
personal save profile was copied into that checkout. Portable Node archives were
verified against the official release checksums; the installed system Node was
not replaced.

| Windows x64 check | Node 22.23.3 / npm 10.9.9 | Node 24.21.0 / npm 11.19.0 |
| --- | --- | --- |
| Clean lockfile installation | Passed | Passed |
| Frontend | 396 tests / 22 suites passed | 396 tests / 22 suites passed |
| Server, launcher and advisory policy | 22 passed | 22 passed |
| Strict production build | Passed | Passed |
| Development compile/proxy, default paths, production persistence/restart | 3 passed | 3 passed |
| Chromium / Firefox / WebKit production cases | 18 passed, no retries | 18 passed, no retries |
| Complete `npm run validate` | Exit 0 | Exit 0 |

The live advisory gate passed with the documented 25 source advisories / 100
affected tooling packages, including from the clean Node 24 checkout. The separate
runtime-only audit returned zero findings. Registry failures, changed advisories,
runtime reclassification and expired policies are covered by the policy tests.

Both workflows passed **actionlint 1.7.12**, and the workflow/Dependabot files
parsed as YAML. The Windows hidden-directory discovery regression passed all 396
frontend tests after the pattern fix. All 16 production/source asset hashes still
match the inventory; application JS, CSS source and artwork were unchanged.
Emitted CSS differences from dependency updates were vendor-prefix removal and
equivalent selector/declaration grouping. Existing CRA/package deprecation
diagnostics remain documented tooling debt, rather than compiler failures.

The publication scan found one current-tree email candidate in `glob`'s public
npm deprecation metadata; it was compared with the registry and retained as
upstream metadata. It found no current-tree credential or user-path candidates.
The dependency inventory had zero installed-version mismatches. Historical
privacy/artifact findings remain assigned to the history pass.

Raw install, test and audit reports remain in ignored `.local/phase4/`; browser
failure output remains ignored. The GitHub workflows have **not been pushed or
executed on hosted runners** in this pass, so macOS/Linux hosted results and
repository-required-check settings remain for the publication pass. Phase 4's
implementation and available local verification are complete; this does not
close the separate asset, history, hands-on or release-publication gates.
