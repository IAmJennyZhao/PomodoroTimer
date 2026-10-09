# Dependency review

Publication Phase 4, October 9, 2026. This review covers the current lockfile and
the app's use of it. It does not certify the repository as vulnerability-free.

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
| `braces`, `sprintf-js`, `underscore` | Resource exhaustion can be triggered by crafted patterns, formatting parameters or nested values in build/test utilities. They are absent from the application's production server imports. | Temporary tooling exceptions; evaluate fixes with the tools that depend on these APIs. |
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
