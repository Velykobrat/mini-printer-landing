import { validateProductConfig } from '../../shared/product-config-validation.js';
import { escapeHTML as escape, replaceOne } from '../html.mjs';

export function renderSpecifications(original, config) {
  const c = validateProductConfig(config);
  let html = original;
  html = replaceOne(html, /<dl>[\s\S]*?<\/dl>/, () => `<dl>\n${c.specifications.map(item => `              <div>\n                <dt>${escape(item.label)}</dt>\n                <dd>${escape(item.value)}</dd>\n              </div>`).join('\n\n')}\n            </dl>`);
  return html;
}
