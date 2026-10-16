import { PRODUCT } from './shared/product.js';

const allowed = new Set(['view_item', 'begin_checkout', 'generate_lead']);
export function createAnalytics({ enabled = false, hasConsent = () => false, send = () => {} } = {}) {
  const sent = new Set();
  return function track(event) {
    if (!enabled || !allowed.has(event) || sent.has(event)) return false;
    try { if (!hasConsent()) return false; } catch { return false; }
    // Construct the entire payload here; callers cannot attach form values.
    const payload = { currency: PRODUCT.currency, value: PRODUCT.price,
      items: [{ item_id: PRODUCT.id, item_name: PRODUCT.name, price: PRODUCT.price, quantity: 1 }] };
    try {
      if (send(event, payload) === false) return false;
      sent.add(event);
      return true;
    } catch { return false; } // Analytics must never block an order.
  };
}
