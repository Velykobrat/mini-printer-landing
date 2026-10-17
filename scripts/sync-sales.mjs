import fs from 'node:fs';
import { PRODUCT_CONFIG } from '../shared/product-config.js';
import { renderSales } from './sales-render.mjs';
const path = new URL('../index.html', import.meta.url);
const original = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const html = renderSales(original, PRODUCT_CONFIG);
if (process.argv.includes('--check')) {
  if (html !== original) throw new Error('Sales content drift. Run npm run sync:sales.');
} else fs.writeFileSync(path, html);
