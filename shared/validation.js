// Shared by the browser and server; the server always validates independently.
export function normalizePhone(value) {
  if (typeof value !== 'string' || value.length > 32 || !/^[+\d\s()-]+$/.test(value)) return null;
  let phone = value.trim().replace(/[\s()-]/g, '');
  if (/^0\d{9}$/.test(phone)) phone = '+38' + phone;
  else if (/^380\d{9}$/.test(phone)) phone = '+' + phone;
  if (!/^\+[1-9]\d{9,14}$/.test(phone)) return null;
  if (phone.startsWith('+380') && !/^\+380[1-9]\d{8}$/.test(phone)) return null;
  return phone;
}
export function validateOrder(payload) {
  const errors = {};
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, errors: { form: 'Перевірте дані замовлення.' } };
  }
  const name = typeof payload.name === 'string' ? payload.name.trim().normalize('NFC') : '';
  if (name.length < 2 || name.length > 60 || /[\p{Cc}\p{Cf}<>]/u.test(name)) {
    errors.name = 'Введіть ім’я від 2 до 60 символів без спеціальних керівних знаків.';
  }
  const phone = normalizePhone(payload.phone);
  if (!phone) errors.phone = 'Введіть номер: 0XX XXX XX XX або міжнародний номер із +.';
  return { valid: Object.keys(errors).length === 0, errors, data: { name, phone } };
}
