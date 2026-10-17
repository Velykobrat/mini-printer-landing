import { escapeHTML as escape } from '../html.mjs';
export function renderPrices(html, { pricing }) {
  const amount = value => `${new Intl.NumberFormat('uk-UA').format(value)} ${pricing.currencyLabel}`;
  const savings = pricing.referencePrice - pricing.price;
  const values = { current: amount(pricing.price), reference: amount(pricing.referencePrice), savings: amount(savings), discount: `−${Math.round(savings / pricing.referencePrice * 100)}%` };
  html = html.replace(/(<(?:strong|del|span)[^>]*data-price="(current|reference|savings|discount)"[^>]*>)[^<]*(<\/(?:strong|del|span)>)/g, (_m, open, key, close) => open + escape(values[key]) + close);
  return html;
}
