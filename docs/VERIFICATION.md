# Verification scope

Tested environment: Windows, Node.js 24, Gemini Windows 1.17.0, personal default Google account, Chinese usage page. This is a compatibility report, not a guarantee for every Gemini build, region, language or account type.

2026-10-30 acceptance checks:

- The installed desktop widget was compared visually against Google's usage page. Both quota windows and both reset labels matched after conversion from used to remaining.
- Successive background readings advanced about every 30 seconds, including while the desktop window was minimized.
- A refresh of the visible page remounted a single widget and restored official quota data.
- Clicking the character opened the quota bubble; clicking the bubble switched to a quote; clicking again closed it. Text was fully visible.
- Parsing tests cover Chinese and English labels, zero usage, exhausted usage, decimals, missing windows and invalid ranges.
- The renderer mounts in the DOM test with raw innerHTML sinks blocked, preserving the image, menu and SVG namespace.
- The initial loading failure and Google's verification challenge were observed during development. The final reader uses the application's session and User-Agent and backs off after errors. Once the service recovered, automatic collection succeeded.

Not tested: deliberate quota-consuming chats to verify a new deduction end to end; Windows reboot; multiple-account switching; other Gemini versions; macOS/Linux; browser/PWA deployment. No personal quota values, account identifiers or screenshots are included in this public report.

The public source package is built from the desktop-tested renderer. Packaging and privacy checks run separately; a clean-machine installation has not been performed.

2026-11-01 companion 0.2.0 acceptance checks:

- Ten Node tests cover official parsing plus companion migration, quote groups/repeats, cooldowns, bounded state, timer deadlines/pause/reload, malformed state and allowlisted preferences.
- The existing raw-HTML-sink-blocked mount test passes. The new UI integration script verifies six modules, literal custom text, preserved scale, persisted timer state, quota independence, Escape, cross-entry repeat avoidance, independent reminder sound gating, and storage-write failure fallback.
- A local Chromium preview under `require-trusted-types-for 'script'` was exercised for feeding, the clickable star toy, custom literal dialogue, theme switching and timer start/pause/reload. Console error/warning capture was empty.
- Preview geometry was checked at 1280 by 720, 360 by 600 and 640 by 480. The menu stayed inside the viewport; overflowing module content remained scrollable. The side toolbar no longer crosses quota text.
- The installed Gemini Windows 1.17.0 renderer was backed up, updated and reloaded. All six modules appeared, official quota freshness continued updating, and a native pet action produced its dialogue and affection change.
- Independent review found reminder/press-sound coupling and cross-entry quote repetition; both have reproducing regression checks and were fixed.

Not independently verified for 0.2.0: physical speaker output, a full real-time focus session, Windows reboot, clean-profile installation, multi-account behavior, and selecting a custom image through the native file dialog. Timer completion is covered with deterministic clock inputs and the mounted UI harness. No chat was sent to consume quota as part of testing.

2026-11-03 touch and HD 0.3.0 acceptance checks:

- Fifteen Node tests pass, plus the three mounted renderer/UI scripts. New checks cover the fifth-tap threshold, time window/cooldown, calming, wake-up, disabled fun/audio, drag (including locked drag), cancellation, right-click, long-press exclusion, held-key repetition and keyboard quota access after a quote.
- The packaged default image was checked against the HD asset byte for byte. Its dimensions are 1254 by 1254 with transparency; the original 360-square asset remains. PNG-to-WebP alpha frame checksums match.
- A real browser loaded a 1254-square image at the normal widget size, triggered the hiss, cleared it by petting, and woke the sleeping cat with quota still available. There is no new permanent module or toolbar button.
- Gemini Windows 1.17.0 loaded the updated renderer with one widget, imageLoaded=true and inViewport=true. Rapid native clicks visibly produced the short hiss bubble, anger mark and movement. Build and installed renderer hashes match, with the previous renderer retained as a backup.
- The Google main page displayed a region-unavailable landing page during native verification; this upgrade does not change account eligibility or network settings. The existing background quota status file reported a successful reading at that time. Chat availability is not claimed by these widget checks.
- Independent review found a keyboard quota-access regression; a reproducing check failed before the fix and passed after it. No review finding is deferred.

Not verified for 0.3.0: physical speaker listening, Windows reboot, other Gemini versions/accounts, or a clean-machine installation. No chat was sent during this upgrade.
