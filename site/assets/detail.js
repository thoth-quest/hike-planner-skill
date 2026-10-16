import { makeTimeline, clockText } from "./timeline.mjs";
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
  function renderRoute(p) {
    const root = $("panel-route");
    if (!p.route?.sections?.length && !p.transport?.inbound?.length) {
      paragraph(card(root,"路线尚未规划"),"等待 Skill 为此行程添加当天往返路线。");
      return;
    }
    const adjustments={};
    const serviceSelections={};
    let expanded=false;
    let opened=null;
    const pane=card(root,"行程时间轴");
    const label=pane.querySelector(".panel-head");
    add(label,el("span","节点级模拟","pill caution"));
    const help=add(pane,el("div",null,"notice"));
    add(help,el("strong","班次固定 · 延误逐点计算"));
    paragraph(help,"巴士、电车按 Skill 查到的固定发车时间显示，不随登山延误改变；步行、自驾可在具体节点增减耗时。若错过班次，显示换乘风险，不自动编造下一班。");
    const bar=add(pane,el("div",null,"simulation-bar"));
    const summary=add(bar,el("div","尚无节点调整","sub-text"));
    const reset=add(bar,el("button","清除全部调整","quiet-button"));
    reset.type="button";
    const timeline=add(pane,el("div",null,"journey"));
    const toggle=add(pane,el("button","展开全部路线节点","timeline-expand"));
    toggle.type="button";
    const warning=add(pane,el("div",null,"timeline-day-warning"));
    warning.hidden=true;
    warning.setAttribute("role","status");
    summary.setAttribute("aria-live","polite");
    if(p.preview_timing?.notice) paragraph(help,p.preview_timing.notice);
    function paint(){
      const schedule=makeTimeline(p,adjustments,serviceSelections);
      const count=schedule.changes.length;
      const selectedCount=Object.keys(serviceSelections).length;
      summary.textContent=selectedCount?selectedCount+" 个班次选择"+(count?" · "+count+" 处时间调整":" · 仅供本次预览"):count?count+" 处时间调整 · 仅供本次预览":"无延误模拟 · 按计划原始估算";
      reset.disabled=!count&&!selectedCount;
      warning.hidden=!schedule.overDay&&!schedule.hasMissedConnection&&!schedule.hasUnknownConnection;
      if(!warning.hidden){
        warning.textContent=(schedule.hasMissedConnection?"已错过固定班次，请由 Skill 重新查询可乘车次。 ":"")+
          (schedule.hasUnknownConnection?"前序到达时间未定，接驳尚不能确认。 ":"")+
          (schedule.overDay?"模拟时间超出当天，当前仅支持日归行程。":"");
      }
      timeline.replaceChildren();
      const showGroup=(name,num,type,items)=>{
        if(!items.length)return;
        const outer=add(timeline,el("section",null,"journey-block"));
        const heading=add(outer,el("div",null,"journey-label"));
        const title=add(heading,el("div",null,"journey-name"));
        add(title,el("span",num,"journey-index"));
        add(title,el("span",name));
        add(heading,el("span",type==="trail"?"山路 · 估算":type==="before"?"公共交通 / 出发":"公共交通 / 返程","journey-category"));
        const line=add(outer,el("ol",null,"timeline"));
        const visible=type==="trail"&&!expanded
          ?items.filter((x,index)=>x.key_point||index===0||index===items.length-1):items;
        let group="";
        visible.forEach(item=>{
          if(type==="trail"&&item.section_name!==group){
            group=item.section_name;
            add(line,el("li",group,"timeline-group"));
          }
          const li=add(line,el("li",null,"timeline-item"+(item.key_point?" highlight":"")));
          li.dataset.nodeId=item.id;
          const repaint=(action)=>{paint();const row=[...timeline.querySelectorAll(".timeline-item")].find(x=>x.dataset.nodeId===item.id);row?.querySelector(action)?.focus({preventScroll:true});};
          const stamped=item.kind==="transit" && (item.status==="fixed"||item.status==="connection_unknown")
            ?clockText(item.departure)+" → "+clockText(item.scheduled_arrival)
            :item.kind==="transit" && item.status==="connection_missed"
              ?(item.departure===null?"接驳中断":clockText(item.departure)+" · 已错过")
              :item.kind==="transit" && item.status==="pending"
                ?(item.mode==="scheduled_transit"?"班次待查":"时间待定") :item.arrival===null?"—":clockText(item.arrival);
          const adjustable=item.arrival!==null&&(item.kind==="trail"||item.kind==="transit"&&(item.mode==="driving"||item.mode==="walking"||item.mode==="flexible"));
          if(adjustable){
            const control=add(li,el("label",null,"timeline-time-control"));
            const input=add(control,el("input"));input.type="time";input.step="60";input.value=clockText(item.arrival)==="跨日"?"":clockText(item.arrival);input.setAttribute("aria-label","调整"+item.label+"的到达时间");
            add(control,el("span",clockText(item.arrival),"timeline-time"));
            const commitTime=()=>{
              if(!/^\\d{2}:\\d{2}$/.test(input.value))return;
              const [hours,minutes]=input.value.split(":").map(Number);
              const target=hours*60+minutes;
              // The selected time is relative to this node's current arrival,
              // which already includes delays on earlier nodes.
              const next=Math.max(item.min_delay??0,target-item.arrival);
              if(next)adjustments[item.id]=next;else delete adjustments[item.id];
              paint();
            };
            input.addEventListener("input",commitTime);
            input.addEventListener("change",commitTime);
          }else add(li,el("span",stamped,"timeline-time"+(item.arrival===null?" unknown":"")));
          const h=add(li,el("h3"));
          linkedTitle(h,item.label,p,item.source_id);
          if(item.note && item.kind==="transit") paragraph(li,item.note);
          if(item.status==="connection_unknown") {
            paragraph(li,"班次已核实 · 前序到达未定，接驳待确认。","issue-text");
          }else if(item.status==="pending" && item.kind==="transit") {
            paragraph(li,"未核实出发日车次；不使用估算时间替代时刻表。");
          }else if(item.status==="connection_missed"){
            paragraph(li,"前序行程未赶上该班，不能自动顺延固定发车时刻。","issue-text");
          }else if(item.status==="fixed"){
            paragraph(li,"固定班次"+(item.service_id?" · "+item.service_id:"")+
              (item.delay?" · 模拟到站晚点 "+(item.delay>0?"+":"")+item.delay+" 分钟":""));
          }else if(item.kind==="trail"){
            if(item.status==="illustrative")paragraph(li,"行程时间估算 · 尚未与实际到达车次衔接");
            if(item.note && (expanded||item.key_point))paragraph(li,item.note);
          }
          if(item.previous_services?.length||item.next_services?.length){
            const services=add(li,el("div",null,"service-options"));
            add(services,el("span","前后可选班次 · 点选后仅作本机模拟","service-options-title"));
            [...item.previous_services,...item.next_services].forEach(service=>{
              const selected=serviceSelections[item.id]===service.service_id||(!serviceSelections[item.id]&&item.service_id===service.service_id);
              const choice=add(services,el("button",clockText(service.departure)+" → "+clockText(service.arrival)+(service.service_id?" · "+service.service_id:""),"service-choice"+(selected?" selected":"")));
              choice.type="button";choice.setAttribute("aria-pressed",selected?"true":"false");
              choice.addEventListener("click",()=>{serviceSelections[item.id]=service.service_id;repaint(".service-choice")});
            });
          }else if(item.kind==="transit"&&item.mode==="scheduled_transit"&&item.status==="pending"){
            paragraph(li,"确定日期、出发站和目标时刻后，由 Skill 查询附近实际班次；未查询前不显示推测时刻。","sub-text");
          }
          const canAdjust=item.arrival!==null && (item.kind==="trail"||
            item.kind==="transit"&&(item.mode==="driving"||item.mode==="walking"||item.mode==="flexible"));
          if(!canAdjust)return;
          const actions=add(li,el("div",null,"node-actions"));
          const amount=item.delay;
          if(amount) add(actions,el("span","此节点"+(amount>0?" +":" ")+amount+" 分","node-delay"));
          const modify=add(actions,el("button",opened===item.id?"收起调整":"调整耗时","node-open"));
          modify.type="button";
          modify.setAttribute("aria-expanded",opened===item.id?"true":"false");
          modify.addEventListener("click",()=>{opened=opened===item.id?null:item.id;repaint(".node-open")});
          if(opened===item.id){
            const editor=add(li,el("div",null,"node-editor"));
            const explanation=item.kind==="transit"&&item.mode==="scheduled_transit"?
              "模拟本班次到站晚点；公开时刻表的发车和计划到达时间保持固定。":
              item.kind==="transit"?"模拟堵车或途中延误，只影响后续节点。":
              "调整后续路段耗时；缩短量不能超过下一段原始耗时，末节点只能增加停留。";
            paragraph(editor,explanation,"sub-text");
            const buttons=add(editor,el("div",null,"delay-buttons"));
            const minus=add(buttons,el("button","−15 分"));
            const plus=add(buttons,el("button","+15 分"));
            const clear=add(buttons,el("button","恢复","quiet-button"));
            [minus,plus,clear].forEach(x=>x.type="button");
            const minimum=item.min_delay??0;
            minus.disabled=amount<=minimum;plus.disabled=amount>=180;clear.disabled=!amount;
            const edit=(delta)=>{
              const next=Math.max(minimum,Math.min(180,amount+delta));
              if(next)adjustments[item.id]=next;else delete adjustments[item.id];
              repaint(delta>0?".delay-buttons button:nth-child(2)":".delay-buttons button");
            };
            minus.addEventListener("click",()=>edit(-15));
            plus.addEventListener("click",()=>edit(15));
            clear.addEventListener("click",()=>{delete adjustments[item.id];repaint(".node-open")});
          }
        });
      };
      showGroup("登山前 · 交通","01","before",schedule.before);
      showGroup("步行登山 · 当天往返","02","trail",schedule.trail);
      showGroup("登山后 · 交通","03","after",schedule.after);
      toggle.hidden=schedule.trail.length<5;
      toggle.textContent=expanded?"收起次要节点":"展开全部 "+schedule.trail.length+" 个登山节点";
    }
    reset.addEventListener("click",()=>{for(const key of Object.keys(adjustments))delete adjustments[key];for(const key of Object.keys(serviceSelections))delete serviceSelections[key];opened=null;paint()});
    toggle.addEventListener("click",()=>{expanded=!expanded;paint()});
    paint();
    const footer=add(root,el("section",null,"quiet-card"));
    add(footer,el("div","路线依据与备用方案","quiet-card-title"));
    if(p.route?.duration_reference) {
      const desc=add(footer,el("p",p.route.duration_reference));
      add(desc,document.createTextNode(" "));
      linkedTitle(desc,"参考路线",p,p.route.duration_source);
    }
    if(p.route?.alternatives?.length) {
      const details=add(footer,el("details"));
      add(details,el("summary","查看备用与撤退方案（"+p.route.alternatives.length+"）"));
      p.route.alternatives.forEach(a=>{
        const row=add(details,el("div",null,"note-line"));
        add(row,el("strong",a.name));
        paragraph(row,text(a.when)+"；"+text(a.action));
      });
    }
    if(p.transport?.cable){
      const t=add(footer,el("div",null,"note-line"));
      linkedTitle(t,"缆车备用",p,p.transport.cable.source_id);
      paragraph(t,p.transport.cable.note);
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
  function yen(value){return "¥"+Number(value).toLocaleString("ja-JP");}
  function renderCostItems(root,p){
    const costs=p.costs||{currency:"JPY",items:[]};
    const box=card(root,"费用估算");
    const included=(costs.items||[]).filter(x=>x.included!==false);
    const priced=included.filter(x=>Number.isInteger(x.amount_yen));
    const unknown=included.filter(x=>!Number.isInteger(x.amount_yen));
    let perPerson=0,groupFixed=0;
    priced.forEach(x=>{
      const amount=x.amount_yen*(x.quantity||1);
      if(x.scope==="group")groupFixed+=amount;else perPerson+=amount;
      const row=add(box,el("div",null,"cost-row"));
      const detail=add(row,el("div",null,"cost-detail"));
      const label=add(detail,el("strong",x.name));
      if(x.source_id)linkedTitle(detail,"来源 ↗",p,x.source_id);
      paragraph(detail,(x.quantity>1?yen(x.amount_yen)+" × "+x.quantity:"参考单价 "+yen(x.amount_yen))+" · "+(x.status==="confirmed"?"已核实":"参考估算")+(x.note?" · "+x.note:""));
      add(row,el("strong",yen(amount),"cost-amount"));
    });
    unknown.forEach(x=>{
      const row=add(box,el("div",null,"cost-row cost-pending"));
      add(row,el("strong",x.name));add(row,el("span","待确认"));
      if(x.note)paragraph(row,x.note);
    });
    const people=p.constraints?.estimated_participants;
    const total=perPerson*(Number.isInteger(people)?people:1)+groupFixed;
    const summary=add(box,el("div",null,"cost-summary"));
    add(summary,el("span","已录入单人小计"));add(summary,el("strong",yen(perPerson)));
    if(groupFixed){add(summary,el("span","全组固定费用"));add(summary,el("strong",yen(groupFixed)));}
    if(Number.isInteger(people)&&people>1){add(summary,el("span","按 "+people+" 人计算总额"));add(summary,el("strong",yen(total)));}
    else if(groupFixed&&!Number.isInteger(people))paragraph(box,"填写人数后可计算含全组固定费用的总额。","sub-text");
    paragraph(box,unknown.length?"费用尚未完整：出发车站、日期或票券方案待确定。":"金额为计划数据中的费用合计；出发前需复核票价。","sub-text");
    const optional=(costs.items||[]).filter(x=>x.included===false);
    if(optional.length){
      add(box,el("h3","可选项目"));
      optional.forEach(x=>{const row=add(box,el("div",null,"cost-row"));add(row,el("span",x.name));add(row,el("strong",Number.isInteger(x.amount_yen)?yen(x.amount_yen*(x.quantity||1)):"待确认"));if(x.source_id)linkedTitle(row,"来源 ↗",p,x.source_id);});
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
    } else paragraph(c,"尚无已核实的天气快照，请由 Skill 按出行日期查询。");
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
  function renderCosts(p) {
    const root=$("panel-costs");
    renderCostItems(root,p);
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
      if(p.trip_type!=="day_trip"){
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
      renderCosts(p);
      renderHistory(p);
    } catch(error){
      state.textContent="加载失败："+error.message;
      state.classList.add("error");
    }
  }
  main();
})();
