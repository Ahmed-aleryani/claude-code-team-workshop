# Workshop demo sandbox

A ready-to-run folder for the "Build a Team With Claude Code" workshop.
The three subagents from the slides are pre-installed in `.claude/agents/`,
and the three starter-team spawn prompts live in `teams/`.

## Quick start

```bash
cd demo
claude
```

That's it — the subagents are auto-discovered.

## What's inside

```
demo/
├── CLAUDE.md                          # project memory, read by every session
├── .claude/
│   └── agents/
│       ├── code-reviewer.md           # 🔴/🟡/🟢 review after changes
│       ├── planner-researcher.md      # plans before coding (>50 LOC)
│       └── launch-copywriter.md       # launch copy in product voice
└── teams/
    ├── build-squad.md                 # architect · frontend · backend · tester
    ├── ship-squad.md                  # release-captain · changelog · deploy-checker
    ├── recon-squad.md                 # scout · synthesizer · skeptic
    └── founder-team.md                # the live-demo TODO-app team
```

## Using the subagents

They auto-trigger on the keywords in their `description` (e.g. "PROACTIVELY"),
or you can call them explicitly:

```
> Use code-reviewer on my last commit.
> Have planner-researcher plan adding OAuth login.
> Ask launch-copywriter to draft a launch thread for v1.0.
```

## Spawning a team

Open a team prompt and paste it into Claude, or just point at the file:

```
> Read teams/build-squad.md and follow it.
> Read teams/recon-squad.md and follow it.
```

The lead agent will fan out to teammates and coordinate via the shared task
list at `~/.claude/tasks/{team-name}/`.

## Decision rule

- **Subagent** → "go do this and tell me." Quick errand.
- **Team** → "figure it out together." Real coordination.
