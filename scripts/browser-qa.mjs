// Optional real-browser QA. Playwright is supplied by the environment, not a site dependency.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyPremiumExperience } from './premium-qa.mjs';

const moduleName = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = await import(path.isAbsolute(moduleName) ? pathToFileURL(moduleName).href : moduleName);
const baseURL = new URL(process.env.QA_BASE_URL || 'http://127.0.0.1:4173');
assert(['localhost', '127.0.0.1', '[::1]'].includes(baseURL.hostname), 'Run this QA only against the local offline dev server.');
const root = fileURLToPath(new URL('../', import.meta.url));
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const errors = [];
const results = { layouts: [], sticky: [], orders: 0, productionDemoHidden: false };
const geometry = async page => page.evaluate(() => {
  const hero = document.querySelector('.hero__actions a[href="#order"]').getBoundingClientRect();
  const order = document.getElementById('order').getBoundingClientRect();
  return { heroBottom: hero.bottom, orderTop: order.top, height: visualViewport?.height ?? innerHeight };
});
const scrollPastHero = async page => {
  // Testing an arbitrary section's visibility does not establish that the CTA passed.
  await page.evaluate(() => {
    document.activeElement?.blur();
    const hero = document.querySelector('.hero__actions a[href="#order"]').getBoundingClientRect();
    scrollTo({ top: scrollY + hero.bottom + 32, behavior: 'instant' });
  });
  const rect = await geometry(page);
  assert(rect.heroBottom <= -16 && rect.orderTop > rect.height + 128, JSON.stringify(rect));
  await page.waitForFunction(() => !document.querySelector('.mobile-order').classList.contains('is-hidden'));
};

