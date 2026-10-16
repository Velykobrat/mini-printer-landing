# Marketing Attribution & Conversion Funnel

## Аудит після PR #8

База: main `0cc73f0cbcf0791927da1e238fec890a90506905` (злитий PR #8).

- Офіційний Google tag завантажується лише після аналітичної згоди; Measurement ID `G-WHL8RKEGFJ`. Доступний лише canonical hostname, preview/local вимкнені конфігурацією.
- Є один ручний `page_view` після завантаження tag; `send_page_view=false`. Незмінені hooks: `order_click` у навігації, `begin_checkout` раз на спробу, `generate_lead` лише після нового підтвердженого успіху API. `view_item` збережено. Нових подій не потрібно.
- Payload створюється з allowlist; форма не передає ім’я/телефон у GA4. Повний URL/query/hash і referrer навмисно не передаються: page_location фіксований canonical. Через це UTM не можна просто залишити автоматичному читанню повного URL.
- До цієї зміни не було UTM-парсера чи session-attribution storage. Згода зберігається у localStorage, відкликання вимикає tag, скидає чергу й очищує доступні GA cookies. Новий sessionStorage запис очищується тим самим lifecycle, включно з міжвкладковою відмовою та простроченням згоди.
- `/api/order`, Telegram message/payload, shared validation/price, форма, CTA/scroll, CSS/дизайн, CSP, Firewall/rate-limit конфігурація не потребують змін і залишаються без змін.

## Безпечний UTM-контракт для майбутніх кампаній

Конкретних рекламних кампаній наразі немає. Реалізація не містить переліку назв кампаній: використовується загальний формат коротких кодів. Звичайна перевірка довжини або blacklist email/телефонів не може відрізнити довільну назву кампанії від імені людини. Тому довільні текстові slugs **не приймаються**, навіть якщо вони виглядають безпечними. Це свідомий компроміс на користь приватності; плануйте посилання за таблицею.

| URL-параметр | Дозволені значення / формат | Поле GA4 |
| --- | --- | --- |
| `utm_source` | instagram, facebook, tiktok, google, bing, youtube, telegram, newsletter | campaign_source |
| `utm_medium` | cpc, ppc, paid_social, paid_search, social, organic, email, referral, display, affiliate | campaign_medium |
| `utm_campaign` | `mp-YYYYMM-N`: рік 2000–2099, місяць 01–12, порядковий номер кампанії 1–999 без нулів попереду | campaign_name |
| `utm_content` | `image`, `video`, `carousel`, `story`, `reel`, `search`, `display` або `text`, потім `-N` (1–999), за потреби `-a` / `-b` | campaign_content |
| `utm_term` | `kw-N` (1–999) або mini-printer, thermal-printer, photo-printer, sticker-printer | campaign_term |

Коди описують **кампанію/креатив/ключове слово**, ніколи окрему людину чи замовлення. Ведіть таблицю відповідності кодів кампаніям окремо, без даних клієнтів. Один код може використовуватися будь-якою кількістю відвідувачів. Не підставляйте CRM ID, email, телефон, ім’я, user ID або персоналізовані рекламні макроси. Для Google Ads не використовуйте довільний динамічний `{keyword}`: використовуйте статичний `kw-N` та окрему таблицю ключових слів.

Правила централізовано в `attribution.js`. Максимум 32 символи на значення, query — 2048 символів, збережений JSON — 512. ASCII літери/цифри/`-`/`_`; регістр значень нормалізується до нижнього, пробіли/керівні символи не обрізаються, а відхиляються. URLSearchParams декодує один раз. Повторення одного UTM-ключа відхиляє це поле навіть з однаковими значеннями. Ключі case-sensitive. Невідомі ключі та `gclid`, `fbclid`, `utm_id`, довільні URLs, IP, email, телефони, HTML і текстові імена не копіюються у власний payload/storage. Невалідне поле відкидається, валідні сусідні поля можуть залишитися. Коди не є криптографічним доказом неособистого змісту: оператор не повинен навмисно кодувати в них особу; frontend не може встановити семантику зовнішньої таблиці кодів.

### Приклади безпечних посилань

Це приклади формату, а не вже створені або затверджені рекламні кампанії.

```text
Instagram:
https://mini-printer-landing.vercel.app/?utm_source=instagram&utm_medium=paid_social&utm_campaign=mp-202610-1&utm_content=reel-1-a&utm_term=kw-1

Facebook:
https://mini-printer-landing.vercel.app/?utm_source=facebook&utm_medium=paid_social&utm_campaign=mp-202610-2&utm_content=carousel-2-b&utm_term=kw-2

TikTok:
https://mini-printer-landing.vercel.app/?utm_source=tiktok&utm_medium=paid_social&utm_campaign=mp-202611-1&utm_content=video-1&utm_term=kw-3

Google Ads (manual UTM; без увімкнення Ads-функцій):
https://mini-printer-landing.vercel.app/?utm_source=google&utm_medium=cpc&utm_campaign=mp-202611-2&utm_content=search-1&utm_term=mini-printer
```

## Згода та перший перехід

`mini-printer:session-attribution:v1` містить тільки `{version:1, utm:{...перевірені поля}}`. Немає власного session_id/client_id, timestamp, referrer, повного URL чи даних форми. sessionStorage задає сесію **вкладки браузера**, не GA4-сесію і не lifetime first-user attribution.

1. До чинної згоди не читаємо URL UTM, не читаємо marketing storage, нічого не кешуємо в пам’яті/локальному сховищі. Видалення старого запису дозволене без згоди.
2. Після першої чинної згоди читаємо поточний URL та зберігаємо тільки перевірені поля. За наявності збереженої згоди це відбувається при ініціалізації сторінки. Прямий/невідомий перехід теж фіксується — порожнім utm-об’єктом.
3. Запис не перезаписується пізнішим URL чи перезавантаженням. Пошкоджений/застарілий запис стає порожнім; підроблені поля перевіряються повторно та прибираються. Дані повертаються тільки після успішного запису/readback. Якщо sessionStorage заблоковано, attribution відсутня, але GA4 з чинною згодою й замовлення продовжують працювати.
4. Відмова, відкликання, прострочення або втрата згоди очищують запис і зупиняють tracking наявним механізмом PR #8. Події без згоди не буферизуються. Нова явна згода може почати новий consented snapshot з поточного URL; старі події не відновлюються й page_view не дублюється.

**Обмеження:** початковий URL, втрачений до згоди через інший перехід/перезавантаження, не відновлюється: це потребувало б забороненого збереження до згоди. Вкладки зазвичай мають окремі sessionStorage; duplicate/open-with-opener може копіювати початкове сховище, а session restore браузера може його відновити. Немає міжвкладкової власної ідентифікації чи спроб обійти browser privacy. Заблоковане видалення не гарантує стирання старого запису — очистіть site data браузера. URL у browser history і hosting access logs — окремі системи, ця зміна ними не керує.

## GA4 без дублювання attribution-функцій

Використовуємо штатні `campaign_source/medium/name/content/term`, не custom-копії `utm_*` і не `campaign_details`/нову pageview/session подію. Перший consented snapshot додається до наявних `order_click`, `begin_checkout`, `generate_lead` і єдиного `page_view`, щоб перший крок воронки також мав кампанію. Config має порожні campaign-поля (включно з campaign_id), а event scope — лише перевірені значення; фіксований canonical page_location та порожній page_referrer збережено. Так довільні UTM не передаються застосунком через повний URL або незахищений payload. Перевірте реальні vendor requests у браузері: тести використовують mocks, а Google tag/remote settings є зовнішнім кодом.

Google залишається відповідальним за session_start, first_visit, intrinsic engagement, built-in traffic-source dimensions, attribution model і credit allocation. Не створюємо своїх session/user IDs, custom dimensions для копій campaign-полів, Ads conversion events, click-ID store, покупки чи окремий attribution backend. Google Ads підтримується як manual UTM канал; Ads linking/auto-tagging/conversion imports не налаштовуються цією гілкою.

Цей tab-first-touch snapshot не дорівнює «First user source» GA4: він не живе між сесіями/вкладками. Він також не вводить власний 30-хвилинний timeout: GA4 може почати нову GA-сесію в тій самій вкладці, тоді як збережене джерело лишиться. Native reports можуть відрізнятися за scope/model; не називайте цей механізм повною multi-touch attribution системою.

## Воронка в GA4

Потрібен доступ редактора/аналітика до GA4, достатня історія **consented** подій та виконаний account checklist PR #8. Нічого з цих налаштувань не змінено автоматично.

1. Explore → Funnel exploration. Назва: **Mini Printer — Conversion Funnel**. Виберіть потрібний період.
2. Додайте кроки за `event_name`: **Відвідування** = page_view (page_location canonical, hostname production); **CTA** = order_click; **Початок оформлення** = begin_checkout; **Успішна заявка** = generate_lead. Не використовуйте submit click або purchase як успіх.
3. Оберіть **closed funnel**, кроки «is indirectly followed by»: між ними легітимно є view_item/engagement та інші події. Для оперативного аналізу задайте, наприклад, до 30 хв між кроками; це бізнес-вікно аналізу, не власний session timeout. Паралельно корисна **open funnel** для людей, які почали з прямого #order або без CTA. Інакше closed funnel не покаже їхню успішну заявку.
4. Імпортуйте built-in dimensions: Session source / medium, Session campaign; для креативів/ключових слів — відповідні Session manual ad content / term, якщо доступні у вашій property. Використовуйте їх для breakdown/segments або окремого Free form; не реєструйте campaign_* як custom dimensions. Для окремого аналізу CTA використовуйте cta_location (event-scoped custom dimension, уже описана PR #8; створити в Admin → Custom definitions за потреби). Наявність поля у DebugView не гарантує миттєвої готовності всіх report dimensions.
5. `generate_lead` позначте key event (once per event). Заявка — не платіж; value береться зі shared PRODUCT, це заявлена вартість товару, не підтверджений дохід. Не створюйте повторний lead trigger у GA4 за submit або click.
6. Порівнюйте переходи/відсів, completion rate, time to convert та breakdown за каналом. Funnel exploration за замовчуванням рахує користувачів, а не точні заявки/checkout attempts; для кількості заявок дивіться event count generate_lead окремо. Стандартна user-based воронка може охоплювати кілька сесій; для суворо session-level аналізу застосуйте відповідні session segments або окрему перевірену GA4/BigQuery методику. Не додаємо browser IDs, щоб імітувати зв’язування.

Знаменник «Відвідування» означає лише відвідування зі згодою та успішно завантаженим tag. Відмови, блокувальники, збій мережі/завантаження, pre-consent початок форми, прямі #order та повторні заявки пояснюють розбіжності. Порогові обмеження GA4, reporting delay, property scope і retention теж впливають; не порівнюйте цю воронку з усіма HTTP-візитами як із однаковою популяцією.

## Перевірки й ручний QA

Автотести: повний node:test suite, ізольовані Google/Telegram/DOM doubles; без реальних запитів до GA4 або Telegram. Перевіряються всі 5 полів, формати/межі/PII, згода до читання/запису, first-touch/reload/direct markers, blocked storage, валідація збережених значень, відкликання/інші вкладки, native campaign payload, існуюча дедуплікація й один page_view/config.

Результат: **129 тестів пройдено, 0 помилок** (112 попередніх + 17 attribution-тестів); `node scripts/check.mjs` проходить. Команди відповідають npm test/check; запуск напряму через Node через недоступний Windows cmd launcher. Локальний runtime Node 24; package engine залишається 22.x. Браузерні mocks не доводять фактичний стан GA4 property або поведінку зовнішньої бібліотеки.

Браузерна/production GA4 перевірка **не виконана**. Залишається:

- [ ] На контрольованому дозволеному preview hostname (окрема незлита QA-ревізія config, debug=true) перевірити Network та GA4 DebugView/Realtime. Звичайний preview/local навмисно не надсилає у production property. Повернути hostname/debug до review-конфігурації після QA; production env не змінювати.
- [ ] На кожному з 4 прикладів: до згоди zero gtag/collect requests і відсутність marketing sessionStorage; відмова/reload — те саме. Після згоди — рівно один page_view/config, canonical URL без query/hash, правильні campaign_* на page_view і трьох funnel events.
- [ ] Через browser request interception замокати /api/order: confirmed success → один lead; validation/API/network errors → без lead та зі збереженими inputs. Подвійний submit/accepted duplicate → без додаткового lead. Не надсилати реальних Telegram заявок.
- [ ] Змінити URL на іншу кампанію й перезавантажити в тій самій вкладці: початковий snapshot зберігається. Direct first touch лишається порожнім. Нова чиста вкладка може отримати нове джерело; перевірити browser duplicate/opener/session-restore особливості.
- [ ] Відкликання, міжвкладкова відмова, storage blocked та повторна згода: record очищений де можливо; немає нових collect після відмови; немає backfill або дублів. Змішаний URL з валідними UTM й synthetic email/phone/unknown keys: жодних небезпечних значень у Network, включно з vendor auto-параметрами. Підтвердити empty campaign config override в реальній бібліотеці.
- [ ] Перевірити налаштування GA4: Enhanced Measurement вимкнений (особливо history/form/search), немає зайвих/Ads destinations та дубльованих tags, відсутні зайві automatic query/PII події. Побудувати воронку й перевірити built-in campaign dimensions після reporting delay.
- [ ] Регресійна перевірка на mobile/desktop: CTA/scroll/sticky/form/consent, без зміни дизайну. Production verification лише після окремо дозволеного merge/deploy, з датою й доказами. Цей PR не зливається та не розгортається в production агентом.

Офіційні джерела: [GA4 campaign configuration](https://developers.google.com/analytics/devguides/collection/ga4/reference/config), [gtag parameter scope/precedence](https://developers.google.com/tag-platform/gtagjs/reference), [UTM URLs](https://support.google.com/analytics/answer/10917952), [Funnel exploration](https://support.google.com/analytics/answer/9355964), [Traffic-source scopes](https://support.google.com/analytics/answer/11080067).
