/**
 * toast.js — Lightweight, accessible toast notification system.
 *
 * Usage:  import { showToast } from './toast.js';
 *         showToast('Suit saved!', 'success');
 *         showToast('Something went wrong.', 'error');
 *         showToast('Duplicated.', 'info');
 */

let _container = null;

function getContainer() {
  if (_container) return _container;
  _container = document.createElement('div');
  _container.id = 'toast-container';
  _container.setAttribute('aria-live', 'polite');
  _container.setAttribute('aria-atomic', 'false');
  _container.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'right:24px',
    'z-index:10000',
    'display:flex',
    'flex-direction:column',
    'gap:10px',
    'pointer-events:none',
    'max-width:360px',
  ].join(';');
  document.body.appendChild(_container);
  return _container;
}

/**
 * Show a toast notification.
 * @param {string} message   - The text to display.
 * @param {'success'|'error'|'info'} [type='info'] - Visual variant.
 * @param {number} [duration=3500]  - Auto-dismiss after ms. 0 = sticky.
 */
export function showToast(message, type = 'info', duration = 3500) {
  const container = getContainer();

  const toast = document.createElement('div');
  toast.className = `ks-toast ks-toast--${type}`;
  toast.setAttribute('role', 'status');

  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="8"></line><line x1="12" y1="12" x2="12" y2="16"></line></svg>`,
  };

  toast.innerHTML = `
    <span class="ks-toast__icon">${icons[type] || icons.info}</span>
    <span class="ks-toast__msg">${escapeToastHtml(message)}</span>
    <button class="ks-toast__close" aria-label="Dismiss notification" type="button">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;

  const closeBtn = toast.querySelector('.ks-toast__close');
  closeBtn.addEventListener('click', () => dismiss(toast));

  container.appendChild(toast);
  // Pointer-events on the individual toast only
  toast.style.pointerEvents = 'all';

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('ks-toast--visible');
  });

  if (duration > 0) {
    setTimeout(() => dismiss(toast), duration);
  }

  return toast;
}

function dismiss(toast) {
  toast.classList.remove('ks-toast--visible');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  // Fallback if transitionend never fires
  setTimeout(() => toast.remove(), 400);
}

function escapeToastHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
