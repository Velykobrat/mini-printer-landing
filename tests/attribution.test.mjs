import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTRIBUTION, parseUTM, sanitizeUTM, campaignParameters, createAttribution } from '../attribution.js';
import { createAnalytics, createGoogleTag } from '../analytics.js';
import { createConsent } from '../consent.js';
import { ANALYTICS } from '../analytics-config.js';

const query = '?utm_source=instagram&utm_medium=paid_social&utm_campaign=mp-202610-1&utm_content=reel-2-a&utm_term=kw-3';
const expected = { utm_source: 'instagram', utm_medium: 'paid_social', utm_campaign: 'mp-202610-1', utm_content: 'reel-2-a', utm_term: 'kw-3' };
const campaign = { campaign_source: 'instagram', campaign_medium: 'paid_social', campaign_name: 'mp-202610-1', campaign_content: 'reel-2-a', campaign_term: 'kw-3' };
function setup({ search = query, session = new Map(), local = new Map() } = {}) {
  const events = new Map(); const docEvents = new Map(); const storageCalls = []; const scripts = []; const commands = [];
  let currentSearch = search; let urlReads = 0; let grants = 0;
  const win = { location: { hostname: ANALYTICS.hostname, get search() { urlReads++; return currentSearch; } },
    addEventListener(type, fn) { events.set(type, fn); },
    setTimeout: () => 1, clearTimeout() {},
    localStorage: { getItem: key => local.get(key) ?? null, setItem: (key, value) => local.set(key, value), removeItem: key => local.delete(key) },
    sessionStorage: { getItem(key) { storageCalls.push('get'); return session.get(key) ?? null; },
      setItem(key, value) { storageCalls.push('set'); session.set(key, value); }, removeItem(key) { storageCalls.push('remove'); session.delete(key); } } };
  const doc = { cookie: '', addEventListener(type, fn) { docEvents.set(type, fn); },
    createElement: () => ({ remove() {} }), head: { append(script) { scripts.push(script); } } };
  let attribution; let tag; let track;
  const consent = createConsent({ window: win, document: doc, now: () => 1000,
    onChange: granted => {
      if (granted) { grants++; attribution.get(); tag.enable(); track('view_item'); }
      else { tag.disable(); attribution.clear(); }
    } });
  attribution = createAttribution({ window: win, hasConsent: () => consent.hasConsent() });
  tag = createGoogleTag({ window: win, document: doc, hasConsent: () => consent.hasConsent(), getAttribution: () => attribution.get() });
  track = createAnalytics({ enabled: true, hasConsent: () => consent.hasConsent(), getAttribution: () => attribution.get(),
    send: (event, payload) => { commands.push({ event, payload }); return tag.send(event, payload); } });
  consent.start();
  return { win, doc, consent, attribution, tag, track, session, local, storageCalls, scripts, commands,
    get urlReads() { return urlReads; }, get grants() { return grants; }, setSearch(value) { currentSearch = value; },
    storageEvent() { events.get('storage')({ key: ANALYTICS.storageKey }); },
    tagEvents: () => (win.dataLayer || []).map(args => [...args]).filter(args => args[0] === 'event') };
}

