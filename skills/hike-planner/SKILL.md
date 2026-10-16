---
name: hike-planner
description: Plan and revise multiple independently identified hiking activities. Define goals, destinations, constraints, and source-backed weather snapshots. The static GitHub Pages viewer reads JSON; only the agent updates plan data.
---

# Hike Planner · Portable Stage 1

Use when someone asks to plan a hike, compare hiking destinations, revisit a plan, or check whether conditions changed. **Keep each hike as a separate activity.**

## Current scope — day trip only

This release handles **one calendar day per plan**. Every created plan must set `trip_type: "day_trip"`. The timeline never represents lodging, overnight transfers or multiple day plans. A time offset across midnight should be marked invalid for a confirmed day-hike schedule, not silently treated as a second day. Multi-day planning will require a separate model and UI in a later release.

## Select or create a plan FIRST

1. If the user names a prior plan or supplies its ID, find that plan in their workspace. Do not overwrite another plan.
2. If they want a new outing, create a NEW unique, lowercase slug (e.g. `2026-11-oyama`). The slug is stable even if the destination or date later changes.
3. In the published preview repository, plan state lives in `site/plans/<slug>/activity.json`, and `site/plans/index.json` lists the published slugs. `id` inside JSON **must equal** `<slug>`. Use [schema](../../schemas/activity.schema.json). Keep unrelated plans untouched.
4. For a new plan, edit JSON directly or optionally run `node scripts/plans.mjs add <slug> "<title>"` to initialize and register it. This Node command is for convenience only, not rendering.
5. **Privacy:** `site/plans/` is published via GitHub Pages. Never commit personal details or private activity plans there without the user's explicit choice. Keep private/local plans outside the published directory. Do not add real identities or addresses to public examples.

## Stage 1 conversation

Record what is already known. Ask only the most consequential missing question.

- Destination mode: `fixed` (user decided), `preferred` (possible alternatives), or `undecided`.
- Primary objective, optional secondary objectives, area, date/range, ability, rough group size and hard constraints (all optional until confirmed).
- For a fixed destination, assess compatibility with goals. For undecided destination, propose 2–4 sourced candidates with tradeoffs.
- Once place and date are known, use a browsing-capable agent to check official alerts and appropriate location-specific weather: precipitation, wind/gusts, lightning, temperature/elevation, visibility and sunset, when available. Read [weather policy](references/weather.md). An absent or distant forecast is `pending` or `unavailable`, never imagined.
- Present a short goal summary and remaining decisions. Do not jump to full train schedules or turn Stage 1 into a long route guide.

## One-plan-at-a-time data updates

- Pick a precise plan ID before **every write**.
- Read existing JSON and its `revision`. Apply only confirmed changes to this one plan; preserve other fields, other plans, and prior evidence.
- Increment `revision` for confirmed updates and append to `changes`: `revision`, `at`, `field`, `before`, `after`, `reason`.
- If the date, destination or route changes, set the activity to `needs_review`, mark affected weather `stale`, reset affected transport `schedule_status` to `pending`, and mark affected route/safety evidence for review. Preserve historical snapshots and timetables, but never reuse pending timetables as verified services.
- Weather checking is an **agent action**. If an actual forecast was checked, add a snapshot with `checked_at`, `valid_for`, `sources`, `values`, `assessment`. Record exact source URLs and do not claim an outdated forecast is current. The user confirms schedule/destination decisions.
- Check that `id` matches the folder name and the slug appears **once** in `site/plans/index.json`. Do not use the registry as a storage location for full plan data.

## Offline-first viewer (NO rendering/build step)

- To display plans without Internet access, run `npm run offline` in the repository and open `http://127.0.0.1:4173/`. The read-only Node server binds only to loopback and serves local HTML, CSS, JavaScript and JSON. No remote requests are needed.
- In a private local copy, create/register a plan under `site/plans/` and use this viewer. Treat any files in that directory and its manifest as public if committed to a repository that deploys Pages; do not commit personal or sensitive plans.
- GitHub Pages is an optional public copy, not the required way to view plans.

