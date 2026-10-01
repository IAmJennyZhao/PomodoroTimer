# Little Room

A local Pomodoro timer with a full-screen pastel room, illustrated animal companions, and a collection that grows while you focus.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm start
```

Open **http://127.0.0.1:3000**. This command runs both the React development app and its local save service. Keep the terminal open while using the app. Both servers listen only on your computer's loopback interface.

If port 3000 is already in use, choose another frontend port. For example, in PowerShell:

```powershell
$env:PORT='3002'; npm start
```

Then open **http://127.0.0.1:3002**. `PORT` must be an integer from 1024 to 65535, excluding 3001, which is reserved for the development save service.

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

For testing or a separate profile, set `POMODORO_DATA_DIR` to another directory **outside this repository** before launching. The service rejects repository folders, including symlink aliases into the repository. `POMODORO_API_PORT` changes the production service port; development uses the frontend `PORT` (default 3000) and save service port 3001.

## Focus and collection

- Quick, classic, deep-work and custom timers under **Session lengths** on the timer, automatic long breaks, session tasks, a progress ring and completed-session markers.
- One **Shilligem per completed focus minute**. Basic eggs cost 25; mystery rolls cost 60. Click the shop's info icon for rarity odds and the rare-or-better guarantee.
- Illustrated cats, dogs, squirrels, rabbits, foxes and deer. Duplicates are additional residents. Choose a companion, arrange the room and unlock accessories, furniture and backgrounds.
- Ambient sound mixing, an adjustable daily session goal, break activity suggestions and a distraction scratchpad.
- Journal analytics for today, 7 days and 30 days: focus time, sessions, average length, active days, activity charts and complete session history.
- Navigation beside the wallet opens spacious central workspaces; settings and sound use smaller panels. Optional descriptions appear through info buttons.

## Checks

```sh
npm test -- --watchAll=false
npm run test:server
npm run build
```

Server tests create isolated folders under your operating system's temporary directory. They cover disk persistence, recovery, conflicts, request validation, loopback request restrictions and safe production file serving. They never read or write your personal save folder.

The development launcher includes a small compatibility adapter for the pinned Create React App 5.0.1 version. It supplies a valid loopback hostname for the development proxy and explicitly keeps host checks enabled. It does not modify `node_modules`.
