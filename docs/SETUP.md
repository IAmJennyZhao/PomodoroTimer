# Setup and local saves

## Requirements

- Node.js **22 or 24 LTS** and its bundled npm. [.nvmrc](../.nvmrc) pins the tested
  Node 22.23.3 baseline. Use a Node version manager if you want to follow it.
- A desktop browser. See [support claims](PROJECT.md#support-claims) for verified
  environments and remaining hands-on checks.
- Network access to install dependencies. Core runtime behavior uses the local
  service and bundled assets.

Run commands from the repository root. Use `npm ci` with the checked-in lockfile.

## Development

```sh
npm ci
npm start
```

Open the **Little Room app** URL printed in the terminal. By default, startup
tries frontend port 3000 and save-service port 3001. It advances past occupied
development ports, keeps the two ports distinct, and points the frontend proxy
at the selected API port. Use the printed URL rather than assuming port 3000.
Keep the terminal open; **Ctrl+C** stops both child services.

## Production on your computer

```sh
npm run build:check
npm run serve
```

`build:check` runs the strict production build used by validation. `serve` uses
that build and normally prints **http://127.0.0.1:3001**. The single Node service
serves the static app and save API. Rebuild after changing frontend source.
Unlike development, production startup fails if its configured port is busy.

Both launch modes bind to **127.0.0.1**. A loopback address on another device
refers to that device, not this computer. Static-only hosting does not provide
the required local disk-save API. These instructions are for local desktop use.

## Ports and separate profiles

| Environment variable | Development | Production |
| --- | --- | --- |
| `PORT` | Starting frontend port, default 3000 | Unused |
| `POMODORO_API_PORT` | Starting save-service port, default 3001 | Exact service port, default 3001 |
| `POMODORO_DATA_DIR` | Overrides the save folder | Overrides the save folder |

For normal configured ports, choose an integer from 1024 to 65535. Changing a
port does **not** create a separate save profile. Development and production
share the default data folder.

For a separate profile in PowerShell:

```powershell
$env:PORT='4000'
$env:POMODORO_API_PORT='4001'
$env:POMODORO_DATA_DIR=Join-Path $env:TEMP 'little-room-personal-sandbox'
npm start
```

For bash/zsh:

```sh
PORT=4000 POMODORO_API_PORT=4001 POMODORO_DATA_DIR="$HOME/little-room-personal-sandbox" npm start
```

Reusing the chosen folder reopens that profile. Choose a new folder for a fresh
profile. PowerShell environment values persist in that terminal; open a new
terminal to return to defaults. The service rejects save folders inside the
repository, including symlink aliases into it.

For repeatable screenshots or acceptance checks, use the dedicated
[fictional review room](RELEASE_QUALITY.md#repeatable-review-room) rather than
your personal profile.

## Where progress lives

Settings → Local save shows the actual folder. Default locations are:

| Platform | Default save folder |
| --- | --- |
| Windows | `%LOCALAPPDATA%\PomodoroTimer\saves\` (or `~/AppData/Local/PomodoroTimer/saves/` if that variable is absent) |
| macOS | `~/Library/Application Support/PomodoroTimer/saves/` |
| Linux | `$XDG_DATA_HOME/PomodoroTimer/saves/`, or `~/.local/share/PomodoroTimer/saves/` |

The legacy `PomodoroTimer` folder name stays stable so existing progress remains
available. Saves use disk files, not browser localStorage, and are not bundled
into a production build.

- `state.json` holds the current saved revision.
- `state.backup.json` normally holds the previous successful revision. On the
  first save, it holds a copy of that first revision.

The save service limits state to 1 MiB. It writes through a temporary file and
atomic replacement, and validates the current revision before accepting a
write. See [architecture](ARCHITECTURE.md#save-lifecycle) for the data flow.

## Backup and recovery

To make a backup, close app windows, stop the local services, and copy the
**whole save folder** to a private location. To restore it, stop the services
and preserve the current folder first, then restore your known-good copy.
Restart the app and check its progress. Do not post saves, notes or drafts in
GitHub issues or attach them to a pull request.

If the main save is unreadable and its backup is valid, the service restores
the backup automatically. If neither is readable, it preserves the files and
reports the problem. Keep a copy before attempting repairs.

| Problem | Next action |
| --- | --- |
| Service unreachable | Restart the correct local service, then use **Retry save**. Keep the window open while edits are unsaved. |
| Another window saved newer progress | Use **Review edits**, copy notes or download a draft, then **Reload saved version** from Local save settings. Revision conflicts are not automatically merged. |
| Save or backup unreadable | Preserve both files. Restore a known-good private backup; do not delete them to silence the error. |
| Folder inaccessible | Read Save details, check the reported folder and permissions, then retry. |
| Invalid or oversized response | Read Save details; confirm the app is connected to its intended service. Keep a draft before reloading or repairing data. |

Recovery drafts offer read-only notes and a task checklist, **Copy notes**, and
**Download draft**. The download includes the state, capture time and base
revision. It is a reference format, not a replacement `state.json`, and there
is no automatic import or merge of balances, inventory or timers.

Loading the saved room keeps a separate recovery copy in the current window,
including after a failed load. Reopen it from Settings → Local save after
dismissing its notice. Drafts remain in memory until that window closes.
Download and check the file to retain one. Browser close warnings and
last-moment save requests are best-effort; let pending saves finish before exit.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Page will not open | Use the printed app URL and keep its terminal running. In development, both services must be available. |
| Production says the build is missing | Run `npm run build:check` before `npm run serve`. |
| Production port is occupied | Stop the other instance or choose `POMODORO_API_PORT` in a fresh terminal. |
| Install/build fails | Confirm Node 22 or 24, run `npm ci`, and retain the actual error. Consult [dependency review](DEPENDENCIES.md) for known tooling limits. |
| No sound | Check Timer/Interaction/Ambient settings, interact with the page to permit playback, and check browser/system volume. |
| Notes cover other controls | Use **Minimize** on the compact notes sheet, then return to the timer or Journal. |

For a bug report, include OS, Node/browser versions, command and relevant error,
plus steps reproduced with fictional content. Redact private save paths, notes
and session history. See [automated validation](AUTOMATION.md) for checks and
failure reports.
