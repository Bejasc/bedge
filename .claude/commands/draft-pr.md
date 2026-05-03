---
name: draft-pr
description: Draft a pull request from the current branch's commits. Selects the correct type:* label from the Conventional Commits type precedence order and prompts the user to confirm before opening.
kind: command
invocation: /draft-pr
version: 1
---

# Draft PR

You are drafting a pull request for the current branch. Follow these steps exactly.

## Step 1 — Determine base branch

Run `git rev-parse --verify main 2>$null` (PowerShell) or check `git branch -a`. The base branch is `main` if it exists, otherwise `master`.

## Step 2 — Collect commits

Run:

```
git log <base>..HEAD --oneline
```

If there are no commits ahead of the base, stop and tell the user there is nothing to open a PR for.

## Step 3 — Parse commit types

For each commit subject line:

- Extract the Conventional Commits type prefix (the word before `(` or `:`).
- Note if the subject contains `!` before the colon, or if `BREAKING CHANGE:` appears in any commit body/footer.

**Type precedence** (highest wins when multiple types appear):

`feat` > `fix` > `perf` > `refactor` > `test` > `build` > `ci` > `chore` > `docs` > `style`

Pick the single highest-priority type present. Map it to a `type:<type>` label (e.g. `type:feat`, `type:fix`).

If any breaking change marker was found, note that `breaking-change` must be stacked on top as a second label.

## Step 4 — Synthesise title and body

**Title:**
- If there is exactly one commit, use its subject line verbatim.
- If there are multiple commits, write a short summary (under 70 characters) that captures the dominant intent of the branch. Do not start with a capital letter for the subject; follow Conventional Commits style.

**Body — use this template:**

```
## Summary
<bullet points derived from commit subjects — one per logical change, not one per commit>

## Test plan
<markdown checklist — what a reviewer should verify, derived from what actually changed>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Step 5 — Show draft and ask for confirmation

Present the full draft to the user:

- **Title:** `<title>`
- **Labels:** `type:<type>` (and `breaking-change` if applicable)
- **Body:** (render the full body)

Ask the user: *"Does this look right? Confirm to open, or tell me what to change."*

Do **not** run `gh pr create` until the user confirms.

## Step 6 — Open the PR

On confirmation, run:

```
gh pr create --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)" --label "type:<type>"
```

If breaking change applies, add `--label "breaking-change"` to the same command.

Return the PR URL when done.

## Notes

- `status:*` and `priority:*` labels are left to the user — do not auto-apply them.
- If `gh` is not authenticated, tell the user to run `gh auth login` and retry.
- If the branch has no remote tracking branch, push it first: `git push -u origin <branch>`.
