const CATS=[
  {id:"an",name:"Ăn uống",c:"#D9622B"},{id:"cafe",name:"Cà phê",c:"#8A5A3C"},
  {id:"dilai",name:"Đi lại",c:"#2F6FD0"},{id:"muasam",name:"Mua sắm",c:"#C13C7E"},
  {id:"hoadon",name:"Hóa đơn",c:"#6B4FC4"},{id:"nha",name:"Nhà cửa",c:"#0B8A7A"},
  {id:"suckhoe",name:"Sức khỏe",c:"#2E9E4F"},{id:"giaitri",name:"Giải trí",c:"#D69A12"},
  {id:"hoctap",name:"Học tập",c:"#3D7FA6"},{id:"giadinh",name:"Gia đình",c:"#B4483D"},
  {id:"khac",name:"Khác",c:"#7A857F"}];
const CAT=Object.fromEntries(CATS.map(c=>[c.id,c]));
const $=s=>document.querySelector(s);
/* ---------- money ---------- */
const CURRENCIES=[["VND","Việt Nam đồng"],["USD","Đô la Mỹ"],["EUR","Euro"],["JPY","Yên Nhật"],["KRW","Won Hàn Quốc"],
  ["CNY","Nhân dân tệ"],["THB","Baht Thái"],["SGD","Đô Singapore"],["TWD","Đài tệ"],["HKD","Đô Hồng Kông"],
  ["MYR","Ringgit Malaysia"],["IDR","Rupiah Indonesia"],["PHP","Peso Philippines"],["LAK","Kíp Lào"],["KHR","Riel Campuchia"],
  ["GBP","Bảng Anh"],["AUD","Đô Úc"],["CAD","Đô Canada"],["CHF","Franc Thụy Sĩ"],["INR","Rupee Ấn Độ"],["AED","Dirham UAE"],["RUB","Rúp Nga"]];
const decCache={};
const decOf=c=>decCache[c]??=new Intl.NumberFormat("en",{style:"currency",currency:c}).resolvedOptions().maximumFractionDigits;
const roundTo=(v,c)=>{const k=10**decOf(c);return Math.round(v*k)/k};
const mainCur=()=>settings.cur||"VND";
const symOf=c=>c==="VND"?"đ":(new Intl.NumberFormat("vi-VN",{style:"currency",currency:c,currencyDisplay:"narrowSymbol"}).formatToParts(0).find(p=>p.type==="currency")?.value||c);
function money(n,c=mainCur()){
  if(c==="VND")return Math.round(n||0).toLocaleString("vi-VN")+"đ";
  return new Intl.NumberFormat("vi-VN",{style:"currency",currency:c,minimumFractionDigits:0,maximumFractionDigits:decOf(c)}).format(n||0);
}
const fmt=n=>money(n);
// Read what was typed: "1.250.000", "12,5", "12.50", "1,234.5" all work.
function parseMoney(s,c=mainCur()){
  if(decOf(c)===0)return parseInt(String(s??"").replace(/\D/g,""),10)||0;
  return roundTo(parseNum(s),c);
}
function parseNum(s){
  let t=String(s??"").replace(/[^\d.,]/g,"");
  if(!t)return 0;
  const lastDot=t.lastIndexOf("."), lastComma=t.lastIndexOf(",");
  if(lastDot>=0&&lastComma>=0){const dec=lastDot>lastComma?".":",";t=t.split(dec===","?".":",").join("").replace(dec,".")}
  else if(lastComma>=0)t=t.replace(/,/g,(m,i)=>i===lastComma?".":"");
  else if(/^\d{1,3}(\.\d{3})+$/.test(t))t=t.replace(/\./g,"");
  return parseFloat(t)||0;
}
// Show thousands separators while typing, for currencies without decimals.
function showInput(n,c=mainCur()){return n?(decOf(c)===0?n.toLocaleString("vi-VN"):String(n).replace(".",",")):""}
const parseAmt=s=>parseMoney(s);
const keyOf=p=>p.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const toLocalInput=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const DOW=["CN","T2","T3","T4","T5","T6","T7"];
const catOf=id=>CAT[id]||CAT.khac;

/* ---------- storage: everything lives on this device, one book per account ---------- */
const LS_ACCTS="sochi.accounts";   // {list:[{id,name,color,pin?}], last}
const bookKey=id=>"sochi.book."+id;
const freshSettings=()=>({budget:0,rules:{},seen:{},fixed:[]});
let accounts={list:[],last:null};
let me=null;                // the open account
let expenses=[];            // [{id, amount, cat, place, note, ts, fixedId?}]
let settings=freshSettings();
const lsGet=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
function saveAccounts(){lsSet(LS_ACCTS,accounts)}
function loadAccounts(){
  accounts=lsGet(LS_ACCTS)||{list:[],last:null};
  // a book written before accounts existed becomes the first account's
  const legacy=lsGet("sochi.v1");
  if(legacy&&!accounts.list.length){
    const a=newAccount("Tôi");lsSet(bookKey(a.id),legacy);
    try{localStorage.removeItem("sochi.v1")}catch{}
  }
}
function load(){
  const d=lsGet(bookKey(me.id));
  expenses=d?.expenses||[]; settings={...freshSettings(),...d?.settings};
}
function persist(){
  expenses.sort((a,b)=>b.ts-a.ts);
  if(!lsSet(bookKey(me.id),{v:1,expenses,settings}))toast("Không lưu được, bộ nhớ máy có thể đã đầy");
  render();
}
const store={
  add(x){expenses.push({id:"e"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),...x});persist()},
  update(id,x){expenses=expenses.map(e=>e.id===id?{id,...x}:e);persist()},
  remove(id){expenses=expenses.filter(e=>e.id!==id);persist()},
  saveSettings(){persist()}
};
// ask Safari not to evict our data
navigator.storage?.persist?.().catch(()=>{});

