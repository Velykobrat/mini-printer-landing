# Mini Printer v2.0

Україномовний лендінг портативного термопринтера. Збережено візуальний напрям Pocket Studio, HTML/CSS/vanilla JavaScript і Vercel Node.js Function із Telegram Bot API. Немає frontend-фреймворку, бази даних, сторонніх npm-залежностей або обов’язкового build-кроку.

## Локальний запуск

Потрібен Node.js 22.x. Встановлювати залежності не потрібно.

```sh
npm run dev
```

Відкрийте `http://localhost:4173`. ES-модулі потребують HTTP-сервера; `file://` не підтримується. Локальний сервер свідомо використовує порожнє оточення API: валідна заявка поверне 503, **реальні повідомлення не надсилаються**. Для перевірок інтеграції використовуйте окремий контрольований Vercel preview. Не відкривайте секрети в браузері, файлах або логах.

```sh
npm test
npm run check
```

Якщо Windows блокує npm scripts через вимкнений `cmd.exe`, запускайте еквіваленти напряму:

```sh
node scripts/dev.mjs
node --test tests/*.test.mjs
node scripts/check.mjs
node scripts/sync-product.mjs
```

Тести використовують `node:test` і моки Telegram/DOM. Вони не замінюють браузерну або production-перевірку. `check` перевіряє синтаксис, модулі, anchors, локальні файли, відповідність цін/schema/CSP і відомий формат Telegram-токена. Це не повний security scanner чи HTML validator.

## Vercel

- Збережіть наявний Vercel project та зв’язок із репозиторієм. Framework preset: Other; root: repository root; frontend build/output overrides не потрібні. Сайт обслуговується як статичні файли, `/api/order` — Node.js Function.
- `package.json` фіксує Node.js 22.x. `vercel.json` задає максимум функції 15 секунд; Telegram має окремий таймаут 8 секунд, клієнт — 12 секунд.
- Налаштуйте незмінені server-only змінні `TELEGRAM_BOT_TOKEN` та `TELEGRAM_CHAT_ID` для потрібного середовища. Значень у репозиторії немає. Preview повинен використовувати окремий тестовий чат, якщо дозволена ручна інтеграційна перевірка.
- Додайте правило WAF із [security.md](docs/security.md) **до приймання рекламного трафіку**. Конфігурація в репозиторії не активує обмеження запитів сама.
- Перевірте фактичну canonical-адресу. Зараз збережено `https://mini-printer-landing.vercel.app/`; при зміні домену оновіть canonical, OG URL/image, Twitter image, robots і sitemap, потім запустіть `npm run sync:product`.
- Security headers включають CSP із дозволом власних скриптів, Google Fonts, hash JSON-LD і вузьких GA4 origins (завантаження лише після згоди). У preview перевірте, чи він сумісний із Vercel Toolbar/зовнішніми інтеграціями. Не послаблюйте CSP до `unsafe-inline`; додайте лише потрібні джерела після перевірки.
- Ця гілка не зливається й не розгортається в production автоматично агентом. Git integration Vercel може створити preview після push; це залежить від наявних налаштувань проєкту.

## Заявка

1. Клієнт перевіряє ім’я (2–60 символів) і нормалізує телефон. Український `0XX…` або `380XX…` стає `+380XX…`; міжнародні номери приймаються з `+`, 10–15 цифр. Це перевірка формату, не фактичного володіння номером.
2. JSON із `name`, `phone` і `bot-field` надсилається на `/api/order`. Клієнт не надсилає ціну.
3. Сервер незалежно перевіряє method, origin для браузерів, Content-Type, розмір (2 KiB), структуру, типи полів і honeypot.
4. Telegram отримує plain-text повідомлення з авторитетною серверною ціною зі `shared/product.js`.
5. Успіх повертається лише після HTTP success, `ok: true` і підтвердженого `message_id` Telegram. Клієнт очищує форму й може передати `generate_lead` лише після `success: true`.

Неуспішні заявки зберігають поля. Подвійний клік і повтор тієї самої успішної заявки блокуються в межах поточної сторінки. Серверні помилки не повертають токени, upstream response або персональні дані. Немає логування customer data.

