# Release quality

> Historical record. Current scope and source status are in
> [PROJECT.md](../PROJECT.md) and [PUBLICATION_STATUS.md](../PUBLICATION_STATUS.md).
> Use [RELEASE_PLAN.md](../RELEASE_PLAN.md) for the live release checklist.

Publication Phase 2, October 8, 2026. Application baseline: `25e25ed`, including
`7197df9`. This is the current follow-up to the historical UX records in
the former `output/` tree; those records describe an older build and use
different phase numbers. Publication Phase 3 preserved that raw tree in an
ignored local archive rather than keeping it in the current tracked tree.

**Status: code fixes and available automated/Chrome checks pass; hands-on
acceptance remains open. Phase 2 is not fully complete.**

On October 9, the owner deferred the remaining Phase 2 hands-on checks to proceed
with repository cleanup. They remain unverified release gates; this deferral
does not record a pass or prevent the separate cleanup phase from completing.

Publication Phase 4 adds clean-install validation, CI, startup/persistence smoke
and automated production regressions in Chromium, Firefox and WebKit. Current
commands and evidence are in [AUTOMATION.md](../AUTOMATION.md). It also refreshes
Browserslist data; the stale-data warning in the dated Phase 2 build record below
is resolved. The remaining hands-on acceptance checks below remain pending.

## Resolved findings

| Finding | Change | Verification on this build |
| --- | --- | --- |
| F19: concealed Journal keyboard targets with compact Scratchpad | Suspend concealed workspace content with `hidden`, `inert` and `aria-hidden`, retaining mounted state. Show a visible Minimize route. Move focus out of content being concealed, without taking focus from the note field. Close portaled help through the surface activity context. | Chrome at 569×320 CSS pixels: Minimize and Close are both 44px high and inside the visible workspace. Tab reaches Close instead of clipped Journal controls. Minimizing restores selected History and the saved fictional draft. Regression tests also preserve the selected analytics period through contraction/expansion. |
| F20: enabled purchase text over painted art | Give Buy/Roll labels dark ink and an opaque cream backing. Retain painted button art and affordability gating. | Computed colors `#35443d` / `#fff9ea`: 9.77:1 contrast; calculated brightness-filter cases are 9.20:1 at 0.95 and 8.62:1 at 0.90. Both labels fit at 390×844 and 1862×843. Purchases deduct 25/60 gems and add eggs; an unaffordable mystery purchase disables correctly. This checks label text, not every art/icon pixel. |
| F21: docked notes put Finish below the desktop viewport | Anchor the docked focus card at the top of its available slot and bound its scroll area. | Chrome at 1862×843: Finish spans y=545–589; clicking completes overtime and retains notes. With a 72px save warning it spans y=617–661. Count-up is usable at 1000×700; at the 999px sheet breakpoint, keyboard activation scrolls the timer and completes the session. |
| F08: narrow Nest action | Give the action a minimum 44×44px target and padding. | Chrome measured 44.40×44px. Keyboard focus scrolls it entirely into the docked card's visible area. |
| F22: compact recovery hides the note field | Allow the entire compact Scratchpad to scroll and preserve its content's natural height; keep the textarea at least 44px high. | With an active session, Journal, save warning and 569×320 viewport, the former textarea started at y=330, outside the 320px viewport. It now scrolls into y=232–276. Shift+Tab exposes Pause, Back to Focus and Minimize; retry saves the fictional draft. |

The compact layout intentionally prioritizes one usable workspace. Minimize
Scratchpad to resume the other panel, or expand the window. Journal selection,
period and note content survive either route.

## Automated and browser evidence

Environment: Windows, Node.js **22.14.0**, installed dependencies from the
existing lockfile. This pass did not perform a fresh install or change dependency
versions. That verification belongs to the automated-checks pass.

| Check | Result |
| --- | --- |
| Frontend suite | **396 passed, 22 suites**, zero failures. Includes two new compact-Journal regressions. |
| Server suite | **20 passed**, zero failures. Includes QA profile isolation and offline/online persistence checks. |
| Production build | Successful. JS `main.7656d4f5.js`; CSS `main.0c47deab.css`. Existing outdated Browserslist-data warning remains for the dependency-review pass. |
| Chrome UI regressions | The cases above were exercised against the production build with disposable fictional profiles. They supplement the historical flow checks, rather than claiming all branches were rerun manually. |
| Save outage/retry | The QA service was stopped and restarted. Draft text survived; warning, timer and compact workspace routes remained reachable. |

Commands used for reproducible checks:

```sh
node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand
npm run test:server
npm run build
```

Set `CI=true` for unattended frontend runs (`$env:CI='true'` in PowerShell).
Direct Node invocation avoids argument forwarding problems seen with the local
Windows npm wrapper. Raw test reports remain in ignored `.local/`.

