# spotlight-tour

[![npm](https://img.shields.io/npm/v/spotlight-tour)](https://www.npmjs.com/package/spotlight-tour)

**English** · [Español](README.es.md)

Onboarding tours with a cinematic effect. When the tour starts, the page pulls back as if the camera were moving away. On each step, the element you want to show flies out of the page and grows in the middle of the screen, with a tooltip to move through the tour.

- Plain JavaScript: works with Vue, React, Svelte, or HTML with no framework.
- No dependencies. Styles are injected automatically.
- SSR-safe: it doesn't touch `window` or `document` until you call `start()`.
- TypeScript types included.

**[See the demo →](https://cesarureno.github.io/spotlight-tour-js/)** Try every kind of step, take a tour of the docs page, and open a demo app.

## How it works

Every tour goes through three phases:

1. **Zoom out.** The `<body>` shrinks (to 60% by default) and floats over a dark backdrop. The app root (`#app`) is clipped to the window height and becomes the scrolling container. That way the tour can scroll the mini-page to each element without the user scrolling it.
2. **Flight.** For each step, the mini-page scrolls to the element and outlines it. Then a copy of the element flies to the free strip below the mini-page and grows up to 2.2× its size (configurable).
3. **Tooltip.** A tooltip appears next to the copy, with a title, text, progress dots, and buttons to go forward, go back, or close.

[Interactive steps](#interactive-steps) work differently: instead of a copy, the camera moves onto the real element and the user has to use it to move on.

### Things that matter when you integrate it into an app

- **It doesn't move your page's nodes.** It scales the `<body>` in place, so Vue, React, and other frameworks keep their DOM references. Anything your framework mounts straight into the body (dialogs, toasts, menus) shrinks with the page and stays correctly positioned.
- **The tour's layers hang from `<html>`, next to the `<body>`.** These are the dark backdrop, the copy, and the tooltip. That keeps them out of the scaling.
- **When it ends, everything is restored:** the styles of `<html>`, `<body>`, and the root go back to what they were. The window scroll stays where the last step left it.
- **The copy is a snapshot of the element.** It isn't interactive and has `pointer-events: none`. When the user should actually use the element, make the step [interactive](#interactive-steps).

## Installation

```bash
npm install spotlight-tour
```

The package is [`spotlight-tour` on npm](https://www.npmjs.com/package/spotlight-tour). The repository is called `spotlight-tour-js`, but the package isn't.

### Trying it locally without pushing changes

```bash
# in the library folder
npm install && npm run build
npm link

# in your project
npm link spotlight-tour
```

## Usage

```js
import SpotlightTour from 'spotlight-tour';

const tour = new SpotlightTour({
  steps: [
    {
      target: '#nav',
      title: 'Main navigation',
      text: 'Every module is one click away from here.',
    },
    {
      target: '.stats-row',
      title: 'Your metrics',
      text: 'They update every time you log in.',
      cloneScale: 1.6,
      tooltipSide: 'above',
    },
  ],
  onEnd: () => console.log('tour finished'),
});

tour.start();
```

### With Vue and vue-router (tours across pages)

`onEnter` can return a promise: the tour waits for it and then looks for the element. It keeps looking for 4 seconds (configurable), which leaves time for the route to load and the API to respond.

```js
import SpotlightTour from 'spotlight-tour';
import router from '@/router';

const tour = new SpotlightTour({
  labels: {
    prev: 'Atrás',
    next: 'Siguiente',
    done: 'Listo',
    close: 'Cerrar recorrido',
    step: (current, total) => `Paso ${current} de ${total}`,
  },
  steps: [
    {
      target: '[data-tour="transfers-table"]',
      title: 'Transfer vouchers',
      text: 'All the vouchers are here.',
      onEnter: () => router.push('/transferencia-mercancia'),
    },
    {
      // No stable selector? Use a function that returns the element.
      target: () => [...document.querySelectorAll('th')].find(th => th.textContent.includes('Capturó')),
      title: '"Captured by" column',
      text: 'Shows who entered the voucher.',
    },
  ],
});
```

Create it once, outside your components, so `start()` doesn't get called twice.

### From a `<script>` tag

Load the UMD build from a CDN. Pin the minor version (`@0.4` gets the latest `0.4.x`) so a breaking release doesn’t reach your page unannounced.

```html
<script src="https://unpkg.com/spotlight-tour@0.4/dist/index.umd.js"></script>
<script>
  // The UMD build exposes the class on .default
  const tour = new SpotlightTour.default({ steps: [/* ... */] });
  tour.start();
</script>
```

### Real elements

A copy flies out of the page, so it loses any style that comes from its parents: a table cell styled by the table, a menu item styled by its menu. For those, use `mode: 'real'`. The camera moves onto the element in place, as in an interactive step, but there's nothing to do: "Next" is enabled and the page doesn't take clicks.

```js
{
  target: () => [...document.querySelectorAll('th')].find(th => th.textContent.includes('Captured by')),
  title: 'New column',
  text: 'Shows who entered the voucher.',
  mode: 'real',
}
```

### Interactive steps

Add `action` to a step and it stops being a demo of the element: the user has to use it. The camera moves from the shrunk page back to the real page, centered on the element, with the rest dimmed and unreachable. "Next" stays disabled until the user does what the step asks; then the tour moves on by itself.

```js
steps: [
  {
    // A real click: the app's own handler runs (here, it opens the voucher).
    target: '[data-tour="view-voucher"]',
    title: 'Open a voucher',
    text: 'Click the eye icon on any row.',
    action: {
      until: () => document.querySelector('.p-dialog') !== null, // done once the dialog is open
    },
  },
  {
    // Typing is harmless. intercept blocks Enter, so the form can't be sent.
    target: '#signup-email',
    title: 'Your work email',
    text: 'Type any address.',
    action: { type: 'input', intercept: true, zoom: 1.4 },
  },
  {
    // intercept: the click counts, but the app's handlers never run. Nothing is saved.
    target: '#save-button',
    title: 'Save your changes',
    text: 'This is the button that saves. Click it.',
    action: { type: 'click', intercept: true },
  },
],
```

**When is the step done?**

| `type` | Done when the user… |
|---|---|
| `'click'` (default) | clicks the element or anything inside it. |
| `'input'` | types in it and the field isn't empty. |
| `'change'` | changes it (selects, checkboxes, radios). |

With `until`, the event alone isn't enough: the step is done when `until()` returns `true` (it's checked every 150 ms). Use it when "done" is a result, like "the dialog is open" or "the column is visible". You can use `until` without `type`; then any interaction counts as long as the condition becomes true.

**Using the app for real without saving anything.** A tour that teaches by doing must not create records or send forms. There are two layers, and you want both:

1. **`intercept: true` on every step that would save or send.** The tour listens in the capture phase on `window`, which every event passes through before reaching your app, and stops it there. The click (or Enter) counts as done, but your handlers never run. Intercepting steps also block every form `submit`.
2. **A guard in your HTTP client while the tour runs.** `intercept` only covers what the user does on that step's element. A guard catches everything else, such as a watcher that autosaves:

```js
// axios
http.interceptors.request.use(config => {
  if (tour.isActive && config.method !== 'get') {
    return Promise.reject(new Error('Blocked during the onboarding tour'));
  }
  return config;
});
```

Steps without `intercept` are fine for anything that only reads or changes the view: opening a detail dialog, switching a tab, filtering a table.

<a id="popups"></a>**Popups.** A select's option list or an actions menu is usually rendered somewhere else in the DOM, outside the target. Name it in `include` and, while it's visible, the spotlight covers it too and its clicks count as the target's:

```js
{
  target: '[data-tour="row-actions"]',
  title: 'Open the record',
  text: 'Open the menu and pick "View".',
  include: '.p-menu-overlay', // PrimeVue's popup menu
  action: { until: () => document.querySelector('.p-dialog') !== null },
}
```

**Scrolling containers.** If the element is inside something that scrolls on its own, like the body of a long dialog, the tour scrolls it into view first.

**Elements that re-render.** If the app replaces the element while the step is on screen (a calendar that redraws when its data arrives), the tour finds it again with the same `target` and follows the new one.

**Real size by default.** Interactive steps show the element at its real size (`zoom: 1`). Set `zoom` above 1 to magnify it. That's fine for simple elements like inputs and buttons, but dropdowns and popovers that position themselves with JavaScript can show up out of place while the page is magnified.

## API

### `new SpotlightTour(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `steps` | `TourStep[]` | — | The tour's steps. Required. |
| `zoomOutScale` | `number` | `0.6` | Size of the zoomed-out page (1 = no zoom out). |
| `overlayOpacity` | `number` | `0.88` | Opacity of the dark backdrop behind the page. |
| `root` | `string \| HTMLElement` | `#app, #root, #__nuxt, #__next` | The app root: the element that scrolls during the tour. It must be a direct child of `<body>`. If there's none, the body's children are wrapped in a temporary container. |
| `targetTimeout` | `number` | `4000` | Milliseconds to wait for each step's element to appear. |
| `onMissingTarget` | `'skip' \| 'end'` | `'skip'` | What to do if the element never appears: skip to the next step (in the direction the user was going) or end the tour. |
| `labels` | `Partial<TourLabels>` | English | Tooltip texts (see below). |
| `onEnd` | `() => void` | — | Called once the tour has ended and the page has been restored. |

### `TourStep`

| Field | Type | Default | Description |
|---|---|---|---|
| `target` | `string \| () => Element \| null` | — | CSS selector, or a function that returns the element. It must be visible: an element with `display: none` counts as missing. |
| `title` | `string` | — | Tooltip title. |
| `text` | `string` | — | Tooltip text. Rendered as plain text, not HTML. |
| `cloneScale` | `number` | `2.2` | How much the copy grows. It shrinks automatically if it doesn't fit on screen. |
| `tooltipSide` | `'below' \| 'above' \| 'left' \| 'right'` | `'below'` | Which side of the copy the tooltip appears on. |
| `timeout` | `number` | `targetTimeout` | Max wait for this step only. |
| `onEnter` | `() => void \| Promise<void>` | — | Runs before looking for the element. If it returns a promise, the tour waits for it. |
| `onLeave` | `() => void \| Promise<void>` | — | Runs when leaving the step, including when the tour is closed. |
| `mode` | `'copy' \| 'real'` | `'copy'` | `'real'` moves the camera onto the element in place instead of flying a copy. See [Real elements](#real-elements). |
| `zoom` | `number` | `1` | For `mode: 'real'`: magnify the page on the element. |
| `include` | `string` | — | Selector for elements that belong to the step besides the target while they're visible, like the popup it opens. See [Popups](#popups). |
| `action` | `StepAction` | — | Makes the step [interactive](#interactive-steps). `cloneScale` doesn't apply then. |

### `StepAction`

| Field | Type | Default | Description |
|---|---|---|---|
| `type` | `'click' \| 'input' \| 'change'` | `'click'` | What the user has to do on the element. |
| `until` | `() => boolean` | — | The step is done once this returns `true`. Checked every 150 ms. |
| `intercept` | `boolean` | `false` | Stop the interaction before the app sees it. For clicks, the whole click (pointer down/up included) is swallowed; for inputs, Enter is. Form submits are blocked on any intercepting step. |
| `autoAdvance` | `boolean` | `true` | Go to the next step by itself once done. |
| `zoom` | `number` | `1` | Magnify the page on the element. It's capped so the element fits on screen. |
| `hint` | `string` | by `type` | The instruction under the step's text, e.g. "Switch to Yearly". |

### `TourLabels`

```ts
{
  prev: string;   // 'Back'
  next: string;   // 'Next'
  done: string;   // 'Done'
  close: string;  // 'Close tour' — accessible label for the × button
  step: (current: number, total: number) => string; // 'Step 1 / 5'
  clickHint: string;  // 'Click it to continue'
  inputHint: string;  // 'Type something to continue'
  changeHint: string; // 'Pick an option to continue'
  actionDone: string; // 'Nice! That’s it.'
}
```

### Methods

| Method | Description |
|---|---|
| `start()` | Starts the tour. Does nothing if it's already running or still closing. |
| `goTo(index)` | Goes to step `index` (0-based). Returns a promise that resolves once the step was shown or skipped. |
| `next()` / `prev()` | Next or previous step. |
| `end()` | Closes the tour and restores the page. |
| `isActive` | `true` while the tour is running. Useful, for example, to block requests that save data. |

### Keyboard

| Key | Action |
|---|---|
| `→` / `↓` | Next step |
| `←` / `↑` | Previous step |
| `Esc` | Close the tour |

The arrows don't skip an interactive step the user hasn't done yet, and they're ignored while the user types in a field.

## Known limitations

- **The copy is static.** A `<canvas>` (Chart.js charts, for example) comes out blank. Inputs show their initial value, not what the user typed.
- **Styles that depend on the parent element.** Rules like `.sidebar .item` don't apply to the copy, because it hangs from `<html>`. CSS variables defined on `:root` do work. Use [`mode: 'real'`](#real-elements) for those elements.
- **`position: fixed` elements inside the app root.** While the tour runs, they move with the content instead of staying fixed. `position: sticky` elements work fine.
- **Interactive steps with `zoom` above 1.** Popups positioned with JavaScript (dropdowns, popovers) can show up out of place. Keep `zoom: 1` for steps that open one.
- **The tooltip and outline colors** are indigo (`#6366f1`) and can't be configured yet.

## Development

```bash
npm install
npm run build   # builds dist/ (ESM, CJS, UMD, and types)
npm run dev     # rebuilds on save
npm run demo    # serves the project at http://localhost:3000
npm run lint
npm run typecheck
npm test
```

With `npm run demo` running, open `http://localhost:3000/demo/`. `index.html` is the docs page, with its own tour and a card to try each kind of step. `app.html` is a sample app; everything the library adds is at the end of the file.

Every push to `main` publishes the demo to GitHub Pages (`.github/workflows/pages.yml`).

Changes go through a pull request against `main`. CI (`.github/workflows/ci.yml`) runs the lint, the type check, the tests, and a check of the package as npm would ship it.

To release, bump the version in a pull request (`npm version patch --no-git-tag-version`). Once it's merged, tag `main` and push the tag:

```bash
git tag v0.4.4 && git push origin v0.4.4
```

The tag runs `.github/workflows/publish.yml`, which publishes to npm.

Structure:

```
src/
├── index.ts     SpotlightTour class: step navigation and lifecycle
├── stage.ts     prepares the page (scale, root scroll) and restores it
├── clone.ts     the copy that flies and grows
├── tooltip.ts   the tooltip with navigation
├── overlay.ts   the dark backdrop
├── styles.ts    styles injected into the <head>
└── types.ts     public types
```

## Like it?

If spotlight-tour is useful to you, or you just like it, [give it a star on GitHub](https://github.com/cesarureno/spotlight-tour-js). It helps other developers find it.

[![A spotlight-tour tour on this repository: the page zooms out, the Star button flies out and grows, then the camera moves onto it and a click turns it into Starred](https://raw.githubusercontent.com/cesarureno/spotlight-tour-js/main/.github/assets/star.gif)](https://github.com/cesarureno/spotlight-tour-js)

## License

MIT
