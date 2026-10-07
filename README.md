# Little Room

A local Pomodoro timer with a full-screen pastel room, illustrated animal companions, and a collection that grows while you focus.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm start
```

Open the **Pomodoro app** address printed in the terminal (normally **http://127.0.0.1:3000**). This command runs both the React development app and its local save service. If either port is busy, it automatically tries the next port until it finds an available one, with no confirmation prompt. Keep the terminal open while using the app. Both servers listen only on your computer's loopback interface.

To choose different starting ports, set `PORT` for the frontend and `POMODORO_API_PORT` for the save service. For example, in PowerShell:

```powershell
$env:PORT='4000'
$env:POMODORO_API_PORT='4001'
npm start
```

Both values must be integers from 1024 to 65535. The frontend and save service always use separate ports, and the proxy follows the selected save-service port automatically. Use the printed app address if a starting port is occupied.

For a production build:

```sh
npm run build
npm run serve
```

Open **http://127.0.0.1:3001**. The same local service serves the built app and saves your progress. A static-only hosting service such as GitHub Pages cannot write the private local save folder; use the local commands above.

## Private progress

Your Shilligems, animals, room, timer, tasks, scratchpad and session history are saved outside this public repository:

- Windows: `%LOCALAPPDATA%\PomodoroTimer\saves\`
- macOS: `~/Library/Application Support/PomodoroTimer/saves/`
- Linux: `$XDG_DATA_HOME/PomodoroTimer/saves/`, or `~/.local/share/PomodoroTimer/saves/`

The app uses `state.json` with `state.backup.json` as a recovery copy. Writes replace the save atomically; the backup retains the previous successful revision. If the main file is damaged, the service recovers from the backup. If both files are unreadable, it preserves them and reports an error instead of resetting your collection. Save revision checks prevent two open windows silently overwriting one another.

No account or cloud service is involved. Runtime saves never go into the build. Git ignores common save/export filenames as an extra precaution. You can copy the save folder to back it up while the app is closed. The default data folder is shared between development and production runs.

For testing or a separate profile, set `POMODORO_DATA_DIR` to another directory **outside this repository** before launching. The service rejects repository folders, including symlink aliases into the repository. `POMODORO_API_PORT` changes the production service port; development uses `PORT` (default 3000) and `POMODORO_API_PORT` (default 3001) as starting ports and advances past occupied ports.

## Focus and collection

The app now follows **Candy-Pastel Atelier**: textured oil pastel / colored-pencil rooms, movable pistachio furniture, a cream rectangular timer and a labeled **Daily goal** note at the upper right. The egg shop uses a strawberry gumball machine, illustrated pedestals and a small selectable nest. Odds and hatch rules live behind info buttons. Artwork and exact generation prompts are documented in [docs/ARTWORK.md](docs/ARTWORK.md).

- Choose **Countdown** or **Count up** before starting. **Session settings** opens beside the timer with presets, custom lengths and break preferences.
- Pomodoro completion can **Repeat alarm** every eight seconds until you mute it or move on, or **Ding + count up** into overtime. Short and long break choices appear after the focus target is reached; breaks start only when you choose one. Long breaks are recommended at your configured interval.
- **Count up** starts at zero. Pause/resume excludes paused time; the checkmark finishes and saves the session. Overtime adds to the same focus session. Both count-up and overtime are capped at 24 hours.
- Starting or resuming work enters a quiet focus view with a larger clock and hidden navigation and goals. Pause sits at the timer's upper left, showing the remaining allowance as **Pause (2/2)**. Hold **Stop** for five continuous seconds to abandon an unfinished timer; releasing early cancels it. Space or Enter can also be held.
- The scratchpad saves notes without pausing. Drag its move handle to place it anywhere on screen; arrow keys also move it, and its position is saved. It stays open across Settings, navigation and focus transitions until you press its X or either notes button again. Notes buttons show a pressed state while it is open.
- Each **Pomodoro allows two pauses, up to one minute each**. The large clock shows the live pause countdown. A third pause or a pause longer than one minute replaces the clock with one concise **Pause ended** alert, chimes when sound is enabled, focuses Resume, and forfeits that session's Shilligems, including rewards already credited before overtime. Resume continues the remaining focus time. Egg progress and journal credit are kept. Count-up sessions and breaks have unrestricted pauses.
- One **Shilligem per completed focus minute**, plus any maxed-pet bonus. Basic eggs cost 25; mystery rolls cost 60. **Basic ★ / Everyday ★★ / Rare ★★★ / Dreamy ★★★★** need 25 / 50 / 75 / 100 focus minutes. Click the shop's info icon for rarity odds and the rare-or-better guarantee.
- **One egg studies with you per session.** Your oldest egg is selected by default; choose another or deselect before starting. The session keeps that egg through pauses and reloads, so changing the selection during focus applies next session. Progress is credited at the Pomodoro target or when finishing count-up/overtime, with no spillover into another egg. Hatch it from the shop when ready.
- Illustrated cats, dogs, squirrels, rabbits, foxes and deer in four rarities. Undiscovered **? tiles** show rarity stars and reveal the matching egg when clicked. A duplicate of the same species and rarity upgrades your existing pet, up to **six upgrades and seven animations**. Each maxed pet adds **10% focus Shilligems**, capped at 50% total, with rewards rounded down; later copies give 5 Shilligems. The bonus is set when a session starts.
- **Decorate -> Arrange room** scales the background and furniture together above a horizontal library, keeping the illustrated floor aligned. Select and drag furniture and pets; arrow keys remain available for smaller nudges. A coral outline and X mark the selection, and clicking a library tile cycles its placed copies. The timer and Daily goal note have move handles and saved positions that stay on screen when resized. New rooms start with one sofa and one rug. Each purchase adds one furniture copy; removing it returns that copy to the library. Existing room furniture and layouts are preserved.
- Edit a session's **task checklist and tags** before or during focus. Track several tasks, check them off, and reuse tags such as Chemistry or Work. Journal tag totals follow the selected date range; a session with multiple tags contributes its full duration to each tag.
- Ambient sound mixing, an adjustable daily session goal, break activity suggestions and a distraction scratchpad.
- Journal analytics for today, 7 days and 30 days: focus time, sessions, average length, active days, tag totals, activity charts and complete session history with tasks and tags.
- Header navigation opens spacious workspaces without dimming the room. The shop has its own illustrated counter. Settings, sound and scratchpad open on the right without moving the timer; on narrow screens they overlay it. Optional descriptions appear through info buttons.

Count-up sessions earn rewards and daily-goal credit when finished, using whole active minutes; sessions under one minute earn neither. Holding Stop abandons unfinished count-up time. Pomodoros earn their base reward at the target, and finishing overtime credits any additional whole minutes once. While overtime is ongoing, that session's credited gems remain reserved until you finish or start a break; gems from earlier sessions remain available to spend.

Existing saves migrate automatically. Previously purchased eggs stay ready to hatch, and matching duplicate residents become upgrades of the first resident, preserving that pet's name, position and accessory. Private save files keep the previous successful revision as a backup.

Keep the app tab open for audible reminders. Enable **Timer sound** in Settings; if the browser blocks playback, **Enable alarm sound** is available on a completed Pomodoro. **Auto-start focus** optionally begins work after a chosen break, but reloading an expired break leaves the next session idle.

## Interaction and motion settings

**Interaction sounds** and **Interaction volume** are saved independently of **Timer sound** and ambient levels. Find them in Settings or Sound; **Preview sound** plays a quiet tap at the selected level. New rooms start at 35%. Existing saves that had timer sounds off keep their taps muted during migration. Start/pause/resume taps now follow the interaction setting; completion chimes and repeat alarms still follow Timer sound.

**Reduce animation** and your operating system's reduced-motion preference both disable motion, including help popovers. The app cannot override a system request to reduce motion.

The animation passes use shared rules for everyday interaction:

- `src/motion.css` defines 100ms presses, 180ms releases, 200ms transitions, and 480ms rewards, with common easing, 2% compression, 1px press travel, 2px reward lift, 8px entrance travel, and rest/pressed shadows. Existing control transitions and panel/toast/hatch entrances use these tokens. Slow pet idle cycles and the clock's linear progress indicator keep their own cadence.
- `Button` and `ChoiceInput` in `src/Controls.js` apply consistent feedback to ordinary buttons, tabs, collection choices and native checkboxes/radios. Button content compresses 2% and moves down 1px while its frame and hitbox stay fixed. Pointer, touch, Enter/Space and assistive activation retain native behavior; cancellation, blur and disabled updates clear the press. Selection colors and persistent navigation underlines transition smoothly. Hover is silent, and disabled/inert controls cannot trigger feedback. Drag handles keep their positioning behavior.
- `ControlFeedbackContext` supplies a quiet tap or selection tick after activation without delaying the action. A button can use `sound={null}` when its handler already owns playback, as the sound preview does. Interaction effects never replace timer alerts. The optional `motion-pressable` / `motion-visual` and `motion-reward` primitives remain available for later effects.
- `Presence` in `src/Transitions.js` keeps one outgoing panel/notepad/toast for a 200ms exit while disabling its interaction and removing it from the accessibility tree immediately. New requests take effect immediately; reopening preserves the same surface and invalidates its old exit deadline. Opening, closing and reversal use native animations that preserve panel positioning. Focus restoration happens when closing starts, and portaled help closes with its owner. The notepad remains independent across navigation and focus changes.
- `TimerTransition` measures the visible card before a semantic state/layout change and eases its visual layer into the new geometry. Start, pause/resume, focus view, completion and break state update without waiting for motion; clock ticks do not restart animations. Room chrome fades while becoming inert immediately. If an activated timer control disappears, focus moves to its next available action. Reduced motion cancels native motion and retires exits immediately.
- Hold-to-stop has a continuous fill with an independent five-second deadline. Early release, Escape, lost focus/capture or interrupted timer state cancel the hold. A brief Cancelled label and draining fill confirm release; a new hold starts from zero. Reduced motion shows measured progress without the animation and keeps the same five-second requirement.
- `MotionPreferenceContext` carries the effective reduced-motion preference to portals and future JavaScript sequences. Motion tokens become zero-duration/zero-travel when reduced motion is active; don't wait for an animation event to perform a game action.
- The existing engine exposes `setInteractionSfx({ enabled, volume })` and `playSfx(name)` for `tap`, `selection`, `paper`, `check`, `purchase`, `placement`, and `hatch`; `tap()` remains a convenience alias. Sounds share a soft C-major palette and short envelopes, with filtered noise for paper. No sound assets or new dependencies are needed.
- SFX config is silent. Playback unlocks browser audio on demand, fails quietly, and drops requests during a pending unlock, within 100ms of another effect, or while a prior interaction sound group is still playing. Timer alerts retire competing SFX and reserve the mix through their final note; repeating reminders keep SFX quiet until stopped. No burst is queued. A `false` result can mean muted or throttled as well as unavailable audio; `playSfx(name, { onUnavailable })` reports actual audio failures separately so the preview does not display an error for a dropped tap. Muting cancels active and pending SFX without affecting ambience or alerts. Task, reward and room effects use accepted state/events.

## Task and reward feedback

Phase 4 adds local feedback for accepted outcomes:

- Task checks draw their tick and strike-through over 200ms, with a soft check sound. Undo is immediate; editing keeps the same input and focus. Restored tasks and reopening the editor do not replay completion.
- Successful egg and catalogue purchases receive a short sage accent on the source/owned item and the purchase sound. Purchase controls yield their generic tap to the confirmed outcome. Invalid or unaffordable purchases do not celebrate. Accents are visit-only, expire after 600ms, and cannot replay when a panel or category remounts during that interval.
- Session receipts gently reveal earned rewards. The daily goal marks only the first credit for that session, including overtime. Timed completion keeps its existing alert; manual finishing uses the softer interaction check. Timer sound and interaction sound preferences remain independent.
- Hatching uses 180ms of egg anticipation followed by a 480ms reveal/settle. New pets use the full hatch sound and eight small confetti marks; upgrades use a check and four marks; capped copies use a purchase acknowledgment and no confetti. Done, X and Escape work throughout. Consuming the egg opens/focuses the modal before another native input can arrive, and dismissal cancels its visual deadlines and remaining interaction sound. Reduced motion reveals directly.
- Feedback never performs, delays, or persists a game action. Session event metadata distinguishes first journal credit from added overtime rewards. A reload retains the accepted game state without replaying transient effects.

## Room interaction feedback

Phase 5 makes direct room manipulation clearer:

- Picking up furniture, pets or a widget gently lifts its artwork. Mouse and touch keep the existing placement geometry; arrow keys and Shift nudges remain precise. A completed position change settles over 200ms with one soft placement sound. Selecting without moving and nudging against a boundary are silent.
- Escape, pointer cancellation, lost capture/focus, resize or leaving Arrange discard the draft. The item returns to its saved position with a brief **Returned** label and an accessible cancellation announcement. A later release cannot commit the canceled move. Escape first cancels an active move, preserving the selection for the next action.
- Applying a room style fades in the loaded painting and briefly accents its catalogue item. Accessories gently reveal on the pet and accent their source. Each accepted change owns its selection tick; restoring a save or applying an unchanged item does not replay feedback.
- Selecting a pet directly or from Pets gives its artwork one small 480ms tilt, limited to once per pet every 2.5 seconds. A room pet opens its panel on the completed click. Focus view and Arrange suppress these responses; existing idle motions keep their cadence outside focus view.
- Feedback stays outside saved state and animates inner artwork, preserving hitboxes and coordinates. Reduced motion removes travel and sequences while retaining placement, selection and cancellation behavior. Interaction sound settings still control the effects independently of timer alerts.

## Final interaction calibration

Phase 6 preserves the established sound levels and motion palette:

- Timer alerts have priority over task, purchase, hatch and control effects. Repeated one-shot requests do not stack. Muting **Timer sound** cancels active and pending alerts; **Interaction sounds** still controls SFX independently, and neither mute changes ambient playback. Hatch/notification dismissal and alarm mute do not add a generic tap.
- Focus view stops room pet idle motion and clears old informational banners. Overtime uses its clock/caption and an accessible announcement. Warnings remain available. Informational, success and warning notices have 3.5 / 4.5 / 6.5-second reading budgets; hover or focus pauses the remaining budget. Replacements receive a fresh deadline, and retired notices cannot pause them. Escape dismisses a focused notice and restores a visible control.
- On narrow screens, clock type fits the available width and the displayed character count. A persistent save warning reserves space above focus controls; resizing and retrying update that space without changing saved widget positions. Save errors remain visible until resolved.
- Muted outcomes retain their visual/text feedback. Reduced motion reveals directly, keeps native checked/selected states and clear cancellation labels, and consumes transient room responses so turning motion back on cannot replay them.

Audio calibration combines the user's preference to retain the current loudness with native browser rendering and overlap checks. Physical headphone/speaker listening was not available in the agent environment. The measured palette retains headroom even at maximum interaction volume.

## Checks

```sh
npm test -- --watchAll=false
npm run test:server
npm run build
```

Server tests create isolated folders under your operating system's temporary directory. They cover disk persistence, recovery, conflicts, request validation, loopback request restrictions and safe production file serving. They never read or write your personal save folder.

The development launcher includes a small compatibility adapter for the pinned Create React App 5.0.1 version. It supplies a valid loopback hostname for the development proxy and explicitly keeps host checks enabled. It does not modify `node_modules`.
