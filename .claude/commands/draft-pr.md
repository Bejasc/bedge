---
name: draft-pr
description: Draft a pull request — title, body, and recommended labels — based on the commits and diff between the current branch and the default branch. Use when the user asks to "open a PR", "draft a PR", "make the PR", or runs /draft-pr. Produces a draft for review, then asks for confirmation before submitting.
kind: command
invocation: /draft-pr
version: 3
---

# Draft Pull Request

You are drafting a PR for the current branch. The output is a title, a body, and a label list. After presenting the draft, ask the user for confirmation. If they confirm, run `gh pr create` yourself. If they want changes first, update the draft accordingly and ask again.

## Step 1 — Survey the branch

Run in parallel:

- `git symbolic-ref refs/remotes/origin/HEAD` — resolve the default branch (`main` or `master`). Fall back to checking `git branch -a` if this fails.
- `git branch --show-current` — current branch name.
- `git log --oneline <default>..HEAD` — every commit not yet on the default branch.
- `git diff --stat <default>..HEAD` — files touched and rough size.
- `git diff <default>..HEAD` — full diff for context.
- `git status --short` — check for uncommitted changes.

If there are **zero commits** ahead of the default branch, stop. There is no PR to draft.

If there are **uncommitted changes**, surface them prominently — they will not be in the PR.

If the branch already has an open PR, run `gh pr view --json title,body,labels` and treat this as an *update* rather than a new draft. Show what's changing relative to the existing description and confirm with the user before replacing it.

## Step 2 — Title

A PR title is a single Conventional Commits line:

```
<type>(<scope>): <imperative summary>
```

**Choose the type:**

- If the branch's commits are all the same type, use that type.
- If they're mixed but one dominates (more than half the commits), use the dominant type.
- If genuinely mixed with no dominant type, pick the type that describes the *intent* of the branch — usually `feat` if anything new shipped, otherwise `refactor` or `chore`.

**Choose the scope:**

- If all commits share a scope, use it.
- If the branch name includes a plan number (`plan/NNN-...`), use `plan-NNN` as the scope.
- Otherwise, omit the scope.

Keep the title under 72 characters. Context goes in the body, not the title.

## Step 3 — Body

Use this structure. Drop sections that are empty. Don't pad.

```markdown
## Summary

<2–4 bullets or a short paragraph. What this PR does and *why*. Written for
a reviewer who hasn't followed the work. "We added X" is not enough — "X was
needed because Y" is.>

## Changes

<Optional. Bulleted list of meaningful changes, grouped by area if the PR
touches several. Skip if Summary already covers it.>

## Test plan

- [ ] <How to verify — commands to run, manual steps, observable outcomes>
- [ ] <Another check>

## Notes

<Optional. Anything the reviewer should know that doesn't belong above —
follow-ups deferred, decisions taken, caveats.>

Refs: <issue numbers, plan numbers, related PRs — if any>
```

Drafting rules:

- **Summary explains the *why*.** The diff already shows what changed.
- **Test plan is verifiable.** Each item is a check the reviewer can actually run. Don't fabricate steps — if you can't derive a concrete check from the diff, say so and ask the user.
- **Don't restate the diff.** Body is for context the diff can't carry.
- **Don't pad.** A two-line description is fine if the change is small.

## Step 4 — Labels

Recommend from the project's standard set (see `.github/sync-labels.sh`). Three axes:

**Type** (always exactly one — match to the title's Conventional Commits type):

`type:feat`, `type:fix`, `type:docs`, `type:test`, `type:refactor`, `type:perf`, `type:chore`, `type:ci`, `type:build`

**Status** (zero or one — omit unless genuinely useful):

`status:wip`, `status:blocked`, `status:needs-review`, `status:ready`

**Priority** (zero or one — omit unless priority is material to the reviewer's queue):

`priority:high`, `priority:medium`, `priority:low`

**Breaking changes** — if any commit has `!` or a `BREAKING CHANGE:` footer, add `breaking-change` and call it out in the body's *Notes* section.

## Step 5 — Output and confirmation

Show the draft in this shape:

````
**Title:**
<title>

**Body:**
```
<full body>
```

**Labels:** `type:chore`, `priority:medium`
````

Then ask: **"Should I create this PR?"**

- If the user confirms (yes / looks good / go ahead / etc.) — run `gh pr create` using the heredoc form below, then report the PR URL.
- If the user requests changes — update the draft and ask again.
- If the user says no — stop.

```bash
gh pr create \
  --title "<title>" \
  --body "$(cat <<'EOF'
<body>
EOF
)" \
  --label "type:chore" --label "priority:medium"
```

Use the heredoc form for the body — it handles newlines and special characters safely.

## Rules

- **Wait for explicit confirmation before running `gh pr create`.**
- If `gh` is not authenticated, tell the user to run `gh auth login` first.
- If the branch has no remote tracking branch, note that they'll need `git push -u origin <branch>` before submitting.
