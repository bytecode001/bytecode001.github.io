/* ============================================================
   Country Explorer — app.js (full, with robust fade-in/out)
   ------------------------------------------------------------
   - CSV load via PapaParse
   - Filters (search, continent, language, population, GDP pc)
   - Sort chips with null-last comparator
   - Dialog animations: open (.open), close (.closing) with RAF/reflow
   ============================================================ */

const CSV_PATH = "countries_dataset_2025_v1_0.csv";
const GDP_ALIASES = [
  "gdp_per_capita",
  "gdp_per_capita_usd",
  "gdp_usd_per_capita",
  "gdp_per_capita_current_usd"
];

/* DOM */
const els = {
  search: document.getElementById("searchInput"),
  continent: document.getElementById("continentSelect"),
  language: document.getElementById("languageSelect"),
  popMin: document.getElementById("popMin"),
  popMax: document.getElementById("popMax"),
  gdpRow: document.getElementById("gdpRow"),
  gdpMin: document.getElementById("gdpMin"),
  gdpMax: document.getElementById("gdpMax"),
  resetBtn: document.getElementById("resetBtn"),

  hint: document.getElementById("hintWrapper"),
  sortHint: document.getElementById("sortHint"),
  grid: document.getElementById("cardsGrid"),
  empty: document.getElementById("emptyState"),

  modal: document.getElementById("countryModal"),
  modalFlag: document.getElementById("modalFlag"),
  modalName: document.getElementById("modalName"),
  modalOfficial: document.getElementById("modalOfficial"),
  modalCapital: document.getElementById("modalCapital"),
  modalRegion: document.getElementById("modalRegion"),
  modalPopulation: document.getElementById("modalPopulation"),
  modalArea: document.getElementById("modalArea"),
  modalGDPpc: document.getElementById("modalGDPpc"),
  modalLanguages: document.getElementById("modalLanguages"),
  modalCurrencies: document.getElementById("modalCurrencies"),
  modalCodes: document.getElementById("modalCodes"),

  chipName: document.getElementById("chipName"),
  chipPopulation: document.getElementById("chipPopulation"),
  chipGDP: document.getElementById("chipGDP"),
  chipArea: document.getElementById("chipArea"),
};

/* State */
let rawData = [];
let data = [];
let filtered = [];
let gdpColumnFound = null;

let sortKey = "name";
let sortDir = "asc";

