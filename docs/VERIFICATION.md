# Implementation verification

Verified on October 1, 2026. Browser checks used an isolated operating-system temporary save folder, never the personal save folder.

## Feature coverage

| Requirement | Implementation and evidence |
| --- | --- |
| Immersive illustrated room | Three newly generated full-screen room paintings; desktop and 390px-content-width Chrome visual checks. Central timer, corner wallet, and bottom navigation follow the chosen mockup. |
| Animal companions and idle motion | Six illustrated species, a free starter cat, multiple room residents, subtle breathing motion, reduced-motion setting, and rare/dreamy coat treatments. Browser hatch revealed another animal and placed it in the room. |
| Shilligems and eggs | Completed-minute rewards, basic eggs, mystery rarity rolls, transparent odds, fifth-roll guarantee, persistent egg inventory, and duplicate residents. Domain tests cover all rarity boundaries, insufficient funds, pity, and unique IDs; browser checks cover purchase and hatch. |
| Room customization | Purchasable backgrounds, accessories, and reusable furniture. Browser checks unlocked and applied a room and bow, added a plant, dragged a companion, and verified its saved coordinates. |
| Timer and progress | Start, pause, resume, reset, skip, presets, custom lengths, short/long breaks, optional automatic starts, progress arc, session markers, title countdown, and completion chime. A real one-minute browser session completed, earned a reward, switched to break, and appeared in the recap. Tests cover longer cycles, background deadlines, reload recovery, and duplicate prevention. |
| Session intentions | Task field is attached to the completed session and retained in history; verified through full-app tests and browser recap. |
| Ambient sound mixer | Independently adjustable rain, fireplace, and brown-noise layers generated locally with Web Audio. Browser playback/volume controls, lifecycle tests, and panel interaction tests pass. |
| Break roulette | Rotating stretch, breathing, drawing, water, visual-rest, and movement prompts. Browser break UI and app integration tests verify the transition and shuffle. |
| Daily goals and celebration | Adjustable daily session goal, progress markers, completion message, and recap. App tests verify goal completion and the earned reward together. |
| Journal and scratchpad | Daily totals, full focus history, and a persistent distraction scratchpad. Browser note persisted on disk; tests cover goals, history, and notes. |
| Private file saves | Default save folder outside the repository, atomic replacement, previous-revision backup, corruption recovery, and conflict protection. Server rejects repository paths and symlink aliases. A service restart restored the browser-tested room, inventory, currency, and tasks. |

## Automated checks

- 87 React/domain/audio/persistence/panel/app tests across five suites.
- 11 local server and development-launcher checks across two files.
- Production build succeeds with CI warnings-as-errors enabled.
- Development startup tested on alternate port 3002, with the local API proxy and hostname checks intact.
- Production serving and restart tested on isolated port 3003.
- Git tracking and build contents checked for personal save files; all runtime progress remains outside the repository.

The existing Create React App toolchain prints an outdated Browserslist-data notice. It does not prevent the successful production build. Its missing Babel dependency is now explicitly pinned, and a tested loopback adapter preserves hostname checks during development.

## Reproduce

```sh
node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand
npm run test:server
npm run build
```

Use `POMODORO_DATA_DIR` pointing outside this repository for manual test profiles. Never copy private save files into source, `public`, or `build`.
