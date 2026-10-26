# Media provenance

The main gallery is in the [README](../README.md#screenshots).
[manifest.json](media/manifest.json) records each file's dimensions, size,
SHA-256 and capture date.

## Current screenshots — October 26, 2026

Seven JPEGs were captured directly from Chrome using the current development
app at source revision `3d2d789`. They show a fictional `npm run demo` profile,
with 74 seeded sessions, pets and eggs, and the owner's approved custom room
layout. No personal save folder was used.

Captures use the browser's existing viewport and real controls, with no
restyling or compositing. The Journal shows the 30-day period. Focus and notes
shows a short, real count-up session; it was finished under one minute, with no
additional reward or history entry. The room was returned to an idle countdown
afterward. Shop and Pets show the visible portions of their scrollable panels.

The screenshot set is `room.jpg`, `focus-notes.jpg`, `journal.jpg`,
`pets.jpg`, `egg-shop.jpg`, `arrange-room.jpg` and `sound.jpg`.
These replace the October 9 stills.

## Retained earlier media

`walkthrough.webm`, `feature-tour.gif` and `social-preview.png` retain their
October 9, 2026 bytes and provenance. They show an earlier interface and are
not promoted as current screenshots. The original capture record is preserved
in [the historical manifest](history/media-2026-10-09.json).

The earlier media came from the production app with fictional data, using
the automation in `scripts/showcase-*.cjs`. Those scripts describe the earlier
capture workflow and need updating before reproducing the current interface.
The social card was uploaded to GitHub with owner approval on October 24;
this documentation pass does not change the repository's social-preview setting.

## Rights and review

All seven current screenshots were visually reviewed. The manifest hashes are
checked against the actual files. These images do not establish audio quality,
screen-reader behavior, genuine browser zoom or physical-phone support.

The images contain generated illustrations. Permission to run the app and
share screenshots is recorded in [ASSET_RIGHTS.md](../ASSET_RIGHTS.md#limited-artwork-permission);
other illustration reuse remains reserved.
