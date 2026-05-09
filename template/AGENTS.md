# {{project_name}}

{{description}}

## Stack
- Frontend: {{frontend_framework}}
- Backend: {{backend_framework}}
- Database: {{database}}
- Hosting: {{hosting}}

## Conventions
- Code style: Prettier + ESLint defaults
- Naming: camelCase for variables/functions, PascalCase for components, kebab-case for filenames
- File layout: components in `{{src_dir}}/components/`, API routes in `{{server_routes_dir}}/`, tests next to source as `*.test.ts`

## Quality bar (enforced by code-reviewer)
- All new code is typed.
- All new endpoints have at least one happy-path test.
- No console.logs, no `any`, no commented-out code in PRs.

## Subagents available

Pre-installed in `.claude/agents/` and auto-discovered. They auto-trigger on the keywords in their `description`, or call them explicitly.

- `planner-researcher` — read-only planning. Auto-triggers before any feature larger than ~50 lines. Produces a written plan (Goal, Approach, Files to touch, Risks, Out of scope) before code is written.
- `code-reviewer` — security/bug/pattern review. Auto-triggers after changes; required before declaring a feature done. Returns findings tagged 🔴 must-fix / 🟡 should-fix / 🟢 nit.
- `launch-copywriter` — launch copy in the product's voice. Use only at ship time.

## Team presets (in `teams/`)

Spawn a team by pointing Claude at the file:

```
> Read teams/build-squad.md and follow it.
```

- `build-squad.md` — architect + frontend + backend + tester. For features touching API + UI + tests.
- `recon-squad.md` — scout + synthesizer + skeptic. Read-only codebase comprehension; safe to run anywhere.
- `ship-squad.md` — release-captain + changelog + deploy-checker. Pre-deploy QA.

The lead agent fans out to teammates and coordinates via the shared task list at `~/.claude/tasks/{team-name}/` and team config at `~/.claude/teams/{team-name}/config.json`.

## Settings
- Agent teams enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.json`
- Requires Claude Code v2.1.32+

## Things to NEVER do
- Don't use placeholder data — read the seeded fixtures.
- Don't invent file paths — verify with Glob first.
- Don't refactor unrelated code while implementing a feature.

> CLAUDE.md is a symlink to this file — Claude Code and AGENTS.md-aware tools both read the same content.
