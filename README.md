# Trading Journal Dashboard

A lightweight, browser-based trading journal built with vanilla HTML, CSS, and JavaScript — no frameworks, no server required. Open `index.html` in any modern browser and start tracking your trades.

## Features

- **Trading Calendar** — Monthly calendar view showing daily P&L, color-coded green for winning days and red for losing days, with weekly totals in a side column.
- **Dashboard** — At-a-glance stat cards showing Total P&L, Win Rate, Total Trades, and Average P&L per trading day.
- **CSV Import** — Drag-and-drop or file-browse CSV import with flexible column name aliases, date format normalization, and a live preview before confirming.
- **Day Detail Modal** — Click any trading day on the calendar to see a full trade breakdown table with P&L per trade.
- **Trade Detail Panel** — Drill into individual trades to log entry/exit times, trade duration, fees/commissions, notes, and attach a chart screenshot.
- **Day Notes** — Free-text reflection notes per trading day, saved locally in the browser.
- **Dark / Light Theme** — Toggle between themes; preference is persisted across sessions.
- **Fully Offline** — All data is stored in `localStorage`. No account, no backend, no internet connection required.

## Getting Started

1. Clone or download this repository.
2. Open `index.html` in your browser.
3. Import your trades via **Import CSV** (nav bar or sidebar).

## CSV Format

The importer accepts a header row with the following columns (order is flexible, common aliases are supported):

| Column | Aliases |
|--------|---------|
| `date` | `tradeday`, `trade_date` |
| `symbol` | `contractname`, `contract`, `ticker` |
| `side` | `type`, `direction` — accepts `long`, `short`, `buy`, `sell` |
| `qty` | `size`, `quantity`, `contracts` |
| `entry` | `entryprice`, `entry_price` |
| `exit` | `exitprice`, `exit_price` |
| `pnl` | `profit`, `pl`, `profit_loss` |

**Example row:**
```
2026-04-01, AAPL, long, 100, 182.40, 185.20, 280.00
```

Supported date formats: `YYYY-MM-DD`, `MM/DD/YYYY`, `MM/DD/YYYY HH:MM:SS ±TZ`.

## Project Structure

```
├── index.html    # HTML structure and layout
├── styles.css    # All styling and theme variables
├── scripts.js    # Application logic (calendar, modals, CSV import, localStorage)
├── LICENSE
└── README.md
```

## Data Storage

All data is stored in the browser's `localStorage`:

| Key | Contents |
|-----|----------|
| `importedTrades` | Trades imported via CSV |
| `tradeNotes` | Per-day reflection notes |
| `tradeExtras` | Per-trade metadata (times, fees, notes) |
| `tradeImages` | Per-trade chart screenshots (base64) |
| `theme` | UI theme preference (`light` / `dark`) |

To clear imported trades, use **Clear Imports** in the sidebar.

## License

MIT — see [LICENSE](LICENSE) for details.
