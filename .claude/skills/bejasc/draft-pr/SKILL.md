---
name: draft-pr
description: Draft a pull request — title, body, and recommended labels — based on the commits between the current branch and the default branch. Use when the user asks to "open a PR", "draft a PR", "make the PR", "what should the PR look like", or runs gh pr create. Does not submit the PR; produces a draft for review.
---

# Draft Pull Request

You are drafting a PR for the current branch. The output is a title, a body, and a recommended label list. The user reviews, edits, and submits via `gh pr create` — you do not submit.

## Step 1 — Survey the branch

Run, in parallel:

- `git branch --show-current` — current branch name.
- `git log --oneline <default>..HEAD` — every commit not yet on the default branch.
- `git diff --stat <default>..HEAD` — files touched and rough size.
- `git diff <default>..HEAD` — full diff, capped at a reasonable size for review.

The default branch is `main` or `master` — check `git symbolic-ref refs/remotes/origin/HEAD` if you're unsure.

If the branch already has an open PR, fetch its state with `gh pr view --json title,body,labels` and treat this as an *update* rather than a draft. Confirm with the user before overwriting.

## Step 2 — Title

A PR title is a single Conventional Commits line. The same format as a commit message description:

```
<type>(<scope>): <imperative summary>
```

Choose the type:

- If the branch's commits are all the same type, use that type.
- If they're mixed but one dominates (more than half the commits), use the dominant type.
- If genuinely mixed and there's no dominant type, pick the type that describes the *intent* of the branch — usually `feat:` if anything new shipped, otherwise `refactor:` or `chore:`.

Choose the scope:

- If the branch's commits all share a scope, use it.
- If the branch's name includes a plan number (`plan/NNN-...`), use `plan-NNN` as the scope.
- Otherwise, omit the scope.

Keep the title under 72 characters. The description goes in the body, not the title.

## Step 3 — Body

Use this structure. Drop sections that are empty. Don't pad.

```markdown
## Summary

<2–4 bullets or a short paragraph. What this PR does and why. Read by a
reviewer who hasn't followed the work.>

## Changes

<Optional. A bulleted list of the meaningful changes, grouped by area
if the PR touches several. Skip if Summary covers it.>

## Test plan

- [ ] <How to verify — commands to run, manual steps, edge cases>
- [ ] <Another check>

## Notes

<Optional. Anything the reviewer should know that doesn't belong in
the other sections — e.g. follow-ups deferred, decisions taken,
caveats.>

Refs: <issue numbers, plan numbers, related PRs — if any>
```

Drafting rules:

- **Summary explains the *why*.** "We added X" is not enough; "X was needed because Y" is. The diff already shows what changed.
- **Test plan is verifiable.** Each item is a check the reviewer can run, not a vague "it works." Prefer concrete commands and observable outcomes.
- **Don't restate the diff.** If the reviewer wants to know which files changed, they'll look. Body is for context the diff can't carry.
- **Don't pad.** A two-line PR description is fine if the change is small.

## Step 4 — Labels

Recommend labels from the project's standard set (defined in `.github/sync-labels.sh` or equivalent). Three axes:

**Type** (always exactly one):

- `type:feat`, `type:fix`, `type:docs`, `type:test`, `type:refactor`, `type:perf`, `type:chore`, `type:ci`, `type:build`

Match the type to the title's Conventional Commits type. If the title is `feat(client):`, the label is `type:feat`.

**Status** (zero or one — the reviewer or CI usually owns this):

- `status:wip` — explicitly marked work-in-progress (mark the PR as a draft instead, when possible)
- `status:blocked` — waiting on something the PR description names
- `status:needs-review` — ready for review (the default; rarely worth applying explicitly)
- `status:ready` — review passed, ready to merge

Don't apply a status label unless one is genuinely useful — for most PRs the default flow handles it.

**Priority** (zero or one):

- `priority:high`, `priority:medium`, `priority:low`

Apply only if priority is clearly material to the reviewer's queue. Most PRs don't need one.

**Breaking changes** — if any commit on the branch has `!` or a `BREAKING CHANGE:` footer, also recommend a `breaking-change` label (or whatever the project's equivalent is). Surface this prominently in the body's *Notes* section.

## Step 5 — Output

Show the user the draft in this exact shape so they can copy and run it:

````
**Title:**
<title>

**Body:**
```
<full body>
```

**Labels:** `type:feat`, `priority:medium`

**Command:**
```bash
gh pr create \
  --title "<title>" \
  --body "<body>" \
  --label "type:feat" --label "priority:medium"
```
````

If the body has shell-unsafe characters, suggest using a heredoc instead:

```bash
gh pr create --title "<title>" --label "type:feat" --body "$(cat <<'EOF'
<body>
EOF
)"
```

## Rules

- Don't run `gh pr create` yourself. The user reviews and submits.
- Don't fabricate test steps. If you can't write a verifiable test plan from the diff, say so and ask the user how they verified.
- If the branch has uncommitted changes, surface them — they won't be in the PR.
- If there are zero commits between the branch and the default, stop. There's no PR to draft.
- If you're updating an existing PR rather than drafting a new one, show what's changing relative to the current PR description, not just the new content.
