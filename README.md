# Build a Team With Claude Code

Stop prompting. Start delegating. A 20-minute mentor session on building sub-agents and agent teams with Claude Code — delivered at the Vibe Coding Workshop, Estonian Business School.

## Live slides

<https://ahmed-aleryani.github.io/claude-code-team-workshop/>

## What's in this repo

- **Slides** — `index.html`. Live at the link above.
- **Demo** — `demo/` — full TODO app with agent teams in action; React + Vite + Express + SQLite + JWT. See [`demo/README.md`](demo/README.md).
- **Template** — `template/` — drop-in agent-team scaffold for your own project. See [`template/README.md`](template/README.md).
- **Bootstrap guide** — [`AGENTS.md`](AGENTS.md) — how to scaffold a new project from the template.

## Run the slides locally

The deck is a single `index.html`. Serve it with anything; this works:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Use the template in your own project

```
cp -r template/. ~/my-project/
cd ~/my-project && claude
```

Then fill in `AGENTS.md` placeholders. Spawn `recon-squad` first (read-only) to test the scaffolding, then `build-squad` for real work.

## Inspiration & further reading

- **agency-agents** by msitarzewski — <https://github.com/msitarzewski/agency-agents>. A public collection of subagent definitions covering common engineering and ops roles. A good library to mine when defining your own subagents — referenced in the talk.
- **paperclip** by paperclipai — <https://github.com/paperclipai/paperclip>. A tool for managing a team of agents end-to-end. Cited as an example of the tooling growing around multi-agent workflows.

## About the talk

- **Speaker:** Ahmed Aleryani
- **Event:** Vibe Coding Workshop, Estonian Business School (EBS), Tallinn
- **Date:** 2026-05-09
- **Format:** 20-minute mentor session

## License

Code is released under the [MIT License](LICENSE).

Slide content © Ahmed Aleryani — free to share with attribution.
