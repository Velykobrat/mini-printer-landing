import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { PRODUCT, formatPrice } from '../shared/product.js';
const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const html = read('index.html'); const css = read('styles.css');
test('static price slots agree with server config and Product schema', () => {
  const slots = [...html.matchAll(/data-price="current"[^>]*>([^<]+)</g)]; assert.equal(slots.length, 6);
  for (const [, value] of slots) assert.equal(value, formatPrice(PRODUCT.price));
  const schema = JSON.parse(/<script type="application\/ld\+json">([^<]+)<\/script>/.exec(html)[1]);
  assert.equal(schema.offers.price, PRODUCT.price); assert.equal(schema.offers.priceCurrency, PRODUCT.currency);
  assert.equal(schema.aggregateRating, undefined); assert.equal(schema.offers.availability, undefined);
});
test('canonical, sitemap and social preview refer to the real page', () => {
  const canonical = /rel="canonical" href="([^"]+)"/.exec(html)[1];
  assert(read('sitemap.xml').includes(`<loc>${canonical}</loc>`));
  assert(html.includes(`property="og:url" content="${canonical}"`));
  assert(read('robots.txt').includes(new URL('sitemap.xml', canonical).href));
  assert(html.includes(new URL('images/mini-printer-blue.jpg', canonical).href));
});
test('CSP hash matches schema and does not allow inline handlers', () => {
  const json = /<script type="application\/ld\+json">([^<]+)<\/script>/.exec(html)[1];
  const csp = JSON.parse(read('vercel.json')).headers[0].headers.find(h => h.key === 'Content-Security-Policy').value;
  assert(csp.includes(`'sha256-${createHash('sha256').update(json).digest('base64')}'`));
  assert(!csp.includes('unsafe-inline')); assert.doesNotMatch(html, /\son\w+=/);
});
function luminance(hex) {
  const values = hex.match(/[0-9a-f]{2}/gi).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
}
for (const [foreground, background] of [['60615c','fbf9f2'],['ffffff','2b4cde'],['1b1c18','ff5c36'],['ad371a','ffebe3'],['b42318','ffffff'],['237a45','ffffff']]) {
  test(`text contrast ${foreground}/${background} meets 4.5:1`, () => {
    const a = luminance(foreground), b = luminance(background);
    assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05) >= 4.5);
  });
}
test('design tokens and responsive safeguards are retained (static, not browser QA)', () => {
  assert.match(css, /--background: #fbf9f2/); assert.match(css, /--accent: #2b4cde/);
  assert.match(css, /--mint-surface: #eaf0ee/); assert.match(css, /minmax\(0, 1fr\)/);
  assert.match(css, /--touch-target: 44px/); assert.match(css, /font-size: var\(--body-size\)/);
  assert.match(css, /safe-area-inset-bottom/); assert.match(css, /\.mobile-order\.is-hidden/);
  assert.equal((css.match(/:root\s*{/g) || []).length, 1);
  assert.doesNotMatch(css, /\.gallery|\.feature--large|\.eyebrow--light|\.section--media/);
});
