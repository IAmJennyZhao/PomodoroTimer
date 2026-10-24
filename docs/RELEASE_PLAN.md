# v0.1.0 release preparation

Owner decision: October 24, 2026. Prepare **Little Room v0.1.0** and publish the
release only after hands-on acceptance. Public source and showcase publication
can proceed while the supported release remains pending. No release tag or
finished-release announcement is part of this preparation.

## Draft release notes

**Little Room v0.1.0 — a gentler Pomodoro**

A local-first focus app with illustrated rooms, animal companions and progress
saved to disk on your computer. Run the React interface and Node save service
together; no account or cloud sync is required.

- Countdown and count-up focus, tasks/tags, breaks and overtime.
- Earn in-app Shilligems, hatch companions and arrange your room.
- Keep a Scratchpad and review focus history in the Journal.
- Mix procedural ambient sounds and choose reduced motion.
- Local save backups, revision-conflict protection and recovery drafts.

Install Node.js 22 or 24 LTS, clone the repository, then run `npm ci` and
`npm start`. See the [setup guide](SETUP.md) for production startup and save
backups. A static-only host does not provide the Node save service.

Project code/documentation are MIT licensed. Illustrations have
[limited permission](../ASSET_RIGHTS.md#limited-artwork-permission) for running
Little Room and sharing screenshots; other reuse remains reserved.
Shilligems have no real-money purchases. This release contains source, not a
packaged native installer.

## Acceptance before publishing

Use the fictional review room from [RELEASE_QUALITY.md](RELEASE_QUALITY.md),
not personal saves. Record the candidate commit, device, OS, browser/screen-reader
versions, and any failures or unavailable equipment.

- [ ] Listen to completion alerts, mute/volume controls and the ambient mixer.
- [ ] Use genuine 200% browser zoom across panels, including overtime with notes.
- [ ] Check screen-reader speech, keyboard focus, dialogs and compact Journal.
- [ ] Verify continuous mouse/key holds and cancellation with real input.
- [ ] Repeat core flows in additional real browsers where available.
- [ ] Record physical-phone checks or retain the explicit unsupported-device scope.

The detailed procedures and pass conditions remain in
[the acceptance record](RELEASE_QUALITY.md#remaining-acceptance-checks).
Missing equipment is not a pass. Resolve any failed supported-desktop checks
before publishing. Mobile support and accessibility conformance are not claimed.

## Publication after acceptance

1. Record hands-on outcomes and resolve release-blocking failures.
2. Confirm clean-checkout validation, the live advisory gate and hosted CI for
   the exact release candidate. Review expiring tooling exceptions again.
3. Finalize these notes with the observed support boundaries. Source-only
   GitHub archives are the intended distribution; a future compiled bundle
   additionally needs its actual bundled dependency notices reviewed.
4. Tag the accepted commit `v0.1.0`, publish the GitHub release with these notes,
   and verify the tag, notes and source downloads.

Current source-publication evidence is in [PUBLICATION_STATUS.md](PUBLICATION_STATUS.md).
