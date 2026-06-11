# KuarkCoin Signal Dashboard

KuarkCoin is an English-first stock and ETF signal dashboard for monitoring TradingView alerts, storing normalized signal data in Supabase, and surfacing recent BUY/SELL opportunities in a Next.js application.

The dashboard is designed around a curated U.S. market universe, webhook-based signal ingestion, and clean English labels so the product can be used as a stock/ETF watch dashboard without depending on localized finance terminology.

## Project Overview

- **Purpose:** collect, store, and display actionable stock and ETF signals.
- **Primary language:** English-first UI copy, metadata, and signal descriptions.
- **Signal source:** TradingView alerts sent through a webhook.
- **Storage:** Supabase `signals` table.
- **Deployment target:** Vercel with server-side API routes.
- **Main webhook endpoint:** `/api/signals`.

## Tracked Symbols

Tracked symbols are maintained in:

```text
data/tracked-symbols.ts
```

The tracked universe contains **100 symbols total**:

- **75 stocks**
- **25 ETFs**

The symbol module should provide helpers for dashboard and webhook normalization, including behavior such as:

- normalizing incoming symbols to a consistent uppercase format;
- handling TradingView exchange-prefixed symbols such as `NASDAQ:AAPL`;
- matching normalized tickers against the tracked stock and ETF universe;
- returning symbol metadata such as `name`, `type`, `category`, and `exchange` when available;
- preserving unknown symbols while marking them as untracked metadata.

Normalization should make webhook payloads resilient to common input differences, including whitespace, mixed case, and optional exchange prefixes.

## TradingView Webhook Setup

Configure TradingView alerts to send webhook messages to:

```text
POST /api/signals
```

Requirements:

- **Endpoint:** `/api/signals`
- **Method:** `POST`
- **Authentication:** include the required `secret` field in the JSON body.
- **Accepted `signal` values:** `BUY`, `SELL`

The `secret` value must match the `SCAN_SECRET` environment variable configured in Vercel.

### Example Webhook JSON Payload

```json
{
  "secret": "your-secret",
  "symbol": "NASDAQ:AAPL",
  "signal": "BUY",
  "price": "195.25",
  "score": "82",
  "rvol": "1.8",
  "timeframe": "1h",
  "reasons": "Breakout with relative volume",
  "source": "TradingView",
  "t": 1718000000
}
```

Notes:

- `symbol` may include a TradingView exchange prefix.
- `signal` is case-normalized and must resolve to `BUY` or `SELL`.
- `price`, `score`, and `rvol` may be sent as strings and converted before storage.
- `t` may be provided as a TradingView timestamp.

## Vercel Environment Variables

Set the following environment variables in Vercel:

| Variable | Purpose |
| --- | --- |
| `SCAN_SECRET` | Shared secret required by `/api/signals` webhook requests. |
| `SUPABASE_URL` | Supabase project URL used by the server-side client. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key used by protected server routes. |

## Supabase `signals` Table

The `signals` table stores normalized webhook events and dashboard metadata.

Expected columns:

| Column | Description |
| --- | --- |
| `id` | Unique signal row identifier. |
| `symbol` | Incoming or normalized ticker symbol. |
| `name` | Human-readable stock or ETF name when known. |
| `signal` | Signal direction, either `BUY` or `SELL`. |
| `price` | Signal price. |
| `score` | Optional signal score. |
| `reasons` | Human-readable explanation for the signal. |
| `rvol` | Relative volume value when provided. |
| `timeframe` | Alert timeframe, such as `1h` or `1d`. |
| `type` | Asset type, such as `stock`, `etf`, or `unknown`. |
| `category` | Category or sector/group label. |
| `exchange` | Exchange name or normalized exchange label. |
| `source` | Signal source, such as `TradingView`. |
| `created_at` | Timestamp for when the signal was created or received. |

## Untracked Symbol Behavior

Webhook payloads for symbols that are not present in `data/tracked-symbols.ts` should still be stored so that incoming alerts are not lost.

Untracked symbols are stored with the following metadata:

```json
{
  "type": "unknown",
  "category": "Untracked",
  "exchange": "Unknown"
}
```

This allows the dashboard to display the alert while clearly separating it from the curated 100-symbol universe.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables locally and in Vercel.

3. Run the development server:

```bash
npm run dev
```

4. Open the local dashboard:

```text
http://localhost:3000
```
