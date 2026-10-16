# Day-trip timing contract / 日归时间模型

- `offset_minutes` is cumulative arrival time from the trail anchor, not the duration of each segment. Keep offsets nonnegative and nondecreasing, with stable unique `node_id` values across the plan.
- 路线节点的调整不改变本节点到达时间，只改变其后路段。负数最多减去下一段的原始耗时；末节点只可增加停留。交通调整代表额外延误，不可提前到达。
- A timetable needs an exact matching trip date, valid clocks, a parseable `checked_at`, and verified HTTPS evidence. Explicit pending/not-applicable schedule status disables an old timetable.
- Unknown transport breaks the arrival chain. Later verified services retain their published clocks but show `connection_unknown`, not a successful connection. Missed services block downstream estimates and never create a replacement.
- 未核实去程时，只允许使用明确标为 `illustrative` 的锚点演示山路；没有锚点不生成 08:00。该演示不能证明返程接驳可行。
- `trailEnd` means leaving the final trail node. `finish` is null if a return leg is unresolved; it must not fall back to the hiking finish.
- Cross-midnight values are unsupported, never wrapped to the next day. Scenario changes are in-memory only and cleared on reload.
- `preview_phase: hike` is legacy metadata for access already represented by route offsets; it must not be counted twice.
- Date/route changes require reviewing weather, affected timetables and route/safety evidence. Keep historical evidence; explicitly mark invalidated services pending.

Run `npm test` for schema/data/engine checks and `npm run test:browser` for mobile and desktop UI checks. Browser tests use a temporary static HTTP server, never a production backend.
