---
name: Gold luxury theme
description: CSS variable values and design decisions for the ARB_SCAN gold + black luxury theme
---

## CSS Variables (index.css)

- `--primary`: `43 74% 52%` — gold
- `--background`: `0 0% 4%` — near-black
- `--card`: `0 0% 7%`
- `--border`: `43 20% 16%`
- `--muted-foreground`: `45 15% 55%`
- `--foreground`: `45 30% 94%` — warm white
- `--ring`: `43 74% 52%` — gold focus ring

## Fonts
- Sans: Inter (300/400/500/600/700) + Playfair Display (600/700) imported
- Mono: Space Mono

## Special effects
- Gold scrollbar (`hsl(43 74% 42%)` on hover)
- `aside::before` — 1px gold gradient shimmer across top of sidebar
- `.text-primary` — subtle gold text-shadow glow

## Why
User requested "luxury business gold + white design". Dark near-black background creates depth; gold primary builds premium feel without being garish.
