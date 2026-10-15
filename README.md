# Hike Planner Skill

A portable, evidence-first hiking and outdoor activity planning skill for AI assistants.

**Status:** v0.1 · Stage 1 — Goal Definition. No sign-in, server, centralized database, or access to private user records required.

## Purpose

Start with the group's *goal*, not a giant itinerary. Support both:
- **Known destination:** check whether the chosen place fits the activity's purpose and limits.
- **Unknown destination:** identify requirements and compare a few candidate places before choosing.

When the date and destination are known, research relevant weather, attach source URLs and observed timestamps, and recommend whether to proceed, monitor conditions, adjust, or defer. A forecast is never an unconditional safety guarantee.

## Try it

1. Ask an AI agent with access to this repo: **“Use `skills/hike-planner/SKILL.md` to start a hiking plan. Do Stage 1 only.”**
2. Or install the `skills/hike-planner` directory as an Agent Skill in a compatible agent.
3. Keep each user's private activity state in their own `activity.json`; do **not** commit real participants' details to this repository.
4. Render a portable mobile page from the sample using Python 3 (standard library only):

```bash
python3 scripts/render.py examples/oyama.activity.json --output dist/oyama.html
```

Open `dist/oyama.html` on a phone or computer. It contains its data and styling; no external runtime, account, or tracking.

## What this version implements

- Natural-language goal extraction, known/unknown destination flow, optional constraints
- Weather checks dependent on dates, forecast horizon and quality
- Change log, revision number, pending and confirmed decisions
- Source/evidence format for time-sensitive claims
- JSON Schema for a local activity, a self-contained HTML exporter, example and tests

**Not yet implemented:** group logistics, transport schedules, fare optimization, live tracking, automatic background updates, group editing, or public hosting. Those are future stages, not implicit features of the present package.

## Layout

```text
skills/hike-planner/SKILL.md         Agent-facing instructions
skills/hike-planner/references/      Workflow and weather/evidence policies
schemas/activity.schema.json        Local structured activity data
examples/oyama.activity.json        Explicitly illustrative Stage-1 example
templates/activity.html             Self-contained phone-first page template
scripts/render.py                   HTML exporter (Python stdlib)
tests/test_render.py                Rendering/data smoke tests
AGENTS.md                           Development constraints
```

## Data & sharing model

There is **no shared central account**. Users' data lives in their selected AI workspace or local files. `activity.json` is the editable source of truth; `index.html` is a read-only snapshot. Sharing a fixed public URL with automatic updates would require separately chosen static hosting and republishing. Weather is refreshed **when the agent runs a new check**, not continuously.

## Trust boundaries

- Official sources are preferred for forecasts, warnings, trails, transit, and ticket terms.
- Record exact URLs and the date/time of checks. Never invent transit times, fares, summit forecasts, or safety ratings.
- A skill is a set of instructions and local assets: capabilities vary by host agent; a plain ChatGPT chat may not execute arbitrary repo scripts.
- Review the generated itinerary against changing conditions before departure.

## License

MIT (see `LICENSE`).
