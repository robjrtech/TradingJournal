/* ═══════════════════════════════════════════════════
   SAMPLE TRADE DATA
   Replace / extend with real data from your broker.
   Format: { "YYYY-MM-DD": [ tradeObj, … ] }
   tradeObj fields: symbol, side, qty, entry, exit, pnl
═══════════════════════════════════════════════════ */
const tradeData = {
};

/* ═══════════════════════════════════════════════
   IMPORTED TRADE DATA (persisted in localStorage)
   Merged on top of the built-in sampleTradeData.
═══════════════════════════════════════════════ */
const sampleTradeData = JSON.parse(JSON.stringify(tradeData)); // snapshot of built-ins

function getImportedTrades() {
  try { return JSON.parse(localStorage.getItem("importedTrades") || "{}"); } catch { return {}; }
}

function saveImportedTrades(data) {
  localStorage.setItem("importedTrades", JSON.stringify(data));
}

function mergeTradeData() {
  // Reset to sample, then overlay imported trades
  Object.keys(tradeData).forEach(k => { if (!sampleTradeData[k]) delete tradeData[k]; });
  Object.assign(tradeData, JSON.parse(JSON.stringify(sampleTradeData)));
  const imported = getImportedTrades();
  Object.entries(imported).forEach(([date, trades]) => {
    if (!tradeData[date]) tradeData[date] = [];
    tradeData[date] = tradeData[date].concat(trades);
  });
}

/* ═══════════════════════════════════════════════
   DAY NOTES (persisted in localStorage)
═══════════════════════════════════════════════ */
function getNotes() {
  try { return JSON.parse(localStorage.getItem("tradeNotes") || "{}"); } catch { return {}; }
}
function setNote(dateKey, text) {
  const notes = getNotes();
  notes[dateKey] = text;
  localStorage.setItem("tradeNotes", JSON.stringify(notes));
}

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
function fmtPnl(v) {
  const abs = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v >= 0 ? "+$" : "-$") + abs;
}

