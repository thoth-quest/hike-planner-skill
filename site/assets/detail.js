"use strict";
// Day-trip plan viewer. Browses only local JSON; never writes data or calls weather services.
(() => {
  const $ = (id) => document.getElementById(id);
  const el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text !== null && text !== undefined) n.textContent = String(text);
    if (cls) n.className = cls;
    return n;
  };
  const add = (parent, child) => { parent.appendChild(child); return child; };
  const text = (v) => v === undefined || v === null || v === "" ? "待确认" : String(v);
  const slugOK = (v) => /^[a-z0-9][a-z0-9-]{0,62}$/.test(v);
  const safeUrl = (v) => { try { const u = new URL(v); return /^(https?:)$/.test(u.protocol) ? u.href : null; } catch { return null; } };
  const statusMap = { draft: "规划草稿", confirmed: "计划确认", needs_review: "需要复核" };
  const weatherMap = { pending: "天气待核实", unavailable: "天气不可查", current: "已保存预报", stale: "天气已过期" };
  const pathType = { fixed: "目的地已确定", preferred: "目的地待确认", undecided: "目的地待选" };
  const evidenceById = (p, id) => p.evidence?.find((s) => s.id === id && safeUrl(s.url));
  function linkedTitle(parent, title, p, ids) {
    const source = (Array.isArray(ids) ? ids : [ids]).map(id => evidenceById(p,id)).find(Boolean);
    if (!source) return add(parent,el("span",title));
    const a = add(parent,el("a",title+" ↗","inline-source"));
    a.href = safeUrl(source.url);
    a.target = "_blank"; a.rel = "noopener noreferrer";
    a.title = (source.publisher || "资料来源") + " · 核查于 " + text(source.checked_at);
    return a;
  }
  function paragraph(parent, value, cls = "inline-note") { return add(parent,el("p",value,cls)); }
  function card(root,title) {
    const c = add(root,el("section",null,"panel"));
    const top = add(c,el("div",null,"panel-head"));
    add(top,el("h2",title));
    return c;
  }
  function field(root,label,value) {
    const box = add(root,el("div"));
    add(box,el("div",label,"info-label"));
    add(box,el("div",text(value),"info-value"));
  }
  function list(root,lines) {
    const ul = add(root,el("ul",null,"simple-list"));
    lines.forEach(line => add(ul,el("li",line)));
  }
  function tabs() {
    const nodes = [...document.querySelectorAll('[role="tab"]')];
    const activate = (tab,focus=false) => {
      nodes.forEach(n => {
        const current = n === tab;
        n.setAttribute("aria-selected",current?"true":"false");
        n.tabIndex = current?0:-1;
        const target = $(n.getAttribute("aria-controls"));
        if (target) target.hidden = !current;
      });
      if(focus) tab.focus();
    };
    nodes.forEach((tab,index)=>{
      tab.addEventListener("click",()=>activate(tab));
      tab.addEventListener("keydown",(e)=>{
        const direction = e.key==="ArrowRight"?1:e.key==="ArrowLeft"?-1:0;
        if(!direction && !["Home","End"].includes(e.key)) return;
        e.preventDefault();
        const next=e.key==="Home"?0:e.key==="End"?nodes.length-1:(index+direction+nodes.length)%nodes.length;
        activate(nodes[next],true);
      });
    });
  }
  const parseTime = v => /^([01]\d|2[0-3]):[0-5]\d$/.test(v||"") ? Number(v.slice(0,2))*60+Number(v.slice(3)) : null;
  const timeText = n => Number.isFinite(n) && n>=0 && n<1440
    ? String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0") : "跨日";
  function renderRoute(p) {
    const root = $("panel-route");
    if(!p.route?.sections?.length && !p.transport?.inbound?.length) {
      const c=card(root,"尚未安排路线");
      paragraph(c,"这个计划尚无登山线路。等 Skill 确认一日路线后，时间轴会出现在这里。");
      return;
    }
    const stages=p.route?.sections||[];
    const trail=stages.flatMap(s=>(s.stops||[]).map(stop=>({...stop,group:s.name})));
    const before=(p.transport?.inbound||[]).filter(x=>x.preview_phase!=="hike");
    const after=p.transport?.outbound||[];
    const timing=p.preview_timing||{};
    const base=parseTime(timing.anchor_time)||480;
    let anchor=base,shift=0,expanded=false;
    const c=card(root,"一日路线时间轴");
    const plannerHead=c.querySelector(".panel-head");
    add(plannerHead,el("span","估算排程","pill caution"));
    const toolbar=add(c,el("div",null,"time-toolbar"));
    const controls=add(toolbar,el("div"));
    const label=add(controls,el("label",timing.anchor_label?.replace("（假设）","")||"巴士站预计抵达"));
    label.htmlFor="arrival-time";
    const box=add(controls,el("div",null,"time-toolbar-controls"));
    const input=add(box,el("input"));
    input.type="time";input.id="arrival-time";input.value=timeText(base);input.step=300;
    const minus=add(box,el("button","−30 分钟"));
    const plus=add(box,el("button","+30 分钟"));
    const reset=add(box,el("button","重置"));
    [minus,plus,reset].forEach(x=>x.type="button");
    add(toolbar,el("div","日期未定 · 更改只影响预览，不保存","sub-text"));
    const headline=add(c,el("div",null,"planner-top"));
    const windowText=add(headline,el("div",null,"day-clock"));
    const offText=add(headline,el("div","时间偏移 0 分钟","sub-text"));
    const overflow=add(c,el("div",null,"timeline-day-warning"));
    overflow.hidden=true;
    const line=add(c,el("div",null,"journey"));
    const expand=add(c,el("button","展开全部节点","timeline-expand"));
    expand.type="button";
    const offset=item=>Number.isInteger(item.offset_minutes)?item.offset_minutes:null;
    const last=offset(after.at(-1)) ?? offset(trail.at(-1));
    const total=last!==null && last>=0? Math.floor(last/60)+" 小时"+(last%60?" "+last%60+" 分":"") : "待核实";
    const clock=item=> offset(item)===null?"—":timeText(anchor+shift+offset(item));
    function paint() {
      windowText.textContent="";
      add(windowText,el("span",timeText(anchor+shift)));
      add(windowText,document.createTextNode(" → "));
      add(windowText,el("span",last===null?"待确认":timeText(anchor+shift+last)));
      add(windowText,el("span","   ·   "+total,"sub-text"));
      offText.textContent=shift===0?"未偏移":"整体偏移 "+(shift>0?"+":"")+shift+" 分";
      overflow.hidden = !(last!==null && (anchor+shift+last>=1440 || anchor+shift+Math.min(-35,offset(before[0])??0)<0));
      overflow.textContent="当前偏移超出了同一天的时间范围。此版本只支持日归，请调整时刻。";
      line.replaceChildren();
      const addPhase=(heading,num,kind,items)=>{
        if(!items.length)return;
        const block=add(line,el("section",null,"journey-block"));
        const headingRow=add(block,el("div",null,"journey-label"));
        const title=add(headingRow,el("div",null,"journey-name"));
        add(title,el("span",num,"journey-index"));
        add(title,el("span",heading));
        add(headingRow,el("span",kind==="trail"?"步行登山":"公共交通","journey-category"));
        const ul=add(block,el("ol",null,"timeline"));
        const shown=kind==="trail"&&!expanded?items.filter((x,i)=>x.key_point||i===0||i===items.length-1):items;
        let prevGroup="";
        shown.forEach(item=>{
          if(kind==="trail" && item.group!==prevGroup) {
            const group=add(ul,el("li",item.group,"timeline-group")); group.setAttribute("aria-label","路段");
            prevGroup=item.group;
          }
          const li=add(ul,el("li",null,"timeline-item"+(item.key_point?" highlight":"")));
          add(li,el("span",clock(item),"timeline-time"+(clock(item)==="—"?" unknown":"")));
          const name=add(li,el("h3"));
          linkedTitle(name,item.name||"路线节点",p,item.source_ids||item.source_id);
          if(item.note)paragraph(li,item.note);
          if(offset(item)===null)paragraph(li,"尚无可核实的时刻", "inline-note");
        });
      };
      addPhase("登山前交通","01","transit",before);
      addPhase("登山路线","02","trail",trail);
      addPhase("登山后交通","03","transit",after);
      expand.hidden=trail.length<5;
      expand.textContent=expanded?"收起次要节点":"显示完整 "+trail.length+" 个路线节点";
      minus.disabled=shift<=-180;plus.disabled=shift>=180;
    }
    minus.addEventListener("click",()=>{shift -= 30;paint();});
    plus.addEventListener("click",()=>{shift += 30;paint();});
    reset.addEventListener("click",()=>{anchor=base;shift=0;input.value=timeText(base);paint();});
    input.addEventListener("change",()=>{const n=parseTime(input.value);if(n!==null){anchor=n;paint();}});
    expand.addEventListener("click",()=>{expanded=!expanded;paint();});
    paint();
    const note=add(root,el("section",null,"quiet-card"));
    add(note,el("div","关于路线与时间","quiet-card-title"));
    const pnote=add(note,el("p",p.route.duration_reference || timing.notice || "路线时间仍待核实"));
    add(pnote,document.createTextNode(" "));
    linkedTitle(pnote,"路线依据",p,p.route.duration_source);
    if(p.route.alternatives?.length){
      const details=add(note,el("details"));
      add(details,el("summary","备用与撤退方案（"+p.route.alternatives.length+"）"));
      p.route.alternatives.forEach(a=>{
        const row=add(details,el("div",null,"note-line"));
        add(row,el("strong",a.name));
        paragraph(row,text(a.when)+"；"+text(a.action));
      });
    }
    if(p.transport?.cable) {
      const row=add(note,el("div",null,"note-line"));
      linkedTitle(row,"缆车备用",p,p.transport.cable.source_id);
      paragraph(row,p.transport.cable.note);
      paragraph(row,p.transport.cable.normal_hours);
    }
  }
  function renderOverview(p) {
    const root=$("panel-overview");
    const c=card(root,"计划信息");
    const grid=add(c,el("div",null,"info-grid"));
    field(grid,"活动类型","日归 · 当天往返");
    field(grid,"日期",p.constraints?.date||p.constraints?.date_range);
    field(grid,"目的地",p.destination?.name);
    field(grid,"状态",p.destination?.state && ({fixed:"已选定",preferred:"倾向地点",undecided:"待选"}[p.destination.state]));
    field(grid,"难度",p.constraints?.difficulty);
    field(grid,"出发区域",p.constraints?.departure_area);
    field(grid,"人数",p.constraints?.estimated_participants);
    field(grid,"返回限制",p.constraints?.latest_return);
    if(p.goals?.primary){
      const goal=add(c,el("div",null,"note-line"));
      add(goal,el("strong","主要目标"));
      paragraph(goal,p.goals.primary);
    }
    if(p.goals?.secondary?.length)list(c,p.goals.secondary);
    if(p.constraints?.hard_rules?.length){
      const rules=card(root,"活动限制");
      list(rules,p.constraints.hard_rules);
    }
    if(p.pending_decisions?.length){
      const pending=card(root,"下一步确认");
      list(pending,p.pending_decisions);
    }
    if(p.candidates?.length){
      const candidates=card(root,"备选目的地");
      p.candidates.forEach(x=>{
        const row=add(candidates,el("div",null,"note-line"));
        linkedTitle(row,x.name,p,x.source_id);
        paragraph(row,text(x.reason));
      });
    }
  }
  function renderWeather(p) {
    const root=$("panel-weather");
    const c=card(root,"天气条件");
    add(c,el("span",weatherMap[p.weather?.status]||"天气待核实","pill caution"));
    const a=p.weather?.assessment||{};
    if(a.reason)paragraph(c,a.reason);
    if(a.recommendation)paragraph(c,"建议："+a.recommendation);
    const snapshots=p.weather?.snapshots||[];
    if(snapshots.length){
      const latest=snapshots.at(-1);
      paragraph(c,"核查于："+text(latest.checked_at)+"；适用："+text(latest.valid_for));
      const grid=add(c,el("div",null,"info-grid"));
      Object.entries(latest.values||{}).forEach(([key,value])=>field(grid,key,typeof value==="object"?JSON.stringify(value):value));
      (latest.sources||[]).filter(x=>safeUrl(x)).forEach(url=>{
        const a=add(c,el("a","查看天气原始来源 ↗","inline-source"));
        a.href=safeUrl(url);a.rel="noopener noreferrer";a.target="_blank";
      });
    } else paragraph(c,"尚未确定日期，无法给出该日的天气与日落判断。");
    if(p.safety?.alerts?.length){
      const risk=card(root,"路线风险与公告");
      p.safety.alerts.forEach(x=>{
        const row=add(risk,el("div",null,"note-line"));
        const title=add(row,el("h3"));
        linkedTitle(title,x.title,p,x.source_id);
        paragraph(row,x.note);
      });
    }
    if(p.safety?.checklist?.length){
      const checks=card(root,"出发前检查");
      const ul=add(checks,el("ul",null,"check-list"));
      p.safety.checklist.forEach(x=>{
        const li=add(ul,el("li"));
        add(li,el("span",null,"check-box"));
        add(li,el("span",x));
      });
    }
  }
  function renderHistory(p) {
    const root=$("panel-history");
    const c=card(root,"版本记录");
    paragraph(c,"当前 v"+text(p.revision)+" · 更新时间 "+text(p.updated_at));
    if(!p.changes?.length)paragraph(c,"尚无正式修改记录。");
    (p.changes||[]).forEach(change=>{
      const row=add(c,el("div",null,"note-line"));
      add(row,el("strong","v"+change.revision+" · "+text(change.field)));
      paragraph(row,text(change.reason)+" · "+text(change.at));
    });
    const infoCard=add(root,el("section",null,"quiet-card"));
    add(infoCard,el("div","数据与页面的边界","quiet-card-title"));
    paragraph(infoCard,"网页中的时间偏移仅用于预览，不会写回 JSON。确认日期、更新天气及交通后，由 Skill 修改对应计划并保留记录。");
  }
  async function main() {
    tabs();
    const state=$("detail-status");
    const id=new URLSearchParams(location.search).get("id")||"";
    if(!slugOK(id)){state.textContent="计划 ID 无效，请返回列表重新打开。";state.classList.add("error");return;}
    try{
      const url=new URL("./plans/"+id+"/activity.json",location.href);
      const res=await fetch(url,{cache:"no-store"});
      if(!res.ok)throw new Error("HTTP "+res.status);
      const p=await res.json();
      if(p.id!==id)throw new Error("计划 ID 与数据不匹配");
      if(p.trip_type && p.trip_type!=="day_trip"){
        state.textContent="该计划不是日归类型，当前版本暂不提供多日视图。";
        return;
      }
      $("detail-title").textContent=p.title||id;
      document.title=(p.title||id)+" · Hike Planner";
      $("trip-status").textContent=p.example_only?"示例计划":statusMap[p.status]||"草稿";
      $("detail-summary").textContent=p.goals?.primary||"目标待定";
      const chips=$("detail-chips");
      const summary=[
        ["计划","日归 · 一天"],
        ["日期",p.constraints?.date||p.constraints?.date_range||"日期待定"],
        ["天气",weatherMap[p.weather?.status]||"待检查"],
        ["版本","v"+text(p.revision)]
      ];
      summary.forEach(([k,v])=>{
        const node=add(chips,el("span"));
        add(node,el("strong",k+": "));
        add(node,document.createTextNode(text(v)));
      });
      state.textContent="已读取当前计划 · 时间调整仅供预览";
      renderRoute(p);
      renderOverview(p);
      renderWeather(p);
      renderHistory(p);
    } catch(error){
      state.textContent="加载失败："+error.message;
      state.classList.add("error");
    }
  }
  main();
})();
