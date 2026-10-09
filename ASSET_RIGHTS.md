# Asset rights and provenance

The root [MIT license](LICENSE) covers Little Room's project code and documentation. It includes project-authored JavaScript, CSS, HTML and code-drawn SVGs. Third-party code keeps its original license and notices. Raster artwork, mockups, screenshots containing that artwork, and legacy audio are outside that code license.

## Illustrated artwork

The nine production PNGs under `public/art/atelier/` are recorded as generated with OpenAI's built-in image generation tool. Their exact prompts and generation date are in [atelier-art-prompts.json](docs/atelier-art-prompts.json); [ARTWORK.md](docs/ARTWORK.md) explains their use. Five older PNGs under `public/art/` are documented generated reference artwork, currently unused by the application. Fifteen design mockups under `output/mockups/cohesive-atelier-v2/` are also recorded as generated assets, not app screenshots.

No separate reuse or redistribution license has been selected for these illustrations. No additional asset permissions are granted by the code license; any applicable rights remain reserved. Do not describe the complete art-containing bundle as entirely MIT licensed. An owner-approved asset license, or an explicitly limited distribution plan, is needed before offering a redistributable bundle containing the artwork. The provenance record describes how the assets were made; it does not certify copyrightability or third-party clearance.

Generated artwork must be disclosed as generated, rather than attributed to a human illustrator. OpenAI's current [Terms of Use](https://openai.com/policies/terms-of-use/#content) describe ownership between the user and OpenAI, subject to applicable law, and exclude third-party output from that assignment. They are not a substitute for checking the terms applicable to the original generation account and date.

## Current audio

The app's active alarm, ambient mixer and interaction sounds are synthesized by project code in `src/audio.js` using Web Audio. They do not load or sample the files in `src/sounds/`. The procedural engine is covered by the project's MIT license.

## Legacy audio: provenance unresolved

| File | Evidence | Publication decision |
| --- | --- | --- |
| `src/sounds/click-menu-app-147357.mp3` | Added at `ef811f3`; no source URL, author or license recorded. | Exclude from the intended public release until rights are evidenced; unused by the current app. |
| `src/sounds/click.mp3` | Added at `ef811f3`; no source URL, author or license recorded. | Same exclusion. |
| `src/sounds/puppet music alarm.wav` | Added at `ef811f3`; no source URL, author or license recorded. | Same exclusion. |
| `src/sounds/tap.mp3` | Added at `ef811f3`; no source URL, author or license recorded. | Same exclusion. |

A descriptive filename does not establish a source or a license. These files already exist in repository history. Removing current files belongs to the repository-cleanup pass; handling historical copies belongs to the Git-history pass. No audio provenance or redistribution permission has been inferred.

## Starter assets and dependencies

The CRA starter logos (`src/logo.svg`, `public/logo192.png`, `public/logo512.png`, and `public/favicon.ico`) were introduced by the initial Create React App commit. They are not Little Room branding and are candidates for removal in the cleanup pass. Software licensing does not itself establish trademark rights to the React logo. The active app uses `public/favicon.svg`.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for CRA attribution and direct dependency declarations, and [ASSET_INVENTORY.json](docs/ASSET_INVENTORY.json) for paths, hashes and intended disposition. Existing QA screenshots and fixtures are not approved publication media. Each future screenshot must use fictional demo content and be reviewed before inclusion.
