import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { checkLinks } from '../scripts/check-links.mjs';
function fixture(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'landing-docs-'));
  try { run(dir); } finally {
    assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'landing-docs-'));
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
test('documentation links resolve relative to archive location and validate Markdown/HTML anchors', () => fixture(dir => {
  fs.mkdirSync(path.join(dir, 'archive'));
  fs.writeFileSync(path.join(dir, 'page.html'), '<h1 id="order">x</h1>');
  fs.writeFileSync(path.join(dir, 'README.md'), '# Testing\n');
  fs.writeFileSync(path.join(dir, 'archive/old.md'), '[Home](../README.md#testing) [Order](../page.html#order)');
  assert.deepEqual(checkLinks(dir), []);
}));
test('documentation checks detect missing targets, fragments and malformed escapes', () => fixture(dir => {
  fs.writeFileSync(path.join(dir, 'README.md'), '# Title\n[x](absent.md) [y](#missing) [z](bad%ZZ.md)');
  assert.equal(checkLinks(dir).length, 3);
}));
test('documentation checks ignore external links and fenced command examples', () => fixture(dir => {
  fs.writeFileSync(path.join(dir, 'README.md'), '[Web](https://example.test/)\n```md\n[Placeholder](not-a-file)\n```\n');
  assert.deepEqual(checkLinks(dir), []);
}));
