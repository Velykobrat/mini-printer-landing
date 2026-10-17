import { validateProductConfig, validateMediaPath } from '../../shared/product-config-validation.js';
import { escapeHTML as escape } from '../html.mjs';

export function renderScenarios(config) {
  validateProductConfig(config);
  const SALES = { ...config.commerce, lifestyles: config.scenarios, video: config.media.video, faq: config.faq };
  const localMedia = value => validateMediaPath(value) || validateMediaPath(value, 'video');
  const lifestyles = SALES.lifestyles.map(item => {
    if (!localMedia(item.image)) throw new Error('Use a local image for each scenario.');
    const visual = `<img src="${escape(item.image)}" alt="${escape(item.alt)}" width="${item.width}" height="${item.height}" loading="lazy" decoding="async">`;
    return `<figure class="experience-card">${visual}<figcaption><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></figcaption></figure>`;
  }).join('\n');
  return `<section class="section" id="scenarios" aria-labelledby="experience-title"><div class="container"><div class="section-heading"><p class="eyebrow">${escape(config.copy.scenariosEyebrow)}</p><h2 id="experience-title">${escape(config.copy.scenariosTitle)}</h2></div><div class="experience-grid">${lifestyles}</div></div></section>`;
}
