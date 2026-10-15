# Development instructions

Build a portable **Agent Skill**, not a hosted multi-user platform. Follow the agreed staged scope.

## Non-negotiable constraints

- No login, OAuth, centralized database, API secrets, tracking, or external server.
- Users own their local activity JSON. Never store real participant names, addresses or secrets in the public repo.
- Stage 1 only: goals, destination selection/validation, date, constraints, weather feasibility and change history.
- Support both specified and unspecified destinations. Never override a user-confirmed choice silently.
- The skill should ask one consequential question at a time, reuse known details and allow unknowns.
- Attach direct source URLs and timestamps to every externally sourced, changeable claim; distinguish forecast, estimate, decision and observed fact.
- Bad weather can trigger a recommendation, **not** an unapproved change to the user's date.
- A static HTML export is a snapshot, not a synchronized live page.
- Weather fetches require a live browsing-capable host; a renderer must not manufacture forecasts.
- Prefer small testable, dependency-free code. Treat external JSON and AI output as untrusted.

## Done criteria for Stage 1

Create a goal from known or unknown destination; revise a single field without losing the rest; preserve previous revisions; handle weather as pending, current or stale with references; export a self-contained mobile page; pass smoke tests.

## Later, not now

Stage 2 group logistics, Stage 3 route/transit/fare plans, Stage 4 pre-departure check, Stage 5 in-trip adjustments, Stage 6 debrief. Keep compatible data extensions but do not implement those features prematurely.
