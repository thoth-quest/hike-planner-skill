"use strict";
// Pure presentation: only reads same-origin plan JSON. It never fetches weather APIs or writes data.
(() => {
  const page = document.body.dataset.page;
  const $ = (id) => document.getElementById(id);
  const el = (tag, text, className) => {
    const n = document.createElement(tag);
    if (text !== undefined && text !== null) n.textContent = String(text);
    if (className) n.className = className;
    return n;
  };
  const add = (parent, child) => { parent.appendChild(child); return child; };
  const label = (v) => v === null || v === undefined || v === "" ? "待定" : String(v);
  const validSlug = (s) => /^[a-z0-9][a-z0-9-]{0,62}$/.test(s);
  const statusText = { draft: "规划中", confirmed: "目标已确认", needs_review: "需要复核" };
  const weatherText = { pending: "尚未检查天气", unavailable: "天气查询不可用", current: "已有天气快照", stale: "天气需复核" };
  const levelText = { unknown: "未知", suitable: "较适合", caution: "需谨慎", unsuitable: "不适合" };
  const base = new URL("./", window.location.href);
  const href = (relative) => new URL(relative, base).toString();
  async function read(relative) {
    const response = await fetch(href(relative), { cache: "no-store" });
    if (!response.ok) throw new Error("无法读取 " + relative + " (HTTP " + response.status + ")");
    return response.json();
  }
  function safeUrl(url) {
    try { const u = new URL(url); return u.protocol === "https:" || u.protocol === "http:" ? u.href : null; }
    catch { return null; }
  }
  function badge(text, kind = "") { return el("span", text, "pill " + kind); }
  function fact(container, title, value) {
    const box = add(container, el("div"));
    add(box, el("div", title, "info-label"));
    add(box, el("div", label(value), "info-value"));
  }
  function panel(root, title) {
    const box = add(root, el("section", null, "panel"));
    add(box, el("h2", title));
    return box;
  }
  function list(root, items, formatter = (x) => x) {
    const ul = add(root, el("ul", null, "item-list"));
    items.forEach((x) => add(ul, el("li", formatter(x))));
    return ul;
  }
  function meaningfulDate(p) { return p.constraints?.date || p.constraints?.date_range || "日期待定"; }
  function activeWeather(p) { return p.weather?.assessment || {level:"unknown"}; }
  async function home() {
    const status = $("status");
    try {
      const index = await read("plans/index.json");
      const ids = index.plans;
      if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !validSlug(id)) || new Set(ids).size !== ids.length) {
        throw new Error("计划目录格式错误");
      }
      const settled = await Promise.allSettled(ids.map((id) => read("plans/" + id + "/activity.json")));
      const plans = [];
      settled.forEach((result, i) => {
        if (result.status === "fulfilled" && result.value.id === ids[i]) plans.push(result.value);
      });
      plans.sort((a,b) => (a.constraints?.date || "9999").localeCompare(b.constraints?.date || "9999"));
      $("plan-count").textContent = plans.length + " 份计划";
      const failed = ids.length - plans.length;
      status.textContent = failed ? failed + " 份计划暂时无法读取，请检查 JSON 文件。" : "每份计划有自己的 JSON 数据和固定预览链接。";
      if (failed) status.classList.add("error");
      const search = $("filter");
      const target = $("plan-list");
      function render() {
        const q = search.value.trim().toLowerCase();
        target.replaceChildren();
        const shown = plans.filter(p => [p.id,p.title,p.destination?.name,p.goals?.primary].join(" ").toLowerCase().includes(q));
        if (!shown.length) { add(target, el("p", plans.length ? "没有匹配的计划。" : "尚无可展示的计划。", "empty")); return; }
        shown.forEach((p) => {
          const a = add(target, el("a", null, "plan-card"));
          a.href = href("plan.html?id=" + encodeURIComponent(p.id));
          add(a, badge(p.example_only ? "演示计划" : statusText[p.status] || "计划", p.status === "needs_review" ? "caution" : ""));
          add(a, el("h3", p.title || p.id));
          add(a, el("p", (p.destination?.name || "目的地待定") + " · " + meaningfulDate(p)));
          add(a, el("p", p.goals?.primary || "主要目标待定"));
          const foot = add(a, el("div", null, "card-footer"));
          add(foot, el("span", weatherText[p.weather?.status] || "天气待定"));
          add(foot, el("span", "查看计划 →"));
        });
      }
      search.addEventListener("input", render);
      render();
    } catch (error) {
      status.textContent = "计划目录加载失败：" + error.message;
      status.classList.add("error");
    }
  }
  async function detail() {
    const status = $("detail-status");
    const id = new URLSearchParams(window.location.search).get("id") || "";
    if (!validSlug(id)) { status.textContent = "计划 ID 无效，请从计划目录打开。"; status.classList.add("error"); return; }
    try {
      const p = await read("plans/" + id + "/activity.json");
      if (p.id !== id) throw new Error("计划 ID 与文件内容不一致");
      $("detail-title").textContent = p.title || id;
      document.title = (p.title || id) + " · Hike Planner";
      const chips = $("detail-chips");
      [p.example_only ? "示例数据" : statusText[p.status] || "规划中", "v" + p.revision, meaningfulDate(p)].forEach(t => add(chips, el("span", t)));
      $("detail-summary").textContent = p.goals?.primary || "尚未确定主要目标";
      status.textContent = "本页面只展示仓库中保存的活动快照，不会自动重新查询天气或修改计划。";
      const root = $("detail-content");
      const first = panel(root, "01 / 活动目标与约束");
      const grid = add(first, el("div", null, "info-grid"));
      fact(grid, "目的地", p.destination?.name);
      fact(grid, "选择状态", { fixed:"已固定",preferred:"倾向此地",undecided:"尚未确定" }[p.destination?.state] || "待定");
      fact(grid, "日期", meaningfulDate(p));
      fact(grid, "难度", p.constraints?.difficulty);
      fact(grid, "出发区域", p.constraints?.departure_area);
      fact(grid, "人数", p.constraints?.estimated_participants);
      fact(grid, "最晚返回", p.constraints?.latest_return);
      if (p.goals?.secondary?.length) { add(first, el("p","次要目标：","small")); list(first,p.goals.secondary); }
      if (p.constraints?.hard_rules?.length) { add(first, el("p","硬性限制：","small")); list(first,p.constraints.hard_rules); }
      const w = panel(root, "02 / 天气快照（不自动更新）");
      add(w,badge(weatherText[p.weather?.status] || "天气待定", p.weather?.status === "stale" ? "caution" : "neutral"));
      const assessment = activeWeather(p);
      const wg = add(w,el("div",null,"info-grid"));
      fact(wg,"规划判断",levelText[assessment.level] || "未知");
      fact(wg,"建议",assessment.recommendation);
      if (assessment.reason) add(w,el("p",assessment.reason));
      const snapshots = p.weather?.snapshots || [];
      if (snapshots.length) {
        const last = snapshots[snapshots.length-1];
        add(w,el("p","上次查询：" + label(last.checked_at) + " · 适用：" + label(last.valid_for),"small"));
        Object.entries(last.values || {}).forEach(([key,value]) => {
          const d = add(w,el("div",null,"info-grid")); fact(d,key,typeof value === "object" ? JSON.stringify(value) : value);
        });
        (last.sources || []).forEach(s => source(w,{claim:"天气来源",url:s,checked_at:last.checked_at,publisher:"来源页面"}));
      } else add(w,el("p","没有已核实的天气数据。需要由 Skill 在确认日期后查询并写入 JSON。","warning"));
      const options = panel(root,"03 / 候选目的地");
      const candidates = p.candidates || [];
      if (!candidates.length) add(options,el("p","目前没有待比较的候选地点。","empty"));
      else list(options,candidates,(x)=>label(x.name) + (x.reason ? " · " + x.reason : ""));

      // Additional planning content remains read-only; the Skill edits source JSON.
      if (p.route) {
        const routeBox = panel(root,"04 / 建议登山路线");
        add(routeBox,badge(p.route.status === "proposed" ? "路线草案 · 未实地复核" : label(p.route.status),"caution"));
        if (p.route.type) add(routeBox,el("p",p.route.type));
        if (p.route.duration_reference) add(routeBox,el("p",p.route.duration_reference,"warning"));
        (p.route.sections || []).forEach((section) => {
          add(routeBox,el("h3",section.name||"路线段"));
          const ul=add(routeBox,el("ul",null,"item-list"));
          (section.stops||[]).forEach((stop,index) => {
            const li=add(ul,el("li"));
            add(li,el("strong",(index+1)+". "+label(stop.name)));
            if(stop.note)add(li,el("div",stop.note,"small"));
          });
        });
        if (p.route.alternatives?.length) {
          add(routeBox,el("h3","备用与退出方案"));
          const ul=add(routeBox,el("ul",null,"item-list"));
          p.route.alternatives.forEach(x=>{
            const li=add(ul,el("li"));
            add(li,el("strong",label(x.name)));
            add(li,el("div",label(x.when),"small"));
            add(li,el("div",label(x.action)));
          });
        }
      }
      if(p.transport){
        const t=panel(root,"05 / 交通与缆车备选");
        if(p.transport.status === "reference_only")add(t,badge("参考线路 · 出发日时刻未确认","caution"));
        for(const [title,steps] of [["去程",p.transport.inbound||[]],["返程",p.transport.outbound||[]]]){
          if(!steps.length)continue;
          add(t,el("h3",title));
          const ul=add(t,el("ul",null,"item-list"));
          steps.forEach(s=>{
            const li=add(ul,el("li"));
            add(li,el("strong",label(s.name)));
            add(li,el("div",label(s.note),"small"));
          });
        }
        if(p.transport.cable){
          add(t,el("h3","缆车备用"));
          add(t,el("p",label(p.transport.cable.normal_hours)));
          add(t,el("p",label(p.transport.cable.note),"small"));
        }
        if(p.transport.pass_note)add(t,el("p","车票核查："+p.transport.pass_note,"warning"));
      }
      if(p.safety){
        const safe=panel(root,"06 / 风险提示与出发前核查");
        (p.safety.alerts||[]).forEach(a=>{
          const alert=add(safe,el("div",null,a.level==="caution"?"warning":"item-list"));
          add(alert,el("strong",label(a.title)));
          add(alert,el("div",label(a.note),"small"));
        });
        if(p.safety.checklist?.length){
          add(safe,el("h3","出发前待办"));
          list(safe,p.safety.checklist,x=>"□ "+label(x));
        }
      }
      if(p.pending_decisions?.length){
        const pending=panel(root,"07 / 仍需确认");
        list(pending,p.pending_decisions,x=>"○ "+label(x));
      }
      const refs=panel(root,"08 / 核实来源");
      const evidence=p.evidence||[];
      if(!evidence.length)add(refs,el("p","没有附带核实记录，示例信息不能当作实时依据。","empty"));
      else evidence.forEach(x=>source(refs,x));
      const change=panel(root,"09 / 版本与修改记录");
      const edits=p.changes||[];
      if(!edits.length)add(change,el("p","尚无已确认的修改。","empty"));
      else list(change,edits,x=>"v"+x.revision+" · "+x.field+" · "+label(x.reason)+" · "+label(x.at));
    } catch(error) {status.textContent="计划加载失败：" + error.message;status.classList.add("error");}
  }
  function source(root,item) {
    const url=safeUrl(item.url);
    if (url) { const a=add(root,el("a",item.claim||item.publisher||"查看来源","source-link"));a.href=url;a.target="_blank";a.rel="noopener noreferrer"; }
    else add(root,el("p",item.claim||"来源地址无效","small"));
    add(root,el("div",(item.publisher||"") + " · 核实于 " + label(item.checked_at),"small"));
  }
  if (page === "home") home();
  if (page === "detail") detail();
})();
