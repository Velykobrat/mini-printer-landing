import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.name === '.git' ? [] : entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
for (const file of files(root).filter(file => /\.(?:js|mjs)$/.test(file))) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
const sync = spawnSync(process.execPath, [path.join(root, 'scripts/sync-product.mjs'), '--check'], { encoding: 'utf8' });
assert.equal(sync.status, 0, sync.stderr);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate IDs');
for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(id), `Missing anchor ${id}`);
for (const [, id] of html.matchAll(/aria-describedby="([^"]+)"/g)) for (const value of id.split(' ')) assert(ids.includes(value), `Missing description ${value}`);
for (const [, url] of html.matchAll(/(?:src|href)="(?:\.\/)?([^"#:]+)"/g)) {
  if (!url.startsWith('/api/')) assert(fs.existsSync(path.join(root, url)), `Missing resource ${url}`);
}
for (const file of files(root).filter(file => /\.(?:js|mjs)$/.test(file))) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [, target] of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) assert(fs.existsSync(path.resolve(path.dirname(file), target)), `Missing module ${target}`);
}
assert.equal((html.match(/<h1\b/g) || []).length, 1);
assert.match(html, /<html lang="uk">/);
assert.match(html, /id="order-form"[^>]+action="\/api\/order"/);
assert.match(html, /<script type="module" src="\.\/script.js"><\/script>/);
assert.match(html, /fetchpriority="high" width="630" height="630"/);
assert.match(html, /loading="lazy"[^>]+width="630" height="630"/);
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, 'Unbalanced CSS');
assert.match(css, /prefers-reduced-motion: reduce/);
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert(!pkg.dependencies && !pkg.devDependencies, 'Keep this project dependency-free');
// Match actual token-shaped credentials, not documentation placeholders or env names.
for (const file of files(root).filter(file => /\.(?:js|mjs|html|json|md)$/.test(file))) {
  const text = fs.readFileSync(file, 'utf8');
  assert(!/\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/.test(text), `Possible Telegram secret in ${file}`);
}
console.log('PASS: syntax, price/schema/CSP sync, anchors, descriptions, assets, modules, semantic basics and credential pattern scan.');
