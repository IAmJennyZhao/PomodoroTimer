# Git history preparation

Publication Phase 7, October 9, 2026. Starting point: `22adc03`.
This pass prepares local history; publishing the replacement remains Phase 8.

## Decisions and preservation

The owner chose to **retain every original commit**, filtering identities and
excluded historical artifacts. No commits will be squashed or dropped. Author
names, chronological order, messages and original dates remain. Jenny Zhao's
personal author/committer email will use her existing GitHub noreply identity;
GitHub's own committer identity remains attributed to GitHub.

The original 125-commit history is preserved in an ignored local archive:
`.local/archive/publication-phase7-2026-10-09/`. Its `original-history.bundle`
was verified, restored into a separate bare repository and checked with
`git fsck --full --no-reflogs`. The archive's manifest records original tips,
tree, byte count and SHA-256. This backup contains private metadata and excluded
artifacts: keep it local. Phase 3's separate hashed file archive is retained.

The rewrite will remove `output/`, legacy audio, unused raster references and
starter branding from all retained historical trees, following
[the publication inventory](PUBLICATION_AUDIT.md#intended-contents).
Production artwork and its existing rights boundaries remain unchanged.
Historical source may refer to removed legacy media; the filtered old snapshots
are development records, not supported runnable releases.

Commits that only changed excluded artifacts will remain as empty commits.
Cryptographic signatures on rewritten commits cannot remain valid; the original
signed objects stay in the private backup. A commit map will connect the old
identifiers used by dated verification/provenance records with their new history.

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

## Status

Backup and scoped-audit tooling are verified. The rewrite and final ancestry,
tree-equivalence, attribution and excluded-object checks are in progress.
