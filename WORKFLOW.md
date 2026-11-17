# Dev Workflow Guide

Three commands for the day-to-day dev flow, provided by
[@fiveldevs/5ldev-pushflow](https://www.npmjs.com/package/@fiveldevs/5ldev-pushflow).

This repo is configured with:
- Base branch: `staging`
- Version files: `server/package.json`, `client/package.json`

## npm run start:work

Run this before you start developing (each session/day).

- Stashes any leftover uncommitted changes (safety net in case the pull
  would conflict).
- Checks out `staging`, pulls the latest.
- Restores the stash.

You develop directly on `staging` after this — no branch is
created here.

## npm run finish:work

Run this once you're done with a chunk of work.

- Must be run while on `staging`, with uncommitted changes present.
- Asks for a branch name (e.g. `fix-modal`) and creates it — your
  uncommitted changes move with it automatically.
- Commits on the new branch (asks for a commit message).
- Pushes the branch to origin.
- Asks how it should get into `staging`:
  1. Open a PR via `gh pr create`
  2. Merge directly into `staging` locally, then push
  3. Skip — leave it pushed for later
- The branch is never deleted, regardless of choice.

## npm run version:release

Run this when `staging` has everything you want to ship.

- Bumps the version (you choose patch/minor/major) across every
  configured package.json.
- Commits and pushes that bump on `staging`.
- Creates `Version-<new-version>` off it, pushes it.
- Tags it `v<new-version>`, pushes the tag.
- Creates a GitHub Release for that tag via `gh release create`
  (prompts for release notes). Skips gracefully with a manual link if
  `gh` isn't installed/authenticated.

## Full loop

```
npm run start:work
   ...develop directly on staging...
npm run finish:work
   ...repeat as needed...
npm run version:release
```

## Safety / rollback

- Every git action is additive (commit, branch, tag, push) — never
  `--force`, `--hard`, or `-D` on anything not already safely undoable.
- If `finish:work` or `version:release` fails partway, or you press
  Ctrl+C, they automatically roll back to a clean starting point.
- Anything already pushed (shared with GitHub) is undone with
  `git revert`, never rewritten history.
- A pushed branch is never auto-deleted.
- A merge conflict during `finish:work` triggers an automatic
  `git merge --abort` — your branch stays intact and pushed.

## Requirements

- Git remote `origin` pointing at GitHub.
- [GitHub CLI](https://cli.github.com/) (`gh`), installed and
  authenticated (`gh auth login`) — needed for the PR and Release steps
  only.
