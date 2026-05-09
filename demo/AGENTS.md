# Project Context

A demo sandbox for the "Build a Team With Claude Code" workshop.
Use it to try the three subagents in `.claude/agents/` and the team
spawn prompts in `teams/`.

## Stack
- Frontend: React + TypeScript (Vite, port 3000)
- Backend: Node.js + Express + TypeScript (port 3001, proxied via `/api`)
- Database: SQLite via better-sqlite3 (file at `data/app.db`; in-memory for tests)
- Auth: JWT in HttpOnly + SameSite=Lax cookies, bcrypt password hashing
- Validation: zod (shared between client and server via `shared/schemas.ts`)
- Tests: Vitest workspaces — `server` project (node env) + `client` project (jsdom env)
- Hosting: local only — http://localhost:3000

## Repo layout
- `shared/types.ts` — frozen API contract (DO NOT modify outside an architect phase)
- `shared/schemas.ts` — zod validation schemas (server validators + client form validation)
- `server/` — Express app; routes in `server/routes/`, middleware in `server/middleware/`, db in `server/db/`
- `src/` — React app; components in `src/components/`, hooks/contexts in `src/lib/`
- Tests live next to source as `*.test.ts` / `*.test.tsx`

## Conventions
- Code style: Prettier + ESLint defaults
- Naming: camelCase for variables/functions, PascalCase for components, kebab-case for filenames
- All request boundaries validated with zod schemas from `shared/schemas.ts` — don't redefine inline
- All API responses match `shared/types.ts` exactly

## Quality bar (enforced by code-reviewer)
- All new code is typed; no `any`, no `as unknown as`
- All new endpoints have at least one happy-path test
- No console.logs, no commented-out code in PRs
- All API responses match `shared/types.ts` shapes exactly

## MANDATORY team workflow — applies to any feature add

For ANY new feature, refactor, or change touching more than one of {API, UI, tests}, you **MUST** spawn a build team. **Do not implement directly in the main session.** This is non-negotiable.

The orchestrator's job is: contract + tasks + spawn + review. NOT writing implementation files. If you find yourself writing `server/routes/*.ts` or `src/components/*.tsx` directly, stop and turn it into a task for a teammate.

### The six-step protocol

1. **Plan first.** Run `planner-researcher` to produce a written plan (Goal, Approach, Files to touch, Risks, Out of scope) before any code is written. Skip only for changes < ~50 LOC scoped to a single file.
2. **Architect contract.** The orchestrator defines or extends `shared/types.ts` and `shared/schemas.ts`. These are the integration points between teammates. Freeze them before fan-out — once teammates are spawned, the contract does not change without an explicit synchronization event (the orchestrator pauses all teammates, edits, then resumes).
3. **Spawn the team via `TeamCreate`.** Then spawn at minimum three teammates by name:
   - `backend-builder` (subagent_type: `Backend Architect`) — owns `server/`
   - `frontend-builder` (subagent_type: `Frontend Developer`) — owns `src/`
   - `test-engineer` (subagent_type: `general-purpose`) — owns all `*.test.ts(x)`
   Add more teammates only if work splits cleanly along another axis.
4. **Coordinate via the shared task list.** Create granular tasks with `TaskCreate`, set owners with `TaskUpdate`, and encode dependencies with `addBlockedBy`. Teammates pick from the list and update status; the orchestrator does not micromanage.
5. **Code review before declaring done.** Run `code-reviewer` against the diff. Address every 🔴 must-fix and every 🟡 should-fix that has a clear answer.
6. **Verify.** Run `npm run typecheck` and `npm test`. Both must pass before you tell the user the feature is done.

### When the protocol applies
- Always: any feature, refactor, or bug fix that touches multiple folders (server + src + tests, etc.)
- Always: any change that adds an API endpoint, a route, or a database column
- Optional: typo fixes, single-file CSS tweaks, log message edits

If unsure, default to spawning the team. The cost of spawning is low; the cost of incoherent parallel changes is high.

## Subagents (auto-discovered from `.claude/agents/`)
- `planner-researcher` — read-only planning. Use PROACTIVELY before any feature > ~50 LOC
- `code-reviewer` — security/bug/pattern review. Use PROACTIVELY after changes; required before declaring done
- `launch-copywriter` — launch copy in the product's voice. Use only at ship time

## Team prompt presets (`teams/`)
- `build-squad.md` — architect + backend + frontend + tester (4-agent variant)
- `recon-squad.md` — read-only codebase comprehension
- `ship-squad.md` — pre-deploy QA
- `founder-team.md` — TODO-app live demo (this app's reference build)

## Settings
- Agent teams enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.json`
- Requires Claude Code v2.1.32+

## Things to NEVER do
- **Never implement a feature directly when the team protocol applies.** Spawn the team.
- **Never modify `shared/types.ts` or `shared/schemas.ts` while teammates are mid-task.** Pause first.
- Never use placeholder data — read the seeded fixtures.
- Never invent file paths — verify with Glob first.
- Never refactor unrelated code while implementing a feature.
- Never bypass `code-reviewer` before declaring a feature done.
- Never commit changes unless the user explicitly asks.
