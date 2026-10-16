import { ANALYTICS } from './analytics-config.js';

export function clearAnalyticsCookies(doc, hostname) {
  try {
    const names = doc.cookie.split(';').map(part => part.trim().split('=')[0]).filter(name => /^_ga(?:_|$)/.test(name));
    const parts = hostname.split('.');
    const domains = ['', ...parts.map((_, index) => parts.slice(index).join('.')).filter(domain => domain.includes('.'))];
    for (const name of names) for (const domain of domains) {
      doc.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? '; domain=' + domain : ''}`;
    }
  } catch { /* Cookie access may be blocked. */ }
}

export function createConsent({ window: win = window, document: doc = document, config = ANALYTICS,
  now = () => Date.now(), onChange = () => {} } = {}) {
  let choice = null;
  const notify = () => { try { onChange(choice === 'granted'); } catch { /* Consent cannot break the site. */ } };
  const read = () => {
    try {
      const record = JSON.parse(win.localStorage.getItem(config.storageKey));
      return record?.version === 1 && ['granted', 'denied'].includes(record.choice) &&
        Number.isFinite(record.time) && record.time <= now() && now() - record.time < config.consentLifetimeMs ? record.choice : null;
    } catch { return null; }
  };
  const revoke = () => { notify(); clearAnalyticsCookies(doc, win.location.hostname); };
  choice = read();
  const controller = {
    get choice() { return choice; },
    hasConsent() {
      if (choice === 'granted' && read() !== 'granted') { choice = null; revoke(); }
      return choice === 'granted';
    },
    choose(next) {
      if (!['granted', 'denied'].includes(next)) return false;
      if (next === 'denied') { choice = 'denied'; revoke(); }
      let saved = false;
      try {
        win.localStorage.setItem(config.storageKey, JSON.stringify({ version: 1, choice: next, time: now() }));
        saved = read() === next;
      } catch { /* Fail closed when storage is unavailable. */ }
      if (!saved) {
        try { win.localStorage.removeItem(config.storageKey); } catch { /* Inaccessible storage cannot be cleared. */ }
      }
      choice = saved ? next : 'denied';
      if (choice === 'granted') notify(); else revoke();
      return saved;
    },
    start() { if (choice !== 'granted') clearAnalyticsCookies(doc, win.location.hostname); notify(); },
  };
  win.addEventListener('storage', event => {
    if (event.key !== config.storageKey && event.key !== null) return;
    choice = read();
    if (choice === 'granted') notify(); else revoke();
  });
  doc.addEventListener('visibilitychange', () => { controller.hasConsent(); });
  return controller;
}

export function initConsentUI({ document: doc = document, consent } = {}) {
  const panel = doc.getElementById('analytics-consent');
  const settings = doc.getElementById('cookie-settings');
  if (!panel || !settings) return;
  const status = doc.getElementById('consent-status');
  const withdraw = doc.getElementById('consent-withdraw');
  const refresh = () => { withdraw.hidden = consent.choice !== 'granted'; };
  panel.hidden = consent.choice !== null;
  refresh();
  for (const [id, choice] of [['consent-accept', 'granted'], ['consent-reject', 'denied'], ['consent-withdraw', 'denied']]) {
    const button = doc.getElementById(id);
    button.disabled = false;
    button.addEventListener('click', () => {
      const saved = consent.choose(choice);
      refresh();
      if (saved) {
        if (panel.contains(doc.activeElement)) settings.focus({ preventScroll: true });
        panel.hidden = true;
      } else status.textContent = 'Не вдалося зберегти вибір. Аналітику вимкнено. Замовлення працює без cookies.';
    });
  }
  settings.addEventListener('click', () => {
    refresh(); panel.hidden = false; status.textContent = '';
    panel.focus({ preventScroll: true });
    panel.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
}
