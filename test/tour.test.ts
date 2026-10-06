import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SpotlightTour from '../src/index';

// jsdom doesn't lay anything out, so every element would look hidden to the tour.
function makeRendered(el: Element): void {
  const rect = new DOMRect(10, 10, 100, 40);
  el.getClientRects = () => [rect] as unknown as DOMRectList;
  el.getBoundingClientRect = () => rect;
}

// The tour mounts its overlay, tooltip and clone on <html>, outside the app.
const page = (): string => document.documentElement.textContent ?? '';

describe('SpotlightTour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    document.body.innerHTML = '<div id="app"><button id="save">Save</button></div>';
    makeRendered(document.getElementById('save')!);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('is active from start until end, then calls onEnd', () => {
    const onEnd = vi.fn();
    const tour = new SpotlightTour({ steps: [{ target: '#save', title: 'Save', text: 'Saves it' }], onEnd });

    expect(tour.isActive).toBe(false);
    tour.start();
    expect(tour.isActive).toBe(true);

    tour.end();
    expect(tour.isActive).toBe(false);
    expect(onEnd).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('ends on Escape', () => {
    const tour = new SpotlightTour({ steps: [{ target: '#save', title: 'Save', text: 'Saves it' }] });
    tour.start();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(tour.isActive).toBe(false);
  });

  it('shows the first step with its title and the default labels', async () => {
    const tour = new SpotlightTour({ steps: [{ target: '#save', title: 'Save', text: 'Saves it' }] });
    tour.start();

    await vi.advanceTimersByTimeAsync(3000);

    expect(page()).toContain('Save');
    expect(page()).toContain('Saves it');
    expect(page()).toContain('Step 1 / 1');
    tour.end();
  });

  it('uses custom labels', async () => {
    const tour = new SpotlightTour({
      steps: [{ target: '#save', title: 'Guardar', text: 'Lo guarda' }],
      labels: { step: (current, total) => `Paso ${current} de ${total}` },
    });
    tour.start();

    await vi.advanceTimersByTimeAsync(3000);

    expect(page()).toContain('Paso 1 de 1');
    tour.end();
  });

  it('skips a step whose target never shows up', async () => {
    const onEnter = vi.fn();
    const tour = new SpotlightTour({
      steps: [
        { target: '#missing', title: 'Missing', text: '' },
        { target: '#save', title: 'Save', text: '', onEnter },
      ],
      targetTimeout: 200,
    });
    tour.start();

    await vi.advanceTimersByTimeAsync(3000);

    expect(onEnter).toHaveBeenCalled();
    expect(tour.isActive).toBe(true);
    tour.end();
  });

  it('ends on a missing target with onMissingTarget: "end"', async () => {
    const tour = new SpotlightTour({
      steps: [
        { target: '#missing', title: 'Missing', text: '' },
        { target: '#save', title: 'Save', text: '' },
      ],
      targetTimeout: 200,
      onMissingTarget: 'end',
    });
    tour.start();

    await vi.advanceTimersByTimeAsync(3000);

    expect(tour.isActive).toBe(false);
  });

  it('leaves the page as it found it', async () => {
    const app = document.getElementById('app')!;
    const tour = new SpotlightTour({ steps: [{ target: '#save', title: 'Save', text: '' }] });
    tour.start();
    await vi.advanceTimersByTimeAsync(3000);

    tour.end();
    await vi.advanceTimersByTimeAsync(3000);

    const leftovers = Array.from(document.documentElement.children).filter(el => el !== document.head && el !== document.body);
    expect(leftovers).toEqual([]);
    expect(document.body.firstElementChild).toBe(app);
    expect(app.getAttribute('style')).toBeNull();
    expect(document.documentElement.getAttribute('style')).toBeNull();
    expect(document.body.getAttribute('style')).toBeNull();
  });
});
