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
