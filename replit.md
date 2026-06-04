# ARB_SCAN — Bitcoin Sentiment & Arbitrage Scanner

A real-time dashboard that cross-references Binance BTC futures data with Polymarket prediction markets to surface crowd sentiment gaps and arbitrage signals.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

Hebrew-language paper-trading simulator (educational only — no real money, no win-rate/return promises):
- Market Scanner dashboard (Binance futures × Polymarket crowd sentiment), scalp/momentum signals, stocks, smart-money headlines.
- Simulator with multi-wallet portfolios and equity curve.
- Bot Command Center (`/bots`): 7 paper-trading bots (incl. Dip Buyer, Breakout Hunter, Blue-Chip DCA) with a master arm/disarm and an adaptive manager that nudges each bot's selectivity from its own rolling win-rate.
- Research Desk (`/research`): free symbol/company lookup (stocks + crypto) with live prices and keyless external research links (TradingView, Yahoo, StockAnalysis, Google News, SEC, CoinGecko).
- Jarvis assistant: free rule-based brain (NO paid AI), bilingual he/en, silent on open.

## Constraints

- EVERYTHING must stay 100% free — no paid AI integrations. Jarvis is rule-based only.
- Paper/demo trading only; never promise win-rates, returns, or give financial advice.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
