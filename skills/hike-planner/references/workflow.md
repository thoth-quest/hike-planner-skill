# Stage 1: goal-definition dialogue

## Example paths

**Destination named**

User: "Saturday, let's climb Oyama, mostly on foot."

Agent:
1. Recognizes selected location, exercise/summit goals and walk preference.
2. Asks for the exact Saturday/date only if ambiguous or relevant.
3. Once date is known checks weather sources and risks, then confirms whether summit is a hard requirement.
4. Presents Stage-1 goal card. Avoids inventing buses, fares, route lengths or summit times.

**Destination not named**

User: "We want a moderate day hike this weekend with views."

Agent:
1. Asks one pivotal question: general area or departure region.
2. Finds 2–4 actual candidates, with approximate difficulty, weather and direct sources.
3. Shows tradeoffs and asks user to select or leave pending.
4. Persists chosen candidate, original goal and rejected alternatives, with reasons.

## Data discipline

- `stage`: `goal_definition` at v0.1.
- `status`: `draft` until user affirms primary goal, date/range, and a destination.
- `destination.state`: `fixed | preferred | undecided`.
- `weather.status`: `pending | unavailable | current | stale`.
- `weather.assessment.level`: `unknown | suitable | caution | unsuitable`. These are *planning aids*, not guarantees.
- `changes`: human-confirmed revisions only. Track old/new and reason.
- Dates in ISO format. Include offsets or Z in checked timestamps.

## Important correction from an earlier hike

Different sellers may offer similarly named train/bus passes with different validity zones and formats. A purchased digital ticket from one operator does not silently imply coverage on another railway. When transport becomes Stage 3, compare exact point-to-point fares versus passes, using **the actual operator, origin, destination, date and ticket medium**. Do not generalize from historical example figures.
