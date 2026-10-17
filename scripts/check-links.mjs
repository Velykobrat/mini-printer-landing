import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// Check repository-relative Markdown links, including archived documentation.
export function checkLinks(root) {
  const errors = [];
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    ['.git', 'node_modules', '.vercel'].includes(entry.name) ? [] : entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
  for (const file of walk(root).filter(file => file.endsWith('.md'))) {
    const text = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const [, raw] of text.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      if (/^[a-z][a-z\d+.-]*:/i.test(raw) || raw.startsWith('//')) continue;
      const [link, fragment] = raw.replace(/^<|>$/g, '').split('#');
      let target;
      try { target = path.resolve(path.dirname(file), decodeURIComponent(link || path.basename(file))); }
      catch { errors.push(`${path.relative(root, file)}: malformed link ${raw}`); continue; }
      if (!fs.existsSync(target)) { errors.push(`${path.relative(root, file)}: missing ${raw}`); continue; }
      if (!fragment || !fs.statSync(target).isFile()) continue;
      let anchor;
      try { anchor = decodeURIComponent(fragment); } catch { errors.push(`${file}: malformed anchor ${raw}`); continue; }
      const contents = fs.readFileSync(target, 'utf8');
      let anchors = [...contents.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
      if (target.endsWith('.md')) {
        const seen = new Map();
        anchors = anchors.concat([...contents.replace(/```[\s\S]*?```/g, '').matchAll(/^#{1,6}\s+(.+)$/gm)].map(([, heading]) => {
          const slug = heading.toLowerCase().replace(/[`*_~]/g, '').replace(/[^\p{L}\p{N}_\-\s]/gu, '').trim().replace(/\s/g, '-');
          const count = seen.get(slug) || 0; seen.set(slug, count + 1); return slug + (count ? '-' + count : '');
        }));
      }
      if (!anchors.includes(anchor)) errors.push(`${path.relative(root, file)}: missing anchor ${raw}`);
    }
  }
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const errors = checkLinks(fileURLToPath(new URL('../', import.meta.url)));
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('PASS: internal Markdown links and fragments, including archive.');
}
