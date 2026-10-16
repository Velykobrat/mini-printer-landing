# Mobile Header & Footer UX Fix

Baseline: main `775b11aa96d6e9fb6fa14ba45177df8c3b64d4e0`.

- At <=680px the header is position:static, with no top/z-index reservation; it occupies the same initial document-flow space and naturally scrolls out. The existing hidden mobile header CTA stays hidden. Desktop sticky positioning and header CTA are untouched.
- Mobile root scroll-padding is now 16px instead of 80px; this is breathing room at the form anchor, not an obsolete header offset. Desktop remains 95px.
- Sticky CTA geometry uses the viewport top with the existing 16px exit buffer and 180ms delayed reveal. A partly visible Hero CTA never counts as hidden behind a header. Order proximity, focus/keyboard suppression, safe fallback, no initial duplicate CTA and page-bottom safety reserve are preserved.
- Footer brand is the first row. A flex-wrap metadata row places by BeBetter Development left and © 2026 right, aligned by baseline. Narrow/zoomed layouts can wrap naturally while copyright remains right-aligned. Existing font sizes, colors and compact vertical padding are retained.

Validation:

- `node --test tests/*.test.mjs`: 87 passed, 0 failed; Telegram requests mocked.
- `node scripts/check.mjs` and `git diff --check`: passed.
- Hero and order-section HTML, form/scroll handlers, API/Telegram template, product/validation, security headers, analytics, rate-limit docs and photos compared with baseline and unchanged.
- Regression tests cover mobile static header/desktop sticky header, reduced mobile scroll offset, footer ordering/baseline/wrapping, and a Hero CTA still partially visible at y=40px.

Responsive browser review at 320/375/390/430px is pending until an accessible preview is available. Prior localhost checks timed out; local file navigation is blocked by browser policy. Static/unit checks do not constitute a rendered-layout audit. Review header scroll-away, footer baseline/wrapping, no horizontal overflow, Hero-to-sticky transition, form/keyboard hiding and bottom safe-area padding on Safari/Chrome.

No real Telegram submission, automatic merge or manual deployment is performed by this task. The connected Git provider may create a preview automatically after branch push.
