import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PRODUCT_CONFIG } from '../shared/product-config.js';
import { SECTION_IDS, DEFAULT_SECTIONS, validateSections } from '../shared/section-config.js';
import { renderLanding, assertPageIntegrity } from '../scripts/landing-render.mjs';
import { initOrderForm, initOrderNavigation, initStickyOrder } from '../script.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const template = fs.readFileSync(path.join(root, 'templates/page.html'), 'utf8').replace(/\r\n/g, '\n');
const published = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const copy = () => structuredClone(PRODUCT_CONFIG);
const sectionKey = tag => {
  if (/class="hero"/.test(tag)) return 'hero';
  if (/id="features"/.test(tag)) return 'features';
  if (/id="scenarios"/.test(tag)) return 'scenarios';
  if (/aria-labelledby="demo-title"/.test(tag)) return 'video';
  if (/id="specs"/.test(tag)) return 'specifications';
  if (/id="delivery"/.test(tag)) return 'delivery';
  if (/aria-labelledby="faq-title"/.test(tag)) return 'faq';
  if (/id="order"/.test(tag)) return 'order';
};
const actualOrder = html => [...html.matchAll(/<section\b[^>]*>/g)].map(m => sectionKey(m[0])).filter(Boolean);

test('default section config retains v2.3 DOM/content and canonical static HTML and pure repeatability', () => {
  assert.deepEqual(PRODUCT_CONFIG.sections, DEFAULT_SECTIONS);
  assert(Object.isFrozen(PRODUCT_CONFIG.sections[0]));
  const first = renderLanding(template, PRODUCT_CONFIG);
  assert.equal(first.html, published); assert.equal(first.html, template);
  assert.deepEqual(renderLanding(template, PRODUCT_CONFIG), first);
  assert.deepEqual(actualOrder(first.html), SECTION_IDS);
});
for (const [label, change] of [
  ['duplicate id', c => { c.sections[1].id = 'hero'; }],
  ['duplicate order', c => { c.sections[1].order = 10; }],
  ['missing section', c => { c.sections.pop(); }],
  ['extra section', c => { c.sections.push({ id: 'extra', enabled: true, order: 90 }); }],
  ['unknown id', c => { c.sections[0].id = 'plugin'; }],
  ['module-path injection', c => { c.sections[0].id = '../../api/order.js'; }],
  ['HTML injection', c => { c.sections[0].id = '<script>alert(1)</script>'; }],
  ['HTML option', c => { c.sections[0].html = '<img onerror=x>'; }],
  ['nonboolean enabled', c => { c.sections[0].enabled = 'false'; }],
  ['negative order', c => { c.sections[0].order = -1; }],
  ['noninteger order', c => { c.sections[0].order = 0.1; }],
  ['string order', c => { c.sections[0].order = '10'; }],
  ['unbounded order', c => { c.sections[0].order = Infinity; }],
]) test(`sections reject ${label}`, () => {
  const c = copy(); change(c); assert.throws(() => renderLanding(template, c), /Invalid sections/);
});

