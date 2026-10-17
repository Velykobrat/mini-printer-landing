import { validateSections } from './section-config.js';
const fail = path => { throw new Error(`Invalid product configuration: ${path}`); };
const text = (value, path) => { if (typeof value !== 'string' || !value.trim() || value.length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(path); };
const object = (value, path) => { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path); };
const list = (value, path, min = 1, max = 30) => { if (!Array.isArray(value) || value.length < min || value.length > max) fail(path); };
const size = (value, path) => { if (!Number.isSafeInteger(value) || value < 1 || value > 10000) fail(path); };
const status = (value, path) => { if (!['confirmed', 'pending'].includes(value)) fail(path); };
export function validateMediaPath(value, type = 'image') {
  const pattern = type === 'video' ? /\.(mp4|webm)$/ : /\.(jpg|jpeg|webp|avif)$/;
  return typeof value === 'string' && /^\.\/images\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.[a-z0-9]+$/.test(value) && pattern.test(value);
}
export function validateProductConfig(c) {
  object(c, 'root');
  validateSections(c.sections);
  if (!['demo', 'sales'].includes(c.mode)) fail('mode');
  for (const key of ['product', 'pricing', 'media', 'commerce', 'cta', 'copy', 'seo']) object(c[key], key);
  for (const key of ['id', 'analyticsId', 'name', 'shortDescription', 'description']) text(c.product[key], `product.${key}`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.product.id) || !/^[a-z0-9_]+$/.test(c.product.analyticsId)) fail('product identifiers');
  const p = c.pricing;
  if (!Number.isFinite(p.price) || p.price <= 0 || !Number.isFinite(p.referencePrice) || p.referencePrice < p.price || p.referencePrice > 1e9) fail('pricing');
  if (!/^[A-Z]{3}$/.test(p.currency)) fail('pricing.currency');
  text(p.currencyLabel, 'pricing.currencyLabel');
  list(c.benefits, 'benefits', 4, 4); // Current approved layout has four icon slots.
  c.benefits.forEach((item, i) => { object(item, `benefits.${i}`); text(item.title, `benefits.${i}.title`); text(item.text, `benefits.${i}.text`); });
  list(c.specifications, 'specifications');
  c.specifications.forEach((item, i) => { text(item.label, `specifications.${i}.label`); text(item.value, `specifications.${i}.value`); });
  const hero = c.media.hero; object(hero, 'media.hero');
  if (!validateMediaPath(hero.src)) fail('media.hero.src');
  text(hero.alt, 'media.hero.alt'); size(hero.width, 'media.hero.width'); size(hero.height, 'media.hero.height');
  const video = c.media.video; object(video, 'media.video'); status(video.status, 'media.video.status');
  if (!validateMediaPath(video.poster) || (video.status === 'confirmed' && !validateMediaPath(video.src, 'video'))) fail('media.video');
  size(video.width, 'media.video.width'); size(video.height, 'media.video.height');
  list(c.scenarios, 'scenarios');
  for (const item of c.scenarios) { text(item.title, 'scenario.title'); text(item.text, 'scenario.text'); text(item.alt, 'scenario.alt'); size(item.width, 'scenario.width'); size(item.height, 'scenario.height'); if (!validateMediaPath(item.image)) fail('scenario.image'); }
  const entry = item => { object(item, 'commercial entry'); status(item.status, 'commercial status'); text(item.title, 'commercial title'); if (item.status === 'confirmed') text(item.text, 'confirmed commercial text'); else if (typeof item.text !== 'string') fail('pending commercial text'); };
  list(c.commerce.delivery, 'commerce.delivery'); c.commerce.delivery.forEach(entry);
  object(c.commerce.terms, 'commerce.terms'); Object.values(c.commerce.terms).forEach(entry);
  const kit = c.commerce.kit; object(kit, 'commerce.kit'); status(kit.status, 'commerce.kit.status'); text(kit.note, 'commerce.kit.note');
  list(kit.items, 'commerce.kit.items', kit.status === 'confirmed' ? 1 : 0);
  kit.items.forEach(item => { status(item.status, 'kit.item.status'); text(item.text, 'kit.item.text'); });
  list(c.faq, 'faq'); for (const pair of c.faq) { list(pair, 'faq pair', 2, 2); pair.forEach(value => text(value, 'faq text')); }
  for (const key of ['header', 'hero', 'secondary', 'orderTitle', 'submit', 'loading', 'sticky']) text(c.cta[key], `cta.${key}`);
  for (const key of ['heroLines', 'featureHeadingLines', 'videoHeadingLines', 'videoFallbackLines']) { list(c.copy[key], `copy.${key}`, 2, 2); c.copy[key].forEach(value => text(value, `copy.${key}`)); }
  for (const key of ['videoLabel', 'videoNote', 'videoFallbackAlt', 'kitPaperNote', 'scenariosTitle', 'scenariosEyebrow', 'videoEyebrow', 'deliveryEyebrow', 'deliveryTitle', 'kitTitle', 'faqEyebrow', 'faqTitle']) text(c.copy[key], `copy.${key}`);
  for (const key of ['title', 'description', 'socialDescription', 'imageAlt']) text(c.seo[key], `seo.${key}`);
  let canonical;
  try { canonical = new URL(c.seo.canonical); } catch { fail('seo.canonical'); }
  if (canonical.protocol !== 'https:' || canonical.username || canonical.password || canonical.search || canonical.hash || canonical.href !== c.seo.canonical || !canonical.pathname.endsWith('/')) fail('seo.canonical');
  if (!validateMediaPath(c.seo.image)) fail('seo.image');
  size(c.seo.imageWidth, 'seo.imageWidth'); size(c.seo.imageHeight, 'seo.imageHeight');
  return c;
}
export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}
