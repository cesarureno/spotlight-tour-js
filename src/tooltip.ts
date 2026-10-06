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
    const tooltipH = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { left: rL, top: rT, width: rW, height: rH } = visualRect;

    let left: number;
    let top: number;

    switch (side) {
      case 'below':
        left = rL + rW / 2 - TOOLTIP_WIDTH / 2;
        top = rT + rH + GAP;
        break;
      case 'above':
        left = rL + rW / 2 - TOOLTIP_WIDTH / 2;
        top = rT - tooltipH - GAP;
        break;
      case 'right':
        left = rL + rW + GAP;
        top = rT + rH / 2 - tooltipH / 2;
        break;
      case 'left':
        left = rL - TOOLTIP_WIDTH - GAP;
        top = rT + rH / 2 - tooltipH / 2;
        break;
    }

    // Flip to the other side when the requested one doesn't fit but the other does.
    if (side === 'below' && top + tooltipH > vh - EDGE_PAD && rT - tooltipH - GAP >= EDGE_PAD) {
      top = rT - tooltipH - GAP;
    } else if (side === 'above' && top < EDGE_PAD && rT + rH + GAP + tooltipH <= vh - EDGE_PAD) {
      top = rT + rH + GAP;
    }

    left = Math.max(EDGE_PAD, Math.min(vw - TOOLTIP_WIDTH - EDGE_PAD, left));
    top = Math.max(EDGE_PAD, Math.min(vh - tooltipH - EDGE_PAD, top));

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.visibility = '';

    requestAnimationFrame(() => el.classList.add('st-visible'));
  });

  return el;
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
