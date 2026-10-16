import { PRODUCT, formatPrice } from './shared/product.js';
import { validateOrder } from './shared/validation.js';
import { ANALYTICS } from './analytics-config.js';
import { createAnalytics } from './analytics.js';

export function initOrderForm({ document: doc = document, fetchImpl = globalThis.fetch,
  track = () => {}, timeoutMs = 12000 } = {}) {
  const form = doc.getElementById('order-form');
  const status = doc.getElementById('form-status');
  if (!form || !status) return;
  const button = form.querySelector('button[type="submit"]');
  const fields = { name: form.elements.namedItem('name'), phone: form.elements.namedItem('phone') };
  const safeTrack = (event) => { try { track(event); } catch { /* Tracking cannot affect orders. */ } };
  const idleLabel = `Замовити за ${formatPrice(PRODUCT.price)}`;
  let inFlight = false;
  let lastAccepted = null; // Tab-local duplicate guard, not distributed idempotency.
  form.noValidate = true; // Native constraints still work when JavaScript is unavailable.
  const setStatus = (text, kind = '') => {
    status.textContent = text;
    status.className = `form-status${kind ? ' form-status--' + kind : ''}`;
  };
  const setErrors = (errors = {}) => {
    for (const [key, field] of Object.entries(fields)) {
      const error = doc.getElementById(`error-${key}`);
      if (error) error.textContent = errors[key] || '';
      if (errors[key]) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    }
  };
  form.addEventListener('focusin', (event) => {
    if (Object.values(fields).includes(event.target)) safeTrack('begin_checkout');
  });
  form.addEventListener('input', (event) => {
    if (Object.values(fields).includes(event.target)) {
      event.target.removeAttribute('aria-invalid');
      const error = doc.getElementById(`error-${event.target.name}`);
      if (error) error.textContent = '';
    }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (inFlight) return;
    const payload = { name: fields.name.value, phone: fields.phone.value,
      'bot-field': form.elements.namedItem('bot-field')?.value || '' };
    const checked = validateOrder(payload);
    setErrors(checked.errors);
    if (!checked.valid) {
      setStatus('Перевірте позначені поля.', 'error');
      fields[Object.keys(checked.errors)[0]]?.focus();
      return;
    }
    const signature = JSON.stringify(checked.data);
    if (signature === lastAccepted) {
      setStatus('Цю заявку вже прийнято. Очікуйте зв’язку менеджера.', 'success');
      return;
    }
    inFlight = true;
    button.disabled = true;
    button.textContent = 'Надсилаємо…';
    form.setAttribute('aria-busy', 'true');
    for (const field of Object.values(fields)) field.readOnly = true;
    setStatus('Передаємо заявку…');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl('/api/order', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ ...checked.data, 'bot-field': payload['bot-field'] }) });
      let result;
      try { result = await response.json(); } catch { result = null; }
      if (!response.ok || result?.success !== true) {
        if (response.status === 400 && result?.errors) {
          const errors = {};
          for (const key of ['name', 'phone']) {
            if (typeof result.errors[key] === 'string') errors[key] = checked.errors[key] || (key === 'name' ? 'Перевірте ім’я.' : 'Перевірте номер телефону.');
          }
          setErrors(errors);
        }
        const message = response.status === 429 ? 'Забагато спроб. Зачекайте хвилину та спробуйте знову.' :
          response.status === 400 ? 'Перевірте ім’я та номер телефону.' :
          response.status === 422 ? 'Не вдалося прийняти заявку. Оновіть сторінку та спробуйте ще раз.' :
          response.status === 503 ? 'Сервіс тимчасово недоступний. Спробуйте пізніше.' :
          'Не вдалося підтвердити заявку. Вона могла надійти. Перевірте зв’язок перед повторною спробою.';
        setStatus(message, 'error');
        return;
      }
      lastAccepted = signature;
      setStatus('Дякуємо! Заявку прийнято. Ми зв’яжемося з вами для підтвердження деталей.', 'success');
      form.reset();
      safeTrack('generate_lead');
    } catch {
      setStatus('Не вдалося підтвердити заявку. Вона могла надійти. Перевірте інтернет-з’єднання перед повторною спробою.', 'error');
    } finally {
      clearTimeout(timer);
      inFlight = false;
      button.disabled = false;
      button.textContent = idleLabel;
      form.removeAttribute('aria-busy');
      for (const field of Object.values(fields)) field.readOnly = false;
    }
  });
}

export function initStickyOrder({ document: doc = document, window: win = window } = {}) {
  const bar = doc.querySelector('.mobile-order');
  const order = doc.getElementById('order');
  if (!bar || !order) return;
  const hide = (hidden) => {
    // Do not remove a focused link while a keyboard user is using it.
    if (hidden && bar.contains(doc.activeElement)) return;
    bar.classList.toggle('is-hidden', hidden);
  };
  if ('IntersectionObserver' in win) {
    new win.IntersectionObserver(([entry]) => hide(entry.isIntersecting),
      { threshold: 0, rootMargin: '0px 0px 96px 0px' }).observe(order);
  } else {
    // Older browsers: omit the optional floating control rather than obscure the form.
    hide(true);
  }
  doc.addEventListener('focusin', (event) => { if (order.contains(event.target)) hide(true); });
}

if (typeof document !== 'undefined') {
  const track = createAnalytics({ enabled: ANALYTICS.enabled,
    hasConsent: () => window.miniPrinterAnalyticsConsent === true,
    send: (event, payload) => {
      if (typeof window.gtag !== 'function') return false;
      window.gtag('event', event, payload);
    } });
  track('view_item');
  window.addEventListener('mini-printer:analytics-consent', () => track('view_item'));
  initOrderForm({ track });
  initStickyOrder();
}
