#!/usr/bin/env bash
# Sync the standard label set to a GitHub repository.
#
# Usage:
#   ./sync-labels.sh                # create/update standard labels (idempotent)
#   ./sync-labels.sh --purge        # also delete labels not in the standard set
#   ./sync-labels.sh --dry-run      # show what would happen, change nothing
#   ./sync-labels.sh --repo OWNER/NAME   # target a specific repo (default: current)
#
# Requires: gh CLI authenticated for the target repo.
# No external dependencies beyond bash and gh.

set -euo pipefail

DRY_RUN=0
PURGE=0
REPO=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --purge)   PURGE=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --repo)    REPO="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,11p' "$0" | sed 's/^# //; s/^#//'
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

GH_ARGS=()
[[ -n "$REPO" ]] && GH_ARGS+=(--repo "$REPO")

# Standard label set.
# Format: name|color (no #)|description
LABELS=(
  # Type — exactly one per PR. Mirrors Conventional Commits types.
  "type:feat|a2eeef|New feature visible to users or API consumers"
  "type:fix|d73a4a|Bug fix"
  "type:docs|0075ca|Documentation only"
  "type:style|c5def5|Formatting, whitespace; no behaviour change"
  "type:refactor|cf7ab9|Code change that neither fixes a bug nor adds a feature"
  "type:perf|fbca04|Performance improvement"
  "type:test|d4c5f9|Adding or correcting tests"
  "type:build|8b6f47|Build system, bundler, dependency bumps"
  "type:ci|a8a8a8|CI configuration"
  "type:chore|e7e7e7|Routine task that doesn't fit other types"

  # Status — zero or one. Most PRs don't need one.
  "status:wip|fbca04|Work in progress; not ready for review"
  "status:blocked|b60205|Blocked on something the description names"
  "status:needs-review|0075ca|Ready for review"
  "status:ready|0e8a16|Approved and ready to merge"

  # Priority — zero or one. Apply when materially relevant.
  "priority:high|b60205|High priority"
  "priority:medium|d93f0b|Medium priority"
  "priority:low|bfdadc|Low priority"

  # Special.
  "breaking-change|d93f0b|Introduces a breaking change to a published API or contract"
  "good-first-issue|7057ff|Approachable issue for new contributors"
  "help-wanted|008672|Extra attention or external contribution welcome"
)

# Build a lookup of standard names for the purge step.
declare standard_names=""
for entry in "${LABELS[@]}"; do
  name="${entry%%|*}"
  standard_names+=" $name "
done

run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "DRY-RUN: $*"
  else
    "$@"
  fi
}

echo "Syncing standard labels…"
for entry in "${LABELS[@]}"; do
  IFS='|' read -r name color desc <<< "$entry"
  echo "  • $name"
  run gh label create "$name" \
    --color "$color" \
    --description "$desc" \
    --force \
    "${GH_ARGS[@]}" >/dev/null
done

if [[ $PURGE -eq 1 ]]; then
  echo
  echo "Purging non-standard labels…"
  existing=$(gh label list --limit 200 --json name -q '.[].name' "${GH_ARGS[@]}")
  while IFS= read -r name; do
    [[ -z "$name" ]] && continue
    if [[ "$standard_names" != *" $name "* ]]; then
      echo "  ✗ $name"
      run gh label delete "$name" --yes "${GH_ARGS[@]}" >/dev/null
    fi
  done <<< "$existing"
fi

echo
echo "Done."
[[ $DRY_RUN -eq 1 ]] && echo "(dry-run — no changes were made)"
