# v2.5.0 — Design Themes

## Межі відповідальності

- `shared/product-config.js` — дані товару та існуюче посилання на конфігурацію секцій.
- `shared/section-config.js` — порядок і видимість секцій.
- `shared/design-config.js` — незалежний вибір оформлення: `DESIGN_CONFIG = { theme: 'pocket-studio' }`.
- `shared/design-themes.js` — реєстр тем, значення токенів, строгі правила валідації. Залежностей від товару чи секцій немає.

Зараз зареєстрована тільки `pocket-studio`, поточний дизайн Mini Printer. Невідома назва завершує генерацію помилкою до запису файлів. Перемикача для відвідувачів немає.

## Аудит і токени

До v2.5 кольори базових поверхонь, тексту та акцентів уже були custom properties, а кольори станів, радіуси карток і responsive typography частково задавалися літералами. Product/document/section renderers відповідають за контент і DOM; їм не потрібні імпорти теми. Вибір теми інтегрований тільки в спільний статичний sync.

Конфігуровані групи:

| Група | Токени |
| --- | --- |
| Палітра | background, surface, section-surface, mint-surface, text, muted, line, accent, accent-dark, success, error |
| Стан і компоненти | header/sticky/footer surfaces, on-accent, pressed-ring, subtle-accent, saving surface/text, product-border, input/focus/invalid/error/success surfaces, borders та rings |
| Типографіка | font-family, body-size, label-size, card-heading-tracking, hero-size та tablet/mobile, heading-size та mobile, order-heading-size та tablet/mobile |
| Радіуси | pill (головні кнопки), radius-control, radius-card, radius-panel та mobile |
| Простір і ширина | section-space та mobile, gutter та mobile (сумарний відступ обох країв), container |

Кожне значення теми має відповідне CSS custom property. Не всі відступи/розміри компонентів є токенами: це свідомо обмежена система, не редактор довільного дизайну. Breakpoints, grid, позиціонування, touch targets, anchor offset, safe-area, motion/reduced-motion, товщина меж і геометрія тіней залишаються у CSS-шаблоні. Колір стандартної межі налаштовується через line; геометрія тіней окремої конфігурації наразі не потребує.

## Генерація

`templates/styles.css` — канонічний CSS з одним слотом `/* design-tokens */`. Решта CSS містить посилання на токени. `scripts/theme-render.mjs` генерує декларації в порядку схеми, не порядку ключів вхідного об'єкта.

Обидві наявні команди генерують однакові outputs:

```sh
npm run sync:product
npm run sync:sales
```

`styles.css` — згенерований, закомічений статичний файл. Його не редагують вручну; структуру/селектори змінюють у шаблоні, дизайн — в реєстрі. Sync також узгоджує HTML meta theme-color з background, перевіряючи єдиний слот. `npm run check` перевіряє drift HTML/CSS/CSP. Для роботи сайту не потрібні клієнтський theme JS, додаткові stylesheet requests або runtime dependencies. Збережено поточні завантаження Manrope та CSP.

## Валідація

Схема закрита: потрібні всі відомі токени, зайві/успадковані ключі заборонені. Кольори — тільки lowercase hex 3/6/8 цифр. Розміри — обмежені числа з визначеною одиницею px/em; одиницю не можна довільно замінити. Значення мають максимум 100 символів, без CR/LF. Довільні CSS/HTML, url(), var(), calc(), expressions та декларації з крапкою з комою не приймаються з конфігурації.

Для fluid headings дозволено тільки `clamp(Npx, Nvw, Npx)` з контрольованими межами: 12–160 px, 0–20 vw (нуль не дозволено), min ≤ max. Для font-family є whitelist Manrope та system-ui; інші сімейства потребують явного розширення схеми й перевірки завантаження шрифтів. Не додавайте довільні рядки або нові зовнішні font origins автоматично. Технічно валідна палітра чи розмір ще не гарантують контраст, читабельність або гарну композицію.

## Додавання майбутньої теми

1. Додайте повний набір токенів у реєстр DESIGN_THEMES, використавши pocket-studio як структурну основу. Не змінюйте дані товару/секцій.
2. Збережіть закриту схему. Новий вид токена має отримати вузьку граматику та негативні тести. Для нового шрифту спершу перевірте font links, privacy page і CSP; жодного автоматичного послаблення політики.
3. Виберіть назву в DESIGN_CONFIG. Запустіть sync, перегляньте diff generated CSS і meta theme-color.
4. Запустіть усі тести/check та browser QA. Перевірте контраст, hover/focus/error/success, відсутність JS, reduced motion і responsive на 320, 375, 390, 430, 768, 1024, 1440 px.
5. Пройдіть ручне візуальне приймання. Minimal/editorial/bold-commerce тут не реалізовані; інший товар не адаптувався.

## Результати перевірок цього релізу

- Усі 186 попередніх тестів збережені без змін; 36 нових перевіряють конфігурацію, небезпечні значення, детермінізм, незалежність, HTML/CSS sync і CLI drift/recovery.
- Fixture `tests/fixtures/pocket-studio-v2.4.css` — оригінальний stylesheet із main 9c71ff2 (тільки нормалізація LF). Після підстановки токенів усі попередні CSS-декларації/селектори/media/motion збігаються; старі root properties мають ті самі значення. Це статичний доказ еквівалентності, не screenshot/visual review.
- HTML, шаблон сторінки, контент, фото/відео, API/Telegram, runtime JS, GA4/UTM/consent, SEO/JSON-LD та CSP не змінені.
- Команди npm у цьому Windows-середовищі замінено їхніми прямими Node entry points: `node --test tests/*.test.mjs`, `node scripts/check.mjs`, `node scripts/browser-qa.mjs`. Проєкт лишається на engine Node 22.x; локальна перевірка виконана Node 24.18.0.
- Browser QA спробовано з наявним зовнішнім Playwright, без нових залежностей проєкту. Chromium завершився на першому page.goto localhost з ERR_CONNECTION_TIMED_OUT. Браузерні сценарії й візуальний review не виконані; обхід обмежень не застосовувався. Потрібні ручні перевірки згаданих ширин, форм, sticky bar, клавіатури та privacy page.
- Публікація — лише Git integration Vercel після перевірок. Manual deploy, зміни secrets/WAF/GA account/Telegram і release tag не виконуються.