## Static plan files (NO rendering/build step)

- `site/index.html` loads the registry and each plan JSON in the browser to show a directory.
- `site/plan.html?id=<slug>` loads **only** `site/plans/<slug>/activity.json` for a stable per-plan URL.
- The page is display-only and does **not** fetch live weather, modify JSON, or request any permissions.
- The GitHub Pages workflow copies/publishes `site/` unchanged after repo updates. No Python or HTML generation is needed.
- If the agent has no repository write access, produce a JSON patch or plan file for the user; don't claim the GitHub preview updated.
- A GitHub Pages URL reflects the last deployed repository commit. Changes may take time to appear. Public previews require user-controlled publication.

## Optional detailed plan sections

A plan may contain `route`, `transport`, `safety`, and `pending_decisions` in addition to Stage 1 fields. These are **proposed, evidence-linked planning aids** and are not automatically approved or checked for a specific trip date. Cite official sources in `evidence` and reference their IDs from relevant route/transport/safety items. The browser should display these stored sections, never generate live route/weather facts. When a planned trip date is confirmed, revise **only the target plan**, refresh date-sensitive route/transport/weather information with timestamped evidence, then update the JSON and commit.

## Detail preview and time shifting

The GitHub Pages detail viewer uses four tabs: route (default), overview, weather/safety, history. Route is a timeline with before-hike transit, trail stages, and after-hike transit. Plan data may include `preview_timing` (`anchor_time`, `anchor_label`, `status: illustrative`, `notice`), optional integer `offset_minutes` and `key_point` on trail stops, and estimated durations for driving/walking legs. Every timing is **an estimate** until checked and confirmed for a specific date. Node-level ±15-minute scenario controls are temporary UI state and MUST NOT modify plan data or change weather. Rail/bus departures are fixed when sourced. If asked to save a revised schedule, validate the user's intended arrival/departure times against actual public transport, terrain, sunset and participant abilities, then update only that plan's JSON with revision history.

Place links at the item they support, using `source_id` (or `source_ids`) referencing `evidence` on route points, transport legs, risks and weather. Do not show a separate dump of references.

## Node-specific delays and transport constraints

On day-trip previews, UI time adjustments are attached to a **particular waypoint or transport arrival**, never to the whole itinerary. Trail/walking stops use estimated offsets; driving legs use estimated durations with possible congestion delay. The page stores simulation deltas in ephemeral browser state; Skill data remains unchanged until a user explicitly approves saved changes.

Public transit MUST use a verified `timetable` object for that exact `constraints.date`: `service_date`, `departure_time`, `arrival_time`, `checked_at`, `source_id`, optional `service_id`. `source_id` must match a verified `evidence` item with an exact URL. Never build a train/bus departure from approximate `offset_minutes` or a hiking anchor. Before verification, mark timetable pending and show no fake clock time. When a late hiking/drive leg makes a fixed departure impossible, flag missed connection and ask for a new actual timetable query; do not shift the departure or invent a later service. Transit arrival delay may be simulated without altering the published scheduled departure/arrival.

Do not treat browser-adjusted arrival estimates as confirmations of route safety, last bus, sunset or weather. Multi-day behavior is explicitly deferred.

## Source quality and boundaries

Evidence items: `id`, `claim`, `url`, `publisher`, `checked_at`, `valid_for` (when applicable), `status`. Prefer the actual official source. Never invent transit times, fares, alerts, trail conditions or weather. Forecast checks should be revisited near departure **only when the user returns or a scheduled agent explicitly runs**. A risk warning should result in appropriate advice, not a silent change to a confirmed date.

Stage 2 = people coordination, Stage 3 = trails and trains/farepasses, Stage 4 = pre-trip verification, Stage 5 = adaptive trip, Stage 6 = retrospective. Do not claim later stages exist yet.

Read [the timing contract](../../docs/TIMELINE.md) before editing node timing. Require unique stable node IDs and nondecreasing route offsets. Do not add an illustrative anchor unless explicitly intended; missing anchors produce no default times. Run `npm ci && npm test` before committing.
