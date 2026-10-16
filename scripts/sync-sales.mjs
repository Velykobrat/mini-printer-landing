import fs from 'node:fs';
import { SALES } from '../shared/sales-content.js';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const localMedia = value => typeof value === 'string' && /^\.\/images\/[a-zA-Z0-9/_-]+\.(?:jpg|jpeg|webp|avif|mp4|webm)$/.test(value);
const card = item => `<article class="sales-card"><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></article>`;
const delivery = [...SALES.delivery, ...Object.values(SALES.terms)].filter(item => item.status === 'confirmed' && item.text);
const kitItems = SALES.kit.status === 'confirmed' ? SALES.kit.items.filter(item => item.status === 'confirmed') : [];
const lifestyles = SALES.lifestyles.map(item => {
  if (!localMedia(item.image)) throw new Error('Use a local image for each scenario.');
  const visual = `<img src="${escape(item.image)}" alt="${escape(item.alt)}" width="630" height="630" loading="lazy" decoding="async">`;
  return `<figure class="experience-card">${visual}<figcaption><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></figcaption></figure>`;
}).join('\n');
const video = SALES.video;
if (!localMedia(video.poster)) throw new Error('Use a local product poster.');
const videoMarkup = video.status === 'confirmed' && localMedia(video.src)
  ? `<video controls playsinline preload="none" poster="${escape(video.poster)}" width="${video.width}" height="${video.height}" aria-label="Підключення Mini Printer зі смартфона та приклади друку" aria-describedby="video-note"><source src="${escape(video.src)}" type="${video.src.endsWith('.webm') ? 'video/webm' : 'video/mp4'}">Ваш браузер не підтримує відео. <a href="${escape(video.src)}">Відкрити відео</a></video><p class="video-note" id="video-note">Термодрук для фото й нотаток. У відео представлені різні кольори принтера — доступний варіант уточнюйте під час замовлення. Для створення наліпок використовуйте самоклейний термопапір.</p>`
  : `<div class="video-fallback"><img src="${escape(video.poster)}" alt="Блакитний Mini Printer — фото товару, не кадр відео" width="630" height="630" loading="lazy" decoding="async"><p>Відеодемонстрація готується.<br><small>Поки що — фото нашого Mini Printer.</small></p></div>`;
const blocks = {
  experience: `<section class="section" id="scenarios" aria-labelledby="experience-title"><div class="container"><div class="section-heading"><p class="eyebrow">ІДЕЇ НА ЩОДЕНЬ</p><h2 id="experience-title">З екрана — у твоє життя.</h2></div><div class="experience-grid">${lifestyles}</div></div></section>
<section class="section demo-section" aria-labelledby="demo-title"><div class="container demo-grid"><div class="section-heading"><p class="eyebrow">ВІДЕООГЛЯД</p><h2 id="demo-title">Mini Printer.<br>Маленький принтер.</h2></div><div class="video-frame">${videoMarkup}</div></div></section>`,
  delivery: `<section class="section sales-section" id="delivery" aria-labelledby="delivery-title"><div class="container"><div class="section-heading"><p class="eyebrow">ПЕРЕД ЗАМОВЛЕННЯМ</p><h2 id="delivery-title">Доставка та оплата</h2></div><div class="sales-grid">${delivery.map(card).join('\n')}</div><div class="kit-note"><h3>Що входить у комплект</h3>${kitItems.length ? `<ul>${kitItems.map(item => `<li>${escape(item.text)}</li>`).join('')}</ul>` : `<p>${escape(SALES.kit.note)}</p>`}<p>Звичайний термопапір — для фото й нотаток. Самоклейний має клейкий шар і потрібен для наліпок; його наявність у комплекті уточнюйте окремо.</p></div></div></section>`,
  faq: `<section class="section" aria-labelledby="faq-title"><div class="container faq"><div class="section-heading"><p class="eyebrow">ЩЕ КІЛЬКА ДЕТАЛЕЙ</p><h2 id="faq-title">Питання перед покупкою</h2></div>${SALES.faq.map(([q, a]) => `<details><summary>${escape(q)}</summary><p>${escape(a)}</p></details>`).join('\n')}</div></section>`,
};
const path = new URL('../index.html', import.meta.url);
const original = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
let html = original;
for (const [key, markup] of Object.entries(blocks)) {
  const pattern = new RegExp(`<!-- sales-${key}:start -->[\\s\\S]*?<!-- sales-${key}:end -->`);
  if (!pattern.test(html)) throw new Error(`Missing sales slot: ${key}`);
  html = html.replace(pattern, `<!-- sales-${key}:start -->\n${markup}\n<!-- sales-${key}:end -->`);
}
if (process.argv.includes('--check')) {
  if (html !== original) throw new Error('Sales content drift. Run npm run sync:sales.');
} else fs.writeFileSync(path, html);
