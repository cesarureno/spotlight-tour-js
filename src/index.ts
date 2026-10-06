import type { ActionType, StepAction, StepTarget, TourLabels, TourOptions, TourStep } from './types';
import { injectStyles } from './styles';
import { createOverlay, removeOverlay } from './overlay';
import { createFlyingClone, CloneHandle } from './clone';
import { createTooltip, markActionDone, positionTooltip } from './tooltip';
import { createStage, Stage } from './stage';
import { createSpotlight, SpotlightHandle } from './spotlight';
import { actionType, watchAction } from './action';

export type { ActionType, StepAction, StepTarget, TourLabels, TourOptions, TourStep };
export type { TooltipSide } from './types';

const DEFAULT_LABELS: TourLabels = {
  prev: 'Back',
  next: 'Next',
  done: 'Done',
  close: 'Close tour',
  step: (current, total) => `Step ${current} / ${total}`,
  clickHint: 'Click it to continue',
  inputHint: 'Type something to continue',
  changeHint: 'Pick an option to continue',
  actionDone: 'Nice! That’s it.',
};

// Length of the camera move (the body's transform transition is 0.55s).
const CAMERA_MS = 600;

export default class SpotlightTour {
  private readonly steps: TourStep[];
  private readonly zoomOutScale: number;
  private readonly overlayOpacity: number;
  private readonly root: string | HTMLElement | undefined;
  private readonly targetTimeout: number;
  private readonly onMissingTarget: 'skip' | 'end';
  private readonly labels: TourLabels;
  private readonly onEnd: () => void;

  private currentIndex = -1;
  private running = false;
  private ending = false;
  // Bumped on every navigation; async work from an older navigation checks it and bails.
  private navId = 0;

  private stage: Stage | null = null;
  private overlay: HTMLElement | null = null;
  private clone: CloneHandle | null = null;
  private tooltip: HTMLElement | null = null;
  private spotlight: SpotlightHandle | null = null;
  private stopWatching: (() => void) | null = null;
  private stepTimer: ReturnType<typeof setTimeout> | null = null;
  private stylesInjected = false;
  // Where the camera is: on the whole (shrunk) page, or on one real element.
  private camera: 'overview' | 'focus' = 'overview';
  // An interactive step whose action the user hasn't done yet: no skipping it by keyboard.
  private awaitingAction = false;

  private readonly handleKeydown = (e: KeyboardEvent): void => {
    if (!this.running) return;
    // While the user types in a field of an interactive step, arrows move the caret.
    if (e.key !== 'Escape' && isEditable(e.target)) return;
    const last = this.steps.length - 1;
    switch (e.key) {
      case 'Escape':
        this.end();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        if (this.currentIndex < last && !this.awaitingAction) this.goTo(this.currentIndex + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        if (this.currentIndex > 0) this.goTo(this.currentIndex - 1);
        break;
    }
  };

  constructor(options: TourOptions) {
    this.steps           = options.steps;
    this.zoomOutScale    = options.zoomOutScale ?? 0.6;
    this.overlayOpacity  = options.overlayOpacity ?? 0.88; // backdrop behind the page — needs to be dark enough
    this.root            = options.root;
    this.targetTimeout   = options.targetTimeout ?? 4000;
    this.onMissingTarget = options.onMissingTarget ?? 'skip';
    this.labels          = { ...DEFAULT_LABELS, ...options.labels };
    this.onEnd           = options.onEnd ?? (() => {});
  }

  get isActive(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running || this.ending || typeof document === 'undefined') return;

    this.ensureStyles();
    this.running = true;
    this.currentIndex = -1;

    this.stage = createStage(this.root);
    this.overlay = createOverlay(this.overlayOpacity);
    this.stage.overview(this.zoomOutScale);
    this.camera = 'overview';

    document.addEventListener('keydown', this.handleKeydown);

    // Wait for the zoom-out (0.55s) to finish: the clone measures the target's
    // on-screen position, and mid-transition that position is still moving.
    this.stepTimer = setTimeout(() => this.goTo(0), 600);
  }