let viewMonth=new Date(); viewMonth.setDate(1); viewMonth.setHours(0,0,0,0);
let editingId=null, pickedCat=null, userPickedCat=false;

/* ---------- helpers ---------- */
function inMonth(e,m){const d=new Date(e.ts);return d.getFullYear()===m.getFullYear()&&d.getMonth()===m.getMonth()}
function monthLabel(m){return "Tháng "+(m.getMonth()+1)+"/"+m.getFullYear()}
function badge(cat){const c=catOf(cat);return `<span class="badge" style="background:${c.c}">${esc(c.name.split(" ").map(w=>w[0]).join("").slice(0,2))}</span>`}
function txRow(e){
  const c=catOf(e.cat), d=new Date(e.ts);
  const sub=[pad(d.getHours())+":"+pad(d.getMinutes()),e.cur?money(e.orig,e.cur):c.name,e.note].filter(Boolean).join(" · ");
  return `<button class="tx" data-id="${esc(e.id)}">${badge(e.cat)}<span class="main"><span class="t1">${esc(e.place||c.name)}</span><span class="t2">${esc(sub)}</span></span><span class="amt num money">−${fmt(e.amount)}</span></button>`;
}
function dayGroups(list){
  const g=new Map();
  for(const e of list){const d=new Date(e.ts);const k=d.toDateString();if(!g.has(k))g.set(k,{d,items:[]});g.get(k).items.push(e)}
  const today=new Date().toDateString(), yest=new Date(Date.now()-864e5).toDateString();
  return [...g.values()].map(({d,items})=>{
    const k=d.toDateString(); const lbl=k===today?"Hôm nay":k===yest?"Hôm qua":`${DOW[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}`;
    const tot=items.reduce((s,e)=>s+e.amount,0);
    return `<div class="day"><div class="dayhead"><span>${lbl}</span><span class="num money">${fmt(tot)}</span></div>${items.map(txRow).join("")}</div>`;
  }).join("");
}
const emptyHtml=`<div class="empty"><b>Chưa có khoản chi nào</b><span>Bấm nút + ở dưới để ghi khoản đầu tiên. Chỉ cần số tiền và danh mục.</span></div>`;

