# Multi-Agent Development Workflow

AI Keşif Platformu uses three core agents and an optional fourth verifier.

## Normal path

`Antigravity (plan) -> Codex (implement) -> Grok (review) -> human/merge queue`

For auth, payments, migrations, deployment workflows, destructive operations, or logical conflicts, add an independent verifier before human approval.

## Start a task

1. Copy an existing contract in `.agents/tasks/` to the new task ID and replace every field.
2. Pin the current full `main` commit as `base_sha`.
3. Keep `allow_paths` narrow. `deny_paths` always wins.
4. Create `agent/codex/<task-id>` from the pinned base.
5. Let Codex implement; Grok and Verifier remain read-only reviewers.

Example:

```bash
git fetch origin main
git worktree add ../worktrees/DISC-142 -b agent/codex/DISC-142 origin/main
cd ../worktrees/DISC-142
node scripts/agent-governance.mjs --contracts --base <base-sha>
```

## Evidence and approval

The governance workflow validates every contract. On an `agent/<agent>/<task-id>` branch it also checks every changed path against that task's allow/deny rules and uploads `agent-evidence.json`.

- **Low:** green governance and CI checks.
- **Medium:** green checks plus one domain-owner approval.
- **High:** verifier evidence, security/staging checks, and two human approvals.

Any rebase or new commit invalidates approval tied to the previous head SHA. Re-run checks and review the new evidence before merge.
