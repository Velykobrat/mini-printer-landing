import { REVIEWS, reviewState } from './shared/sales-content.js';

export function initReviews({ document: doc = document, window: win = window } = {}) {
  const section = doc.getElementById('reviews');
  if (!section) return;
  const mode = new URLSearchParams(win.location.search).get('reviews') === 'demo' ? 'demo' : REVIEWS.mode;
  const state = reviewState({ mode, hostname: win.location.hostname });
  const grid = doc.getElementById('reviews-grid');
  grid.replaceChildren();
  section.hidden = state.items.length === 0;
  doc.getElementById('reviews-demo-note').hidden = !state.demo;
  for (const review of state.items) {
    const card = doc.createElement('article'); card.className = 'sales-card';
    const text = doc.createElement('p'); text.textContent = review.text;
    const author = doc.createElement('h3'); author.textContent = review.author;
    card.append(author, text); grid.append(card);
  }
}
