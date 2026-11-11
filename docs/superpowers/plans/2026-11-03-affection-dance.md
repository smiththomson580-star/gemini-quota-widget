# Affection dance implementation plan

> **For agentic workers:** use superpowers:executing-plans for inline implementation and one fresh final review.

**Goal:** At 100 affection, show a short gentle-catgirl dance, then reset affection to 80 so the reward can be earned again; simplify the companion toolbar and settings.

**Architecture:** Keep a persisted, tokenized reward transition in the companion model. A separate renderer owns the temporary sprite stage and bounded animation lifecycle; ordinary artwork and official quota collection remain independent. Bundle the user-reference-derived transparent eight-pose atlas into the existing single script.

**Tech stack:** Existing vanilla JS/CSS, esbuild, Node tests and linkedom. No new runtime dependencies.

**Spec:** User request in this chat: supplied gentle-catgirl image; affection 100 triggers dance, completion returns to 80, reaching 100 retriggers; improve toolbar/settings without clutter. The video could not be watched because browser approval service failed; implement original cat-paw sway, side step, hop and heart poses and disclose that boundary.

## Global constraints

- Preserve authentic official 5-hour/weekly quota and unknown/stale behavior.
- Preserve configured local artwork and all existing settings/state.
- Dance lasts 12 seconds; reduced-motion celebration lasts 2.2 seconds without moving sprites.
- Skip/Escape or disabling an active reward completes that reward at 80; image failure leaves affection at 100 and offers retry through the setting.
- Reloaded active reward settles at its saved deadline; no duplicate reward or reset from a stale callback.
- The user already authorized direct implementation with details chosen by the assistant.

## Review focus

- Existing saves at 100, disable/re-enable, and repeat cycles: only eligible enabled visible sessions trigger.
- Reload, competing windows and delayed timers: token ownership and one completion.
- Image decode failure and custom artwork: no invisible reward or lost preference.
- Reduced motion, tiny windows, keyboard and theme contrast: accessible controls and clamped stage.
- Existing companion actions/timers and quota: preserve independent state and source accuracy.

### Task 1: Persistent reward model

Files: `src/dance-model.cjs`, `src/companion-model.cjs`, `tests/dance.test.cjs`.

- [x] Write failing tests for eligibility, token guards, 100 → running → 80 → 100 repeat, reload expiry, invalid state, interaction lock and timer preservation.
- [x] Run `node --test tests/dance.test.cjs` and observe failure.
- [x] Implement `normalizeReward(raw, now)`, `beginDance(state, token, now, durationMs)`, `finishDance(state, token)`, `settleDance(state, now)`; preserve reward fields through companion normalization.
- [x] Run the dance and companion tests with verification evidence.

### Task 2: Dance renderer and streamlined controls

Files: `src/dance.mjs`, `src/companion.mjs`, `src/companion.css`, `src/widget.js`, `scripts/build.cjs`, `assets/gentle-dance.webp`, `tests/dance-ui.cjs`.

- [x] Write renderer tests for triggering from accepted feed at 95, one active stage, completion/skip at 80, repeat, preferences, image error, reload, custom artwork restoration and quota independence; observe failure.
- [x] Render eight poses in a small transparent stage near the cat; preload image, gate ownership with Web Locks where available, clamp stage on resize, provide skip and settings/keyboard access.
- [x] Add one reward toggle/status to interaction settings, a coherent SVG icon set, compact four-action dock with a timer badge only while active, calmer cards/tabs and accessible labels.
- [x] Run full suite and visually check light/dark, reward and compact window.

### Task 3: Release and local installation

Files: version metadata, README/CHANGELOG and artwork provenance docs, build audit allowlist.

- [x] Document exact behavior and original-animation boundary; update 0.4.0 metadata and artwork prompt provenance.
- [x] Run `npm.cmd test`, `npm.cmd run audit:release`, `npm.cmd run release:zip`; inspect archive for expected assets and absence of runtime/private data.
- [x] Request one independent whole-change review and fix significant findings with regressions.
- [x] Back up installed renderer, install this reviewed build and have the user reopen Gemini after saving the draft. Verify source hash and fresh native loaded/image/menu status.
- [ ] Native visual interaction check: blocked by repeated automatic UI approval service timeouts/capacity failures, including after the user restored the window. Original pose dance and complete reward cycle were visually checked in the CSP-enabled local browser preview; native GUI acceptance is not claimed.
- [ ] Local Git commit: automatic permission review timed out on the original attempt and the one permitted retry; neither command executed. Source edits remain intact in the working tree and release ZIP. No remote push was attempted.

## Verification results

23 Node checks and four complete-renderer scenario groups passed. Review fixes reproduced before implementation: observer expiry overwriting a new timer (RED → GREEN), and reloaded reward disable via either setting (RED → GREEN). A separate startup overlay regression was also reproduced and fixed (RED → GREEN). No remaining review findings or deferred minors. Lossless conversion checks found zero alpha and visible-RGB differences; invisible RGB under alpha zero is normalized by the encoder.
