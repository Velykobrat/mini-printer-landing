import { PRODUCT } from '../shared/product.js';
import { validateOrder } from '../shared/validation.js';

const MAX_BODY_BYTES = 2048;
const allowedKeys = new Set(['name', 'phone', 'bot-field']);
class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function readPayload(req) {
  const length = req.headers?.['content-length'];
  if (length !== undefined && (!/^\d+$/.test(String(length)) || Number(length) > MAX_BODY_BYTES)) {
    throw new RequestError(413, 'Завеликий запит.');
  }
  const type = req.headers?.['content-type'];
  if (typeof type !== 'string' || !/^application\/json(?:\s*;|$)/i.test(type)) {
    throw new RequestError(415, 'Очікується запит у форматі JSON.');
  }
  let body = req.body;
  if (body === undefined) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_BODY_BYTES) throw new RequestError(413, 'Завеликий запит.');
      chunks.push(buffer);
    }
    body = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) throw new RequestError(413, 'Завеликий запит.');
    try { body = JSON.parse(body); } catch { throw new RequestError(400, 'Некоректний JSON.'); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new RequestError(400, 'Некоректні дані замовлення.');
  }
  // Vercel may already have parsed the body before this handler runs.
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) throw new RequestError(413, 'Завеликий запит.');
  if (Object.keys(body).some(key => !allowedKeys.has(key))) throw new RequestError(400, 'Невідомі поля запиту.');
  return body;
}

function rejectCrossSite(req) {
  if (req.headers?.['sec-fetch-site'] === 'cross-site') return true;
  const origin = req.headers?.origin;
  if (!origin) return false; // Non-browser callers still require validation and WAF protection.
  try {
    const url = new URL(origin);
    return !['https:', 'http:'].includes(url.protocol) || url.host !== req.headers.host;
  } catch { return true; }
}

export function createOrderHandler({ fetchImpl = globalThis.fetch, env = process.env, timeoutMs = 8000 } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return reply(405, 'Метод не підтримується.');
    }
    if (rejectCrossSite(req)) return reply(403, 'Надсилайте заявку з цього сайту.');
    let body;
    try { body = await readPayload(req); }
    catch (error) { return reply(error instanceof RequestError ? error.status : 400, error instanceof RequestError ? error.message : 'Не вдалося прочитати запит.'); }
    if (body['bot-field'] !== undefined && typeof body['bot-field'] !== 'string') return reply(400, 'Некоректні дані замовлення.');
    // Never simulate a successful Telegram delivery for a blocked honeypot.
    if (body['bot-field']?.trim()) return reply(422, 'Не вдалося прийняти заявку.');
    const validation = validateOrder(body);
    if (!validation.valid) return reply(400, 'Перевірте ім’я та номер телефону.', { errors: validation.errors });
    const botToken = env.TELEGRAM_BOT_TOKEN;
    const chatId = env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return reply(503, 'Сервіс замовлень тимчасово недоступний.');
    const { name, phone } = validation.data;
    const text = [
      `🖨 НОВЕ ЗАМОВЛЕННЯ — ${PRODUCT.name.toLocaleUpperCase('uk-UA')}`, '',
      `👤 Ім’я: ${name}`, `📞 Телефон: ${phone}`, '',
      `📦 ${PRODUCT.name}`, `💰 Ціна: ${PRODUCT.price} ${PRODUCT.currencyLabel}`, '',
      `🕒 ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' })}`,
    ].join('\n');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      if (response.status === 429) {
        res.setHeader('Retry-After', '60');
        return reply(503, 'Сервіс перевантажений. Спробуйте пізніше.');
      }
      if (!response.ok) return reply(502, 'Не вдалося передати заявку. Спробуйте пізніше.');
      const result = await response.json();
      if (result?.ok !== true || !Number.isInteger(result.result?.message_id)) {
        return reply(502, 'Не вдалося підтвердити прийняття заявки.');
      }
      return res.status(200).json({ success: true, message: 'Заявку прийнято.' });
    } catch {
      // Do not log request data, provider responses, tokens or token-bearing URLs.
      return reply(controller.signal.aborted ? 504 : 502,
        'Не вдалося підтвердити прийняття заявки. Вона могла надійти. Автоматично не повторюємо запит.');
    } finally { clearTimeout(timer); }
  };
}
export default createOrderHandler();
