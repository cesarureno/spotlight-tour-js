export type TooltipSide = 'above' | 'below' | 'left' | 'right';

/** A CSS selector, or a function that returns the element (useful for elements without a stable selector). */
export type StepTarget = string | (() => Element | null);

export interface TourLabels {
  prev: string;
  next: string;
  done: string;
  close: string;
  step: (current: number, total: number) => string;
  /** What an interactive step asks for, by action type, unless the step sets its own `hint`. */
  clickHint: string;
  inputHint: string;
  changeHint: string;
  /** Shown once the user did what the step asked. */
  actionDone: string;
}

export type ActionType = 'click' | 'input' | 'change';

/**
 * Makes a step interactive: instead of a flying copy, the camera moves onto the real
 * element and the user has to use it to move on.
 */
export interface StepAction {
  /**
   * What the user has to do on the target: click it, type in it (done once the field
   * isn't empty), or change it (selects, checkboxes). Defaults to 'click' when there's no `until`.
   */
  type?: ActionType;
  /**
   * The step is done once this returns true. It's checked every 150 ms. Use it when
   * "done" means a result rather than an event, e.g. "the dialog is open".
   */
  until?: () => boolean;
  /**
   * Swallow the interaction before the app sees it: the click counts, but the app's
   * handlers never run. For inputs it blocks Enter, and on any intercepting step form
   * submits are blocked. Use it on anything that saves or sends.
   */
  intercept?: boolean;
  /** Move on to the next step by itself once done. Default true. */
  autoAdvance?: boolean;
  /**
   * Magnify the page on the element. Default 1 (real size). Above 1, popups that position
   * themselves with JavaScript (dropdowns, popovers) can show up out of place.
   */
  zoom?: number;
  /** Instruction under the step's text. Defaults to the label for the action type. */
  hint?: string;
}

export interface TourStep {
  target: StepTarget;
  title: string;
  text: string;
  cloneScale?: number;
  tooltipSide?: TooltipSide;
  /** Max ms to wait for the target to appear. Overrides `TourOptions.targetTimeout`. */
  timeout?: number;
  /** Runs before looking for the target. If it returns a promise (e.g. a route change), the tour waits for it. */
  onEnter?: () => void | Promise<void>;
  onLeave?: () => void | Promise<void>;
  /**
   * 'copy' (default): a copy of the element flies out and grows.
   * 'real': the camera moves onto the real element instead, with nothing to do but read.
   * Use it when the element's look depends on its parents (table cells, items styled by
   * their list), which a copy outside the page loses. Steps with `action` are always real.
   */
  mode?: 'copy' | 'real';
  /** For real steps: magnify the page on the element. Default 1. Same caveats as `StepAction.zoom`. */
  zoom?: number;
  /**
   * For real and interactive steps: a selector for elements that belong to the step besides
   * the target, while they're visible. Typically the popup the target opens (a select's
   * option list, a menu), which libraries render elsewhere in the DOM. The spotlight
   * covers them too, and in interactive steps they take clicks and count as the target.
   */
  include?: string;
  /** Makes the step interactive. `cloneScale` doesn't apply then. */
  action?: StepAction;
}

export interface TourOptions {
  steps: TourStep[];
  zoomOutScale?: number;
  overlayOpacity?: number;
  /**
   * The element that holds the app (the one that scrolls during the tour).
   * Defaults to the first match of `#app, #root, #__nuxt, #__next`; if there is none,
   * the body's children are wrapped in a temporary container.
   */
  root?: string | HTMLElement;
  /** Max ms to wait for each step's target to appear. Default 4000. */
  targetTimeout?: number;
  /** What to do when a step's target never appears: skip to the next step (default) or end the tour. */
  onMissingTarget?: 'skip' | 'end';
  labels?: Partial<TourLabels>;
  onEnd?: () => void;
}
