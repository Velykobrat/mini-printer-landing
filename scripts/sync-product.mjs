import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { PRODUCT, SAVINGS, DISCOUNT, formatPrice } from '../shared/product.js';
const root = new URL('../', import.meta.url);
const path = new URL('index.html', root);
const original = fs.readFileSync(path, 'utf8');
const values = { current: formatPrice(PRODUCT.price), reference: formatPrice(PRODUCT.referencePrice), savings: formatPrice(SAVINGS), discount: `−${DISCOUNT}%` };
let html = original.replace(/(<(?:strong|del|span)[^>]*data-price="(current|reference|savings|discount)"[^>]*>)[^<]*(<\/(?:strong|del|span)>)/g, (_, open, key, close) => open + values[key] + close);
const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
if (!canonical || new URL(canonical).protocol !== 'https:') throw new Error('Set a valid HTTPS canonical URL.');
const schema = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: PRODUCT.name,
  description: 'Портативний термопринтер для чорно-білого друку фото, нотаток і списків зі смартфона.',
  image: new URL('images/mini-printer-blue.jpg', canonical).href,
  offers: { '@type': 'Offer', url: canonical, price: PRODUCT.price, priceCurrency: PRODUCT.currency } });
html = html.replace(/<!-- product-schema:start -->[\s\S]*?<!-- product-schema:end -->/, `<!-- product-schema:start -->\n    <script type="application/ld+json">${schema}</script>\n    <!-- product-schema:end -->`);
const hash = createHash('sha256').update(schema).digest('base64');
const configPath = new URL('vercel.json', root);
const configOriginal = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configOriginal);
const headers = config.headers.find(entry => entry.source === '/(.*)').headers;
const csp = headers.find(header => header.key === 'Content-Security-Policy');
csp.value = csp.value.replace(/'sha256-[^']+'/, `'sha256-${hash}'`);
const configText = JSON.stringify(config, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (html !== original || configText !== configOriginal) throw new Error('Price/schema/CSP drift. Run npm run sync:product and commit the results.');
} else {
  fs.writeFileSync(path, html);
  fs.writeFileSync(configPath, configText);
}
