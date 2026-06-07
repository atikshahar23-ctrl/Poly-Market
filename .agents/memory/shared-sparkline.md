---
name: Shared Sparkline gradient id
description: Why the reusable Sparkline must derive its SVG gradient id from useId()
---

The `Sparkline` component (exported from `artifacts/crypto-arb/src/components/trade-analytics.tsx`) renders a `<linearGradient>` for its area fill, colored green/red by the last point's sign.

**Rule:** the gradient `id` MUST come from React `useId()`, never a hardcoded string.

**Why:** SVG `<defs>` ids are document-global. When several Sparklines render on one page (the Analytics & Insights desk renders one per asset class and per bot), a hardcoded id like `eqfill` makes every instance reference the *first* definition, so all sparklines inherit the first one's color regardless of their own gain/loss.

**How to apply:** when reusing or copying the Sparkline (or any SVG with `<defs>`/url(#id) refs) into a list/grid, give each instance a unique id via `useId()`. The component already accepts an optional `className` (default `"w-full h-24"`) so callers can size it (e.g. `h-8` in the insights cards).
