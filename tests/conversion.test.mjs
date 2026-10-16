import test from 'node:test';
import assert from 'node:assert/strict';
import { initOrderNavigation, initStickyOrder } from '../script.js';

class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener) { const listeners = this.listeners.get(type) || []; listeners.push(listener); this.listeners.set(type, listeners); }
  fire(type, event = {}) { for (const listener of this.listeners.get(type) || []) listener(event); }
}
class Node extends Events {
  constructor(doc, rect = { top: 0, bottom: 0 }) {
    super(); this.doc = doc; this.rect = rect; this.classes = new Set(); this.children = [];
    this.classList = { contains: key => this.classes.has(key), toggle: (key, on) => on ? this.classes.add(key) : this.classes.delete(key) };
  }
  contains(node) { return node === this || this.children.includes(node); }
  matches() { return !!this.editable; }
  getBoundingClientRect() { return this.rect; }
  focus(options) { this.focusOptions = options; this.doc.activeElement = this; }
  scrollIntoView(options) { (this.scrolls ||= []).push(options); }
}
function setup({ mobile = true, reduceMotion = false, hash = '', readyState = 'complete', observer = true, visualViewport = true } = {}) {
  const doc = new Events(); doc.readyState = readyState;
  const win = new Events(); win.innerHeight = 800; win.innerWidth = mobile ? 390 : 1440;
  const media = new Events(); media.matches = mobile;
  win.matchMedia = query => query.includes('max-width') ? media : { matches: reduceMotion };
  if (visualViewport) { win.visualViewport = new Events(); Object.assign(win.visualViewport, { height: 800, scale: 1 }); }
  win.location = { hash };
  win.history = { calls: [], pushState(_state, _title, value) { this.calls.push(value); win.location.hash = value; } };
  let timerID = 0; const timers = new Map(); const frames = [];
  win.setTimeout = (fn, delay) => { timers.set(++timerID, { fn, delay }); return timerID; };
  win.clearTimeout = id => timers.delete(id);
  win.requestAnimationFrame = fn => { frames.push(fn); return frames.length; };
  const frame = () => { while (frames.length) frames.shift()(); };
  const settle = () => { frame(); const queued = [...timers.values()]; timers.clear(); for (const timer of queued) timer.fn(); frame(); };
  const hero = new Node(doc, { top: 300, bottom: 354 });
  const section = new Node(doc, { top: 3000, bottom: 3700 });
  const target = new Node(doc); const field = new Node(doc); field.editable = true; section.children = [target, field];
  const bar = new Node(doc); const stickyLink = new Node(doc); bar.children = [stickyLink];
  const header = new Node(doc, { top: 0, bottom: 66 });
  const headerLink = new Node(doc); const heroLink = hero;
  const links = [headerLink, heroLink, stickyLink];
  doc.getElementById = id => ({ order: target, 'order-section': section })[id];
  doc.querySelector = selector => ({ '.mobile-order': bar, '.hero__actions a[href="#order"]': hero, '.header': header })[selector];
  doc.querySelectorAll = selector => selector === 'a[href="#order"]' ? links : [];
  let notify;
  const observed = [];
  if (observer) win.IntersectionObserver = class { constructor(callback) { notify = callback; } observe(node) { observed.push(node); } };
  const tick = () => { notify?.([]); frame(); };
  const hidden = () => bar.classes.has('is-hidden');
  return { doc, win, media, hero, section, target, field, bar, stickyLink, headerLink, links, timers, observed, frame, settle, tick, hidden };
}
function sticky(options) { const ui = setup(options); initStickyOrder({ document: ui.doc, window: ui.win }); return ui; }
const passHero = ui => { ui.hero.rect = { top: -74, bottom: -20 }; ui.tick(); };

