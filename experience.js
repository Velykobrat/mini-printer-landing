// Four secondary headings only. Nothing is hidden before JS or observation.
export function initScrollReveal({ document: doc = document, window: win = window } = {}) {
  const motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (!motion || motion.matches || !win.IntersectionObserver) return () => {};
  const targets = [...doc.querySelectorAll('#features .section-heading, #scenarios .section-heading, .demo-grid .section-heading, #delivery .section-heading')];
  const seen = new Set();
  let observer;
  const stop = () => {
    observer?.disconnect();
    for (const target of targets) target.classList.remove('reveal-once');
    motion.removeEventListener?.('change', onPreference);
  };
  const onPreference = event => { if (event.matches) stop(); };
  try {
    observer = new win.IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || seen.has(entry.target)) continue;
        seen.add(entry.target);
        observer.unobserve(entry.target);
        if (!entry.target.contains(doc.activeElement)) entry.target.classList.add('reveal-once');
      }
      if (seen.size === targets.length) observer.disconnect();
    }, { threshold: .15, rootMargin: '0px 0px -24px 0px' });
    motion.addEventListener?.('change', onPreference);
    for (const target of targets) observer.observe(target);
  } catch { stop(); }
  return stop;
}
