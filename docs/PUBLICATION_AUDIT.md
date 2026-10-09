# Publication audit

Audit date: October 8, 2026. Starting baseline: `be52e89` (pre-phase application behavior baseline `01f586b`). This pass changes metadata, launcher messages and publication records, with no changes to game/save behavior. This document records the identity/publication phase; the earlier UX verification uses a different phase sequence.

Publication Phase 3 subsequently implemented the current-tree exclusions below.
See [REPOSITORY_CLEANUP.md](REPOSITORY_CLEANUP.md) for the October 9 disposition
and [SOURCE_MAP.md](SOURCE_MAP.md) for current source locations. The counts and
history findings in this audit remain a dated Phase 1 snapshot.

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

## Audit execution and evidence

The read-only, dependency-free [audit script](../scripts/audit-publication.cjs) scans tracked worktree files, every unique blob reachable through local Git refs, commit messages and author/committer metadata. It checks recognizable credential formats, private-key markers, credential assignments, authenticated URLs, emails and user-directory paths. Binary strings and compressed PNG text metadata are inspected; compressed image payloads are identified to distinguish accidental byte patterns from metadata. Findings contain locations/categories, never matched values or author addresses.

Snapshot at identity checkpoint `206260e` with the audit worktree staged:

| Evidence | Result |
| --- | --- |
| Current tracked files inspected | 306, including 163 raw `output/` records (about 44.3 MiB). |
| Reachable history inspected | 107 commits and 892 unique blobs: 712 text and 180 binary. |
| Credential-format/private-key/credential-assignment/authenticated-URL candidates | None in the checked worktree, commit messages or reachable blobs. This is a bounded pattern result, not a guarantee that no secret exists. |
| Personal commit identity | 105 historical commits have at least one personal author/committer email; new Phase 1 checkpoints use the existing GitHub noreply identity. |
| Current user-path candidates | 37 occurrences across 16 excluded QA files: temporary QA storage paths and workspace paths in test results. No matched path points to the default personal save directory. They remain evidence to archive outside the release in Phase 3. |
| Historical user-path candidates | 126 occurrences in prior QA records and unsanitized prompt revisions; historical treatment remains Phase 7. |
| Binary email-like patterns | All 15 occurrences across worktree/history are in PNG/JPEG compressed pixel payloads, not textual email metadata. These byte matches are false positives; they do not approve the images' visible content. |
| Runtime save filenames | No default `state.json` or `state.backup.json` is tracked in the current tree. Full QA snapshots under `output/` are deliberately excluded from the intended release. |
| Asset inventory | 29 current media assets under `public/` and `src/`: nine production generated PNGs, five older generated PNGs, seven project SVGs, four starter images/icons and four unattributed audio files. SHA-256 hashes and decisions are in [ASSET_INVENTORY.json](ASSET_INVENTORY.json). |
| Dependency inventory | 1,556 lockfile package entries; 1,555 available installed manifests, no version mismatches. Legacy `licenses` declarations are included. The optional `fsevents@2.3.3` package is not installed on this Windows checkout and has no license declaration in this lockfile; verify its source notices on a relevant platform before distribution. |

The exact scan counts are a dated snapshot; later checkpoints add new objects. The inventory's asset hashes refer to its documented starting baseline and were checked against the Phase 1 worktree. Neither raw `output/` nor the machine report is approved publication content.

## Changes made in this phase

- Aligned npm/lockfile identity, repository URL, project description, code-license metadata, README introduction and launcher messages with Little Room. Kept existing save paths and `private: true` unchanged.
- Added MIT code/documentation licensing, CRA attribution, direct dependency declarations and explicit asset-rights boundaries. No rights were invented for legacy audio or generated illustrations.
- Removed 49 machine-specific path fields from the current mockup prompt record, replacing them with repository-relative or named private references. All 15 primary prompt texts remain byte-for-byte identical as strings; illustration files are unchanged. The unsanitized record was retained only under ignored `.local/publication/` for this audit.
- Added ignore safeguards for future raw `output/`, recovery drafts using the actual `little-room-draft-*.json` export filename, environment files and private-key files. Explicit `.env.example`/`.env.sample` exceptions remain available. Already tracked artifacts were not removed by the ignore rule.

## Repeat the audit

Run from the repository root in PowerShell:

```powershell
New-Item -ItemType Directory -Force .local/publication | Out-Null
npm run audit:publication --silent | Set-Content -Encoding utf8 .local/publication/audit.json
if ($LASTEXITCODE -ne 0) { throw 'Publication audit failed; do not treat the report as complete.' }
$report = Get-Content .local/publication/audit.json -Raw | ConvertFrom-Json
$report.summary
```

On a POSIX shell:

```sh
mkdir -p .local/publication
npm run audit:publication --silent > .local/publication/audit.json
# Check the command's exit status before interpreting the report.
```

Review the report locally. It contains file locations and dependency metadata, so it stays ignored even though matched values and identities are redacted. New files are only included after they become tracked/staged; review proposed additions before staging. The scanner does not mutate Git, contact a network service or read the external personal save folder.

Limitations: untracked/ignored files, unreachable objects/reflogs, remote PR refs/caches, forks and other clones are outside this scan. Historical blobs are deduplicated and reported with one representative path. Binary inspection is not OCR, complete EXIF review, or visual approval of a screenshot. Dependencies' declared licenses are not complete release notices or asset clearance. No public-ready certification is claimed.

## Verification and handoff

- All 18 existing server/launcher tests passed after identity changes, including isolated saves, recovery, conflicts, origin checks and safe static serving.
- The production build passed on Node.js 22.14.0. Its existing outdated Browserslist-data warning is assigned to the dependency/tooling pass rather than silently changing the lockfile here.
- A disposable ignored Git fixture verified detection of credentials in deleted history and on another branch, separation of current/history findings, author-email counting, and redaction of credential values and identities.
- Package/lockfile names and license metadata agree; all 29 inventory hashes match the actual files. New QA output, recovery exports, environment files and key files are ignored; sample environment filenames remain eligible.

Phase 1's identity, scope, contents policy, licensing boundaries and audit are complete. Publication readiness is still pending the separately scoped UI/device work, artifact cleanup, asset distribution terms/notices, history decisions and final release review. In particular, do not push the full current QA tree or advertise the complete asset bundle as MIT licensed on the strength of this audit.
