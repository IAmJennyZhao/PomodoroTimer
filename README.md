# Little Focus Room

A local Pomodoro timer with a full-screen pastel room, illustrated animal companions, and a collection that grows while you focus.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm start
```

Open **http://127.0.0.1:3000**. This command runs both the React development app and its local save service. Keep the terminal open while using the app. Both servers listen only on your computer's loopback interface.

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

For testing or a separate profile, set `POMODORO_DATA_DIR` to another directory **outside this repository** before launching. The service rejects repository folders, including symlink aliases into the repository. `POMODORO_API_PORT` changes the production service port; development uses ports 3000 and 3001.

## Focus and collection

- Quick, classic, deep-work and custom timers, automatic long breaks, session intentions, a progress ring and completed-session markers.
- One **Shilligem per completed focus minute**. Basic eggs cost 25; mystery rolls cost 60. The shop shows rarity odds and the rare-or-better guarantee.
- Illustrated cats, dogs, squirrels, rabbits, foxes and deer. Duplicates are additional residents. Choose a companion, arrange the room and unlock accessories, furniture and backgrounds.
- Ambient sound mixing, a daily session goal, break activity suggestions, a distraction scratchpad and daily focus recaps.

## Checks

```sh
npm test -- --watchAll=false
npm run test:server
npm run build
```

Server tests create isolated folders under your operating system's temporary directory. They cover disk persistence, recovery, conflicts, request validation, loopback request restrictions and safe production file serving. They never read or write your personal save folder.