  async goTo(index: number): Promise<void> {
    if (!this.running || index < 0 || index >= this.steps.length) return;

    const nav  = ++this.navId;
    const from = this.currentIndex;
    const alive = () => this.running && nav === this.navId;

    this.clearStep();

    try {
      await this.steps[from]?.onLeave?.();
      if (!alive()) return;

      this.currentIndex = index;
      const step = this.steps[index];
      await step.onEnter?.();
      if (!alive()) return;

      const target = await waitForTarget(step.target, step.timeout ?? this.targetTimeout, alive);
      if (!alive()) return;

      if (!target) {
        console.warn(`[spotlight-tour] Element not found for step ${index + 1}: "${describeTarget(step.target)}"`);
        this.skipMissing(index, from);
        return;
      }

      if (step.action) {
        await this.showInteractiveStep(step, step.action, index, target, alive);
        return;
      }

      // Coming from an interactive step, pull the camera back to the whole page first:
      // the clone measures where the element is on the shrunk page.
      if (this.camera === 'focus') {
        this.stage!.overview(this.zoomOutScale);
        this.camera = 'overview';
        await delay(CAMERA_MS);
        if (!alive()) return;
      }

      // Scroll the mini-page so the target element is visible, THEN fly the clone.
      // The user sees where on the page the element lives before it zooms out.
      await this.stage!.scrollTo(target);
      if (!alive()) return;

      this.showStep(step, index, target);
    } catch (error) {
      if (!alive()) return;
      console.error(`[spotlight-tour] Step ${index + 1} failed:`, error);
      this.skipMissing(index, from);
    }
  }

  next(): void {
    this.goTo(this.currentIndex + 1);
  }

  prev(): void {
    this.goTo(this.currentIndex - 1);
  }

  end(): void {
    if (!this.running) return;

    this.navId++;
    this.steps[this.currentIndex]?.onLeave?.();
    this.clearStep();

    this.running = false;
    this.ending = true;
    this.currentIndex = -1;

    document.removeEventListener('keydown', this.handleKeydown);

    this.stage?.overview(1);

    if (this.overlay) {
      removeOverlay(this.overlay);
      this.overlay = null;
    }

    // Undo the stage once the page is back to full size.
    setTimeout(() => {
      this.stage?.restore();
      this.stage = null;
      this.ending = false;
      this.onEnd();
    }, 570);
  }

  // ── private helpers ──────────────────────────────────────────────────────

  private showStep(step: TourStep, index: number, target: HTMLElement): void {
    this.clone = createFlyingClone(target, step.cloneScale ?? 2.2, this.zoomOutScale);

    // Show tooltip once the clone is near its final position
    this.stepTimer = setTimeout(() => {
      if (!this.running || !this.clone) return;
      const last = this.steps.length - 1;
      this.tooltip = createTooltip({
        title: step.title,
        text: step.text,
        side: step.tooltipSide ?? 'below',
        stepIndex: index,
        totalSteps: this.steps.length,
        labels: this.labels,
        visualRect: this.clone.getVisualRect(),
        onPrev: index > 0 ? () => this.goTo(index - 1) : undefined,
        onNext: index < last ? () => this.goTo(index + 1) : undefined,
        onClose: () => this.end(),
      });
    }, 450);
  }