function fmtPrice(v) {
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dayPnl(dateKey) {
  const trades = tradeData[dateKey];
  if (!trades || trades.length === 0) return null;
  return trades.reduce((s, t) => s + t.pnl, 0);
}

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/* ═══════════════════════════════════════════════
   CALENDAR STATE
═══════════════════════════════════════════════ */
const today = new Date();
let calYear  = today.getFullYear();
let calMonth = today.getMonth(); // 0-based

function changeMonth(delta) {
  calMonth += delta;
  if (calMonth > 11) { calMonth = 0;  calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

function renderCalendar() {
  const grid    = document.getElementById("cal-grid");
  const summary = document.getElementById("cal-month-summary");
  document.getElementById("cal-month-title").textContent =
    `${MONTHS[calMonth]} ${calYear}`;

  grid.innerHTML = "";

  /* Day-of-week headers */
  DAYS_SHORT.forEach(d => {
    const h = document.createElement("div");
    h.className = "cal-header-cell";
    h.textContent = d;
    grid.appendChild(h);
  });
  /* Week total header */
  const wh = document.createElement("div");
  wh.className = "cal-header-cell week-header";
  wh.textContent = "Week";
  grid.appendChild(wh);

  /* Build day grid */
  const firstDay = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

  let cells = [];

  // Padding from previous month
  for (let p = firstDay - 1; p >= 0; p--) {
    cells.push({ day: daysInPrevMonth - p, month: calMonth - 1, year: calYear, outside: true });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: calMonth, year: calYear, outside: false });
  }
  // Pad to complete last row (need multiple of 7)
  let trailing = 1;
  while ((cells.length % 7) !== 0) {
    cells.push({ day: trailing++, month: calMonth + 1, year: calYear, outside: true });
  }

  /* Render rows */
  let monthPnl = 0, tradingDays = 0, winDays = 0, totalTrades = 0;

  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    let weekPnl = 0;
    let weekHasTrades = false;

    week.forEach(cell => {
      const m = ((cell.month % 12) + 12) % 12;
      const y = cell.month < 0 ? cell.year - 1 : (cell.month > 11 ? cell.year + 1 : cell.year);
      const mm = String(m + 1).padStart(2, "0");
      const dd = String(cell.day).padStart(2, "0");
      const dateKey = `${y}-${mm}-${dd}`;
      const pnl = cell.outside ? null : dayPnl(dateKey);

      const div = document.createElement("div");
      div.className = "cal-day";
      if (cell.outside) div.classList.add("outside-month");

      // Today highlight
      if (!cell.outside && cell.day === today.getDate() &&
          calMonth === today.getMonth() && calYear === today.getFullYear()) {
        div.classList.add("today");
      }

      const numEl = document.createElement("div");
      numEl.className = "cal-day-num";
      numEl.textContent = cell.day;
      div.appendChild(numEl);

      if (pnl !== null) {
        div.classList.add("has-trades");
        const pnlEl = document.createElement("div");
        pnlEl.className = "cal-day-pnl";
        pnlEl.textContent = fmtPnl(pnl);
        div.appendChild(pnlEl);

        const tradesEl = document.createElement("div");
        tradesEl.className = "cal-day-trades";
        const cnt = tradeData[dateKey].length;
        tradesEl.textContent = cnt + " trade" + (cnt !== 1 ? "s" : "");
        div.appendChild(tradesEl);

        if (pnl >= 0) {
          div.classList.add("win");
          winDays++;
        } else {
          div.classList.add("loss");
        }

        weekPnl += pnl;
        weekHasTrades = true;
        monthPnl += pnl;
        tradingDays++;
        totalTrades += tradeData[dateKey].length;

        div.addEventListener("click", () => openModal(dateKey));
      }

      grid.appendChild(div);
    });

    /* Week total cell */
    const wtCell = document.createElement("div");
    wtCell.className = "cal-week-total";
    if (weekHasTrades) {
      const lbl = document.createElement("div");
      lbl.className = "cal-week-label";
      lbl.textContent = "Week";
      const val = document.createElement("div");
      val.className = "cal-week-pnl";
      val.textContent = fmtPnl(weekPnl);
      wtCell.classList.add(weekPnl >= 0 ? "win" : "loss");
      wtCell.appendChild(lbl);
      wtCell.appendChild(val);
    }
    grid.appendChild(wtCell);
  }

  /* Month summary chips */
  summary.innerHTML = "";
  const chips = [
    { label: "Month P&L",    value: fmtPnl(monthPnl),       cls: monthPnl >= 0 ? "pos" : "neg" },
    { label: "Trading Days", value: tradingDays,             cls: "" },
    { label: "Win Days",     value: winDays,                 cls: "pos" },
    { label: "Loss Days",    value: tradingDays - winDays,   cls: tradingDays - winDays > 0 ? "neg" : "" },
    { label: "Total Trades", value: totalTrades,             cls: "" },
    { label: "Win Day Rate", value: tradingDays > 0 ? Math.round(winDays / tradingDays * 100) + "%" : "—", cls: "" },
  ];
  chips.forEach(c => {
    const chip = document.createElement("div");
    chip.className = "cal-summary-chip " + c.cls;
    chip.innerHTML = c.label + ": <span>" + c.value + "</span>";
    summary.appendChild(chip);
  });
}

/* ═══════════════════════════════════════════════
   MODAL
═══════════════════════════════════════════════ */
let currentModalDate = null;

