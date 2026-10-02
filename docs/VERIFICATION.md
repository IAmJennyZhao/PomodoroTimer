# Implementation verification

## October 2 feature update

Verified against an isolated temporary profile on ports 3020/3021. No personal save data was used or changed.

| Change | Evidence |
| --- | --- |
| Movable notepad | Drag and arrow-key movement, viewport clamping and saved normalized coordinates covered by interaction tests. Browser notes and position persisted through reload. |
| Two one-minute Pomodoro pauses | Boundary tests cover exactly 60 seconds, exceeding 60 seconds, the third pause, reload, delayed ticks, overtime revocation and idempotency. Browser third pause showed forfeiture; finishing preserved one minute of study history and left the existing wallet balance intact. |
| One egg per study session | Tests cover oldest default selection, explicit deselection, selection locked at start, reload, no spillover and legacy ready eggs. Browser session advanced only its Basic egg from 24/25 to ready; the other egg stayed at 0/50. Hatching added a Basic squirrel. |
| Rarity tiles and pet upgrades | Four star tiers appear in the shop and collection. Clicking a Dreamy Fox mystery tile revealed its Dreamy egg source and 100-minute requirement. Tests cover duplicate merging, six upgrades, seven animations, the 50% bonus cap and later-copy consolation. |
| Bare room and movable furniture | Browser placed couch, rug, bookshelf, window plants and side table independently, then dragged the cat onto the couch. Position persisted at about x76%, y60%. Arrangement controls are buttons, with keyboard and slider alternatives. |
| Multiple tasks and tags | Browser completed a Chemistry session with two tasks; the journal showed the task list and one minute under Chemistry. A later session retained live task edits and completion checks. Tests cover tag normalization, task editing, date ranges and overlapping tag totals. |
| Reward integrity | Regression tests prevent spending provisional overtime rewards to escape a later pause penalty. Earlier rewards stay spendable. Integer-percent arithmetic avoids floating-point rounding losses. |
| Responsive layout | Shop visually inspected at 320px and journal at 390px. DOM measurements confirmed no horizontal overflow; selected mystery details were scrolled into the 320px viewport. Normal browser viewport restored afterward. |

Current automated checks: **189 tests across 11 React/domain/UI suites**, **17 server/startup tests**, and a successful production build with CI warnings treated as errors. `git diff --check` passes. The existing Browserslist-data notice remains informational.

## Earlier verification

The sections below record the October 1 implementation before these changes. Duplicate residents, immediate hatching and painted room backgrounds described there have been superseded above. Browser checks used an isolated operating-system temporary save folder, never the personal save folder.

## Focus flow refinement

