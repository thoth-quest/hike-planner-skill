# Day-trip timing contract / 日归时间模型

- `offset_minutes` is cumulative arrival time from the trail anchor, not the duration of each segment. Keep offsets nonnegative and nondecreasing, with stable unique `node_id` values across the plan.
- For every public-transit route segment, `timetable_options` stores **all actual services on the trip date**. Each option carries the exact date, departure/arrival clocks, service ID, checked time and verified evidence ID; include the selected service in this list. `timetable_coverage` records full-day completeness only after the entire day's schedule has been checked and stored, and points to verified evidence for that complete timetable. `reference_time` is used to surface the closest two services before and after the current target; the complete stored list remains selectable. The viewer never invents a service.
- Tap a hiking, flexible-travel or public-transit timestamp to open the hour/minute wheel. Trail edits set that waypoint's arrival and propagate downstream. A transit edit applies a signed temporary offset to the selected service's departure and arrival, allowing early or late scenarios while preserving the sourced original timetable. If it breaks a connection, show the missed connection and allow choosing another service from the stored day list.
- 路线节点可向前或向后模拟时间变化。登山节点的调整设置该节点抵达时间并重算后续行程；公共交通节点的调整则临时偏移所选班次的发车与到达时间，不改写来源时刻表。模拟后若影响接驳，应显示错过班次并允许从当天实际班次中选择其他车次。
- A timetable needs an exact matching trip date, valid clocks, a parseable `checked_at`, and verified HTTPS evidence. Explicit pending/not-applicable schedule status disables an old timetable.
- Unknown transport breaks the arrival chain. Later verified services retain their published clocks but show `connection_unknown`, not a successful connection. Missed services block downstream estimates and never create a replacement.
- 未核实去程时，只允许使用明确标为 `illustrative` 的锚点演示山路；没有锚点不生成 08:00。该演示不能证明返程接驳可行。
- `trailEnd` means leaving the final trail node. `finish` is null if a return leg is unresolved; it must not fall back to the hiking finish.
- Cross-midnight values are unsupported, never wrapped to the next day. Scenario changes are in-memory only and cleared on reload.
- `preview_phase: hike` is legacy metadata for access already represented by route offsets; it must not be counted twice.
- Date/route changes require reviewing weather, affected timetables and route/safety evidence. Keep historical evidence; explicitly mark invalidated services pending.
- `costs.items` holds source-backed yen line items with quantity, per-person/group scope, whether included in the default estimate, and pending/estimated/confirmed status. The viewer sums entered prices, separates optional items, and indicates when included fares are unresolved. Do not present a partial subtotal as the trip's final total.

Run `npm test` for schema/data/engine checks and `npm run test:browser` for mobile and desktop UI checks. Browser tests use a temporary static HTTP server, never a production backend.
