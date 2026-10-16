# Mini Printer v2.1.1 — Conversion UX

Baseline: main `7241edaba0e13194677e27b2bac8cfb3b64d4d64`.

## Changes

- Mobile header order CTA is hidden at the existing <=680px breakpoint; wordmark and desktop header behavior remain.
- Sticky CTA is hidden in the initial HTML. It appears only on mobile after the Hero CTA has passed behind the header with a 16px buffer, provided the order section is not near the visible viewport and no field/keyboard suppression applies.
- IntersectionObserver plus requestAnimationFrame-coalesced scroll/resize checks handle Hero/order geometry, sticky header occlusion and visualViewport changes. Reveal waits 180ms and rechecks current conditions; hiding is immediate. The order section has a 128px early-hide buffer. Small browser chrome changes are tolerated; significant viewport shrinkage and pinch zoom suppress the bar. Orientation resets the viewport baseline. Without IntersectionObserver, the optional bar stays hidden.
- Form focus suppresses the bar; blur does not reveal it while the keyboard-sized viewport remains. Keyboard detection is a heuristic, not a guaranteed OS keyboard API.
- Order intro uses “Замовити Mini Printer”, one current price and one crossed reference price, and the requested concise description. Submit label is “Надіслати заявку”; loading is “Надсилаємо заявку…”. The form card has the short “Контактні дані” heading to identify the actual destination.
- `#order` now belongs to the actual non-editable, focusable form card, directly above its fields. The entire section is `#order-section` for visibility detection. All existing order anchors share one scroll handler; repeated clicks realign even with the same hash. Modified clicks keep native behavior. Direct links/hash changes use the same destination.
- The target uses the existing sticky-header scroll padding (95px desktop, 80px mobile). Reduced motion uses instant scrolling; otherwise scrolling is smooth. Focus goes to the card, never a field, so navigation does not open a keyboard or begin_checkout. Sticky UI hides before navigation.

## Preservation

The `/api/order` implementation and Telegram message template, shared product/validation, analytics module/configuration, security headers, rate-limit documentation, product images and specifications are unchanged. Order payload, timeout/retry/duplicate handling and success/error semantics remain; only submit labels changed inside the submission handler.

The user reports that a real production Telegram submission was already tested successfully before this change. No additional real Telegram submission was made by this task.

## Validation

- `node --test tests/*.test.mjs`: **84 passed, 0 failed**. Telegram calls are mocked.
- `node scripts/check.mjs`: passed (syntax, imports, assets/anchors/aria references, prices/schema/CSP).
- `git diff --check`: passed.
- Protected API/configuration, shared validation/prices, analytics, rate-limit docs and image bytes compared with baseline.
- Added tests for Hero entry/exit and initial below-fold CTA, reveal debounce, order proximity, field focus/blur, visual/layout viewport keyboard cases, breakpoint/fallback behavior, focused sticky-link handoff, all CTA targets/repeated clicks, modified clicks, direct hashes/load and reduced motion. Existing success/failure tests verify the new idle/loading label and retention of failed inputs. Static tests enforce a single current order price and price-free heading/submit.

## Manual checks remaining

Browser verification remains unconfirmed in this environment (previous localhost requests timed out; file navigation is blocked by browser policy). Review on 320/375/390/430/768/1024/1440px, especially iOS Safari and Android Chrome:

1. Only Hero CTA on the initial mobile screen; desktop header CTA remains.
2. Scroll slowly back/forth across Hero and order boundaries: no competing CTA, overlap or flicker.
3. Tap each CTA repeatedly and open a direct #order URL; form-card heading and first field should be clear of the header. Navigation must not open the keyboard.
4. Focus/blur fields, dismiss keyboard, rotate, expand/collapse browser chrome and test zoom. Verify sticky remains hidden while the keyboard occludes the page.
5. Check smooth/reduced-motion scrolling, keyboard Tab navigation and success/error states. Do not run real Telegram submissions automatically.

A PR is created for traceability, then merged on the user's explicit instruction in this request. No separate deployment action is performed.