function openModal(dateKey) {
  currentModalDate = dateKey;
  const trades = tradeData[dateKey] || [];
  const pnl    = trades.reduce((s, t) => s + t.pnl, 0);
  const notes  = getNotes();

  // Date title
  const d = new Date(dateKey + "T00:00:00");
  const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  document.getElementById("modal-date-title").textContent =
    d.toLocaleDateString("en-US", opts);
  document.getElementById("modal-date-sub").textContent =
    trades.length + " trade" + (trades.length !== 1 ? "s" : "") + " taken";

  // Banner
  const banner = document.getElementById("modal-pnl-banner");
  banner.className = "modal-pnl-banner " + (pnl >= 0 ? "win" : "loss");
  document.getElementById("modal-pnl-value").textContent = fmtPnl(pnl);
  document.getElementById("modal-trade-count").textContent = trades.length;

  // Trade table
  const body = document.getElementById("modal-trade-body");
  let html = `<table class="trade-table">
    <thead>
      <tr>
        <th>Symbol</th>
        <th>Side</th>
        <th>Qty</th>
        <th>Entry</th>
        <th>Exit</th>
        <th>P&amp;L</th>
      </tr>
    </thead>
    <tbody>`;
  trades.forEach((t, idx) => {
    const pnlClass = t.pnl >= 0 ? "pnl-pos" : "pnl-neg";
    const sideClass = t.side === "long" ? "side-long" : "side-short";
    html += `<tr class="clickable-row" onclick="openTradeDetail('${dateKey}', ${idx})" title="View trade detail">
      <td><strong>${t.symbol}</strong></td>
      <td><span class="${sideClass}">${t.side.toUpperCase()}</span></td>
      <td>${t.qty}</td>
      <td>${fmtPrice(t.entry)}</td>
      <td>${fmtPrice(t.exit)}</td>
      <td class="${pnlClass}">${fmtPnl(t.pnl)}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  body.innerHTML = html;

  // Notes
  document.getElementById("modal-notes").value = notes[dateKey] || "";

  // Open
  document.getElementById("modal-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.body.style.overflow = "";
  currentModalDate = null;
}

function closeModalOnOverlay(e) {
  if (e.target === document.getElementById("modal-overlay")) closeModal();
}

function saveNote() {
  if (!currentModalDate) return;
  const text = document.getElementById("modal-notes").value.trim();
  setNote(currentModalDate, text);
  const btn = document.querySelector(".modal-save-btn");
  btn.textContent = "✓ Saved!";
  setTimeout(() => { btn.textContent = "Save Note"; }, 1500);
}

/* ═══════════════════════════════════════════════
   SIDEBAR NAV
═══════════════════════════════════════════════ */
document.querySelectorAll(".sidebar-item[data-page]").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("active"));
    item.classList.add("active");
    const page = item.dataset.page;
    document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
    document.getElementById("page-" + page).classList.add("active");
  });
});

/* ═══════════════════════════════════════════════
   DASHBOARD STATS (from tradeData)
═══════════════════════════════════════════════ */
function updateDashStats() {
  let totalPnl = 0, totalTrades = 0, winTrades = 0, tradingDays = 0;
  Object.entries(tradeData).forEach(([, trades]) => {
    if (trades.length > 0) tradingDays++;
    trades.forEach(t => {
      totalPnl += t.pnl;
      totalTrades++;
      if (t.pnl >= 0) winTrades++;
    });
  });
  const el = id => document.getElementById(id);
  el("stat-total-pnl").textContent   = fmtPnl(totalPnl);
  el("stat-total-pnl").style.color   = totalPnl >= 0 ? "var(--cal-week-win)" : "var(--cal-week-loss)";
  el("stat-win-rate").textContent     = totalTrades > 0 ? Math.round(winTrades / totalTrades * 100) + "%" : "—";
  el("stat-total-trades").textContent = totalTrades;
  el("stat-avg-pnl").textContent      = tradingDays > 0 ? fmtPnl(totalPnl / tradingDays) : "—";
  el("stat-avg-pnl").style.color      = totalPnl >= 0 ? "var(--cal-week-win)" : "var(--cal-week-loss)";
}

/* ═══════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════ */
(function () {
  const saved = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  document.getElementById("themeCheckbox").checked = saved === "dark";
})();

function toggleTheme(checkbox) {
  const next = checkbox.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}

/* ═══════════════════════════════════════════════
   KEYBOARD: Escape closes day modal
═══════════════════════════════════════════════ */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (!document.getElementById("trade-detail-overlay").classList.contains("open")) {
      closeModal();
    }
  }
});

/* ═══════════════════════════════════════════════
   CSV IMPORT
═══════════════════════════════════════════════ */
let parsedImportRows = [];   // holds validated rows from current upload

function openImport() {
  parsedImportRows = [];
  document.getElementById("import-preview").classList.remove("visible");
  document.getElementById("import-error").classList.remove("visible");
  document.getElementById("import-confirm-btn").disabled = true;
  document.getElementById("drop-file-name").textContent = "No file selected";
  document.getElementById("import-mode-row").style.display = "none";
  document.getElementById("csv-file-input").value = "";
  document.getElementById("import-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeImport() {
  document.getElementById("import-overlay").classList.remove("open");
  document.body.style.overflow = "";
}

function closeImportOnOverlay(e) {
  if (e.target === document.getElementById("import-overlay")) closeImport();
}

/* Drag-and-drop handlers */
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById("drop-zone").classList.add("drag-over");
}
function handleDragLeave() {
  document.getElementById("drop-zone").classList.remove("drag-over");
}
function handleDrop(e) {
  e.preventDefault();
  document.getElementById("drop-zone").classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  document.getElementById("drop-file-name").textContent = file.name;
  const reader = new FileReader();
  reader.onload = ev => parseCSV(ev.target.result);
  reader.readAsText(file);
}

/* ── CSV Parser ── */
function parseCSV(text) {
  const errEl  = document.getElementById("import-error");
  const prevEl = document.getElementById("import-preview");
  errEl.classList.remove("visible");
  prevEl.classList.remove("visible");
  document.getElementById("import-confirm-btn").disabled = true;
  document.getElementById("import-mode-row").style.display = "none";

  // Split lines, skip blanks
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    showImportError("CSV must have a header row and at least one data row.");
    return;
  }

  // Parse header (handle quoted headers too)
  const header = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g,"").replace(/['"]/g,""));

  // Column aliases: canonical name → possible header names
  const ALIASES = {
    date:   ["date", "tradeday", "trade_day", "tradedate", "trade_date", "day"],
    symbol: ["symbol", "contractname", "contract_name", "contract", "ticker", "instrument"],
    side:   ["side", "type", "direction", "tradetype", "trade_type"],
    qty:    ["qty", "size", "quantity", "shares", "contracts", "volume"],
    entry:  ["entry", "entryprice", "entry_price", "entrypx", "open_price", "openprice"],
    exit:   ["exit", "exitprice", "exit_price", "exitpx", "close_price", "closeprice"],
    pnl:    ["pnl", "profit", "pl", "profitloss", "profit_loss", "net_pnl", "netpnl"]
  };

  // Map required fields using aliases
  const REQUIRED = Object.keys(ALIASES);
  const idxMap = {};
  for (const field of REQUIRED) {
    let i = -1;
    for (const alias of ALIASES[field]) {
      i = header.indexOf(alias);
      if (i !== -1) break;
    }
    if (i === -1) {
      showImportError(`Missing required column: "${field}". Header found: ${header.join(", ")}`);
      return;
    }
    idxMap[field] = i;
  }

  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < REQUIRED.length) {
      errors.push(`Row ${i + 1}: not enough columns (got ${cols.length}, need ${REQUIRED.length}).`);
      continue;
    }

    const dateRaw   = cols[idxMap["date"]].trim().replace(/['"]/g,"");
    const symbol    = cols[idxMap["symbol"]].trim().replace(/['"]/g,"").toUpperCase();
    const sideRaw   = cols[idxMap["side"]].trim().replace(/['"]/g,"").toLowerCase();
    const qty       = parseFloat(cols[idxMap["qty"]]);
    const entry     = parseFloat(cols[idxMap["entry"]]);
    const exit      = parseFloat(cols[idxMap["exit"]]);
    const pnl       = parseFloat(cols[idxMap["pnl"]]);

    // Normalize date to YYYY-MM-DD
    function normalizeDate(raw) {
      // Already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      // MM/DD/YYYY or MM/DD/YYYY HH:MM:SS or MM/DD/YYYY HH:MM:SS TZ
      const mdyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (mdyMatch) {
        const mm = mdyMatch[1].padStart(2, "0");
        const dd = mdyMatch[2].padStart(2, "0");
        const yyyy = mdyMatch[3];
        return `${yyyy}-${mm}-${dd}`;
      }
      // DD-MM-YYYY or DD/MM/YYYY (ambiguous, treat as MM/DD if month <= 12)
      const dmyMatch = raw.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
      if (dmyMatch) {
        const mm = dmyMatch[1].padStart(2, "0");
        const dd = dmyMatch[2].padStart(2, "0");
        const yyyy = dmyMatch[3];
        return `${yyyy}-${mm}-${dd}`;
      }
      // Try native Date parse as last resort (strips time/timezone)
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
      return null;
    }

    // Validate date
    const dateNorm = normalizeDate(dateRaw);
    if (!dateNorm) {
      errors.push(`Row ${i + 1}: invalid date "${dateRaw}" — expected YYYY-MM-DD.`);
      continue;
    }
    // Normalize side: accept long/short/buy/sell/bullish/bearish
    const sideNorm = sideRaw === "buy" || sideRaw === "bullish" ? "long"
                   : sideRaw === "sell" || sideRaw === "bearish" ? "short"
                   : sideRaw;
    if (!["long","short"].includes(sideNorm)) {
      errors.push(`Row ${i + 1}: invalid side "${sideRaw}" — expected long/short/buy/sell.`);
      continue;
    }
    if ([qty, entry, exit, pnl].some(isNaN)) {
      errors.push(`Row ${i + 1}: qty, entry, exit, and pnl must all be numbers.`);
      continue;
    }

    rows.push({ date: dateNorm, symbol, side: sideNorm, qty, entry, exit, pnl });
  }

  if (errors.length > 0) {
    showImportError("<strong>Some rows had errors:</strong><br>" + errors.slice(0,5).join("<br>") + (errors.length > 5 ? `<br>…and ${errors.length - 5} more.` : ""));
    if (rows.length === 0) return;
  }

  if (rows.length === 0) {
    showImportError("No valid rows found in the CSV.");
    return;
  }

  parsedImportRows = rows;
  renderImportPreview(rows);
  document.getElementById("import-confirm-btn").disabled = false;
  document.getElementById("import-mode-row").style.display = "flex";
}

function parseCsvLine(line) {
  // Handles quoted fields with commas inside
  const result = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuote = !inQuote; }
    else if (c === "," && !inQuote) { result.push(cur); cur = ""; }
    else { cur += c; }
  }
  result.push(cur);
  return result;
}

function showImportError(msg) {
  const el = document.getElementById("import-error");
  el.innerHTML = msg;
  el.classList.add("visible");
}

function renderImportPreview(rows) {
  const table = document.getElementById("import-preview-table");
  document.getElementById("import-preview-count").textContent = rows.length + " trade" + (rows.length !== 1 ? "s" : "");

  let html = `<thead><tr>
    <th>Date</th><th>Symbol</th><th>Side</th>
    <th>Qty</th><th>Entry</th><th>Exit</th><th>P&amp;L</th>
  </tr></thead><tbody>`;

  const PREVIEW_MAX = 50;
  rows.slice(0, PREVIEW_MAX).forEach(r => {
    const pClass = r.pnl >= 0 ? "pnl-pos" : "pnl-neg";
    const sClass = r.side === "long" ? "side-long" : "side-short";
    html += `<tr>
      <td>${r.date}</td>
      <td><strong>${r.symbol}</strong></td>
      <td><span class="${sClass}">${r.side.toUpperCase()}</span></td>
      <td>${r.qty}</td>
      <td>${fmtPrice(r.entry)}</td>
      <td>${fmtPrice(r.exit)}</td>
      <td class="${pClass}">${fmtPnl(r.pnl)}</td>
    </tr>`;
  });
  if (rows.length > PREVIEW_MAX) {
    html += `<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);font-style:italic;padding:10px;">
      …and ${rows.length - PREVIEW_MAX} more rows not shown in preview
    </td></tr>`;
  }
  html += "</tbody>";
  table.innerHTML = html;
  document.getElementById("import-preview").classList.add("visible");
}

function confirmImport() {
  if (parsedImportRows.length === 0) return;

  const mode = document.querySelector('input[name="import-mode"]:checked').value;
  let stored = mode === "replace" ? {} : getImportedTrades();

  // Group rows by date
  parsedImportRows.forEach(r => {
    if (!stored[r.date]) stored[r.date] = [];
    stored[r.date].push({ symbol: r.symbol, side: r.side, qty: r.qty, entry: r.entry, exit: r.exit, pnl: r.pnl });
  });

  saveImportedTrades(stored);
  mergeTradeData();
  renderCalendar();
  updateDashStats();

  // Success feedback
  const btn = document.getElementById("import-confirm-btn");
  btn.textContent = "✓ Imported!";
  btn.disabled = true;
  setTimeout(() => {
    closeImport();
    btn.textContent = "Import Trades";
  }, 1200);
}

function confirmClearData() {
  if (!confirm("Clear all imported trade data? (Built-in sample trades will remain.)")) return;
  localStorage.removeItem("importedTrades");
  mergeTradeData();
  renderCalendar();
  updateDashStats();
}

/* ═══════════════════════════════════════════════
   TRADE DETAIL — extra metadata (fees, times, image)
   Stored in localStorage as tradeExtras:
   { "YYYY-MM-DD_idx": { fees, entryTime, exitTime, duration, notes, imageData } }
═══════════════════════════════════════════════ */
let tdCurrentKey = null;  // "YYYY-MM-DD_idx"
let tdCurrentDate = null; // "YYYY-MM-DD"

function getTradeExtras() {
  try { return JSON.parse(localStorage.getItem("tradeExtras") || "{}"); } catch { return {}; }
}
function saveTradeExtras(data) {
  localStorage.setItem("tradeExtras", JSON.stringify(data));
}
function getTradeImages() {
  try { return JSON.parse(localStorage.getItem("tradeImages") || "{}"); } catch { return {}; }
}
function saveTradeImages(data) {
  localStorage.setItem("tradeImages", JSON.stringify(data));
}

function openTradeDetail(dateKey, tradeIdx) {
  const trades = tradeData[dateKey] || [];
  const t = trades[tradeIdx];
  if (!t) return;

  tdCurrentKey  = `${dateKey}_${tradeIdx}`;
  tdCurrentDate = dateKey;

  // Format the date nicely
  const d    = new Date(dateKey + "T00:00:00");
  const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  document.getElementById("td-date").textContent = d.toLocaleDateString("en-US", opts);

  // Symbol / side / qty / prices
  document.getElementById("td-symbol").textContent = t.symbol;
  const sideEl = document.getElementById("td-side");
  sideEl.innerHTML = `<span class="${t.side === 'long' ? 'side-long' : 'side-short'}">${t.side.toUpperCase()}</span>`;
  document.getElementById("td-qty").textContent    = t.qty;
  document.getElementById("td-entry").textContent  = fmtPrice(t.entry);
  document.getElementById("td-exit").textContent   = fmtPrice(t.exit);

  // P&L banner
  const banner = document.getElementById("td-pnl-banner");
  banner.className = "td-pnl-banner " + (t.pnl >= 0 ? "win" : "loss");
  const amountEl = document.getElementById("td-pnl-amount");
  amountEl.textContent = fmtPnl(t.pnl);

  // Load saved extras
  const extras = getTradeExtras()[tdCurrentKey] || {};
  document.getElementById("td-entry-time").value = extras.entryTime || "";
  document.getElementById("td-exit-time").value  = extras.exitTime  || "";
  document.getElementById("td-duration").value   = extras.duration  || "";
  document.getElementById("td-fees").value        = extras.fees != null ? extras.fees : "";
  document.getElementById("td-notes").value       = extras.notes    || "";

  // Auto-calculate duration if both times are set and duration not saved
  if (extras.entryTime && extras.exitTime && !extras.duration) {
    const dur = calcDuration(extras.entryTime, extras.exitTime);
    if (dur) document.getElementById("td-duration").value = dur;
  }

  // Auto-calc duration when times change
  document.getElementById("td-entry-time").oninput = autoDuration;
  document.getElementById("td-exit-time").oninput  = autoDuration;

  // Load image
  const images = getTradeImages();
  const imgSrc = images[tdCurrentKey] || "";
  const preview = document.getElementById("td-img-preview");
  const placeholder = document.getElementById("td-img-placeholder");
  const removeBtn = document.getElementById("td-remove-img-btn");
  if (imgSrc) {
    preview.src = imgSrc;
    preview.style.display = "block";
    placeholder.style.display = "none";
    removeBtn.style.display = "flex";
  } else {
    preview.src = "";
    preview.style.display = "none";
    placeholder.style.display = "flex";
    removeBtn.style.display = "none";
  }

  // Show overlay (keep day modal open underneath)
  document.getElementById("trade-detail-overlay").classList.add("open");
}

function closeTradeDetail() {
  document.getElementById("trade-detail-overlay").classList.remove("open");
  tdCurrentKey  = null;
  tdCurrentDate = null;
}

function closeTDOnOverlay(e) {
  if (e.target === document.getElementById("trade-detail-overlay")) closeTradeDetail();
}

function calcDuration(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diffMin = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMin <= 0) return null;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function autoDuration() {
  const entry = document.getElementById("td-entry-time").value;
  const exit  = document.getElementById("td-exit-time").value;
  if (entry && exit) {
    const dur = calcDuration(entry, exit);
    if (dur) document.getElementById("td-duration").value = dur;
  }
}

function saveTradeDetail() {
  if (!tdCurrentKey) return;
  const extras = getTradeExtras();
  extras[tdCurrentKey] = {
    entryTime: document.getElementById("td-entry-time").value,
    exitTime:  document.getElementById("td-exit-time").value,
    duration:  document.getElementById("td-duration").value.trim(),
    fees:      parseFloat(document.getElementById("td-fees").value) || 0,
    notes:     document.getElementById("td-notes").value.trim(),
  };
  saveTradeExtras(extras);

  const btn = document.querySelector(".detail-save-btn");
  btn.textContent = "✓ Saved!";
  setTimeout(() => { btn.textContent = "💾 Save Changes"; }, 1500);
}

/* ── Image upload for trade detail ── */
function tdDragOver(e) {
  e.preventDefault();
  document.getElementById("td-img-zone").classList.add("drag-over");
}
function tdDragLeave() {
  document.getElementById("td-img-zone").classList.remove("drag-over");
}
function tdDrop(e) {
  e.preventDefault();
  document.getElementById("td-img-zone").classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) tdLoadImage(file);
}
function tdFileSelect(e) {
  const file = e.target.files[0];
  if (file) tdLoadImage(file);
  e.target.value = ""; // reset so same file can be re-selected
}
function tdLoadImage(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    const src = ev.target.result;
    // Save to localStorage
    const images = getTradeImages();
    images[tdCurrentKey] = src;
    saveTradeImages(images);
    // Show preview
    const preview = document.getElementById("td-img-preview");
    preview.src = src;
    preview.style.display = "block";
    document.getElementById("td-img-placeholder").style.display = "none";
    document.getElementById("td-remove-img-btn").style.display = "flex";
  };
  reader.readAsDataURL(file);
}
function removeTdImage() {
  if (!tdCurrentKey) return;
  const images = getTradeImages();
  delete images[tdCurrentKey];
  saveTradeImages(images);
  const preview = document.getElementById("td-img-preview");
  preview.src = "";
  preview.style.display = "none";
  document.getElementById("td-img-placeholder").style.display = "flex";
  document.getElementById("td-remove-img-btn").style.display = "none";
}

/* Escape also closes trade detail */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (document.getElementById("trade-detail-overlay").classList.contains("open")) {
      closeTradeDetail();
    }
  }
});

/* ── Init ── */
mergeTradeData();   // overlay any previously-imported data
renderCalendar();
updateDashStats();
