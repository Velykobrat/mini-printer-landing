import { createHash } from 'node:crypto';
import { validateProductConfig } from '../shared/product-config-validation.js';
import { escapeHTML as escape, serializeJSONLD, replaceOne } from './html.mjs';
import { renderPrices } from './sections/prices.mjs';

export function renderDocument(original, config) {
  const c = validateProductConfig(config);
  const { product: p, pricing, seo, cta } = c;
  let html = original.replace(/\r\n/g, '\n');
  const pair = (pattern, value) => { html = replaceOne(html, pattern, (_m, before, after) => before + escape(value) + after); };
  html = renderPrices(html, c);
  for (const key of ['current', 'reference', 'savings', 'discount']) {
    if (!html.includes(`data-price="${key}"`)) throw new Error(`Missing price slot: ${key}`);
  }
  pair(/(<title>)[^<]*(<\/title>)/, seo.title);
  pair(/(<meta\s+name="description"\s+content=")[^"]*(")/, seo.description);
  pair(/(<link rel="canonical" href=")[^"]*(")/, seo.canonical);
  const socialImage = new URL(seo.image, seo.canonical).href;
  const meta = { 'og:url': seo.canonical, 'og:image': socialImage, 'twitter:image': socialImage,
    'og:title': seo.title, 'twitter:title': seo.title, 'og:description': seo.socialDescription,
    'twitter:description': seo.socialDescription, 'og:image:width': seo.imageWidth, 'og:image:height': seo.imageHeight, 'og:image:alt': seo.imageAlt };
  for (const [key, value] of Object.entries(meta)) pair(new RegExp(`(<meta\\s+(?:name|property)="${key}"\\s+content=")[^"]*(")`), value);
  pair(/(<a class="logo" href="#top">)[^<]*(<\/a>)/, p.name);
  pair(/(<span class="footer-brand">)[^<]*(<\/span>)/, p.name);
  pair(/(<aside class="mobile-order[^>]*><div><small>)[^<]*(<\/small>)/, p.name);
  pair(/(<div class="header-pricing" aria-label=")[^"]*(")/, `Ціна ${p.name}`);
  pair(/(<a class="button button--small header-order"[^>]*>\s*)[^<]*?(\s*<span)/, cta.header);
  pair(/(<a class="button" href="#order" data-cta-location="sticky_bar">)[^<]*(<\/a>)/, cta.sticky);
  const schema = serializeJSONLD({ '@context': 'https://schema.org', '@type': 'Product', name: p.name,
    description: p.description, image: new URL(c.media.hero.src, seo.canonical).href,
    offers: { '@type': 'Offer', url: seo.canonical, price: pricing.price, priceCurrency: pricing.currency } });
  html = replaceOne(html, /<!-- product-schema:start -->[\s\S]*?<!-- product-schema:end -->/,
    () => `<!-- product-schema:start -->\n    <script type="application/ld+json">${schema}</script>\n    <!-- product-schema:end -->`);
  return { html, schema, hash: createHash('sha256').update(schema).digest('base64') };
}
