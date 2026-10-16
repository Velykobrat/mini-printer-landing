# GA4 integration and verification

> Оновлено 16.10.2026: PR #8 і #9 уже злиті в main `1b6c3cf`. Нижче збережено історичний звіт відповідного етапу; згадки про незлитий PR, тодішнє середовище та кількість тестів належать тому етапу. Актуальний звіт релізу: [release-v2.1.0.md](release-v2.1.0.md); історія Sales Trust: [sales-trust.md](sales-trust.md). Production GA4/Telegram/WAF цим оновленням не перевірялися.

Оновлення після PR #8: [Marketing Attribution & Conversion Funnel](marketing-attribution.md) описує consent-gated sessionStorage, безпечний UTM-контракт, native campaign_* на існуючих подіях і налаштування воронки. Нижче — базова реалізація PR #8; її 112 тестів входять до розширеного suite (129 тестів для attribution PR).

Status: implementation for review, not a production verification report. No production deployment, environment changes or GA4 account changes have been performed. Browser/visual QA has not been performed: local browser access was unavailable and Vercel preview requires access not granted to this session. Automated tests use DOM/Google/Telegram doubles, not the real Google library.

Validation: `node --test tests/*.test.mjs` — **112 passed, 0 failed** (91 existing + 21 added); `node scripts/check.mjs` — passed. The commands run the same entry points as npm test/check; npm's Windows cmd launcher is unavailable in this environment. Protected API/shared files and product photographs match the audited GitHub blobs byte-for-byte.

## Audit and scope

Main at audit: `97e044b97099b87d14e1d76a3db4739145caa2ac`. Existing `analytics.js` was a disabled event preparation module with page-wide deduplication; script.js used a manual global consent flag with no consent UI or vendor loader. These hooks are now reused. The existing API confirms success only after Telegram confirms a message; the lead hook remains inside that successful client response branch, after reset. `/api/order`, shared validation/product configuration, Telegram template, security headers other than narrow CSP additions, rate-limit documentation, images and order behavior are unchanged.

Files: `analytics-config.js`, `analytics.js`, new `consent.js`, `script.js`, `index.html`, `styles.css`, new `privacy.html`, `vercel.json`, tests in `tests/analytics-consent.test.mjs`, `tests/frontend.test.mjs`, `tests/conversion.test.mjs`, README, this document and the frontend resource note in `docs/security.md`. No dependencies.

## Configuration and consent

Measurement ID **G-WHL8RKEGFJ**, canonical **https://mini-printer-landing.vercel.app/**. Configuration is centralized in `analytics-config.js`; the ID is public, not a secret. Host allowlist prevents local and automatic preview traffic entering the production property. Debug is off. For a controlled preview QA only, temporarily set hostname to that preview and debug true in a separate unmerged test revision; restore before review/merge. Do not change production env vars.

Basic consent flow: no vendor script, dataLayer, analytics events, preconnect or tracking cookies before explicit acceptance. `mini-printer:analytics-consent:v1` in localStorage stores only version, granted/denied and timestamp (180 days). Valid saved acceptance enables tracking on reload. Invalid, expired, future, missing or unreadable records fail closed. A failed write/readback cannot enable tracking. Rejection does not reactivate on reload. Necessary ordering works independently.

The compact Ukrainian panel is in document flow, not an overlay. Native buttons support keyboard activation. Privacy information links to `privacy.html` (no tracker on that page). Footer settings reopen the panel without focusing inputs; users can reject or withdraw. No animation is added. When closing a focused panel, focus moves to settings. Storage failure is announced in a live status message.

Withdrawal sets `ga-disable-G-WHL8RKEGFJ=true` before further collection, gates all application events, drops queued events and attempts to delete visible `_ga`/`_ga_*` cookies at root path for host and parent domains. No consent ping is sent after withdrawal. Cross-tab storage updates and expired consent are checked; visibility changes and every application event check consent again.

Consent removal while the tag is loading cancels callbacks/removes the pending element and requires a reload to load analytics again, even if acceptance is saved. A script error or 8-second load timeout also fails closed for the rest of this page: no automatic retries, site/form unaffected. A successful loaded tag can be re-enabled after fresh acceptance without duplicate initialization or pageview. Events before consent are dropped permanently. At most 50 post-consent events can queue while the script loads; withdrawal or load failure clears them. Blockers/network failures can cause missing analytics, never retries of an order.

## Events

| Event | Trigger | Allowed parameters |
| --- | --- | --- |
| `page_view` | Once per loaded page, after consent and tag load | Fixed canonical page_location, fixed page_title, empty page_referrer |
| `view_item` | Existing hook, once per page after consent | product, currency, value, items |
| `order_click` | Existing navigation handler for actual header, hero or sticky link activation | product=`mini_printer`, cta_location=`header`, `hero`, `sticky_bar` (other is a sanitized fallback) |
| `begin_checkout` | First name/phone focus, input or actual submit in an attempt | product, currency, value, items |
| `generate_lead` | Only HTTP success plus JSON success=true for a new accepted order | product=`mini_printer`, currency=`UAH`, value from PRODUCT.price (currently 800) |

Items use only shared product ID/name, price and quantity=1. An attempt begins with real form interaction; field changes, validation failures and failed network/API retries remain the same attempt. A successful new order resets the attempt for a subsequent order. Internal attempt counters never leave the browser. Duplicate accepted submissions do not produce another lead. Form visibility, anchor focus, hash navigation, loading and failed responses never produce a lead. Modifier clicks retain native navigation. No purchase event or submit-button tracking handler is added.

