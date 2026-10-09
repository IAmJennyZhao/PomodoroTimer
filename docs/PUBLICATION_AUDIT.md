# Publication audit

Audit date: October 8, 2026. Application baseline: `be52e89` (application source unchanged since `01f586b`). This document records the identity/publication phase; the earlier UX verification uses a different phase sequence.

## Decisions

- Product: **Little Room**; local package: `little-room`; repository URL and legacy save-directory names stay stable.
- Initial release: desktop local-first browser app with a Node save service; support claims are limited by [PROJECT.md](PROJECT.md).
- Code and documentation: MIT, chosen by the owner on October 8, 2026. Generated illustrations have no newly granted reuse license; third-party dependencies retain their licenses.
- Raw QA output, personal runtime files, unverified media and unattributed legacy audio are outside the intended release contents.
- GitHub metadata updates, cleanup, history rewrites and release publication belong to separate passes.

## Remote and history baseline

The GitHub connector confirms that `IAmJennyZhao/PomodoroTimer` is already public. A read-only `git ls-remote --heads origin` on the audit date returned main at `f4c49dd6871b227cbd69ba17b89af3d0ceb09d20`, matching the local tracking reference. The local baseline has 106 commits and is 63 commits ahead of that reference. No remote mutation is part of this pass.

Commit metadata contains a personal author/committer email in addition to a GitHub noreply identity. This is an explicit privacy finding; the address is deliberately not repeated here. New checkpoints use the existing GitHub noreply identity. The history pass must review treatment of historical personal email before publishing more history. A source-file scan does not cover author metadata.

## Intended contents

| Location | Publication decision | Follow-up |
| --- | --- | --- |
| `src/`, `server/`, `scripts/` | Include project code, tests and developer tooling, except separately listed media. | Code license is MIT; retain third-party attribution. |
| `package.json`, `package-lock.json`, `.gitignore` | Include metadata, reproducible dependency versions and ignore rules. | Keep lockfile consistent and review dependencies in Phase 4. |
| `README.md`, current `docs/`, root rights/notices | Include current instructions, scope and provenance. | Documentation presentation and architecture work remain Phase 5. |
| `public/art/atelier/` | Production artwork; include only under an owner-approved asset distribution plan. | Separate asset license/distribution decision required before bundling for redistribution. |
| Five older PNGs under `public/art/` | Exclude from the intended release; unused reference artwork. | Archive outside the release tree in Phase 3. |
| `src/art/*.svg`, `public/favicon.svg` | Include project-authored code-drawn artwork under the code license. | Inventory provenance separately from generated PNGs. |
| CRA starter logos/favicon | Exclude from Little Room branding. | Remove after reference checks in Phase 3. |
| `src/sounds/*` | Exclude: current audio is procedural; original file rights are unrecorded. | Remove from current release tree in Phase 3; historical handling in Phase 7. |
| `output/**` | Exclude raw reports, mockups, test logs, screenshots and fixtures from the intended release. | Preserve evidence separately; curate approved media into `docs/assets/` in Phases 3/6. |
| `.local/`, runtime saves, exports, `.env`, build/dependency/test output | Keep local and ignored. | Never publish personal notes, progress or full diagnostic reports. |

The table is a release policy, not a claim that excluded tracked files have already been removed. Existing tracked files remain tracked despite future ignore rules. Every candidate screenshot still needs content and visual review; a QA fixture label or filename is not approval to publish it.

## Audit execution

The repeatable audit, inventory and findings are added in the next checkpoint of this phase. Full machine-level diagnostics belong under ignored `.local/`; only a reviewed summary belongs in this document. The scan must cover current files, unique blobs reachable through local refs, commit messages and author metadata, and report limitations explicitly.
