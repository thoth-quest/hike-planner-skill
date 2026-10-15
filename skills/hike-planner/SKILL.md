---
name: hike-planner
description: Plan and revise multiple independently identified hiking activities. Define goals, destinations, constraints, and source-backed weather snapshots. The static GitHub Pages viewer reads JSON; only the agent updates plan data.
---

# Hike Planner · Portable Stage 1

Use when someone asks to plan a hike, compare hiking destinations, revisit a plan, or check whether conditions changed. **Keep each hike as a separate activity.**

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
- If the date or destination changes, mark prior relevant weather data `stale` until fresh evidence is retrieved. Keep previous weather snapshots.
- Weather checking is an **agent action**. If an actual forecast was checked, add a snapshot with `checked_at`, `valid_for`, `sources`, `values`, `assessment`. Record exact source URLs and do not claim an outdated forecast is current. The user confirms schedule/destination decisions.
- Check that `id` matches the folder name and the slug appears **once** in `site/plans/index.json`. Do not use the registry as a storage location for full plan data.

## Static preview (NO rendering/build step)

- `site/index.html` loads the registry and each plan JSON in the browser to show a directory.
- `site/plan.html?id=<slug>` loads **only** `site/plans/<slug>/activity.json` for a stable per-plan URL.
- The page is display-only and does **not** fetch live weather, modify JSON, or request any permissions.
- The GitHub Pages workflow copies/publishes `site/` unchanged after repo updates. No Python or HTML generation is needed.
- If the agent has no repository write access, produce a JSON patch or plan file for the user; don't claim the GitHub preview updated.
- A GitHub Pages URL reflects the last deployed repository commit. Changes may take time to appear. Public previews require user-controlled publication.

## Source quality and boundaries

Evidence items: `id`, `claim`, `url`, `publisher`, `checked_at`, `valid_for` (when applicable), `status`. Prefer the actual official source. Never invent transit times, fares, alerts, trail conditions or weather. Forecast checks should be revisited near departure **only when the user returns or a scheduled agent explicitly runs**. A risk warning should result in appropriate advice, not a silent change to a confirmed date.

Stage 2 = people coordination, Stage 3 = trails and trains/farepasses, Stage 4 = pre-trip verification, Stage 5 = adaptive trip, Stage 6 = retrospective. Do not claim later stages exist yet.
