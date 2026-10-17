import { validateProductConfig } from '../../shared/product-config-validation.js';
import { escapeHTML as escape, replaceOne } from '../html.mjs';
import { renderPrices } from './prices.mjs';

export function renderHero(original, config) {
  const c = validateProductConfig(config);
  const { product: p, cta } = c;
  let html = renderPrices(original, c);
  const pair = (pattern, value) => { html = replaceOne(html, pattern, (_m, before, after) => before + escape(value) + after); };
  html = replaceOne(html, /(<h1>\s*)[^<]+(<br\s*\/?>\s*<span>)[^<]*(<\/span>)/,
    (_m, before, middle, after) => before + escape(c.copy.heroLines[0]) + middle + escape(c.copy.heroLines[1]) + after);
  pair(/(<p class="hero__description">\s*)[^<]*?(\s*<\/p>)/, p.shortDescription);
  html = replaceOne(html, /<div class="product-card">\s*<img[^>]+>/, image => {
    for (const [key, value] of Object.entries({ src: c.media.hero.src, alt: c.media.hero.alt, width: c.media.hero.width, height: c.media.hero.height })) image = image.replace(new RegExp(`${key}="[^"]*"`), () => `${key}="${escape(value)}"`);
    return image;
  });
  pair(/(<a class="button" href="#order" data-cta-location="hero">)[^<]*?(\s*<span)/, cta.hero);
  pair(/(<a class="text-link" href="#scenarios">\s*)[^<]*?(\s*<\/a>)/, cta.secondary);
  return html;
}