/* ---------- render ---------- */
function render(){
  const m=viewMonth, now=new Date();
  const list=expenses.filter(e=>inMonth(e,m));
  const spent=list.reduce((s,e)=>s+e.amount,0);
  const isCur=m.getFullYear()===now.getFullYear()&&m.getMonth()===now.getMonth();
  const dim=new Date(m.getFullYear(),m.getMonth()+1,0).getDate();
  const daysGone=isCur?now.getDate():dim;
  $("#status").innerHTML=`<b>${esc(me.name)}</b> · ${expenses.length} khoản · đổi`;
  $("#acctInfo").textContent=`Đang mở sổ của ${me.name}. ${accounts.list.length>1?"Máy này có "+accounts.list.length+" tài khoản, mỗi người một sổ riêng.":"Bạn có thể thêm tài khoản cho người khác dùng chung máy."} Mã PIN chỉ chặn người khác mở nhầm sổ, không mã hóa dữ liệu.`;
  if(document.activeElement!==$("#acctName"))$("#acctName").value=me.name;
  $("#acctPin").textContent=me.pin?"Đổi mã PIN":"Đặt mã PIN";
  $("#acctPinOff").hidden=!me.pin;
  $("#monthLbl").textContent=monthLabel(m);
  $("#nextM").disabled=isCur;
  $("#spent").textContent=fmt(spent);
  $("#budgetLbl").textContent=`Hạn mức (${symOf(mainCur())})`;
  if(document.activeElement!==$("#mainCur"))$("#mainCur").value=mainCur();
  $("#mainCurSave").hidden=$("#mainCur").value===mainCur();
  const foreign=new Set(expenses.filter(e=>e.cur).map(e=>e.cur));
  $("#curInfo").textContent=`Mọi tổng chi, hạn mức và khoản cố định tính bằng ${symOf(mainCur())} (${mainCur()}). Khi ghi, bạn chọn được loại tiền khác; sổ quy đổi theo tỷ giá lúc ghi.${foreign.size?" Sổ đang có khoản chi bằng: "+[...foreign].join(", ")+".":""}`;
  $("#perday").textContent=fmt(spent/daysGone);
  // forecast: day-rate of variable spending, plus fixed items (paid or still due)
  const fixedThis=list.filter(e=>e.fixedId).reduce((s,e)=>s+e.amount,0);
  const variable=spent-fixedThis;
  const fixedLeft=settings.fixed.filter(f=>!list.some(e=>e.fixedId===f.id)).reduce((s,f)=>s+f.amount,0);
  const fc=isCur?variable/daysGone*dim+fixedThis+fixedLeft:spent;
  $("#forecast").textContent=isCur?fmt(fc):fmt(spent)+" (đã chốt)";
  // budget
  const b=settings.budget||0;
  $("#budgetBox").hidden=!b;
  if(b){
    const r=spent/b, bar=$("#budgetBar");
    bar.style.width=Math.min(100,r*100)+"%";
    bar.className=r>=1?"bad":r>=.8?"warn":"";
    $("#budgetTxt").innerHTML=`<span class="money num">${fmt(spent)}</span> / <span class="money num">${fmt(b)}</span>`;
    const st=r>=1?["bad","Đã vượt "+fmt(spent-b)]:(isCur&&fc>b)?["warn","Có thể vượt "+fmt(fc-b)]:r>=.8?["warn","Sắp chạm hạn mức"]:["ok","Còn "+fmt(b-spent)];
    $("#budgetPill").innerHTML=`<span class="pill ${st[0]} money">${st[1]}</span>`;
  }
  if(document.activeElement!==$("#budgetIn"))$("#budgetIn").value=showInput(b);
  // categories
  const by={};for(const e of list)by[e.cat]=(by[e.cat]||0)+e.amount;
  const rows=Object.entries(by).sort((a,b)=>b[1]-a[1]);
  $("#stack").innerHTML=rows.map(([c,v])=>`<span style="width:${v/spent*100}%;background:${catOf(c).c}"></span>`).join("");
  $("#catrows").innerHTML=rows.length?rows.map(([c,v])=>`<div class="catrow"><span class="dot" style="background:${catOf(c).c}"></span><span>${esc(catOf(c).name)}</span><span class="num money">${fmt(v)}</span><span class="pct num">${Math.round(v/spent*100)}%</span></div>`).join(""):`<p class="hint">Chưa có khoản chi trong ${monthLabel(m).toLowerCase()}.</p>`;
  $("#recent").innerHTML=list.length?dayGroups(list.slice(0,6)):emptyHtml;
  // ledger
  const f=$("#catFilter").value;
  const ll=f?list.filter(e=>e.cat===f):list;
  $("#listTitle").textContent=monthLabel(m)+" · "+ll.length+" khoản";
  $("#ledger").innerHTML=ll.length?dayGroups(ll):emptyHtml;
  // fixed
  const fx=settings.fixed;
  $("#fixedList").innerHTML=fx.length?fx.map(x=>{
    const done=expenses.some(e=>e.fixedId===x.id&&inMonth(e,now));
    return `<div class="fixedrow"><div style="min-width:0"><div class="n">${esc(x.name)}</div><div class="s">${esc(catOf(x.cat).name)}${x.day?" · ngày "+x.day:""}</div></div><span class="num money">${fmt(x.amount)}</span>
    <div class="row" style="gap:4px;flex-wrap:nowrap">${done?`<span class="pill ok">Đã ghi</span>`:`<button class="small on" data-fxrec="${esc(x.id)}">Ghi tháng này</button>`}<button class="small" data-fxdel="${esc(x.id)}" aria-label="Bỏ ${esc(x.name)}">✕</button></div></div>`}).join(""):`<p class="hint">Chưa có khoản cố định nào.</p>`;
  $("#fixedTotal").textContent=fmt(fx.reduce((s,x)=>s+x.amount,0));
  // rules
  const rs=Object.entries(settings.rules);
  $("#rules").innerHTML=rs.length?rs.map(([k,r])=>`<span class="rule">${esc(r.label||k)} → <b>${esc(catOf(r.cat).name)}</b><button data-rdel="${esc(k)}" aria-label="Bỏ quy tắc">✕</button></span>`).join(""):`<p class="hint">Chưa có quy tắc nào. Cứ ghi chi tiêu như bình thường, sổ sẽ tự học.</p>`;
  const last=settings.lastBackup?new Date(settings.lastBackup).toLocaleDateString("vi-VN"):"chưa bao giờ";
  $("#dataInfo").textContent=`Dữ liệu chỉ nằm trên máy này (${expenses.length} khoản). Nếu xóa app hoặc dữ liệu Safari thì sẽ mất, nên thỉnh thoảng hãy sao lưu ra Tệp hoặc iCloud Drive. Lần sao lưu gần nhất: ${last}.`;
  // places datalist
  const places=[...new Set(expenses.map(e=>e.place).filter(Boolean))].slice(0,80);
  $("#placeList").innerHTML=places.map(p=>`<option value="${esc(p)}">`).join("");
}

/* ---------- tabs ---------- */
function show(v){
  document.querySelectorAll(".view").forEach(el=>el.hidden=el.id!=="v-"+v);
  document.querySelectorAll("nav.tabs button[data-v]").forEach(b=>{if(b.dataset.v===v)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  window.scrollTo(0,0);
}
document.querySelectorAll("nav.tabs button[data-v]").forEach(b=>b.onclick=()=>show(b.dataset.v));
$("#seeAll").onclick=()=>show("list");
$("#prevM").onclick=()=>{viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()-1,1);render()};
$("#nextM").onclick=()=>{viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1);render()};
$("#catFilter").innerHTML=`<option value="">Mọi danh mục</option>`+CATS.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
$("#catFilter").onchange=render;
$("#fxCat").innerHTML=CATS.map(c=>`<option value="${c.id}" ${c.id==="hoadon"?"selected":""}>${c.name}</option>`).join("");

