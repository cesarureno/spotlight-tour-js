// The "stage" is the page while the tour runs: the body shrinks in place and the
// app root becomes the scroll container, so the mini-page can be scrolled to each
// target without the user being able to scroll it.
//
// The page's nodes are never moved (unless there is no app root to use): frameworks
// keep references to them and teleport overlays (dialogs, toasts) straight into the
// body. Because the body itself is what gets scaled, those overlays shrink with the
// page and stay positioned against it.

export interface Stage {
  setScale: (scale: number) => void;
  scrollTo: (target: HTMLElement) => Promise<void>;
  restore: () => void;
}

const DEFAULT_ROOT = '#app, #root, #__nuxt, #__next';
const TRANSPARENT = ['rgba(0, 0, 0, 0)', 'transparent'];

export function createStage(rootOption?: string | HTMLElement): Stage {
  const html = document.documentElement;
  const body = document.body;
  const scrollY = window.scrollY;

  // Read before touching any style, so it reflects the page as the user sees it.
  const background = resolvePageBackground();

  let root = resolveRoot(rootOption);
  const wrapper = root ? null : wrapBodyChildren();
  root = root ?? wrapper!;

  const saved: [HTMLElement, string | null][] = [html, body, root].map(el => [el, el.getAttribute('style')]);

  // With no background of its own, <html> takes the body's for the whole canvas and
  // the body box is left unpainted: the mini-page would show the dark backdrop through.
  setStyles(html, { overflow: 'hidden', background });

  // position + z-index lift the body above the backdrop, which hangs from <html>.
  setStyles(body, {
    height: '100vh',
    overflow: 'hidden',
    position: 'relative',
    'z-index': '9990',
    background,
    'transform-origin': 'top center',
    transform: 'scale(1)',
    transition: [
      'transform 0.55s cubic-bezier(0.4,0,0.2,1)',
      'opacity 0.45s ease',
      'border-radius 0.45s ease',
      'box-shadow 0.45s ease',
    ].join(','),
  });

  // The root clips to the viewport and takes over the window's scroll position,
  // so the page doesn't jump when the tour starts.
  setStyles(root, { height: '100vh', overflow: 'hidden' });
  root.scrollTop = scrollY;
  window.scrollTo(0, 0);

  let restored = false;

  return {
    setScale: scale => {
      // Two frames so the starting transform is painted before the transition kicks in.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        // A late frame must not leave a transform on a body that was already restored:
        // it would become the containing block of every position:fixed element.
        if (restored) return;
        const zoomedOut = scale < 1;
        setStyles(body, {
          transform: `scale(${scale})`,
          // "Small screen floating in space" look
          opacity: zoomedOut ? '0.72' : '',
          'border-radius': zoomedOut ? '12px' : '',
          'box-shadow': zoomedOut
            ? '0 0 0 1px rgba(255,255,255,0.07), 0 40px 100px rgba(0,0,0,0.55)'
            : '',
          'pointer-events': zoomedOut ? 'none' : '',
        });
      }));
    },

    scrollTo: target => {
      // Targets outside the root (e.g. inside a dialog teleported to the body) don't scroll with it.
      if (!root!.contains(target)) return Promise.resolve();

      // Rects are measured with the body's scale applied, so divide it out. The scale is
      // read from the layout instead of the options because it may still be animating.
      const rootRect   = root!.getBoundingClientRect();
      const scale      = rootRect.height / root!.offsetHeight || 1;
      const targetRect = target.getBoundingClientRect();
      const top        = (targetRect.top - rootRect.top) / scale + root!.scrollTop;
      const height     = targetRect.height / scale;

      const maxScroll = root!.scrollHeight - root!.clientHeight;
      const dest = Math.min(maxScroll, Math.max(0, top + height / 2 - root!.clientHeight / 2));

      return smoothScrollTo(root!, dest, 480);
    },

    restore: () => {
      restored = true;

      // Keep the user looking at the last thing the tour showed.
      const finalScroll = root!.scrollTop;

      saved.forEach(([el, style]) => {
        if (style === null) el.removeAttribute('style');
        else el.setAttribute('style', style);
      });

      if (wrapper) {
        Array.from(wrapper.childNodes).forEach(child => body.insertBefore(child, wrapper));
        wrapper.remove();
      }

      window.scrollTo(0, finalScroll);
    },
  };
}

function resolveRoot(option?: string | HTMLElement): HTMLElement | null {
  if (option instanceof HTMLElement) return option;
  const el = document.querySelector(option ?? DEFAULT_ROOT);
  return el instanceof HTMLElement && el.parentElement === document.body ? el : null;
}

// Fallback for plain pages without an app root: a container for the body's children.
function wrapBodyChildren(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'spotlight-stage-root';
  Array.from(document.body.childNodes).forEach(child => wrapper.appendChild(child));
  document.body.appendChild(wrapper);
  return wrapper;
}

function setStyles(el: HTMLElement, styles: Record<string, string>): void {
  Object.entries(styles).forEach(([prop, value]) => {
    if (value === '') el.style.removeProperty(prop);
    else el.style.setProperty(prop, value);
  });
}

// The mini-page needs an opaque background or it shows the dark backdrop through.
// Walk body → html → fallback to white.
function resolvePageBackground(): string {
  for (const el of [document.body, document.documentElement]) {
    const s = window.getComputedStyle(el);
    if (s.backgroundImage && s.backgroundImage !== 'none') return s.background;
    if (!TRANSPARENT.includes(s.backgroundColor)) return s.backgroundColor;
  }
  return '#ffffff';
}

// Animates element.scrollTop from its current value to `targetTop` over
// `duration` ms using an ease-in-out cubic curve.
function smoothScrollTo(el: HTMLElement, targetTop: number, duration: number): Promise<void> {
  return new Promise(resolve => {
    const startTop = el.scrollTop;
    const delta    = targetTop - startTop;

    // Skip animation when the element is already in position
    if (Math.abs(delta) < 2) { el.scrollTop = targetTop; resolve(); return; }

    const startTime = performance.now();

    function tick(now: number): void {
      const t    = Math.min((now - startTime) / duration, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      el.scrollTop = startTop + delta * ease;
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    }

    requestAnimationFrame(tick);
  });
}
