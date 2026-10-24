# Publication status

Updated October 24, 2026. This is the current publication handoff; older phase
records retain their dated results.

## Prepared and verified

- The working publication history retains all 125 original project commits,
  with personal identity metadata and excluded artifacts removed. The private
  original-history backup was verified again against its SHA-256 manifest.
- Compatible dependencies were refreshed, including React/React DOM 18.3.1,
  Babel's CommonJS transform 7.29.7 and Playwright 1.64.1.
- The core checks passed on Windows with Node 22.23.3: 396 frontend tests,
  23 server/launcher/audit tests, strict production build, and all three
  development/production startup and save-persistence checks.
- A fresh isolated clone of dependency checkpoint `d0d447d` passed `npm ci`
  and the complete `npm run validate` with Node 22.23.3: the same core checks
  plus all 18 production cases across Chromium, Firefox and WebKit, with zero
  retries. Subsequent changes are documentation-only.
- The full dependency audit has 56 affected tooling packages and 24 reviewed
  source advisories. The production-only audit has zero findings. Specific
  exceptions still expire November 30, 2026; see [DEPENDENCIES.md](DEPENDENCIES.md).
- GitHub's description and topics were applied. The repository is already public.
- The selected publication ancestry passes the history verifier and publication
  scan: zero personal-email commits, credential candidates or user-path
  candidates. Retained email-like matches are the previously reviewed public
  fixture identity, upstream `glob` metadata and compressed walkthrough bytes.
- Local Markdown documentation links resolve. The three pinned GitHub
  Actions commits resolve in their respective upstream repositories.
- A dry-run of the explicitly leased replacement of `main` succeeded without
  changing the remote branch.
- Cleaned source history was subsequently published at `23ae8ac` on October 24,
  replacing the checked old `main` tip with an explicit force-with-lease. Only
  `main` was pushed. Private backups remain local; no release or tag was created.
- Hosted validation is tracked by the
  [Checks workflow](https://github.com/IAmJennyZhao/PomodoroTimer/actions/workflows/checks.yml)
  and [Dependency review workflow](https://github.com/IAmJennyZhao/PomodoroTimer/actions/workflows/dependencies.yml).
  These links expose actual runner outcomes; configured workflows alone are not
  evidence of a pass. Subsequent documentation-only checkpoints also trigger CI.

## Owner decisions

- On October 24, the owner permitted running Little Room and sharing screenshots,
  with other artwork reuse reserved. The terms are in
  [ASSET_RIGHTS.md](../ASSET_RIGHTS.md#limited-artwork-permission).
- Prepare v0.1.0 and hold its tag/release announcement until hands-on checks pass.
  [Release notes and acceptance steps](RELEASE_PLAN.md) are prepared.

## Release follow-up

- Keep private backups local and do not merge old ancestry back into `main`.
- Confirm hosted CI for the exact release candidate after hands-on acceptance.
- The social-card Settings upload was blocked by automatic approval review;
  it requested fresh owner approval for that specific screenshot-card upload.
  The social preview remains unchanged while that request is pending. This
  does not change the prepared card or grant any additional artwork reuse rights.

Source publication and a supported release have different acceptance boundaries.
Physical listening, screen-reader speech, genuine 200% zoom, continuous real
input, mobile and additional real-browser acceptance remain recorded in
[RELEASE_QUALITY.md](RELEASE_QUALITY.md). No pass is inferred from automation.

The cleaned branch has replaced hosted `main`. A branch replacement does not
remove old objects from caches, forks or other clones. See
[HISTORY_PREPARATION.md](HISTORY_PREPARATION.md) for the preservation record and
safe publication procedure.

Raw reports and disposable verification checkouts stay in ignored `.local/phase8/`.