/* hide amounts */
let hideAmounts=false;try{hideAmounts=!!localStorage.getItem("sochi.hide")}catch{}
function applyEye(){document.body.classList.toggle("blur",hideAmounts);$("#eyeLbl").textContent=hideAmounts?"Hiện số":"Ẩn số";try{localStorage.setItem("sochi.hide",hideAmounts?"1":"")}catch{}}
applyEye();
$("#eyeBtn").onclick=()=>{hideAmounts=!hideAmounts;applyEye()};

/* install tip: only in Safari tab, not once added to the home screen */
const standalone=navigator.standalone||matchMedia("(display-mode: standalone)").matches;
let tipClosed=false;try{tipClosed=!!localStorage.getItem("sochi.tip")}catch{}
$("#installTip").hidden=standalone||tipClosed;
$("#installClose").onclick=()=>{$("#installTip").hidden=true;try{localStorage.setItem("sochi.tip","1")}catch{}};

/* ---------- sheet ---------- */
function drawCats(){$("#catgrid").innerHTML=CATS.map(c=>`<button class="catbtn" data-cat="${c.id}" aria-pressed="${pickedCat===c.id}"><span class="dot" style="background:${c.c}"></span>${c.name}</button>`).join("")}
function openSheet(e,prefill){
  editingId=e?e.id:null; userPickedCat=!!e; pickedCat=e?e.cat:null;
  const p=e||prefill||{};
  $("#sheetTitle").textContent=e?"Sửa khoản chi":"Thêm khoản chi";
  const known=c=>CURRENCIES.some(x=>x[0]===c);
  sheetCur=e?(e.cur||mainCur()):known(p.cur)?p.cur:known(settings.lastCur)?settings.lastCur:mainCur();
  const shown=e?.cur?e.orig:p.amount;
  $("#curSel").innerHTML=curOptions(sheetCur);
  $("#amt").value=showInput(shown,sheetCur);
  $("#rate").value=e?.rate?fmtRate(e.rate):"";
  setSheetCur(sheetCur,!e?.rate);
  $("#place").value=p.place||""; $("#note").value=p.note||"";
  $("#when").value=toLocalInput(p.ts?new Date(p.ts):new Date());
  $("#autonote").textContent="";
  const del=$("#delTx"); del.hidden=!e; del.classList.remove("armed"); del.textContent="Xóa khoản chi";
  if(!e&&p.place)applyRule();
  drawCats();
  $("#scrim").hidden=false;$("#sheet").hidden=false;
  requestAnimationFrame(()=>{$("#scrim").classList.add("show");$("#sheet").classList.add("show")});
  if(!e&&!p.amount)setTimeout(()=>$("#amt").focus(),250);
}
function closeSheet(){
  $("#scrim").classList.remove("show");$("#sheet").classList.remove("show");
  setTimeout(()=>{$("#scrim").hidden=true;$("#sheet").hidden=true},250);
}
function applyRule(){
  const r=settings.rules[keyOf($("#place").value)];
  if(r){pickedCat=r.cat;userPickedCat=false;$("#autonote").textContent="Tự xếp vào "+catOf(r.cat).name+" theo các lần trước";return true}
  return false;
}
$("#addBtn").onclick=()=>openSheet(null);
$("#closeSheet").onclick=closeSheet; $("#scrim").onclick=closeSheet;
document.addEventListener("click",ev=>{
  const t=ev.target.closest(".tx"); if(t){const e=expenses.find(x=>x.id===t.dataset.id);if(e)openSheet(e)}
});
for(const id of ["#fxAmt","#budgetIn"])$(id).addEventListener("input",ev=>{if(decOf(mainCur())===0)ev.target.value=showInput(parseMoney(ev.target.value))});
$("#amt").addEventListener("input",ev=>{if(decOf(sheetCur)===0)ev.target.value=showInput(parseMoney(ev.target.value,sheetCur),sheetCur);showConverted()});

