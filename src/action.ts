import type { ActionType, StepAction } from './types';
import { visibleIncluded } from './spotlight';

// Pointer events that make up a click. With `intercept`, all of them are swallowed:
// some components act on pointerdown/mousedown, not only on click.
const POINTER_EVENTS = ['pointerdown', 'mousedown', 'touchstart', 'pointerup', 'mouseup', 'touchend', 'dblclick'];

export function actionType(action: StepAction): ActionType | null {
  return action.type ?? (action.until ? null : 'click');
}

/**
 * Watches the target until the user does what the step asks, then calls `onDone` once.
 * Returns a function that stops watching.
 *
 * Listeners go on `window` in the capture phase, the first stop of every event: they
 * see it before any of the app's handlers, and with `intercept` they stop it there,
 * so the app's handlers never run.
 */
export function watchAction(
  target: () => HTMLElement,
  action: StepAction,
  onDone: () => void,
  include?: string,
): () => void {
  const type = actionType(action);
  const listeners: [string, EventListener][] = [];
  let done = false;

  const on = (eventType: string, handler: (e: Event) => void): void => {
    window.addEventListener(eventType, handler, { capture: true, passive: false });
    listeners.push([eventType, handler]);
  };

  // The target, or a popup it opened (see `TourStep.include`).
  const inside = (e: Event): boolean => {
    if (!(e.target instanceof Node)) return false;
    const node = e.target;
    return target().contains(node) || visibleIncluded(include).some(el => el.contains(node));
  };

  const block = (e: Event): void => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };

  const finish = (): void => {
    if (done) return;
    done = true;
    onDone();
  };

  // With `until`, the event alone doesn't finish the step: the condition does.
  const finishOnEvent = (): void => {
    if (!action.until) finish();
  };

  if (action.intercept) {
    // A submit can come from anywhere in the form, not only the target: block them all.
    on('submit', block);

    if (type === 'click') {
      POINTER_EVENTS.forEach(eventType => on(eventType, e => { if (inside(e)) block(e); }));
    }
    if (type === 'input') {
      on('keydown', e => { if (inside(e) && (e as KeyboardEvent).key === 'Enter') block(e); });
    }
  }

  if (type === 'click') {
    on('click', e => {
      if (!inside(e)) return;
      if (action.intercept) block(e);
      finishOnEvent();
    });
  }

  if (type === 'input') {
    on('input', e => {
      if (!inside(e)) return;
      const value = (e.target as HTMLInputElement).value;
      if (typeof value === 'string' && value.trim() !== '') finishOnEvent();
    });
  }

  if (type === 'change') {
    on('change', e => { if (inside(e)) finishOnEvent(); });
  }

  const poll = action.until
    ? setInterval(() => {
        try {
          if (action.until!()) finish();
        } catch (error) {
          console.error('[spotlight-tour] action.until threw:', error);
        }
      }, 150)
    : null;

  return () => {
    listeners.forEach(([eventType, handler]) => window.removeEventListener(eventType, handler, { capture: true }));
    if (poll !== null) clearInterval(poll);
  };
}
