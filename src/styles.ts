const STYLES_ID = 'spotlight-tour-styles';

export const STYLES = `
.spotlight-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0);
  z-index: 9989;   /* sits BEHIND the page wrapper so the page remains visible */
  transition: background 0.45s ease;
}

.spotlight-clone {
  position: fixed;
  margin: 0;
  z-index: 99992;
  pointer-events: none;
  transform-origin: center center;
  will-change: transform, left, top, box-shadow, opacity;
}

/* Any descendant with backdrop-filter would blur against the dark overlay
   instead of the original page content — neutralise all of them. */
.spotlight-clone * {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.spotlight-tooltip {
  position: fixed;
  z-index: 99993;
  background: #ffffff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.25),
    0 4px 16px rgba(0, 0, 0, 0.12);
  max-width: 320px;
  min-width: 240px;
  box-sizing: border-box;
  opacity: 0;
  transform: translateY(10px) scale(0.96);
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: all;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.spotlight-tooltip.st-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.st-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #9ca3af;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  outline: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.st-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.st-close:focus-visible {
  box-shadow: 0 0 0 2px #6366f1;
}

.st-step-label {
  font-size: 11px;
  font-weight: 500;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 8px;
}

.st-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px;
  line-height: 1.35;
}

.st-text {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 18px;
  line-height: 1.55;
}

.st-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #4f46e5;
  background: #eef2ff;
  border-radius: 8px;
  padding: 8px 12px;
  margin: -6px 0 18px;
}

.st-hint::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
  animation: st-pulse 1.4s ease-in-out infinite;
}

.st-hint.st-hint-done {
  color: #047857;
  background: #ecfdf5;
}

.st-hint.st-hint-done::before {
  animation: none;
}

@keyframes st-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.7); }
}

@media (prefers-reduced-motion: reduce) {
  .st-hint::before { animation: none; }
}

.st-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

/* ── Interactive steps ───────────────────────────────────────────── */

.spotlight-hole {
  position: fixed;
  z-index: 99990;
  border-radius: 10px;
  pointer-events: none;
  box-shadow:
    0 0 0 2.5px #6366f1,
    0 0 0 9999px rgba(0, 0, 0, 0.6);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.spotlight-hole.st-visible {
  opacity: 1;
}

.spotlight-blocker {
  position: fixed;
  z-index: 99990;
  background: transparent;
}

.st-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.st-dots {
  display: flex;
  gap: 5px;
  align-items: center;
}

.st-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e5e7eb;
  transition: background 0.2s ease, transform 0.2s ease;
}

.st-dot.st-active {
  background: #6366f1;
  transform: scale(1.45);
}

.st-nav {
  display: flex;
  gap: 8px;
  align-items: center;
}

.st-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 15px;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  transition: background 0.15s ease, transform 0.1s ease;
  outline: none;
}

.st-btn:focus-visible {
  box-shadow: 0 0 0 2px #6366f1, 0 0 0 4px rgba(99, 102, 241, 0.25);
}

.st-btn:active {
  transform: scale(0.95);
}

.st-btn-prev {
  background: #f3f4f6;
  color: #374151;
}

.st-btn-prev:hover {
  background: #e5e7eb;
}

.st-btn-next {
  background: #6366f1;
  color: #fff;
}

.st-btn-next:hover {
  background: #4f46e5;
}

.st-btn-finish {
  background: #6366f1;
  color: #fff;
}

.st-btn-finish:hover {
  background: #4f46e5;
}
`;

export function injectStyles(): void {
  if (document.getElementById(STYLES_ID)) return;
  const style = document.createElement('style');
  style.id = STYLES_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}
