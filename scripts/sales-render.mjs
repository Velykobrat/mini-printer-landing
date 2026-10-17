import { validateProductConfig, validateMediaPath } from '../shared/product-config-validation.js';
import { escapeHTML as escape } from './html.mjs';
export function renderSales(original, config) {
  validateProductConfig(config);
  const SALES = { ...config.commerce, lifestyles: config.scenarios, video: config.media.video, faq: config.faq };
  const localMedia = value => validateMediaPath(value) || validateMediaPath(value, 'video');
  const card = item => `<article class="sales-card"><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></article>`;
  const delivery = [...SALES.delivery, ...Object.values(SALES.terms)].filter(item => item.status === 'confirmed' && item.text);
  const kitItems = SALES.kit.status === 'confirmed' ? SALES.kit.items.filter(item => item.status === 'confirmed') : [];
  const lifestyles = SALES.lifestyles.map(item => {
    if (!localMedia(item.image)) throw new Error('Use a local image for each scenario.');
    const visual = `<img src="${escape(item.image)}" alt="${escape(item.alt)}" width="${item.width}" height="${item.height}" loading="lazy" decoding="async">`;
    return `<figure class="experience-card">${visual}<figcaption><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></figcaption></figure>`;
  }).join('\n');
  const video = SALES.video;
  if (!localMedia(video.poster)) throw new Error('Use a local product poster.');
  const videoMarkup = video.status === 'confirmed' && localMedia(video.src)
    ? `<video controls playsinline preload="none" poster="${escape(video.poster)}" width="${video.width}" height="${video.height}" aria-label="${escape(config.copy.videoLabel)}" aria-describedby="video-note"><source src="${escape(video.src)}" type="${video.src.endsWith('.webm') ? 'video/webm' : 'video/mp4'}">Ваш браузер не підтримує відео. <a href="${escape(video.src)}">Відкрити відео</a></video><p class="video-note" id="video-note">${escape(config.copy.videoNote)}</p>`
    : `<div class="video-fallback"><img src="${escape(video.poster)}" alt="${escape(config.copy.videoFallbackAlt)}" width="630" height="630" loading="lazy" decoding="async"><p>${escape(config.copy.videoFallbackLines[0])}<br><small>${escape(config.copy.videoFallbackLines[1])}</small></p></div>`;
  const blocks = {
    experience: `<section class="section" id="scenarios" aria-labelledby="experience-title"><div class="container"><div class="section-heading"><p class="eyebrow">${escape(config.copy.scenariosEyebrow)}</p><h2 id="experience-title">${escape(config.copy.scenariosTitle)}</h2></div><div class="experience-grid">${lifestyles}</div></div></section>
<section class="section demo-section" aria-labelledby="demo-title"><div class="container demo-grid"><div class="section-heading"><p class="eyebrow">${escape(config.copy.videoEyebrow)}</p><h2 id="demo-title">${config.copy.videoHeadingLines.map(escape).join('<br>')}</h2></div><div class="video-frame">${videoMarkup}</div></div></section>`,
    delivery: `<section class="section sales-section" id="delivery" aria-labelledby="delivery-title"><div class="container"><div class="section-heading"><p class="eyebrow">${escape(config.copy.deliveryEyebrow)}</p><h2 id="delivery-title">${escape(config.copy.deliveryTitle)}</h2></div><div class="sales-grid">${delivery.map(card).join('\n')}</div><div class="kit-note"><h3>${escape(config.copy.kitTitle)}</h3>${kitItems.length ? `<ul>${kitItems.map(item => `<li>${escape(item.text)}</li>`).join('')}</ul>` : `<p>${escape(SALES.kit.note)}</p>`}<p>${escape(config.copy.kitPaperNote)}</p></div></div></section>`,
    faq: `<section class="section" aria-labelledby="faq-title"><div class="container faq"><div class="section-heading"><p class="eyebrow">${escape(config.copy.faqEyebrow)}</p><h2 id="faq-title">${escape(config.copy.faqTitle)}</h2></div>${SALES.faq.map(([q, a]) => `<details><summary>${escape(q)}</summary><p>${escape(a)}</p></details>`).join('\n')}</div></section>`,
  };
  let html = original;
  for (const [key, markup] of Object.entries(blocks)) {
    const pattern = new RegExp(`<!-- sales-${key}:start -->[\\s\\S]*?<!-- sales-${key}:end -->`);
    if (!pattern.test(html)) throw new Error(`Missing sales slot: ${key}`);
    html = html.replace(pattern, () => `<!-- sales-${key}:start -->\n${markup}\n<!-- sales-${key}:end -->`);
  }
  return html;
}
