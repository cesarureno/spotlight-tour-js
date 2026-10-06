export interface CloneHandle {
  el: HTMLElement;
  getVisualRect: () => { left: number; top: number; width: number; height: number };
  dismiss: () => void;
}

const CLONE_GAP      = 28;   // gap between mini-page bottom and clone visual top
const TOOLTIP_RESERVE = 160; // space reserved below clone for the tooltip

const INHERITED_PROPS = [
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-align',
];

export function createFlyingClone(
  target: HTMLElement,
  requestedScale: number,
  zoomOutScale: number,
): CloneHandle {
  const rect = target.getBoundingClientRect(); // viewport coords after page zoom-out
  const vw   = window.innerWidth;
  const vh   = window.innerHeight;

  // getBoundingClientRect() includes the page-level transform, so dimensions are
  // already multiplied by zoomOutScale.  We need the natural (un-zoomed) width to
  // size the wrapper horizontally.
  const naturalW = rect.width / zoomOutScale;

  // ── wrapper (no explicit height — measured after insertion) ──────────────
  const computed = window.getComputedStyle(target);

  const wrapper = document.createElement('div');
  wrapper.className = 'spotlight-clone';
  // Height is intentionally omitted here; we read offsetHeight after the clone
  // is in the DOM to get the true content height and avoid any clipping.
  wrapper.style.cssText = [
    'position:fixed',
    'left:-9999px',        // off-screen during measurement
    'top:-9999px',
    `width:${naturalW}px`,
    'margin:0',
    'transform-origin:center center',
    `transform:scale(${zoomOutScale})`,
    'transition:none',
    'box-sizing:border-box',
    `background:${resolveBackground(target, computed)}`,
    `border-radius:${computed.borderRadius}`,
    'overflow:hidden',
  ].join(';');

  // The clone lives outside the body, so it no longer inherits the page's text
  // styles (font, color) from it. Copy them from the target's parent instead.
  const inherited = window.getComputedStyle(target.parentElement ?? target);
  INHERITED_PROPS.forEach(prop => wrapper.style.setProperty(prop, inherited.getPropertyValue(prop)));

  // ── clone node ────────────────────────────────────────────────────────────
  const clone = target.cloneNode(true) as HTMLElement;
  // Keep the clone's own ID so that ID-based CSS rules (e.g. #main-nav { display:flex })
  // continue to apply.  Only strip IDs from descendants to prevent stale label/aria refs.
  clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));

  const neutralise: [string, string][] = [
    ['position',                'relative'],
    ['top',                     'auto'],
    ['right',                   'auto'],
    ['bottom',                  'auto'],
    ['left',                    'auto'],
    ['margin',                  '0'],
    ['z-index',                 'auto'],
    ['transform',               'none'],
    ['transition',              'none'],
    ['animation',               'none'],
    ['backdrop-filter',         'none'],
    ['-webkit-backdrop-filter', 'none'],
  ];
  neutralise.forEach(([p, v]) => clone.style.setProperty(p, v, 'important'));

  wrapper.appendChild(clone);

  // ── highlight original element in the mini-page ───────────────────────────
  const savedBSValue    = target.style.getPropertyValue('box-shadow');
  const savedBSPriority = target.style.getPropertyPriority('box-shadow');
  target.style.setProperty(
    'box-shadow',
    '0 0 0 2px #6366f1, 0 0 0 7px rgba(99,102,241,0.22)',
    'important',
  );

  // Insert off-screen to trigger layout so we can measure actual content height.
  // It hangs from <html>, next to the body, so the body's scale doesn't apply to it.
  document.documentElement.appendChild(wrapper);
  const actualH = wrapper.offsetHeight;

  // Lock the height now so overflow:hidden + border-radius work correctly.
  wrapper.style.height = `${actualH}px`;

  // ── free strip below the mini-page ───────────────────────────────────────
  const freeTop    = vh * zoomOutScale + CLONE_GAP;
  const freeBottom = vh - TOOLTIP_RESERVE;
  const freeHeight = Math.max(0, freeBottom - freeTop);

  // Clamp scale so the clone fits within the free strip (uses measured height)
  const maxScaleW      = (vw * 0.88) / naturalW;
  const maxScaleH      = freeHeight > 0 ? freeHeight / actualH : 1;
  const effectiveScale = Math.min(requestedScale, maxScaleW, maxScaleH);

  // Vertical center of clone in the free strip
  const visualH     = actualH * effectiveScale;
  const idealCenter = freeTop + freeHeight / 2;
  const minCenter   = freeTop + visualH / 2;
  const cloneCenter = Math.max(idealCenter, minCenter);

  // Final position (natural-sized box, centered; scale applied via transform)
  const finalLeft = (vw - naturalW) / 2;
  const finalTop  = cloneCenter - actualH / 2;

  // Initial position: align the clone's visual center with the element's visual center.
  // With transform-origin:center center and scale(zoomOutScale), the center of the
  // wrapper must equal the element's visual center.
  const initialLeft = rect.left + rect.width  / 2 - naturalW / 2;
  const initialTop  = rect.top  + rect.height / 2 - actualH  / 2;

  // Move from measurement position to initial animation position.
  wrapper.style.left = `${initialLeft}px`;
  wrapper.style.top  = `${initialTop}px`;

  // Two rAFs: first commits the initial painted frame; second triggers the transition.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      wrapper.style.transition = [
        'left 0.65s cubic-bezier(0.34,1.56,0.64,1)',
        'top 0.65s cubic-bezier(0.34,1.56,0.64,1)',
        'transform 0.65s cubic-bezier(0.34,1.56,0.64,1)',
        'box-shadow 0.5s ease',
      ].join(',');
      wrapper.style.left      = `${finalLeft}px`;
      wrapper.style.top       = `${finalTop}px`;
      wrapper.style.transform = `scale(${effectiveScale})`;
      wrapper.style.boxShadow = [
        '0 0 0 2.5px #6366f1',
        '0 0 0 8px rgba(99,102,241,0.18)',
        '0 24px 64px rgba(0,0,0,0.4)',
        '0 6px 20px rgba(0,0,0,0.25)',
      ].join(',');
    });
  });

  return {
    el: wrapper,

    getVisualRect: () => ({
      left:   vw / 2 - (naturalW * effectiveScale) / 2,
      top:    cloneCenter - (actualH * effectiveScale) / 2,
      width:  naturalW * effectiveScale,
      height: actualH * effectiveScale,
    }),

    dismiss: () => {
      if (savedBSValue) {
        target.style.setProperty('box-shadow', savedBSValue, savedBSPriority);
      } else {
        target.style.removeProperty('box-shadow');
      }
      wrapper.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      wrapper.style.opacity    = '0';
      wrapper.style.transform  = `scale(${effectiveScale * 1.06})`;
      setTimeout(() => wrapper.remove(), 260);
    },
  };
}

function resolveBackground(el: HTMLElement, computed: CSSStyleDeclaration): string {
  const TRANSPARENT = ['rgba(0, 0, 0, 0)', 'transparent'];
  const bgImage = computed.backgroundImage;
  const bgColor = computed.backgroundColor;
  if (bgImage && bgImage !== 'none') return computed.background;
  if (!TRANSPARENT.includes(bgColor)) return bgColor;
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const color = window.getComputedStyle(node).backgroundColor;
    if (!TRANSPARENT.includes(color)) return color;
    node = node.parentElement;
  }
  return '#ffffff';
}