/* currency inside the add sheet */
let sheetCur="VND";
const curOptions=sel=>CURRENCIES.map(([c,n])=>`<option value="${c}" ${c===sel?"selected":""}>${c} · ${n}</option>`).join("");
const BIG=new Set(["VND","IDR","LAK","KHR","KRW"]), MID=new Set(["JPY","TWD","INR","PHP","THB","RUB"]);
function drawChips(){
  const steps=BIG.has(sheetCur)?[["000",",000"],["10000","+10k"],["20000","+20k"],["50000","+50k"],["100000","+100k"]]
    :MID.has(sheetCur)?[["100","+100"],["500","+500"],["1000","+1.000"],["5000","+5.000"]]
    :[["1","+1"],["5","+5"],["10","+10"],["50","+50"],["100","+100"]];
  $("#chips").innerHTML=[...steps,["clear","Xóa số"]].map(([a,l])=>`<button class="chip" data-add="${a}">${l}</button>`).join("");
}
$("#chips").onclick=ev=>{
  const b=ev.target.closest("[data-add]");if(!b)return;
  const a=b.dataset.add, cur=parseMoney($("#amt").value,sheetCur);
  const n=a==="clear"?0:a==="000"?cur*1000:roundTo(cur+parseFloat(a),sheetCur);
  $("#amt").value=showInput(n,sheetCur);showConverted();
};
function sheetRate(){return parseNum($("#rate").value)}
const fmtRate=v=>v.toLocaleString("vi-VN",{maximumSignificantDigits:8});
function showConverted(){
  if(sheetCur===mainCur()){$("#converted").textContent="";return}
  const a=parseMoney($("#amt").value,sheetCur), r=sheetRate();
  $("#converted").textContent=a&&r?"≈ "+money(roundTo(a*r,mainCur())):"";
}
async function setSheetCur(c,fetchRate){
  sheetCur=c;
  $("#curSym").textContent=symOf(c);
  $("#amt").setAttribute("inputmode",decOf(c)===0?"numeric":"decimal");
  drawChips();
  const foreign=c!==mainCur();
  $("#rateBox").hidden=!foreign;
  if(!foreign){showConverted();return}
  $("#rateLbl").textContent=`1 ${c} =`;
  $("#rateUnit").textContent=symOf(mainCur());
  if(fetchRate){
    const want=c;
    const cached=lsGet("sochi.rates."+mainCur());
    if(cached?.rates?.[c])fillRate(cached,c);else{$("#rate").value="";$("#rateNote").textContent="Đang lấy tỷ giá…"}
    const fresh=await getRates(mainCur());
    if(sheetCur!==want)return;
    if(fresh?.rates?.[c])fillRate(fresh,c);
    else if(!cached?.rates?.[c])$("#rateNote").textContent="Không lấy được tỷ giá, hãy nhập tay";
  }else $("#rateNote").textContent="Tỷ giá đã lưu với khoản này";
  showConverted();
}
function fillRate(r,c){
  $("#rate").value=fmtRate(1/r.rates[c]);
  $("#rateNote").textContent="Tỷ giá ngày "+new Date(r.t).toLocaleDateString("vi-VN")+", sửa được";
  showConverted();
}
$("#curSel").onchange=ev=>{
  const old=sheetCur, a=parseMoney($("#amt").value,old);
  setSheetCur(ev.target.value,true);
  $("#amt").value=showInput(roundTo(a,sheetCur),sheetCur);
};
$("#rate").addEventListener("input",()=>{$("#rateNote").textContent="Tỷ giá nhập tay";showConverted()});

/* exchange rates: free public feed, cached on the phone for 12 hours */
const RATE_TTL=12*3600e3;
async function getRates(base){
  const key="sochi.rates."+base, cached=lsGet(key);
  if(cached&&Date.now()-cached.t<RATE_TTL)return cached;
  try{
    const r=await fetch("https://open.er-api.com/v6/latest/"+base,{cache:"no-store"});
    const j=await r.json();
    if(j.result!=="success"||!j.rates)throw 0;
    const v={t:Date.now(),rates:j.rates};lsSet(key,v);return v;
  }catch{return cached}
}
$("#catgrid").onclick=ev=>{const b=ev.target.closest("[data-cat]");if(!b)return;pickedCat=b.dataset.cat;userPickedCat=true;$("#autonote").textContent="";drawCats()};
$("#place").addEventListener("input",()=>{
  const auto=!!$("#autonote").textContent;
  if(userPickedCat&&!auto)return;
  if(applyRule())drawCats();
  else if(auto){$("#autonote").textContent="";pickedCat=null;drawCats()}
});

let toastT;
function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,2400)}

// Same place filed under the same category twice → remember it as a rule.
function learn(place,cat){
  const k=keyOf(place); if(!k||settings.rules[k]?.cat===cat)return false;
  const s=settings.seen[k]=settings.seen[k]||{}; s[cat]=(s[cat]||0)+1;
  if(s[cat]>=2){settings.rules[k]={cat,label:place.trim()};delete settings.seen[k];return true}
  return false;
}

$("#saveTx").onclick=()=>{
  const orig=parseMoney($("#amt").value,sheetCur);
  if(!orig){toast("Nhập số tiền trước đã");$("#amt").focus();return}
  const foreign=sheetCur!==mainCur(), rate=foreign?sheetRate():1;
  if(foreign&&!rate){toast("Nhập tỷ giá để quy đổi");$("#rate").focus();return}
  if(!pickedCat){toast("Chọn một danh mục");return}
  const amount=foreign?roundTo(orig*rate,mainCur()):orig;
  const place=$("#place").value.trim(), note=$("#note").value.trim();
  const ts=new Date($("#when").value).getTime()||Date.now();
  const old=editingId?expenses.find(e=>e.id===editingId):null;
  const doc={amount,cat:pickedCat,place,note,ts};
  if(foreign)Object.assign(doc,{cur:sheetCur,orig,rate});
  if(!editingId)settings.lastCur=sheetCur;
  if(old?.fixedId)doc.fixedId=old.fixedId;
  const learned=place&&userPickedCat?learn(place,pickedCat):false;
  if(editingId)store.update(editingId,doc);else store.add(doc);
  closeSheet();
  toast(learned?`Đã lưu. Lần sau “${place}” tự vào ${catOf(pickedCat).name}`:"Đã lưu "+money(orig,sheetCur)+(foreign?" ≈ "+fmt(amount):""));
};
$("#delTx").onclick=()=>{
  const b=$("#delTx");
  if(!b.classList.contains("armed")){b.classList.add("armed");b.textContent="Bấm lần nữa để xóa hẳn";return}
  store.remove(editingId);closeSheet();toast("Đã xóa khoản chi");
};

