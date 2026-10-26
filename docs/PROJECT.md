# Project scope

Little Room is a local-first gacha Pomodoro app with pets and room decoration.
The [README](../README.md) is the product overview; [setup](SETUP.md) and the
[technical guide](ARCHITECTURE.md) describe running and developing it.

## Current scope

- Countdown and count-up focus, tasks and tags, automatic breaks and overtime.
- Focus rewards, eggs, pet upgrades, animations and accessories.
- Room styles, furniture and saved placement of pets, the timer and daily goal.
- Scratchpad notes, session history, activity charts and tag totals.
- Synthesized ambient and interaction sounds, timer alerts and reduced motion.
- Local disk saves with backups, revision checks and recovery drafts.

The app runs in a desktop browser with a Node.js 22 or 24 service on the same
computer. It has no cloud accounts or sync, packaged native installer, automatic
draft import, or standalone static-hosted deployment.

Use **Little Room** as the product name and `little-room` as the npm package
name. The repository, save directories and environment variables retain
`PomodoroTimer` for compatibility. The npm package is private; the GitHub
repository is public.

## Support claims

| Environment | Evidence and current boundary |
| --- | --- |
| Windows desktop / Chrome | Local UI checks and hosted CI pass; the owner confirmed v0.1.0 hands-on acceptance complete on October 26. |
| macOS and Linux | Hosted install, build, startup and persistence checks pass. |
| Chromium, Firefox and WebKit | Automated browser regressions pass in all three engines. |
| Narrow layouts and physical phones | Desktop viewport checks exist; physical mobile use remains unverified and outside the initial supported deployment. |
| Accessibility and audio | The owner confirmed the v0.1.0 hands-on acceptance checks complete on October 26. |

Current source validation is in [publication status](PUBLICATION_STATUS.md).
The package version is `0.1.0`. Acceptance is recorded in
[publication status](PUBLICATION_STATUS.md#acceptance).

## Project records

Code and documentation are MIT licensed. Generated artwork has
[separate terms](../ASSET_RIGHTS.md#limited-artwork-permission).
Dependency exceptions and their expiry remain in [DEPENDENCIES.md](DEPENDENCIES.md).

Completed publication phases, audits and earlier verification results are kept
in [history](history/README.md). They are dated evidence, not a current task list.
