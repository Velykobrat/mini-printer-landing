import assert from 'node:assert/strict';

export async function verifyPremiumExperience({ browser, baseURL }) {
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await context.addInitScript(() => {
    window.qaLayoutShifts = 0;
    window.qaLayoutShiftSupported = !!PerformanceObserver.supportedEntryTypes?.includes('layout-shift');
    if (window.qaLayoutShiftSupported) {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.qaLayoutShifts += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    }
  });
  let releaseRequest;
  let orderStatus = 503;
  let orders = 0;
  let requestGate = new Promise(resolve => { releaseRequest = resolve; });
  await context.route('**/api/order', async route => {
    orders++;
    await requestGate;
    return route.fulfill({ status: orderStatus, contentType: 'application/json', body: JSON.stringify({ success: orderStatus === 200 }) });
  });
  const page = await context.newPage();
  try {
    await page.goto(baseURL.href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const initialLayoutShift = await page.evaluate(() => window.qaLayoutShifts);
    const layoutShiftObserverSupported = await page.evaluate(() => window.qaLayoutShiftSupported);
    await page.locator('#consent-reject').click();
    const cta = page.locator('.hero__actions .button');
    const before = await cta.boundingBox();
    await cta.hover();
    await page.waitForTimeout(180);
    assert.deepEqual(await cta.boundingBox(), before, 'Hover must not move or resize the CTA');
    await page.mouse.down();
    assert.deepEqual(await cta.boundingBox(), before, 'Active state must not move the CTA');
    await page.mouse.move(0, 0); await page.mouse.up();
    await page.keyboard.press('Tab'); await cta.focus();
    assert.equal(await cta.evaluate(node => getComputedStyle(node).outlineStyle), 'solid');

    // Reveal only when in view; no classes that hide content while waiting.
    const heading = page.locator('.demo-grid .section-heading');
    await heading.evaluate(node => {
      window.qaRevealStarts = 0;
      node.addEventListener('animationstart', event => { if (event.animationName === 'section-arrive') window.qaRevealStarts++; });
      node.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await page.waitForFunction(() => document.querySelector('.demo-grid .section-heading').classList.contains('reveal-once'));
    await page.waitForTimeout(400);
    const revealCount = await page.evaluate(() => window.qaRevealStarts);
    assert.equal(revealCount, 1);
    const beforeRevealScroll = await page.evaluate(() => window.qaLayoutShifts);
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await heading.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => window.qaRevealStarts), revealCount, 'Reveal must never replay');
    const revealLayoutShift = await page.evaluate(() => window.qaLayoutShifts) - beforeRevealScroll;
    assert(revealLayoutShift < .001, `Unexpected layout shift on reveal: ${revealLayoutShift}`);
    assert.equal(await page.locator('.hero .reveal-once, .feature.reveal-once, .experience-card.reveal-once, #order .reveal-once').count(), 0);

    const summary = page.locator('.faq summary').first();
    await summary.focus(); await page.keyboard.press('Enter');
    await page.waitForTimeout(180);
    assert.equal(await page.locator('.faq details').first().getAttribute('open'), '');
    assert.equal(await page.locator('.faq details').first().locator('p').isVisible(), true);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.faq details').first().getAttribute('open'), null);

    await page.locator('#customer-name').fill('Тест');
    await page.locator('#customer-phone').fill('0991234567');
    await page.locator('#order-form button[type="submit"]').click();
    await page.waitForSelector('#order-form[aria-busy="true"]');
    assert.equal(await page.locator('#order-form button[type="submit"]').isDisabled(), true);
    assert.equal(await page.locator('#customer-name').evaluate(node => node.readOnly), true);
    assert.equal(await page.locator('#order-form button[type="submit"]').evaluate(node => getComputedStyle(node).cursor), 'progress');
    releaseRequest();
    await page.waitForSelector('.form-status--error');
    assert.equal(await page.locator('#customer-name').inputValue(), 'Тест');
    assert.equal(await page.locator('#form-status').evaluate(node => getComputedStyle(node).borderTopStyle), 'solid');
    orderStatus = 200; requestGate = Promise.resolve();
    await page.locator('#order-form button[type="submit"]').click();
    await page.waitForSelector('.form-status--success');
    assert.equal(await page.locator('#customer-name').inputValue(), '');
    assert.equal(orders, 2);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelectorAll('.reveal-once').length === 0);
    await summary.focus(); await page.keyboard.press('Enter');
    const reducedAnswer = await page.locator('.faq details').first().locator('p').evaluate(node => getComputedStyle(node).animationName);
    assert.equal(reducedAnswer, 'none');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');

    for (const width of [320, 390, 1440]) {
      const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 1000 } });
      try {
        const noPage = await noJS.newPage(); await noPage.goto(baseURL.href, { waitUntil: 'networkidle' });
        assert.equal(await noPage.locator('.hero h1').isVisible(), true);
        assert.equal(await noPage.locator('.hero img').isVisible(), true);
        assert.equal(await noPage.locator('#scenarios .section-heading').evaluate(node => getComputedStyle(node).opacity), '1');
        assert.equal(await noPage.locator('.reveal-once').count(), 0);
        await noPage.locator('.faq summary').first().focus(); await noPage.keyboard.press('Enter');
        assert.equal(await noPage.locator('.faq details').first().locator('p').isVisible(), true);
        assert(await noPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      } finally { await noJS.close(); }
    }
    const reduced = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
    try {
      const reducedPage = await reduced.newPage(); await reducedPage.goto(baseURL.href, { waitUntil: 'networkidle' });
      await reducedPage.locator('#scenarios').scrollIntoViewIfNeeded();
      assert.equal(await reducedPage.locator('.reveal-once').count(), 0);
    } finally { await reduced.close(); }
    const unavailableMotion = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      await unavailableMotion.route('**/experience.js', route => route.abort());
      const fallbackPage = await unavailableMotion.newPage();
      await fallbackPage.goto(baseURL.href, { waitUntil: 'networkidle' });
      await fallbackPage.waitForFunction(() => document.getElementById('order-form').noValidate === true);
      assert.equal(await fallbackPage.locator('#scenarios .section-heading').evaluate(node => getComputedStyle(node).opacity), '1');
      assert.equal(await fallbackPage.locator('.reveal-once').count(), 0);
      await fallbackPage.locator('.hero__actions .button').click();
      assert.equal(await fallbackPage.locator('#order').evaluate(node => node === document.activeElement), true);
      await fallbackPage.locator('#order-form button[type="submit"]').click();
      await fallbackPage.waitForSelector('#customer-name[aria-invalid="true"]');
    } finally { await unavailableMotion.close(); }
    const touch = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    try {
      const touchPage = await touch.newPage(); await touchPage.goto(baseURL.href, { waitUntil: 'networkidle' });
      await touchPage.locator('#consent-reject').tap();
      assert.equal(await touchPage.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches), false);
      await touchPage.locator('.hero__actions .button').tap();
      assert.equal(await touchPage.locator('#order').evaluate(node => node === document.activeElement), true);
      assert.equal(await touchPage.locator('.mobile-order').isVisible(), false);
    } finally { await touch.close(); }
    assert.deepEqual(errors, []);
    return { layoutShiftObserverSupported, initialLayoutShift: layoutShiftObserverSupported ? initialLayoutShift : null,
      revealLayoutShift: layoutShiftObserverSupported ? revealLayoutShift : null, revealCount,
      noJS: [320, 390, 1440], reducedMotion: 'PASS', unavailableMotionModule: 'PASS', touch: 'PASS', formStates: 'PASS', hoverActiveFocus: 'PASS' };
  } finally { releaseRequest?.(); await context.close(); }
}
