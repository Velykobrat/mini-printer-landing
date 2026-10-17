# Maintenance

## Як повернутися до проєкту

1. Почніть з [README](../README.md), [architecture](architecture.md) і фінального [release report](release-v2.5.0.md).
2. Перевірте `git status`, `git fetch origin`, актуальні main/deployment SHA. Не перезаписуйте чужі unfinished files. Для цього фінального проходу шість попередніх working-tree змін виключені з commit.
3. Використовуйте Node 22.x. Немає npm install/оновлення dependency tree; Playwright для optional QA постачається середовищем.
4. Запустіть test/check/check:docs, потім browser QA на offline server. Перегляньте зміни між baseline і поточним commit, а не історичні counts у архіві.

## Де змінювати

Товар — [product config](product-configuration.md), секції — [section config](reusable-sections.md), оформлення — [themes](design-themes.md). Не редагуйте generated `index.html`/`styles.css` окремо від джерел. `npm run sync:product` і `sync:sales` однаково генерують сторінку; `--check` відхиляє drift. CSP hash Product JSON-LD синхронізується генератором, не копіюється вручну.

Не видаляйте compatibility facades, review QA fixtures чи canonical templates тільки через схожість коду: вони мають чинних споживачів і regression tests. [Архів](archive/README.md) — історична evidence, не поточний operational runbook.

## Інциденти

| Симптом | Перша перевірка |
| --- | --- |
| API 503 | Наявність env у правильному environment або Telegram 429; не друкувати secrets |
| API 502/504 | Provider/network/deadline; доставка могла відбутися, автоматичних retries не додавати |
| API 429 | WAF active policy/false positives/shared-IP; не вимикати firewall навмання |
| Немає GA events | Consent, production hostname, tag blocked, GA4 settings; не обходити consent |
| Duplicate lead | Client attempt guards, ambiguous timeout/cross-tab; server exactly-once не обіцяється |
| CSS/HTML drift | Запустити sync, переглянути конфігурацію та generated diff |

Код не логує PII. Не додавайте raw request bodies, provider responses або token-bearing URLs до logs/issues. Evidence інциденту повинна бути знеособлена; credentials/дані заявки не комітяться. Serverless in-memory counter не замінює distributed limiter.

## Планові зовнішні перевірки

Перед відновленням продажів/реклами та після platform/domain/account змін: WAF enforcement/bypasses, production headers, Telegram права/retention й контрольована доставка за дозволом, GA4 Enhanced Measurement/destinations, consent transitions, runtime versions, responsive/accessibility і права на медіа. Деталі: [deployment](deployment.md), [security](security.md).

Не оновлюйте secrets або paid platform settings без відповідного завдання. Не створюйте Demo Mode, нові теми чи наступну версію в межах фіналізації v2.5.0. Після окремого приймання можна створити незмінний tag/Release на прийнятому commit.
