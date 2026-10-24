# Little Room: project identity and release scope

For the October 24 dependency refresh, applied GitHub metadata and remaining
publication steps, see [current publication status](PUBLICATION_STATUS.md).

## Identity

**Little Room** is a local-first Pomodoro app with cozy illustrated rooms, animal companions, and focus tracking. It is for people who want a quiet focus timer with a collection that grows through completed work.

Use **Little Room** as the product name, `little-room` as the local npm package name, and **a gentler Pomodoro** as the optional tagline. The existing repository remains `IAmJennyZhao/PomodoroTimer`; renaming it is not required for this release. Existing `PomodoroTimer` save directories and environment variables remain stable so returning users retain their progress. The package stays `private: true` to prevent accidental npm publication; this does not make the GitHub repository private.

Prepared GitHub description: **A local-first Pomodoro app with cozy illustrated rooms, animal companions, and focus tracking.** Apply it in the GitHub-release pass alongside the social preview and topics.

## Initial release scope

The current package version is `0.1.0`. It is a preparation baseline, not an announced finished release. The initial release is a browser interface plus a Node.js service running on the same desktop computer, with Node.js 22 or 24 LTS. The reproducibility baseline is pinned in `.nvmrc`.

| Capability | Included behavior |
| --- | --- |
| Focus timer | Countdown and count-up, pause/resume, completion, overtime, intentional abandonment, short/long breaks and session settings. |
| Focus context | Session tasks and tags, Scratchpad, daily goal, and saved session history. |
| Collection | Focus rewards, eggs, hatching, pet upgrades, animation previews and accessories. Shilligems are in-app points with no real-money purchases. |
| Room | Illustrated room styles, furniture ownership, direct placement and saved widget positions. |
| Journal | Local session history, activity charts and tag totals for selectable date ranges. |
| Sound and motion | Procedural timer/interaction audio, ambient mixing and reduced-motion preferences. |
| Persistence | Local disk saves outside the repository, automatic backup recovery, revision-conflict protection and reference-only recovery drafts. |

The release does not include cloud accounts/sync, collaboration, packaged native apps, automatic draft import/merge, or a fully functioning static-hosted demo. Installing dependencies needs network access; core runtime behavior uses local services and bundled assets. Browser audio permission, an open tab and a running service are still relevant to alerts and saving.

## Support claims

| Environment | Current evidence | Release claim |
| --- | --- | --- |
| Windows desktop with Chrome | Phase 2 UI fixes checked in Chrome; Phase 4 clean installs and full validation pass on Node 22.23.3 and 24.21.0. See [AUTOMATION.md](AUTOMATION.md). | Verified desktop baseline; hands-on release acceptance is still pending. See [RELEASE_QUALITY.md](RELEASE_QUALITY.md). |
| macOS/Linux desktop | Platform-specific save locations and clean-install/build/startup/save CI are implemented. Current hosted results are linked in [PUBLICATION_STATUS.md](PUBLICATION_STATUS.md). | Intended support; hands-on platform acceptance remains unverified. |
| Firefox/Safari/WebKit | Phase 4 adds headless Firefox/WebKit production regressions alongside Chromium; see [AUTOMATION.md](AUTOMATION.md). Real-browser/device acceptance remains open. | Do not advertise complete cross-browser support yet. |
| Narrow/phone-sized layouts | Desktop Chrome viewport checks exist. | Responsive layouts exist; actual mobile support is unverified. |
| Physical phone | Android USB forwarding instructions now exist for the isolated QA room; no physical touch/software-keyboard/orientation acceptance recorded. | Not an initial supported deployment target. Ordinary loopback URLs on the PC are not phone URLs; the QA forwarding route remains unverified on hardware. |
| Assistive technology/zoom | Keyboard/DOM checks exist; actual screen reader and genuine 200% zoom checks remain missing. | Do not claim full accessibility conformance. |

## Release gates and separate passes

The existing UX/verification records use their own phase numbers. The publication phases below are a different sequence.

1. **Identity and publication audit:** establish identity, licensing boundaries, inventory and explicit publication decisions.
2. **Release quality:** resolve F19 (clipped Journal keyboard targets), F20 (purchase-label contrast), F21 (notes pushing Finish off-screen), and review F08's narrow Nest target. Complete supported-device/browser/audio checks and accurately record remaining limitations.
3. **Repository cleanup:** curate `output/`, remove unused/unattributed artifacts from the intended release tree, and improve source navigation.
4. **Automated checks:** establish CI, platform setup verification and dependency review.
5. **Documentation and architecture:** separate current user/contributor documentation from historical logs and add architecture diagrams.
6. **Visual showcase:** use fictional demo content, fresh app screenshots, a walkthrough and social preview.
7. **Git history:** decide and implement treatment of personal author email, excluded historical artifacts and unpublished checkpoints, preserving attribution.
8. **GitHub release:** apply metadata, verify the clean checkout and all outstanding distribution gates, tag and publish.

Phase 1 defines and records these gates; it does not claim that the app, complete asset bundle, or published history is release-ready. See [PUBLICATION_AUDIT.md](PUBLICATION_AUDIT.md) for evidence and file disposition.

Publication Phase 3's current-tree artifact cleanup and source navigation are
complete; see [REPOSITORY_CLEANUP.md](REPOSITORY_CLEANUP.md) and
[SOURCE_MAP.md](SOURCE_MAP.md). The owner deferred Phase 2's remaining hands-on
acceptance on October 9. Those checks remain release gates, while later
publication phases continue as separate passes.

Publication Phase 4's CI configuration, reproducible validation and dependency
review are complete locally; see [AUTOMATION.md](AUTOMATION.md) and
[DEPENDENCIES.md](DEPENDENCIES.md). Current hosted workflow results are linked
in [PUBLICATION_STATUS.md](PUBLICATION_STATUS.md),
and the old CRA tooling families retain specific exceptions that expire on
November 30, 2026. Revisit them during the final release review.

Publication Phase 5's current user/contributor guides, historical separation
and architecture diagrams are complete locally; see the
[documentation index](README.md), [architecture](ARCHITECTURE.md) and
[documentation review](DOCUMENTATION_REVIEW.md). Later publication work follows
in separate passes, with the distribution and hands-on release gates still open.

Publication Phase 6's reviewed screenshots, captioned walkthrough, animated
preview and social card are complete locally; see the
[gallery](SHOWCASE.md), [media preparation and verification](MEDIA.md) and
[artifact manifest](media/manifest.json). The README now showcases the real app
using fictional content. Phase 8 uploaded the social card on October 24 following
explicit owner approval and verified that it persisted after a settings reload.
Publication Phase 7's local history filtering is complete. Every original
commit remains, with personal identity metadata replaced by the existing
noreply identity and excluded historical artifacts removed from the ancestry.
See [history preparation](HISTORY_PREPARATION.md), the
[development timeline](history/TIMELINE.md) and [commit map](history/COMMIT_MAP.json).
Verified original backups stay private and local. Phase 8 published the cleaned
source ancestry to GitHub on October 24. On that date the owner selected limited artwork permission for running
the app and sharing screenshots, with other reuse reserved. v0.1.0 remains held
for hands-on acceptance; see [release preparation](RELEASE_PLAN.md) and
[current publication status](PUBLICATION_STATUS.md).