test('all 256 enabled combinations are unique, accessible and free of dangling actions', () => {
  for (let mask = 0; mask < 256; mask++) {
    const c = copy(); c.sections.forEach((item, i) => { item.enabled = !!(mask & (1 << i)); });
    const enabled = new Set(c.sections.filter(item => item.enabled).map(item => item.id));
    const html = renderLanding(template, c).html;
    assert.deepEqual(actualOrder(html), SECTION_IDS.filter(id => enabled.has(id)), `mask=${mask}`);
    assert.doesNotThrow(() => assertPageIntegrity(html));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.equal(html.includes('id="order-form"'), enabled.has('order'));
    assert.equal(html.includes('class="mobile-order'), enabled.has('hero') && enabled.has('order'));
    assert.equal(html.includes('<video '), enabled.has('video'));
    assert.equal((html.match(/<details>/g) || []).length, enabled.has('faq') ? 5 : 0);
    if (!enabled.has('order')) assert(!html.includes('href="#order"'));
    if (!enabled.has('scenarios')) assert(!html.includes('href="#scenarios"'));
    if (!enabled.has('delivery')) assert(!html.includes('href="#delivery"'));
    if (!enabled.has('scenarios') && !enabled.has('delivery')) assert(!html.includes('<nav class="nav"'));
    assert.equal((html.match(/id="reviews"/g) || []).length, 1, 'existing review shell preserved');
  }
});
test('reverse and rotated section layouts obey numeric order without mutating config', () => {
  for (let shift = 0; shift < 8; shift++) {
    const c = copy(); const expected = [...SECTION_IDS.slice(shift), ...SECTION_IDS.slice(0, shift)].reverse();
    c.sections.forEach(item => { item.order = expected.indexOf(item.id) * 10; });
    c.sections.reverse(); const before = JSON.stringify(c);
    const html = renderLanding(template, c).html;
    assert.deepEqual(actualOrder(html), expected); assert.equal(JSON.stringify(c), before);
    assert.equal((html.match(/id="order-form"/g) || []).length, 1);
    assert.equal((html.match(/data-cta-location="hero"/g) || []).length, 1);
    assertPageIntegrity(html);
  }
});
test('disabled Hero gets an escaped accessible heading and no Hero-dependent sticky bar', () => {
  const c = copy(); c.sections[0].enabled = false; c.product.name = '<img onerror="x">';
  const html = renderLanding(template, c).html;
  assert(html.includes('<h1 class="visually-hidden">&lt;img onerror=&quot;x&quot;&gt;</h1>'));
  assert(!html.includes('<section class="hero"')); assert(!html.includes('class="mobile-order'));
  assert(html.includes('data-cta-location="header"')); assert(html.includes('id="order-form"'));
});
test('Order disabled leaves no order actions or form hooks; runtime guards create no tracking/submission listeners', () => {
  const c = copy(); c.sections.find(item => item.id === 'order').enabled = false;
  const html = renderLanding(template, c).html;
  assert(!html.includes('data-cta-location=')); assert(!html.includes('id="order-form"')); assert(!html.includes('href="#order"'));
  let calls = 0;
  const doc = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => { calls++; return []; } };
  assert.doesNotThrow(() => initOrderForm({ document: doc, fetchImpl: () => { calls++; }, track: () => { calls++; } }));
  assert.doesNotThrow(() => initOrderNavigation({ document: doc, window: {}, track: () => { calls++; } }));
  assert.doesNotThrow(() => initStickyOrder({ document: doc, window: {} }));
  assert.equal(calls, 0);
});
test('single remaining header link has no decorative separator or empty navigation landmark', () => {
  const c = copy(); c.sections.find(item => item.id === 'scenarios').enabled = false;
  const html = renderLanding(template, c).html;
  const nav = html.match(/<nav class="nav"[\s\S]*?<\/nav>/)[0];
  assert(nav.includes('href="#delivery"')); assert(!nav.includes('<span')); assert(!html.includes('Що можна друкувати ↓'));
});
test('independent sales blocks retain status gates and never accept raw configuration HTML', () => {
  const c = copy(); c.sections.find(item => item.id === 'specifications').order = 1;
  c.copy.scenariosTitle = '<script>bad</script>'; c.faq[0][1] = '$& <img onerror=x>';
  c.commerce.terms.warranty.text = 'UNAPPROVED WARRANTY';
  const html = renderLanding(template, c).html;
  assert(!html.includes('<script>bad')); assert(html.includes('&lt;script&gt;bad&lt;/script&gt;'));
  assert(html.includes('$&amp; &lt;img onerror=x&gt;')); assert(!html.includes('UNAPPROVED WARRANTY'));
});
test('native price/SEO/schema fields remain stable across layout-only changes', () => {
  const baseline = renderLanding(template, PRODUCT_CONFIG); const c = copy();
  c.sections.forEach(item => { item.enabled = false; });
  const out = renderLanding(template, c);
  assert.equal(out.schema, baseline.schema); assert.equal(out.hash, baseline.hash);
  assert(out.html.includes('<title>Mini Printer — портативний термопринтер</title>'));
  assert(out.html.includes('800 грн')); assert(out.html.includes('1 200 грн'));
});
test('page integrity rejects duplicate DOM ids and broken accessible/anchor references', () => {
  assert.throws(() => assertPageIntegrity('<h1>x</h1><div id="x"></div><div id="x"></div>'), /Duplicate/);
  assert.throws(() => assertPageIntegrity('<h1>x</h1><a href="#absent">x</a>'), /anchor/);
  assert.throws(() => assertPageIntegrity('<h1>x</h1><div aria-labelledby="absent"></div>'), /accessible/);
});
test('both CLI generators regenerate disabled/reordered sections and restore them without drift', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'landing-sections-'));
  try {
    for (const item of ['scripts', 'shared', 'templates', 'api', 'images']) fs.cpSync(path.join(root, item), path.join(dir, item), { recursive: true });
    for (const item of fs.readdirSync(root, { withFileTypes: true }).filter(item => item.isFile())) fs.copyFileSync(path.join(root, item.name), path.join(dir, item.name));
    const configFile = path.join(dir, 'shared/product-config.js');
    const writeConfig = c => fs.writeFileSync(configFile, 'export const PRODUCT_CONFIG = ' + JSON.stringify(c) + ';\n');
    const run = (script, ...args) => {
      const result = spawnSync(process.execPath, [path.join(dir, 'scripts', script), ...args], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
    };
    const c = copy(); c.sections.find(item => item.id === 'order').enabled = false; c.sections.find(item => item.id === 'video').order = 1;
    writeConfig(c); run('sync-product.mjs'); const first = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    assert(!first.includes('href="#order"')); assert.equal(actualOrder(first)[0], 'video');
    run('sync-sales.mjs'); assert.equal(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), first);
    run('sync-product.mjs', '--check'); run('sync-sales.mjs', '--check');
    const none = copy(); none.sections.forEach(item => { item.enabled = false; });
    writeConfig(none); run('sync-sales.mjs'); run('check.mjs');
    writeConfig(PRODUCT_CONFIG); run('sync-sales.mjs'); assert.equal(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), published);
    run('sync-product.mjs', '--check'); run('sync-sales.mjs', '--check');
  } finally {
    assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'landing-sections-'));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
