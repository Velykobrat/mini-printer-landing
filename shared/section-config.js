export const SECTION_IDS = Object.freeze(['hero', 'features', 'scenarios', 'video', 'specifications', 'delivery', 'faq', 'order']);
export const DEFAULT_SECTIONS = Object.freeze(SECTION_IDS.map((id, index) => Object.freeze({ id, enabled: true, order: (index + 1) * 10 })));

export function validateSections(sections) {
  const fail = () => { throw new Error('Invalid sections: provide each supported id once, boolean enabled and unique integer order (0–1000).'); };
  if (!Array.isArray(sections) || sections.length !== SECTION_IDS.length) fail();
  const ids = new Set(); const orders = new Set();
  for (const item of sections) {
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
      Object.keys(item).sort().join(',') !== 'enabled,id,order' ||
      !SECTION_IDS.includes(item.id) || typeof item.enabled !== 'boolean' ||
      !Number.isSafeInteger(item.order) || item.order < 0 || item.order > 1000 ||
      ids.has(item.id) || orders.has(item.order)) fail();
    ids.add(item.id); orders.add(item.order);
  }
  return [...sections].sort((a, b) => a.order - b.order);
}
