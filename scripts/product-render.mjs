import { createHash } from 'node:crypto';
import { validateProductConfig } from '../shared/product-config-validation.js';
import { escapeHTML as escape, serializeJSONLD, replaceOne } from './html.mjs';

export function renderProduct(original, config) {
  const c = validateProductConfig(config);
  const { product: p, pricing, seo, cta } = c;
  let html = original.replace(/\r\n/g, '\n');
  const pair = (pattern, value) => { html = replaceOne(html, pattern, (_m, before, after) => before + escape(value) + after); };
  const amount = value => `${new Intl.NumberFormat('uk-UA').format(value)} ${pricing.currencyLabel}`;
  const savings = pricing.referencePrice - pricing.price;
  const values = { current: amount(pricing.price), reference: amount(pricing.referencePrice), savings: amount(savings), discount: `−${Math.round(savings / pricing.referencePrice * 100)}%` };
  html = html.replace(/(<(?:strong|del|span)[^>]*data-price="(current|reference|savings|discount)"[^>]*>)[^<]*(<\/(?:strong|del|span)>)/g, (_m, open, key, close) => open + escape(values[key]) + close);
  for (const key of Object.keys(values)) if (!html.includes(`data-price="${key}"`)) throw new Error(`Missing price slot: ${key}`);
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
  html = replaceOne(html, /(<h1>\s*)[^<]+(<br\s*\/?>\s*<span>)[^<]*(<\/span>)/,
    (_m, before, middle, after) => before + escape(c.copy.heroLines[0]) + middle + escape(c.copy.heroLines[1]) + after);
  pair(/(<p class="hero__description">\s*)[^<]*?(\s*<\/p>)/, p.shortDescription);
  html = replaceOne(html, /<div class="product-card">\s*<img[^>]+>/, image => {
    for (const [key, value] of Object.entries({ src: c.media.hero.src, alt: c.media.hero.alt, width: c.media.hero.width, height: c.media.hero.height })) image = image.replace(new RegExp(`${key}="[^"]*"`), () => `${key}="${escape(value)}"`);
    return image;
  });
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
  html = replaceOne(html, /<dl>[\s\S]*?<\/dl>/, () => `<dl>\n${c.specifications.map(item => `              <div>\n                <dt>${escape(item.label)}</dt>\n                <dd>${escape(item.value)}</dd>\n              </div>`).join('\n\n')}\n            </dl>`);
  pair(/(<a class="button button--small header-order"[^>]*>\s*)[^<]*?(\s*<span)/, cta.header);
  pair(/(<a class="button" href="#order" data-cta-location="hero">)[^<]*?(\s*<span)/, cta.hero);
  pair(/(<a class="text-link" href="#scenarios">\s*)[^<]*?(\s*<\/a>)/, cta.secondary);
  pair(/(<h2 id="order-title">)[^<]*(<\/h2>)/, cta.orderTitle);
  pair(/(<button class="button button--full" type="submit">\s*)[^<]*?(\s*<\/button>)/, cta.submit);
  pair(/(<a class="button" href="#order" data-cta-location="sticky_bar">)[^<]*(<\/a>)/, cta.sticky);
  const schema = serializeJSONLD({ '@context': 'https://schema.org', '@type': 'Product', name: p.name,
    description: p.description, image: new URL(c.media.hero.src, seo.canonical).href,
    offers: { '@type': 'Offer', url: seo.canonical, price: pricing.price, priceCurrency: pricing.currency } });
  html = replaceOne(html, /<!-- product-schema:start -->[\s\S]*?<!-- product-schema:end -->/,
    () => `<!-- product-schema:start -->\n    <script type="application/ld+json">${schema}</script>\n    <!-- product-schema:end -->`);
  return { html, schema, hash: createHash('sha256').update(schema).digest('base64') };
}
