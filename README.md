# Project Scaffold

**Status:** Active
**Applies to:** New projects bootstrapping a Claude-Code-driven workflow
**Last updated:** 2026-04-26

---

## What this is

A drop-in starting point for new projects. Copy this directory's contents into a fresh repo and you have:

- The plan-driven workflow (`/plan`, `/work`, `/status`) wired up.
- Conventional Commits and PR drafting skills available to Claude.
- A standard GitHub label set with a sync script.
- Baseline VS Code and Claude permission settings.
- A `CLAUDE.md` template with a clearly-marked project-specific section.

---

## Layout

```
.claude/
├── README.md                          # the plan/work/status workflow standard
├── commands/                          # slash commands
│   ├── plan.md
│   ├── work.md
│   └── status.md
├── skills/
│   └── bejasc/                        # personal cross-project skills
│       ├── conventional-commits/      # commit message format
│       ├── draft-pr/                  # PR title, body, label suggestions
│       ├── doc-formatting/
│       ├── doc-coauthoring/
│       └── plan-doc/
└── settings.json                      # baseline permissions

.github/
└── sync-labels.sh                     # one-shot script to apply standard labels

.vscode/
└── settings.json                      # baseline editor settings

CLAUDE.md                              # workspace instructions template
```

---

## Scaffolding a new project

From the new project's repo root:

```bash
# Adjust the source path to wherever this scaffold lives.
SCAFFOLD=~/git/infra/standards/scaffold

cp -R "$SCAFFOLD/.claude"  ./
cp -R "$SCAFFOLD/.github"  ./
cp -R "$SCAFFOLD/.vscode"  ./
cp    "$SCAFFOLD/CLAUDE.md" ./

mkdir -p docs/plans
```

Then:

1. Open `CLAUDE.md` and fill in the **Project-Specific Configuration** section. Leave the **Standards** section alone.
2. Push to GitHub, then run `./.github/sync-labels.sh` to apply the standard label set. Add `--purge` to remove the GitHub default labels (`bug`, `enhancement`, etc.) at the same time.
3. Make `TODO.md` from the template in the workflow doc (`.claude/README.md`) — four sections: Active Plan, Upcoming Plans, Captured Ideas, Completed Plans.
4. Run `/plan new` to author your first plan.

---

## Symlinking instead of copying

If a project lives alongside the scaffold and you want changes to propagate (rather than diverge), symlink the parts that should stay in sync:

```bash
# In the project repo:
ln -s ../standards/scaffold/.claude/commands .claude/commands
ln -s ../standards/scaffold/.claude/skills   .claude/skills
```

Symlink only the parts that are workspace-standard. `CLAUDE.md`, `.claude/settings.json`, and the `.github/` and `.vscode/` directories often have project-specific deltas, so copy those.

The infra repo itself uses this pattern — `.claude/commands` and `.claude/skills` are symlinks back to this scaffold.

---

## What lives where

| Concern              | Location                                 | Why                                                      |
| -------------------- | ---------------------------------------- | -------------------------------------------------------- |
| Plan/work/status     | `.claude/commands/`                      | Slash commands the harness loads.                        |
| Workflow standard    | `.claude/README.md`                      | The plan lifecycle, file layout, frontmatter spec.       |
| Personal skills      | `.claude/skills/bejasc/`                 | Cross-project skills — commits, PRs, doc authoring.      |
| GitHub labels        | `.github/sync-labels.sh`                 | Idempotent sync of the standard label set.               |
| VS Code defaults     | `.vscode/settings.json`                  | Editor-level defaults that don't depend on the project.  |
| Project instructions | `CLAUDE.md`                              | Workspace baseline + project-specific overrides up top.  |

---

## Updating the scaffold

When something improves — a better commit pattern, a label tweak, a workflow refinement — change it here. Projects symlinked into this scaffold pick up the change immediately. Projects that copied get the change next time they re-scaffold.

For non-trivial structural changes, consider a brief migration note in this README so older projects can catch up without re-deriving the change.
