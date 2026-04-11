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

/* ═══════════════════════════════════════════════
   ACCOUNT MANAGEMENT
═══════════════════════════════════════════════ */
const ACCOUNT_COLORS = [
  '#4f46e5','#0891b2','#059669','#d97706',
  '#dc2626','#7c3aed','#db2777','#0284c7',
  '#65a30d','#9333ea'
];

function getAllAccounts() {
  const accounts = new Set();
  const imported = getImportedTrades();
  Object.values(imported).forEach(trades =>
    trades.forEach(t => accounts.add(t.account || "Default")));
  Object.values(sampleTradeData).forEach(trades =>
    trades.forEach(t => accounts.add(t.account || "Default")));
  if (accounts.size === 0) accounts.add("Default");
  return accounts;
}

function getAccountColor(accountName, allAccountsSorted) {
  const idx = (allAccountsSorted || [...getAllAccounts()].sort()).indexOf(accountName);
  return ACCOUNT_COLORS[Math.max(idx, 0) % ACCOUNT_COLORS.length];
}

// null = all accounts; Set = specific subset
function getActiveAccounts() {
  try {
    const raw = localStorage.getItem("activeAccounts");
    if (raw === null) return null;
    return new Set(JSON.parse(raw));
  } catch { return null; }
}

function setActiveAccounts(v) {
  if (v === null) localStorage.removeItem("activeAccounts");
  else localStorage.setItem("activeAccounts", JSON.stringify([...v]));
}

function getFilteredTrades(dateKey) {
  const trades = tradeData[dateKey] || [];
  const activeSet = getActiveAccounts();
  if (activeSet === null) return trades;
  return trades.filter(t => activeSet.has(t.account || "Default"));
}

/* ── Account Dropdown ── */
let acctDropdownOpen = false;

function toggleAccountDropdown() {
  acctDropdownOpen = !acctDropdownOpen;
  const dd = document.getElementById("acct-dropdown");
  const btn = document.getElementById("acct-filter-btn");
  if (acctDropdownOpen) {
    renderAccountDropdown();
    dd.classList.add("open");
    btn.classList.add("active");
  } else {
    dd.classList.remove("open");
    btn.classList.remove("active");
  }
}

function renderAccountDropdown() {
  const container = document.getElementById("acct-dropdown-list");
  if (!container) return;
  const allAccountsSorted = [...getAllAccounts()].sort();
  const activeSet = getActiveAccounts();
  const allActive = activeSet === null;

  let html = `<div class="acct-dd-header">
    <span>Filter by Account</span>
    <button class="acct-dd-all-btn" onclick="selectAllAccounts(${allActive})">${allActive ? "Deselect All" : "Select All"}</button>
  </div>`;

  if (allAccountsSorted.length === 0 ||
      (allAccountsSorted.length === 1 && allAccountsSorted[0] === "Default")) {
    html += `<div class="acct-dd-empty">Import trades to see accounts here.</div>`;
  } else {
    allAccountsSorted.forEach(acct => {
      const isActive = allActive || activeSet.has(acct);
      const color = getAccountColor(acct, allAccountsSorted);
      const escaped = acct.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      html += `<label class="acct-dd-item">
        <input type="checkbox" ${isActive ? "checked" : ""} onchange="toggleAccount('${escaped}', this.checked)">
        <span class="acct-dot" style="background:${color}"></span>
        <span class="acct-dd-name">${acct}</span>
      </label>`;
    });
  }

  container.innerHTML = html;
}

function toggleAccount(accountName, checked) {
  const allAccounts = getAllAccounts();
  let activeSet = getActiveAccounts();
  if (activeSet === null) activeSet = new Set([...allAccounts]);
  if (checked) activeSet.add(accountName);
  else activeSet.delete(accountName);
  // Revert to null if everything is selected
  if ([...allAccounts].every(a => activeSet.has(a))) setActiveAccounts(null);
  else setActiveAccounts(activeSet);
  renderAccountDropdown();
  updateAcctFilterBtn();
  renderCalendar();
  updateDashStats();
}

function selectAllAccounts(currentlyAll) {
  setActiveAccounts(currentlyAll ? new Set() : null);
  renderAccountDropdown();
  updateAcctFilterBtn();
  renderCalendar();
  updateDashStats();
}

function updateAcctFilterBtn() {
  const label  = document.getElementById("acct-filter-label");
  const badge  = document.getElementById("acct-filter-badge");
  const chevron = document.getElementById("acct-filter-chevron");
  if (!label) return;
  const allAccounts = getAllAccounts();
  const activeSet   = getActiveAccounts();
  if (activeSet === null) {
    label.textContent = "All Accounts";
    badge.style.display = "none";
  } else if (activeSet.size === 0) {
    label.textContent = "No Accounts";
    badge.style.display = "none";
  } else if (activeSet.size === 1) {
    label.textContent = [...activeSet][0];
    badge.style.display = "none";
  } else {
    label.textContent = `${activeSet.size} of ${allAccounts.size} Accounts`;
    badge.textContent = activeSet.size;
    badge.style.display = "inline-flex";
  }
}

