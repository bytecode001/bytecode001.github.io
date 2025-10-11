/* ============================================================
   Country Explorer — app.js (full)
   ------------------------------------------------------------
   Features:
   - Load CSV with PapaParse
   - Normalize columns from your dataset
   - Filters: Search, Continent, Language, Population range,
              GDP per capita range (auto-hides if missing)
   - Sort chips (Name, Population, GDP per capita, Area)
     · click once = asc, click again = desc
     · switch chip = asc on the new key
   - Null-last comparator: missing values are always at the end
   ============================================================ */

/* --------------------------
   Config
   -------------------------- */

// CSV path (same folder as index.html)
const CSV_PATH = "countries_dataset_2025_v1_0.csv";

// GDP per capita aliases supported (pick the first available)
const GDP_ALIASES = [
  "gdp_per_capita",
  "gdp_per_capita_usd",
  "gdp_usd_per_capita",
  "gdp_per_capita_current_usd"
];

/* --------------------------
   DOM references
   -------------------------- */
const els = {
  // Filters
  search: document.getElementById("searchInput"),
  continent: document.getElementById("continentSelect"),
  language: document.getElementById("languageSelect"),
  popMin: document.getElementById("popMin"),
  popMax: document.getElementById("popMax"),
  gdpRow: document.getElementById("gdpRow"),
  gdpMin: document.getElementById("gdpMin"),
  gdpMax: document.getElementById("gdpMax"),
  resetBtn: document.getElementById("resetBtn"),

  // Results + hints
  hint: document.getElementById("hintWrapper"),
  sortHint: document.getElementById("sortHint"),
  grid: document.getElementById("cardsGrid"),
  empty: document.getElementById("emptyState"),

  // Modal
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

  // Sort chips
  chipName: document.getElementById("chipName"),
  chipPopulation: document.getElementById("chipPopulation"),
  chipGDP: document.getElementById("chipGDP"),
  chipArea: document.getElementById("chipArea"),
};

/* --------------------------
   State
   -------------------------- */
let rawData = [];
let data = [];         // normalized dataset
let filtered = [];     // filtered list (unsorted)
let gdpColumnFound = null;

// Sort state
let sortKey = "name";  // default sort key
let sortDir = "asc";   // "asc" | "desc"

/* --------------------------
   Utilities
   -------------------------- */

/** Convert to number, handling spaces/commas as thousands separators. */
function toNumber(v){
  if(v == null || v === "") return null;
  const n = Number(String(v).replace(/[, ]/g,""));
  return Number.isFinite(n) ? n : null;
}

/** Split multi-value fields (commas, semicolons, slashes, pipes, middots, and "and"). */
function splitMultiFlexible(v){
  if(!v) return [];
  const normalized = String(v)
    .replace(/\s+and\s+/gi, ",")
    .replace(/[·]/g, ",");
  return normalized
    .split(/[|/;,]/g)
    .map(s => s.trim())
    .filter(Boolean);
}

/** Remove parenthetical notes (e.g., "Spanish (official)" → "Spanish"). */
function stripParentheses(s){
  return String(s).replace(/\(.*?\)/g,"").trim();
}

/** Unique + alphabetical (case-insensitive). */
function uniqueSorted(arr){
  return [...new Set(arr)].sort((a,b)=> a.localeCompare(b,'en',{sensitivity:'base'}));
}

/** Format integers with Italian grouping (e.g., 1.234.567). */
function formatInt(n){
  if(n == null) return "—";
  return n.toLocaleString('it-IT');
}

/** Format area (km²) without decimals. */
function formatArea(n){
  if(n == null) return "—";
  return n.toLocaleString('it-IT', {maximumFractionDigits:0});
}

/** Format GDP per capita in USD (0 decimals). */
function formatGDP(n){
  if(n == null) return "—";
  return n.toLocaleString('en-US', {maximumFractionDigits:0});
}

/** Create a pill tag. */
function makeTag(text){
  const span = document.createElement("span");
  span.className = "tag";
  span.textContent = text;
  return span;
}

