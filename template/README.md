# Claude Code Agent Team Template

Drop-in scaffold for any project that wants the workshop's agent-team setup.

## What's inside

```
template/
├── .claude/             # subagents, settings, permissions allowlist
├── teams/               # build-squad, recon-squad, ship-squad spawn prompts
├── AGENTS.md            # canonical project memory (with placeholders)
├── CLAUDE.md            # symlink → AGENTS.md
├── .env.example
└── .gitignore
```

## Quick start

```
cp -r template/. ~/your-project/
cd ~/your-project
claude
```

Then open `AGENTS.md` and fill in the `{{placeholders}}` for stack, paths, and project name.

## What to customize

- `AGENTS.md` placeholders — project name, stack, src/server paths.
- Team prompts in `teams/` — adjust teammate roles and task lists to fit your stack.
- Agent definitions in `.claude/agents/` — swap reviewers or add domain-specific subagents.

## Requirements

- Claude Code **v2.1.32 or newer** (`claude --version`).
- Agent teams are experimental — already enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.json`. Nothing to flip.

See [`../AGENTS.md`](../AGENTS.md) for the full bootstrap guide.
