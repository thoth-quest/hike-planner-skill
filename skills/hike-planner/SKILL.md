---
name: hike-planner
description: Plan an outdoor hike step by step, starting from goals, date, destination candidates and weather. Maintain locally owned activity JSON and evidence-backed decisions; generate a compact phone-friendly plan snapshot when asked.
---

# Hike Planner — portable Stage 1

## Start

Trigger when a user asks to plan a hike, organize an outdoor activity, compare destination options, or update an existing plan.

**First action:** Extract facts already said. Identify destination mode:
- `fixed`: destination confirmed, do not replace without approval;
- `preferred`: named place but alternatives allowed;
- `undecided`: no destination chosen.

Do not interpret `preferred` as `fixed`. Ask at most one important follow-up at a time. Do not demand a form or collect identity details. If user says 'go to X' and supplies enough context, proceed to goal definition without asking if X exists.

## Stage 1 workflow

1. **Goals:** record one primary goal and any optional secondary goals (summit, views, exercise, photography, relaxed walk, etc.). Record priority and hard rules separately.
2. **Constraints:** capture activity date or range, broad area, estimated group size (optional), difficulty and return deadline if known. Use `null` for unknown values.
3. **Weather:** once a destination and target date are known, inspect forecast horizon and available source data. Query as appropriate: official alerts, rain and thunder risk, temperature, wind/gusts, sunset, and mountain versus town conditions. Summarize uncertainty and source timestamps. If live sources cannot be accessed, mark `unavailable`, never invent values.
4. **Destination:** if fixed, check whether it plausibly meets the goal; if undecided, offer 2–4 grounded options with tradeoffs and real sources. User confirms selection.
5. **Confirm Stage 1:** present a *small* activity goal card: where/when/why, key constraints, weather evaluation, pending decisions, last-checked and evidence links. Do not enter route and bus timetable planning unless asked or user proceeds to a later stage.

## Weather refresh

Weather is time-sensitive. See [weather policy](references/weather.md). A date several weeks away is not a reliable hour-by-hour forecast. Suggested rechecks: ~7 days, ~3 days, one day before, and morning of departure **when the user returns or a host schedule actually runs**. Never imply background monitoring is active.

Forecast changes should mark dependent decisions `needs_review`; **only confirmed decisions modify the plan**. Severe warnings should lead to clear advice to postpone, cancel or choose safer activity, not just shorter exposure.

## Evidence & revisions

Each evidence item should contain: `id`, `claim`, `url`, `publisher`, `checked_at`, `valid_for` (optional), and `status`. Favor relevant primary sources and link the exact supporting page. No invented timetable, fare, site opening status, or forecast.

Keep a source-of-truth `activity.json` using [schema](../../schemas/activity.schema.json). Increment `revision` for each confirmed update; append to `changes` with field, before, after, reason, timestamp; preserve weather snapshots rather than overwriting historical checks. Use `pending` or `needs_review` where appropriate.

## Deliverables

- On request, output/update `activity.json`.
- When the host can execute Python and access files, run `python3 scripts/render.py activity.json --output index.html` (from repo root) for an offline, shareable phone page.
- If the host cannot create files, provide compact structured content and explain the limitation. Do not claim live hosting or persistence that does not exist.
- Every shareable page distinguishes confirmed decisions from proposals and displays evidence links and checked time.

## Boundaries

No accounts, personal address requirement, remote DB or automatic synchronization. Users maintain separate local files. A downloaded static page is a point-in-time snapshot; for a fixed updated URL, choose static hosting and republish it. Companion references: [Stage 1 dialogue](references/workflow.md), [weather & evidence](references/weather.md).

Safety: weather sources and route descriptions are not guarantees. Use official warnings, terrain and group's ability; avoid dark or unsafe travel and say when data are insufficient.
