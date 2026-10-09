# Git history preparation

Publication Phase 7, October 9, 2026. Starting point: `22adc03`.
This pass prepares local history; publishing the replacement remains Phase 8.

## Decisions and preservation

The owner chose to **retain every original commit**, filtering identities and
excluded historical artifacts. No commits were squashed or dropped. Author
names, chronological order, messages and original dates remain. Jenny Zhao's
personal author/committer email now uses her existing GitHub noreply identity;
GitHub's own committer identity remains attributed to GitHub.

The original 125-commit history is preserved in an ignored local archive:
`.local/archive/publication-phase7-2026-10-09/`. Its `original-history.bundle`
was verified, restored into a separate bare repository and checked with
`git fsck --full --no-reflogs`. The archive's manifest records original tips,
tree, byte count and SHA-256. This backup contains private metadata and excluded
artifacts: keep it local. Phase 3's separate hashed file archive is retained.

A second `prepared-history.bundle` preserves the 126th commit, the verified
audit/preservation checkpoint, before rewriting. Both bundles have separate
manifests and passed restoration and integrity checks. No backup branch or tag
was added to the publication repository. Original objects also remain in local
reflogs; no destructive garbage collection was run.

The rewrite removed `output/`, legacy audio, unused raster references and
starter branding from all retained historical trees, following
[the publication inventory](PUBLICATION_AUDIT.md#intended-contents).
Production artwork and its existing rights boundaries remain unchanged.
Historical source may refer to removed legacy media; the filtered old snapshots
are development records, not supported runnable releases.

Twelve commits with no remaining tree changes are retained as empty commits.
One original cryptographic signature was removed from its rewritten commit;
the original signed object remains in the private backup. All rewritten object
IDs differ. The [commit map](history/COMMIT_MAP.json) connects old identifiers
used by dated verification/provenance records with their new history.

The [development timeline](history/TIMELINE.md) groups the full retained history
by purpose. It preserves the original messages rather than renaming earlier
UX phases to match the later publication phases.

```sh
npm run history:lookup -- 67e9823
npm run history:verify
```

The lookup accepts original or rewritten prefixes of 7–40 hexadecimal characters
within the mapped interval. Later Phase 7 commits are ordinary new checkpoints.
The verifier checks the entire selected ancestry and mapped message hashes,
names/dates/timezones, parent topology, exclusions and curated media hashes.

## Review scope

`npm run audit:publication` continues to inspect all local refs. To inspect the
ancestry intended for publication while old remote-tracking refs remain:

```sh
npm run audit:publication -- --ref HEAD
```

The report identifies its selected tip and scope. Tracked worktree files are
still reviewed separately. A disposable Git fixture verifies that the selected
ancestry excludes findings on another branch, while the default audit finds
them; invalid refs fail and matched credentials/identities remain redacted.

The hosted `main` tip was checked read-only at
`f4c49dd6871b227cbd69ba17b89af3d0ceb09d20`; no hosted tags were listed.
Local preparation does not remove already published objects, remote caches,
forks or other clones. Phase 8 must recheck the remote tip and release gates
before replacing public history. No remote mutation occurs in this pass.

Local `main` now has rewritten ancestry and intentionally diverges from the old
remote-tracking branch. Do not merge the old history back into it. Default
all-ref audits still include that original remote-tracking ancestry; a fresh
clone of the candidate and a `--ref HEAD` audit inspect the cleaned lineage.

Phase 8 should recheck the hosted branch tip against the value above, confirm
the private backups and outstanding release gates, then publish only the
verified branch with an explicit lease on that remote tip. Do not use a mirror
push or publish archive refs. Replacing the branch does not guarantee that old
objects disappear from GitHub caches, forks or other clones. Recheck hosted
refs, clean-checkout validation and CI after publication; archive/cache removal
is a separate hosted concern.

## Verification and status

- All **125 original project commits**, plus the preparation checkpoint, are
  retained in order. Per-commit comparisons confirmed identical message bytes,
  author/committer names, timestamps, timezones and mapped parent topology.
- **210 personal identity fields** across 105 commits were replaced with Jenny's
  existing GitHub noreply address. GitHub's committer attribution remains.
  The local repository now uses the noreply identity for future checkpoints.
- **176 excluded paths** and **201 distinct artifact blobs** are absent from
  every retained tree and unreachable from the cleaned ancestry. Historical
  tree comparisons contain only policy-approved deletions, with no edits to
  retained file bytes.
- The rewritten preparation tip is `cfb5b50`. Its complete tracked tree is
  identical to original `9c86122`: `c3ceed5513a9003ba71847eb180e23a5c1399443`.
  The filtered history bundle is 31,510,571 bytes, compared with 103,738,725 bytes
  for the original preparation bundle. All ten showcase hashes still match.
- A fresh candidate clone passed `git fsck` and the all-ref publication scan,
  with zero personal commit identities, credential candidates or user-path
  candidates. Reviewed email-like results are the retained upstream `glob`
  metadata, GitHub's public noreply fixture identity, and random bytes in the
  already reviewed walkthrough's compressed video frame.
- The WebM byte match was located entirely inside an encoded VP9 frame by
  inspecting EBML Segment/Cluster/Block boundaries using the
  [Matroska element specification](https://www.matroska.org/technical/elements.html)
  and [block layout](https://www.matroska.org/technical/notes.html). All 588 frame
  payloads were inspected; no email-like byte match was outside encoded frames.
  This targeted check is not OCR or a complete metadata/secret certificate.
- **23 server/launcher/audit tests passed**, including the new branch-scope and
  redaction fixture. App source, production artwork and dependency versions
  were unchanged by this pass; frontend tests/build were not repeated.
- The public history verifier passed in a disposable candidate clone and
  rejected a modified message hash, a missing mapping, a reachable excluded
  blob and a new commit with personal identity metadata. Invalid/unknown lookup
  hashes and invalid ref options also failed. Both original and rewritten hash
  lookups returned the same retained commit.

Local history filtering and preservation are complete. Final public-tree checks
are recorded at stable checkpoints. Hosted history replacement, clean-install
release validation, CI results and remaining rights/hands-on gates stay in
Phase 8. Private raw verification reports remain in ignored `.local/phase7/`.
