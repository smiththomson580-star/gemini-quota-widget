# Changelog

## 0.5.0 — 2026-11-04

- Show cooldown seconds on the quick interaction buttons and in settings.
- Follow the character while dragging and place the quick dock above or below the widget when neither side fits.
- Apply the configured low-quota threshold and distinguish expired official samples from samples still awaiting sync. Display exact official percentages and keep the bubble in place while its contents are unchanged.

## 0.4.1 — 2026-11-03

- Add a stage-anchored speech bubble announcing “柔情猫娘来啦！” with every transformation, including the reduced-motion celebration. Reserve viewport space above the character and respect light/dark/peach themes.
- Hide the greeting when the user explicitly opens quota; show it again on the next earned dance. The stage lifecycle removes it on completion, skip or failure.

## 0.4.0 — 2026-11-03

- Add the full-affection Gentle Dance reward: eight transparent poses over twelve seconds, then affection returns from 100 to 80. Earning 100 again starts another reward.
- Persist a bounded reward token and deadline, guard stale completion callbacks, and coordinate visible renderers with Web Locks when available. A reloaded interrupted reward settles at its saved deadline.
- Add a single reward preference, a temporary stage with quota/settings access and a skip control. Escape closes settings first, then can end the dance. Skipping or disabling an active reward also settles at 80; image failure preserves full affection and offers a retry.
- Respect system/app reduced motion with a short static heart-pose celebration. Preserve custom everyday artwork, independent timers and authoritative official quota behavior.
- Replace the vertical emoji toolbar with four consistent line-icon controls; show the timer entry only while a timer exists. Refine settings tabs, affection card, action cards, switches, themes and small-window scrolling.
- Bundle the user-reference-derived lossless transparent dance atlas. This is an original pose animation, not a copy of the linked video or its music.
- Add reward-model and complete-renderer regression scenarios for repeat cycles, deadline recovery, stale callbacks, preferences, decode errors, keyboard, background gating and custom artwork preservation.

## 0.3.0 — 2026-11-03

- Add a hidden rapid-tap reaction: five completed character taps in two seconds trigger a brief hiss, small shake and temporary anger mark, with an eight-second cooldown and no affection or quota penalty.
- Accepted pet/feed actions calm the character; a gentle tap wakes a napping character with a short stretch and opens quota.
- Exclude drag, locked drag, cancelled gestures, right-click and long-press settings from tap sequences. Ignore held-key repetition and preserve keyboard quota access.
- Respect existing fun, press-sound and reduced-motion controls; add no permanent UI module or toolbar button.
- Use a separate transparent 1254-square, AI-assisted restored sprite as the default. Preserve the original 360-square asset and users' custom images; package the new image as lossless WebP.
- Extend release metadata validation to every bundled WebP and add gesture, keyboard and built-artwork checks.

## 0.2.0 — 2026-11-01

- Add 30 categorized cat-themed lines, including 小基基 and 好猫猫, with literal-text custom dialogue, legacy-line migration and shared repeat avoidance.
- Add petting, fish treats, a ten-second clickable star toy and nap/wake interactions; affection and cooldowns persist locally without quota effects.
- Replace the visible settings layout with six modules: interaction, dialogue, appearance, sound, official quota status and tools.
- Add three panel themes, opacity, movement lock, reduced motion and local custom artwork with original-art reset.
- Add deadline-based focus/break timers with pause/resume, reload recovery and independently controlled reminder sounds.
- Add allowlisted companion-preferences import/export and session fallback when local storage cannot be written.
- Keep the original desktop quota collector, stale-data cutoff, character click, bubble advance/close, drag and snap behavior.

## 0.1.0 — 2026-10-30

- Initial public-source preparation from the desktop-tested Gemini catgirl widget.
- Official five-hour and weekly usage collection in the existing desktop session.
- Thirty-second refresh, ninety-second freshness cutoff and two-minute failure backoff.
- Quota/quote/close interaction, drag, scale, snap, flip and synthesized sound effects.
- Trusted Types-compatible renderer build, reversible local archive adapter and release privacy checks.
- Separate code, dependency and artwork license notices.
