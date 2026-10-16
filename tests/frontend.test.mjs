import test from 'node:test';
import assert from 'node:assert/strict';
import { initOrderForm } from '../script.js';
import { createAnalytics } from '../analytics.js';
class Element {
  constructor(name, value = '') { this.name = name; this.value = value; this.textContent = ''; this.disabled = false; this.readOnly = false; this.attributes = {}; this.listeners = {}; this.classes = new Set(); this.classList = { toggle: (key, on) => on ? this.classes.add(key) : this.classes.delete(key) }; }
  setAttribute(key, value) { this.attributes[key] = value; }
  removeAttribute(key) { delete this.attributes[key]; }
  addEventListener(event, callback) { this.listeners[event] = callback; }
  focus() { this.focused = true; }
  contains(target) { return target === this; }
  emit(event, target = this) { return this.listeners[event]?.({ preventDefault() {}, target }); }
}
function setup(fetchImpl, options = {}) {
  const form = new Element('form'); const button = new Element('button'); const status = new Element('status');
  const name = new Element('name', 'Тестовий клієнт'); const phone = new Element('phone', '099 123 45 67'); const bot = new Element('bot-field');
  const errors = { 'error-name': new Element(), 'error-phone': new Element() };
  form.elements = { namedItem: key => ({ name, phone, 'bot-field': bot })[key] };
  form.querySelector = () => button;
  form.reset = () => { form.resets = (form.resets || 0) + 1; name.value = ''; phone.value = ''; };
  const doc = { getElementById: id => ({ 'order-form': form, 'form-status': status, ...errors })[id] };
  const events = [];
  initOrderForm({ document: doc, fetchImpl, track: event => events.push(event), ...options });
  return { form, button, status, name, phone, bot, errors, events };
}
const success = () => ({ ok: true, status: 200, json: async () => ({ success: true }) });
test('checkout attempt is interaction-based and stable across field edits and a failed retry', async () => {
  const sent = []; let requests = 0;
  const track = createAnalytics({ enabled: true, hasConsent: () => true, send: (event, payload) => sent.push({ event, payload }) });
  const ui = setup(async () => ++requests === 1 ? { ok: false, status: 503, json: async () => ({}) } : success(), { track });
  assert.equal(sent.length, 0);
  ui.form.emit('focusin', ui.name); ui.form.emit('input', ui.name); ui.form.emit('focusin', ui.phone);
  await ui.form.emit('submit'); assert.deepEqual(sent.map(item => item.event), ['begin_checkout']);
  await ui.form.emit('submit'); assert.deepEqual(sent.map(item => item.event), ['begin_checkout', 'generate_lead']);
  ui.name.value = 'Інша людина'; ui.phone.value = '0991234567'; ui.form.emit('focusin', ui.name);
  await ui.form.emit('submit');
  assert.deepEqual(sent.map(item => item.event), ['begin_checkout', 'generate_lead', 'begin_checkout', 'generate_lead']);
  ui.name.value = 'Інша людина'; ui.phone.value = '0991234567'; await ui.form.emit('submit');
  assert.equal(sent.filter(item => item.event === 'generate_lead').length, 2); assert.equal(requests, 3);
  assert.doesNotMatch(JSON.stringify(sent), /099|Інша|людина|Тестовий/);
});
test('double clicks during a pending API response produce exactly one lead after confirmation', async () => {
  const sent = []; let resolve;
  const track = createAnalytics({ enabled: true, hasConsent: () => true, send: event => sent.push(event) });
  const ui = setup(() => new Promise(done => { resolve = done; }), { track });
  const pending = ui.form.emit('submit'); await ui.form.emit('submit'); assert.deepEqual(sent, ['begin_checkout']);
  resolve(success()); await pending; assert.deepEqual(sent, ['begin_checkout', 'generate_lead']);
});
test('frontend normalizes payload, accepts confirmed success and resets', async () => {
  let payload;
  const ui = setup(async (url, options) => { assert.equal(url, '/api/order'); assert.equal(options.method, 'POST'); payload = JSON.parse(options.body); return success(); });
  await ui.form.emit('submit');
  assert.equal(payload.phone, '+380991234567'); assert.equal(payload.price, undefined);
  assert.equal(ui.form.resets, 1); assert.equal(ui.button.disabled, false); assert.equal(ui.button.textContent, 'Надіслати заявку'); assert.equal(ui.name.readOnly, false);
  assert.equal(ui.form.attributes['aria-busy'], undefined); assert.match(ui.status.className, /success/); assert.deepEqual(ui.events, ['begin_checkout', 'generate_lead']);
});
for (const [label, response] of [
  ['HTTP error', async () => ({ ok: false, status: 502, json: async () => ({ message: 'unsafe message' }) })],
  ['false success', async () => ({ ok: true, status: 200, json: async () => ({ success: false }) })],
  ['missing success', async () => ({ ok: true, status: 200, json: async () => ({}) })],
  ['non-JSON', async () => ({ ok: false, status: 502, json: async () => { throw new Error(); } })],
  ['HTML on HTTP 200', async () => ({ ok: true, status: 200, json: async () => { throw new Error(); } })],
  ['network error', async () => { throw new Error('private URL'); }],
  ['WAF rate limit', async () => ({ ok: false, status: 429, json: async () => { throw new Error(); } })],
]) test(`frontend preserves values on ${label}`, async () => {
  const ui = setup(response); await ui.form.emit('submit');
  assert.equal(ui.name.value, 'Тестовий клієнт'); assert.equal(ui.phone.value, '099 123 45 67');
  assert.equal(ui.form.resets, undefined); assert.match(ui.status.className, /error/); assert.equal(ui.button.disabled, false); assert.equal(ui.button.textContent, 'Надіслати заявку');
  assert.doesNotMatch(ui.status.textContent, /unsafe|private/); assert.equal(ui.events.includes('generate_lead'), false);
});
test('invalid fields show errors and focus without sending', async () => {
  let calls = 0; const ui = setup(async () => { calls++; return success(); }); ui.name.value = 'X'; ui.phone.value = 'bad';
  await ui.form.emit('submit'); assert.equal(calls, 0); assert.equal(ui.name.focused, true); assert.equal(ui.name.attributes['aria-invalid'], 'true');
  assert(ui.errors['error-name'].textContent); ui.name.value = 'Марія'; ui.form.emit('input', ui.name); assert.equal(ui.name.attributes['aria-invalid'], undefined);
});
test('in-flight submission and accepted duplicate are prevented', async () => {
  let resolve; let calls = 0;
  const ui = setup(async () => { calls++; return new Promise(r => { resolve = r; }); });
  const pending = ui.form.emit('submit'); await ui.form.emit('submit'); assert.equal(calls, 1); assert.equal(ui.button.disabled, true); assert.equal(ui.name.readOnly, true); assert.equal(ui.button.textContent, 'Надсилаємо заявку…');
  resolve(success()); await pending;
  ui.name.value = 'Тестовий клієнт'; ui.phone.value = '099 123 45 67'; await ui.form.emit('submit'); assert.equal(calls, 1);
});
test('frontend timeout aborts without automatic retries or reset', async () => {
  let calls = 0;
  const ui = setup(async (_url, { signal }) => { calls++; return new Promise((_r, reject) => signal.addEventListener('abort', () => reject(new Error('abort')))); }, { timeoutMs: 5 });
  await ui.form.emit('submit'); assert.equal(calls, 1); assert.equal(ui.form.resets, undefined); assert.equal(ui.button.disabled, false); assert.match(ui.status.className, /error/);
});
test('server-side field errors remain accessible', async () => {
  const ui = setup(async () => ({ ok: false, status: 400, json: async () => ({ errors: { phone: 'secret provider text' } }) }));
  await ui.form.emit('submit'); assert.equal(ui.phone.attributes['aria-invalid'], 'true'); assert.equal(ui.errors['error-phone'].textContent, 'Перевірте номер телефону.');
});
test('analytics require configuration AND consent, deduplicate and contain no PII', () => {
  let consent = false; const events = [];
  const send = (event, payload) => events.push({ event, payload });
  createAnalytics({ send, hasConsent: () => true })('view_item'); assert.equal(events.length, 0);
  const track = createAnalytics({ enabled: true, hasConsent: () => consent, send });
  track('view_item'); assert.equal(events.length, 0); consent = true;
  for (const event of ['view_item', 'begin_checkout', 'generate_lead']) { track(event); track(event); }
  track('unknown'); assert.equal(events.length, 3);
  for (const { event, payload } of events) assert.deepEqual(Object.keys(payload).sort(), event === 'generate_lead' ? ['currency', 'product', 'value'] : ['currency', 'items', 'product', 'value']);
  assert.doesNotMatch(JSON.stringify(events), /phone|name":"Тест|099|customer/);
  consent = false; assert.equal(track('view_item'), false);
});
test('missing or failing analytics transport never breaks the flow', () => {
  assert.equal(createAnalytics({ enabled: true, hasConsent: () => true, send: () => false })('view_item'), false);
  assert.equal(createAnalytics({ enabled: true, hasConsent: () => true, send: () => { throw new Error(); } })('view_item'), false);
});
test('analytics callback failure cannot turn accepted order into an error', async () => {
  const ui = setup(async () => success(), { track: () => { throw new Error('analytics failed'); } });
  await ui.form.emit('submit'); assert.match(ui.status.className, /success/); assert.equal(ui.form.resets, 1);
});
test('analytics consent failure is isolated', () => {
  const track = createAnalytics({ enabled: true, hasConsent: () => { throw new Error(); } });
  assert.equal(track('view_item'), false);
});
