import { PRODUCT_CONFIG } from './product-config.js';

// Compatibility facade: commercial facts are configured only in product-config.js.
export const SALES = Object.freeze({ ...PRODUCT_CONFIG.commerce, lifestyles: PRODUCT_CONFIG.scenarios, video: PRODUCT_CONFIG.media.video, faq: PRODUCT_CONFIG.faq });

export const REVIEWS = { mode: 'production', items: [] };
export const DEMO_REVIEWS = [
  { author: 'Приклад картки 01', text: 'Тут буде підтверджений досвід покупця: що друкували та як користувалися принтером.' },
  { author: 'Приклад картки 02', text: 'Тут можна розмістити реальний відгук про навчання, нотатки або щоденні списки.' },
  { author: 'Приклад картки 03', text: 'Тут буде відгук про замовлення й отримання після перевірки та згоди автора.' },
];

export function reviewState({ mode = REVIEWS.mode, items = REVIEWS.items, hostname = '' } = {}) {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  if (mode === 'demo' && local) return { demo: true, items: DEMO_REVIEWS };
  return { demo: false, items: items.filter(item => item.confirmed === true && typeof item.author === 'string' && item.author.trim() && typeof item.text === 'string' && item.text.trim()) };
}
