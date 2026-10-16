# Hike Planner development rules

This is a **portable, multi-plan Agent Skill with a local offline-first static viewer and an optional public GitHub Pages copy**. It is NOT a central multi-user web app.

## Architecture

- The source of truth is one `activity.json` per plan. Public plan files: `site/plans/<slug>/activity.json`.
- Registry `site/plans/index.json` contains only unique slugs; a slug is stable and independent of date or destination.
- `site/index.html` lists local plans; `site/plan.html?id=<slug>` reads exactly one plan. `node scripts/serve.mjs` serves the static files on loopback for offline use. No HTML generation, no Python rendering, no weather APIs on the page.
- Plan creation, revision, evidence checks and weather updates happen in the agent/Skill. Browser code is read-only.
- Browser code must use textContent/DOM APIs, avoid injecting untrusted plan HTML. Only allow safe http(s) evidence links.
- The detail view uses accessible tabs and a node-level time simulation: inbound transit → hike → outbound transit. Each delay is local presentation state, not a JSON write. Do not permit global clock shifts.
- Time offsets without date/route validation are explicitly illustrative; never suggest they are verified services or safe return times.
- Link evidence inline on the relevant transport, waypoint, weather observation or warning; no standalone reference wall.
- Published plans are **public information**. Never upload names, phone numbers, exact personal origins or sensitive notes without consent. Private plans remain local/elsewhere.
- Local offline use is the primary viewer path. GitHub Pages is optional and deploys exactly the `site/` folder, not the whole repository.
- No OAuth, accounts, database or hosting backend.

## Product constraints

- Stage 1 is day-trip only: one calendar day per plan (`trip_type: "day_trip"`). Multi-day plans and overnight accommodation are postponed.
- Activity objectives, date, destination, feasibility, source-backed weather, change log.
- Support fixed, preferred and undecided destinations. Ask one useful question at a time.
- Don't invent real-world data. Forecast snapshots must contain sources and checked_at timestamps; old forecasts are not live.
- Updates to one activity must not mutate other activities. Increment revision and record changes for confirmed edits.
- Keep the schema compatible, test manifest-to-files correspondence, and keep Chinese and English README in sync.

## Done criteria

At least two independent plans, with private/local plans kept outside public Pages. Unique safe slugs; stable per-plan links; working directory and detail page; native JS JSON fetch with no HTML generation; loopback offline launcher and automated validation. Pages deploy remains optional.

## Future

Stage 2 group logistics, Stage 3 route/transit/fare passes, Stage 4 pre-trip checks, Stage 5 live adjustments, Stage 6 debrief. Do not overbuild.

- For public rail/bus, query and store every actual service on the trip date for each route segment, with evidence and query time. Keep the published timetable separate from temporary simulated early/late offsets; time wheels allow both directions. Missed connections remain warnings, and alternatives must be selected from sourced services. Test both offset directions and downstream effects.
