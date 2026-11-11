# Catgirl Companion Upgrade Implementation Plan

> **For agentic workers:** Execute inline, using superpowers:executing-plans. The user explicitly chose direct implementation with details delegated.

**Goal:** Add cat-themed dialogue, playful interactions, and a usable six-module settings panel to the existing official-quota widget.

**Architecture:** Preserve the current desktop collector, CSP-safe DOM builder, image, quota bubble and click/drag behavior. Add a bundled companion module for settings and interactions, backed by a separately testable local state model. Reuse existing functional settings controls rather than introducing a second configuration system.

**Tech Stack:** JavaScript, esbuild, existing linkedom and Node test runner; no new runtime dependency or remote service.

**Spec:** User request in this chat and their approval: recommended lightweight pet interactions plus practical companionship, implementation details delegated.

## Global Constraints

- Official five-hour/weekly quota stays independent of all companion state; 30-second polling and 90-second stale cutoff remain.
- Single click opens quota; clicking an open character only bounces; quota bubble click advances to a quote then closes.
- Keep original redistributed artwork and existing saved scale/position/audio preferences.
- Local pet state has no hunger decay, paid currency or effect on real quota.
- All user-written dialogue renders as literal text, never HTML.
- Settings expose only working controls; obsolete quota presets and request calibration are hidden.

## Review Focus

- Old stored default dialogue must receive the new built-ins while preserving custom lines.
- Timer deadlines must survive reload, pause, and delayed/background ticks without duplicate completion counting.
- Imported settings must be bounded and must not accept credentials, remote endpoints or prototype keys.
- Panel/toolbars must remain reachable at screen edges and in small windows, including keyboard access and reduced motion.
- Rapid quote/close/quota transitions must not let delayed text replace a newer bubble.

## Deliverables

- Dialogue: at least 24 original short lines, including the requested nicknames; meme, sweet and work groups, custom text, no immediate repeats.
- Interactions: pet, feed, a 10-second clickable moving cat toy, nap/wake; local affection and action counts, bounded cooldowns and particle effects.
- Tools: persistent focus/break timer, pause/resume/reset, explicit start, no automatic background notification permission.
- UI: interaction, dialogue, appearance, sound, official quota status, tools; theme, opacity, movement lock, custom local artwork, preferences import/export.

### Task 1: State and dialogue

- [x] Add failing tests in `tests/companion.test.cjs`: migration, literal text, repeat avoidance, cooldowns, bounded stats, timer reload/pause/completion, safe preferences import.
- [x] Implement `src/companion-model.cjs`: `normalizePreferences`, `quotePool`, `pickQuote`, `normalizeState`, `interact`, `startTimer`, `pauseTimer`, `resumeTimer`, `tickTimer`, `importPreferences`, `exportPreferences`.
- [x] Run `node --test tests/companion.test.cjs` and verify all pass.

### Task 2: Interactive panel and integration

- [x] Add failing integration tests for six panels, actions, literal custom dialogue, quota independence, keyboard close, and persisted timer state.
- [x] Implement `src/companion.mjs` and `src/companion.css`; expose `mount(options)` with callbacks for saving config, showing text/quota, sound, and position reset.
- [x] Bundle companion alongside the existing DOM builder in `scripts/build.cjs`; connect it in `src/widget.js` without altering the collector.
- [x] Run the complete test suite and release audit.

### Task 3: Runtime and release preparation

- [x] Inspect real browser render at ordinary and small viewport sizes; exercise interaction, themes, play, timer and custom lines; capture screenshots. Remaining runtime boundaries are listed in `docs/VERIFICATION.md`.
- [x] Review the change independently and fix material findings with regression tests.
- [x] Update README, changelog and verification notes; build release ZIP.
- [x] Back up and update the already installed renderer only if the installed desktop hook matches; verify in Gemini after normal restart/reload. Report any runtime boundary that cannot be verified.
- [x] Keep changes local unless publishing is explicitly requested for this upgrade.

## Execution record

- Model tests failed before the model existed, then passed 7/7.
- Mounted UI test failed for absent modules, then passed after integration.
- Reminder gating, cross-entry duplicate dialogue, storage-full fallback and repeated reminder label each received a reproducing RED check and a passing fix.
- Final suite: 10 Node tests and both mount/integration scripts passed; release audit and whitespace checks passed.
- A separate reviewer found no critical issues. Both concrete findings (sound gating and repeat avoidance) were resolved. No review finding is deferred.
- The installed renderer matches the built renderer by SHA-256; the prior renderer backup remains available. Official quota collection was left unchanged.
