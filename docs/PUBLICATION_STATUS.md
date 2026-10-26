# Publication status

Updated October 26, 2026.

## Published source

The repository is public at
[IAmJennyZhao/PomodoroTimer](https://github.com/IAmJennyZhao/PomodoroTimer).
Checkpoint `6e6255f` includes the simplified
session flow, isolated demo profile, refreshed screenshots, final README and
architecture diagram.

The main reading path is the [README](../README.md),
[technical guide](ARCHITECTURE.md) and [how-to-run guide](SETUP.md).
Media dates and provenance are recorded separately in [MEDIA.md](MEDIA.md).

The maintenance pass also archives completed plans, consolidates the release
documentation, applies compatible dependency/Actions updates and records the
[PR resolutions](DEPENDENCIES.md#october-26-pr-resolution).

## Validation

At `c32fbce`:

- All seven [Checks jobs](https://github.com/IAmJennyZhao/PomodoroTimer/actions/runs/40373909219)
  passed: Node 22/24 on Windows, macOS and Linux, plus browser regressions.
- [Dependency review](https://github.com/IAmJennyZhao/PomodoroTimer/actions/runs/40373909194)
  passed using the documented, expiring tooling exceptions.
- Local interface validation passed 396 frontend tests, 24 server/demo tests,
  the strict production build and 21 Chromium/Firefox/WebKit cases.

These results describe that checkpoint. Current published runs are available
under [Checks](https://github.com/IAmJennyZhao/PomodoroTimer/actions/workflows/checks.yml)
and [Dependency review](https://github.com/IAmJennyZhao/PomodoroTimer/actions/workflows/dependencies.yml).
Later release candidates need their own validation. Dependency exceptions expire **November 30, 2026**; see
[DEPENDENCIES.md](DEPENDENCIES.md).

## Acceptance

The owner confirmed v0.1.0 hands-on acceptance complete on October 26, 2026.
The acceptance checklist was removed at the owner's request. Earlier records
in `history/` describe their original review dates, not outstanding work.

## Repository protection

Repository secret scanning and push protection were enabled and verified on
October 26, 2026.

The owner selected MIT for code/documentation and limited permission to run the
app and share screenshots; other artwork reuse is reserved. See
[ASSET_RIGHTS.md](../ASSET_RIGHTS.md#limited-artwork-permission).

## Historical evidence

The [history index](history/README.md) holds completed publication plans,
cleanup/audit records and earlier validation. The
[October 26 publication snapshot](history/PUBLICATION_STATUS_2026-10-26.md)
preserves the longer handoff. History filtering and private-backup preservation
are documented in [the history preparation record](history/HISTORY_PREPARATION.md).
