import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initScrollReveal } from '../experience.js';

function setup({ reduced = false, available = true, broken = false } = {}) {
  const targets = Array.from({ length: 4 }, () => ({ classes: new Set(), contains: () => false,
    get classList() { return { add: name => this.classes.add(name), remove: name => this.classes.delete(name) }; } }));
  const observed = new Set(); let callback; let listener; let disconnected = false;
  const motion = { matches: reduced, addEventListener: (_, fn) => { listener = fn; }, removeEventListener: () => { listener = null; } };
  const win = { matchMedia: () => motion };
  if (available) win.IntersectionObserver = class {
    constructor(fn) { if (broken) throw Error('Observer unavailable'); callback = fn; }
    observe(target) { observed.add(target); }
    unobserve(target) { observed.delete(target); }
    disconnect() { observed.clear(); disconnected = true; }
  };
  const doc = { querySelectorAll: () => targets, activeElement: null };
  const stop = initScrollReveal({ document: doc, window: win });
  return { targets, observed, stop, emit: entries => callback(entries), reduce: () => listener?.({ matches: true }), disconnected: () => disconnected };
}

test('secondary headings remain untouched before entry, then reveal only once', () => {
  const ui = setup(); assert.equal(ui.observed.size, 4);
  assert(ui.targets.every(target => target.classes.size === 0));
  const target = ui.targets[0]; ui.emit([{ target, isIntersecting: false }]); assert.equal(target.classes.size, 0);
  ui.emit([{ target, isIntersecting: true }]); assert(target.classes.has('reveal-once')); assert(!ui.observed.has(target));
  target.classes.clear(); ui.emit([{ target, isIntersecting: true }]);
  assert.equal(target.classes.size, 0, 'even a stale observer callback cannot replay a reveal');
});
test('reduced motion and unavailable observers leave content unchanged', () => {
  for (const options of [{ reduced: true }, { available: false }, { broken: true }]) {
    const ui = setup(options); assert.equal(ui.observed.size, 0); assert(ui.targets.every(target => target.classes.size === 0)); ui.stop();
  }
});
test('changing to reduced motion disconnects observation and clears active effects', () => {
  const ui = setup(); ui.emit([{ target: ui.targets[0], isIntersecting: true }]); ui.reduce();
  assert(ui.disconnected()); assert(ui.targets.every(target => target.classes.size === 0));
});
test('headings containing keyboard focus are never animated and observation ends after four entries', () => {
  const ui = setup(); ui.targets[0].contains = () => true;
  ui.emit(ui.targets.map(target => ({ target, isIntersecting: true })));
  assert.equal(ui.targets[0].classes.size, 0); assert(ui.disconnected());
});

test('the weakest fade frame preserves normal-text contrast for FAQ and eyebrows', () => {
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const color = token => css.match(new RegExp(`--${token}: #([a-f0-9]{6})`))[1].match(/../g).map(value => parseInt(value, 16));
  const luminance = rgb => rgb.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  for (const [frame, foreground, background] of [['faq-answer-in', 'muted', 'background'], ['section-arrive', 'accent', 'section-surface'], ['section-arrive', 'accent', 'background']]) {
    const opacity = Number(css.match(new RegExp(`@keyframes ${frame} \\{\\s*from \\{ opacity: ([.\\d]+)`))[1]);
    const back = color(background); const front = color(foreground).map((value, index) => value * opacity + back[index] * (1 - opacity));
    const ratio = (luminance(back) + .05) / (luminance(front) + .05);
    assert(ratio >= 4.5, `${frame} contrast ${ratio}`);
  }
});
