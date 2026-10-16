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
  const idleLabel = 'Надіслати заявку';
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
    button.textContent = 'Надсилаємо заявку…';
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

// Share the exact sticky-header measurement with all native section anchors.
export function initAnchorOffsets({ document: doc = document, window: win = window } = {}) {
  const header = doc.querySelector('.header');
  const root = doc.documentElement;
  if (!header || !root) return () => {};
  const mobile = win.matchMedia?.('(max-width: 680px)');
  const sync = () => {
    const isMobile = mobile?.matches ?? win.innerWidth <= 680;
    const bounds = header.getBoundingClientRect();
    const height = isMobile ? 0 : bounds.height ?? bounds.bottom - bounds.top;
    root.style.setProperty('--anchor-offset', height + 'px');
  };
  sync();
  win.addEventListener('resize', sync);
  mobile?.addEventListener?.('change', sync);
  if ('ResizeObserver' in win) new win.ResizeObserver(sync).observe(header);
  return sync;
}

// Both mouse/keyboard CTAs and direct #order links target the order section start.
export function initOrderNavigation({ document: doc = document, window: win = window, syncOffset = () => {} } = {}) {
  const target = doc.getElementById('order');
  if (!target) return;
  const scroll = () => {
    syncOffset();
    doc.querySelector('.mobile-order')?.classList.toggle('is-hidden', true);
    // Focus a non-editable container: accessible arrival without opening a keyboard
    // or firing begin_checkout before the visitor interacts with a field.
    target.focus({ preventScroll: true });
    const reduceMotion = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
    target.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start', inline: 'nearest' });
  };
  for (const link of doc.querySelectorAll('a[href="#order"]')) {
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || (event.button ?? 0) !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (win.location.hash !== '#order') win.history.pushState(null, '', '#order');
      scroll(); // Repeated clicks realign the form, even when the hash is unchanged.
    });
  }
  const scrollForHash = () => { if (win.location.hash === '#order') scroll(); };
  win.addEventListener('hashchange', scrollForHash);
  if (doc.readyState === 'complete') scrollForHash();
  else win.addEventListener('load', scrollForHash, { once: true });
}

export function initStickyOrder({ document: doc = document, window: win = window, showDelayMs = 180 } = {}) {
  const bar = doc.querySelector('.mobile-order');
  const hero = doc.querySelector('.hero__actions a[href="#order"]');
  const section = doc.getElementById('order');
  const target = doc.getElementById('order');
  if (!bar) return;
  bar.classList.toggle('is-hidden', true); // Also hidden in HTML: no first-paint duplicate.
  // Fail closed if visibility cannot be determined; Hero/header CTAs still work.
  if (!hero || !section || !target || !('IntersectionObserver' in win)) return;
  const mobile = win.matchMedia?.('(max-width: 680px)');
  const delay = win.setTimeout?.bind(win) ?? setTimeout;
  const cancelDelay = win.clearTimeout?.bind(win) ?? clearTimeout;
  let showTimer = null;
  let frame = null;
  let baselineHeight = win.innerHeight;
  const focusedField = () => section.contains(doc.activeElement) &&
    !!doc.activeElement?.matches('input, textarea, select, [contenteditable="true"]');
  const canShow = () => {
    if (!(mobile?.matches ?? win.innerWidth <= 680) || focusedField()) return false;
    const viewport = win.visualViewport;
    const height = viewport?.height ?? win.innerHeight;
    // Keep the largest recent unoccluded height: covers visualViewport keyboards
    // and browsers that resize the layout viewport. Address-bar changes are smaller.
    const keyboardLikely = baselineHeight - height > Math.max(150, baselineHeight * .25);
    if (keyboardLikely || (viewport?.scale ?? 1) > 1.05) return false;
    baselineHeight = Math.max(baselineHeight, win.innerHeight, height);
    const heroRect = hero.getBoundingClientRect();
    const orderRect = section.getBoundingClientRect();
    // Spatial buffers plus delayed reveal prevent boundary flicker. A Hero CTA
    // below the fold is not considered "passed", even if it is not visible yet.
    const heroPassed = heroRect.bottom <= -16;
    const nearOrder = orderRect.top <= height + 128 && orderRect.bottom >= -32;
    return heroPassed && !nearOrder;
  };
  const hide = () => {
    if (showTimer !== null) { cancelDelay(showTimer); showTimer = null; }
    if (bar.contains(doc.activeElement)) target.focus({ preventScroll: true });
    bar.classList.toggle('is-hidden', true);
  };
  const update = () => {
    if (!canShow()) { hide(); return; }
    if (!bar.classList.contains('is-hidden') || showTimer !== null) return;
    showTimer = delay(() => {
      showTimer = null;
      if (canShow()) bar.classList.toggle('is-hidden', false);
    }, showDelayMs);
  };
  const schedule = () => {
    if (frame !== null) return;
    if (win.requestAnimationFrame) frame = win.requestAnimationFrame(() => { frame = null; update(); });
    else update();
  };
  const observer = new win.IntersectionObserver(schedule, { rootMargin: '0px 0px 128px 0px', threshold: 0 });
  observer.observe(hero);
  observer.observe(section);
  // Geometry checks use the viewport edge, with no mobile header occlusion offset.
  win.addEventListener('scroll', schedule, { passive: true });
  win.addEventListener('resize', schedule);
  win.addEventListener('orientationchange', () => { baselineHeight = win.innerHeight; schedule(); });
  mobile?.addEventListener?.('change', schedule);
  win.visualViewport?.addEventListener('resize', schedule);
  win.visualViewport?.addEventListener('scroll', schedule, { passive: true });
  doc.addEventListener('focusin', update);
  doc.addEventListener('focusout', () => { delay(schedule, 0); });
  update();
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
  const syncOffset = initAnchorOffsets();
  initOrderNavigation({ syncOffset });
  initStickyOrder();
}
