# Hike Planner Skill

[简体中文](./README.zh-CN.md) | [English](./README.md)

A **portable, evidence-first** AI hiking planner that supports **multiple independent plans**. No user accounts, database, server, or Python HTML renderer.

**Status: v0.2 (Stage 1).** A static, read-only catalogue and per-plan preview is ready for GitHub Pages. The AI Skill updates activity JSON; the web page displays stored data only.

## Principles

- **One ID + one JSON file per hike.** Revising a date or destination never overwrites a different hike.
- **The AI owns planning and checks.** It determines goals, dates, options, constraints, and sources, then updates the chosen plan's JSON and history.
- **GitHub Pages only renders stored data in the browser.** No weather APIs, JSON writes, servers or HTML generation.
- **Privacy stays with users.** Plans placed under `site/plans/` are intended for public display. Keep private plans in personal workspaces.

## GitHub Pages preview

Expected URLs **after a successful deployment**:

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

The public plan viewer opens on **Route** by default, alongside **Overview**, **Weather & safety**, and **History** tabs. The Route tab places **transport before the hike**, then the **hiking itinerary**, then **transport after the hike** on one chronological timeline. Switch between key waypoints and all waypoints.

The arrival-time field and **−30 / +30 minute** controls shift the displayed times together, without touching JSON or recording revisions. For the Oyama draft the starting time and stop offsets are explicitly **illustrative estimates**, not a confirmed trip date, bus timetable, pace prediction, or sunset-safe plan. Ask the Skill to research the intended date and write approved times later.

Supporting sources are linked directly on the relevant route location, transport step, or risk notice. There is no separate wall of source links.

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

## Safety and privacy

Weather, transport, trail alerts and ticket information require real, dated sources. Never invent departure times, ticket coverage, summit forecasts, warnings or safety guarantees.

**GitHub Pages is public.** Demo plans contain no real participants' information. Do not commit personal names, phone numbers, home addresses, sensitive meeting details or private trips into `site/plans/`. Publish only deliberately sanitized plans.

## Tests and documentation

```sh
node --test tests/site.test.mjs
node --check site/assets/app.js
```

[GitHub Pages setup](./docs/PAGES.md) · [Roadmap](./docs/ROADMAP.md) · [Skill instructions](./skills/hike-planner/SKILL.md)

## Translations and license

Keep this English README synchronized with the [Simplified Chinese README](./README.zh-CN.md) when modifying usage, implementation scope or limitations.

MIT: [LICENSE](./LICENSE).
