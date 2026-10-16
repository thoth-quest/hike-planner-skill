# Hike Planner Skill｜登山活动规划助手

[简体中文](./README.zh-CN.md) | [English](./README.md)

一个**轻量、可移植、基于证据**的 AI 户外活动规划 Skill。支持管理**多份相互独立的登山计划**，无需账号系统、数据库、服务器或 Python 网页生成器。

**版本：v0.4（Stage 1，仅日归）**。主要使用方式是在本机离线查看；GitHub Pages 只是可选的公开副本。AI Skill 更新数据，网页只展示数据。

## 设计原则

- **一个计划一个 ID、一份 JSON**：例如大山和金时山各有自己的活动文件，互不覆盖。即使活动日期或目的地改了，计划 ID 也不变。
- **AI 负责规划和核实**：确定活动目标、日期、候选地点、限制；查询可访问的天气与官方证据；更新对应的 JSON 与修订记录。
- **离线页面只负责展示**：浏览器使用 JavaScript 读取 JSON，不运行天气查询、不修改数据、不生成新的 HTML。
- **隐私由用户决定**：放进 `site/plans/` 的计划会随公开 Pages 一起发布。个人计划可以保留在自己的 AI 工作区，不需要上传。

## 离线预览

在仓库根目录运行 `npm run offline`，然后打开 `http://127.0.0.1:4173/`。该只读服务只监听本机回环地址，直接展示静态 `site/` 文件，不访问 GitHub Pages，也不需要互联网。自定义端口可运行 `node scripts/serve.mjs 8080`。

## 在线预览

线上预览（可选，部署到 GitHub Pages 后访问）：

- 计划目录：`https://thoth-quest.github.io/hike-planner-skill/`
- 大山演示：`https://thoth-quest.github.io/hike-planner-skill/plan.html?id=oyama-demo`
- 金时山演示：`https://thoth-quest.github.io/hike-planner-skill/plan.html?id=kintoki-demo`

### 大山一日登山正式草稿

