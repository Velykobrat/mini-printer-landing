import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ANALYTICS } from '../analytics-config.js';
import { createAnalytics, createGoogleTag } from '../analytics.js';
import { createConsent, initConsentUI, clearAnalyticsCookies } from '../consent.js';
import { PRODUCT } from '../shared/product.js';

class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, fn) { const list = this.listeners.get(type) || []; list.push(fn); this.listeners.set(type, list); }
  fire(type, event = {}) { for (const fn of this.listeners.get(type) || []) fn(event); }
}
function environment({ storage = new Map(), hostname = ANALYTICS.hostname, clock = 1000 } = {}) {
  const win = new Events(); const doc = new Events(); const scripts = []; const timers = new Map(); const deletedCookies = [];
  win.location = { hostname }; win.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  win.setTimeout = fn => { const id = Symbol(); timers.set(id, fn); return id; };
  win.clearTimeout = id => timers.delete(id);
  doc.createElement = tag => { assert.equal(tag, 'script'); return { remove() { this.removed = true; } }; };
  doc.head = { append(script) { scripts.push(script); } };
  Object.defineProperty(doc, 'cookie', { get: () => '_ga=old; _ga_WHL8RKEGFJ=old; necessary=keep', set: value => deletedCookies.push(value) });
  let consent; let tag; let track;
  consent = createConsent({ window: win, document: doc, now: () => clock,
    onChange: granted => { if (granted) { tag.enable(); track('view_item'); } else tag.disable(); } });
  tag = createGoogleTag({ window: win, document: doc, hasConsent: () => consent.hasConsent() });
  track = createAnalytics({ enabled: true, hasConsent: () => consent.hasConsent(), send: tag.send });
  consent.start();
  const commands = () => (win.dataLayer || []).map(args => Array.from(args));
  const events = () => commands().filter(args => args[0] === 'event');
  return { win, doc, storage, scripts, timers, deletedCookies, consent, tag, track, commands, events, advance: ms => { clock += ms; } };
}
test('default denied creates no tag, dataLayer, events or analytics cookies', () => {
  const env = environment();
  env.track('order_click', { cta_location: 'hero' }); env.tag.enable();
  assert.equal(env.scripts.length, 0); assert.equal(env.win.dataLayer, undefined);
  assert(env.win['ga-disable-' + ANALYTICS.measurementId]);
  assert(env.deletedCookies.every(cookie => cookie.includes('Max-Age=0')));
});
test('rejection persists and creates no requests on interactions or reload', () => {
  const env = environment(); assert(env.consent.choose('denied'));
  env.track('begin_checkout'); env.tag.enable();
  const reload = environment({ storage: env.storage });
  assert.equal(reload.consent.choice, 'denied'); assert.equal(reload.scripts.length, 0); assert.equal(env.scripts.length, 0);
});
test('acceptance initializes official tag once and one explicit pageview after load', () => {
  const env = environment(); env.consent.choose('granted'); env.consent.choose('granted');
  assert.equal(env.scripts.length, 1); assert.match(env.scripts[0].src, /^https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-WHL8RKEGFJ$/);
  assert.equal(env.scripts[0].referrerPolicy, 'no-referrer');
  assert.equal(env.events().length, 0);
  env.scripts[0].onload(); env.tag.enable();
  assert.equal(env.events().filter(args => args[1] === 'page_view').length, 1);
  assert.equal(env.events().filter(args => args[1] === 'view_item').length, 1);
  const configs = env.commands().filter(args => args[0] === 'config');
  assert.equal(configs.length, 1); assert.equal(configs[0][2].send_page_view, false);
  assert.equal(configs[0][2].allow_google_signals, false); assert.equal(configs[0][2].allow_ad_personalization_signals, false);
  assert.deepEqual(env.commands()[0][2], { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
});
test('valid stored acceptance survives reload but malformed, future and expired records fail closed', () => {
  const env = environment(); env.consent.choose('granted');
  assert.equal(environment({ storage: env.storage }).scripts.length, 1);
  for (const record of ['broken', JSON.stringify({ version: 1, choice: 'granted', time: 1001 }), JSON.stringify({ version: 0, choice: 'granted', time: 1000 })]) {
    assert.equal(environment({ storage: new Map([[ANALYTICS.storageKey, record]]) }).scripts.length, 0);
  }
  assert.equal(environment({ storage: env.storage, clock: ANALYTICS.consentLifetimeMs + 1001 }).scripts.length, 0);
});
test('storage read/write failures disable analytics and never throw', () => {
  const env = environment();
  Object.defineProperty(env.win, 'localStorage', { get() { throw new Error('blocked'); } });
  assert.equal(env.consent.choose('granted'), false); assert.equal(env.consent.hasConsent(), false); assert.equal(env.scripts.length, 0);
  const another = environment(); another.win.localStorage.setItem = () => { throw new Error('quota'); };
  assert.equal(another.consent.choose('granted'), false); assert.equal(another.scripts.length, 0);
});
test('withdrawal opts out immediately, drops tracking, deletes only GA cookies, persists denial', () => {
  const env = environment(); env.consent.choose('granted'); env.scripts[0].onload();
  const count = env.commands().length;
  env.consent.choose('denied');
  assert(env.win['ga-disable-' + ANALYTICS.measurementId]);
  assert.equal(env.track('generate_lead'), false); assert.equal(env.tag.send('order_click', {}), false);
  assert.equal(env.commands().length, count, 'no consent ping on withdrawal');
  assert(env.deletedCookies.some(cookie => cookie.startsWith('_ga_WHL8RKEGFJ=')));
  assert(env.deletedCookies.every(cookie => !cookie.includes('necessary')));
  assert.equal(environment({ storage: env.storage }).scripts.length, 0);
});
test('failed withdrawal persistence removes an old grant when storage removal remains available', () => {
  const env = environment(); env.consent.choose('granted'); env.scripts[0].onload();
  env.win.localStorage.setItem = () => { throw new Error('quota'); };
  assert.equal(env.consent.choose('denied'), false);
  assert.equal(env.consent.hasConsent(), false); assert.equal(env.storage.has(ANALYTICS.storageKey), false);
  assert.equal(environment({ storage: env.storage }).scripts.length, 0);
});
test('withdrawal during loading cancels callbacks and drops post-consent queued events', () => {
  const env = environment(); env.consent.choose('granted'); env.track('order_click', { cta_location: 'hero' });
  const staleLoad = env.scripts[0].onload;
  env.consent.choose('denied'); staleLoad();
  assert(env.scripts[0].removed); assert.equal(env.scripts[0].onload, null); assert.equal(env.events().length, 0);
  assert.equal(env.track('generate_lead'), false);
});
test('only post-consent interactions queue while loading; rejection never backfills', () => {
  const env = environment(); env.track('order_click', { cta_location: 'header' }); env.track('generate_lead', { attempt: 1 });
  env.consent.choose('granted'); env.track('order_click', { cta_location: 'hero' }); env.scripts[0].onload();
  assert.deepEqual(env.events().filter(args => args[1] === 'order_click').map(args => args[2].cta_location), ['hero']);
  assert.equal(env.events().filter(args => args[1] === 'generate_lead').length, 0);
});
for (const failure of ['error', 'timeout']) test(`tag ${failure} is isolated, no retries or queued events leak`, () => {
  const env = environment(); env.consent.choose('granted');
  if (failure === 'error') env.scripts[0].onerror(); else [...env.timers.values()][0]();
  assert.equal(env.tag.send('generate_lead', {}), false); assert.equal(env.tag.enable(), false);
  assert.equal(env.scripts.length, 1); assert(env.win['ga-disable-' + ANALYTICS.measurementId]);
  assert.equal(env.events().length, 0);
});
test('expiry and cross-tab rejection revoke loaded collection', () => {
  const env = environment(); env.consent.choose('granted'); env.scripts[0].onload();
  env.advance(ANALYTICS.consentLifetimeMs); env.doc.fire('visibilitychange');
  assert.equal(env.consent.hasConsent(), false); assert(env.win['ga-disable-' + ANALYTICS.measurementId]);
  const other = environment(); other.consent.choose('granted'); other.scripts[0].onload();
  other.storage.set(ANALYTICS.storageKey, JSON.stringify({ version: 1, choice: 'denied', time: 1000 }));
  other.win.fire('storage', { key: ANALYTICS.storageKey });
  assert.equal(other.track('order_click'), false); assert(other.win['ga-disable-' + ANALYTICS.measurementId]);
});
test('preview/local hosts cannot pollute production analytics', () => {
  for (const hostname of ['localhost', 'mini-printer-preview.vercel.app', 'evil.example']) {
    const env = environment({ hostname }); env.consent.choose('granted'); assert.equal(env.scripts.length, 0);
  }
});
test('same window reuses singleton; reacceptance after loaded withdrawal does not duplicate config/pageview', () => {
  const env = environment(); assert.equal(createGoogleTag({ window: env.win, document: env.doc }), env.tag);
  env.consent.choose('granted'); env.scripts[0].onload(); env.consent.choose('denied'); env.consent.choose('granted');
  assert.equal(env.scripts.length, 1); assert.equal(env.events().filter(args => args[1] === 'page_view').length, 1);
  assert.equal(env.commands().filter(args => args[0] === 'config').length, 1);
});
test('allowlisted events deduplicate attempts, sanitize locations and never forward PII or arbitrary fields', () => {
  const sent = []; const track = createAnalytics({ enabled: true, hasConsent: () => true, send: (event, params) => sent.push({ event, params }) });
  for (const attempt of [1, 1, 2, 2]) for (const event of ['begin_checkout', 'generate_lead']) track(event, { attempt, name: 'PRIVATE', phone: 'PRIVATE', ip: 'PRIVATE', value: 1 });
  track('order_click', { cta_location: 'PRIVATE', phone: 'PRIVATE' }); track('purchase');
  assert.equal(sent.length, 5); assert.doesNotMatch(JSON.stringify(sent), /PRIVATE|phone|"ip"|attempt/);
  assert.deepEqual(sent[1].params, { product: 'mini_printer', currency: PRODUCT.currency, value: PRODUCT.price });
  assert.equal(sent[4].params.cta_location, 'other');
});
test('cookie access failures are harmless', () => {
  const doc = {}; Object.defineProperty(doc, 'cookie', { get() { throw new Error(); } });
  assert.doesNotThrow(() => clearAnalyticsCookies(doc, ANALYTICS.hostname));
});
test('consent UI uses keyboard-native buttons, normal flow and privacy page without tag', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['consent-accept', 'consent-reject', 'consent-withdraw', 'cookie-settings']) assert.match(html, new RegExp(`<button[^>]+id="${id}"[^>]+type="button"`));
  assert.match(html, /id="analytics-consent" tabindex="-1" aria-labelledby="consent-title"/);
  assert.match(html, /href="\.\/privacy.html"/);
  const privacy = fs.readFileSync(new URL('../privacy.html', import.meta.url), 'utf8');
  assert.doesNotMatch(privacy, /<script|<iframe/);
  assert.doesNotMatch(html, /<script[^>]+googletagmanager|<link[^>]+google-analytics/);
});
test('consent buttons accept/reject, settings reopen and withdrawal restores focus', () => {
  const doc = new Events(); const ids = {};
  for (const id of ['analytics-consent', 'cookie-settings', 'consent-status', 'consent-accept', 'consent-reject', 'consent-withdraw']) {
    ids[id] = new Events(); Object.assign(ids[id], { hidden: false, disabled: true, textContent: '', focus() { doc.activeElement = this; }, scrollIntoView() { this.scrolled = true; } });
  }
  ids['analytics-consent'].contains = node => ['consent-accept', 'consent-reject', 'consent-withdraw'].some(id => ids[id] === node);
  doc.getElementById = id => ids[id];
  const choices = []; const consent = { choice: null, choose(next) { choices.push(next); this.choice = next; return true; } };
  initConsentUI({ document: doc, consent });
  assert.equal(ids['analytics-consent'].hidden, false); assert.equal(ids['consent-accept'].disabled, false);
  doc.activeElement = ids['consent-accept']; ids['consent-accept'].fire('click');
  assert(ids['analytics-consent'].hidden); assert.equal(doc.activeElement, ids['cookie-settings']);
  ids['cookie-settings'].fire('click'); assert.equal(ids['analytics-consent'].hidden, false); assert.equal(ids['consent-withdraw'].hidden, false);
  ids['consent-withdraw'].fire('click'); assert.deepEqual(choices, ['granted', 'denied']); assert(ids['analytics-consent'].hidden);
  ids['cookie-settings'].fire('click'); ids['consent-reject'].fire('click'); assert.equal(choices.at(-1), 'denied');
});
