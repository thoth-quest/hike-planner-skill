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
  function badge(text, kind = "") { return el("span", text, "pill " + kind); }
  function meaningfulDate(p) { return p.constraints?.date || p.constraints?.date_range || "日期待定"; }
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
          add(a, badge(p.example_only ? "日归 · 演示" : "日归 · "+(statusText[p.status] || "计划"), p.status === "needs_review" ? "caution" : ""));
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
  if (page === "home") home();
})();
