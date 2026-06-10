---
name: EN-mode i18n conversion
description: How crypto-arb routes Hebrew UI through t(key,lang); pitfalls when adding/auditing keys.
---

# crypto-arb EN-mode i18n

UI strings render via `t(key, lang)` from `@/lib/i18n`; `lang` comes from `useLanguage()`. `t()` has **no interpolation** — do `t(key,lang).replace("{x}", String(v))`. Keys live in `lib/i18n-extra/<file>.ts` split by prefix: `hist.`→history.ts, `trade.`→trades.ts, `mkt.`→markets.ts, `misc.`→misc.ts, `bots.`→bots.ts, `adv.`→advisor.ts. Base dict in `i18n.ts`.

**Why audits are mandatory:** `t()` returns the *key string itself* when a key is missing — so a missing key is **runtime-silent and typecheck-clean**. Never trust typecheck alone for i18n completeness. Run a Python audit: collect defined keys (`"x":{he:` across i18n.ts + i18n-extra/*) vs literal `t("...")` refs; report refs not defined. Dynamic refs like `` t(`mkt.sd.cat.${k}`) `` and `t(MAP[k], lang)` are invisible to the audit — verify those key families exist by hand.

**HE byte-identity:** non-React label sources (`lib/market-calendar.ts`, `lib/ta.ts`, `lib/insights.ts`, `lib/news-calendar-bot.ts`) take an optional `lang: Lang = "he"` param; HE path must return the exact original strings. `getMonthNames("he")`/`getWeekdayShort("he")` just return the old `HEB_MONTH_NAMES`/`HEB_WEEKDAY_SHORT` constants, so HE is unchanged.

**Gotchas:**
- Module-level Hebrew label maps (e.g. stock-desk `CATEGORY_LABEL_HE`, market-clock `KIND_LABEL`) can't see `lang`. Convert to key-suffix maps (`{TECH:"tech",...}`) + render-time `t()`, preserving any `?? raw` fallback (a missing-key `t()` won't fall back, so gate it).
- Some Hebrew is intentionally **not** translated: `source:` attribution fields (often dead/legacy alongside i18n-key maps, e.g. bots `NEW_BOT_META.hint`), bilingual `he?/lang===` ternaries, regex intent-matching (jarvis), decorative glyph pools (dashboard matrix rain), and the language-toggle label showing the target language in its own script (`title="עברית"`).
- Subagents must NOT edit i18n-extra (merge conflicts); they write proposed defs to `/tmp/keys/*.txt` and the main agent merges (dedupe, insert before final `};`).