Browser dimensions above are **measured CSS viewport dimensions**. The connected
Chrome page was at approximately 110% zoom, with viewport overrides adjusted to
the recorded sizes. These responsive checks do **not** establish genuine 200%
browser zoom, physical touch/keyboard behavior, screen-reader speech, or audible
sound quality. Native desktop control was unavailable and only Chrome was
connected during this pass.

## Repeatable review room

Build first, then start a fictional room in a separate terminal:

```sh
npm run build
npm run qa:release
```

Open **http://127.0.0.1:5111/**. The launcher serves the production build through
the normal local service, with a new temporary save directory outside the repo
and a separate browser origin. It never opens the ordinary personal profile.
It relies on the Babel tooling already supplied by the project's development
dependencies to load the real game reducer.

To choose an initial scenario, run `node scripts/release-qa.cjs alarm` (or
`fresh`, `journal`, `overtime`, `countup`).

| Scenario | Starting point |
| --- | --- |
| `fresh` | New room and spendable starter gems. |
| `journal` (default) | Eight fictional reading sessions and a fictional note. |
| `overtime` | One-minute target already reached, active overtime, two tasks and a tag. |
| `countup` | Active count-up with over one minute elapsed, tasks and a tag. |
| `alarm` | Idle one-minute countdown and one-minute short break; click Start to unlock audio through a user gesture. |

In that terminal, `offline` stops only the QA service; `online` restores it with
the same saves. Edit a fictional note while offline, then go online and use Retry
save. Avoid reloading while offline, which would unload the already-open app.

Close review tabs before `seed <scenario>` resets the disposable room, then open
a new tab. This avoids stale tabs writing old state over a fixture. `quit` or
Ctrl+C stops the QA service. A new invocation creates a new profile; existing
temporary profiles are left available for inspecting failed checks. Use only
fictional content in this workflow.

### Physical Android access

USB port forwarding can connect an Android phone to this loopback-only QA
service. Follow [Chrome's USB remote-debugging and port-forwarding setup](https://developer.chrome.com/docs/devtools/remote-debugging/local-server#case_2_set_up_port_forwarding_through_usb_for_your_android_device).
In `chrome://inspect/#devices`, enable USB discovery and forward device port
**5111** to **localhost:5111** on the desktop. Open **http://localhost:5111/** in
Chrome on the phone. Use the same port on both sides so the production Host and
Origin checks remain valid. Disable forwarding when finished.

This route is prepared for testing; it has **not** been exercised on a physical
phone in this pass. It does not change production network binding. Physical
iOS/Safari access is still unestablished; Android results cannot cover it.

## Remaining acceptance checks

These are still required evidence from the previous review, deferred by the
owner on October 9 while publication Phase 3 proceeds. Use the current build and
the disposable room, record
device/OS/browser or screen-reader versions, and distinguish failures from
unavailable equipment. Do not infer a pass from automated event tests or desktop
viewport emulation.

| Check | Concrete procedure and pass condition | Current status |
| --- | --- | --- |
| Genuine 200% browser zoom | Set the browser menu to 200%. Inspect timer/settings, shop odds, Pets, Journal History, Scratchpad and Arrange. Repeat overtime plus notes. Essential actions, focus and text remain reachable through scrolling. Restore the original zoom. | **Pending** |
| Screen reader | Navigate controls and selected/locked states; start/pause/resume/finish work; check phase/result speech without per-second clock chatter. Check help, hatch and recovery dialogs, Escape and focus return. Repeat compact Journal + notes. | **Pending** |
| Continuous hold and cancellation | Use count-up. Hold Abandon with mouse and separately Space/Enter for five seconds; verify one intentional abandonment without reward. Reset between cases. Verify early release, Escape, focus leaving, window/tab switching and interrupted drag cancel a hold. Include a held pet click and furniture interruption. | **Pending real input**; unit coverage and brief browser activations are historical evidence only. |
| Audible alerts and mixer | Use `alarm`, click Start and listen through completion: repeat reminder stops when muted. Try overtime ding, count-up completion, interaction mute/volume, ambience Play/Pause and mixing. Check duplicate, inaudible or harsh sounds and saved settings. | **Pending physical listening** |
| Physical phone | Use the access route above if available. Buy an egg; use timer/clock/Pause across panels; type a long note with the software keyboard visible; hide/show keyboard and rotate twice. Test touch furniture movement/release/cancellation, notes + Arrange, hold cancellation and hatching. Drafts, accepted placement and inventory survive reload. | **Pending** |
| Additional engines | Repeat core timer, purchase, notes, Arrange, save-retry and keyboard flows in Firefox and Safari/WebKit where available. Record platform and versions. | **Pending** |

Results template:

```text
Application commit / build:
Device, OS, browser and/or screen reader versions:
Checks performed:
Passed:
Failed (steps, expected result, actual result):
Unavailable (reason):
```

Windows/Chrome remains the verified desktop baseline. macOS/Linux setup,
Firefox/Safari, actual mobile behavior and accessibility conformance are not
verified support claims. [PROJECT.md](../PROJECT.md) retains those boundaries.
Later publication phases do not replace the open acceptance checks here.
