import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { PRODUCT_CONFIG } from '../shared/product-config.js';
import { validateProductConfig, validateMediaPath } from '../shared/product-config-validation.js';
import { PRODUCT, SAVINGS, DISCOUNT, formatPrice } from '../shared/product.js';
import { SALES } from '../shared/sales-content.js';
import { renderProduct } from '../scripts/product-render.mjs';
import { renderSales } from '../scripts/sales-render.mjs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const copy = () => structuredClone(PRODUCT_CONFIG);

test('validated deep-frozen configuration backs the existing product and sales exports', () => {
  assert.equal(validateProductConfig(PRODUCT_CONFIG), PRODUCT_CONFIG);
  assert(Object.isFrozen(PRODUCT_CONFIG.commerce.terms.warranty));
  assert.throws(() => { PRODUCT_CONFIG.pricing.price = 1; }, TypeError);
  assert.equal(PRODUCT.price, PRODUCT_CONFIG.pricing.price); assert.equal(PRODUCT.name, PRODUCT_CONFIG.product.name);
  assert.equal(SALES.delivery, PRODUCT_CONFIG.commerce.delivery); assert.equal(SALES.video, PRODUCT_CONFIG.media.video);
  assert.equal(SALES.faq, PRODUCT_CONFIG.faq); assert.equal(SAVINGS, 400); assert.equal(DISCOUNT, 33); assert.equal(formatPrice(800), '800 грн');
});
for (const [label, mutate] of [
  ['missing identity', c => { delete c.product.name; }],
  ['unsafe ID', c => { c.product.id = '<img>'; }],
  ['unsupported mode', c => { c.mode = 'test'; }],
  ['negative price', c => { c.pricing.price = -1; }],
  ['invalid currency', c => { c.pricing.currency = 'грн'; }],
  ['reference below price', c => { c.pricing.referencePrice = 1; }],
  ['ambiguous feature layout', c => { c.benefits.pop(); }],
  ['missing scenario alt', c => { c.scenarios[0].alt = ''; }],
  ['unsafe media dimensions', c => { c.media.video.width = '1280" onload="bad'; }],
  ['unconfirmed status', c => { c.commerce.terms.warranty.status = 'probably'; }],
  ['confirmed kit without entries', c => { c.commerce.kit.status = 'confirmed'; }],
  ['script canonical', c => { c.seo.canonical = 'javascript:alert(1)'; }],
  ['canonical with credentials', c => { c.seo.canonical = 'https://user:secret@example.com/'; }],
  ['invalid FAQ', c => { c.faq[0] = ['Question only']; }],
]) test(`configuration rejects ${label}`, () => {
  const c = copy(); mutate(c); assert.throws(() => validateProductConfig(c));
});