/* Utils */
function toNumber(v){ if(v==null||v==="") return null; const n=Number(String(v).replace(/[, ]/g,"")); return Number.isFinite(n)?n:null; }
function splitMultiFlexible(v){ if(!v) return []; const n=String(v).replace(/\s+and\s+/gi,",").replace(/[·]/g,","); return n.split(/[|/;,]/g).map(s=>s.trim()).filter(Boolean); }
function stripParentheses(s){ return String(s).replace(/\(.*?\)/g,"").trim(); }
function uniqueSorted(a){ return [...new Set(a)].sort((x,y)=>x.localeCompare(y,'en',{sensitivity:'base'})); }
function formatInt(n){ return n==null?"—":n.toLocaleString('it-IT'); }
function formatArea(n){ return n==null?"—":n.toLocaleString('it-IT',{maximumFractionDigits:0}); }
function formatGDP(n){ return n==null?"—":n.toLocaleString('en-US',{maximumFractionDigits:0}); }
function makeTag(t){ const s=document.createElement("span"); s.className="tag"; s.textContent=t; return s; }
function emojiFromISO2(iso2){ if(!iso2) return ""; const A=0x1F1E6, base="A".charCodeAt(0); return iso2.toUpperCase().slice(0,2).split("").map(c=>String.fromCodePoint(A+(c.charCodeAt(0)-base))).join(""); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* CSV */
async function loadCSV(){
  return new Promise((resolve,reject)=>{
    Papa.parse(CSV_PATH,{header:true,download:true,dynamicTyping:false,skipEmptyLines:true,
      complete:r=>resolve(r.data), error:err=>reject(err)});
  });
}
function detectGDPColumn(firstRow){ for(const a of GDP_ALIASES){ if(Object.hasOwn(firstRow,a)) return a; } return null; }
function normalize(rows){
  if(!rows.length) return [];
  gdpColumnFound = detectGDPColumn(rows[0]) || null;

  return rows.map(r=>{
    const languages = splitMultiFlexible(r.languages_official).map(stripParentheses).map(s=>s.trim()).filter(Boolean);
    const currencies = splitMultiFlexible(r.currency_name).map(stripParentheses).filter(Boolean);
    const iso2 = String(r.iso2||"").toUpperCase();
    const gdp_pc = gdpColumnFound ? toNumber(r[gdpColumnFound]) : null;

    return {
      _row:r,
      name: r.country || r.iso3 || "Unknown",
      capital: r.capital || "",
      continent: r.continent || r.region_un || "",
      population: toNumber(r.population),
      area: toNumber(r.area_km2),
      gdp_pc,
      languages, currencies,
      iso2, iso3: String(r.iso3||"").toUpperCase(),
      isoNum: r.iso_numeric ? String(r.iso_numeric).trim() : "",
      flagEmoji: r.flag_emoji || emojiFromISO2(iso2)
    };
  });
}

/* Filters + sort */
function populateFilters(list){
  const continents = uniqueSorted(list.map(d=>d.continent).filter(Boolean));
  els.continent.innerHTML = `<option value="">All</option>`+continents.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

  const langSet = uniqueSorted(list.flatMap(d=>d.languages)).slice(0,100);
  els.language.innerHTML = `<option value="">All</option>`+langSet.map(l=>`<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join("");
  const anyLang = list.some(d=>d.languages.length);
  els.language.parentElement.style.display = anyLang ? "" : "none";

  els.gdpRow.style.display = gdpColumnFound ? "" : "none";
  els.chipGDP.style.display = gdpColumnFound ? "" : "none";
}

function applyFilters(){
  const q = els.search.value.trim().toLowerCase();
  const cont = els.continent.value;
  const lang = els.language.value;
  const minPop = toNumber(els.popMin.value);
  const maxPop = toNumber(els.popMax.value);
  const minGDP = toNumber(els.gdpMin.value);
  const maxGDP = toNumber(els.gdpMax.value);

  filtered = data.filter(d=>{
    if(q){
      const hay = [d.name,d.capital,d.iso2,d.iso3,d.continent].filter(Boolean).join(" ").toLowerCase();
      if(!hay.includes(q)) return false;
    }
    if(cont && d.continent!==cont) return false;
    if(lang && !d.languages.some(l=>l.toLowerCase()===lang.toLowerCase())) return false;

    if(minPop!=null && (d.population==null || d.population<minPop)) return false;
    if(maxPop!=null && (d.population==null || d.population>maxPop)) return false;

    if(gdpColumnFound){
      if(minGDP!=null && (d.gdp_pc==null || d.gdp_pc<minGDP)) return false;
      if(maxGDP!=null && (d.gdp_pc==null || d.gdp_pc>maxGDP)) return false;
    }
    return true;
  });

  sortAndRender();
  updateHint();
}

function compareNullLast(aVal,bVal,dir,isString){
  const aNull = (aVal==null || aVal==="");
  const bNull = (bVal==null || bVal==="");
  if(aNull && bNull) return 0;
  if(aNull) return 1;
  if(bNull) return -1;

  let res;
  if(isString){
    res = String(aVal).localeCompare(String(bVal),'en',{sensitivity:'base'});
  }else{
    const na=Number(aVal), nb=Number(bVal);
    if(Number.isNaN(na) && Number.isNaN(nb)) res=0;
    else if(Number.isNaN(na)) return 1;
    else if(Number.isNaN(nb)) return -1;
    else res = na===nb ? 0 : (na<nb ? -1 : 1);
  }
  return dir==="asc" ? res : -res;
}

function sortAndRender(){
  const list = [...filtered];
  const isStringKey = (k)=> (k==="name" || k==="continent");

  list.sort((a,b)=>{
    const va=a[sortKey], vb=b[sortKey];
    const isStr = isStringKey(sortKey) || (typeof va==="string" || typeof vb==="string");
    return compareNullLast(va,vb,sortDir,isStr);
  });

  renderGrid(list);
  updateSortUI();
}

function updateHint(){ els.hint.textContent = `${filtered.length} results out of ${data.length} countries`; }

function renderGrid(list){
  els.grid.innerHTML = "";
  els.empty.classList.toggle("hidden", list.length>0);
  const frag=document.createDocumentFragment();
  list.forEach(d=>frag.appendChild(makeCard(d)));
  els.grid.appendChild(frag);
}

function makeCard(d){
  const card=document.createElement("article");
  card.className="card";
  card.setAttribute("tabindex","0");
  card.setAttribute("role","button");
  card.addEventListener("click",()=>openModal(d));
  card.addEventListener("keydown",(e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); openModal(d); }});

  const header=document.createElement("div");
  header.className="card-header";

  const flag=document.createElement("div");
  flag.className="flag";
  flag.textContent=d.flagEmoji||"🏳️";

  const titleWrap=document.createElement("div");
  const title=document.createElement("div");
  title.className="country-name";
  title.textContent=d.name;
  const sub=document.createElement("div");
  sub.className="country-capital";
  sub.textContent=d.capital?`Capital: ${d.capital}`:"Capital: —";
  titleWrap.appendChild(title); titleWrap.appendChild(sub);

  header.appendChild(flag); header.appendChild(titleWrap);

  const meta=document.createElement("div");
  meta.className="meta";

  const region=document.createElement("div");
  region.className="kpi";
  region.innerHTML=`<span>🌐</span><span>${escapeHtml(d.continent||"—")}</span>`;

  const pop=document.createElement("div");
  pop.className="kpi";
  pop.innerHTML=`<span>👥</span><span><strong>${formatInt(d.population)}</strong></span>`;

  meta.appendChild(region); meta.appendChild(pop);

  if(d.gdp_pc!=null){
    const gdp=document.createElement("div");
    gdp.className="kpi";
    gdp.innerHTML=`<span>💰</span><span>GDP pc: <strong>${formatGDP(d.gdp_pc)}</strong></span>`;
    meta.appendChild(gdp);
  }

  card.appendChild(header);
  card.appendChild(meta);
  return card;
}

/* Modal — open with fade-in, close with fade-out */
function openModal(d){
  // fill content
  els.modalFlag.textContent = d.flagEmoji || "🏳️";
  els.modalName.textContent = d.name;
  els.modalOfficial.textContent = "";
  els.modalCapital.textContent = d.capital || "—";
  els.modalRegion.textContent = d.continent || "—";
  els.modalPopulation.textContent = formatInt(d.population);
  els.modalArea.textContent = formatArea(d.area);
  els.modalGDPpc.textContent = d.gdp_pc!=null ? `$${formatGDP(d.gdp_pc)}` : "—";

  els.modalLanguages.innerHTML="";
  if(d.languages?.length){ d.languages.forEach(l=>els.modalLanguages.appendChild(makeTag(l))); }
  else { els.modalLanguages.textContent="—"; }

  els.modalCurrencies.innerHTML="";
  if(d.currencies?.length){ d.currencies.forEach(c=>els.modalCurrencies.appendChild(makeTag(c))); }
  else { els.modalCurrencies.textContent="—"; }

  const codes=[];
  if(d.iso2) codes.push(`ISO2: ${d.iso2}`);
  if(d.iso3) codes.push(`ISO3: ${d.iso3}`);
  if(d.isoNum) codes.push(`ISO numeric: ${d.isoNum}`);
  els.modalCodes.textContent = codes.join("  •  ") || "—";

  // prepare animation classes
  els.modal.classList.remove("closing","open");

  // open dialog (adds [open] so backdrop exists)
  if(typeof els.modal.showModal==="function"){ els.modal.showModal(); }
  else { els.modal.setAttribute("open",""); }

  // Force a reflow so the base styles (opacity 0 / scale .97) apply before adding .open
  // This ensures the transition runs reliably across browsers.
  // Using double RAF improves Safari reliability.
  requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
    els.modal.classList.add("open");
  }); });
}

function closeModalSmooth(){
  if(!els.modal.hasAttribute("open")) return;
  // remove .open to go back to base state, then add .closing (backdrop to 0)
  els.modal.classList.remove("open");
  els.modal.classList.add("closing");

  const onEnd=(e)=>{
    if(e.propertyName!=="opacity") return;
    els.modal.removeEventListener("transitionend", onEnd);
    els.modal.classList.remove("closing");
    els.modal.close();
  };
  els.modal.addEventListener("transitionend", onEnd);
}

/* Sorting UI */
function clearChipStates(){
  [els.chipName, els.chipPopulation, els.chipGDP, els.chipArea].forEach(ch=>{
    if(!ch) return;
    ch.classList.remove("active","asc","desc");
    ch.setAttribute("aria-pressed","false");
  });
}
function updateSortUI(){
  clearChipStates();
  const chip = {name:els.chipName, population:els.chipPopulation, gdp_pc:els.chipGDP, area:els.chipArea}[sortKey];
  if(!chip) return;
  chip.classList.add("active",sortDir);
  chip.setAttribute("aria-pressed","true");
  const label = chip.textContent.trim();
  els.sortHint.textContent = `Sorting by ${label} ${sortDir==="asc"?"▲":"▼"}`;
}
function onChipClick(e){
  const key=e.currentTarget.getAttribute("data-key");
  if(!key) return;
  if(sortKey===key){ sortDir = (sortDir==="asc")?"desc":"asc"; }
  else { sortKey=key; sortDir="asc"; }
  sortAndRender();
}

/* Events & init */
function bindEvents(){
  ["input","change"].forEach(ev=>{
    els.search.addEventListener(ev,applyFilters);
    els.continent.addEventListener(ev,applyFilters);
    els.language.addEventListener(ev,applyFilters);
    els.popMin.addEventListener(ev,applyFilters);
    els.popMax.addEventListener(ev,applyFilters);
    els.gdpMin.addEventListener(ev,applyFilters);
    els.gdpMax.addEventListener(ev,applyFilters);
  });

  els.chipName.addEventListener("click",onChipClick);
  els.chipPopulation.addEventListener("click",onChipClick);
  els.chipGDP.addEventListener("click",onChipClick);
  els.chipArea.addEventListener("click",onChipClick);

  els.resetBtn.addEventListener("click", ()=>{
    els.search.value=""; els.continent.value=""; els.language.value="";
    els.popMin.value=""; els.popMax.value="";
    els.gdpMin.value=""; els.gdpMax.value="";
    sortKey="name"; sortDir="asc";
    applyFilters();
  });

  // Close actions
  document.querySelectorAll('[value="close"]').forEach(btn=>{
    btn.addEventListener("click",(e)=>{ e.preventDefault(); closeModalSmooth(); });
  });
  els.modal.addEventListener("cancel",(e)=>{ e.preventDefault(); closeModalSmooth(); });
  els.modal.addEventListener("click",(e)=>{ if(e.target===els.modal) closeModalSmooth(); });
}

(async function init(){
  try{
    rawData = await loadCSV();
    data = normalize(rawData);
    populateFilters(data);
    applyFilters();
    bindEvents();
  }catch(err){
    console.error(err);
    els.hint.textContent = "Failed to load CSV. Make sure the file is in the same folder.";
  }
})();
