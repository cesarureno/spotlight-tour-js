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

export function createSpotlight(target: HTMLElement): SpotlightHandle {
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
    if (target.isConnected) {
      const r = target.getBoundingClientRect();
      rect = {
        left: r.left - PADDING,
        top: r.top - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      };
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
