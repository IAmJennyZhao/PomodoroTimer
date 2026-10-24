# Asset rights and provenance

The root [MIT license](LICENSE) covers Little Room's project code and documentation. It includes project-authored JavaScript, CSS, HTML and code-drawn SVGs. Third-party code keeps its original license and notices. Raster artwork, mockups, screenshots containing that artwork, and legacy audio are outside that code license.

## Illustrated artwork

The nine production PNGs under `public/art/atelier/` are recorded as generated with OpenAI's built-in image generation tool. Their exact prompts and generation date are in [atelier-art-prompts.json](docs/atelier-art-prompts.json); [ARTWORK.md](docs/ARTWORK.md) explains their use. Publication Phase 3 removed five unused reference PNGs and the raw `output/` tree from the current repository tree, preserving them in an ignored local archive. The fifteen earlier design mockups were generated assets, not app screenshots. Their historical provenance is retained in the asset inventory and artwork notes.

The owner selected the limited permission below on **October 24, 2026**.
The illustrations remain outside the code's MIT license. The provenance record
describes how the assets were made; it does not certify copyrightability or
third-party clearance.

### Limited artwork permission

To the extent Jenny Zhao can grant the applicable rights, you may:

- Download and keep the supplied illustrations as part of installing and running
  Little Room, including a local copy with changes to its MIT-licensed code.
- Create and share screenshots showing Little Room in use.

Keep this notice with copies of the supplied artwork. Other artwork reuse,
including extracting or adapting the illustrations for other projects, selling
them as assets, or distributing an independent artwork bundle, requires separate
permission. No general right to modify or redistribute the illustrations is
granted. All other applicable artwork rights remain reserved.

These terms do not restrict the MIT-licensed code or documentation, applicable
legal exceptions, or the rights to view and fork the public repository provided
by [GitHub's terms](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#5-license-grant-to-other-users).
Repository forks retain this notice; a fork does not give the artwork an MIT
license. See [GitHub's licensing guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).
The complete art-containing app is therefore not entirely MIT licensed.

Generated artwork must be disclosed as generated, rather than attributed to a human illustrator. OpenAI's current [Terms of Use](https://openai.com/policies/terms-of-use/#content) describe ownership between the user and OpenAI, subject to applicable law, and exclude third-party output from that assignment. They are not a substitute for checking the terms applicable to the original generation account and date.

## Current audio

The app's active alarm, ambient mixer and interaction sounds are synthesized by project code in `src/audio/engine.js` using Web Audio. They do not load or sample the former files in `src/sounds/`. The procedural engine is covered by the project's MIT license.

## Removed legacy audio: provenance unresolved

These historical paths are retained for provenance. All four files were unused
and removed from the current tree in publication Phase 3; none is part of the
current app bundle.

| File | Evidence | Publication decision |
| --- | --- | --- |
| `src/sounds/click-menu-app-147357.mp3` | Added at `ef811f3`; no source URL, author or license recorded. | Exclude from the intended public release until rights are evidenced; unused by the current app. |
| `src/sounds/click.mp3` | Added at `ef811f3`; no source URL, author or license recorded. | Same exclusion. |
| `src/sounds/puppet music alarm.wav` | Added at `ef811f3`; no source URL, author or license recorded. | Same exclusion. |
| `src/sounds/tap.mp3` | Added at `ef811f3`; no source URL, author or license recorded. | Same exclusion. |

A descriptive filename does not establish a source or a license. These files
are absent from the cleaned publication ancestry; original copies remain only
in the private local history backup and ignored archive. No audio provenance
or redistribution permission has been inferred.

## Starter assets and dependencies

The CRA starter logos (`src/logo.svg`, `public/logo192.png`, `public/logo512.png`, and `public/favicon.ico`) were introduced by the initial Create React App commit and removed from the current tree in publication Phase 3 after reference checks. Software licensing does not itself establish trademark rights to the React logo. The active app uses `public/favicon.svg`.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for CRA attribution and direct dependency declarations, and [ASSET_INVENTORY.json](docs/ASSET_INVENTORY.json) for paths, hashes and intended disposition. Existing QA screenshots and fixtures are not approved publication media. Each future screenshot must use fictional demo content and be reviewed before inclusion.

Publication Phase 6's reviewed gallery, walkthrough, animated screenshot preview
and social card are in `docs/media/`. They use fictional content and actual
production UI; [MEDIA.md](docs/MEDIA.md) records capture conditions and
[the media manifest](docs/media/manifest.json) records hashes and provenance.
These files contain the generated illustrations and remain outside the code
license. Screenshots may be shared under the limited permission above. The social card
is an HTML/CSS composition around
an actual screenshot; no new generated illustrations were introduced in this pass.
