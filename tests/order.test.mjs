import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createOrderHandler } from '../api/order.js';
import { normalizePhone, validateOrder } from '../shared/validation.js';
import { PRODUCT } from '../shared/product.js';

const valid = { name: 'Тестова заявка', phone: '099 123 45 67', 'bot-field': '' };
const accepted = () => ({ ok: true, status: 200, json: async () => ({ ok: true, result: { message_id: 42 } }) });
async function call({ body = valid, method = 'POST', headers = {}, env = { TELEGRAM_BOT_TOKEN: 'test-token', TELEGRAM_CHAT_ID: 'test-chat' }, fetchImpl = async () => accepted(), timeoutMs, stream } = {}) {
  const req = stream ? Readable.from(stream) : {};
  Object.assign(req, { method, headers: { host: 'example.test', 'content-type': 'application/json', ...headers } });
  if (!stream) req.body = body;
  const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  await createOrderHandler({ env, fetchImpl, timeoutMs })(req, res);
  return res;
}
const noTelegram = async () => { throw new Error('Unexpected Telegram call'); };
for (const [input, expected] of [['099 123 45 67', '+380991234567'], ['380991234567', '+380991234567'], ['+380 (99) 123-45-67', '+380991234567'], ['+48123456789', '+48123456789']]) {
  test(`normalizes ${input}`, () => assert.equal(normalizePhone(input), expected));
}
for (const phone of [null, 991234567, [], {}, 'abc', '++380991234567', '+380012345678', '+3809912345678', '123', '0991234567<script>']) {
  test(`rejects invalid phone ${JSON.stringify(phone)}`, () => assert.equal(normalizePhone(phone), null));
}
test('validates names without converting unexpected types', () => {
  for (const name of [null, {}, [], 42, 'A', 'a'.repeat(61), '<script>', 'Test\nUser', 'Test\u200bUser']) assert.equal(validateOrder({ ...valid, name }).valid, false);
  assert.equal(validateOrder({ ...valid, name: ' Марія-Анна О’Браєн ' }).data.name, 'Марія-Анна О’Браєн');
});
test('accepts only Telegram-confirmed messages and uses configured price', async () => {
  let sent;
  const res = await call({ fetchImpl: async (url, options) => { assert.match(url, /^https:\/\/api.telegram.org\/bot/); sent = JSON.parse(options.body); return accepted(); } });
  assert.equal(res.statusCode, 200); assert.equal(res.body.success, true);
  assert.match(sent.text, /\+380991234567/); assert(sent.text.includes(`Ціна: ${PRODUCT.price} грн`));
  assert.equal(sent.parse_mode, undefined); assert.equal(res.headers['Cache-Control'], 'no-store');
});
for (const [label, body, status] of [
  ['null', null, 400], ['array', [], 400], ['number', 123, 400], ['malformed JSON', '{', 400],
  ['wrong name type', { ...valid, name: {} }, 400], ['wrong phone type', { ...valid, phone: [] }, 400],
  ['unknown field', { ...valid, price: 1 }, 400], ['unknown prototype key', '{"__proto__":{},"name":"Test","phone":"0991234567"}', 400],
  ['oversized object', { ...valid, name: 'x'.repeat(2100) }, 413], ['oversized raw', ' '.repeat(2100), 413],
  ['honeypot', { ...valid, 'bot-field': 'spam' }, 422], ['honeypot type', { ...valid, 'bot-field': {} }, 400],
]) test(`API rejects ${label}`, async () => {
  let called = false;
  const res = await call({ body, fetchImpl: async () => { called = true; return accepted(); } });
  assert.equal(res.statusCode, status); assert.equal(res.body.success, false); assert.equal(called, false);
});
test('raw JSON and streamed JSON work', async () => {
  assert.equal((await call({ body: JSON.stringify(valid) })).statusCode, 200);
  assert.equal((await call({ body: Buffer.from(JSON.stringify(valid)) })).statusCode, 200);
  assert.equal((await call({ stream: [Buffer.from(JSON.stringify(valid))] })).statusCode, 200);
  assert.equal((await call({ stream: [Buffer.alloc(1025), Buffer.alloc(1025)] })).statusCode, 413);
});
test('unsupported methods provide Allow', async () => {
  for (const method of ['GET', 'OPTIONS', 'PUT', 'HEAD']) {
    const res = await call({ method, fetchImpl: noTelegram }); assert.equal(res.statusCode, 405); assert.equal(res.headers.Allow, 'POST');
  }
});
test('content type and declared length are checked', async () => {
  for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'application/jsonp', undefined]) assert.equal((await call({ headers: { 'content-type': type }, fetchImpl: noTelegram })).statusCode, 415);
  for (const length of ['2049', '-1', 'garbage']) assert.equal((await call({ headers: { 'content-length': length }, fetchImpl: noTelegram })).statusCode, 413);
});
test('cross-site browser submissions are rejected; own preview host works', async () => {
  for (const headers of [{ origin: 'https://evil.test' }, { origin: 'null' }, { 'sec-fetch-site': 'cross-site' }]) assert.equal((await call({ headers, fetchImpl: noTelegram })).statusCode, 403);
  assert.equal((await call({ headers: { origin: 'https://example.test' } })).statusCode, 200);
});
test('missing environment variables fail safely', async () => {
  for (const env of [{}, { TELEGRAM_BOT_TOKEN: 'test-token' }, { TELEGRAM_CHAT_ID: 'test-chat' }]) {
    const res = await call({ env, fetchImpl: noTelegram }); assert.equal(res.statusCode, 503); assert.equal(res.body.success, false);
  }
});
for (const [label, fetchImpl, status] of [
  ['provider HTTP failure', async () => ({ ok: false, status: 500 }), 502],
  ['provider ok:false on HTTP 200', async () => ({ ok: true, json: async () => ({ ok: false, description: 'private-provider-details' }) }), 502],
  ['missing message confirmation', async () => ({ ok: true, json: async () => ({ ok: true }) }), 502],
  ['provider invalid JSON', async () => ({ ok: true, json: async () => { throw new Error('private-token'); } }), 502],
  ['network failure', async () => { throw new Error('private-token'); }, 502],
  ['provider rate limit', async () => ({ ok: false, status: 429 }), 503],
]) test(`handles ${label} without sensitive response data`, async () => {
  const res = await call({ fetchImpl }); assert.equal(res.statusCode, status); assert.equal(res.body.success, false);
  assert.doesNotMatch(JSON.stringify(res.body), /private|test-token|test-chat|099123/);
});
test('Telegram timeout aborts once without retry', async () => {
  let calls = 0;
  const res = await call({ timeoutMs: 5, fetchImpl: async (_url, { signal }) => {
    calls++; return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
  } });
  assert.equal(res.statusCode, 504); assert.equal(calls, 1); assert.equal(res.body.success, false);
});
