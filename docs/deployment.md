# Deployment і rollback

## Поточна модель

Публічний canonical: https://mini-printer-landing.vercel.app/ . Використовується наявний проєкт `mini-printer-landing`, workspace `vitaliis-projects-6eb76437`, Git integration з `Velykobrat/mini-printer-landing`, production branch `main`. Успішний deployment status не є доказом WAF, analytics чи фактичної доставки заявки.

Сайт — static HTML/CSS/ES modules в корені та `api/order.js`. Немає `dist`, npm dependencies або build framework. Outputs генеруються й перевіряються перед commit. В наявному Vercel проєкті перевірте Root Directory — repository root, framework — Other, Node runtime — 22.x, відсутність зайвого install/build command та відповідність output статичному кореню. Це інструкція для review, не заява про прочитані dashboard settings.

## Environments і secrets

Server-only env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`. Значення не копіюють у репозиторій, shared config чи browser. Preview з реальними credentials теж може надсилати повідомлення: не застосовуйте до нього production secret без потреби. Локальний `scripts/dev.mjs` завжди використовує порожній env для order handler і не надсилає Telegram.

Публічні analytics ID/hostname — в `analytics-config.js`, SEO canonical — в product config. При перенесенні домену перевіряють обидва джерела, robots/sitemap і privacy information, але цей реліз доменів не змінює.

## Перед production traffic

1. Виконайте перевірки з [README](../README.md#testing) і перегляньте generated diff. Не приймайте browser failure як pass.
2. Перевірте active WAF: `/api/order` + POST, IP rate limit з реальною enforcement-дією, порядок rules/bypasses, середовища й публічні deployment domains. `waf-rate-limit.json` не застосовується автоматично; Log action не блокує. Конкретний rollout і межі — [security.md](security.md).
3. Перевірте deployment headers: CSP відповідає JSON-LD hash, немає unsafe-inline/eval; frame/nosniff/referrer/permissions та API no-store чинні. GET до API має дати 405, без заявки; не використовуйте bursts на production без окремого плану.
4. У GA4 перевірте Enhanced Measurement/destinations/retention/key event та consent Network/DebugView за [analytics.md](analytics.md). Це settings власника, код не керує ними.
5. Після окремого дозволу — одна контрольована заявка у визначений чат, перевірка тексту/серверної ціни й visible success. Без дозволу реальні Telegram повідомлення не надсилають. Timeout може означати невизначену доставку, не повторюйте автоматично.
6. Підтвердьте business terms, приватність/доступ/retention Telegram, права на медіа та visual/accessibility QA. Незмінна pending інформація не є підтвердженою комерційною умовою.

## Статус перевірки доступів

17.10.2026 read-only Vercel list_projects у правильному workspace повернув 403 forbidden; Vercel CLI у середовищі відсутній. Active firewall, env settings, dashboard і runtime logs не перевірені. Потрібна зовнішня перевірка власника; re-authentication/permission change цим релізом не виконуються. GitHub Vercel commit status можна перевірити окремо без цього доступу.

Якщо підтвердиться, що endpoint відкритий без distributed rate limit при прийманні комерційного трафіку, це High abuse risk: спершу захист/перевірка, потім комерційне приймання. Невідомий стан не позначається як нібито активне правило.

## Публікація і rollback

Після доступних checks — reviewed commit і звичайний fast-forward update main, без переписування історії. Наявна Git integration запускає deployment. Перевірте commit SHA main, GitHub Vercel status та відповідність production alias; console status сам собою не перевіряє user flow. Manual deploy у цьому релізі не запускається.

Для rollback визначте останній прийнятий commit, перегляньте `git revert` конкретних змін, запустіть checks і опублікуйте новий revert commit через ту саму integration. Не reset/force-push і не переміщуйте старі теги. Emergency Vercel rollback — окрема явно погоджена дія власника, після якої Git/production треба узгодити.

Tag `v2.5.0` і GitHub Release створюються тільки після окремого приймання фінального commit і deployment. Notes підготовлені в [release-v2.5.0.md](release-v2.5.0.md); вони не означають, що tag уже існує.
