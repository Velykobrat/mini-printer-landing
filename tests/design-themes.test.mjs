import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DESIGN_CONFIG } from '../shared/design-config.js';
import { DESIGN_THEMES, THEME_SCHEMA, resolveTheme, validateTheme } from '../shared/design-themes.js';
import { renderTheme, renderThemeTokens } from '../scripts/theme-render.mjs';
import { PRODUCT_CONFIG } from '../shared/product-config.js';
import { renderLanding } from '../scripts/landing-render.mjs';
const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const template = read('templates/styles.css');
const tokens = () => structuredClone(DESIGN_THEMES['pocket-studio']);

test('only pocket-studio is registered, deeply immutable and independently selected', () => {
  assert.deepEqual(Object.keys(DESIGN_THEMES), ['pocket-studio']);
  assert.equal(resolveTheme(DESIGN_CONFIG), DESIGN_THEMES['pocket-studio']);
  assert(Object.isFrozen(DESIGN_CONFIG)); assert(Object.isFrozen(resolveTheme(DESIGN_CONFIG)));
  assert(Object.isFrozen(THEME_SCHEMA['hero-size'].values));
  for (const file of ['shared/design-config.js', 'shared/design-themes.js', 'scripts/theme-render.mjs']) {
    assert.doesNotMatch(read(file), /from ['"][^'"]*(?:product|section)/);
  }
});
for (const selection of [null, {}, { theme: 'minimal' }, { theme: 'editorial' }, { theme: '__proto__' }, { theme: '../x' }, { theme: '<style>' }, { theme: 'pocket-studio', css: 'body{}' }]) {
  test('invalid theme selection fails closed: ' + JSON.stringify(selection), () => assert.throws(() => resolveTheme(selection), /Invalid design theme/));
}
for (const [key, value] of [
  ['background', '#12'], ['background', 'red'], ['background', '#FFFFFF'],
  ['background', '#fff; color:red'], ['background', '</style><script>x</script>'],
  ['background', 'url(https://example.com)'], ['background', 'var(--text)'],
  ['container', '1160rem'], ['container', 'calc(100vw)'], ['container', '-1px'],
  ['container', '2001px'], ['container', 'Infinitypx'], ['container', 1160],
  ['container', '1px\n'], ['container', '1e3px'], ['body-size', 'NaNpx'],
  ['font-family', 'x; background:url(x)'], ['hero-size', 'clamp(30px, 2vw, 20px)'], ['background', '#fff\n'], ['hero-size', 'clamp(20px, 2vw, 40px);body{}'],
  ['card-heading-tracking', '-.5em'], ['pill', null],
]) test(`theme rejects unsafe/invalid ${key}: ${JSON.stringify(value)}`, () => {
  const t = tokens(); t[key] = value; assert.throws(() => renderThemeTokens(t), /Invalid design theme/);
});
test('token schema rejects missing/extra keys and inherited token objects', () => {
  const missing = tokens(); delete missing.accent;
  for (const t of [missing, { ...tokens(), arbitrary: 'x' }, Object.create(tokens()), null]) assert.throws(() => validateTheme(t));
});
test('safe values serialize deterministically in schema order without mutating inputs', () => {
  const t = tokens(); t.background = '#abc'; t.container = '1200px'; t['hero-size'] = 'clamp(40px, 5vw, 70px)'; t['font-family'] = 'system-ui, sans-serif';
  const before = JSON.stringify(t); const reversed = Object.fromEntries(Object.entries(t).reverse());
  assert.equal(renderThemeTokens(t), renderThemeTokens(reversed)); assert.equal(JSON.stringify(t), before);
  assert.equal(renderTheme(template), renderTheme(template)); assert.equal(renderTheme(template), read('styles.css'));
  assert.throws(() => renderTheme(''), /slot/); assert.throws(() => renderTheme(template + '/* design-tokens */'), /slot/);
});
test('default CSS preserves every v2.4 declaration, selector, media query and motion rule after token substitution (static proof)', () => {
  const baseline = read('tests/fixtures/pocket-studio-v2.4.css'); const generated = renderTheme(template);
  const rootTokens = css => Object.fromEntries([...css.match(/:root \{([\s\S]*?)\n\}/)[1].matchAll(/--([\w-]+): ([^;]+);/g)].map(m => [m[1], m[2]]));
  const old = rootTokens(baseline); const current = rootTokens(generated);
  for (const [key, value] of Object.entries(old)) assert.equal(current[key], value, key);
  const resolve = css => {
    const values = rootTokens(css);
    let body = css.replace(/:root \{[\s\S]*?\n\}/, '');
    for (let i = 0; i < 5; i++) body = body.replace(/var\(--([\w-]+)\)/g, (match, key) => values[key] ?? match);
    return body;
  };
  assert.equal(resolve(generated), resolve(baseline));
});
test('static HTML and theme color agree; product/section changes do not change CSS or font/CSP loading', () => {
  const page = read('templates/page.html'); const css = renderTheme(template);
  assert.equal(renderLanding(page, PRODUCT_CONFIG).html, read('index.html'));
  assert(read('index.html').includes('name="theme-color" content="' + resolveTheme(DESIGN_CONFIG).background + '"'));
  const config = structuredClone(PRODUCT_CONFIG); config.product.name = 'Other name'; config.sections.forEach(s => { s.enabled = false; });
  renderLanding(page, config); assert.equal(renderTheme(template), css);
  assert(read('index.html').includes('href="styles.css"')); assert(read('index.html').includes('fonts.googleapis.com'));
  for (const [, token] of css.matchAll(/var\(--([\w-]+)/g)) assert(css.includes('--' + token + ':'), token);
});
test('CLI catches CSS/theme-color drift and restores static outputs, without altering product HTML or CSP', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'landing-themes-'));
  try {
    const root = new URL('../', import.meta.url);
    for (const item of ['scripts', 'shared', 'templates']) fs.cpSync(new URL(item, root), path.join(dir, item), { recursive: true });
    for (const item of ['package.json', 'index.html', 'styles.css', 'vercel.json', 'robots.txt', 'sitemap.xml']) fs.copyFileSync(new URL(item, root), path.join(dir, item));
    const run = (...args) => spawnSync(process.execPath, [path.join(dir, 'scripts/sync-product.mjs'), ...args], { encoding: 'utf8' });
    assert.equal(run('--check').status, 0);
    const original = fs.readFileSync(path.join(dir, 'index.html'), 'utf8'); const csp = fs.readFileSync(path.join(dir, 'vercel.json'), 'utf8');
    fs.appendFileSync(path.join(dir, 'styles.css'), '\n/* drift */'); assert.notEqual(run('--check').status, 0);
    assert.equal(run().status, 0); assert.equal(fs.readFileSync(path.join(dir, 'styles.css'), 'utf8'), renderTheme(template));
    fs.writeFileSync(path.join(dir, 'index.html'), original.replace('name="theme-color" content="#fbf9f2"', 'name="theme-color" content="#fff"'));
    assert.notEqual(run('--check').status, 0); assert.equal(run().status, 0);
    assert.equal(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), original);
    assert.equal(fs.readFileSync(path.join(dir, 'vercel.json'), 'utf8'), csp);
    fs.writeFileSync(path.join(dir, 'shared/design-config.js'), "export const DESIGN_CONFIG = { theme: 'unknown' };\n");
    const failed = run(); assert.notEqual(failed.status, 0); assert.match(failed.stderr, /Invalid design theme/);
    assert.equal(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), original);
  } finally {
    assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'landing-themes-'));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
