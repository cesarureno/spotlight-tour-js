export type TooltipSide = 'above' | 'below' | 'left' | 'right';

/** A CSS selector, or a function that returns the element (useful for elements without a stable selector). */
export type StepTarget = string | (() => Element | null);

export interface TourLabels {
  prev: string;
  next: string;
  done: string;
  close: string;
  step: (current: number, total: number) => string;
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