test('all five UTM parameters map to native GA4 campaign fields', () => {
  assert.deepEqual(parseUTM(query), expected); assert.deepEqual(campaignParameters(expected), campaign);
  assert.deepEqual(parseUTM(query.replace('instagram', 'INSTAGRAM')), expected);
});
test('future campaign codes support all four requested advertising platforms without a campaign allowlist', () => {
  for (const source of ['instagram', 'facebook', 'tiktok', 'google']) {
    const utm = parseUTM(`?utm_source=${source}&utm_medium=cpc&utm_campaign=mp-203112-999&utm_content=video-123-b&utm_term=kw-999`);
    assert.equal(utm.utm_source, source); assert.equal(utm.utm_campaign, 'mp-203112-999');
    assert.equal(Object.keys(utm).length, 5);
  }
});
test('encoding decoded once; duplicate keys, malformed escapes, whitespace, fragments and unsupported keys rejected', () => {
  assert.deepEqual(parseUTM('?utm_source=%69nstagram&utm_campaign=mp%2D202610%2D1'), { utm_source: 'instagram', utm_campaign: 'mp-202610-1' });
  for (const search of ['?utm_source=google&utm_source=google', '?utm_source=%2567oogle', '?utm_source=%FF', '?utm_source=google+ads', '?utm_source=google%20', '?utm_source=google#phone', '?UTM_SOURCE=google']) assert.deepEqual(parseUTM(search), {});
  assert.deepEqual(parseUTM('?gclid=secret&fbclid=secret&utm_id=secret&phone=secret&utm_source=google'), { utm_source: 'google' });
});
test('length, invalid dates, arbitrary text and common PII never pass taxonomy validation', () => {
  const unsafe = ['alice', 'alice-smith', 'alice@example.com', '+380991234567', '0991234567', '192.168.1.1', 'https://example.com', '<script>', 'Анна', 'john_smith', 'mp-202613-1', 'mp-202600-1', 'mp-202610-0', 'mp-202610-1000', 'kw-0991234567', 'video-380991234567', 'google\n', 'kw-3\r\n', 'x'.repeat(33)];
  for (const value of unsafe) for (const key of Object.keys(expected)) assert.deepEqual(sanitizeUTM({ [key]: value }), {}, `${key}: ${value}`);
  assert.deepEqual(parseUTM('?utm_source=google&extra=' + 'a'.repeat(ATTRIBUTION.maxQueryLength)), {});
  assert.deepEqual(sanitizeUTM({ utm_source: {}, utm_medium: ['cpc'], utm_campaign: null }), {});
  assert.deepEqual(sanitizeUTM(Object.create({ utm_source: 'google' })), {});
});
test('no marketing storage reads/writes, URL reads, tag or events before consent or on rejection', () => {
  const env = setup(); env.attribution.get(); env.track('order_click'); env.consent.choose('denied');
  assert.equal(env.urlReads, 0); assert.equal(env.scripts.length, 0); assert.equal(env.commands.length, 0);
  assert(env.storageCalls.every(call => call === 'remove')); assert.equal(env.session.size, 0);
});
test('first consented touch survives reload; later URL parameters never replace it', () => {
  const env = setup(); env.consent.choose('granted');
  assert.deepEqual(env.attribution.get(), expected); assert.equal(env.urlReads, 1);
  env.setSearch('?utm_source=google&utm_campaign=mp-202611-2'); assert.deepEqual(env.attribution.get(), expected);
  const reload = setup({ session: env.session, local: env.local, search: '?utm_source=facebook' });
  assert.deepEqual(reload.attribution.get(), expected); assert.equal(reload.urlReads, 0);
});
test('direct/missing/invalid first-touch marker prevents later attribution overwrite', () => {
  for (const search of ['', '?utm_source=alice@example.com', '?gclid=not-captured']) {
    const env = setup({ search }); env.consent.choose('granted'); env.setSearch(query);
    assert.deepEqual(env.attribution.get(), {}); assert.equal(env.urlReads, 1);
    assert.deepEqual(JSON.parse(env.session.get(ATTRIBUTION.storageKey)), { version: 1, utm: {} });
  }
});
test('new tab storage starts a new browser-tab session without a custom GA session identifier', () => {
  const first = setup(); first.consent.choose('granted');
  const next = setup({ local: first.local, search: '?utm_source=tiktok' });
  assert.deepEqual(next.attribution.get(), { utm_source: 'tiktok' });
  assert.doesNotMatch(next.session.get(ATTRIBUTION.storageKey), /session_id|client_id|user_id|timestamp/);
});
test('acceptance uses only current URL; pre-consent landing URLs are not remembered in memory', () => {
  const env = setup(); env.setSearch('?utm_source=google'); env.consent.choose('granted');
  assert.deepEqual(env.attribution.get(), { utm_source: 'google' }); assert.equal(env.urlReads, 1);
});
test('withdrawal clears marketing storage, blocks events and does not backfill after reacceptance', () => {
  const env = setup(); env.consent.choose('granted'); env.scripts[0].onload();
  env.track('order_click', { cta_location: 'hero' }); const count = env.commands.length;
  env.consent.choose('denied'); assert.equal(env.session.size, 0); assert.deepEqual(env.attribution.get(), {});
  env.track('generate_lead', { attempt: 1 }); assert.equal(env.commands.length, count);
  env.setSearch('?utm_source=google'); env.consent.choose('granted'); env.track('order_click', { cta_location: 'header' });
  assert.equal(env.commands.at(-1).payload.campaign_source, 'google'); assert.equal(env.commands.at(-1).payload.campaign_name, undefined);
  assert.equal(env.scripts.length, 1); assert.equal(env.tagEvents().filter(args => args[1] === 'page_view').length, 1);
  assert.equal(env.commands.filter(item => item.event === 'generate_lead').length, 0);
});
test('cross-tab rejection clears each active tab attribution and prevents reloading a stale record', () => {
  const env = setup(); env.consent.choose('granted'); env.scripts[0].onload();
  env.local.set(ANALYTICS.storageKey, JSON.stringify({ version: 1, choice: 'denied', time: 1000 })); env.storageEvent();
  assert.equal(env.session.size, 0); assert.equal(env.track('begin_checkout'), false);
  const stale = new Map([[ATTRIBUTION.storageKey, JSON.stringify({ version: 1, utm: expected })]]);
  const reload = setup({ session: stale, local: env.local }); assert.equal(reload.session.size, 0); assert.equal(reload.urlReads, 0);
});
test('withdrawal during tag loading erases the attributed queue, even if a stale load callback runs', () => {
  const env = setup(); env.consent.choose('granted');
  env.track('begin_checkout', { attempt: 1 }); env.track('generate_lead', { attempt: 1 });
  const staleLoad = env.scripts[0].onload;
  env.consent.choose('denied'); staleLoad();
  assert.equal(env.session.size, 0); assert.equal(env.tagEvents().length, 0);
  assert.equal(env.track('order_click', { cta_location: 'sticky_bar' }), false);
  assert.equal(env.win['ga-disable-' + ANALYTICS.measurementId], true);
});
test('blocked storage/consent and silent write failure produce no attribution without breaking events', () => {
  const env = setup(); Object.defineProperty(env.win, 'sessionStorage', { get() { throw new Error('blocked'); } });
  assert.doesNotThrow(() => env.consent.choose('granted')); env.scripts[0].onload(); env.track('generate_lead');
  assert.equal(env.commands.at(-1).payload.campaign_source, undefined); assert.equal(env.commands.at(-1).event, 'generate_lead');
  const silent = setup(); silent.win.sessionStorage.setItem = () => {}; silent.consent.choose('granted'); assert.deepEqual(silent.attribution.get(), {});
  const throwing = createAttribution({ window: env.win, hasConsent() { throw new Error(); } }); assert.deepEqual(throwing.get(), {});
});
test('stored data is revalidated, extra keys discarded and corrupt records do not become a new touch', () => {
  const env = setup(); env.consent.choose('granted');
  env.session.set(ATTRIBUTION.storageKey, JSON.stringify({ version: 1, utm: { ...expected, utm_term: 'alice@example.com', phone: 'secret', gclid: 'secret' }, name: 'secret' }));
  const result = env.attribution.get(); assert.equal(result.utm_term, undefined); assert.equal(result.utm_source, 'instagram');
  assert.doesNotMatch(env.session.get(ATTRIBUTION.storageKey), /secret|alice|phone|gclid/);
  for (const corrupted of ['not-json', 'null', '{"version":9,"utm":{"utm_source":"google"}}', 'x'.repeat(ATTRIBUTION.maxRecordLength + 1)]) {
    env.session.set(ATTRIBUTION.storageKey, corrupted); assert.deepEqual(env.attribution.get(), {});
  }
});
test('campaign parameters enrich existing conversion events without new events or changed deduplication', () => {
  const env = setup(); env.consent.choose('granted');
  for (const event of ['order_click', 'begin_checkout', 'generate_lead']) env.track(event, { attempt: 1, cta_location: 'hero', name: 'secret' });
  env.track('begin_checkout', { attempt: 1 }); env.track('generate_lead', { attempt: 1 });
  env.scripts[0].onload();
  const actual = env.tagEvents(); assert.deepEqual(actual.map(args => args[1]), ['page_view', 'view_item', 'order_click', 'begin_checkout', 'generate_lead']);
  for (const args of actual.filter(args => args[1] !== 'view_item')) for (const [key, value] of Object.entries(campaign)) assert.equal(args[2][key], value);
  assert.equal(actual.at(-1)[2].value, 800); assert.doesNotMatch(JSON.stringify(actual), /secret|gclid|fbclid|session_start|first_visit|campaign_details/);
  assert.equal((env.win.dataLayer || []).filter(args => args[0] === 'config').length, 1);
  const config = [...env.win.dataLayer.find(args => args[0] === 'config')][2];
  for (const field of [...Object.keys(campaign), 'campaign_id']) assert.equal(config[field], '', 'raw query campaigns must not bypass event-level validation');
});
test('optional attribution failure cannot prevent analytics or accept caller-controlled fields', () => {
  const sent = []; const track = createAnalytics({ enabled: true, hasConsent: () => true, getAttribution() { throw new Error(); }, send: (event, params) => sent.push(params) });
  assert(track('generate_lead', { campaign_source: 'secret', phone: 'secret', attempt: 1 })); assert.equal(sent[0].campaign_source, undefined);
  const bad = createAnalytics({ enabled: true, hasConsent: () => true, getAttribution: () => ({ utm_source: 'alice@example.com', utm_campaign: 'mp-202610-1', phone: 'secret' }), send: (event, params) => sent.push(params) });
  bad('order_click'); assert.equal(sent[1].campaign_name, 'mp-202610-1'); assert.equal(sent[1].campaign_source, undefined); assert.doesNotMatch(JSON.stringify(sent), /secret|alice|phone/);
});
test('persisted denied/expired/unavailable consent cannot read or retain marketing attribution', () => {
  for (const record of [JSON.stringify({ version: 1, choice: 'denied', time: 1000 }), JSON.stringify({ version: 1, choice: 'granted', time: -ANALYTICS.consentLifetimeMs })]) {
    const env = setup({ local: new Map([[ANALYTICS.storageKey, record]]), session: new Map([[ATTRIBUTION.storageKey, JSON.stringify({ version: 1, utm: expected })]]) });
    assert.equal(env.session.size, 0); assert.equal(env.urlReads, 0); assert.equal(env.scripts.length, 0);
  }
  const env = setup(); env.win.localStorage.setItem = () => { throw new Error('blocked'); };
  assert.equal(env.consent.choose('granted'), false); assert.equal(env.urlReads, 0); assert.equal(env.session.size, 0);
});
