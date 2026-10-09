# Earlier interaction implementation notes

Preserved from the README at checkpoint `67e9823`, October 9, 2026. The phase
numbers below refer to earlier animation passes, not the publication plan.
This is historical implementation context; use the [user guide](../USER_GUIDE.md),
[source map](../SOURCE_MAP.md) and [current validation](../AUTOMATION.md)
for present-day instructions and evidence.

## Interaction and motion settings

**Interaction sounds** and **Interaction volume** are saved independently of **Timer sound** and ambient levels. Find them in Settings or Sound; **Preview sound** plays a quiet tap at the selected level. New rooms start at 35%. Existing saves that had timer sounds off keep their taps muted during migration. Start/pause/resume taps now follow the interaction setting; completion chimes and repeat alarms still follow Timer sound.

**Reduce animation** and your operating system's reduced-motion preference both disable motion, including help popovers. The app cannot override a system request to reduce motion.

The animation passes use shared rules for everyday interaction:

- `src/styles/motion.css` defines 100ms presses, 180ms releases, 200ms transitions, and 480ms rewards, with common easing, 2% compression, 1px press travel, 2px reward lift, 8px entrance travel, and rest/pressed shadows. Existing control transitions and panel/toast/hatch entrances use these tokens. Slow pet idle cycles and the clock's linear progress indicator keep their own cadence.
- `Button` and `ChoiceInput` in `src/shared/Controls.js` apply consistent feedback to ordinary buttons, tabs, collection choices and native checkboxes/radios. Button content compresses 2% and moves down 1px while its frame and hitbox stay fixed. Pointer, touch, Enter/Space and assistive activation retain native behavior; cancellation, blur and disabled updates clear the press. Selection colors and persistent navigation underlines transition smoothly. Hover is silent, and disabled/inert controls cannot trigger feedback. Drag handles keep their positioning behavior.
- `ControlFeedbackContext` supplies a quiet tap or selection tick after activation without delaying the action. A button can use `sound={null}` when its handler already owns playback, as the sound preview does. Interaction effects never replace timer alerts. The optional `motion-pressable` / `motion-visual` and `motion-reward` primitives remain available for later effects.
- `Presence` in `src/shared/Transitions.js` keeps one outgoing panel/notepad/toast for a 200ms exit while disabling its interaction and removing it from the accessibility tree immediately. New requests take effect immediately; reopening preserves the same surface and invalidates its old exit deadline. Opening, closing and reversal use native animations that preserve panel positioning. Focus restoration happens when closing starts, and portaled help closes with its owner. The notepad remains independent across navigation and focus changes.
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