/** Build a flag emoji from ISO2 (fallback). */
function emojiFromISO2(iso2){
  if(!iso2) return "";
  const A = 0x1F1E6;
  const base = "A".charCodeAt(0);
  const chars = iso2.toUpperCase().slice(0,2).split("").map(c => String.fromCodePoint(A + (c.charCodeAt(0) - base)));
  return chars.join("");
}

/** Basic HTML escaping. */
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* --------------------------
   CSV loading & normalization
   -------------------------- */

/** Load CSV via PapaParse. */
async function loadCSV(){
  return new Promise((resolve, reject) => {
    Papa.parse(CSV_PATH, {
      header: true,
      download: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: results => resolve(results.data),
      error: err => reject(err)
    });
  });
}

/** Detect which GDP per capita header is present, if any. */
function detectGDPColumn(firstRow){
  for(const alias of GDP_ALIASES){
    if(Object.hasOwn(firstRow, alias)) return alias;
  }
  return null;
}

/** Normalize dataset to the fields used by the UI. */
function normalize(rows){
  if(!rows.length) return [];
  gdpColumnFound = detectGDPColumn(rows[0]) || null;

  return rows.map(r => {
    const name = r.country || "";
    const capital = r.capital || "";
    const continent = r.continent || r.region_un || "";
    const population = toNumber(r.population);
    const area = toNumber(r.area_km2);

    const languages = splitMultiFlexible(r.languages_official)
      .map(stripParentheses)
      .map(s => s.trim())
      .filter(Boolean);

    const currencies = splitMultiFlexible(r.currency_name)
      .map(stripParentheses)
      .filter(Boolean);

    const iso2 = String(r.iso2 || "").toUpperCase();
    const iso3 = String(r.iso3 || "").toUpperCase();
    const isoNum = r.iso_numeric ? String(r.iso_numeric).trim() : "";
    const flagEmoji = r.flag_emoji || emojiFromISO2(iso2);

    const gdp_pc = gdpColumnFound ? toNumber(r[gdpColumnFound]) : null;

    return {
      _row: r, // keep original row (handy if export is reintroduced)
      name: name || iso3 || "Unknown",
      capital,
      continent,
      population,
      area,
      gdp_pc,
      languages,
      currencies,
      iso2, iso3, isoNum,
      flagEmoji
    };
  });
}

/* --------------------------
   Filtering, sorting & rendering
   -------------------------- */

/** Populate filter dropdowns and show/hide GDP row & chip. */
function populateFilters(list){
  // Continents
  const continents = uniqueSorted(list.map(d => d.continent).filter(Boolean));
  els.continent.innerHTML =
    `<option value="">All</option>` +
    continents.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

  // Languages
  const langSet = uniqueSorted(list.flatMap(d => d.languages)).slice(0, 100);
  els.language.innerHTML =
    `<option value="">All</option>` +
    langSet.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join("");

  // Hide language select if dataset has no languages
  const anyLang = list.some(d => d.languages.length);
  els.language.parentElement.style.display = anyLang ? "" : "none";

  // GDP UI parts visibility
  els.gdpRow.style.display = gdpColumnFound ? "" : "none";
  els.chipGDP.style.display = gdpColumnFound ? "" : "none";
}

/** Apply filters, then sort and render. */
function applyFilters(){
  const q = els.search.value.trim().toLowerCase();
  const cont = els.continent.value;
  const lang = els.language.value;
  const minPop = toNumber(els.popMin.value);
  const maxPop = toNumber(els.popMax.value);
  const minGDP = toNumber(els.gdpMin.value);
  const maxGDP = toNumber(els.gdpMax.value);

  filtered = data.filter(d => {
    if(q){
      const hay = [d.name, d.capital, d.iso2, d.iso3, d.continent]
        .filter(Boolean).join(" ").toLowerCase();
      if(!hay.includes(q)) return false;
    }
    if(cont && d.continent !== cont) return false;
    if(lang && !d.languages.some(l => l.toLowerCase() === lang.toLowerCase())) return false;

    if(minPop != null && (d.population == null || d.population < minPop)) return false;
    if(maxPop != null && (d.population == null || d.population > maxPop)) return false;

    if(gdpColumnFound){
      if(minGDP != null && (d.gdp_pc == null || d.gdp_pc < minGDP)) return false;
      if(maxGDP != null && (d.gdp_pc == null || d.gdp_pc > maxGDP)) return false;
    }

    return true;
  });

  sortAndRender();
  updateHint();
}