/* ---------- fixed ---------- */
$("#fxAdd").onclick=()=>{
  const name=$("#fxName").value.trim(), amount=parseAmt($("#fxAmt").value);
  if(!name||!amount){toast("Cần tên và số tiền");return}
  const day=Math.min(31,Math.max(0,parseInt($("#fxDay").value,10)||0));
  settings.fixed=[...settings.fixed,{id:"f"+Date.now().toString(36),name,amount,cat:$("#fxCat").value,day}];
  store.saveSettings(); $("#fxName").value=$("#fxAmt").value=$("#fxDay").value=""; toast("Đã thêm "+name);
};
$("#fixedList").onclick=ev=>{
  const r=ev.target.closest("[data-fxrec]"), d=ev.target.closest("[data-fxdel]");
  if(r){const x=settings.fixed.find(f=>f.id===r.dataset.fxrec);const now=new Date();
    const when=x.day?new Date(now.getFullYear(),now.getMonth(),Math.min(x.day,now.getDate()),9,0):now;
    store.add({amount:x.amount,cat:x.cat,place:x.name,note:"Khoản cố định",ts:when.getTime(),fixedId:x.id});toast("Đã ghi "+x.name)}
  if(d){settings.fixed=settings.fixed.filter(f=>f.id!==d.dataset.fxdel);store.saveSettings()}
};
$("#rules").onclick=ev=>{const b=ev.target.closest("[data-rdel]");if(!b)return;delete settings.rules[b.dataset.rdel];store.saveSettings()};
$("#budgetSave").onclick=()=>{settings.budget=parseAmt($("#budgetIn").value);$("#budgetIn").blur();store.saveSettings();toast(settings.budget?"Đã đặt hạn mức "+fmt(settings.budget):"Đã bỏ hạn mức")};

/* ---------- main currency: changing it converts the whole book ---------- */
$("#mainCur").innerHTML=curOptions("VND");
$("#mainCur").onchange=()=>{const b=$("#mainCurSave");b.hidden=$("#mainCur").value===mainCur();b.classList.remove("armed");b.textContent="Đổi"};
$("#mainCurSave").onclick=async()=>{
  const b=$("#mainCurSave"), from=mainCur(), to=$("#mainCur").value;
  if(to===from)return;
  if(expenses.length||settings.budget||settings.fixed.length){
    if(!b.classList.contains("armed")){b.classList.add("armed");b.textContent="Quy đổi cả sổ?";toast(`Bấm lần nữa: mọi số tiền sẽ quy đổi từ ${from} sang ${to}`);return}
  }
  b.textContent="Đang lấy tỷ giá…";
  const r=await getRates(from), x=r?.rates?.[to];
  b.classList.remove("armed");b.textContent="Đổi";
  if(!x){toast("Cần kết nối mạng để lấy tỷ giá quy đổi");return}
  const conv=v=>roundTo(v*x,to);
  expenses=expenses.map(e=>{
    if(e.cur===to){const {cur,orig,rate,...rest}=e;return {...rest,amount:orig}}
    if(e.cur)return {...e,amount:conv(e.amount),rate:e.rate*x};
    return {...e,amount:conv(e.amount),cur:from,orig:e.amount,rate:x};   // keep the original as it was written
  });
  settings.budget=conv(settings.budget||0);
  settings.fixed=settings.fixed.map(f=>({...f,amount:conv(f.amount)}));
  settings.cur=to;
  persist();toast(`Đã đổi tiền tệ chính sang ${to}`);
};

/* ---------- backup / restore / csv ---------- */
async function shareFile(name,text,type){
  const file=new File([text],name,{type});
  if(navigator.canShare?.({files:[file]})){
    try{await navigator.share({files:[file],title:name});return true}catch(e){return e.name!=="AbortError"?fallback():false}
  }
  return fallback();
  function fallback(){const a=document.createElement("a");a.href=URL.createObjectURL(file);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);return true}
}
const stamp=()=>{const d=new Date();return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`};
$("#backupBtn").onclick=async()=>{
  const ok=await shareFile(`so-chi-tieu-${keyOf(me.name)||"so"}-${stamp()}.json`,JSON.stringify({v:1,expenses,settings},null,1),"application/json");
  if(ok){settings.lastBackup=Date.now();store.saveSettings();toast("Đã tạo file sao lưu")}
};
$("#csvBtn").onclick=()=>{
  const q=s=>'"'+String(s??"").replace(/"/g,'""')+'"';
  const body=[...expenses].sort((a,b)=>a.ts-b.ts).map(e=>{const d=new Date(e.ts);return [`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,pad(d.getHours())+":"+pad(d.getMinutes()),e.amount,e.cur?e.orig:"",e.cur||"",e.rate||"",q(catOf(e.cat).name),q(e.place),q(e.note)].join(",")}).join("\n");
  shareFile(`so-chi-tieu-${stamp()}.csv`,`﻿Ngày,Giờ,Số tiền (${mainCur()}),Tiền gốc,Loại tiền gốc,Tỷ giá,Danh mục,Nơi chi,Ghi chú\n`+body,"text/csv");
};
$("#restoreBtn").onclick=()=>$("#restoreFile").click();
$("#restoreFile").onchange=async ev=>{
  const f=ev.target.files[0]; ev.target.value=""; if(!f)return;
  try{
    const d=JSON.parse(await f.text());
    if(!Array.isArray(d.expenses))throw 0;
    const have=new Set(expenses.map(e=>e.id));
    const added=d.expenses.filter(e=>e&&e.id&&!have.has(e.id)&&e.amount>0&&e.ts);
    expenses=expenses.concat(added);
    if(d.settings){settings={...freshSettings(),...settings,...d.settings,rules:{...settings.rules,...d.settings.rules}}}
    persist(); toast(`Đã khôi phục ${added.length} khoản`);
  }catch{toast("File này không phải bản sao lưu của Sổ Chi Tiêu")}
};

