// The spotlight of an interactive step: a hole around the real element, with the rest
// of the page dimmed and unreachable.
//
// The dimming is the hole's own box-shadow, which doesn't catch the pointer, so four
// transparent blockers cover everything around the hole. Clicks inside the hole reach
// the page; clicks anywhere else land on a blocker and go nowhere.

export interface SpotlightHandle {
  rect: () => { left: number; top: number; width: number; height: number };
  remove: () => void;
}

const PADDING = 8;

/** `onResize` runs when the hole changes size or place, e.g. so the tooltip can follow it. */
/** `target` is read every frame: if the app replaces the element, it returns the new one. */
export function createSpotlight(target: () => HTMLElement, include?: string, onResize?: () => void): SpotlightHandle {
  const html = document.documentElement;

  const hole = document.createElement('div');
  hole.className = 'spotlight-hole';

  const blockers = ['top', 'right', 'bottom', 'left'].map(side => {
    const el = document.createElement('div');
    el.className = `spotlight-blocker spotlight-blocker-${side}`;
    return el;
  });

  [hole, ...blockers].forEach(el => html.appendChild(el));

  let rect = { left: 0, top: 0, width: 0, height: 0 };
  let frame = 0;

  // Follows the element every frame: using it can change its size (a field that grows,
  // a menu that opens inside it) or move it.
  const update = (): void => {
    // A target that left the DOM (e.g. a button that closes its own panel) keeps its last hole.
    const el = target();
    if (el.isConnected) {
      const r = boundsOf([el, ...visibleIncluded(include)]);
      const next = {
        left: r.left - PADDING,
        top: r.top - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      };
      const moved = (Object.keys(next) as (keyof typeof next)[]).some(k => Math.abs(next[k] - rect[k]) > 0.5);
      const first = rect.width === 0;
      rect = next;
      if (moved && !first) onResize?.();
    }

    const { left, top, width, height } = rect;
    const right = left + width;
    const bottom = top + height;

    place(hole, left, top, width, height);
    place(blockers[0], 0, 0, window.innerWidth, Math.max(0, top));
    place(blockers[1], right, top, Math.max(0, window.innerWidth - right), height);
    place(blockers[2], 0, bottom, window.innerWidth, Math.max(0, window.innerHeight - bottom));
    place(blockers[3], 0, top, Math.max(0, left), height);

    frame = requestAnimationFrame(update);
  };

  update();
  requestAnimationFrame(() => hole.classList.add('st-visible'));

  return {
    rect: () => rect,
    remove: () => {
      cancelAnimationFrame(frame);
      [hole, ...blockers].forEach(el => el.remove());
    },
  };
}

function place(el: HTMLElement, left: number, top: number, width: number, height: number): void {
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
}

// The elements matched by `include` that are on screen right now.
export function visibleIncluded(include?: string): HTMLElement[] {
  if (!include) return [];
  return Array.from(document.querySelectorAll<HTMLElement>(include)).filter(el => el.getClientRects().length > 0);
}

function boundsOf(elements: HTMLElement[]): { left: number; top: number; width: number; height: number } {
  const rects = elements.map(el => el.getBoundingClientRect());
  const left = Math.min(...rects.map(r => r.left));
  const top = Math.min(...rects.map(r => r.top));
  const right = Math.max(...rects.map(r => r.right));
  const bottom = Math.max(...rects.map(r => r.bottom));
  return { left, top, width: right - left, height: bottom - top };
}
