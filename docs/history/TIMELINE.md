# Development timeline

This index groups the retained history by purpose; it does not squash commits.
All 125 original project commits and the Phase 7 preparation checkpoint remain.
Later Phase 7 verification commits follow this mapped interval.

| Work | Commits | Rewritten range, inclusive | What changed |
| --- | ---: | --- | --- |
| Original CRA prototype | 9 | `b96aa2a`–`b02987b` | Header, timer, session/break settings and early styling. |
| Local-first focus and collection | 10 | `fb9e686`–`3ae19bb` | Disk saves, focus rewards, count-up/overtime, eggs, upgrades, furniture and session context. |
| Atelier visual system | 24 | `a5b61ae`–`b7ce71a` | Production illustrations, paper controls, room editing, Pets, Decorate, Journal, Scratchpad and settings. |
| Responsive surfaces and recovery UI | 7 | `e3e82a0`–`0f1ab45` | Completion receipts, hatch/help notices, load recovery and constrained room layouts. |
| Interaction sound and motion | 21 | `ef8b21b`–`b1ec728` | Independent audio routes, interruptible transitions, undo, purchase/reward feedback and room gestures. |
| Usability passes | 25 | `702473f`–`5858fce` | Shared control sizing, shop/Nest clarity, pet previews, arrangement, focus controls and notes layouts. |
| Save recovery safeguards | 4 | `e68ccef`–`773141a` | Failure causes, reference-only recovery drafts, conflict reloads and persistent notices. |
| Integrated verification | 6 | `3326a35`–`c8f91f1` | Timer, rewards, responsiveness, keyboard/pointer evidence and explicit remaining hands-on gates. |
| Publication Phase 1 | 2 | `21e5a9b`–`dd4c599` | Little Room identity, MIT code licensing, separate artwork rights and publication inventory. |
| Publication Phase 2 | 3 | `8a004b0`–`357608c` | Compact Journal/Scratchpad fixes and an isolated acceptance room; hardware acceptance deferred. |
| Publication Phase 3 | 3 | `a155147`–`5ee4b32` | Current-tree artifact cleanup, feature folders, ordered styles and source navigation. |
| Publication Phase 4 | 4 | `eb9bedc`–`4827bcf` | CI, browser regressions, platform launch checks, clean installs and bounded dependency exceptions. |
| Publication Phase 5 | 3 | `8362756`–`bc490c2` | Current user/contributor guides, historical separation and architecture diagrams. |
| Publication Phase 6 | 4 | `21cb73d`–`9bd490d` | Fictional production captures, reviewed gallery, captioned walkthrough and social card. |
| Publication Phase 7 preparation | 1 | `cfb5b50`–`cfb5b50` | Verified original backup, scoped ancestry audit and the retain-every-commit decision. |

Hashes in this table refer to the rewritten history. Dated verification logs
and the showcase manifest keep their original identifiers. Use the
[commit map](COMMIT_MAP.json) or `npm run history:lookup -- 67e9823` to translate
a seven-character or full original hash. The lookup also accepts rewritten
hashes in the mapped interval.

Historical source can reference removed artwork/audio. Those snapshots are
development context, not supported runnable releases. Commits whose changes
were entirely excluded remain as empty commits, with their original messages
and dates. The [history preparation record](HISTORY_PREPARATION.md) explains
the exclusions, integrity checks, private backups and Phase 8 handoff.

The earlier interaction/UX phase numbers in [verification notes](VERIFICATION.md)
are separate from the eight publication phases in the
[archived publication plan](PUBLICATION_PLAN.md).
Current setup and support claims live in the [documentation index](../README.md).
