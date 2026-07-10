# AI Keşif Platformu — Agent Operating Rules

This repository uses a controlled three-agent workflow with an optional fourth verifier.

## Roles

- **Antigravity / planner:** maps the repository, decomposes work, and writes the task contract. Read-only outside `.agents/tasks/`.
- **Codex / implementer:** the only agent allowed to change product code for a task. Works in an isolated `agent/codex/<task-id>` branch/worktree.
- **Grok / reviewer:** reviews the contract, diff, tests, and failure scenarios. It does not push code to the implementer's branch.
- **Verifier / optional:** independently validates high-risk work involving auth, payments, migrations, secrets, deployment, or destructive operations.

## Required workflow

1. Create `.agents/tasks/<task-id>.yaml` before implementation. Files use JSON syntax so Node can validate them without extra dependencies.
2. Pin `base_sha`, `allow_paths`, `deny_paths`, acceptance commands, risk, and role assignments.
3. Use the branch format `agent/<agent>/<task-id>`.
4. Only the implementer writes product code. Reviewers produce comments and evidence, never competing edits.
5. Run `node scripts/agent-governance.mjs --contracts --base <base-sha>` before requesting review.
6. Rebase and regenerate evidence when `base_sha` changes. Approval of an old head SHA is invalid.
7. Never commit secrets, `.env*`, provider tokens, or raw prompts containing private data.

## Project constraints

- Preserve Next.js App Router and Server Component defaults.
- Add `use client` only when browser APIs, state, effects, or event handlers require it.
- Keep Supabase access server-side where possible and respect RLS.
- Use `src/utils/api-response.js` for standard action responses and `src/utils/logger.js` instead of debug `console.log` calls.
- Required checks normally include `npm run lint`, `npm test -- --passWithNoTests --ci`, and `npm run build`.

## Approval policy

- Low risk: governance + CI may pass automatically.
- Medium risk: one human CODEOWNER review is required.
- High risk: independent verifier evidence and two human approvals are required before merge.

