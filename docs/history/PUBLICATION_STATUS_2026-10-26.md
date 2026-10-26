# Publication status

> Historical record. Current scope and source status are in
> [PROJECT.md](../PROJECT.md) and [PUBLICATION_STATUS.md](../PUBLICATION_STATUS.md).
> Use [RELEASE_PLAN.md](../RELEASE_PLAN.md) for the live release checklist.

Updated October 26, 2026. This is the current publication handoff; older phase
records retain their dated results.

## Interface and documentation revision, October 26

The public reading path is now the root README (overview, screenshots and short
tech description), the technical guide in `ARCHITECTURE.md`, and the how-to-run
guide in `SETUP.md`. Seven still screenshots were refreshed from the current
demo app using the owner's approved room composition and fictional progress.
The earlier video, animated preview and social card retain their dated
provenance; they are not presented as current interface captures in the README.

The interface revision starts breaks automatically after focus completes, offers
Start new session and a cancel control, puts Daily Goal first in Journal, and
removes repeated completion/shop/notes explanations. Detailed rules remain in
one session info control with short paragraphs; session settings uses only an
icon. `npm run demo` opens an isolated fictional profile with 74 sessions
across 28 days, charts, tags, pets and eggs. Ordinary saves are separate.

Local verification passed 396 frontend tests, 24 server/demo tests, the strict
production build, and 21 Chromium/Firefox/WebKit cases. The break controls and
populated Journal were also reviewed in Chrome. The interface changes in
`3d2d789`, documentation pass in `3300c6d`, and the owner's final README and
architecture-diagram revisions are included in this source publication. The
hosted evidence below covers the earlier checkpoint. Hands-on release
acceptance remains open; this source update does not publish a release tag.

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
  retries. Later preparation changes rights/documentation and the test-only TEMP
  fixtures described below; production application code is unchanged.
- The full dependency audit has 56 affected tooling packages and 24 reviewed
  source advisories. The production-only audit has zero findings. Specific
  exceptions still expire November 30, 2026; see [DEPENDENCIES.md](../DEPENDENCIES.md).
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
- The first hosted Windows run exposed test fixtures comparing an abbreviated
  TEMP path with the service's canonical path. A disposable junction-based TEMP
  reproduced the same failures in the server/port tests and startup smoke checks.
  Those fixtures now resolve the temporary parent before creating profiles and
  keep cleanup guards against that same resolved parent. Application save-path
  checks and runtime behavior are unchanged; hosted results verify the fix.
- At `80ee1ab`, all seven
  [hosted check jobs](https://github.com/IAmJennyZhao/PomodoroTimer/actions/runs/40118670828)
  passed: Node 22/24 on Windows, macOS and Linux, plus the browser regressions.
  The [hosted dependency review](https://github.com/IAmJennyZhao/PomodoroTimer/actions/runs/40118670832)
  also passed. Later documentation updates do not change application behavior.
- Following explicit owner approval of this exact upload, the reviewed
  `docs/media/social-preview.png` was applied in GitHub Settings on October 24.
  The card remained visible after reloading the settings page. The upload does
  not grant any additional artwork reuse rights.

## Owner decisions

- On October 24, the owner permitted running Little Room and sharing screenshots,
  with other artwork reuse reserved. The terms are in
  [ASSET_RIGHTS.md](../../ASSET_RIGHTS.md#limited-artwork-permission).
- Prepare v0.1.0 and hold its tag/release announcement until hands-on checks pass.
  [Release notes and acceptance steps](../RELEASE_PLAN.md) are prepared.

## Release follow-up

- Keep private backups local and do not merge old ancestry back into `main`.
- Confirm hosted CI for the exact release candidate after hands-on acceptance.

Source publication and a supported release have different acceptance boundaries.
Physical listening, screen-reader speech, genuine 200% zoom, continuous real
input, mobile and additional real-browser acceptance remain recorded in
[RELEASE_QUALITY.md](RELEASE_QUALITY.md). No pass is inferred from automation.

The cleaned branch has replaced hosted `main`. A branch replacement does not
remove old objects from caches, forks or other clones. See
[HISTORY_PREPARATION.md](HISTORY_PREPARATION.md) for the preservation record and
safe publication procedure.

Raw reports and disposable verification checkouts stay in ignored `.local/phase8/`.
