// Compatibility wrapper for the existing sales markers.
import { validateProductConfig } from '../shared/product-config-validation.js';
import { replaceOne } from './html.mjs';
import { renderScenarios } from './sections/scenarios.mjs';
import { renderVideo } from './sections/video.mjs';
import { renderDelivery } from './sections/delivery.mjs';
import { renderFaq } from './sections/faq.mjs';
export function renderSales(original, config) {
  validateProductConfig(config);
  const blocks = { experience: renderScenarios(config) + '\n' + renderVideo(config), delivery: renderDelivery(config), faq: renderFaq(config) };
  let html = original;
  for (const [key, markup] of Object.entries(blocks)) {
    const pattern = new RegExp(`<!-- sales-${key}:start -->[\\s\\S]*?<!-- sales-${key}:end -->`);
    html = replaceOne(html, pattern, () => `<!-- sales-${key}:start -->\n${markup}\n<!-- sales-${key}:end -->`);
  }
  return html;
}
