# Project Context

A demo sandbox for the "Build a Team With Claude Code" workshop.
Use it to try the three subagents in `.claude/agents/` and the team
spawn prompts in `teams/`.

## Stack
- Frontend: React + TypeScript (Vite)
- Backend: Node.js + Express + TypeScript
- Database: SQLite (for the workshop demo)
- Hosting: local only — http://localhost:3000

## Conventions
- Code style: Prettier + ESLint defaults
- Naming: camelCase for variables/functions, PascalCase for components, kebab-case for filenames
- File layout: components in `src/components/`, API routes in `server/routes/`, tests next to source as `*.test.ts`

## Quality bar
- All new code is typed.
- All new endpoints have at least one happy-path test.
- No console.logs, no `any`, no commented-out code in PRs.

## When delegating to subagents or teams
- Use `planner-researcher` before any feature larger than ~50 lines.
- Use `code-reviewer` after any change before declaring done.
- For features touching API + UI + tests, spawn a `build-squad` team.
- Agent teams are experimental — already enabled in `.claude/settings.json`.
  Requires Claude Code v2.1.32+.

## Things to NEVER do
- Don't use placeholder data — read the seeded fixtures.
- Don't invent file paths — verify with Glob first.
- Don't refactor unrelated code while implementing a feature.