/* ---------- quick add from a link: ?amt=45000&place=...&note=... (for an iPhone Shortcut) ---------- */
function readLink(){
  const q=new URLSearchParams(location.search);
  if(!q.has("amt"))return;
  const cur=(q.get("cur")||"").toUpperCase();
  const pre={cur,amount:parseMoney(q.get("amt"),CURRENCIES.some(x=>x[0]===cur)?cur:mainCur()),place:(q.get("place")||"").slice(0,80),note:(q.get("note")||"").slice(0,120)};
  history.replaceState(null,"",location.pathname);
  if(pre.amount)openSheet(null,pre);
}

/* ---------- accounts ---------- */
const AV_COLORS=["#0B6E58","#2F6FD0","#C13C7E","#D9622B","#6B4FC4","#B4483D","#3D7FA6"];
function newAccount(name){
  const a={id:"a"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),name,color:AV_COLORS[accounts.list.length%AV_COLORS.length]};
  accounts.list.push(a);saveAccounts();return a;
}
async function hashPin(acct,pin){
  const data=new TextEncoder().encode(acct.id+":"+pin);
  if(crypto.subtle){const h=await crypto.subtle.digest("SHA-256",data);return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("")}
  let h=0;for(const b of data)h=(h*31+b)|0;return "w"+h;   // non-https fallback
}
function openAccount(a){
  me=a;accounts.last=a.id;saveAccounts();
  load();viewMonth=new Date();viewMonth.setDate(1);viewMonth.setHours(0,0,0,0);
  $("#gate").hidden=true;show("home");render();applyLook();readLink();
}
function gateView(v){for(const id of ["gPick","gNew","gPin"])$("#"+id).hidden=id!==v}
function showGate(){
  closeSheet();
  if(!accounts.list.length){$("#gNewTitle").textContent="Chào bạn, bắt đầu nhé";$("#gBack").hidden=true;gateView("gNew")}
  else{
    $("#gList").innerHTML=accounts.list.map(a=>`<button class="acct" data-acct="${esc(a.id)}"><span class="avatar" style="background:${a.color}">${esc(a.name.trim()[0]?.toUpperCase()||"?")}</span><span><b>${esc(a.name)}</b><div class="meta">${a.pin?"Có mã PIN":"Không khóa"}</div></span><span aria-hidden="true">›</span></button>`).join("");
    gateView("gPick");
  }
  $("#gate").hidden=false;
}
$("#gList").onclick=ev=>{
  const b=ev.target.closest("[data-acct]");if(!b)return;
  const a=accounts.list.find(x=>x.id===b.dataset.acct);
  if(a.pin)askPin({title:"Mã PIN của "+a.name,onDone:async pin=>{if(await hashPin(a,pin)===a.pin){openAccount(a);return true}return false},onBack:showGate});
  else openAccount(a);
};
$("#gNewBtn").onclick=()=>{$("#gNewTitle").textContent="Thêm tài khoản";$("#gBack").hidden=false;$("#gName").value="";gateView("gNew");setTimeout(()=>$("#gName").focus(),50)};
$("#gBack").onclick=showGate;
$("#gCreate").onclick=()=>{
  const name=$("#gName").value.trim();
  if(!name){$("#gName").focus();return}
  if(accounts.list.some(a=>a.name.toLowerCase()===name.toLowerCase())){toast("Đã có tài khoản tên này");return}
  openAccount(newAccount(name));toast("Chào "+name+"! Bấm + để ghi khoản đầu tiên");
};

