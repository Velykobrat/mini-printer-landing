# Security review and deployment checklist

## Implemented in code

- POST only (`405`, `Allow: POST`), JSON only (`415`), invalid payload (`400`), oversized payload (`413`). All API replies use `no-store`.
- 2 KiB application limit for raw/streamed JSON and already parsed Vercel payloads; declared Content-Length checked too. Vercel may parse requests before invoking the function: this application check cannot prevent that platform allocation. Vercel has its own request limits. Use WAF for earlier rejection if needed.
- Explicit field types and allowlist; no implicit object-to-string coercion, unknown fields (including client prices) rejected. Name control characters/markup rejected; phone normalized on both sides.
- Existing honeypot preserved. Filled honeypot returns a generic `422`, never a fake success. No Telegram request for blocked payloads. Not a CAPTCHA and not sufficient protection against a deliberate bot.
- Cross-site browser requests rejected by Origin/Fetch Metadata. Missing Origin remains possible for tools/bots; this is not authentication or spam prevention by itself. No wildcard CORS response.
- Server price comes only from shared product configuration. Telegram plain text (no parse_mode), 8s deadline, no retries, HTTP + JSON acceptance checked.
- Provider errors return generic 502/503/504 without provider text, customer data or secrets. No PII logging in application code. Hosting access logs/retention are outside this code's control.
- CSP, nosniff, referrer policy, frame denial and unused camera/microphone/geolocation denial in vercel.json. Google Fonts remains the only third-party frontend resource before analytics consent. GA4 is consent-gated; see [analytics.md](analytics.md) for CSP origins, opt-out, account prerequisites and privacy limits.

## Rate limiting — must be configured on Vercel

No in-memory limiter is used: it cannot impose a shared limit across serverless instances. No Redis/database/service has been added. The selected practical option is Vercel WAF rate limiting **before** the function, with an IP key. This requires a platform setting and has not been activated by this branch.

Official documentation: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting and https://vercel.com/docs/cli/firewall. Current documentation says fixed-window rules are available on all plans, subject to plan limits and usage pricing. Review your account's allowance/costs before activation. Counters are **per region**, not a global exactly-N guarantee.

Use the existing linked Vercel project. Do not create a second project or reset the existing firewall. Review existing draft changes before publishing anything.

1. Dashboard → project → Firewall → Configure → New Rule.
2. Conditions (AND): Request Path equals `/api/order`; Request Method equals `POST`.
3. Rate Limit → Fixed Window; 60 seconds; counting key IP. Begin with a generous 30 requests and **Log** action. This only observes and does not enforce a limit.
4. Review the entire firewall draft and publish only the intended rule during an authorized configuration step. Inspect traffic to identify shared IP false positives.
5. Then change to 5 requests / 60 seconds per IP and default **429** action, review/publish and verify a controlled burst is blocked before Telegram is invoked. Tune for expected shared mobile/carrier NAT traffic. Five is a starting recommendation, not a universal safe threshold.
6. Check both the public canonical domain and other exposed deployment URLs/environments. Ensure no bypass rule defeats the intended protection. Do not use a browser challenge for an AJAX endpoint without verifying that the form handles it.

CLI staging alternative (requires installed Vercel CLI, authenticated account and linked project):

```sh
vercel firewall overview --json
vercel firewall diff --json
vercel firewall rules add "Mini Printer order endpoint" --condition '{"type":"path","op":"eq","value":"/api/order"}' --condition '{"type":"method","op":"eq","value":"POST"}' --action rate_limit --rate-limit-window 60 --rate-limit-requests 30 --rate-limit-keys ip --rate-limit-action log --yes
vercel firewall diff --json
```

Do **not** automatically publish these drafts. Dashboard is the recommended path for reviewing/enforcing. The included `waf-rate-limit.json` is a reviewable description of the intended observation rule; it is not read by `vercel.json`, not an active policy, and should not be blindly sent to an API whose schema has changed.

Without enabling the WAF rule, this endpoint **has no distributed rate limit**. IP rate limiting does not stop distributed botnets. If abuse warrants stronger guarantees, choose and explicitly authorize durable storage or a provider bot solution; no paid integration is silently installed here.

## Duplicate and delivery limits

Client in-flight/last-success protection is per loaded page. Concurrent tabs, requests from scripts, reloads and ambiguous timeout retries can still produce duplicate Telegram notifications. Telegram sendMessage has no application idempotency guarantee here. Do not label this exactly-once delivery. Adding a durable idempotency store would be a separate architecture decision.

## Before production traffic

Verify WAF enforcement, required env vars in the intended environment, runtime headers/CSP (including preview toolbar), no PII in logs/analytics, manual Telegram acceptance, error states, phone formats and business terms. Confirm handling/retention/access to the Telegram chat outside this repository. Tests never contact Telegram.
