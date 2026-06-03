---
name: JARVIS bilingual (he/en) assistant
description: How the JARVIS assistant supports a Hebrew/English toggle without stale-closure or RTL bugs
---

# JARVIS bilingual support

The JARVIS chat assistant supports a per-user language toggle (Hebrew default / English "Iron Man butler" persona). Choice persists in localStorage (`jarvis-lang`).

## Stale-closure mitigation
`lang` is mirrored into a `langRef`. Anything that runs outside React render — `send`, `speak` (TTS), and `startListening` (SpeechRecognition `rec.lang`) — must read `langRef.current`, not the `lang` state captured in their closure, or the first call after a toggle uses the old language.

**Why:** these callbacks are memoized / fired from event handlers and async voice APIs, so the captured `lang` goes stale the moment the user toggles.

## Per-message direction (RTL)
Each `Msg` carries its own `lang` field set at creation time. Render `dir` from `m.lang ?? lang`, NOT from the global `lang`.

**Why:** binding `dir` to global `lang` flips the text direction of *previously sent* messages when the user toggles language mid-conversation — a visible correctness bug. Store the language with the message.

**How to apply:** set `lang` on every Msg you push (initial greeting, user echo, JARVIS reply, tip-open, toggle confirmation).

## English persona
English uses a slow, low-pitch synthetic voice (rate ~0.92, pitch ~0.7) and prefers a British male voice (daniel/arthur/oliver/george/uk-english-male → en-gb → first en). Hebrew uses a he voice at neutral rate/pitch. Responses in English adopt a formal "sir" butler tone.

## Intentionally English in both modes
Universal trading tokens (LONG/SHORT, BUY YES/NO) and the small Chart/News action-chip labels stay English even in Hebrew mode — consistent with the project's English-UI directive.
