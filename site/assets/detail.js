"use strict";
// Read-only presentation. The Skill owns weather checks and JSON updates.
(() => {
  const $ = (id) => document.getElementById(id);
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== null && text !== undefined) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  };
  const put = (parent, child) => { parent.appendChild(child); return child; };
  const val = (x) => x === undefined || x === null || x === "" ? "待定" : String(x);
  const statuses = { draft:"规划中", confirmed:"目标已确认", needs_review:"需要复核" };
  const weatherStates = { pending:"待查询", unavailable:"查询不可用", current:"已保存快照", stale:"需要复核" };
  const slug = /^[a-z0-9][a-z0-9-]{0,62}$/;
  const isLink = (url) => {
    try { const u = new URL(url); return ["https:", "http:"].includes(u.protocol) ? u.href : null; }
    catch { return null; }
  };
  const safeSources = (plan, ids) => {
    const list = Array.isArray(ids) ? ids : ids ? [ids] : [];
    return list.map(id => plan.evidence?.find(e => e.id === id && isLink(e.url))).filter(Boolean);
  };
  function linkedTitle(parent, title, plan, sourceIds) {
    const source = safeSources(plan, sourceIds)[0];
    if (!source) return put(parent, make("strong", title));
    const a = put(parent, make("a", title, "inline-source"));
    a.href = isLink(source.url); a.rel = "noopener noreferrer"; a.target = "_blank";
    a.title = (source.publisher || "资料来源") + " · 核查于 " + val(source.checked_at);
    return a;
  }
  const section = (root, title) => {
    const n = put(root, make("section", null, "panel slim-panel"));
    put(n, make("h2", title));
    return n;
  };
  const small = (root, t) => put(root, make("p", t, "inline-note"));
  const info = (root, name, value) => {
    const box = put(root, make("div"));
    put(box, make("div", name, "meta-label"));
    put(box, make("div", val(value), "meta-value"));
    return box;
  };
  const list = (root, items) => {
    const ul = put(root, make("ul",null,"simple-list"));
    items.forEach(x=>put(ul,make("li",typeof x==="string"?x:val(x))));
  };
  function installTabs() {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const ids = tabs.map(t=>t.id.replace("tab-",""));
    const choose = (id, focus=false) => {
      tabs.forEach((tab,i) => {
        const selected = ids[i] === id;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.tabIndex = selected ? 0 : -1;
        $(tab.getAttribute("aria-controls")).hidden = !selected;
        if (selected && focus) tab.focus();
      });
    };
    tabs.forEach((tab,index)=>{
      tab.addEventListener("click",()=>choose(ids[index]));
      tab.addEventListener("keydown",(e)=>{
        const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if(!step && !["Home","End"].includes(e.key)) return;
        e.preventDefault();
        const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length-1 :
          (index+step+tabs.length)%tabs.length;
        choose(ids[next],true);
      });
    });
  }
  function minuteOf(text) {
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(text||""))return null;
    const [h,m] = text.split(":").map(Number);
    return h*60+m;
  }
  function asTime(n) {
    if (!Number.isFinite(n)) return "待定";
    const day = Math.floor(n/1440);
    const d = ((n%1440)+1440)%1440;
    const h = String(Math.floor(d/60)).padStart(2,"0");
    const m = String(d%60).padStart(2,"0");
    return h+":"+m+(day>0?" +"+day+"天":day<0?" -"+Math.abs(day)+"天":"");
  }
  function renderRoute(plan) {
    const root=$("panel-route");
    const stops=(plan.route?.sections||[]).flatMap((s)=>s.stops.map(stop=>({...stop,section_name:s.name})));
    const inbound=(plan.transport?.inbound||[]).filter(x=>x.preview_phase!=="hike");
    const outbound=plan.transport?.outbound||[];
    const timing=plan.preview_timing||{};
    let anchor=minuteOf(timing.anchor_time || "08:00") ?? 480;
    let shift=0;
    let expanded=false;
    const ctrl=section(root,"行程时间轴");
    if (stops.length===0 && inbound.length===0 && outbound.length===0) {
      small(ctrl,"尚未安排路线与交通，等 Skill 更新计划后即可展示时间轴。");
      return;
    }
    const note=put(ctrl,make("div",null,"plan-alert"));
    put(note,make("strong","时间仅为行程模拟，不是已确认的发车时刻或实测步速。"));
    put(note,make("div",timing.notice || "活动日期、同行人员和班次未确认。调整时间仅影响页面预览。"));
    const controlRow=put(ctrl,make("div",null,"timeline-controls"));
    const left=put(controlRow,make("div",null,"controls-left"));
    const field=put(left,make("div",null,"control-group"));
    const title=put(field,make("label",timing.anchor_label||"预计到达巴士终点"));
    title.htmlFor="anchor-time";
    const input=put(field,make("input",null,"time-field"));
    input.type="time";input.id="anchor-time";input.value=asTime(anchor).slice(0,5);
    input.step=300;
    const minus=put(left,make("button","− 30 分钟","control-button"));
    const plus=put(left,make("button","+ 30 分钟","control-button"));
    const reset=put(left,make("button","重置","control-button"));
    [minus,plus,reset].forEach(b=>b.type="button");
    const delta=put(controlRow,make("span","时间偏移 0 分钟","inline-note"));
    const summary=put(ctrl,make("div",null,"timeline-summary"));
    const timeline=put(ctrl,make("div"));
    const expand=put(ctrl,make("button","展开全部节点","control-button"));
    expand.type="button";
    const offsetOf=(item)=> Number.isInteger(item.offset_minutes)?item.offset_minutes:null;
    const at=(item)=>offsetOf(item)===null?"—":asTime(anchor+shift+offsetOf(item));
    const last=outbound.length ? offsetOf(outbound[outbound.length-1]) : stops.length ? offsetOf(stops[stops.length-1]) : null;
    function render() {
      delta.textContent="时间偏移 "+(shift>0?"+":"")+shift+" 分钟 · 仅本次浏览";
      summary.replaceChildren();
      info(summary,"巴士站预计抵达",asTime(anchor+shift));
      info(summary,"预计完成往返",last===null?"待估":asTime(anchor+shift+last));
      if(last!==null)info(summary,"模拟总时长",Math.floor((last)/60)+"小时"+(last%60?last%60+"分":""));
      timeline.replaceChildren();
      function phase(header,icon,items,kind){
        if(!items.length)return;
        const group=put(timeline,make("section",null,"journey-section"));
        const hd=put(group,make("div",null,"journey-head"));
        const name=put(hd,make("h3"));
        put(name,make("span",icon,"phase-icon"));
        put(name,document.createTextNode(header));
        put(hd,make("span",kind==="trail"?"登山":"交通","pill "+(kind==="trail"?"":"neutral")));
        const body=put(group,make("div",null,"journey-timeline"));
        let prior="";
        const shown=kind==="trail" && !expanded
          ?items.filter((x,i)=>x.key_point===true||i===0||i===items.length-1) :items;
        for (const item of shown) {
          if (kind==="trail" && item.section_name!==prior && (expanded || item.section_name)) {
            put(body,make("div",item.section_name,"timeline-bucket"));
            prior=item.section_name;
          }
          const pt=put(body,make("div",null,"timeline-point "+(item.key_point?"key":"")));
          put(pt,make("div",at(item),"timeline-time"+(offsetOf(item)===null?" unknown":"")));
          const heading=put(pt,make("p",null,"timeline-heading"));
          linkedTitle(heading,item.name||"未命名节点",plan,item.source_ids||item.source_id);
          if(item.note) put(pt,make("p",item.note,"timeline-description"));
          if(kind==="before" && offsetOf(item)===null)
            put(pt,make("p","无确定出发站或车次，暂不能换算到达时间。","timeline-description"));
        }
      }
      phase("登山前 · 交通接驳","↗",inbound,"before");
      phase("登山路线 · 上山至下山","▲",stops,"trail");
      phase("登山后 · 返程交通","↙",outbound,"after");
      expand.hidden = stops.length===0;
      expand.textContent=expanded?"只显示主要节点":"展开全部 "+stops.length+" 个路线节点";
      minus.disabled=shift<=-360;plus.disabled=shift>=360;
    }
    minus.addEventListener("click",()=>{shift-=30;render()});
    plus.addEventListener("click",()=>{shift+=30;render()});
    reset.addEventListener("click",()=>{shift=0;input.value=timing.anchor_time||"08:00";anchor=minuteOf(input.value)??480;render()});
    input.addEventListener("change",()=>{const m=minuteOf(input.value);if(m!==null){anchor=m;render()}});
    expand.addEventListener("click",()=>{expanded=!expanded;render()});
    render();
    const sourceIds=plan.route?.duration_source;
    const caveat=section(root,"路线说明与备用方案");
    if(plan.route?.duration_reference) {
      const p=put(caveat,make("p"));
      put(p,document.createTextNode(plan.route.duration_reference+" "));
      linkedTitle(p,"参考路线资料 ↗",plan,sourceIds);
    }
    const alts=plan.route?.alternatives||[];
    if(alts.length) {
      const details=put(caveat,make("details"));
      put(details,make("summary","查看 "+alts.length+" 个备用与撤退方案"));
      for(const x of alts) {
        const p=put(details,make("div",null,"note-line"));
        put(p,make("strong",val(x.name)));
        small(p,val(x.when)+"；"+val(x.action));
      }
    }
    if (plan.transport?.cable) {
      const p=put(caveat,make("div",null,"note-line"));
      linkedTitle(p,"缆车备用",plan,plan.transport.cable.source_id);
      small(p,plan.transport.cable.note);
      small(p,plan.transport.cable.normal_hours);
    }
    if(plan.transport?.pass_note)small(caveat,"车票： "+plan.transport.pass_note);
  }
  function renderOverview(p) {
    const root=$("panel-overview");
    const card=section(root,"目标与约束");
    const infoGrid=put(card,make("div",null,"metadata"));
    info(infoGrid,"活动日期",p.constraints?.date||p.constraints?.date_range);
    info(infoGrid,"难度",p.constraints?.difficulty);
    info(infoGrid,"出发范围",p.constraints?.departure_area);
    info(infoGrid,"预计人数",p.constraints?.estimated_participants);
    info(infoGrid,"最晚返回",p.constraints?.latest_return);
    const place=put(card,make("div",null,"note-line"));
    linkedTitle(place,p.destination?.name||"目的地待定",p,p.destination?.source);
    if(p.goals?.primary) {
      const goal=put(card,make("div",null,"note-line"));
      put(goal,make("strong","主要目标"));
      small(goal,p.goals.primary);
    }
    if(p.goals?.secondary?.length)list(card,p.goals.secondary);
    if(p.constraints?.hard_rules?.length){
      const rules=section(root,"必须遵守的限制");
      list(rules,p.constraints.hard_rules);
    }
    if(p.pending_decisions?.length){
      const pending=section(root,"待确认事项");
      list(pending,p.pending_decisions);
    }
    if(p.candidates?.length){
      const candidates=section(root,"候选地点");
      p.candidates.forEach(x=>{
        const line=put(candidates,make("div",null,"note-line"));
        linkedTitle(line,x.name,p,x.source_id);
        if(x.reason)small(line,x.reason);
      });
    }
  }
  function renderWeather(p) {
    const root=$("panel-weather");
    const weather=section(root,"天气快照");
    const a=p.weather?.assessment||{};
    put(weather,make("span",({pending:"尚未查询",unavailable:"查询不可用",current:"已核实快照",stale:"需重新检查"})[p.weather?.status]||"待查询","pill caution"));
    if(a.reason)small(weather,a.reason);
    if(a.recommendation)small(weather,"建议："+a.recommendation);
    const snapshots=p.weather?.snapshots||[];
    if(snapshots.length){
      const last=snapshots[snapshots.length-1];
      small(weather,"核查于 "+val(last.checked_at)+" · 适用 "+val(last.valid_for));
      Object.entries(last.values||{}).forEach(([name,value])=>{
        const line=put(weather,make("div",null,"note-line"));
        put(line,make("strong",name+"："+(typeof value==="object"?JSON.stringify(value):val(value))));
      });
      const source=last.sources?.find(u=>isLink(u));
      if(source){const a=put(weather,make("a","天气数据来源 ↗","inline-source"));a.href=isLink(source);a.target="_blank";a.rel="noopener noreferrer";}
    }else small(weather,"日期未确定或尚未核查，不显示任何假设天气。");
    const alerts=p.safety?.alerts||[];
    if(alerts.length){
      const safe=section(root,"路线风险与公告");
      alerts.forEach(x=>{
        const row=put(safe,make("div",null,"note-line"));
        linkedTitle(row,x.title, p,x.source_id);
        small(row,x.note);
      });
    }
    const checklist=p.safety?.checklist||[];
    if(checklist.length){
      const checks=section(root,"出发前检查清单");
      const ul=put(checks,make("ul",null,"check-list"));
      checklist.forEach(x=>{
        const li=put(ul,make("li"));
        put(li,make("span",null,"check-box"));
        put(li,make("span",x));
      });
    }
  }
  function renderHistory(p) {
    const root=$("panel-history");
    const box=section(root,"计划修订记录");
    small(box,"当前数据版本：v"+val(p.revision)+"。只有 Skill 写入并提交 JSON 后，计划才会真正变化。");
    const changes=p.changes||[];
    if(!changes.length)small(box,"暂无修改记录。");
    changes.forEach(x=>{
      const item=put(box,make("div",null,"note-line"));
      put(item,make("strong","v"+x.revision+" · "+x.field));
      small(item,val(x.reason)+" · "+val(x.at));
    });
    small(box,"时间轴中的 +/−30 分钟与时刻输入不会写入版本记录，只供临时排程比较。");
  }
  async function run() {
    installTabs();
    const status=$("detail-status");
    const id=new URLSearchParams(window.location.search).get("id")||"";
    if(!slug.test(id)){status.textContent="计划 ID 不合法，请从计划目录打开";status.classList.add("error");return}
    try{
      const r=await fetch(new URL("./plans/"+id+"/activity.json",window.location.href),{cache:"no-store"});
      if(!r.ok)throw new Error("HTTP "+r.status);
      const p=await r.json();
      if(p.id!==id)throw new Error("计划 ID 与数据不符");
      $("detail-title").textContent=p.title||id;
      document.title=(p.title||id)+" · Hike Planner";
      [statuses[p.status]||"规划中","版本 "+val(p.revision),p.constraints?.date||p.constraints?.date_range||"日期待定"]
        .forEach(t=>put($("detail-chips"),make("span",t)));
      $("detail-summary").textContent=p.goals?.primary||"主要目标待确定";
      status.textContent="按计划 JSON 展示 · 时间轴可临时偏移 · 日期与班次均需核实";
      renderRoute(p);renderOverview(p);renderWeather(p);renderHistory(p);
    }catch(e){status.textContent="计划读取失败："+e.message;status.classList.add("error")}
  }
  run();
})();
