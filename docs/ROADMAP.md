# Roadmap

## v0.2 — Multi-plan static preview (code completed; deployment to verify)

- [x] One `activity.json` per plan under `site/plans/<slug>/`
- [x] Registry `site/plans/index.json` and multiple independent demo plans
- [x] Browser-only read-only catalogue and individual plan viewer
- [x] No Python renderer or HTML regeneration; weather updated only by the Skill
- [x] Pages workflow publishing `site/` directly, with JSON tests
- [x] Optional Node helper for creating and registering a plan
- [ ] Verify first successful GitHub Pages deployment and published URL
- [ ] Verify planned edits/weather refresh across two plans in a real AI host

## Stage 1: more iteration

- [ ] Real data source reviews, quote/time validity tests, and destination comparison practice
- [ ] Improve revision history UI and weather snapshot change comparison
- [ ] Host-specific installation tests on ChatGPT, WorkBuddy and Codex

## Later stages

Stage 2 group logistics, Stage 3 route/public transport and passes, Stage 4 pre-trip verification, Stage 5 during-hike adaptations, Stage 6 retrospective. Private user plans should remain separate from public preview data.

## v0.3 — Day-hike UX

- [x] Explicit `day_trip` scope, postpone multi-day model
- [x] Redesign mobile-first day-hike plan screens with design tokens and accessible tabs
- [x] Refine timeline, time-shifting controls and inline evidence links
- [ ] Plan multi-day itineraries as a separate future experience