[打开大山计划预览](https://thoth-quest.github.io/hike-planner-skill/plan.html?id=oyama-day-hike) · [查看独立 JSON 数据](./site/plans/oyama-day-hike/activity.json)

这是**可反复修改的规划草稿，不代表已经确认出行日期**。包含女坂、大山寺、阿夫利神社下社、富士见台、大山山顶、见晴台、二重瀑布的建议路线，以及交通、缆车备用方案、官方安全信息和来源。活动日期暂时为空，**没有填入虚构的天气或出发日巴士时刻**；选定日期后由 Skill 重新核实并更新数据。


**注意：** 这些是预期地址，须在 [GitHub Actions](https://github.com/thoth-quest/hike-planner-skill/actions/workflows/pages.yml) 首次部署成功后才可使用。如果尚未启用，请进入 [Pages Settings](https://github.com/thoth-quest/hike-planner-skill/settings/pages)，在 **Build and deployment → Source** 选择 **GitHub Actions**。完整步骤见 [Pages 部署说明](./docs/PAGES.md)。

## 创建和管理多份计划

仓库目录：

```text
site/
├── index.html                         所有公开计划的目录页
├── plan.html                          共用的计划详情页（按 ID 读取数据）
├── assets/
│   ├── app.js                         浏览器展示逻辑，无天气 API
│   └── site.css
└── plans/
    ├── index.json                     公开计划 ID 列表
    ├── oyama-demo/
    │   └── activity.json              大山的计划数据
    ├── kintoki-demo/
    │   └── activity.json              金时山的计划数据
    └── <新计划ID>/
        └── activity.json              每份计划自己的 JSON
```

创建新计划有两种方式：

**直接编辑 JSON：** 新建 `site/plans/<id>/activity.json`，并把 `<id>` 添加到 `site/plans/index.json` 的 `plans` 数组。确保 JSON 中的 `id` 与文件夹一致。浏览器直接读取该文件，不需要编译或重新生成 HTML。

**使用可选的 Node 命令初始化：**

```bash
node scripts/plans.mjs add 2026-11-oyama "11月大山登山"
node scripts/plans.mjs list
```

此命令只负责创建 JSON 和登记目录，**不负责渲染页面，也不需要 Python**。安装 Skill 的 AI 也可以直接编辑这些文件。

每个计划的固定分享链接格式：

```text
https://thoth-quest.github.io/hike-planner-skill/plan.html?id=<计划ID>
```

## 详情页：Tab 与节点时间轴

详情页已重新设计为移动端日归登山手册，默认打开 **「计划」** Tab，随后是 **「安全」「路线」「记录」**。路线以 **登山前交通 → 登山路线 → 登山后交通** 的顺序展示，支持只看主要节点，或展开全部节点。

直接点时间轴上的登山或自驾时刻，可用设备原生时间选择器调整该节点并重新计算后续估算。公交、电车只能选择实际查询并写入的固定班次；目标时刻前后最多显示各两班。未提供明确演示锚点时，页面不生成默认时刻。计划页恢复了按来源计算的费用小计和未确定费用提示。

来源链接直接加在相应路线地名、交通信息、天气数据或安全公告上，不单独列出冗长的链接模块。

## 节点级时间模拟（v0.4）

在每个适合调整的节点使用 **±15 分钟**，只影响该节点之后的可变行程，不能整体平移全部时间。

**电车和巴士是固定班次**：只有 Skill 按确定日期查询并保存发车、到站时刻以及原始来源、查询时间后，网页才显示具体班次。前面登山耽误了时间导致赶不上车，页面会标为**错过班次**，不擅自推迟固定发车时刻，也不会编造下一班车。对已核实的公共交通，可以模拟到站晚点，但计划发车和计划到站时间保持原样。

**自驾**基于估计行车时长，可在交通节点模拟堵车；**登山**可在山顶、寺院、休息点等具体节点增加或减少耗时，并仅顺延后续节点。所有模拟都仅保留在当前浏览器，不写回 JSON、不修改天气或时刻表。

大山计划尚未确定出行日期，因此**巴士和铁路时刻全部保持「班次待查」**；用于山路排程的 08:00 只是明示的假设锚点，并非已查询到的巴士到达时间。多日规划仍暂不开发。

## 天气如何更新？

由 AI Skill 完成，网页不会主动更新：

1. 用户要求重新检查某一份计划的天气。
2. Skill 根据该计划的日期和地点查询对应来源，记录 `checked_at`、适用日期、证据网址以及天气快照。
3. Skill 更新**这份计划**的 `activity.json`，并维护 `revision` 和 `changes`；其他计划不受影响。
4. 推送到 GitHub 后，Pages 工作流重新发布静态文件。网页刷新即可读取最新已保存数据。

没有查询结果时必须显示“未查询”或“需要复核”，不能编造天气。GitHub Pages 部署和缓存可能有延迟；**数据被修改不等于天气实时更新**。

## 目前功能和范围

| 功能 | 状态 |
| --- | --- |
| 自然语言定义目标和候选目的地 | Skill 规则已完成 |
| 多份独立计划、单独版本与修改记录 | JSON 结构及操作规则已提供 |
| 计划目录、搜索、每个计划固定链接 | 已实现为静态 HTML + JavaScript |
| 天气与来源、查询时间的展示 | 已实现读取快照；查询仍依赖 AI 工具 |
| GitHub Pages 自动发布工作流 | 配置文件已提交；需确认首次部署 |
| 创建计划辅助命令与数据校验 | 已提供 Node 工具和自动化测试 |
| 多人实际出行协作、班车票价优化、持续天气监控 | 尚未实现 |

**现阶段仍以 Stage 1 为中心**，不要把示例计划当作已确认的登山攻略。

## 如何在 AI 中使用

向具备仓库读取能力的 AI 提供 `skills/hike-planner/SKILL.md`：

> 用 hike-planner 创建一个新登山计划，从目标确定开始；保存成独立的 activity.json，不覆盖其他计划。

之后可以说：

> 更新计划 2026-11-oyama 的日期，并重新核查天气；只更新这个计划的数据。

完整 Skill 安装与文件写入能力取决于 AI 环境。仅凭一个 GitHub URL，不能保证所有网页版 AI 都会自动安装或执行脚本。

## 当前版本只支持日归

每份计划增加 `trip_type: "day_trip"`。路线时间轴按当天往返计算，超过当天的时间会提示异常；本版本不支持住宿、跨日线路、多天行程或连续多日天气。非日归场景将在后续另行设计。

## 安全与数据边界

天气风险、日落、交通班次、票价等易变化的数据须有实际来源、查询时间及适用范围。不能用旧信息冒充实时信息。页面不会调用外部天气 API，也不会产生自动的天气警报。

**GitHub Pages 是公开页面。** 演示计划不包含真实参与者资料。不要把姓名、电话、住址、私人集合地点或其他敏感内容提交至 `site/plans/`。公开分享前检查计划内容。私人计划应留在自己的工作区，只有确认公开的脱敏计划才应放入站点目录。

## 开发与部署

```bash
npm ci
npm test
npx playwright install chromium
npm run test:browser
node --check site/assets/app.js
```

[GitHub Pages 部署说明](./docs/PAGES.md) · [开发路线图](./docs/ROADMAP.md) · [Skill](./skills/hike-planner/SKILL.md)

## 多语言维护与许可

维护 [中文版](./README.zh-CN.md) 和 [English version](./README.md) 时应同步更新功能范围、安装说明、使用方式和限制，避免文档超前于代码。

许可证：[MIT](./LICENSE)。

未知前序交通会显示「接驳待确认」，不会冒充已赶上后续班次。负向调整最多缩短下一段原始耗时；末节点和交通延误不能为负。返程未知时不推算全程结束时间。数据约定见 [时间模型](docs/TIMELINE.md)。
