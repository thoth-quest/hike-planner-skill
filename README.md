# Hike Planner Skill

[简体中文](./README.zh-CN.md) | [English](./README.md)

A **portable, evidence-first, offline-first** AI day-hike planner that supports **multiple independent plans**. No accounts, database, hosted backend, or Python HTML renderer.

**Status: v0.4 (Stage 1, day-trip only).** The primary viewer runs locally and works offline. GitHub Pages is an optional public copy. The AI Skill updates activity JSON; the read-only page displays stored data only.

## Principles

- **One ID + one JSON file per hike.** Revising a date or destination never overwrites a different hike.
- **The AI owns planning and checks.** It determines goals, dates, options, constraints, and sources, then updates the chosen plan's JSON and history.
- **The offline viewer only renders stored data in the browser.** No weather APIs, JSON writes or HTML generation.
- **Privacy stays with users.** Plans placed under `site/plans/` are intended for public display. Keep private plans in personal workspaces.

## Offline preview

Run `npm run offline` from the repository root and open `http://127.0.0.1:4173/`. This serves the static `site/` files from loopback only; it does not contact GitHub Pages or require Internet access. To use another port, run `node scripts/serve.mjs 8080`. Keep plans local by storing them outside public deployment workflows.

## GitHub Pages preview

Optional public preview URLs **after a successful deployment**:

- Catalogue: `https://thoth-quest.github.io/hike-planner-skill/`
- Oyama demo: `https://thoth-quest.github.io/hike-planner-skill/plan.html?id=oyama-demo`
- Kintoki demo: `https://thoth-quest.github.io/hike-planner-skill/plan.html?id=kintoki-demo`

### Oyama planned outing (independent, editable JSON)

