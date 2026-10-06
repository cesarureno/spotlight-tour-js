import { afterEach, describe, expect, it, vi } from 'vitest';
import { actionType, watchAction } from '../src/action';

describe('actionType', () => {
  it('defaults to click', () => {
    expect(actionType({})).toBe('click');
  });

  it('has no type when only `until` is given', () => {
    expect(actionType({ until: () => true })).toBeNull();
  });

  it('keeps an explicit type', () => {
    expect(actionType({ type: 'input', until: () => true })).toBe('input');
  });
});

describe('watchAction', () => {
  let stop: (() => void) | undefined;

  afterEach(() => {
    stop?.();
    stop = undefined;
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  function button(): HTMLButtonElement {
    const el = document.createElement('button');
    document.body.appendChild(el);
    return el;
  }

  it('finishes once when the target is clicked', () => {
    const target = button();
    const onDone = vi.fn();
    stop = watchAction(() => target, {}, onDone);

    target.click();
    target.click();

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('ignores clicks outside the target', () => {
    const target = button();
    const other = button();
    const onDone = vi.fn();
    stop = watchAction(() => target, {}, onDone);

    other.click();

    expect(onDone).not.toHaveBeenCalled();
  });

  it('keeps the click from the app with `intercept`', () => {
    const target = button();
    const appHandler = vi.fn();
    target.addEventListener('click', appHandler);
    const onDone = vi.fn();
    stop = watchAction(() => target, { intercept: true }, onDone);

    target.click();

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(appHandler).not.toHaveBeenCalled();
  });

  it('finishes an input step only once the field has text', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const onDone = vi.fn();
    stop = watchAction(() => input, { type: 'input' }, onDone);

    input.value = '   ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onDone).not.toHaveBeenCalled();

    input.value = 'hello';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('with `until`, waits for the condition rather than the event', () => {
    vi.useFakeTimers();
    const target = button();
    let open = false;
    const onDone = vi.fn();
    stop = watchAction(() => target, { type: 'click', until: () => open }, onDone);

    target.click();
    vi.advanceTimersByTime(300);
    expect(onDone).not.toHaveBeenCalled();

    open = true;
    vi.advanceTimersByTime(150);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('stops listening once stopped', () => {
    const target = button();
    const onDone = vi.fn();
    watchAction(() => target, {}, onDone)();

    target.click();

    expect(onDone).not.toHaveBeenCalled();
  });
});
