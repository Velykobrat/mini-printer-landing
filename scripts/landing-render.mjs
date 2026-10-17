import { validateSections, SECTION_IDS } from '../shared/section-config.js';
import { renderProduct } from './product-render.mjs';
import { renderSales } from './sales-render.mjs';
import { replaceOne, escapeHTML } from './html.mjs';

// These are approved template slots, never selectors/module paths supplied by config.
const opening = {
  hero: /class="hero"/,
  features: /id="features"/,
  scenarios: /id="scenarios"/,
  video: /aria-labelledby="demo-title"/,
  specifications: /id="specs"/,
  delivery: /id="delivery"/,
  faq: /aria-labelledby="faq-title"/,
  order: /id="order"/,
};

export function assertPageIntegrity(html) {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  if (ids.length !== new Set(ids).size) throw new Error('Duplicate generated DOM id');
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) if (!ids.includes(id)) throw new Error(`Missing anchor target: ${id}`);
  for (const [, refs] of html.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g)) {
    for (const id of refs.split(/\s+/)) if (!ids.includes(id)) throw new Error(`Missing accessible reference: ${id}`);
  }
  if ((html.match(/<h1\b/g) || []).length !== 1) throw new Error('Expected exactly one accessible page heading');
}

export function renderLanding(template, config) {
  const ordered = validateSections(config.sections);
  // Each existing content facade delegates to independent section modules.
  // Start from the canonical template so disabled sections can always be restored.
  const out = renderProduct(renderSales(template.replace(/\r\n/g, '\n'), config), config);
  const enabled = new Set(ordered.filter(item => item.enabled).map(item => item.id));
  const normalOrder = ordered.every((item, i) => item.enabled && item.id === SECTION_IDS[i]);
  if (!normalOrder) {
    out.html = replaceOne(out.html, /(<main id="top" tabindex="-1">)([\s\S]*?)(<\/main>)/, (_m, before, body, after) => {
      const found = new Map(); let reviews = '';
      for (const [section] of body.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g)) {
        const tag = section.slice(0, section.indexOf('>') + 1);
        const id = SECTION_IDS.find(key => opening[key].test(tag));
        if (id) { if (found.has(id)) throw new Error(`Duplicate section: ${id}`); found.set(id, section); }
        else if (/id="reviews"/.test(tag) && !reviews) reviews = section;
        else throw new Error('Unknown or duplicate template section');
      }
      if (found.size !== SECTION_IDS.length || !reviews) throw new Error('Missing canonical section');
      const chunks = [];
      if (!enabled.has('hero')) chunks.push(`<h1 class="visually-hidden">${escapeHTML(config.product.name)}</h1>`);
      for (const item of ordered) {
        if (!item.enabled) continue;
        if (item.id === 'order') { chunks.push(reviews); reviews = ''; }
        chunks.push(found.get(item.id));
      }
      if (reviews) chunks.push(reviews); // Existing independent review shell remains available.
      return before + '\n\n' + chunks.join('\n\n') + '\n\n' + after;
    });
  }
  if (!enabled.has('hero') || !enabled.has('order')) {
    out.html = out.html.replace(/<aside class="mobile-order[^>]*>[\s\S]*?<\/aside>/, '');
  }
  const ids = new Set([...out.html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  // Remove the action itself, rather than leaving dead/fake-disabled links.
  out.html = out.html.replace(/<a\b[^>]*href="#([^"]+)"[^>]*>[\s\S]*?<\/a>/g, (link, id) => ids.has(id) ? link : '');
  out.html = out.html.replace(/<nav class="nav"[\s\S]*?<\/nav>/, nav => {
    const count = (nav.match(/<a\b/g) || []).length;
    if (!count) return '';
    return count === 1 ? nav.replace(/<span aria-hidden="true">·<\/span>/, '') : nav;
  });
  out.html = out.html.replace(/<div class="hero__actions">\s*<\/div>/, '');
  assertPageIntegrity(out.html);
  return out;
}
