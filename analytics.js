import { PRODUCT } from './shared/product.js';
import { ANALYTICS } from './analytics-config.js';

// Only allowlisted parameters leave this module. Never forward form/URL values.
export function createAnalytics({ enabled = false, hasConsent = () => false, send = () => {} } = {}) {
  const sent = new Set();
  return function track(event, details = {}) {
    try {
      if (!enabled || !hasConsent()) return false;
      let payload;
      let key;
      if (event === 'order_click') {
        payload = { product: 'mini_printer', cta_location: ['header', 'hero', 'sticky_bar'].includes(details.cta_location) ? details.cta_location : 'other' };
      } else if (['view_item', 'begin_checkout', 'generate_lead'].includes(event)) {
        key = event === 'view_item' ? event : `${event}:${Number.isSafeInteger(details.attempt) ? details.attempt : 0}`;
        if (sent.has(key)) return false;
        payload = { product: 'mini_printer', currency: PRODUCT.currency, value: PRODUCT.price };
        if (event !== 'generate_lead') payload.items = [{ item_id: PRODUCT.id, item_name: PRODUCT.name, price: PRODUCT.price, quantity: 1 }];
      } else return false;
      if (send(event, payload) === false) return false;
      if (key) sent.add(key);
      return true;
    } catch { return false; }
  };
}

const clients = new WeakMap();
export function createGoogleTag({ window: win = window, document: doc = document, config = ANALYTICS,
  hasConsent = () => false } = {}) {
  if (clients.has(win)) return clients.get(win);
  let active = false;
  let ready = false;
  let initialized = false;
  let pageViewed = false;
  let failed = false;
  let script;
  let timer;
  let queue = [];
  const disableKey = `ga-disable-${config.measurementId}`;
  win[disableKey] = true;
  const allowed = () => {
    try { return active && config.enabled && win.location.hostname === config.hostname && hasConsent(); }
    catch { return false; }
  };
  function command() { win.dataLayer.push(arguments); }
  const flush = () => {
    if (!ready || !allowed()) return;
    if (!pageViewed) {
      command('event', 'page_view', { page_location: config.pageLocation, page_title: 'Mini Printer', page_referrer: '' });
      pageViewed = true;
    }
    for (const [event, payload] of queue) command('event', event, payload);
    queue = [];
  };
  const client = {
    enable() {
      active = true;
      if (!allowed() || failed) return false;
      win[disableKey] = false;
      if (initialized) {
        command('consent', 'update', { analytics_storage: 'granted' });
        flush();
        return true;
      }
      initialized = true;
      win.dataLayer = win.dataLayer || [];
      win.gtag = (...args) => command(...args);
      command('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      command('set', 'ads_data_redaction', true);
      command('set', 'url_passthrough', false);
      command('js', new Date());
      command('consent', 'update', { analytics_storage: 'granted' });
      command('config', config.measurementId, { send_page_view: false,
        allow_google_signals: false, allow_ad_personalization_signals: false,
        cookie_expires: 15552000, cookie_update: false,
        page_location: config.pageLocation, page_referrer: '', page_title: 'Mini Printer',
        ...(config.debug ? { debug_mode: true } : {}) });
      script = doc.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.measurementId)}`;
      script.referrerPolicy = 'no-referrer';
      const fail = () => {
        failed = true; ready = false; queue = []; win[disableKey] = true;
        script.onload = null; script.onerror = null; script.remove();
        win.clearTimeout(timer);
      };
      script.onerror = fail;
      script.onload = () => { win.clearTimeout(timer); ready = true; flush(); };
      timer = win.setTimeout(fail, config.loadTimeoutMs);
      doc.head.append(script);
      return true;
    },
    disable() {
      active = false;
      win[disableKey] = true;
      queue = [];
      if (initialized && !ready) {
        win.clearTimeout(timer);
        script.onload = null; script.onerror = null; script.remove();
        win.dataLayer.length = 0;
        failed = true; // Reload required after cancelling an in-flight tag.
      }
      // Do not send consent pings after withdrawal. The opt-out flag stays set.
    },
    send(event, payload) {
      if (!allowed() || failed || !initialized) return false;
      if (ready) command('event', event, payload);
      else if (queue.length < 50) queue.push([event, payload]);
      else return false;
      return true;
    },
  };
  clients.set(win, client);
  return client;
}
