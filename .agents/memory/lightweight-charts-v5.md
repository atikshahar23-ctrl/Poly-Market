---
name: lightweight-charts v5 quirks
description: v5 API change + the "Object is disposed" ResizeObserver crash and how it's handled
---

# v5 API

Use `chart.addSeries(CandlestickSeries, opts)` / `chart.addSeries(AreaSeries, opts)` —
the old `addCandlestickSeries()` / `addAreaSeries()` helpers were removed in v5. Use
`ColorType.Solid` for solid backgrounds. Klines come from `data-api.binance.vision`
(non-geo-blocked).

# "Object is disposed" crash (runtime-error overlay)

**Symptom:** an uncaught `Error: Object is disposed` with a stack through
`DevicePixelContentBoxBinding.get` (the `canvasElement` getter) → `resizeCanvasElement`
→ `TimeAxisWidget._internal_setSizes`. Surfaces as a Replit runtime-error overlay the
user perceives as a crash. Fires on chart unmount/remount (tab switch, symbol change,
navigation), and also during HMR.

**Root cause (verified in the bundled lib):** the throw fires from inside a
`window.requestAnimationFrame` DRAW callback, NOT from the ResizeObserver callback. The
chart schedules its draw/layout via `this._private__drawRafId = window.requestAnimationFrame(...)`;
when `chart.remove()` nulls `_canvasElement` after a draw frame is already queued, the
queued rAF runs, hits the `canvasElement` getter, and throws. Because it's a separate
async callback, a try/catch around your own code (or around the ResizeObserver callback)
can NOT catch it.

**What does NOT work:**
- A window `error` / `unhandledrejection` listener with `preventDefault()` /
  `stopImmediatePropagation()` — Replit's own error instrumentation registers its
  capture-phase handler BEFORE app code runs, so it has already reported the error.
- Wrapping only `ResizeObserver` — the throw is in the rAF draw callback, not the
  observer callback.

**Fix that works (in `main.tsx`, before rendering):** wrap the global
`window.requestAnimationFrame` so every scheduled callback runs in a try/catch that
swallows ONLY errors whose message includes "Object is disposed" (rethrow everything
else). This stops the throw at its true async source, so no error event ever fires.
`window.requestAnimationFrame` is resolved at call time by the lib, so patching it in the
`main.tsx` body (before charts are created in effects) is early enough. Also wrap
`ResizeObserver` the same way (defense for the size-observer path) and keep the
per-component `disposed` flag guard. The native rAF is `.bind(window)`-ed and the
patched fn must return the id so callers that `cancelAnimationFrame` still work.

**Why:** the benign disposal throw is unavoidable from app code (it's library-internal,
fired async); catching it at the rAF source is the only place app code can intercept it
before the browser/Replit report it. The narrow "Object is disposed" message match keeps
all other real errors propagating normally.
