export const PRODUCT = Object.freeze({
  id: 'mini-printer',
  name: 'Mini Printer',
  currency: 'UAH',
  price: 800,
  referencePrice: 1200,
});
export const formatPrice = (value) => `${new Intl.NumberFormat('uk-UA').format(value)} грн`;
export const SAVINGS = PRODUCT.referencePrice - PRODUCT.price;
export const DISCOUNT = Math.round(SAVINGS / PRODUCT.referencePrice * 100);