function mergeTradeData() {
  // Reset to sample, then overlay imported trades
  Object.keys(tradeData).forEach(k => { if (!sampleTradeData[k]) delete tradeData[k]; });
  Object.assign(tradeData, JSON.parse(JSON.stringify(sampleTradeData)));
  const imported = getImportedTrades();
  Object.entries(imported).forEach(([date, trades]) => {
    if (!tradeData[date]) tradeData[date] = [];
    // Tag each trade with its index in the importedTrades array so we can delete it later
    const tagged = trades.map((t, i) => ({ ...t, _importedIdx: i }));
    tradeData[date] = tradeData[date].concat(tagged);
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
      const filteredTrades = cell.outside ? [] : getFilteredTrades(dateKey);
      const pnl = filteredTrades.length > 0
        ? filteredTrades.reduce((s, t) => s + t.pnl, 0)
        : null;

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
        const cnt = filteredTrades.length;
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
        totalTrades += filteredTrades.length;

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
  // Build display list: filter by active accounts, keep original indices for detail nav
  const allTrades = tradeData[dateKey] || [];
  const activeSet = getActiveAccounts();
  const displayTrades = activeSet === null
    ? allTrades.map((t, i) => ({ t, origIdx: i }))
    : allTrades.map((t, i) => ({ t, origIdx: i }))
               .filter(({ t }) => activeSet.has(t.account || "Default"));
  const pnl   = displayTrades.reduce((s, { t }) => s + t.pnl, 0);
  const notes = getNotes();

  // Determine if we should show the Account column
  const allAccountsSorted = [...getAllAccounts()].sort();
  const showAcctCol = allAccountsSorted.length > 1 ||
    (allAccountsSorted.length === 1 && allAccountsSorted[0] !== "Default");

  // Date title
  const d = new Date(dateKey + "T00:00:00");
  const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  document.getElementById("modal-date-title").textContent =
    d.toLocaleDateString("en-US", opts);
  document.getElementById("modal-date-sub").textContent =
    displayTrades.length + " trade" + (displayTrades.length !== 1 ? "s" : "") + " shown";

  // Banner
  const banner = document.getElementById("modal-pnl-banner");
  banner.className = "modal-pnl-banner " + (pnl >= 0 ? "win" : "loss");
  document.getElementById("modal-pnl-value").textContent =
    displayTrades.length ? fmtPnl(pnl) : "—";
  document.getElementById("modal-trade-count").textContent = displayTrades.length;

  // Trade table
  const body = document.getElementById("modal-trade-body");
  const colCount = (showAcctCol ? 7 : 6) + 1; // +1 for delete col
  let html = `<table class="trade-table">
    <thead>
      <tr>
        <th>Symbol</th>
        <th>Side</th>
        <th>Qty</th>
        <th>Entry</th>
        <th>Exit</th>
        <th>P&amp;L</th>
        ${showAcctCol ? "<th>Account</th>" : ""}
        <th></th>
      </tr>
    </thead>
    <tbody>`;
  displayTrades.forEach(({ t, origIdx }) => {
    const pnlClass  = t.pnl >= 0 ? "pnl-pos" : "pnl-neg";
    const sideClass = t.side === "long" ? "side-long" : "side-short";
    const acctName  = t.account || "Default";
    const acctColor = getAccountColor(acctName, allAccountsSorted);
    const canDelete = t._importedIdx !== undefined;
    const menuId = `trade-menu-${origIdx}`;
    const menuCell = `<td class="trade-menu-cell" onclick="event.stopPropagation()">
        <button class="trade-kebab-btn" onclick="toggleTradeMenu('${menuId}', event)" title="Options">&#8942;</button>
        <div class="trade-menu-dropdown" id="${menuId}">
          ${canDelete
            ? `<button class="trade-menu-item delete" onclick="deleteTrade('${dateKey}', ${t._importedIdx})">
                <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
                Delete Trade
              </button>`
            : `<span class="trade-menu-item disabled">Cannot delete built-in trade</span>`
          }
        </div>
      </td>`;
    html += `<tr class="clickable-row" onclick="openTradeDetail('${dateKey}', ${origIdx})" title="View trade detail">
      <td><strong>${t.symbol}</strong></td>
      <td><span class="${sideClass}">${t.side.toUpperCase()}</span></td>
      <td>${t.qty}</td>
      <td>${fmtPrice(t.entry)}</td>
      <td>${fmtPrice(t.exit)}</td>
      <td class="${pnlClass}">${fmtPnl(t.pnl)}</td>
      ${showAcctCol ? `<td><span class="acct-dot-sm" style="background:${acctColor}"></span>${acctName}</td>` : ""}
      ${menuCell}
    </tr>`;
  });
  if (displayTrades.length === 0) {
    html += `<tr><td colspan="${colCount}" style="text-align:center;padding:20px;color:var(--text-secondary);">No trades for selected accounts on this day.</td></tr>`;
  }
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

/* ── Trade row kebab menu ── */
let _openTradeMenu = null; // track open menu id

function toggleTradeMenu(menuId, e) {
  e.stopPropagation();
  const menu = document.getElementById(menuId);
  if (!menu) return;
  // Close any other open menu first
  if (_openTradeMenu && _openTradeMenu !== menuId) {
    const prev = document.getElementById(_openTradeMenu);
    if (prev) prev.classList.remove("open");
  }
  const isOpen = menu.classList.toggle("open");
  _openTradeMenu = isOpen ? menuId : null;
}

// Close menus when clicking elsewhere in the modal
document.addEventListener("click", () => {
  if (_openTradeMenu) {
    const m = document.getElementById(_openTradeMenu);
    if (m) m.classList.remove("open");
    _openTradeMenu = null;
  }
});

function deleteTrade(dateKey, importedIdx) {
  // Close the open menu
  if (_openTradeMenu) {
    const m = document.getElementById(_openTradeMenu);
    if (m) m.classList.remove("open");
    _openTradeMenu = null;
  }

  const stored = getImportedTrades();
  if (!stored[dateKey]) return;
  stored[dateKey].splice(importedIdx, 1);
  if (stored[dateKey].length === 0) delete stored[dateKey];
  saveImportedTrades(stored);
  mergeTradeData();
  renderCalendar();
  updateDashStats();
  updateAcctFilterBtn();

  // Re-open the modal to reflect the deletion (or close if no trades left)
  if (tradeData[dateKey] && tradeData[dateKey].length > 0) {
    openModal(dateKey);
  } else {
    closeModal();
  }
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
    const page = item.dataset.page;

    // "Calendar" navigates to Dashboard and scrolls to the calendar section
    if (page === "calendar") {
      document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
      document.getElementById("page-dashboard").classList.add("active");
      setTimeout(() => {
        const cal = document.getElementById("cal-section");
        if (cal) cal.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return;
    }

    document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("active"));
    item.classList.add("active");
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
  const acctInput = document.getElementById("import-account-name");
  if (acctInput) acctInput.value = "";
  // Reset duplicate badge
  const badge = document.getElementById("import-dup-badge");
  if (badge) badge.style.display = "none";
  const toggle = document.getElementById("import-dup-toggle");
  if (toggle) toggle.style.display = "none";
  const dupSkip = document.querySelector('input[name="dup-mode"][value="skip"]');
  if (dupSkip) dupSkip.checked = true;
  // Populate account datalist + chips from existing accounts
  populateImportAccountSuggestions();
  document.getElementById("import-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function populateImportAccountSuggestions() {
  const allAccounts = [...getAllAccounts()].sort();
  // Datalist for autocomplete
  const dl = document.getElementById("account-suggestions");
  if (dl) {
    dl.innerHTML = allAccounts
      .filter(a => a !== "Default")
      .map(a => `<option value="${a.replace(/"/g,'&quot;')}">`)
      .join("");
  }
  // Quick-pick chips (existing accounts only, excluding Default)
  const chips = document.getElementById("import-account-chips");
  if (!chips) return;
  const named = allAccounts.filter(a => a !== "Default");
  if (named.length === 0) { chips.innerHTML = ""; return; }
  chips.innerHTML = named.map(a => {
    const escaped = a.replace(/'/g, "\\'");
    return `<button type="button" class="acct-chip" onclick="selectImportAccount('${escaped}')">${a}</button>`;
  }).join("");
}

function selectImportAccount(name) {
  const input = document.getElementById("import-account-name");
  if (!input) return;
  input.value = name;
  // Highlight the active chip
  document.querySelectorAll(".acct-chip").forEach(c => {
    c.classList.toggle("active", c.textContent === name);
  });
  refreshImportPreview();
}

function clearAccountInput() {
  const input = document.getElementById("import-account-name");
  if (input) { input.value = ""; refreshImportPreview(); }
  document.querySelectorAll(".acct-chip").forEach(c => c.classList.remove("active"));
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
  // Optional columns
  const OPTIONAL_ALIASES = {
    account: ["account", "accountname", "account_name", "broker", "firm", "portfolio"]
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
  // Map optional columns
  const optIdxMap = {};
  for (const [field, aliases] of Object.entries(OPTIONAL_ALIASES)) {
    for (const alias of aliases) {
      const i = header.indexOf(alias);
      if (i !== -1) { optIdxMap[field] = i; break; }
    }
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
    const accountCSV = optIdxMap["account"] !== undefined
      ? (cols[optIdxMap["account"]] || "").trim().replace(/['"]/g,"")
      : "";

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

    rows.push({ date: dateNorm, symbol, side: sideNorm, qty, entry, exit, pnl, accountCSV });
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

function refreshImportPreview() {
  // Sync chip highlight with typed account name
  const val = (document.getElementById("import-account-name") || {}).value || "";
  document.querySelectorAll(".acct-chip").forEach(c => {
    c.classList.toggle("active", c.textContent === val);
  });
  if (parsedImportRows.length > 0) renderImportPreview(parsedImportRows);
}

/* ── Duplicate detection ──
   A trade is a duplicate if, for the same date + account, an already-stored
   trade matches on symbol, side, entry, exit, AND pnl (qty can vary by broker).
*/
function tradeKey(t) {
  return [t.symbol, t.side, t.entry, t.exit, t.pnl].join("|");
}

function buildExistingKeySet(mode) {
  // In "replace" mode there are no existing trades to clash with
  if (mode === "replace") return {};
  const stored = getImportedTrades();
  // {  "YYYY-MM-DD|account" : Set<key> }
  const map = {};
  Object.entries(stored).forEach(([date, trades]) => {
    trades.forEach(t => {
      const acct = t.account || "Default";
      const mk = `${date}|${acct}`;
      if (!map[mk]) map[mk] = new Set();
      map[mk].add(tradeKey(t));
    });
  });
  return map;
}

function renderImportPreview(rows) {
  const table = document.getElementById("import-preview-table");
  const fallbackAcct = (document.getElementById("import-account-name") || {}).value.trim() || "";

  // Determine current merge mode (default to "merge" if mode row hidden)
  const modeEl = document.querySelector('input[name="import-mode"]:checked');
  const mode = modeEl ? modeEl.value : "merge";
  const dupModeEl = document.querySelector('input[name="dup-mode"]:checked');
  const dupMode = dupModeEl ? dupModeEl.value : "skip";

  const existingKeys = buildExistingKeySet(mode);

  // Tag each row as duplicate or not
  let dupCount = 0;
  const tagged = rows.map(r => {
    const acct = r.accountCSV || fallbackAcct || "Default";
    const mk = `${r.date}|${acct}`;
    const isDup = !!(existingKeys[mk] && existingKeys[mk].has(tradeKey(r)));
    if (isDup) dupCount++;
    return { ...r, _isDup: isDup, _acct: acct };
  });

  // Update preview count
  const newCount = dupMode === "skip" ? rows.length - dupCount : rows.length;
  document.getElementById("import-preview-count").textContent =
    newCount + " trade" + (newCount !== 1 ? "s" : "");

  // Show/hide duplicate badge and toggle
  const badge = document.getElementById("import-dup-badge");
  const toggle = document.getElementById("import-dup-toggle");
  if (dupCount > 0) {
    badge.textContent = `${dupCount} duplicate${dupCount !== 1 ? "s" : ""}`;
    badge.style.display = "inline-flex";
    if (toggle) toggle.style.display = "flex";
  } else {
    badge.style.display = "none";
    if (toggle) toggle.style.display = "none";
  }

  // Update confirm button text
  const btn = document.getElementById("import-confirm-btn");
  if (btn && !btn.disabled) {
    if (dupCount > 0 && dupMode === "skip") {
      btn.textContent = `Import ${newCount} Trade${newCount !== 1 ? "s" : ""} (${dupCount} skipped)`;
    } else if (dupCount > 0 && dupMode === "allow") {
      btn.textContent = `Import ${rows.length} Trade${rows.length !== 1 ? "s" : ""} (incl. duplicates)`;
    } else {
      btn.textContent = "Import Trades";
    }
  }

  let html = `<thead><tr>
    <th></th>
    <th>Date</th><th>Symbol</th><th>Side</th>
    <th>Qty</th><th>Entry</th><th>Exit</th><th>P&amp;L</th><th>Account</th>
  </tr></thead><tbody>`;

  const PREVIEW_MAX = 50;
  tagged.slice(0, PREVIEW_MAX).forEach(r => {
    const pClass = r.pnl >= 0 ? "pnl-pos" : "pnl-neg";
    const sClass = r.side === "long" ? "side-long" : "side-short";
    const rowClass = r._isDup ? (dupMode === "skip" ? " import-row-skip" : " import-row-dup") : "";
    const statusCell = r._isDup
      ? (dupMode === "skip"
          ? `<td class="import-status-cell skip" title="Will be skipped">⊘</td>`
          : `<td class="import-status-cell dup" title="Duplicate — will be imported anyway">⚠</td>`)
      : `<td class="import-status-cell ok" title="New trade">✓</td>`;
    html += `<tr class="${rowClass}">
      ${statusCell}
      <td>${r.date}</td>
      <td><strong>${r.symbol}</strong></td>
      <td><span class="${sClass}">${r.side.toUpperCase()}</span></td>
      <td>${r.qty}</td>
      <td>${fmtPrice(r.entry)}</td>
      <td>${fmtPrice(r.exit)}</td>
      <td class="${pClass}">${fmtPnl(r.pnl)}</td>
      <td style="font-size:.78rem;color:var(--text-secondary);">${r._acct}</td>
    </tr>`;
  });
  if (rows.length > PREVIEW_MAX) {
    html += `<tr><td colspan="9" style="text-align:center;color:var(--text-secondary);font-style:italic;padding:10px;">
      …and ${rows.length - PREVIEW_MAX} more rows not shown in preview
    </td></tr>`;
  }
  html += "</tbody>";
  table.innerHTML = html;
  document.getElementById("import-preview").classList.add("visible");
}

function confirmImport() {
  if (parsedImportRows.length === 0) return;

  const fallbackAccount = (document.getElementById("import-account-name") || {}).value.trim() || "";
  // Warn if no account name and no account column in CSV
  const anyHasAccountCol = parsedImportRows.some(r => r.accountCSV && r.accountCSV.length > 0);
  if (!fallbackAccount && !anyHasAccountCol) {
    const proceed = confirm(
      "No account name specified.\n\nAll imported trades will be tagged as \"Default\".\n\nContinue anyway?"
    );
    if (!proceed) return;
  }

  const mode = document.querySelector('input[name="import-mode"]:checked').value;
  const dupModeEl = document.querySelector('input[name="dup-mode"]:checked');
  const dupMode = dupModeEl ? dupModeEl.value : "skip";
  let stored = mode === "replace" ? {} : getImportedTrades();

  // Build existing key set for duplicate detection
  const existingKeys = buildExistingKeySet(mode);
  let imported = 0, skipped = 0;

  // Group rows by date, skipping duplicates if mode is "skip"
  parsedImportRows.forEach(r => {
    const account = r.accountCSV || fallbackAccount || "Default";
    const mk = `${r.date}|${account}`;
    const isDup = !!(existingKeys[mk] && existingKeys[mk].has(tradeKey(r)));
    if (isDup && dupMode === "skip") { skipped++; return; }
    if (!stored[r.date]) stored[r.date] = [];
    stored[r.date].push({ symbol: r.symbol, side: r.side, qty: r.qty, entry: r.entry, exit: r.exit, pnl: r.pnl, account });
    imported++;
  });

  saveImportedTrades(stored);
  mergeTradeData();
  renderCalendar();
  updateDashStats();
  updateAcctFilterBtn();

  // Success feedback
  const btn = document.getElementById("import-confirm-btn");
  btn.textContent = skipped > 0
    ? `✓ Imported ${imported} (${skipped} skipped)`
    : `✓ Imported ${imported}!`;
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

/* ═══════════════════════════════════════════════
   TRADING STRATEGIES
   Stored in localStorage as a JSON array of strings.
═══════════════════════════════════════════════ */
const DEFAULT_STRATEGIES = [
  "Breakout", "Pullback", "Trend Follow", "Reversal",
  "VWAP", "Scalp", "News Play", "Gap & Go"
];

function getStrategies() {
  try {
    const raw = localStorage.getItem("tradingStrategies");
    return raw ? JSON.parse(raw) : [...DEFAULT_STRATEGIES];
  } catch { return [...DEFAULT_STRATEGIES]; }
}

function saveStrategies(arr) {
  localStorage.setItem("tradingStrategies", JSON.stringify(arr));
}

function populateStrategyDropdown(selectedValue) {
  const sel = document.getElementById("td-strategy");
  if (!sel) return;
  const strategies = getStrategies();
  // Rebuild options
  sel.innerHTML = `<option value="">— Select strategy —</option>`;
  strategies.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    if (s === selectedValue) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.insertAdjacentHTML("beforeend", `<option value="__new__">+ Add new strategy…</option>`);
}

function handleStrategyChange(sel) {
  if (sel.value !== "__new__") return;
  const name = prompt("Enter new strategy name:");
  if (!name || !name.trim()) { sel.value = ""; return; }
  const trimmed = name.trim();
  const strategies = getStrategies();
  if (!strategies.includes(trimmed)) {
    strategies.push(trimmed);
    saveStrategies(strategies);
  }
  populateStrategyDropdown(trimmed);
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
  populateStrategyDropdown(extras.strategy || "");
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
    strategy:  document.getElementById("td-strategy")?.value || "",
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

/* Close account dropdown when clicking outside */
document.addEventListener("click", e => {
  if (acctDropdownOpen && !e.target.closest("#acct-filter-wrap")) {
    acctDropdownOpen = false;
    const dd  = document.getElementById("acct-dropdown");
    const btn = document.getElementById("acct-filter-btn");
    if (dd)  dd.classList.remove("open");
    if (btn) btn.classList.remove("active");
  }
});

/* ── Init ── */
mergeTradeData();   // overlay any previously-imported data
renderCalendar();
updateDashStats();
updateAcctFilterBtn();

/* ═══════════════════════════════════════════════
   ANALYTICS PAGE INIT (populate on tab switch)
═══════════════════════════════════════════════ */
document.querySelectorAll(".sidebar-item[data-page='analytics']").forEach(item => {
  item.addEventListener("click", () => {
    populateMCAccountFilter();
    renderWFBenchmarks();
  });
});

/* ═══════════════════════════════════════════════
   MONTE CARLO SIMULATION
   Randomly reshuffles the trade P&L sequence N times
   to model the range of possible outcomes.
═══════════════════════════════════════════════ */
function populateMCAccountFilter() {
  const sel = document.getElementById("mc-account");
  if (!sel) return;
  const accounts = [...getAllAccounts()].sort();
  sel.innerHTML = `<option value="">All Accounts</option>`;
  accounts.filter(a => a !== "Default").forEach(a => {
    const opt = document.createElement("option");
    opt.value = a; opt.textContent = a;
    sel.appendChild(opt);
  });
}

function runMonteCarloSim() {
  const startBal  = parseFloat(document.getElementById("mc-balance").value) || 100000;
  const numSims   = Math.min(parseInt(document.getElementById("mc-sims").value) || 1000, 10000);
  const acctFilter = document.getElementById("mc-account").value;

  // Collect P&Ls from all trades (filtered by account if selected)
  const pnls = [];
  Object.values(tradeData).forEach(trades =>
    trades.forEach(t => {
      if (!acctFilter || (t.account || "Default") === acctFilter) pnls.push(t.pnl);
    })
  );

  if (pnls.length < 10) {
    alert("Need at least 10 trades to run a simulation. Import some trades first.");
    return;
  }

  // Run simulations
  const results = [];
  for (let i = 0; i < numSims; i++) {
    // Fisher-Yates shuffle
    const seq = [...pnls];
    for (let j = seq.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [seq[j], seq[k]] = [seq[k], seq[j]];
    }
    let bal = startBal, peak = startBal, maxDD = 0;
    for (const p of seq) {
      bal += p;
      if (bal > peak) peak = bal;
      const dd = peak > 0 ? (peak - bal) / peak : 0;
      if (dd > maxDD) maxDD = dd;
    }
    results.push({ finalBal: bal, maxDD, profit: bal > startBal });
  }

  // Sort by final balance for percentile reads
  results.sort((a, b) => a.finalBal - b.finalBal);
  const p  = pct => results[Math.max(0, Math.floor(numSims * pct))].finalBal;
  const p5  = p(0.05), p50 = p(0.50), p95 = p(0.95);
  const probProfit = results.filter(r => r.profit).length / numSims * 100;

  const maxDDs = results.map(r => r.maxDD).sort((a, b) => a - b);
  const dd = pct => maxDDs[Math.max(0, Math.floor(numSims * pct))] * 100;

  // Populate stat cards
  const el = id => document.getElementById(id);
  el("mc-prob-profit").textContent = probProfit.toFixed(1) + "%";
  el("mc-p5").textContent  = fmtPnl(p5  - startBal);
  el("mc-p50").textContent = fmtPnl(p50 - startBal);
  el("mc-p95").textContent = fmtPnl(p95 - startBal);
  el("mc-dd5").textContent  = dd(0.05).toFixed(1) + "%";
  el("mc-dd50").textContent = dd(0.50).toFixed(1) + "%";
  el("mc-dd95").textContent = dd(0.95).toFixed(1) + "%";
  el("mc-trades").textContent = pnls.length;

  el("mc-results").style.display = "block";

  // Draw histogram
  requestAnimationFrame(() => drawMCHistogram(results.map(r => r.finalBal), startBal));
}

function drawMCHistogram(finalBals, startBal) {
  const canvas = document.getElementById("mc-chart");
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth || 700;
  const H = 220;
  canvas.style.width  = W + "px";
  canvas.style.height = H + "px";
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const min = Math.min(...finalBals);
  const max = Math.max(...finalBals);
  const BINS = 60;
  const binW = (max - min) / BINS || 1;
  const counts = new Array(BINS).fill(0);
  finalBals.forEach(v => {
    const b = Math.min(Math.floor((v - min) / binW), BINS - 1);
    counts[b]++;
  });
  const maxCount = Math.max(...counts);
  const PAD = { t: 10, b: 28, l: 4, r: 4 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const barW   = chartW / BINS;

  ctx.clearRect(0, 0, W, H);

  counts.forEach((count, i) => {
    const x  = PAD.l + i * barW;
    const bh = (count / maxCount) * chartH;
    const binMid = min + (i + 0.5) * binW;
    ctx.fillStyle = binMid >= startBal
      ? "rgba(5,150,105,.75)"
      : "rgba(220,38,38,.75)";
    ctx.fillRect(x, PAD.t + chartH - bh, barW - 1, bh);
  });

  // Break-even line
  const baseX = PAD.l + ((startBal - min) / (max - min)) * chartW;
  ctx.save();
  ctx.strokeStyle = "rgba(99,102,241,.9)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(baseX, PAD.t);
  ctx.lineTo(baseX, PAD.t + chartH);
  ctx.stroke();
  ctx.restore();

  // X-axis labels
  ctx.fillStyle = "var(--text-secondary, #6b7280)";
  ctx.font = `11px system-ui`;
  ctx.textAlign = "left";
  ctx.fillText("$" + (min / 1000).toFixed(0) + "k", PAD.l + 2, H - 6);
  ctx.textAlign = "right";
  ctx.fillText("$" + (max / 1000).toFixed(0) + "k", W - PAD.r - 2, H - 6);
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(99,102,241,.9)";
  ctx.fillText("Break Even", Math.max(50, Math.min(baseX, W - 55)), H - 6);
}

/* ── Monte Carlo image upload ── */
function mcDragOver(e) {
  e.preventDefault();
  document.getElementById("mc-drop-zone").classList.add("drag-over");
}
function mcDragLeave() {
  document.getElementById("mc-drop-zone").classList.remove("drag-over");
}
function mcDrop(e) {
  e.preventDefault();
  mcDragLeave();
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) loadMCImage(file);
}
function mcImageSelect(e) {
  const file = e.target.files[0];
  if (file) loadMCImage(file);
}
function loadMCImage(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    const img = document.getElementById("mc-img-preview");
    img.src = ev.target.result;
    img.style.display = "block";
    document.getElementById("mc-drop-zone").style.display = "none";
    document.getElementById("mc-remove-img-btn").style.display = "inline-flex";
    document.getElementById("mc-drop-label").textContent = file.name;
    // Persist in localStorage
    localStorage.setItem("mcImage", ev.target.result);
  };
  reader.readAsDataURL(file);
}
function removeMCImage() {
  document.getElementById("mc-img-preview").src = "";
  document.getElementById("mc-img-preview").style.display = "none";
  document.getElementById("mc-drop-zone").style.display = "block";
  document.getElementById("mc-remove-img-btn").style.display = "none";
  document.getElementById("mc-drop-label").textContent = "Click or drag an image to attach a simulation chart";
  document.getElementById("mc-img-input").value = "";
  localStorage.removeItem("mcImage");
}
// Restore saved MC image on load
(function restoreMCImage() {
  const saved = localStorage.getItem("mcImage");
  if (!saved) return;
  const img = document.getElementById("mc-img-preview");
  if (!img) return;
  img.src = saved;
  img.style.display = "block";
  const dz = document.getElementById("mc-drop-zone");
  if (dz) dz.style.display = "none";
  const rb = document.getElementById("mc-remove-img-btn");
  if (rb) rb.style.display = "inline-flex";
})();

/* ═══════════════════════════════════════════════
   WALK-FORWARD TRACKING
   Compares user-entered backtest benchmarks against
   live stats auto-calculated from tagged trades.
═══════════════════════════════════════════════ */
function getWFBenchmarks() {
  try { return JSON.parse(localStorage.getItem("wfBenchmarks") || "{}"); } catch { return {}; }
}
function saveWFBenchmarks(data) {
  localStorage.setItem("wfBenchmarks", JSON.stringify(data));
}

function getLiveStrategyStats(strategyName) {
  const extras = getTradeExtras();
  const pnls = [];
  Object.entries(tradeData).forEach(([date, trades]) => {
    trades.forEach((t, idx) => {
      const extra = extras[`${date}_${idx}`];
      if (extra && extra.strategy === strategyName) pnls.push(t.pnl);
    });
  });
  if (pnls.length === 0) return null;
  const wins   = pnls.filter(p => p > 0);
  const losses = pnls.filter(p => p < 0);
  const gw = wins.reduce((s, v) => s + v, 0);
  const gl = Math.abs(losses.reduce((s, v) => s + v, 0));
  return {
    total:        pnls.length,
    winRate:      (wins.length / pnls.length) * 100,
    avgWin:       wins.length   ? gw / wins.length   : 0,
    avgLoss:      losses.length ? gl / losses.length : 0,
    profitFactor: gl > 0 ? gw / gl : gw > 0 ? 999 : 0,
  };
}

function renderWFBenchmarks() {
  const container = document.getElementById("wf-benchmarks");
  if (!container) return;
  const benchmarks = getWFBenchmarks();
  const keys = Object.keys(benchmarks);
  if (keys.length === 0) {
    container.innerHTML = `<p class="wf-empty">No benchmarks added yet. Click <strong>+ Add Strategy Benchmark</strong> to get started.</p>`;
    return;
  }
  container.innerHTML = keys.map(s => renderWFCard(s, benchmarks[s], getLiveStrategyStats(s))).join("");
}

function renderWFCard(strategy, bt, live) {
  function deltaCell(liveVal, btVal, higherBetter) {
    if (live === null) return `<span class="wf-na">—</span>`;
    const diff = liveVal - btVal;
    const pct  = btVal !== 0 ? (diff / Math.abs(btVal)) * 100 : 0;
    const good = higherBetter ? diff >= 0 : diff <= 0;
    const cls  = Math.abs(pct) < 5 ? "wf-neutral" : good ? "wf-good" : "wf-bad";
    const sign = diff >= 0 ? "+" : "";
    return `<span class="${cls}">${sign}${diff.toFixed(1)} <small>(${sign}${pct.toFixed(0)}%)</small></span>`;
  }

  const liveTrades = live ? live.total : 0;
  const esc = strategy.replace(/'/g, "\\'");
  const lowSample = liveTrades > 0 && liveTrades < 30;

  return `
  <div class="wf-card">
    <div class="wf-card-header">
      <span class="wf-strategy-name">${strategy}</span>
      <div class="wf-card-actions">
        <span class="wf-live-badge ${liveTrades === 0 ? 'no-data' : ''}">${liveTrades === 0 ? 'No live data' : liveTrades + ' live trade' + (liveTrades !== 1 ? 's' : '')}</span>
        <button class="wf-delete-btn" onclick="deleteWFBenchmark('${esc}')" title="Remove">✕</button>
      </div>
    </div>
    ${lowSample ? `<p class="wf-warning">⚠ Small sample (${liveTrades} trade${liveTrades !== 1 ? 's' : ''}) — ${liveTrades < 10 ? 'add 10+ trades' : '30+ recommended'} for reliable comparison.</p>` : ""}
    <div class="wf-table-wrap">
      <table class="wf-table">
        <thead><tr><th>Metric</th><th>Backtest</th><th>Live</th><th>Delta</th></tr></thead>
        <tbody>
          <tr>
            <td>Win Rate</td>
            <td>${bt.winRate}%</td>
            <td>${live ? live.winRate.toFixed(1) + "%" : "—"}</td>
            <td>${deltaCell(live?.winRate, bt.winRate, true)}</td>
          </tr>
          <tr>
            <td>Avg Win</td>
            <td>$${parseFloat(bt.avgWin).toFixed(0)}</td>
            <td>${live ? "$" + live.avgWin.toFixed(0) : "—"}</td>
            <td>${deltaCell(live?.avgWin, bt.avgWin, true)}</td>
          </tr>
          <tr>
            <td>Avg Loss</td>
            <td>$${parseFloat(bt.avgLoss).toFixed(0)}</td>
            <td>${live ? "$" + live.avgLoss.toFixed(0) : "—"}</td>
            <td>${deltaCell(live?.avgLoss, bt.avgLoss, false)}</td>
          </tr>
          <tr>
            <td>Profit Factor</td>
            <td>${parseFloat(bt.profitFactor).toFixed(2)}</td>
            <td>${live ? live.profitFactor.toFixed(2) : "—"}</td>
            <td>${deltaCell(live?.profitFactor, bt.profitFactor, true)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    ${bt.sampleSize ? `<p class="wf-bt-note">Backtest sample: ${bt.sampleSize} trades</p>` : ""}
  </div>`;
}

function openAddBenchmark() {
  const sel = document.getElementById("wf-strategy-select");
  const strategies = getStrategies();
  sel.innerHTML = `<option value="">— Select strategy —</option>`;
  strategies.forEach(s => {
    const o = document.createElement("option");
    o.value = s; o.textContent = s;
    sel.appendChild(o);
  });
  document.getElementById("wf-add-modal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeAddBenchmark() {
  document.getElementById("wf-add-modal").classList.remove("open");
  document.body.style.overflow = "";
  document.getElementById("wf-add-form").reset();
}

function closeAddBenchmarkOnOverlay(e) {
  if (e.target === document.getElementById("wf-add-modal")) closeAddBenchmark();
}

function saveWFBenchmark() {
  const strategy = document.getElementById("wf-strategy-select").value;
  if (!strategy) { alert("Please select a strategy."); return; }
  const winRate      = parseFloat(document.getElementById("wf-bt-winrate").value);
  const avgWin       = parseFloat(document.getElementById("wf-bt-avgwin").value);
  const avgLoss      = parseFloat(document.getElementById("wf-bt-avgloss").value);
  const profitFactor = parseFloat(document.getElementById("wf-bt-pf").value);
  const sampleSize   = parseInt(document.getElementById("wf-bt-sample").value) || 0;
  if ([winRate, avgWin, avgLoss, profitFactor].some(isNaN)) {
    alert("Please fill in all required fields."); return;
  }
  const benchmarks = getWFBenchmarks();
  benchmarks[strategy] = { winRate, avgWin, avgLoss, profitFactor, sampleSize };
  saveWFBenchmarks(benchmarks);
  closeAddBenchmark();
  renderWFBenchmarks();
}

function deleteWFBenchmark(strategy) {
  const benchmarks = getWFBenchmarks();
  delete benchmarks[strategy];
  saveWFBenchmarks(benchmarks);
  renderWFBenchmarks();
}
