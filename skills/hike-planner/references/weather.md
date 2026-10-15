# Weather checking, evidence and safety

Use weather as an evolving condition that can alter the suitability of goals, **not** as a one-off label.

## Where to check for Japan trips

- Japan Meteorological Agency (JMA) official weather / warnings: https://www.jma.go.jp/bosai/
- Japan Meteorological Agency hazard and alert information: https://www.jma.go.jp/bosai/map.html
- Mountain-focused conditions can complement official alerts, but verify their coverage and forecast horizon, e.g. https://tenkura.n-kishou.co.jp/tk/
- Trail and trip reports, for context rather than official weather authority: https://yamap.com/

These are **reference starting points**, not proof of any specific day's weather. Every claim needs a page URL applicable to the location and the time checked.

## Fetch logic

1. Resolve correct local activity date, timezone and mountain location, not only nearest city.
2. Find the best available data and forecast horizon. For far-future dates, explain limits and record climatology separately if relevant.
3. Check official watches/warnings and severe weather; then precipitation probability/amount, wind/gusts, thunderstorms, mountain/valley temperature, visibility and sunset where supported.
4. Record values **only if present in actual evidence**; never calculate summit temperature from town temperature and present it as a measured forecast.
5. Note weather-model uncertainty, elevation differences and last checked time.
6. Interpret based on the purpose: good hiking conditions might still be bad for a sunrise-view goal.
7. Recommend go/monitor/modify/postpone, but do not change date/destination without approval.

## Suggested review cadence, not automatic scheduling

- >7 days: forecast may be unavailable/unreliable; show seasonal info and next planned check
- Within 7 days: first substantive forecast check
- 3 days prior: reevaluate location/risks
- 1 day prior: hourly details and backup choice
- Day of departure / during trip: update when user initiates or an authorized scheduled job exists

## Warnings

Do not claim that a standard city forecast or a simple A/B/C mountain weather index confirms mountain safety. Consider lightning, dangerous winds, snow/ice, extreme rainfall, river crossings and route closure separately. If high risk, advise postpone/cancel rather than encouraging risk-taking.

## Evidence fields

Every weather snapshot has `checked_at`, `valid_for`, `sources`, `values` and `assessment`. Keep old snapshots so later differences are clear, and mark the latest as stale if no longer timely.
