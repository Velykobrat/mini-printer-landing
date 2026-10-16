import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SALES, REVIEWS, reviewState } from '../shared/sales-content.js';
import { initReviews } from '../sales.js';

test('production defaults hide reviews; only explicitly confirmed real entries pass', () => {
  assert.equal(REVIEWS.mode, 'production');
  assert.deepEqual(reviewState().items, []);
  const real = { confirmed: true, author: 'Покупець', text: 'Підтверджений текст' };
  assert.deepEqual(reviewState({ items: [real, { ...real, confirmed: false }, { ...real, author: '' }, { ...real, text: null }] }).items, [real]);
});

test('demo has three clearly separated examples only on exact loopback hosts', () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
    const state = reviewState({ mode: 'demo', hostname });
    assert.equal(state.demo, true); assert.equal(state.items.length, 3);
    assert(state.items.every(item => !item.confirmed));
  }
  for (const hostname of ['mini-printer-landing.vercel.app', 'preview.vercel.app', 'localhost.example.com', '192.168.1.2', '']) {
    assert.deepEqual(reviewState({ mode: 'demo', hostname }), { demo: false, items: [] });
  }
});

test('unconfirmed sales conditions and kit items are not published', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const delivery = html.split('<!-- sales-delivery:start -->')[1].split('<!-- sales-delivery:end -->')[0];
  for (const term of Object.values(SALES.terms)) {
    assert.equal(term.status, 'pending'); assert(!delivery.includes(term.title));
  }
  assert.equal(SALES.kit.status, 'pending'); assert.equal(SALES.kit.items.length, 0);
  assert(delivery.includes(SALES.kit.note));
  assert(!/USB|безкоштовн|протягом \d/i.test(delivery));
});

test('one FAQ covers the five requested questions; static review shell has no fabricated ratings', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(SALES.faq.length, 5);
  assert.equal((html.match(/<details>/g) || []).length, 5);
  assert.equal((html.match(/class="container faq"/g) || []).length, 1);
  assert.match(html, /id="reviews"[^>]*hidden/);
  assert.match(html, /Демонстраційний вміст — не відгуки реальних покупців/);
  const schema = JSON.parse(/application\/ld\+json">([^<]+)/.exec(html)[1]);
  assert.equal(schema.review, undefined); assert.equal(schema.aggregateRating, undefined);
});

test('media reserve dimensions and use local assets without invented lifestyle photography', () => {
  assert.equal(SALES.lifestyles.length, 2);
  assert.equal(SALES.lifestyles.filter(item => !item.image).length, 0);
  for (const item of SALES.lifestyles.filter(item => item.image)) {
    assert(item.alt.trim()); assert(fs.existsSync(new URL('../' + item.image, import.meta.url)));
  }
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /class="experience-card"><img[^>]*width="630" height="630" loading="lazy"/);
  assert.equal((html.match(/id="scenarios"/g) || []).length, 1);
  for (const image of ['mini-printer-minion.jpg', 'mini-printer-use.jpg']) {
    assert.equal(html.split(`src="./images/${image}"`).length - 1, 1);
  }
  assert.doesNotMatch(html, /ПРО ПРОДУКТ|Три способи залишити ідею|Фото сценарію готується/);
  assert.doesNotMatch(html, /<video[^>]*autoplay/);
  if (SALES.video.status === 'confirmed') {
    assert.match(html, /<video controls playsinline preload="none" poster=/);
    assert(fs.existsSync(new URL('../' + SALES.video.src, import.meta.url)));
  } else assert.match(html, /Відеодемонстрація готується/);
});

class Element {
  constructor() { this.children = []; this.hidden = true; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren() { this.children = []; }
}
test('review component labels demo and resets safely between local and remote modes', () => {
  const nodes = Object.fromEntries(['reviews', 'reviews-grid', 'reviews-demo-note'].map(id => [id, new Element()]));
  const doc = { getElementById: id => nodes[id], createElement: () => new Element() };
  initReviews({ document: doc, window: { location: { search: '?reviews=demo', hostname: 'localhost' } } });
  assert.equal(nodes.reviews.hidden, false); assert.equal(nodes['reviews-demo-note'].hidden, false);
  assert.equal(nodes['reviews-grid'].children.length, 3);
  initReviews({ document: doc, window: { location: { search: '?reviews=demo', hostname: 'preview.vercel.app' } } });
  assert.equal(nodes.reviews.hidden, true); assert.equal(nodes['reviews-grid'].children.length, 0);
});
