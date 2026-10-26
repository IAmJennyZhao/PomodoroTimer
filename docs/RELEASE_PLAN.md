# v0.1.0 release checklist

Updated October 26, 2026. Source is public; **the release remains pending**.
The owner chose to publish v0.1.0 only after hands-on acceptance.
This is the single current release task list.

## Draft release notes

**Little Room v0.1.0 — focus, hatch, decorate**

A gacha Pomodoro with animal companions and a room to make your own.
Turn focus time into eggs and accessories, arrange your space, and keep your
notes and Journal nearby. Progress saves on your computer.

- Countdown and count-up focus, tasks, tags, automatic breaks and overtime.
- Pets, hatching, upgrades, animations and room decoration.
- Scratchpad, daily goal, focus history and charts.
- Ambient sound mixing, interaction audio and reduced motion.
- Local save backups, revision checks and reference-only recovery drafts.

Install Node.js 22 or 24 LTS, run `npm ci`, then `npm start`.
[Setup](SETUP.md) covers production startup and backup. Distribution is source
for local desktop use; no native installer or cloud account is included.
Code/documentation are MIT licensed; artwork has
[separate terms](../ASSET_RIGHTS.md#limited-artwork-permission).

## Repeatable review room

Use fictional data and a separate profile:

```sh
npm run build:check
npm run qa:release
```

Open the printed URL, normally **http://127.0.0.1:5111/**. The launcher serves
the production build with its own temporary save folder. It never uses the
ordinary personal profile.

To choose a scenario, run `node scripts/release-qa.cjs <scenario>`:

| Scenario | Starting point |
| --- | --- |
| `journal` (default) | Eight fictional sessions and a note |
| `fresh` | Starter room |
| `alarm` | Idle one-minute countdown and one-minute break; Start unlocks audio |
| `countup` | Active count-up with over one minute elapsed |
| `overtime` | One-minute target already reached, with active overtime |

The QA terminal accepts `offline`, `online`, `seed <scenario>` and `quit`.
Close review tabs before reseeding, then open a new tab to avoid stale writes.
For save-failure checks, keep the page open while offline, edit a fictional note,
restore the service with `online`, and use Retry save.

## Acceptance checklist

Record the exact commit, device, OS, browser and assistive-technology versions.
Every row below remains pending; automated checks and unavailable equipment
do not count as a hands-on pass.

| Check | Procedure and pass condition | Status |
| --- | --- | --- |
| Focus and breaks | Complete the `alarm` countdown and finish a count-up session. Verify automatic break start, Start new session, and × cancellation back to idle focus. Overtime continues until explicitly finished. No duplicate reward or history entry after reload. | Pending |
| Audio and mixer | Start the `alarm` scenario and listen for the completion chime as the break starts. Check overtime/completion feedback, Timer sound, interaction mute/volume, ambient Play/Pause and mixing. Check for missing, duplicate or harsh audio and confirm preferences save. | Pending physical listening |
| Genuine 200% zoom | Set the browser menu to 200%. Inspect timer/settings, shop odds, Pets, Journal History, Scratchpad and Arrange, including overtime with notes. Essential text, actions and keyboard focus remain reachable. Restore the original zoom. | Pending |
| Screen reader | Navigate timer and selected/locked controls; check phase speech without per-second clock chatter. Test help, hatch and recovery dialogs, Escape and focus return, plus compact Journal with notes. | Pending |
| Continuous input | In count-up, hold Abandon with mouse and separately Space/Enter for five seconds; verify one abandonment without unfinished reward. Test early release, Escape, focus leaving, window/tab switching and interrupted dragging. Include held pet clicks and furniture cancellation. | Pending real input |
| Save recovery | Go offline, edit notes, return online and retry. Check that drafts survive, controls stay reachable and confirmed edits survive reload. | Pending hands-on |
| Additional browsers/platforms | Repeat timer, purchase, notes, Arrange, save-retry and keyboard flows in additional real desktop browsers/platforms where available. Record failures and unavailable equipment. | Pending |

Physical-phone testing is optional for this initial desktop scope. If exercised,
record touch movement/cancellation, software-keyboard notes, rotation, holds,
hatching and reload persistence. Otherwise retain the explicit unverified
mobile boundary in [project scope](PROJECT.md#support-claims).

Results template:

```text
Date and application commit:
Device, OS, browser and screen-reader versions:
Checks performed:
Passed:
Failed (steps, expected, actual):
Unavailable (reason):
```

The [earlier quality record](history/RELEASE_QUALITY.md) preserves the previous
findings and test evidence. Its dated controls and procedures are historical;
use the checklist above for the current interface.

## Publish after acceptance

1. Record outcomes and resolve supported-desktop failures.
2. Validate the exact accepted candidate with a clean install,
   `npm run validate`, the live dependency gate and hosted CI.
3. Revisit dependency exceptions before their November 30, 2026 expiry.
4. Finalize release notes with the observed support boundaries. A future compiled
   bundle also needs review of its actual bundled dependency notices.
5. Tag the accepted commit `v0.1.0`, publish the GitHub release, and verify its
   notes and source downloads.

[Publication status](PUBLICATION_STATUS.md) records source and CI evidence.
