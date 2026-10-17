import { validateProductConfig } from '../../shared/product-config-validation.js';
import { escapeHTML as escape, replaceOne } from '../html.mjs';

export function renderFeatures(original, config) {
  const c = validateProductConfig(config);
  let html = original;
  html = replaceOne(html, /<section class="section features-section"[\s\S]*?<\/section>/, section => {
    section = replaceOne(section, /(<h2>\s*)[^<]*(<br\s*\/?>)[^<]*?(\s*<\/h2>)/,
      (_m, before, middle, after) => before + escape(c.copy.featureHeadingLines[0]) + middle + escape(c.copy.featureHeadingLines[1]) + after);
    let i = 0;
    section = section.replace(/(<h3>)[^<]*(<\/h3>\s*<p>\s*)[^<]*?(\s*<\/p>)/g, (_m, a, b, d) => {
      const item = c.benefits[i++]; if (!item) throw new Error('Feature slot mismatch');
      return a + escape(item.title) + b + escape(item.text) + d;
    });
    if (i !== c.benefits.length) throw new Error('Feature slot mismatch');
    return section;
  });
  return html;
}
