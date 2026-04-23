# RTK Dashboard — Design Spec
*2026-04-23 | CTO agent | ITSAAA-3*

## Overview

A web app that visualises token usage and cost savings produced by RTK (Rust Token Killer). The dashboard shells out to `rtk gain --all --format json` via a Node/Express server and renders the results as interactive charts and KPI cards.

## Architecture

```
Browser (React SPA)
       │ HTTP (fetch /api/*)
Express server (Node, port 3001)
       │ child_process.exec
rtk gain --all --format json
```

**Development:** Vite dev server (port 5173) proxies `/api/*` to Express on 3001.
**Production:** `npm run build` → Vite emits `dist/`; Express serves `dist/` as static files on port 3001.

Single package, single repo — no monorepo needed for this tool.

## Data Source

`rtk gain --all --format json` returns:

```json
{
  "summary": { total_commands, total_input, total_output, total_saved, avg_savings_pct, total_time_ms, avg_time_ms },
  "daily":   [{ date, commands, input_tokens, output_tokens, saved_tokens, savings_pct, total_time_ms, avg_time_ms }],
  "weekly":  [{ week_start, week_end, ... }],
  "monthly": [{ month, ... }]
}
```

One API endpoint: `GET /api/stats` — runs `rtk gain --all --format json` and returns the parsed JSON. Auto-refreshes in the UI every 30 s.

## Cost Estimation

RTK reports token counts. Cost is estimated client-side using Claude pricing (configurable):

- Input: $3.00 / 1M tokens (Sonnet default)
- Output: $15.00 / 1M tokens (Sonnet default)

`savedCost = (saved_tokens / 1_000_000) * input_price` (conservative: treats all saved as input tokens).

## UI Sections

### 1. KPI Cards (top row)
- Total tokens saved (human-friendly: K / M)
- Estimated cost saved ($)
- Total commands run
- Average savings %
- Today's savings (latest daily entry)

### 2. Daily Savings Chart
Area chart — x: date, y: saved_tokens. Tooltip shows savings_pct. Color: purple gradient.

### 3. Daily Input vs Output
Stacked bar chart — input_tokens (blue) vs output_tokens (green) per day.

### 4. Weekly Breakdown Table
Simple table: week, commands, saved, savings %.

### 5. Monthly Summary
Single-row table for the current month.

## Styling

Dark theme (`#0f0f14` bg, `#1a1a2e` cards, purple accent `#8b5cf6`). Monospace font for numbers. Recharts for all charts.

## Tech Stack

| Layer       | Choice                   |
|-------------|--------------------------|
| Frontend    | React 18 + TypeScript    |
| Bundler     | Vite 5                   |
| Charts      | Recharts 2               |
| Styling     | Tailwind CSS v3          |
| Backend     | Express 4 + TypeScript   |
| Runtime     | Node 20+, tsx            |

## File Layout

```
/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── server.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── types.ts
    ├── hooks/
    │   └── useStats.ts
    └── components/
        ├── StatCard.tsx
        ├── DailyAreaChart.tsx
        ├── DailyStackedBar.tsx
        ├── WeeklyTable.tsx
        └── MonthlyTable.tsx
```

## Security

- Server only runs a fixed, hardcoded command (`rtk gain --all --format json`) — no user input reaches the shell.
- CORS restricted to localhost in dev; disabled in prod (same-origin).

## Non-Goals

- User auth (local dev tool, no auth needed)
- Multi-user / multi-machine data
- Historical persistence (RTK's own DB is the source of truth)
- Project-scoped filtering (future enhancement)
