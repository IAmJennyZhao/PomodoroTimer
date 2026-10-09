# Source map

Start with [App.js](../src/App.js) for application composition and navigation,
[game.js](../src/domain/game.js) for accepted state changes, and
[useLocalSave.js](../src/persistence/useLocalSave.js) for the save lifecycle.

```text
src/
  App.js, App.test.js       App composition and integrated user flows
  index.js, setupTests.js   Browser and test entry points
  domain/                  Game state, rewards, migration and analytics
  features/
    timer/                 Clock, tasks, pause, completion and abandonment
    collection/            Pets, eggs, accessories and animation choices
    room/                  Room rendering, furniture and placement gestures
    journal/               History, analytics UI and Scratchpad layout/status
    settings/              Session preferences, general settings and sound UI
    FeaturePanels.test.js  Cross-feature panel behavior
  persistence/             Local save requests, conflicts and recovery drafts
  audio/                   Procedural Web Audio engine
  shared/                  Controls, surfaces, artwork and transient feedback
  styles/                  Global CSS with one ordered entry point
  art/                     Project-authored SVG frames and textures
server/                    Loopback HTTP service and atomic disk storage
scripts/                   Development, publication audit and disposable QA tools
public/art/atelier/        Production raster artwork
```

## Where to make a change

| Task | Owning files | Relevant tests |
| --- | --- | --- |
| Timer rules, rewards, eggs, inventory or saved-state migration | [domain/game.js](../src/domain/game.js) | [game.test.js](../src/domain/game.test.js), [App.test.js](../src/App.test.js) |
| Clock controls, tasks, tags, breaks and hold-to-abandon | [TimerCard.js](../src/features/timer/TimerCard.js), [SessionTasks.js](../src/features/timer/SessionTasks.js), [HoldToStop.js](../src/features/timer/HoldToStop.js), `SessionPause.js`, `SessionStrip.js` in the same folder | Tests beside the components; integrated flows in `App.test.js` |
| Egg purchases and current/next selection | [EggShop.js](../src/features/collection/EggShop.js), [EggSelection.js](../src/features/collection/EggSelection.js) | `EggSelection.test.js`, [FeaturePanels.test.js](../src/features/FeaturePanels.test.js), `App.test.js` |
| Pet album, accessories and animation unlocks | [PetsPanel.js](../src/features/collection/PetsPanel.js), [PetDetails.js](../src/features/collection/PetDetails.js), [petMotions.js](../src/features/collection/petMotions.js) | `PetDetails.test.js`, `FeaturePanels.test.js`, `App.test.js` |
| Furniture library and placement | [DecoratePanel.js](../src/features/room/DecoratePanel.js), [ArrangePanel.js](../src/features/room/ArrangePanel.js), [usePlacementGesture.js](../src/features/room/usePlacementGesture.js), [roomGeometry.js](../src/features/room/roomGeometry.js) | Gesture/geometry tests beside the modules; `RoomFeatures.test.js` and `App.test.js` |
| Room rendering and widget positions | [RoomBackdrop.js](../src/features/room/RoomBackdrop.js), [RoomObjects.js](../src/features/room/RoomObjects.js), [RoomWidget.js](../src/features/room/RoomWidget.js), [RoomInteraction.js](../src/features/room/RoomInteraction.js) | `RoomFeatures.test.js`, `RoomInteraction.test.js`, `App.test.js` |
| Journal periods, totals and history | [domain/analytics.js](../src/domain/analytics.js), [JournalPanel.js](../src/features/journal/JournalPanel.js) | `analytics.test.js`, `JournalPanel.test.js` |
| Scratchpad behavior | [useScratchpadLayout.js](../src/features/journal/useScratchpadLayout.js), [ScratchpadStatus.js](../src/features/journal/ScratchpadStatus.js), `QuickScratchpad` in `TimerCard.js`, `Drawer` in `shared/ui.js` | `App.test.js`, `RoomFeatures.test.js`, `ui.test.js` |
| Preferences and sound controls | [UtilityPanels.js](../src/features/settings/UtilityPanels.js) | `FeaturePanels.test.js`, `App.test.js` |
| Audio synthesis, mixing, muting and interruption | [audio/engine.js](../src/audio/engine.js) | [engine.test.js](../src/audio/engine.test.js), `App.test.js` |
| Button input, focus, panels, modals and reduced motion | [Controls.js](../src/shared/Controls.js), [ui.js](../src/shared/ui.js), [Transitions.js](../src/shared/Transitions.js), [useReducedMotion.js](../src/shared/useReducedMotion.js) | Tests beside those modules |
| Notifications and outcome feedback | [Feedback.js](../src/shared/Feedback.js), [OutcomeFeedback.js](../src/shared/OutcomeFeedback.js) | `Feedback.test.js`, `RoomInteraction.test.js`, `App.test.js` |
| Save failures, conflicts and reference-only recovery drafts | [useLocalSave.js](../src/persistence/useLocalSave.js), [saveProblems.js](../src/persistence/saveProblems.js), [RecoveryDrafts.js](../src/persistence/RecoveryDrafts.js) | `useLocalSave.test.js`, `RecoveryDrafts.test.js`, `App.test.js` |
| HTTP requests and disk saves | [server/index.cjs](../server/index.cjs), [server/store.cjs](../server/store.cjs) | [server/server.test.cjs](../server/server.test.cjs) |
| Development startup or fictional QA scenarios | [scripts/dev.cjs](../scripts/dev.cjs), [scripts/release-qa.cjs](../scripts/release-qa.cjs) | `server/dev-start.test.cjs`, `server/dev-ports.test.cjs`, `server/release-qa.test.cjs` |

