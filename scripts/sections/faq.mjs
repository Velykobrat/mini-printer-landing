import { validateProductConfig } from '../../shared/product-config-validation.js';
import { escapeHTML as escape } from '../html.mjs';

export function renderFaq(config) {
  validateProductConfig(config);
  const SALES = { faq: config.faq };
  return `<section class="section" aria-labelledby="faq-title"><div class="container faq"><div class="section-heading"><p class="eyebrow">${escape(config.copy.faqEyebrow)}</p><h2 id="faq-title">${escape(config.copy.faqTitle)}</h2></div>${SALES.faq.map(([q, a]) => `<details><summary>${escape(q)}</summary><p>${escape(a)}</p></details>`).join('\n')}</div></section>`;
}
