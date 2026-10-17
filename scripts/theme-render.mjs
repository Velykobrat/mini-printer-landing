import { DESIGN_CONFIG } from '../shared/design-config.js';
import { THEME_SCHEMA, resolveTheme, validateTheme } from '../shared/design-themes.js';

export function renderThemeTokens(tokens) {
  validateTheme(tokens);
  return Object.keys(THEME_SCHEMA).map(key => `  --${key}: ${tokens[key]};`).join('\n');
}
export function renderTheme(template, config = DESIGN_CONFIG) {
  const marker = '/* design-tokens */';
  if (template.split(marker).length !== 2) throw new Error('Expected exactly one design token slot');
  return template.replace(/\r\n/g, '\n').replace(marker, () => renderThemeTokens(resolveTheme(config)));
}
