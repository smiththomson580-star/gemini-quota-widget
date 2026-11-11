# Subtle touch reactions and clearer artwork

The user asked for continued improvements, specifically rapid-click hissing and a clearer mascot, without UI clutter. They previously delegated implementation details; this iteration keeps that approach.

## Design

- Keep the existing six modules and toolbar. Add no permanent button, score, badge or panel.
- Five completed character taps in two seconds trigger one short hiss: a small shake, temporary anger mark, a short cat-themed line, and a quiet synthesized breath sound. Eight-second cooldown; no affection penalty and no quota effect.
- An accepted pet/feed action calms the character. Tapping a sleeping cat wakes it with a brief stretch while retaining normal quota access.
- Dragging, cancelled gestures, right-click and the long press that opens settings break the tap sequence and never count as taps.
- Respect existing interaction, sound and reduced-motion settings. Keep ordinary character/quota/bubble behavior intact.
- Original sprite is 360 square. Preserve it; use a separate transparent, AI-assisted 1254-square restoration as the default, with lossless WebP packaging. It is an interpretation of the original, not a recovered master file. Do not overwrite users' custom artwork.

## Implementation and checks

- [x] Add failing model tests for tap window/cooldown, reset and calming.
- [x] Implement a small ephemeral touch model in `src/touch-reactions.cjs`.
- [x] Add failing real mounted-DOM gesture tests for hiss, drag/cancel/long-press exclusions, disabled interactions, sound gating, calming, wake-up and unchanged official metrics.
- [x] Integrate callbacks into existing pointer handling; add only temporary CSS states and short synthesized sound.
- [x] Package the high-resolution image without changing decoded alpha; validate the built default uses the new sprite.
- [x] Run full tests and release audit; inspect ordinary/rapid interaction and the real loaded image in a browser and installed Gemini. Source dimensions, device-pixel ratio and display size were read; changing Windows DPI was not attempted.
- [x] Back up the installed renderer and update it; record the verified scope. No remote publishing is requested.

## Execution results

Model, gesture and default-artwork checks failed against the previous implementation and passed after integration. The independent reviewer identified a keyboard quota regression, now covered by a passing regression check. Current automated results: 15 Node tests and three mounted scripts pass. Real browser and native Gemini hissing were observed. The HD source loads at 1254 square and its lossless packaged alpha matches the generated PNG. Native Google chat availability is limited by a region-unavailable page, recorded in `docs/VERIFICATION.md`.
