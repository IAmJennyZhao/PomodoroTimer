# How to run Little Room

[Overview and screenshots](../README.md) · [Technical guide](ARCHITECTURE.md)

## Requirements

- **Node.js 22 or 24 LTS**, with npm. [.nvmrc](../.nvmrc) pins the tested baseline.
- A desktop browser and network access for the initial dependency install.

Run the commands below from the repository folder.

## Install and start

```sh
git clone https://github.com/IAmJennyZhao/PomodoroTimer.git
cd PomodoroTimer
npm ci
npm start
```

Open the **Little Room app** URL printed in the terminal, usually
**http://127.0.0.1:3000**. The launcher starts the browser app and save service
together and selects available ports if the defaults are busy. Keep the
terminal open; **Ctrl+C** stops both.

Choose Countdown or Count up, add an optional task, and press Start. The sliders
icon opens session settings. Finishing focus starts a break automatically,
unless you selected Count overtime. During a break, **Start new session** begins
focus immediately; **×** cancels the break and returns to an idle timer.

## Try the demo

```sh
npm run demo
```

Open the printed URL, usually **http://127.0.0.1:3002**. The demo has 74 fictional
sessions, populated Journal charts, pets and eggs. Each launch creates a separate
temporary profile and does not change your ordinary progress. The screenshots
show a customized demo room; the demo starts with its seeded layout.
Stop it with **Ctrl+C** when finished.

## Run a production build locally

After installing dependencies:

```sh
npm run build:check
npm run serve
```

Open the printed URL, usually **http://127.0.0.1:3001**. One Node service serves
the built app and its save API. Rebuild after changing frontend source.
Production startup fails if its configured port is busy.

The Node service is required for saving; static-only hosting is insufficient.
The services listen on this computer's loopback address, so these URLs are
for local desktop use.

## Local saves and separate profiles

Settings → Local save shows the actual folder. Defaults are:

| Platform | Save folder |
| --- | --- |
| Windows | `%LOCALAPPDATA%\PomodoroTimer\saves\` |
| macOS | `~/Library/Application Support/PomodoroTimer/saves/` |
| Linux | `$XDG_DATA_HOME/PomodoroTimer/saves/`, or `~/.local/share/PomodoroTimer/saves/` |

The `PomodoroTimer` folder name preserves existing progress. Saves are disk files,
not browser localStorage. Development and production share the default profile.
Run only one service per save folder.

| Variable | Purpose |
| --- | --- |
| `PORT` | Development frontend starting port; default 3000 (demo 3002) |
| `POMODORO_API_PORT` | Save-service port; default 3001 (demo 3003). Development advances past busy ports; production uses the exact port. |
| `POMODORO_DATA_DIR` | Custom save folder outside this repository; demo always creates its own temporary folder |

Use ports from 1024 to 65535. Changing a port alone does not create a new profile.
For a separate development profile in PowerShell:

```powershell
$env:PORT = '4000'
$env:POMODORO_API_PORT = '4001'
$env:POMODORO_DATA_DIR = Join-Path $env:LOCALAPPDATA 'LittleRoomSandbox'
npm start
```

Or in bash/zsh:

```sh
PORT=4000 POMODORO_API_PORT=4001 POMODORO_DATA_DIR="$HOME/LittleRoomSandbox" npm start
```

Reusing that folder reopens that profile. PowerShell values persist in the
current terminal; open a new terminal to return to defaults.

## Backup and recovery

Close app windows and stop the services, then copy the **whole save folder**
to back it up. To restore, stop the services, preserve the current folder and
replace it with a known-good backup before restarting.

`state.json` is the current revision. `state.backup.json` normally holds the
previous successful revision and can repair an unreadable main file. If both
are unreadable, the service preserves them and reports the failure.

If another window saves newer progress, use **Review edits** to copy notes or
download a draft before **Reload saved version**. Draft downloads are reference
copies, not importable saves. Keep the window open while changes are unsaved;
let pending saves finish before closing it.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| `npm` or `node` is not recognized | Install Node 22 or 24 LTS, then open a new terminal. |
| Missing module or install error | Check `node --version`, stop the app, then run `npm ci` again. |
| PowerShell blocks `npm.ps1` | Use `npm.cmd ci` and `npm.cmd start` (or `npm.cmd run demo`). |
| Page will not open | Use the printed app URL and keep the terminal running. |
| Build is missing | Run `npm run build:check` before `npm run serve`. |
| Production port is busy | Stop the existing instance or set another `POMODORO_API_PORT`. |
| Save service unavailable | Keep the page open, restart its service and choose Retry save. |
| Save conflict | Review/download your draft, then load the saved version; changes are not merged automatically. |
| No sound | Interact with the page, then check Sound, browser and system volume. |
| Notes cover controls | Minimize the Scratchpad to return to the timer or Journal. |

For a bug report, include the command, error, OS, Node/browser versions and steps
using fictional content. Keep private notes, saves and local paths out of issues.