/** Null-last comparator: missing values are always at the end (asc or desc). */
function compareNullLast(aVal, bVal, dir, isString){
  const aNull = (aVal == null || aVal === "");
  const bNull = (bVal == null || bVal === "");
  if (aNull && bNull) return 0;
  if (aNull) return 1;    // a goes after b (null at bottom)
  if (bNull) return -1;   // b goes after a (null at bottom)

  let res;
  if (isString) {
    res = String(aVal).localeCompare(String(bVal), 'en', {sensitivity:'base'});
  } else {
    const na = Number(aVal);
    const nb = Number(bVal);
    if (Number.isNaN(na) && Number.isNaN(nb)) res = 0;
    else if (Number.isNaN(na)) return 1;   // NaN to bottom
    else if (Number.isNaN(nb)) return -1;  // NaN to bottom
    else res = na === nb ? 0 : (na < nb ? -1 : 1);
  }
  return dir === "asc" ? res : -res;
}

/** Sort filtered results using current sortKey/sortDir and render. */
function sortAndRender(){
  const list = [...filtered];

  const isStringKey = (key) => (key === "name" || key === "continent");

  list.sort((a,b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    const isStr = isStringKey(sortKey) || (typeof va === "string" || typeof vb === "string");
    return compareNullLast(va, vb, sortDir, isStr);
  });

  renderGrid(list);
  updateSortUI();
}

/** Update results hint. */
function updateHint(){
  els.hint.textContent = `${filtered.length} results out of ${data.length} countries`;
}

/** Render the cards grid. */
function renderGrid(list){
  els.grid.innerHTML = "";
  els.empty.classList.toggle("hidden", list.length > 0);

  const frag = document.createDocumentFragment();
  list.forEach(d => frag.appendChild(makeCard(d)));
  els.grid.appendChild(frag);
}

/** Build a single country card node. */
function makeCard(d){
  const card = document.createElement("article");
  card.className = "card";
  card.setAttribute("tabindex","0");
  card.setAttribute("role","button");
  card.addEventListener("click", () => openModal(d));
  card.addEventListener("keydown", (e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); openModal(d); }});

  const header = document.createElement("div");
  header.className = "card-header";

  const flag = document.createElement("div");
  flag.className = "flag";
  flag.textContent = d.flagEmoji || "🏳️";

  const titleWrap = document.createElement("div");
  const title = document.createElement("div");
  title.className = "country-name";
  title.textContent = d.name;
  const sub = document.createElement("div");
  sub.className = "country-capital";
  sub.textContent = d.capital ? `Capital: ${d.capital}` : "Capital: —";

  titleWrap.appendChild(title);
  titleWrap.appendChild(sub);
  header.appendChild(flag);
  header.appendChild(titleWrap);

  const meta = document.createElement("div");
  meta.className = "meta";

  const region = document.createElement("div");
  region.className = "kpi";
  region.innerHTML = `<span>🌐</span><span>${escapeHtml(d.continent || "—")}</span>`;

  const pop = document.createElement("div");
  pop.className = "kpi";
  pop.innerHTML = `<span>👥</span><span><strong>${formatInt(d.population)}</strong></span>`;

  meta.appendChild(region);
  meta.appendChild(pop);

  if(d.gdp_pc != null){
    const gdp = document.createElement("div");
    gdp.className = "kpi";
    gdp.innerHTML = `<span>💰</span><span>GDP pc: <strong>${formatGDP(d.gdp_pc)}</strong></span>`;
    meta.appendChild(gdp);
  }

  card.appendChild(header);
  card.appendChild(meta);

  return card;
}