test('media paths reject traversal, external protocols and attributes', () => {
  for (const value of ['../images/a.jpg', './images/../a.jpg', 'https://example.com/a.jpg', './images/a.jpg" onerror="x', './images/a.svg', './images/a.mp4']) assert.equal(validateMediaPath(value), false);
  assert(validateMediaPath('./images/mini-printer-blue.jpg')); assert(validateMediaPath('./images/mini-printer-demo.mp4', 'video'));
});
test('default generation is byte-stable, idempotent and independent of generation order', () => {
  const first = renderProduct(renderSales(html, PRODUCT_CONFIG), PRODUCT_CONFIG);
  assert.equal(first.html, html);
  assert.equal(renderSales(renderProduct(html, PRODUCT_CONFIG).html, PRODUCT_CONFIG), html);
  assert.deepEqual(renderProduct(renderSales(first.html, PRODUCT_CONFIG), PRODUCT_CONFIG), first);
  const csp = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')).headers[0].headers.find(item => item.key === 'Content-Security-Policy').value;
  assert(csp.includes(`'sha256-${first.hash}'`));
});
test('configured price/currency, product identity and SEO agree in static HTML and JSON-LD', () => {
  const c = copy(); c.product.name = 'Example Product'; c.product.analyticsId = 'example_product';
  c.pricing.price = 900; c.pricing.referencePrice = 1500;
  c.seo.canonical = 'https://example.com/product/'; c.seo.title = 'Example & Product';
  const out = renderProduct(html, c); const schema = JSON.parse(out.schema);
  assert.equal(schema.name, c.product.name); assert.equal(schema.offers.price, c.pricing.price);
  assert.equal(schema.offers.priceCurrency, c.pricing.currency); assert.equal(schema.offers.url, c.seo.canonical);
  assert.equal(schema.image, 'https://example.com/product/images/mini-printer-blue.jpg');
  assert.match(out.html, /<title>Example &amp; Product<\/title>/);
  for (const [, value] of out.html.matchAll(/data-price="current"[^>]*>([^<]+)/g)) assert.equal(value, '900 грн');
  assert.equal(out.hash, createHash('sha256').update(out.schema).digest('base64'));
  assert.match(out.html, /action="\/api\/order"/);
  assert.deepEqual([...out.html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]), [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
});
test('all text contexts escape HTML, quotes and replacement tokens; JSON-LD cannot close its script', () => {
  const c = copy(); const attack = '</script><img src=x onerror="bad"> & $& $` $\' "';
  c.product.name = attack; c.product.description = attack; c.product.shortDescription = attack;
  c.copy.heroLines[0] = attack; c.cta.hero = attack; c.seo.title = attack; c.seo.imageAlt = attack;
  c.benefits[0].text = attack; c.specifications[0].value = attack;
  c.scenarios[0].title = attack; c.scenarios[0].alt = attack; c.faq[0] = [attack, attack]; c.copy.videoLabel = attack;
  const out = renderProduct(renderSales(html, c), c);
  assert(!out.html.includes(attack)); assert(!out.schema.includes('</script>'));
  assert(out.html.includes('&lt;/script&gt;&lt;img src=x onerror=&quot;bad&quot;&gt;'));
  assert(out.html.includes('$&amp; $` $&#39;'));
  assert.equal(JSON.parse(out.schema).name, attack);
  assert.equal((out.html.match(/<script\b/g) || []).length, (html.match(/<script\b/g) || []).length);
  assert.equal((out.html.match(/id="delivery"/g) || []).length, 1);
});
test('pending facts stay unpublished even if supplied text exists; confirmed text is escaped', () => {
  const c = copy(); c.commerce.terms.warranty.text = 'PENDING PROMISE'; c.commerce.kit.items = [{ status: 'pending', text: 'PENDING KIT' }];
  let out = renderSales(html, c); assert(!out.includes('PENDING PROMISE')); assert(!out.includes('PENDING KIT'));
  c.commerce.terms.warranty.status = 'confirmed'; c.commerce.terms.warranty.text = '<b>Reviewed</b>';
  out = renderSales(html, c); assert(out.includes('&lt;b&gt;Reviewed&lt;/b&gt;')); assert(!out.includes('<b>Reviewed</b>'));
});
test('pending video uses the existing accessible poster fallback without loading a video', () => {
  const c = copy(); c.media.video.status = 'pending'; c.media.video.src = '';
  const out = renderSales(html, c); assert(!out.includes('<video')); assert(out.includes('Відеодемонстрація готується.'));
  assert(out.includes('class="video-fallback"')); assert(out.includes('loading="lazy"'));
});
test('missing or duplicated owned slots fail generation instead of silently drifting', () => {
  assert.throws(() => renderProduct(html.replace('<title>', '<!-- removed title -->'), PRODUCT_CONFIG), /slot/);
  assert.throws(() => renderProduct(html.replace('</head>', '<title>Duplicate</title></head>'), PRODUCT_CONFIG), /slot/);
  assert.throws(() => renderSales(html.replace('<!-- sales-faq:start -->', ''), PRODUCT_CONFIG), /slot/);
});
