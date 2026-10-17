// Compatibility content renderer; layout selection lives in landing-render.mjs.
import { renderDocument } from './document-render.mjs';
import { replaceOne } from './html.mjs';
import { renderHero } from './sections/hero.mjs';
import { renderFeatures } from './sections/features.mjs';
import { renderSpecifications } from './sections/specifications.mjs';
import { renderOrder } from './sections/order.mjs';
export function renderProduct(original, config) {
  const out = renderDocument(original, config);
  for (const [pattern, render] of [
    [/<section class="hero">[\s\S]*?<\/section>/, renderHero],
    [/<section class="section features-section"[\s\S]*?<\/section>/, renderFeatures],
    [/<section class="section details-section"[\s\S]*?<\/section>/, renderSpecifications],
    [/<section class="order-section"[\s\S]*?<\/section>/, renderOrder],
  ]) out.html = replaceOne(out.html, pattern, section => render(section, config));
  return out;
}
