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

- Choose **Pomodoro** or **Count up** before starting. **Session settings** opens beside the timer with presets, custom lengths and break preferences.
- Pomodoro completion can **Repeat alarm** every eight seconds until you mute it or move on, or **Ding + count up** into overtime. Short and long break choices appear after the focus target is reached; breaks start only when you choose one. Long breaks are recommended at your configured interval.
- **Count up** starts at zero. Pause/resume excludes paused time; the checkmark finishes and saves the session. Overtime adds to the same focus session. Both count-up and overtime are capped at 24 hours.
- Starting or resuming work enters a quiet focus view that hides navigation and goals. The scratchpad icon stays available and saves notes without pausing. Drag its move handle to place it anywhere on screen; arrow keys also move it, and its position is saved.
- Each **Pomodoro allows two pauses, up to one minute each**. A third pause or a pause longer than one minute forfeits that session's Shilligems, including rewards already credited before overtime. Focus time, egg progress and journal credit are kept. Count-up sessions and breaks have unrestricted pauses.
- One **Shilligem per completed focus minute**, plus any maxed-pet bonus. Basic eggs cost 25; mystery rolls cost 60. **Basic ★ / Everyday ★★ / Rare ★★★ / Dreamy ★★★★** need 25 / 50 / 75 / 100 focus minutes. Click the shop's info icon for rarity odds and the rare-or-better guarantee.
- **One egg studies with you per session.** Your oldest egg is selected by default; choose another or deselect before starting. The session keeps that egg through pauses and reloads, so changing the selection during focus applies next session. Progress is credited at the Pomodoro target or when finishing count-up/overtime, with no spillover into another egg. Hatch it from the shop when ready.
- Illustrated cats, dogs, squirrels, rabbits, foxes and deer in four rarities. Undiscovered **? tiles** show rarity stars and reveal the matching egg when clicked. A duplicate of the same species and rarity upgrades your existing pet, up to **six upgrades and seven animations**. Each maxed pet adds **10% focus Shilligems**, capped at 50% total, with rewards rounded down; later copies give 5 Shilligems. The bonus is set when a session starts.
- **Decorate → Arrange room** opens direct drag controls, keyboard movement and position sliders. Pets can sit higher, including on the couch. Room styles supply walls, floors and a right-hand window; the couch, rug, bookshelf, window plants and tables are separate reusable decorations, available free in Furniture.
- Edit a session's **task checklist and tags** before or during focus. Track several tasks, check them off, and reuse tags such as Chemistry or Work. Journal tag totals follow the selected date range; a session with multiple tags contributes its full duration to each tag.
- Ambient sound mixing, an adjustable daily session goal, break activity suggestions and a distraction scratchpad.
- Journal analytics for today, 7 days and 30 days: focus time, sessions, average length, active days, tag totals, activity charts and complete session history with tasks and tags.
- Navigation beside the wallet opens spacious central workspaces without dimming the room. Settings, sound and scratchpad open on the right without moving the timer; on narrow screens they overlay it. Optional descriptions appear through info buttons.

Count-up sessions earn rewards and daily-goal credit when finished, using whole active minutes; sessions under one minute earn neither. Reset abandons unfinished count-up time. Pomodoros earn their base reward at the target, and finishing overtime credits any additional whole minutes once. While overtime is ongoing, that session's credited gems remain reserved until you finish or start a break; gems from earlier sessions remain available to spend.

Existing saves migrate automatically. Previously purchased eggs stay ready to hatch, and matching duplicate residents become upgrades of the first resident, preserving that pet's name, position and accessory. Private save files keep the previous successful revision as a backup.

Keep the app tab open for audible reminders. Enable **Timer sound** in Settings; if the browser blocks playback, **Enable alarm sound** is available on a completed Pomodoro. **Auto-start focus** optionally begins work after a chosen break, but reloading an expired break leaves the next session idle.

## Checks

```sh
npm test -- --watchAll=false
npm run test:server
npm run build
```

Server tests create isolated folders under your operating system's temporary directory. They cover disk persistence, recovery, conflicts, request validation, loopback request restrictions and safe production file serving. They never read or write your personal save folder.

The development launcher includes a small compatibility adapter for the pinned Create React App 5.0.1 version. It supplies a valid loopback hostname for the development proxy and explicitly keeps host checks enabled. It does not modify `node_modules`.