[Open the Oyama day-hike preview](https://thoth-quest.github.io/hike-planner-skill/plan.html?id=oyama-day-hike) · [Edit its JSON](./site/plans/oyama-day-hike/activity.json)

This is a **planning draft**, not a booked or date-confirmed trip. It includes the preferred on-foot ascent via Onnazaka/Oyamadera/Afuri Shrine, Mt. Oyama summit, return via Miharashidai/Nijudaki, public-transport access, cable-car fallback and dated source-backed bear-awareness notices. The date is intentionally unset, and **no actual weather forecast or trip-specific bus schedule is claimed**. The Skill should update those after the trip date is chosen.


To enable for the first time: [Repository Settings → Pages](https://github.com/thoth-quest/hike-planner-skill/settings/pages) → **Build and deployment → Source → GitHub Actions**. Check [deploy workflow](https://github.com/thoth-quest/hike-planner-skill/actions/workflows/pages.yml). Full instructions: [Pages deployment](./docs/PAGES.md). Do not assume the URLs work before deployment is confirmed.

## Plan layout

```text
site/
├── index.html                  Public plan catalogue
├── plan.html                   Shared detail viewer, selected by ?id=<slug>
├── assets/app.js               Read-only browser logic
├── assets/site.css
└── plans/
    ├── index.json              Published slug list (IDs only)
    ├── oyama-demo/activity.json
    ├── kintoki-demo/activity.json
    └── <new-slug>/activity.json
```

To add another plan, create its `site/plans/<slug>/activity.json` and append its slug to `site/plans/index.json`; the JSON `id` must match the folder slug. No HTML duplication or compilation is needed.

Optional convenience command (creates JSON and updates the registry; **does not render HTML**):

```sh
node scripts/plans.mjs add 2026-11-oyama "November Oyama hike"
node scripts/plans.mjs list
```

A plan keeps a stable URL: `https://thoth-quest.github.io/hike-planner-skill/plan.html?id=<slug>`.

## Detail page (tabs + relative timeline)

The viewer uses a quiet, mobile-first day-hike field-guide design. **Plan** is the first tab, followed by **Safety**, **Route**, and **History**. The Route tab places **transport before the hike**, then the **hiking itinerary**, then **transport after the hike** on one chronological timeline. Switch between key waypoints and all waypoints.

Tap a hiking or driving time on the timeline to open the device time picker; downstream estimates recalculate from that node. Fixed transit can only be chosen from actual queried services, with up to two nearby departures before and after the requested time. Without an explicit illustrative anchor the viewer shows no default clock time.

The Plan tab includes a per-person fee subtotal, sourced line items, optional costs, and an incomplete-total notice while fares are unknown. Supporting sources are linked directly on the relevant route location, transport step, cost or risk notice. There is no separate wall of source links.

## Node-by-node time simulation (v0.4)

Every waypoint has its own optional **±15-minute adjustment**. Delays at a hiking or driving node only affect subsequent flexible segments. The adjustment does **not** shift the whole day.

**Rail and bus services have fixed timetables.** Their departure and scheduled arrival times may appear only when a date-specific, verified service is stored with a supporting source URL and check time. The Skill can store up to two real services immediately before and after the requested time; the user may choose one temporarily on the timeline. If a prior hiking delay misses a departure, the page flags **missed connection** and requires the Skill to research an actual alternative; it never slides the published departure later or invents the next service.

**Driving** uses approximate travel durations and can incur congestion delays. **Hiking** uses estimated waypoint offsets and local rests or unexpected setbacks. Tap either time on the timeline to open the device's native time picker; downstream estimates recalculate from that node. These scenarios stay only in browser memory and cannot change the plan JSON, official transit timetable or weather. The current Oyama plan has **no verified service times** because its trip date is unknown; these correctly appear as *timetable pending*. Its 08:00 hiking anchor remains a clearly labeled illustrative assumption, not a claimed bus arrival. The Plan tab also calculates a sourced fare subtotal and marks the full cost incomplete while the departure-station fare is unknown. Multi-day travel remains out of scope.

## Weather updates belong to the Skill

1. User asks to recheck weather for a particular plan.
2. A browsing-capable AI checks suitable official sources and preserves `checked_at`, forecast validity, evidence URLs, and an assessment.
3. The Skill modifies **only that plan's JSON**, increments `revision`, and appends to `changes`.
4. After GitHub Pages redeploys the static folder, refreshing the page shows the saved snapshot.

No external weather API calls or timers run in the page. Missing evidence is shown as pending/unknown. GitHub Pages deployment and caching may introduce delay: updates are **not live forecasts**.

## Implemented scope

| Feature | Status |
| --- | --- |
| Natural-language goal and destination flow | Skill instructions |
| Multiple separate plan files and change history | JSON structure and workflow |
| Searchable plan catalogue, stable per-plan URL | Static HTML + browser JavaScript |
| Stored weather assessment with source evidence | Display implemented; live checking depends on AI host |
| GitHub Pages automatic deployment | Workflow committed, first deployment needs verification |
| Create-plan helper and data consistency tests | Node helper and tests |
| Real group coordination, ticket optimization, continuous monitoring | Not implemented |

The current project remains Stage 1 (goal definition), not a full hiking operations platform.

## Use in an AI agent

Ask an AI with repository access to read `skills/hike-planner/SKILL.md`:

> Create a new independent hiking plan using hike-planner. Start with Stage 1 and don't overwrite existing plans.

Follow-up:

> Update the date and refresh weather evidence for plan 2026-11-oyama only.

Skill install/file edit support varies across hosts. Pasting a GitHub link into any web AI does not guarantee automatic installation or code execution.

## Current scope: day trips only

Each plan declares `trip_type: "day_trip"`. The relative timeline must stay within one calendar day; crossing midnight is flagged, not treated as a multi-day itinerary. Overnight trips, lodging and multi-day transport are intentionally deferred to a future version.

## Safety and privacy

Weather, transport, trail alerts and ticket information require real, dated sources. Never invent departure times, ticket coverage, summit forecasts, warnings or safety guarantees.

**GitHub Pages is public.** Demo plans contain no real participants' information. Do not commit personal names, phone numbers, home addresses, sensitive meeting details or private trips into `site/plans/`. Publish only deliberately sanitized plans.

## Tests and documentation

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
node --check site/assets/app.js
```

[GitHub Pages setup](./docs/PAGES.md) · [Roadmap](./docs/ROADMAP.md) · [Skill instructions](./skills/hike-planner/SKILL.md)

## Translations and license

Keep this English README synchronized with the [Simplified Chinese README](./README.zh-CN.md) when modifying usage, implementation scope or limitations.

MIT: [LICENSE](./LICENSE).

Unknown preceding transport leaves later connections unconfirmed. Negative trail adjustments cannot exceed the next segment duration; transit schedules can only change through a sourced service selection. Unknown return transport has no trip completion time. See the [timing contract](docs/TIMELINE.md).
