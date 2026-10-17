import { validateProductConfig, validateMediaPath } from '../../shared/product-config-validation.js';
import { escapeHTML as escape } from '../html.mjs';

export function renderVideo(config) {
  validateProductConfig(config);
  const SALES = { ...config.commerce, lifestyles: config.scenarios, video: config.media.video, faq: config.faq };
  const localMedia = value => validateMediaPath(value) || validateMediaPath(value, 'video');
  const video = SALES.video;
  if (!localMedia(video.poster)) throw new Error('Use a local product poster.');
  const videoMarkup = video.status === 'confirmed' && localMedia(video.src)
    ? `<video controls playsinline preload="none" poster="${escape(video.poster)}" width="${video.width}" height="${video.height}" aria-label="${escape(config.copy.videoLabel)}" aria-describedby="video-note"><source src="${escape(video.src)}" type="${video.src.endsWith('.webm') ? 'video/webm' : 'video/mp4'}">Ваш браузер не підтримує відео. <a href="${escape(video.src)}">Відкрити відео</a></video><p class="video-note" id="video-note">${escape(config.copy.videoNote)}</p>`
    : `<div class="video-fallback"><img src="${escape(video.poster)}" alt="${escape(config.copy.videoFallbackAlt)}" width="630" height="630" loading="lazy" decoding="async"><p>${escape(config.copy.videoFallbackLines[0])}<br><small>${escape(config.copy.videoFallbackLines[1])}</small></p></div>`;
  return `<section class="section demo-section" aria-labelledby="demo-title"><div class="container demo-grid"><div class="section-heading"><p class="eyebrow">${escape(config.copy.videoEyebrow)}</p><h2 id="demo-title">${config.copy.videoHeadingLines.map(escape).join('<br>')}</h2></div><div class="video-frame">${videoMarkup}</div></div></section>`;
}
