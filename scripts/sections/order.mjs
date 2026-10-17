import { validateProductConfig } from '../../shared/product-config-validation.js';
import { escapeHTML as escape, replaceOne } from '../html.mjs';
import { renderPrices } from './prices.mjs';

export function renderOrder(original, config) {
  const c = validateProductConfig(config);
  const { cta } = c;
  let html = renderPrices(original, c);
  const pair = (pattern, value) => { html = replaceOne(html, pattern, (_m, before, after) => before + escape(value) + after); };
  pair(/(<h2 id="order-title">)[^<]*(<\/h2>)/, cta.orderTitle);
  pair(/(<button class="button button--full" type="submit">\s*)[^<]*?(\s*<\/button>)/, cta.submit);
  return html;
}
