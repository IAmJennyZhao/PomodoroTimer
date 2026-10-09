# Contributing to Little Room

Start with the [setup guide](docs/SETUP.md),
[architecture](docs/ARCHITECTURE.md) and [source map](docs/SOURCE_MAP.md).
Use Node.js 22 or 24 LTS and install the lockfile with `npm ci`.

## A useful change

Describe the problem and intended behavior before expanding its scope. For a
larger feature or a change to rewards, save compatibility or deployment, open an
issue to discuss the design first. Small fixes can go directly to a pull request.
Keep each change focused, with commits that explain a stable step.

Use a separate local profile or the
[fictional review room](docs/RELEASE_QUALITY.md#repeatable-review-room) while
developing. Default development and production runs share a personal save folder.
Avoid opening two services against the same folder.

## Working in the code

- Put saved game rules and normalization in `src/domain/game.js`. Feature
  components dispatch actions through the app instead of writing saves directly.
  Supply explicit time and random rolls in tests of timer and collection rules.
- Keep load/write scheduling, revisions and recovery drafts in
  `src/persistence/`. The server owns the disk envelope and filesystem operations.
  Preserve compatibility with existing saves; changes need normalization and
  regression cases for both old data and the new behavior.
- Keep feature UI in its owning folder and reuse the shared controls/surfaces.
  Preserve keyboard actions, visible focus, cancellation and reduced motion.
  Audio or animation completion must not gate a semantic action.
- Import global CSS through `src/styles/index.css`. Its existing order is part
  of the cascade; inspect affected layouts before changing it.
- Keep artwork provenance and rights records with asset changes. MIT applies
  to project code and documentation; see [asset rights](ASSET_RIGHTS.md) before
  assuming an image is freely reusable.

## Verify the change

For app, service or tooling changes, run the core gate:

```sh
npm run check
```

For user-flow or responsive-layout changes, also run the production browser
regressions after rebuilding:

```sh
npm run browsers:install
npm run validate
```

[Automated validation](docs/AUTOMATION.md) explains individual commands, Linux
browser dependencies and failure reports. If changing dependencies, use the
lockfile, run `npm run audit:dependencies`, and review
[the exception policy](docs/DEPENDENCIES.md). Do not hide a failure with blanket
audit exclusions, weaker assertions or unconditional retries.

For documentation-only edits, verify commands against `package.json` and the
implementation, resolve local links and headings, and preview any changed
diagrams. For behavior changes, add regression coverage where it protects the
observable behavior; avoid tests that merely repeat implementation details.
Headless checks do not replace the remaining
[hands-on acceptance](docs/RELEASE_QUALITY.md#remaining-acceptance-checks).

## Pull requests and reports

Explain what users observe before and after the change, what checks you ran,
and any remaining limitation. Include fictional-content screenshots for visible
UI changes. Keep screenshots readable and show the feature being changed.

For a bug, include reproducible steps, expected/actual behavior, OS, browser and
Node versions, and the relevant command or error. Report whether it reproduces
with a separate fictional profile. Redact personal paths and content.

Do not commit or upload personal saves, Scratchpad notes, session history,
recovery drafts, secrets or raw QA output. Keep local reports in ignored
`.local/`, `output/`, `test-results/` or `playwright-report/`. Curated release
media has a separate review pass. Avoid history rewrites in ordinary changes;
publication history treatment is tracked in the [project plan](docs/PROJECT.md).
