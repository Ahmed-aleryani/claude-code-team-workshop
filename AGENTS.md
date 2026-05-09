# Build a Team With Claude Code — Bootstrap Guide

This repo is the public companion to the 20-minute workshop talk at EBS Tallinn. It contains the slide deck, a working demo app showing agent teams in action, and a reusable template you can copy into a new project. This file is the bootstrap guide — instructions for humans and AI agents on how to scaffold a new agent-team project from the template.

## Repo map

- `index.html` — the slide deck (live at <https://ahmed-aleryani.github.io/claude-code-team-workshop/>).
- `demo/` — full TODO web app (React + Vite + Express + SQLite + JWT) with the workshop's subagents and team presets pre-installed.
- `template/` — drop-in boilerplate: `.claude/`, `teams/`, `AGENTS.md`, no app code.

## Bootstrap a new project

1. Copy the template into your new project directory:
   ```
   cp -r template/. ~/path/to/your-new-project/
   ```
   The `template/.` syntax is deliberate — it copies dotfiles like `.claude/` and `.gitignore`.
2. `cd` into your new project, open `AGENTS.md`, and replace the `{{placeholders}}` with your stack, paths, and project name.
3. Verify your Claude Code version:
   ```
   claude --version
   ```
   You need 2.1.32 or newer for agent teams.
4. Confirm the experimental teams flag is on:
   ```
   grep CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS .claude/settings.json
   ```
   It should print `"1"`.
5. Start a session and test the scaffolding by spawning `recon-squad` first — it's read-only and safe:
   ```
   claude
   > Read teams/recon-squad.md and follow it.
   ```
6. Once recon works, spawn `build-squad` for real work:
   ```
   > Read teams/build-squad.md and follow it.
   ```

## The AGENTS.md / CLAUDE.md symlink

Every directory with agent instructions ships `AGENTS.md` as the canonical file; `CLAUDE.md` is a relative symlink pointing to it. AGENTS.md is the cross-tool standard — multiple agent runners read it. Claude Code reads `CLAUDE.md`, and the symlink means both tools see the same content. Edit either file; you're editing both. If you're using a tool that doesn't follow symlinks, fall back to copying the content into a real `CLAUDE.md`.

## When to spawn a team vs a single agent

A subagent is for "go do this and tell me" — a quick errand with a clear scope. A team is for "figure it out together" — work that needs coordination across roles, where one agent's output is another's input. If a change touches API + UI + tests, spawn a team. If it's a typo or a single-file fix, call a subagent.
