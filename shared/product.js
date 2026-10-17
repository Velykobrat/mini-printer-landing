import { PRODUCT_CONFIG } from './product-config.js';
export const PRODUCT = Object.freeze({ ...PRODUCT_CONFIG.product, ...PRODUCT_CONFIG.pricing });
export const formatPrice = (value) => `${new Intl.NumberFormat('uk-UA').format(value)} ${PRODUCT.currencyLabel}`;
export const SAVINGS = PRODUCT.referencePrice - PRODUCT.price;
export const DISCOUNT = Math.round(SAVINGS / PRODUCT.referencePrice * 100);
