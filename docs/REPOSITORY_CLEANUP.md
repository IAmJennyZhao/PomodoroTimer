# Repository cleanup

Publication Phase 3, October 9, 2026. Starting baseline: `21a33ca`.
Artifact checkpoint: `2a0d80e`; source checkpoint: `01a675d`.
The owner deferred Phase 2's hands-on acceptance to continue this separate pass;
those checks remain recorded in [RELEASE_QUALITY.md](RELEASE_QUALITY.md).

## Artifact disposition

| Item | Current disposition |
| --- | --- |
| 163 tracked raw `output/` files, totaling 46,497,332 bytes (44.3 MiB) | Removed from the current tracked tree. All raw reports, fixtures, saved-state snapshots, QA captures and generated mockups were preserved locally. |
| 80 additional ignored files in the same raw output tree | Preserved with the archive so local evidence was not lost. |
| Five unused raster references in `public/art/` | Archived and removed from the current tree and static build. Production artwork remains in `public/art/atelier/`. |
| Four CRA starter logos/icons | Archived and removed after reference checks. `public/favicon.svg` remains the active icon and manifest asset. |
| Four unused audio files in `src/sounds/` | Archived and removed. Provenance remains unresolved; the app continues to use procedural Web Audio. |
| Unused CRA performance helper | Archived and removed with its no-op call. It had no registered reporting callback. The unused performance chunk no longer appears in the build. |
| Current asset provenance and QA summaries | Retained as text documentation. The inventory separates 16 current assets from 13 removed historical media records. |

The local archive is **`.local/archive/publication-phase3-2026-10-09/`**, ignored
by Git. Its `manifest.json` records original repository-relative paths, byte
counts and SHA-256 hashes. All **257 archived files** (66,149,287 bytes) were
checked against their pre-move hashes. `output/` retains an ignore rule for new
experiments; it is not a tracked release-media folder.

To inspect preserved evidence, read the archive's `output/` folder or the
`removed/` tree. The manifest contains no copied file contents. The archive
is local to this checkout; future clones can find previously tracked files in
Git history. No raw screenshot or mockup was promoted into publication media.
Fresh, reviewed showcase assets belong to the later visual-showcase phase.

This cleanup changes the **current tree**, not existing Git objects, remote
branches, clones or hosted caches. Historical personal author metadata,
historical QA paths and removed assets still require the separate Git-history
pass. Active generated artwork retains its existing rights boundaries in
[ASSET_RIGHTS.md](../ASSET_RIGHTS.md).

## Source navigation

- Grouped domain state/analytics, audio, persistence, shared UI and feature
  modules under named folders. Tests move with their owning modules; cross-panel
  tests live in `features/FeaturePanels.test.js`.
- Renamed the old generic panel module to `features/settings/UtilityPanels.js`
  and the collection module to `features/collection/PetsPanel.js`. App and tests
  now import each panel directly from its feature rather than following
  unrelated re-exports.
- Collected global CSS in `src/styles/`. The single `styles/index.css` entry
  lists all 28 stylesheets in the original generated order; component imports
  no longer implicitly decide the cascade. SVG URLs were updated for the move.
- Updated the disposable QA loader's game path, active documentation paths,
  asset inventory and navigation links. Added [SOURCE_MAP.md](SOURCE_MAP.md)
  with file ownership, task entry points and relevant tests.
- Labeled the older verification log as historical and linked current
  acceptance separately. Its dated checks remain useful without implying that
  their phase numbers or test totals describe the latest build.

## Verification

| Evidence | Result |
| --- | --- |
| Archive integrity | 257 pre/post hashes match; no archive file is tracked. |
| Active asset integrity | All 16 current media assets match the retained inventory hashes. |
| Executable-source comparison | All 60 JavaScript source/test files retain identical executable definitions after normalizing module paths and excluding import/re-export wiring and comments. All 163 relative import declarations resolve. |
| Styles | Generated production CSS is **byte-for-byte identical** to the Phase 2 baseline (`main.0c47deab.css`). |
| Frontend suite | **396 passed across 22 suites**, zero failures after relocation. |
| Server/launcher suite | **20 passed**, including the QA loader using the moved game module. |
| Production build | Successful with `CI=true`; no ESLint warnings. The existing Browserslist-data notice remains for the dependency/tooling pass. JS entry is `main.2a7f8025.js`. |
| Build contents | `build/art/` contains only `atelier/`; starter icons and the old raster/audio files are absent. Active favicon, manifest and production artwork remain. |
| Chrome smoke checks | At 1862×894, the room and fictional Journal load. At 569×320, compact Journal + Scratchpad retains its visible Minimize route and restores History. At 390×844, shop paintings and labels load and a real basic purchase deducts exactly 25 gems and adds an egg. These are desktop viewport checks. |
| Publication scan | The staged cleaned tree contains 135 files and zero raw `output/` files, compared with 309 files at the starting baseline. The bounded scanner reports no credential/email/user-path candidates in the current worktree. Historical findings remain assigned to the history pass. |
| Navigation and safeguards | All 80 local Markdown links resolve. Archive/report paths and future `output/` captures are ignored. The current media inventory exactly matches the tracked media tree. |

The Journal's explicit table-group roles were retained for its grid layout;
a local lint comment explains their purpose. No table semantics were removed
to silence the warning triggered when the file was linted at its new path.

Raw comparison/test reports stay in ignored `.local/phase3/`. CI, dependency
review, the documentation/architecture presentation pass, showcase media and
Git-history treatment remain separate publication phases.
