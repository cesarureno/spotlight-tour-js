import type { TooltipSide, TourLabels } from './types';

interface TooltipConfig {
  title: string;
  text: string;
  side: TooltipSide;
  stepIndex: number;
  totalSteps: number;
  labels: TourLabels;
  visualRect: { left: number; top: number; width: number; height: number };
  /** For interactive steps: what to do. "Next" stays disabled until markActionDone(). */
  hint?: string;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
}

const TOOLTIP_WIDTH = 300;
const GAP = 20;
const EDGE_PAD = 12;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function createTooltip(config: TooltipConfig): HTMLElement {
  const { title, text, side, stepIndex, totalSteps, labels, visualRect, hint, onPrev, onNext, onClose } = config;
  const waiting = hint !== undefined;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const stepLabel = labels.step(stepIndex + 1, totalSteps);

  const el = document.createElement('div');
  el.className = 'spotlight-tooltip';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  // setAttribute doesn't parse HTML, so no escaping here.
  el.setAttribute('aria-label', `${title} — ${stepLabel}`);

  const dotsHtml = Array.from({ length: totalSteps }, (_, i) =>
    `<span class="st-dot${i === stepIndex ? ' st-active' : ''}"></span>`
  ).join('');

  el.innerHTML = `
    <button class="st-close" type="button" aria-label="${escapeHtml(labels.close)}">&times;</button>
    <p class="st-step-label">${escapeHtml(stepLabel)}</p>
    <h3 class="st-title">${escapeHtml(title)}</h3>
    <p class="st-text">${escapeHtml(text)}</p>
    ${waiting ? `<p class="st-hint" aria-live="polite">${escapeHtml(hint)}</p>` : ''}
    <div class="st-footer">
      <div class="st-dots">${dotsHtml}</div>
      <div class="st-nav">
        ${!isFirst ? `<button class="st-btn st-btn-prev" type="button">${escapeHtml(labels.prev)}</button>` : ''}
        ${isLast
          ? `<button class="st-btn st-btn-finish" type="button"${waiting ? ' disabled' : ''}>${escapeHtml(labels.done)}</button>`
          : `<button class="st-btn st-btn-next" type="button"${waiting ? ' disabled' : ''}>${escapeHtml(labels.next)}</button>`
        }
      </div>
    </div>
  `.trim();

  const prevBtn = el.querySelector<HTMLButtonElement>('.st-btn-prev');
  const nextBtn = el.querySelector<HTMLButtonElement>('.st-btn-next');
  const finishBtn = el.querySelector<HTMLButtonElement>('.st-btn-finish');
  const closeBtn = el.querySelector<HTMLButtonElement>('.st-close');

  if (prevBtn && onPrev) prevBtn.addEventListener('click', onPrev);
  if (nextBtn && onNext) nextBtn.addEventListener('click', onNext);
  if (finishBtn) finishBtn.addEventListener('click', onClose);
  if (closeBtn) closeBtn.addEventListener('click', onClose);

  el.style.width = `${TOOLTIP_WIDTH}px`;
  el.style.visibility = 'hidden';

  // Next to the body, not inside it: the body is scaled down and ignores the pointer.
  document.documentElement.appendChild(el);

  // Measure actual height before positioning so 'above' is accurate
  requestAnimationFrame(() => {
    positionTooltip(el, visualRect, side);
    el.style.visibility = '';
    requestAnimationFrame(() => el.classList.add('st-visible'));
  });

  return el;
}

type Rect = { left: number; top: number; width: number; height: number };

const OPPOSITE: Record<TooltipSide, TooltipSide> = { below: 'above', above: 'below', left: 'right', right: 'left' };

/**
 * Places the tooltip next to `rect`, never on top of it if there's any way around:
 * the requested side first, then the opposite one, then right and left. When nothing
 * fits whole (a tall popup on a short screen), it takes the side that covers the least.
 * Also used to follow an element that changes size.
 */
export function positionTooltip(el: HTMLElement, rect: Rect, side: TooltipSide): void {
  const w = TOOLTIP_WIDTH;
  const h = el.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const { left: rL, top: rT, width: rW, height: rH } = rect;

  const at = (s: TooltipSide): { left: number; top: number } => {
    switch (s) {
      case 'below': return { left: rL + rW / 2 - w / 2, top: rT + rH + GAP };
      case 'above': return { left: rL + rW / 2 - w / 2, top: rT - h - GAP };
      case 'right': return { left: rL + rW + GAP, top: rT + rH / 2 - h / 2 };
      case 'left':  return { left: rL - w - GAP, top: rT + rH / 2 - h / 2 };
    }
  };

  // Slide along the edge it sits on to stay on screen.
  const clamp = (pos: { left: number; top: number }) => ({
    left: Math.max(EDGE_PAD, Math.min(vw - w - EDGE_PAD, pos.left)),
    top: Math.max(EDGE_PAD, Math.min(vh - h - EDGE_PAD, pos.top)),
  });

  const covered = (pos: { left: number; top: number }): number => {
    const x = Math.max(0, Math.min(pos.left + w, rL + rW) - Math.max(pos.left, rL));
    const y = Math.max(0, Math.min(pos.top + h, rT + rH) - Math.max(pos.top, rT));
    return x * y;
  };

  const order = [side, OPPOSITE[side], 'right', 'left', 'below', 'above'] as TooltipSide[];
  const candidates = order
    .filter((s, i) => order.indexOf(s) === i)
    .map(s => clamp(at(s)));

  const pos = candidates.find(c => covered(c) === 0)
    ?? candidates.reduce((best, c) => (covered(c) < covered(best) ? c : best));

  el.style.left = `${pos.left}px`;
  el.style.top = `${pos.top}px`;
}

/** Interactive steps: the user did it. Enables "Next"/"Done" and swaps the hint for `text`. */
export function markActionDone(el: HTMLElement, text: string): void {
  el.querySelectorAll<HTMLButtonElement>('.st-btn-next, .st-btn-finish').forEach(btn => { btn.disabled = false; });
  const hint = el.querySelector<HTMLElement>('.st-hint');
  if (hint) {
    hint.textContent = text;
    hint.classList.add('st-hint-done');
  }
}
