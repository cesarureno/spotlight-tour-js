export function createOverlay(opacity: number): HTMLElement {
  const el = document.createElement('div');
  el.className = 'spotlight-overlay';
  document.documentElement.appendChild(el);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.background = `rgba(0,0,0,${opacity})`;
    });
  });

  return el;
}

export function removeOverlay(el: HTMLElement): void {
  el.style.background = 'rgba(0,0,0,0)';
  setTimeout(() => el.remove(), 460);
}