try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  // All order requests are intercepted. No real Telegram or provider requests.
  let orderStatus = 503;
  await context.route('**/api/order', route => {
    results.orders++;
    return route.fulfill({ status: orderStatus, contentType: 'application/json',
      body: JSON.stringify({ success: orderStatus === 200 }) });
  });
  const page = await context.newPage();
  const tracking = [];
  const videoRequests = [];
  page.on('request', request => {
    if (/googletagmanager|google-analytics/.test(request.url())) tracking.push(request.url());
    if (/\.mp4(?:\?|$)/.test(request.url())) videoRequests.push(request.url());
  });
  await page.goto(baseURL.href, { waitUntil: 'networkidle' });
  await page.locator('#consent-reject').click();
  await page.evaluate(() => document.fonts.ready);

  for (const width of [320, 375, 390, 430, 681, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
    assert.equal(await page.locator('.faq details').count(), 5);
    assert.equal(await page.locator('#reviews').isVisible(), false);
    if (width <= 680) {
      const positions = await page.evaluate(() => ['.hero h1', '.hero__description', '.hero__visual', '.hero__price', '.hero__actions']
        .map(selector => document.querySelector(selector).getBoundingClientRect().top));
      assert(positions.every((top, index) => index === 0 || top > positions[index - 1]));
      assert.equal(await page.locator('.nav').isVisible(), false);
      assert.equal(await page.locator('.header-pricing').isVisible(), true);
    } else {
      assert.deepEqual(await page.locator('.nav a').allTextContents(), ['Можливості', 'Доставка']);
      const nav = await page.locator('.nav').boundingBox();
      const cta = await page.locator('.header-order').boundingBox();
      assert(Math.abs(cta.x - nav.x - nav.width - 18) < 1);
    }
    assert.equal(await page.locator('#demo-title').innerText(), 'Mini Printer.\nМаленький принтер.');
    if (width >= 1200) {
      const heading = await page.locator('.demo-grid .section-heading').boundingBox();
      const video = await page.locator('.video-frame').boundingBox();
      assert(Math.abs(heading.y - video.y) < 1);
    }
    await page.locator('.hero__actions a[href="#order"]').click();
    const top = await page.locator('#order').evaluate(node => node.getBoundingClientRect().top);
    assert(top >= -1 && top < 100);
    assert.equal(await page.locator('.mobile-order').isVisible(), false);
    results.layouts.push(width);
  }

  for (const width of [375, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => { document.activeElement?.blur(); scrollTo({ top: 0, behavior: 'instant' }); });
    await page.waitForFunction(() => document.querySelector('.mobile-order').classList.contains('is-hidden'));
    await page.evaluate(() => {
      window.stickyQAObserver?.disconnect();
      window.stickyVisibilityChanges = [];
      window.stickyQAObserver = new MutationObserver(() => window.stickyVisibilityChanges.push(!document.querySelector('.mobile-order').classList.contains('is-hidden')));
      window.stickyQAObserver.observe(document.querySelector('.mobile-order'), { attributes: true, attributeFilter: ['class'] });
    });
    await scrollPastHero(page);
    await page.waitForTimeout(350); // Longer than the 180 ms reveal delay: detect repeated toggles.
    assert.equal(await page.evaluate(() => window.stickyVisibilityChanges.filter(Boolean).length), 1);
    await page.locator('.mobile-order a').click();
    assert.equal(await page.locator('.mobile-order').isVisible(), false);
    await page.locator('#customer-name').focus();
    await page.waitForTimeout(220);
    assert.equal(await page.locator('.mobile-order').isVisible(), false);
    // Keep focus in the form while scrolling away: focus independently suppresses the bar.
    await page.evaluate(() => {
      const hero = document.querySelector('.hero__actions a[href="#order"]').getBoundingClientRect();
      scrollTo({ top: scrollY + hero.bottom + 32, behavior: 'instant' });
    });
    await page.waitForTimeout(220);
    assert.equal(await page.locator('.mobile-order').isVisible(), false);
    await page.locator('#customer-name').blur();
    await page.waitForFunction(() => !document.querySelector('.mobile-order').classList.contains('is-hidden'));
    // Hide 128 px before the form enters the viewport, rather than after overlap.
    await page.evaluate(() => {
      const section = document.getElementById('order').getBoundingClientRect();
      scrollTo({ top: scrollY + section.top - innerHeight - 100, behavior: 'instant' });
    });
    await page.waitForFunction(() => document.querySelector('.mobile-order').classList.contains('is-hidden'));
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(220);
    assert.equal(await page.locator('.mobile-order').isVisible(), false);
    const reserve = await page.locator('.mobile-order').evaluate(node => ({ height: node.offsetHeight,
      css: getComputedStyle(document.documentElement).getPropertyValue('--mobile-bar-space') }));
    assert(reserve.css.includes('90px'));
    results.sticky.push({ width, result: 'top / passed CTA / stable reveal / form / focus / blur / return top: PASS' });
  }

  await page.locator('.faq summary').first().focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.faq details').first().getAttribute('open'), '');
  await page.locator('#customer-name').fill('Тест');
  await page.locator('#customer-phone').fill('0991234567');
  await page.locator('#order-form button[type="submit"]').click();
  await page.waitForFunction(() => document.getElementById('form-status').textContent.includes('тимчасово'));
  assert.equal(await page.locator('#customer-phone').inputValue(), '0991234567');
  orderStatus = 200;
  await page.locator('#order-form button[type="submit"]').click();
  await page.waitForFunction(() => document.getElementById('form-status').textContent.includes('Дякуємо'));
  assert.equal(await page.locator('#customer-phone').inputValue(), '');
  assert.equal(results.orders, 2);
  await page.locator('#cookie-settings').click();
  await page.locator('#consent-accept').click();
  assert.equal(tracking.length, 0, 'Local host must not load production analytics');

  await page.goto(new URL('/?reviews=demo', baseURL).href, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('#reviews-grid article').count(), 3);
  assert.equal(await page.locator('#reviews-demo-note').isVisible(), true);
  assert.equal(videoRequests.length, 0, 'preload=none: do not fetch MP4 before play');
  const beforeVideo = await page.locator('video').evaluate(video => video.getBoundingClientRect().height);
  await page.locator('video').evaluate(async video => { video.muted = true; await video.play(); });
  await page.waitForFunction(() => document.querySelector('video').currentTime > .2);
  await page.locator('video').evaluate(video => { video.pause(); video.currentTime = 30; });
  await page.waitForFunction(() => { const v = document.querySelector('video'); return !v.seeking && v.currentTime >= 30 && v.readyState >= 2; });
  assert(Math.abs(beforeVideo - await page.locator('video').evaluate(video => video.getBoundingClientRect().height)) < 1);

  // Synthetic production origin served from local sources; never access the real deployment.
  const production = await context.newPage();
  await production.route('https://mini-printer-landing.vercel.app/**', async route => {
    const url = new URL(route.request().url());
    const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1);
    const file = path.resolve(root, relative);
    if (path.relative(root, file).startsWith('..')) return route.abort();
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
    try { return await route.fulfill({ contentType: types[path.extname(file)] || 'application/octet-stream', body: await fs.readFile(file) }); }
    catch { return route.fulfill({ status: 404, body: '' }); }
  });
  await production.route(/googletagmanager|google-analytics/, route => route.abort());
  await production.goto('https://mini-printer-landing.vercel.app/?reviews=demo', { waitUntil: 'networkidle' });
  assert.equal(await production.locator('#reviews').isVisible(), false);
  assert.equal(await production.locator('#reviews-grid article').count(), 0);
  results.productionDemoHidden = true;
  results.premium = await verifyPremiumExperience({ browser, baseURL });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ...results, runtimeErrors: errors }, null, 2));
} finally { await browser.close(); }