**Таймаут є неоднозначним:** Telegram міг прийняти повідомлення до втрати відповіді. Автоматичних retries немає. Гарантії exactly-once, дедуплікації між вкладками чи розподіленими інстансами немає; для неї потрібне надійне сховище ідентифікаторів, яке тут свідомо не додається.

## Ціни

`shared/product.js` — єдине місце редагування ціни: 800 UAH, reference 1200 UAH. Сервер та JS імпортують його. Видимі HTML-значення залишаються статичними для SEO/роботи без JS:

```sh
npm run sync:product
npm run check
```

Скрипт синхронізує `data-price`, Product JSON-LD та CSP hash. Результат треба закомітити. Це maintenance-крок при зміні ціни, а не frontend build. `check` виявляє розбіжності. Не редагуйте ціни в HTML окремо.

## GA4 і згода

UTM та воронка: [docs/marketing-attribution.md](docs/marketing-attribution.md). Після згоди sessionStorage зберігає перший перевірений UTM-перехід вкладки; native campaign_* додаються до наявних funnel events. Довільні текстові значення не приймаються: для майбутніх Instagram/Facebook/TikTok/Google Ads кампаній використовуйте нейтральний формат кодів і безпечні приклади з документації. Відкликання очищує attribution. Нових conversion/session подій, Ads-функцій чи змін дизайну немає.

GA4 ID: `G-WHL8RKEGFJ`. Google tag завантажується лише після явної згоди або збереженого чинного дозволу (180 днів), лише на `mini-printer-landing.vercel.app`. До згоди й після відмови немає Google tag / collect запитів. При недоступному localStorage — без аналітики. Вибір можна змінити через «Налаштування cookies» у footer; відкликання негайно встановлює Google opt-out і видаляє доступні first-party GA cookies. Замовлення не залежить від аналітики.

Події: `order_click` (реальне CTA, location header/hero/sticky_bar), `begin_checkout` (раз на спробу взаємодії), `generate_lead` (лише після нового підтвердженого успіху API), а також збережений `view_item` і один `page_view` після згоди. Ціна імпортується зі спільної конфігурації. Імена/телефони/значення полів у payload не передаються; `purchase` немає.

**До ввімкнення в production:** вимкніть Enhanced Measurement для web stream, перевірте Google tag destinations та виконайте ручний Network/DebugView QA. Код не може змінити ці налаштування GA4. Повний опис payload, key event, CSP, обмежень та checklist — [docs/analytics.md](docs/analytics.md). Інформація для відвідувача — [privacy.html](privacy.html).

Інтеграція підготовлена в PR; production collection не перевірено. Main, production env і Telegram API не змінювалися цією гілкою.

## Доступність, швидкість, SEO

Збережено Manrope з `display=swap`, локальні справжні JPEG (hero ~40 KB, lifestyle ~137 KB), priority hero й lazy-loading lifestyle. Вказано фактичні розміри 630×630. Перекодування цих невеликих фото не виконувалось, щоб не погіршити якість.

CSS очищено від старих gallery/variant selectors та накладених override-блоків. Залишено три layout breakpoints (950, 900, 680), оскільки 900 зберігає попереднє складання планшетних секцій. Збережено кольори, композицію, hover/reduced-motion; дрібний текст збільшено, звичайний текст — переважно 16px. Додано field errors/aria-invalid, keyboard focus для FAQ, touch targets і запас під mobile bar. Sticky bar ховається перед формою та при фокусі в ній.

Є canonical, Open Graph, Twitter metadata, robots/sitemap і Product/Offer JSON-LD без вигаданих review, stock, доставки, гарантій або рейтингу. Валідність rich-result eligibility і індексацію потрібно перевірити окремо.

## Статус і межі перевірки

Це hardening-гілка для контрольованого review, не сертифікація production readiness. Див. [QA.md](docs/QA.md) і [security.md](docs/security.md). Браузерні перевірки на всіх потрібних ширинах, ручна клавіатура/screen reader, реальна Vercel Function і Telegram integration ще потребують виконання, якщо вони позначені неперевіреними у QA. Не додавайте рекламні обіцянки, непідтверджені гарантії чи вигадані відгуки.