Payloads are constructed from allowlists, ignoring arbitrary caller fields. No names, phones, form values, customer IDs, order payloads or explicit IP addresses are sent by application analytics. Canonical URL and empty referrer avoid query/hash/referrer leakage. Google still receives network connection metadata; third-party analytics is not anonymous or exempt from privacy review.

## Required GA4 account setup before production approval

1. Confirm the web stream ID and that this tag has no connected Ads/other destinations. No duplicate tag via another integration. Disable Google signals, ads personalization, user-provided data collection and unwanted cross-domain measurement in the account. Code also denies ad_storage/ad_user_data/ad_personalization and sets allow_google_signals/allow_ad_personalization_signals=false.
2. **Disable Enhanced Measurement for this stream**, including form interactions, site search, outbound clicks and page changes based on browser history events. The landing explicitly sends page_view with send_page_view=false. Google's remote history measurement can still generate duplicate pageviews unless disabled in the GA4 UI. Account settings are not managed by this repository.
3. Admin → Data display → Events / Key events: mark or create `generate_lead` as a key event. Use **once per event** counting, since a genuine second accepted order can occur in one session. Do not mark submit clicks or failed requests as leads. Register event-scoped custom dimensions `cta_location` and `product` if needed in reports. Reporting propagation can take time.
4. Review data retention/access, data processing terms and published privacy information. Site owner should supply accurate controller/contact information and applicable retention/request procedures; this technical privacy page is not a complete legal policy or legal compliance certification.

## Manual QA / production verification checklist

All items below remain unverified. Use synthetic data and a mocked /api/order response in browser request interception for analytics QA; do not generate real Telegram messages. Any actual Telegram smoke test needs a separately authorized test chat.

- [ ] On the controlled allowed host, clear consent/cookies; open Network with Preserve log and filter `gtag`, `collect`, `google-analytics`, `googletagmanager`. Before choosing and after rejection/reload: zero GA requests and no `_ga` cookies. Existing Google Fonts is unrelated and is not gated by analytics consent.
- [ ] Accept: one gtag.js, one config, one page_view, one view_item. Reload valid saved consent; repeat clicks/acceptance without duplicated initialization. Navigate #order and other anchors: no extra page_view. Verify no CSP console violations. Test script blocked/offline/timeout with successful mocked order and retained fields on API failure.
- [ ] Use a controlled preview with debug=true (never merge that setting), GA4 Admin → DebugView, or Realtime for an accepted test session. Inspect Network payloads rather than relying only on reports. No production data collection is claimed before deployment and this verification.
- [ ] Click all actual CTAs; inspect correct locations. Form visibility/anchor focus alone: no begin_checkout. Focus/edit several fields: one begin_checkout. Invalid or mocked 4xx/5xx/network failures: no generate_lead and inputs retained. Mock confirmed success: one generate_lead with configured UAH value; double-click and accepted duplicate: no second lead. A genuinely new accepted order may produce a second checkout/lead.
- [ ] Inspect every collect request for field values, phone/name, customer IDs, full current URL/referrer or unwanted automatic form/search/outbound events. Test a synthetic query/hash URL to confirm it is absent. Confirm no Ads requests. Google may still emit intrinsic session/engagement events after consent; these are vendor behavior, not form conversions.
- [ ] Footer settings → withdraw: opt-out true, GA cookies removed where accessible, no further collect on clicks, hash changes, form interactions or background engagement. Test withdrawal during pending script load; reaccept then reload if needed. Already-started requests cannot be recalled.
- [ ] Reload after rejection/withdrawal; test other tab rejection, cleared/expired storage, storage denied, private browsing, keyboard Tab/Enter/Space, live status, focus restoration and reduced motion.
- [ ] At **320, 375, 390, 430, 768, 1024, 1440 px**, check panel wrapping, no horizontal overflow, readability, real CTA visibility, mobile sticky reveal/hide, input/keyboard behavior and compact footer. Panel must never overlap content. Also test narrow landscape and browser zoom.
- [ ] After separately approved merge/deploy, repeat the Network/consent/conversion checks on canonical production, confirm Realtime/DebugView and generate_lead key event, then record date/evidence. Do not infer production correctness from mocked tests.

## Security and known limits

CSP adds only googletagmanager.com for script and supporting image/connect, and www/region1.google-analytics.com for collect/image. Existing self, JSON-LD hash, Fonts, object/base/frame/form restrictions remain; no unsafe-inline/eval or Ads/DoubleClick origins. This is deliberately narrower than Google's all-feature policy. If runtime uses another endpoint, inspect and allow only a justified GA4 endpoint after review; do not broadly weaken CSP. Runtime compatibility needs browser QA.

Client opt-out cannot unload already executed JS, cancel in-flight network requests, remove server-held data, third-party/HttpOnly/inaccessible-path cookies, or override every future remote Google tag configuration. Cookie removal is best effort at the configured root path, not proof of deletion everywhere. With blocked storage a choice cannot persist; tracking remains off in that page. If a previously granted record cannot be overwritten during withdrawal, browser site-data removal is needed to guarantee persistent revocation after storage becomes accessible again. No local mechanism can delete inaccessible storage. Explain this honestly to users if that browser failure occurs.

Consent records are not a server audit log. Deduplication is tab-local, not cross-tab/server idempotency. Public endpoints receive IP metadata at the transport layer even though code does not attach IP fields. Remote GA settings, Google's cookies/retention and third-party controls require the owner's review. This implementation does not change the Telegram data lifecycle.

References: [Google consent](https://developers.google.com/tag-platform/security/guides/consent), [opt-out/privacy controls](https://developers.google.com/tag-platform/security/guides/privacy), [manual pageviews and history measurement](https://developers.google.com/analytics/devguides/collection/ga4/views), [CSP](https://developers.google.com/tag-platform/security/guides/csp).
