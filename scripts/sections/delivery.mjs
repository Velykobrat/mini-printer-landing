import { validateProductConfig } from '../../shared/product-config-validation.js';
import { escapeHTML as escape } from '../html.mjs';

export function renderDelivery(config) {
  validateProductConfig(config);
  const SALES = config.commerce;
  const card = item => `<article class="sales-card"><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></article>`;
  const delivery = [...SALES.delivery, ...Object.values(SALES.terms)].filter(item => item.status === 'confirmed' && item.text);
  const kitItems = SALES.kit.status === 'confirmed' ? SALES.kit.items.filter(item => item.status === 'confirmed') : [];
  return `<section class="section sales-section" id="delivery" aria-labelledby="delivery-title"><div class="container"><div class="section-heading"><p class="eyebrow">${escape(config.copy.deliveryEyebrow)}</p><h2 id="delivery-title">${escape(config.copy.deliveryTitle)}</h2></div><div class="sales-grid">${delivery.map(card).join('\n')}</div><div class="kit-note"><h3>${escape(config.copy.kitTitle)}</h3>${kitItems.length ? `<ul>${kitItems.map(item => `<li>${escape(item.text)}</li>`).join('')}</ul>` : `<p>${escape(SALES.kit.note)}</p>`}<p>${escape(config.copy.kitPaperNote)}</p></div></div></section>`;
}
