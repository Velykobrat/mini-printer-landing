# Mini Printer v2.1 — visual polish

Baseline: main `1802678d2ab7fbf3e555d2a643eae1f49981c563`.

## Implemented

- Header uses a typographic Mini Printer wordmark without the generated blue icon.
- Hero uses the requested headline and description, with blue “Без чорнил.”. Removed the eyebrow, redundant feature chips, photo captions and photo discount badge.
- Original product photographs and image loading/dimensions are unchanged.
- Four inline SVG icons use a shared 24×24 viewBox, 1.8px rounded strokes and no background tiles: droplet, Bluetooth, battery and photo. Descriptions shortened; fixed card minimum heights removed so rows size to their content.
- Footer contains only Mini Printer, © 2026 and by BeBetter Development. Mobile safety space belongs to the page, outside the footer, and is conditional on the existing sticky-bar visibility in browsers supporting :has(). Older browsers retain a conservative page reserve.
- New two-color SVG favicon uses a 32×32 viewBox with printer body and paper strips. Geometry rasterized locally and inspected at 16×16 and 32×32, with magnified copies; actual tab rendering/cache behavior still needs browser verification.

## Preservation and checks

Only `index.html`, `styles.css`, `favicon.svg` and this report changed. Existing tests were not modified. API, form script, validation, product/price configuration, security headers, analytics and specifications remain unchanged.

- `node --test tests/*.test.mjs`: 67 passed, 0 failed.
- `node scripts/check.mjs`: passed (syntax, modules, anchors/resources, schema/CSP and price synchronization).
- `git diff --check`: passed.
- Original photos and protected v2.0 files compared byte-for-byte with the baseline.

## Remaining visual checks

The offline preview server starts, but local HTTP requests time out in this environment. The browser security policy also disallows file:// navigation; no workaround was attempted. No production/preview deployment was triggered manually, and no real order was submitted.

Browser checks are pending at **320, 375, 390, 430, 768, 1024 and 1440px**. For each width verify natural headline wrapping, prominent photo, balanced cards, compact footer, no horizontal overflow and no sticky-bar overlap. Also check keyboard focus, safe areas, onscreen keyboard and the favicon in light/dark tab chrome. The fallback for browsers without :has() intentionally reserves space even if the sticky bar is hidden.

PR is for review only; no automatic merge or deployment.