`App.js` imports panels directly from their owning feature. There is no generic
panel barrel to follow. `shared/ui.js` still contains the common icons, sprites,
drawers, help and hatch surfaces; this move groups existing responsibilities
rather than extracting new APIs.

## Styling and artwork

[styles/index.css](../src/styles/index.css) is imported once by the browser
entry. Its 28 imports preserve the established cascade; feature modules no
longer load global CSS implicitly. Keep that order when changing styles.

Start with `visual-system.css` for colors, type and paper/frame tokens,
`motion.css` for durations, and the feature stylesheet for the affected screen.
Later files such as `notes-journal.css` and `save-recovery.css` contain layout
overrides. `base.css`, `atelier.css` and the refinement files remain part of the
current cascade; moving them did not flatten their rules or change specificity.

[AtelierArt.js](../src/shared/AtelierArt.js) provides raster-sheet crops.
Production PNGs stay in `public/art/atelier/`; SVG frames/textures stay in
`src/art/`. Asset provenance and reuse boundaries are in [ARTWORK.md](ARTWORK.md)
and [ASSET_RIGHTS.md](../ASSET_RIGHTS.md).

## Validation tooling

[scripts/check.cjs](../scripts/check.cjs) runs the common unattended checks.
[Startup smoke tests](../scripts/production-smoke.test.cjs) boot the development
launcher and production executable with private temporary profiles. The
[browser fixtures](../e2e/fixtures.cjs) isolate the production room for each case
in [release.spec.cjs](../e2e/release.spec.cjs).

[audit-dependencies.cjs](../scripts/audit-dependencies.cjs) enforces the live
[dependency review](DEPENDENCIES.md); its failure-path tests are in
[dependency-review.test.cjs](../server/dependency-review.test.cjs). Workflows live
in `.github/workflows/`. See [AUTOMATION.md](AUTOMATION.md) for commands, CI scope
and limitations.

## Local evidence and current status

New raw QA captures belong in ignored `.local/` or `output/`, not the tracked
source tree. Publication Phase 3 preserved the former raw tree in a local
archive; [REPOSITORY_CLEANUP.md](REPOSITORY_CLEANUP.md) records the disposition.
Use [RELEASE_QUALITY.md](RELEASE_QUALITY.md) for current acceptance evidence;
[AUTOMATION.md](AUTOMATION.md) records Phase 4 automation;
[VERIFICATION.md](history/VERIFICATION.md) is historical.