  // The camera moves onto the real element and the user has to use it. No clone here:
  // a copy can't be clicked or typed into.
  private async showInteractiveStep(
    step: TourStep,
    action: StepAction,
    index: number,
    target: HTMLElement,
    alive: () => boolean,
  ): Promise<void> {
    await this.stage!.scrollTo(target);
    if (!alive()) return;

    this.stage!.focus(target, action.zoom ?? 1);
    this.camera = 'focus';
    await delay(CAMERA_MS);
    if (!alive()) return;

    const side = step.tooltipSide ?? 'below';
    // The tooltip follows the hole when using the element changes its size (a panel
    // that opens, a field that grows) so it never ends up covering it.
    this.spotlight = createSpotlight(target, () => {
      if (this.tooltip) positionTooltip(this.tooltip, this.spotlight!.rect(), side);
    });
    this.stage!.setPointer(true);
    this.awaitingAction = true;

    const last = this.steps.length - 1;
    const tooltip = createTooltip({
      title: step.title,
      text: step.text,
      side,
      stepIndex: index,
      totalSteps: this.steps.length,
      labels: this.labels,
      visualRect: this.spotlight.rect(),
      hint: action.hint ?? this.hintFor(actionType(action)),
      onPrev: index > 0 ? () => this.goTo(index - 1) : undefined,
      onNext: index < last ? () => this.goTo(index + 1) : undefined,
      onClose: () => this.end(),
    });
    this.tooltip = tooltip;

    this.stopWatching = watchAction(target, action, () => {
      if (!alive()) return;
      this.awaitingAction = false;
      markActionDone(tooltip, this.labels.actionDone);

      // A beat to read the confirmation (and see what the click did) before moving on.
      if (action.autoAdvance !== false && index < last) {
        this.stepTimer = setTimeout(() => this.goTo(index + 1), 900);
      }
    });
  }

  private hintFor(type: ActionType | null): string {
    if (type === 'input') return this.labels.inputHint;
    if (type === 'change') return this.labels.changeHint;
    return this.labels.clickHint;
  }

  // A step whose target never showed up is skipped in the direction the user was
  // going. With nothing left that way, the tour ends instead of leaving the user on
  // a shrunken page with no tooltip to get out of it.
  private skipMissing(index: number, from: number): void {
    const direction = index >= from ? 1 : -1;
    const nextIndex = index + direction;

    if (this.onMissingTarget === 'end' || nextIndex < 0 || nextIndex >= this.steps.length) {
      this.end();
      return;
    }
    this.goTo(nextIndex);
  }

  private clearStep(): void {
    if (this.stepTimer !== null) {
      clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }
    this.stopWatching?.();
    this.stopWatching = null;
    this.awaitingAction = false;
    this.spotlight?.remove();
    this.spotlight = null;
    // Without the spotlight's blockers, the page must not take the pointer.
    this.stage?.setPointer(false);
    this.tooltip?.remove();
    this.tooltip = null;
    this.clone?.dismiss();
    this.clone = null;
  }

  private ensureStyles(): void {
    if (this.stylesInjected) return;
    injectStyles();
    this.stylesInjected = true;
  }
}

// ── module-level helpers ────────────────────────────────────────────────────

function resolveTarget(target: StepTarget): HTMLElement | null {
  let el: Element | null;
  try {
    el = typeof target === 'function' ? target() : document.querySelector(target);
  } catch (error) {
    console.error('[spotlight-tour] Invalid target:', error);
    return null;
  }
  // An element that is in the DOM but not rendered (display:none, v-show) can't be shown.
  return el instanceof HTMLElement && el.getClientRects().length > 0 ? el : null;
}

// Polls for the target: after a route change or while data loads, the framework
// renders it some time after the step starts.
function waitForTarget(
  target: StepTarget,
  timeout: number,
  alive: () => boolean,
): Promise<HTMLElement | null> {
  return new Promise(resolve => {
    const startTime = performance.now();

    const check = (): void => {
      if (!alive()) { resolve(null); return; }
      const el = resolveTarget(target);
      if (el) { resolve(el); return; }
      if (performance.now() - startTime >= timeout) { resolve(null); return; }
      setTimeout(check, 100);
    };

    check();
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

function describeTarget(target: StepTarget): string {
  return typeof target === 'function' ? target.toString().slice(0, 80) : target;
}