The dual timer modes and quiet working view were informed by [Cat on Chair](https://catonchair.app/en/) and its [publisher's App Store description](https://apps.apple.com/ca/app/cat-on-chair-pomodoro-timer/id6746562271). The alarm/overtime choices implement the requested behavior in Little Room.

| Requested improvement | Implementation and evidence |
| --- | --- |
| Remove grey popup overlay | Removed the tinted/blurred backdrop. The wide-panel dismissal layer has a transparent background and no backdrop filter; browser inspection and a shop screenshot confirmed the room remains undimmed. |
| Breaks only after focus | Idle and running work show no break selection. Completed Pomodoros and explicitly finished count-up sessions offer short/long breaks; overtime offers them after reaching the original target. Breaks require an explicit choice. Reducer and full-app tests verify the gate and transition. |
| Repeat reminder or one ding then overtime | Session settings offers both behaviors, snapshotted for the next session. Audio tests verify immediate ringing, eight-second cadence, cancellation, blocked-audio recovery and no burst after a delayed resume. App tests verify mute and one-ding overtime; real one-minute browser runs exercised both completion paths. |
| Standalone count up | Starts at zero, pauses/resumes, restores elapsed time, and finishes using whole active minutes. Tests cover pauses, reloads, subminute finishes, 24-hour limits and duplicate prevention. Browser pause held at 08:08 through reload; Resume and Finish added eight gems and one history entry. |
| Settings beside an unmoved timer | Session/general settings use independently positioned right panels. Desktop timer bounds were identical before/after opening each panel; general settings measured x=624.2, y=141.58, width=390, height=373.69 in both states. Narrow-screen panels overlay the timer rather than resize it. |
| Quiet focus and quick scratchpad | Start/Resume hides navigation, wallet, goals and settings. Scratchpad remains one click away, focuses its textarea and saves without pausing. App tests and 320px browser inspection verify the flow; notes persisted through reload. |
| Stable checkpoints | Timer engine, audio, settings and focus-view changes committed together after tests and a production build. Final documentation and verification are a separate checkpoint. |

The current browser profile on port 3012 uses a separate temporary save folder. A one-minute Pomodoro, a Pomodoro with one additional whole overtime minute, and an eight-minute count-up session produced three history entries and 11 gems. The local save API confirmed those records. Current desktop checks used a 1638px viewport; mobile focus, scratchpad and count-up settings were inspected at 320px with no horizontal page overflow. No test data was added to the personal profile or repository.

## UI refinement

| Requested improvement | Current implementation and verification |
| --- | --- |
| Less visible copy, optional descriptions | Concise labels in every panel, timer and notifications. Info buttons reveal positioned details; Escape and outside interactions dismiss them. Tests cover disclosure state, focus return, portal interaction and dismissal without closing the workspace. |
| More structured journal | Today / 7 days / 30 days summaries for focus time, sessions, average length and active days; hourly/daily charts, adjustable goal, history and scratchpad. Calendar/DST, future timestamps, zero sessions, filtering and history pagination tested. Browser sample totals were 3h 1m / 7 sessions for the week and 6h 1m / 13 sessions for the month. |
| Rethink panel sizes | Animals, shop, decorating and journal occupy wide centered workspaces. Settings/sound use compact right panels. Arranging exposes the room with a small control panel. Switching sections resets scrolling. Desktop and mobile layouts were inspected in Chrome. |
| Session settings access | Session settings opens presets, durations and completion behavior beside the timer. Count-up mode shows only relevant break settings. Global settings retains playback/animation/autostart preferences and local-save information. Tests verify edits during an active session apply next session. |
| Remove top-left branding, relocate tabs | Brand removed. Main navigation sits next to Shilligems at the top right, wrapping into a second header row on phones. DOM tests and browser visuals confirm placement. |
| Clear daily goal | Badge says Daily goal with completed/target counts. Journal offers +/- target controls and progress. Browser changes persisted; future-dated history does not inflate progress. |
| Functional and responsive verification | Earlier isolated QA on port 3011 exercised purchase/hatch, mystery rolls, positioning, sound play/pause/volume, goal editing and scratchpad. Reload preserved that state. Current timer-flow checks are recorded above. |

Visual checks covered the normal 1365×655 CSS viewport and mobile widths of 390 and 320px. No horizontal page overflow at either mobile size; five monthly date labels fit without collision at 320px. Tests use temporary data outside the repository; sample history, currency and notes are not part of the production profile or Git.

## Feature coverage

| Requirement | Implementation and evidence |
| --- | --- |
| Immersive illustrated room | Three generated full-screen room paintings, central timer, corner wallet and top navigation. Desktop and mobile Chrome visual checks. |
| Animal companions and idle motion | Six illustrated species, a free starter cat, multiple room residents, subtle breathing motion, reduced-motion setting, and rare/dreamy coat treatments. Browser hatch revealed another animal and placed it in the room. |
| Shilligems and eggs | Completed-minute rewards, basic eggs, mystery rarity rolls, transparent odds, fifth-roll guarantee, persistent egg inventory, and duplicate residents. Domain tests cover all rarity boundaries, insufficient funds, pity, and unique IDs; browser checks cover purchase and hatch. |
| Room customization | Purchasable backgrounds, accessories, and reusable furniture. Browser checks unlocked and applied a room and bow, added a plant, dragged a companion, and verified its saved coordinates. |
| Timer and progress | Pomodoro/count-up selection, pause/resume/reset, break skip, presets, custom lengths, explicit short/long breaks, optional auto-start focus, progress arc, session markers and title timing. Real browser sessions verified completion and rewards; tests cover background deadlines, reload recovery, overtime and duplicate prevention. |
| Session intentions | Task field is attached to the completed session and retained in history; verified through full-app tests and browser recap. |
| Ambient sound mixer | Independently adjustable rain, fireplace, and brown-noise layers generated locally with Web Audio. Browser playback/volume controls, lifecycle tests, and panel interaction tests pass. |
| Break roulette | Rotating stretch, breathing, drawing, water, visual-rest, and movement prompts. Browser break UI and app integration tests verify the transition and shuffle. |
| Daily goals and celebration | Adjustable daily session goal, progress markers, completion message, and recap. App tests verify goal completion and the earned reward together. |
| Journal and scratchpad | Period analytics, activity charts, full focus history and a persistent distraction scratchpad. Browser note persisted on disk; tests cover metrics, goals, history, and notes. |
| Private file saves | Default save folder outside the repository, atomic replacement, previous-revision backup, corruption recovery, and conflict protection. Server rejects repository paths and symlink aliases. A service restart restored the browser-tested room, inventory, currency, and tasks. |

## Automated checks

- 153 React/domain/audio/persistence/panel/app/analytics/UI tests across eight suites.
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
