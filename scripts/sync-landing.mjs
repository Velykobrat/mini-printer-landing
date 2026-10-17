import fs from 'node:fs';
import { PRODUCT_CONFIG } from '../shared/product-config.js';
import { renderLanding } from './landing-render.mjs';
import { renderTheme } from './theme-render.mjs';
import { DESIGN_CONFIG } from '../shared/design-config.js';
import { resolveTheme } from '../shared/design-themes.js';
import { replaceOne } from './html.mjs';
export function syncLanding({ check = false } = {}) {
const root = new URL('../', import.meta.url);
const path = new URL('index.html', root);
const template = fs.readFileSync(new URL('templates/page.html', root), 'utf8');
const rendered = renderLanding(template, PRODUCT_CONFIG);
const hash = rendered.hash;
const html = replaceOne(rendered.html, /(<meta name="theme-color" content=")[^"]*(")/, (_m, before, after) => before + resolveTheme(DESIGN_CONFIG).background + after);
const cssPath = new URL('styles.css', root);
const css = renderTheme(fs.readFileSync(new URL('templates/styles.css', root), 'utf8'));
const configPath = new URL('vercel.json', root);
const configOriginal = fs.readFileSync(configPath, 'utf8').replace(/\r\n/g, '\n');
const config = JSON.parse(configOriginal);
const csp = config.headers.find(entry => entry.source === '/(.*)').headers.find(header => header.key === 'Content-Security-Policy');
if (!/'sha256-[^']+'/.test(csp.value)) throw new Error('Missing Product schema CSP hash');
csp.value = csp.value.replace(/'sha256-[^']+'/, `'sha256-${hash}'`);
const outputs = new Map([[path, html], [cssPath, css], [configPath, JSON.stringify(config, null, 2) + '\n']]);
const canonical = PRODUCT_CONFIG.seo.canonical;
for (const [name, render] of [
 ['robots.txt', text => text.replace(/^Sitemap: .+$/m, () => 'Sitemap: ' + new URL('sitemap.xml', canonical).href)],
 ['sitemap.xml', text => text.replace(/<loc>[^<]+<\/loc>/, () => '<loc>' + canonical.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</loc>')],
]) { const file = new URL(name, root); outputs.set(file, render(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))); }
for (const [file, text] of outputs) {
 const before = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
 if (check) { if (before !== text) throw new Error('Product/theme/SEO/CSP drift: ' + file.pathname + '. Run npm run sync:product.'); }
 else fs.writeFileSync(file, text);
}
}
