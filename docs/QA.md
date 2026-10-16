# QA — Mini Printer v2.0

## Scope and baseline

Baseline: main commit `044ae6a44daf37d8fedc4b883347f9a0e5749533`, including approved Pocket Studio refresh. No AGENTS.md was present in the repository tree. Existing honeypot, keyboard outlines, reduced motion, lazy lifestyle image and mobile bar were inspected and retained/improved rather than duplicated.

## Automated results

- `node --test tests/*.test.mjs`: **67 passed, 0 failed** using Node built-in test runner; no installed npm dependencies.
- `node scripts/check.mjs`: passed — JS syntax, local module resolution, resources/anchors/aria-describedby targets, single H1, Ukrainian language, `/api/order` action, image loading flags, price/schema/CSP synchronization and known token-pattern scan.
- API tests: malformed/oversized JSON, streamed payload, unexpected types/keys, honeypot, phone normalization, methods, Content-Type, Origin, missing env, Telegram HTTP failure, provider `ok:false`, missing message ID, invalid JSON, 429, network failure and timeout. All provider calls mocked.
- Frontend behavior tests use a small DOM test double: validation, accessible field errors, normalized request, success/reset, failed/non-JSON responses, no reset on failure, loading/read-only state, in-flight/accepted duplicate guards, timeout, analytics isolation and sticky observer states.
- Analytics tests: disabled/no consent means no events; each allowed event at most once per load; fixed non-PII payload; transport/consent failures isolated.
- Contrast calculation: tested representative body, primary CTA, coral badge, savings, error and success color pairs at >= 4.5:1. This is not a full rendered accessibility audit.
- Images preserved byte-for-byte: 630×630 JPEG; hero 40,160 bytes, lifestyle 137,022 bytes. HTML dimensions corrected to actual ratio. No generated images.
- Git diff reviewed for unrelated changes; no env values, dependencies, business claims, payment integrations or framework migration introduced.

npm wrappers could not execute in this Windows environment because cmd.exe is disabled by administrator policy. The equivalent Node commands above ran directly. No system policy was changed.

## Browser / responsive matrix — not verified

A local offline-only preview server started, but `curl --max-time 5 -I http://127.0.0.1:4173` timed out in this environment. The earlier built-in browser attempt against localhost also timed out. No browser results, screenshots, Lighthouse scores or production verification are claimed.

| Width | Intended layout from CSS | Browser status |
| --- | --- | --- |
| 320 | Stacked hero, 2 benefit columns, mobile bar, wrapped hero actions | Pending |
| 375 | Stacked hero, 2 benefit columns, mobile bar | Pending |
| 390 | Stacked hero, 2 benefit columns, mobile bar | Pending |
| 430 | Stacked hero, 2 benefit columns, mobile bar | Pending |
| 768 | 2-column hero, paired benefits, stacked order/spec sections | Pending |
| 1024 | Desktop header/nav, 2-column hero, 4 benefit columns | Pending |
| 1440 | Centered desktop layout capped at 1160px | Pending |

At each width check: no horizontal scrolling; header/nav fit; hero wraps naturally; photo aspect/crop; price and CTA are visible; benefit card text fits; lifestyle/scenario spacing; specifications values; FAQ expansion; form labels/errors; sticky bar and footer safe-area space. Compare with the approved baseline. At 200% text zoom and with the mobile keyboard visible, repeat the overflow/form checks.

## Manual acceptance steps

1. Preview in Chrome/Firefox/Safari and iOS/Android; use all seven widths above. Check the console/network for ES module, Google Fonts, image and CSP errors. Verify real deployed security headers and no-cache API response.
2. Tab from skip link through navigation/FAQ/form. All focus states should be visible; touch targets >=44px. Check heading/label/status reading with NVDA/VoiceOver. Field errors must be associated with their fields; success/error announced once.
3. Open/close FAQ with keyboard. Follow all anchors and both mobile/header CTA paths. Sticky bar must hide near the form and during input, and not cover footer content. Test reduced-motion and safe areas.
4. In an explicitly controlled Vercel preview with a dedicated test Telegram chat, manually submit one authorized test request, confirm exactly one notification, normalized phone and 800 UAH server price, then confirm visible success. Do not send real messages as part of automated tests.
5. Exercise failed/offline/non-JSON/429 states using browser request interception or a mock endpoint; fields must remain populated and controls recover. Do not deliberately break production credentials or send abuse traffic to Telegram.
6. Configure WAF per security.md; verify rules do not affect ordinary visitors and a controlled burst produces 429 before the function. Check shared-IP false positives and other public deployment domains.
7. Validate structured data in Google's Rich Results Test and sitemap in Search Console. Confirm canonical hostname and real business terms before ad launch.
8. If analytics is later enabled, verify consent transitions and GA4 DebugView: one view, one begin, one accepted lead; no lead on failure; no names/phones/field values. Current branch has no tracking configured.

## Known limitations

No distributed rate limiter or server-side durable deduplication is active in this source. WAF activation is a required deployment task. Per-region WAF counts cannot guarantee a single global quota. Timeout can leave an uncertain delivery result; there are no automatic retries. Client tests do not emulate actual browser layout, native constraints or screen readers. No real Vercel/Telegram integration or production deployment was performed.
