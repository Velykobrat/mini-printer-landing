// Fixed token names define deterministic serialization order. No product/section imports.
const schema = {
  "background": {"type":"color"},
  "surface": {"type":"color"},
  "section-surface": {"type":"color"},
  "mint-surface": {"type":"color"},
  "text": {"type":"color"},
  "muted": {"type":"color"},
  "line": {"type":"color"},
  "accent": {"type":"color"},
  "accent-dark": {"type":"color"},
  "success": {"type":"color"},
  "error": {"type":"color"},
  "pill": {"type":"px","min":0,"max":2000},
  "container": {"type":"px","min":0,"max":2000},
  "section-space": {"type":"px","min":0,"max":2000},
  "body-size": {"type":"px","min":0,"max":2000},
  "label-size": {"type":"px","min":0,"max":2000},
  "radius-control": {"type":"px","min":0,"max":2000},
  "card-heading-tracking": {"type":"em","min":-0.1,"max":0.2},
  "font-family": {"type":"enum","values":["'Manrope', sans-serif", "system-ui, sans-serif"]},
  "radius-card": {"type":"px","min":0,"max":2000},
  "radius-panel": {"type":"px","min":0,"max":2000},
  "radius-panel-mobile": {"type":"px","min":0,"max":2000},
  "section-space-mobile": {"type":"px","min":0,"max":2000},
  "gutter": {"type":"px","min":0,"max":2000},
  "gutter-mobile": {"type":"px","min":0,"max":2000},
  "hero-size": {"type":"clamp"},
  "hero-size-tablet": {"type":"px","min":0,"max":2000},
  "hero-size-mobile": {"type":"clamp"},
  "heading-size": {"type":"clamp"},
  "heading-size-mobile": {"type":"px","min":0,"max":2000},
  "order-heading-size": {"type":"px","min":0,"max":2000},
  "order-heading-size-tablet": {"type":"px","min":0,"max":2000},
  "order-heading-size-mobile": {"type":"px","min":0,"max":2000},
  "header-surface": {"type":"color"},
  "sticky-surface": {"type":"color"},
  "on-accent": {"type":"color"},
  "pressed-ring": {"type":"color"},
  "subtle-accent": {"type":"color"},
  "saving-surface": {"type":"color"},
  "saving-text": {"type":"color"},
  "product-border": {"type":"color"},
  "input-surface": {"type":"color"},
  "focus-ring": {"type":"color"},
  "invalid-surface": {"type":"color"},
  "error-ring": {"type":"color"},
  "success-surface": {"type":"color"},
  "success-border": {"type":"color"},
  "error-surface": {"type":"color"},
  "error-border": {"type":"color"},
  "footer-surface": {"type":"color"},
};
const pocketStudio = {
  "background": "#fbf9f2",
  "surface": "#fff",
  "section-surface": "#f1f0e8",
  "mint-surface": "#eaf0ee",
  "text": "#1b1c18",
  "muted": "#60615c",
  "line": "#e5e5df",
  "accent": "#2b4cde",
  "accent-dark": "#1737c5",
  "success": "#237a45",
  "error": "#b42318",
  "pill": "999px",
  "container": "1160px",
  "section-space": "80px",
  "body-size": "16px",
  "label-size": "12px",
  "radius-control": "12px",
  "card-heading-tracking": "-.03em",
  "font-family": "'Manrope', sans-serif",
  "radius-card": "24px",
  "radius-panel": "32px",
  "radius-panel-mobile": "26px",
  "section-space-mobile": "52px",
  "gutter": "48px",
  "gutter-mobile": "32px",
  "hero-size": "clamp(43px, 4.6vw, 64px)",
  "hero-size-tablet": "46px",
  "hero-size-mobile": "clamp(36px, 11vw, 43px)",
  "heading-size": "clamp(28px, 3vw, 40px)",
  "heading-size-mobile": "29px",
  "order-heading-size": "44px",
  "order-heading-size-tablet": "36px",
  "order-heading-size-mobile": "34px",
  "header-surface": "#fbf9f2ed",
  "sticky-surface": "#fbf9f2f5",
  "on-accent": "#fff",
  "pressed-ring": "#ffffff26",
  "subtle-accent": "#edf0ff",
  "saving-surface": "#ffebe3",
  "saving-text": "#ad371a",
  "product-border": "#dfe7df",
  "input-surface": "#fbfaf6",
  "focus-ring": "#2b4cde12",
  "invalid-surface": "#fff4f2",
  "error-ring": "#b4231812",
  "success-surface": "#eef7f0",
  "success-border": "#c2dfcd",
  "error-surface": "#fff0ee",
  "error-border": "#edc4bf",
  "footer-surface": "#eeede5"
};
function freeze(value) { Object.values(value).forEach(v => { if (v && typeof v === 'object') freeze(v); }); return Object.freeze(value); }
export const THEME_SCHEMA = freeze(schema);
export const DESIGN_THEMES = freeze({ 'pocket-studio': pocketStudio });
const fail = key => { throw new Error('Invalid design theme: ' + key); };
function exactObject(value, keys, path) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype || Reflect.ownKeys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) fail(path);
}
export function validateTheme(tokens) {
  exactObject(tokens, Object.keys(schema), 'tokens');
  for (const [key, rule] of Object.entries(schema)) {
    const value = tokens[key];
    if (typeof value !== 'string' || value.length > 100 || /[\r\n]/.test(value)) fail(key);
    if (rule.type === 'color') { if (!/^#(?:[a-f0-9]{3}|[a-f0-9]{6}|[a-f0-9]{8})$/.test(value)) fail(key); }
    else if (rule.type === 'clamp') {
      const match = /^clamp\((\d{1,3})px, (\d{1,2}(?:\.\d{1,2})?)vw, (\d{1,3})px\)$/.exec(value);
      if (!match || +match[1] < 12 || +match[3] > 160 || +match[1] > +match[3] || +match[2] <= 0 || +match[2] > 20) fail(key);
    }
    else if (rule.type === 'enum') { if (!rule.values.includes(value)) fail(key); }
    else {
      const match = /^(-?(?:(?:0|[1-9]\d*)(?:\.\d+)?|\.\d+))(px|em)$/.exec(value);
      if (!match || match[2] !== rule.type || !Number.isFinite(Number(match[1])) || Number(match[1]) < rule.min || Number(match[1]) > rule.max) fail(key);
    }
  }
  return tokens;
}
export function resolveTheme(config) {
  exactObject(config, ['theme'], 'selection');
  if (typeof config.theme !== 'string' || !Object.hasOwn(DESIGN_THEMES, config.theme)) fail('unknown name');
  return validateTheme(DESIGN_THEMES[config.theme]);
}
