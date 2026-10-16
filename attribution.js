// Marketing taxonomy, not free text: no per-person IDs, URLs or arbitrary labels.
// Campaign/creative/keyword counters can describe any future campaign.
export const ATTRIBUTION = Object.freeze({
  storageKey: 'mini-printer:session-attribution:v1',
  maxQueryLength: 2048,
  maxValueLength: 32,
  maxRecordLength: 512,
});
const rules = Object.freeze({
  utm_source: /^(?:instagram|facebook|tiktok|google|bing|youtube|telegram|newsletter)$/,
  utm_medium: /^(?:cpc|ppc|paid_social|paid_search|social|organic|email|referral|display|affiliate)$/,
  utm_campaign: /^mp-20\d{2}(?:0[1-9]|1[0-2])-[1-9]\d{0,2}$/,
  utm_content: /^(?:image|video|carousel|story|reel|search|display|text)-[1-9]\d{0,2}(?:-[ab])?$/,
  utm_term: /^(?:kw-[1-9]\d{0,2}|mini-printer|thermal-printer|photo-printer|sticker-printer)$/,
});
const fields = Object.freeze({ utm_source: 'campaign_source', utm_medium: 'campaign_medium',
  utm_campaign: 'campaign_name', utm_content: 'campaign_content', utm_term: 'campaign_term' });

export function sanitizeUTM(input) {
  const clean = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return clean;
  for (const [key, rule] of Object.entries(rules)) {
    if (!Object.hasOwn(input, key)) continue;
    const value = input[key];
    if (typeof value !== 'string' || value.length > ATTRIBUTION.maxValueLength || /[^a-zA-Z0-9_-]/.test(value)) continue;
    const normalized = value.toLowerCase();
    if (rule.test(normalized)) clean[key] = normalized;
  }
  return clean;
}

export function parseUTM(search) {
  if (typeof search !== 'string' || search.length > ATTRIBUTION.maxQueryLength) return {};
  const params = new URLSearchParams(search);
  const candidate = {};
  for (const key of Object.keys(rules)) {
    const values = params.getAll(key);
    if (values.length === 1) candidate[key] = values[0]; // Ambiguous duplicate keys are dropped.
  }
  return sanitizeUTM(candidate);
}

export function campaignParameters(input) {
  return Object.fromEntries(Object.entries(sanitizeUTM(input)).map(([key, value]) => [fields[key], value]));
}

export function createAttribution({ window: win = window, hasConsent = () => false } = {}) {
  const clear = () => {
    // Removal is allowed without consent; do not read stored marketing data first.
    try { win.sessionStorage.removeItem(ATTRIBUTION.storageKey); } catch { /* Storage may be blocked. */ }
  };
  return {
    clear,
    get() {
      try {
        if (!hasConsent()) { clear(); return {}; }
        const storage = win.sessionStorage;
        const saved = storage.getItem(ATTRIBUTION.storageKey);
        let utm;
        if (saved === null) {
          // Read the URL only now. Never snapshot it in memory before consent.
          utm = parseUTM(win.location.search);
        } else {
          try {
            const record = saved.length <= ATTRIBUTION.maxRecordLength ? JSON.parse(saved) : null;
            utm = record?.version === 1 ? sanitizeUTM(record.utm) : {};
          } catch { utm = {}; }
          // An invalid/direct first touch stays empty; later campaigns cannot replace it.
        }
        const record = JSON.stringify({ version: 1, utm });
        if (record !== saved) storage.setItem(ATTRIBUTION.storageKey, record);
        // Do not return data if storage silently refused the write.
        if (storage.getItem(ATTRIBUTION.storageKey) !== record) return {};
        return utm;
      } catch {
        clear();
        return {}; // Unavailable storage/consent never interrupts GA4 or ordering.
      }
    },
  };
}
