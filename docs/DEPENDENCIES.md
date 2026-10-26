# Dependency review

Latest maintenance review: **October 26, 2026**. Earlier reviews below retain
their dates. This records the current lockfile and how the app uses it; it does
not certify the repository as vulnerability-free.

## October 26 PR resolution

The dependency proposals were reviewed together against the current React 18
and CRA 5 stack. Compatible changes were applied in one coordinated refresh;
the lockfile was regenerated rather than reusing the bots' older lockfiles.

| PR | Resolution |
| --- | --- |
| [#1](https://github.com/IAmJennyZhao/PomodoroTimer/pull/1) | Applied setup-node 7.1.0, pinned to its verified release commit. |
| [#2](https://github.com/IAmJennyZhao/PomodoroTimer/pull/2) | Applied upload-artifact 7.0.2, preserving the existing artifact inputs and retention. |
| [#3](https://github.com/IAmJennyZhao/PomodoroTimer/pull/3) | Removed the unused user-event dependency; no source or test imported it. |
| [#4](https://github.com/IAmJennyZhao/PomodoroTimer/pull/4) | React DOM 19 was not adopted: it conflicts with the current React 18 stack. A future React migration must update the runtime together. |
| [#5](https://github.com/IAmJennyZhao/PomodoroTimer/pull/5), [#6](https://github.com/IAmJennyZhao/PomodoroTimer/pull/6) | Babel 8 was not adopted: CRA and the current Babel plugins require the Babel 7 toolchain. This belongs with a coordinated build-tool migration. |
| [#7](https://github.com/IAmJennyZhao/PomodoroTimer/pull/7) | Updated React Testing Library to 16.3.3 and declared its DOM 10 peer dependency directly. |
| [#8](https://github.com/IAmJennyZhao/PomodoroTimer/pull/8) | Updated jest-dom to 7.0.1 alongside the same DOM dependency. |

A clean `npm ci` and `npm run validate` passed with the refreshed lockfile:
396 frontend tests, 24 server tests, three startup/persistence smoke checks,
the strict production build and 21 browser cases. No application code or test
assertions were changed to accommodate the updates.

The October 26 live advisory gate passed with **31 affected tooling packages**
and **23 reviewed source advisories**. The production-only audit reported
**zero findings**. The exceptions were not broadened or extended.

Dependabot now groups routine npm minor/patch updates and Actions updates, with
one routine PR per ecosystem. npm major-version migrations are handled
deliberately rather than opening separate incompatible proposals. The
[`allow.update-types` rule](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference#update-types-allow)
filters version updates; it does not disable security updates. The live
advisory workflow and the **November 30, 2026** exception deadline remain active.

## October 24 dependency refresh

Applied compatible updates with `npm update`, the pinned Playwright **1.64.1**
patch, and `npm audit fix` without `--force`. React/React DOM are now **18.3.1**
and the CommonJS Babel transform is **7.29.7**. React 19, Testing Library major
updates and a CRA replacement remain separate migrations.

The new [body-parser advisory](https://github.com/advisories/GHSA-27r3-jxmh-p828)
is fixed by **1.20.9**. The four new fast-uri findings are fixed by **3.1.9**;
see the [upstream advisory](https://github.com/advisories/GHSA-w74x-v6f9-j3xg).
The former `braces` and `sprintf-js` findings are absent from the live report,
so their exceptions were removed. The selector-parser 6.x dependency moved from
6.1.4 to **6.1.5**, which remains affected by the previously reviewed advisory.

The October 24 full audit reported **56 affected tooling packages**: 18 high,
29 moderate and 9 low, with **24 source advisories** and zero critical findings.
The separate `npm audit --omit=dev` reports **zero findings**. These are dated
registry results, and propagated parent findings are not distinct bugs.

One new, low-severity
[serialize-javascript advisory](https://github.com/advisories/GHSA-m5mm-p8h7-m29v)
was reviewed for the existing 4.0.0/6.0.2 build-only copies. It requires an
attacker-controlled serialized function source to be embedded in HTML. Here
the package is reached through CRA's CSS minifier and Workbox/Rollup tooling;
the application and Node save service do not import it or serialize user
functions into HTML. This is an exposure assessment, not a proof of immunity.
The fix is in 7.1.3, outside those parents' 4.x/6.x constraints. Its temporary
exception shares the existing **November 30, 2026** deadline; the review was
not extended. No cross-major overrides or removal of functioning build tooling
were used to silence findings.

Current validation evidence belongs in [PUBLICATION_STATUS.md](PUBLICATION_STATUS.md).
The October 24 tests exposed a React 18.3 deprecation warning from Testing
Library 13's use of `ReactDOMTestUtils.act`. The October 26 library refresh
replaces that older integration rather than suppressing the warning.

## Changes and audit results

Removed unused `use-sound` and `web-vitals`; the app uses its own procedural audio
engine and no longer calls the performance reporter. Moved CRA, Testing Library
and build/test tooling into `devDependencies`. React and React DOM remain runtime
dependencies. Declared the Babel compiler and CommonJS transform used by the QA
fixtures directly, rather than relying on accidental transitive availability.
Added pinned Playwright tooling for production browser tests.

Applied compatible lockfile updates with `npm audit fix`, without `--force` or
unverified major-version overrides. Browserslist/caniuse data are refreshed and
the stale-data build warning is gone. React stays at 18.2.0 and CRA at 5.0.1.
The production minifiers changed the emitted JS/CSS hashes; source CSS and artwork
were not edited in this pass.

| Live npm audit on October 9 | Before | After |
| --- | --- | --- |
| Affected packages, including propagated parent findings | 100 | 100 |
| Critical | 4 | 0 |
| High | 36 | 64 |
| Moderate | 46 | 33 |
| Low | 14 | 3 |
| Runtime-only audit (`npm audit --omit=dev`) | Not a comparable baseline: tooling was in runtime dependencies | 0 findings |

The aggregate totals include parent packages affected by a vulnerable child;
they are not a count of distinct bugs. The remaining report contains **25 source
advisories across 13 tooling packages**. Changes in the dependency graph also
change propagated severities; a smaller critical count is not a clean audit.
The full lockfile contains 1,576 dependency entries excluding the project root.

## Remaining exposure and disposition

[Create React App is deprecated](https://react.dev/blog/2025/02/14/sunsetting-create-react-app).
Its old dependency constraints prevent a complete compatible repair. In
particular, npm suggests replacing `react-scripts` with `0.0.0` for several
findings; this would remove functioning tooling rather than repair the app.

| Tooling packages | Reviewed exposure in this project | Disposition |
| --- | --- | --- |
| `webpack-dev-server`, `webpack-dev-middleware` | Source exposure, internal developer endpoints, malformed requests and path traversal concern the development server. Existing wrappers bind to loopback and retain Host checks. These controls reduce exposure but do not establish that every advisory is mitigated. [Source exposure advisory](https://github.com/advisories/GHSA-79cf-xcqc-c78w), [middleware advisory](https://github.com/advisories/GHSA-g84c-rxfj-3j2c). | Temporary tooling exception. Use the production service for app use and release review. Replace the development toolchain before a claim that tooling advisories are resolved. |
| `serialize-javascript` | Build worker/config serialization can execute crafted input when the result is evaluated. The app's save service uses native JSON and does not import this package. Untrusted build/config inputs remain a risk. [Upstream advisory](https://github.com/advisories/GHSA-5c6j-r48x-rmvq). | Temporary tooling exception; do not treat a build of arbitrary contributed code as trusted. CI uses ordinary `pull_request` events, read-only permissions, no secrets and no saved checkout credentials. |
| `postcss`, `postcss-selector-parser`, `svgo`, `nth-check` | CSS/source-map reads, selector resource exhaustion and incomplete SVG sanitization concern asset compilation. The app compiles repository-owned CSS/SVG and has no user-supplied SVG/CSS import feature. Generated PNGs are not processed as SVG. SVGO is not a security sanitizer for arbitrary uploads. [Selector advisory](https://github.com/advisories/GHSA-rp65-9cf3-cjxr). | Temporary tooling exceptions. Replace old loaders/processors through a reviewed toolchain migration; avoid cross-major overrides that merely silence the audit. |
| `underscore` | Resource exhaustion can be triggered by nested values in build/test utilities. It is absent from the application's production server imports. | Temporary tooling exception; evaluate fixes with the tools that depend on these APIs. The October 9 `braces` and `sprintf-js` findings are absent from the October 24 report. |
| `node-forge`, `uuid`, `@tootallnate/once` | Certificate signature parsing, buffer bounds and promise control flow affect transitive development/test utilities. The production service uses Node's built-in HTTP, filesystem and crypto APIs. | Temporary tooling exceptions; migrate/upgrade the parent utilities and retest development startup, tests and the release fixtures. |

These are exposure assessments based on the import graph and advisory descriptions,
not exploit proofs. The exact advisory links, affected versions, severity and
ranges are in [DEPENDENCY_REVIEW.json](DEPENDENCY_REVIEW.json). The Node runtime
itself and all package license obligations remain separate responsibilities.

## Enforced review

```sh
npm run audit:dependencies
```

The live audit gate checks source advisory IDs, packages, severity, range, URL and
the affected locked versions against that explicit record. Exceptions apply only
to packages marked as development-only in the lockfile. New or changed findings,
runtime exposure, invalid responses, registry failures and expired reviews fail.
It runs on pushes, pull requests, manual requests and every Monday. Compatible
fixes can remove findings without requiring an exception update.

The current review expires **November 30, 2026**. Reevaluate the advisories and
exposure before extending it; do not regenerate the JSON automatically to obtain
a green check. Major dependency updates need their own reviewed PR and complete
validation. Dependabot prepares weekly npm/Actions update PRs; it does not merge
them automatically. A toolchain migration remains the preferred remedy for the
old CRA dependency families and must be revisited in the final release review.

Raw audit/install reports stay in ignored `.local/phase4/`. Full audit results are
dated evidence; the scheduled gate detects later advisory changes.