/* PIN pad — used to unlock, and (twice) to set a new PIN */
let pinState=null;
function askPin(opts){pinState={...opts,val:""};$("#gPinTitle").textContent=opts.title;$("#pinErr").textContent="";drawPin();gateView("gPin");$("#gate").hidden=false}
function drawPin(){[...$("#pinDots").children].forEach((s,i)=>s.classList.toggle("on",i<pinState.val.length))}
$("#pinPad").onclick=async ev=>{
  const b=ev.target.closest("button");if(!b||!pinState)return;
  const k=b.dataset.k;
  if(k==="back"){const back=pinState.onBack;pinState=null;back();return}
  if(k==="del"){pinState.val=pinState.val.slice(0,-1);drawPin();return}
  if(pinState.val.length>=4)return;
  pinState.val+=b.textContent;drawPin();
  if(pinState.val.length===4){
    const ok=await pinState.onDone(pinState.val);
    if(ok===false){$("#pinErr").textContent="Sai mã PIN, thử lại";pinState.val="";drawPin()}
  }
};
function closeGate(){pinState=null;$("#gate").hidden=true}
$("#acctPin").onclick=()=>askPin({title:"Chọn mã PIN 4 số",onBack:closeGate,onDone:first=>{
  askPin({title:"Nhập lại mã PIN",onBack:closeGate,onDone:async again=>{
    if(again!==first){$("#pinErr").textContent="Hai lần nhập không khớp";setTimeout(()=>$("#acctPin").click(),900);return true}
    me.pin=await hashPin(me,first);saveAccounts();closeGate();render();toast("Đã đặt mã PIN");return true;
  }});return true;
}});
$("#acctPinOff").onclick=()=>{delete me.pin;saveAccounts();render();toast("Đã bỏ mã PIN")};
$("#acctRename").onclick=()=>{const n=$("#acctName").value.trim();if(!n)return;me.name=n;saveAccounts();$("#acctName").blur();render();toast("Đã đổi tên")};
$("#acctSwitch").onclick=showGate;
$("#whoBtn").onclick=showGate;
$("#acctDelete").onclick=()=>{
  const b=$("#acctDelete");
  if(!b.classList.contains("armed")){b.classList.add("armed");b.textContent=`Bấm lần nữa để xóa hẳn sổ của ${me.name}`;setTimeout(()=>{b.classList.remove("armed");b.textContent="Xóa tài khoản này và toàn bộ sổ"},5000);return}
  try{localStorage.removeItem(bookKey(me.id));localStorage.removeItem(bgKey(me.id))}catch{}
  $("#bgLayer").hidden=true;document.body.classList.remove("hasbg");
  accounts.list=accounts.list.filter(a=>a.id!==me.id);accounts.last=null;saveAccounts();
  b.classList.remove("armed");b.textContent="Xóa tài khoản này và toàn bộ sổ";
  me=null;showGate();toast("Đã xóa tài khoản");
};

/* ---------- look: per-account background, device-wide app icon ---------- */
const bgKey=id=>"sochi.bg."+id;
// Shrink a picked photo so it fits comfortably in local storage.
function shrinkImage(file,maxSide,square){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file), img=new Image();
    img.onload=()=>{
      let sx=0,sy=0,sw=img.naturalWidth,sh=img.naturalHeight;
      if(square){const m=Math.min(sw,sh);sx=(sw-m)/2;sy=(sh-m)/2;sw=sh=m}
      const k=Math.min(1,maxSide/Math.max(sw,sh)), w=Math.round(sw*k), h=Math.round(sh*k);
      const c=document.createElement("canvas");c.width=w;c.height=h;
      const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,w,h);g.drawImage(img,sx,sy,sw,sh,0,0,w,h);
      URL.revokeObjectURL(url);res(c.toDataURL(square?"image/png":"image/jpeg",.78));
    };
    img.onerror=()=>{URL.revokeObjectURL(url);rej()};
    img.src=url;
  });
}
function applyLook(){
  let bg=null;try{bg=localStorage.getItem(bgKey(me.id))}catch{}
  const layer=$("#bgLayer");
  layer.hidden=!bg;document.body.classList.toggle("hasbg",!!bg);
  layer.style.backgroundImage=bg?`url(${bg})`:"";
  const veil=settings.veil??55;
  layer.style.setProperty("--veil",veil/100);$("#veil").value=veil;
  $("#bgThumb").style.backgroundImage=bg?`url(${bg})`:"";
  $("#bgClear").hidden=!bg;$("#veilBox").hidden=!bg;
  let icon=null;try{icon=localStorage.getItem("sochi.icon")}catch{}
  $("#iconThumb").style.backgroundImage=`url(${icon||"icons/icon-180.png"})`;
  $("#iconClear").hidden=!icon;
}
$("#bgPick").onclick=()=>$("#bgFile").click();
$("#iconPick").onclick=()=>$("#iconFile").click();
$("#bgFile").onchange=async ev=>{
  const f=ev.target.files[0];ev.target.value="";if(!f)return;
  try{
    const d=await shrinkImage(f,1400,false);
    try{localStorage.setItem(bgKey(me.id),d)}catch{toast("Ảnh quá lớn, thử ảnh khác nhé");return}
    applyLook();toast("Đã đổi ảnh nền");
  }catch{toast("Không đọc được ảnh này")}
};
$("#bgClear").onclick=()=>{try{localStorage.removeItem(bgKey(me.id))}catch{}applyLook()};
$("#veil").oninput=ev=>$("#bgLayer").style.setProperty("--veil",ev.target.value/100);
$("#veil").onchange=ev=>{settings.veil=+ev.target.value;store.saveSettings()};
$("#iconFile").onchange=async ev=>{
  const f=ev.target.files[0];ev.target.value="";if(!f)return;
  try{
    const d=await shrinkImage(f,180,true);
    try{localStorage.setItem("sochi.icon",d)}catch{toast("Ảnh quá lớn, thử ảnh khác nhé");return}
    $("#touchIcon").href=d;applyLook();
    toast(standalone?"Đã lưu. Mở trang trong Safari rồi thêm lại vào màn hình chính":"Đã lưu. Giờ bấm Chia sẻ › Thêm vào Màn hình chính");
  }catch{toast("Không đọc được ảnh này")}
};
$("#iconClear").onclick=()=>{try{localStorage.removeItem("sochi.icon")}catch{}$("#touchIcon").href="icons/icon-180.png";applyLook()};

loadAccounts();
const lastAcct=accounts.list.find(a=>a.id===accounts.last);
if(lastAcct&&!lastAcct.pin)openAccount(lastAcct);
else showGate();
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