/** Fill and open the modal with country details. */
function openModal(d){
  els.modalFlag.textContent = d.flagEmoji || "🏳️";
  els.modalName.textContent = d.name;
  els.modalOfficial.textContent = ""; // not present in CSV
  els.modalCapital.textContent = d.capital || "—";
  els.modalRegion.textContent = d.continent || "—";
  els.modalPopulation.textContent = formatInt(d.population);
  els.modalArea.textContent = formatArea(d.area);
  els.modalGDPpc.textContent = d.gdp_pc != null ? `$${formatGDP(d.gdp_pc)}` : "—";

  // Languages
  els.modalLanguages.innerHTML = "";
  if(d.languages?.length){
    d.languages.forEach(l => els.modalLanguages.appendChild(makeTag(l)));
  } else {
    els.modalLanguages.textContent = "—";
  }

  // Currencies
  els.modalCurrencies.innerHTML = "";
  if(d.currencies?.length){
    d.currencies.forEach(c => els.modalCurrencies.appendChild(makeTag(c)));
  } else {
    els.modalCurrencies.textContent = "—";
  }

  // Codes
  const codes = [];
  if(d.iso2) codes.push(`ISO2: ${d.iso2}`);
  if(d.iso3) codes.push(`ISO3: ${d.iso3}`);
  if(d.isoNum) codes.push(`ISO numeric: ${d.isoNum}`);
  els.modalCodes.textContent = codes.join("  •  ") || "—";

  if(typeof els.modal.showModal === "function"){
    els.modal.showModal();
  } else {
    els.modal.setAttribute("open", "");
  }
}

/* --------------------------
   Sorting UI behaviour
   -------------------------- */

/** Remove state classes from all chips. */
function clearChipStates(){
  [els.chipName, els.chipPopulation, els.chipGDP, els.chipArea].forEach(chip => {
    if(!chip) return;
    chip.classList.remove("active","asc","desc");
    chip.setAttribute("aria-pressed","false");
  });
}

/** Update chip visual state + on-screen hint. */
function updateSortUI(){
  clearChipStates();

  const chip = {
    name: els.chipName,
    population: els.chipPopulation,
    gdp_pc: els.chipGDP,
    area: els.chipArea
  }[sortKey];

  if(!chip) return;
  chip.classList.add("active", sortDir);
  chip.setAttribute("aria-pressed","true");

  const label = chip.textContent.trim();
  const arrow = sortDir === "asc" ? "▲" : "▼";
  els.sortHint.textContent = `Sorting by ${label} ${arrow}`;
}

/** Click handler for chips: toggle dir if same key, otherwise set new key asc. */
function onChipClick(e){
  const key = e.currentTarget.getAttribute("data-key");
  if(!key) return;

  if(sortKey === key){
    sortDir = (sortDir === "asc") ? "desc" : "asc";
  } else {
    sortKey = key;
    sortDir = "asc";
  }

  sortAndRender();
}

/* --------------------------
   Events & bootstrap
   -------------------------- */

function bindEvents(){
  ["input","change"].forEach(ev => {
    els.search.addEventListener(ev, applyFilters);
    els.continent.addEventListener(ev, applyFilters);
    els.language.addEventListener(ev, applyFilters);
    els.popMin.addEventListener(ev, applyFilters);
    els.popMax.addEventListener(ev, applyFilters);
    els.gdpMin.addEventListener(ev, applyFilters);
    els.gdpMax.addEventListener(ev, applyFilters);
  });

  // Sort chips
  els.chipName.addEventListener("click", onChipClick);
  els.chipPopulation.addEventListener("click", onChipClick);
  els.chipGDP.addEventListener("click", onChipClick);
  els.chipArea.addEventListener("click", onChipClick);

  // Reset button clears filters and resets sort
  els.resetBtn.addEventListener("click", () => {
    els.search.value = "";
    els.continent.value = "";
    els.language.value = "";
    els.popMin.value = "";
    els.popMax.value = "";
    els.gdpMin.value = "";
    els.gdpMax.value = "";

    sortKey = "name";
    sortDir = "asc";

    applyFilters();
  });
}

// Init
(async function init(){
  try{
    rawData = await loadCSV();
    data = normalize(rawData);

    // Prepare UI from dataset and run first filter+sort+render
    populateFilters(data);
    applyFilters();

    // Wire events
    bindEvents();
  }catch(err){
    console.error(err);
    els.hint.textContent = "Failed to load CSV. Make sure the file is in the same folder.";
  }
})();
