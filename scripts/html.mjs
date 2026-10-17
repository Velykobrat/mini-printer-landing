export const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const serializeJSONLD = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
export function replaceOne(html, pattern, render) {
  if ([...html.matchAll(new RegExp(pattern.source, 'g'))].length !== 1) throw new Error(`Missing or ambiguous product slot: ${pattern.source}`);
  return html.replace(pattern, render);
}