test('sticky starts hidden, stays hidden while Hero CTA visible, shows after it passes', () => {
  const ui = sticky(); assert.deepEqual(ui.observed, [ui.hero, ui.section]); assert(ui.hidden()); ui.settle(); assert(ui.hidden());
  passHero(ui); assert(ui.hidden(), 'reveal waits for stable boundary'); ui.settle(); assert.equal(ui.hidden(), false);
});
test('CTA below the initial fold is not treated as already passed', () => {
  const ui = sticky(); ui.hero.rect = { top: 900, bottom: 954 }; ui.tick(); ui.settle(); assert(ui.hidden());
});
test('Hero boundary buffer and delayed reveal prevent flicker and stale timers', () => {
  const ui = sticky(); ui.hero.rect = { top: -62, bottom: -8 }; ui.tick(); ui.settle(); assert(ui.hidden());
  passHero(ui); assert.equal(ui.timers.size, 1);
  ui.hero.rect = { top: 20, bottom: 74 }; ui.tick(); ui.settle(); assert(ui.hidden()); assert.equal(ui.timers.size, 0);
  passHero(ui); ui.settle(); assert.equal(ui.hidden(), false);
  ui.hero.rect = { top: 20, bottom: 74 }; ui.tick(); assert(ui.hidden());
});
test('sticky hides before the order section enters the viewport, then can return', () => {
  const ui = sticky(); passHero(ui); ui.settle(); assert.equal(ui.hidden(), false);
  ui.section.rect = { top: 900, bottom: 1600 }; ui.tick(); assert(ui.hidden());
  ui.section.rect = { top: 3000, bottom: 3700 }; ui.tick(); ui.settle(); assert.equal(ui.hidden(), false);
});
test('focused fields hide the bar immediately and keep it hidden', () => {
  const ui = sticky(); passHero(ui); ui.settle(); ui.doc.activeElement = ui.field; ui.doc.fire('focusin'); assert(ui.hidden());
  ui.tick(); ui.settle(); assert(ui.hidden());
  ui.doc.activeElement = null; ui.doc.fire('focusout'); ui.settle(); ui.settle(); assert.equal(ui.hidden(), false);
});
test('visual keyboard stays hidden after blur until viewport is restored', () => {
  const ui = sticky(); passHero(ui); ui.settle(); ui.win.visualViewport.height = 450; ui.win.visualViewport.fire('resize'); ui.frame(); assert(ui.hidden());
  ui.doc.activeElement = null; ui.doc.fire('focusout'); ui.settle(); assert(ui.hidden());
  ui.win.visualViewport.height = 800; ui.win.visualViewport.fire('resize'); ui.settle(); assert.equal(ui.hidden(), false);
});
test('layout-resizing keyboards also suppress sticky without visualViewport', () => {
  const ui = sticky({ visualViewport: false }); passHero(ui); ui.settle(); ui.win.innerHeight = 450; ui.win.fire('resize'); ui.frame(); assert(ui.hidden());
  ui.win.innerHeight = 800; ui.win.fire('resize'); ui.settle(); assert.equal(ui.hidden(), false);
});
test('small browser chrome resizes do not look like an open keyboard', () => {
  const ui = sticky(); passHero(ui); ui.win.visualViewport.height = 740; ui.win.visualViewport.fire('resize'); ui.settle(); assert.equal(ui.hidden(), false);
});
test('desktop and missing IntersectionObserver are safe hidden fallbacks', () => {
  for (const options of [{ mobile: false }, { observer: false }]) {
    const ui = sticky(options); passHero(ui); ui.settle(); assert(ui.hidden());
  }
});
test('breakpoint change hides a previously visible mobile bar', () => {
  const ui = sticky(); passHero(ui); ui.settle(); ui.media.matches = false; ui.media.fire('change'); ui.frame(); assert(ui.hidden());
});
test('hiding a focused sticky link transfers focus to non-editable form target', () => {
  const ui = sticky(); passHero(ui); ui.settle(); ui.doc.activeElement = ui.stickyLink;
  ui.section.rect = { top: 850, bottom: 1500 }; ui.tick(); assert(ui.hidden()); assert.equal(ui.doc.activeElement, ui.target); assert.deepEqual(ui.target.focusOptions, { preventScroll: true });
});
function click(link, modifiers = {}) {
  const event = { button: 0, preventDefault() { this.prevented = true; }, ...modifiers }; link.fire('click', event); return event;
}
for (const reduceMotion of [false, true]) test(`all CTAs scroll to form without focusing inputs; reduced motion=${reduceMotion}`, () => {
  const ui = setup({ reduceMotion }); initOrderNavigation({ document: ui.doc, window: ui.win });
  for (const link of ui.links) {
    assert.equal(click(link).prevented, true); assert.equal(ui.doc.activeElement, ui.target); assert.equal(ui.field.focusOptions, undefined);
    assert.deepEqual(ui.target.scrolls.at(-1), { behavior: reduceMotion ? 'instant' : 'smooth', block: 'start', inline: 'nearest' });
    assert(ui.hidden());
  }
  assert.equal(ui.target.scrolls.length, 3); assert.deepEqual(ui.win.history.calls, ['#order']);
});
test('modifier/middle clicks retain native navigation behavior', () => {
  const ui = setup(); initOrderNavigation({ document: ui.doc, window: ui.win });
  for (const modifiers of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) assert.equal(click(ui.headerLink, modifiers).prevented, undefined);
  assert.equal(ui.target.scrolls, undefined);
});
test('direct #order and subsequent hash changes target the same form card', () => {
  const ui = setup({ hash: '#order' }); initOrderNavigation({ document: ui.doc, window: ui.win }); assert.equal(ui.target.scrolls.length, 1);
  ui.win.fire('hashchange'); assert.equal(ui.target.scrolls.length, 2);
  ui.win.location.hash = '#features'; ui.win.fire('hashchange'); assert.equal(ui.target.scrolls.length, 2);
});
test('initial deep link waits for layout load when the document is still loading', () => {
  const ui = setup({ hash: '#order', readyState: 'interactive' }); initOrderNavigation({ document: ui.doc, window: ui.win }); assert.equal(ui.target.scrolls, undefined);
  ui.win.fire('load'); assert.equal(ui.target.scrolls.length, 1); assert.equal(ui.doc.activeElement, ui.target);
});

test('a partially visible Hero CTA stays visible instead of being treated as behind a sticky header', () => {
  const ui = sticky(); ui.hero.rect = { top: -14, bottom: 40 }; ui.tick(); ui.settle(); assert(ui.hidden());
  passHero(ui); ui.settle(); assert.equal(ui.hidden(), false);
});
