import fs from 'node:fs';
import { PRODUCT_CONFIG } from '../shared/product-config.js';
import { renderProduct } from './product-render.mjs';
const root = new URL('../', import.meta.url);
const path = new URL('index.html', root);
const original = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const { html, hash } = renderProduct(original, PRODUCT_CONFIG);
const configPath = new URL('vercel.json', root);
const configOriginal = fs.readFileSync(configPath, 'utf8').replace(/\r\n/g, '\n');
const config = JSON.parse(configOriginal);
const csp = config.headers.find(entry => entry.source === '/(.*)').headers.find(header => header.key === 'Content-Security-Policy');
if (!/'sha256-[^']+'/.test(csp.value)) throw new Error('Missing Product schema CSP hash');
csp.value = csp.value.replace(/'sha256-[^']+'/, `'sha256-${hash}'`);
const outputs = new Map([[path, html], [configPath, JSON.stringify(config, null, 2) + '\n']]);
const canonical = PRODUCT_CONFIG.seo.canonical;
for (const [name, render] of [
 ['robots.txt', text => text.replace(/^Sitemap: .+$/m, () => 'Sitemap: ' + new URL('sitemap.xml', canonical).href)],
 ['sitemap.xml', text => text.replace(/<loc>[^<]+<\/loc>/, () => '<loc>' + canonical.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</loc>')],
]) { const file = new URL(name, root); outputs.set(file, render(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))); }
for (const [file, text] of outputs) {
 const before = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
 if (process.argv.includes('--check')) { if (before !== text) throw new Error('Product/SEO/CSP drift: ' + file.pathname + '. Run npm run sync:product.'); }
 else fs.writeFileSync(file, text);
}
