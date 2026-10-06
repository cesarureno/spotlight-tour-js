# spotlight-tour

**English** · [Español](README.es.md)

Onboarding tours with a cinematic effect. When the tour starts, the page pulls back as if the camera were moving away. On each step, the element you want to show flies out of the page and grows in the middle of the screen, with a tooltip to move through the tour.

- Plain JavaScript: works with Vue, React, Svelte, or HTML with no framework.
- No dependencies. Styles are injected automatically.
- SSR-safe: it doesn't touch `window` or `document` until you call `start()`.
- TypeScript types included.

## How it works

Every tour goes through three phases:

1. **Zoom out.** The `<body>` shrinks (to 60% by default) and floats over a dark backdrop. The app root (`#app`) is clipped to the window height and becomes the scrolling container. That way the tour can scroll the mini-page to each element without the user scrolling it.
2. **Flight.** For each step, the mini-page scrolls to the element and outlines it. Then a copy of the element flies to the free strip below the mini-page and grows up to 2.2× its size (configurable).
3. **Tooltip.** A tooltip appears next to the copy, with a title, text, progress dots, and buttons to go forward, go back, or close.

### Things that matter when you integrate it into an app

- **It doesn't move your page's nodes.** It scales the `<body>` in place, so Vue, React, and other frameworks keep their DOM references. Anything your framework mounts straight into the body (dialogs, toasts, menus) shrinks with the page and stays correctly positioned.
- **The tour's layers hang from `<html>`, next to the `<body>`.** These are the dark backdrop, the copy, and the tooltip. That keeps them out of the scaling.
- **When it ends, everything is restored:** the styles of `<html>`, `<body>`, and the root go back to what they were. The window scroll stays where the last step left it.
- **The copy is a snapshot of the element.** It isn't interactive and has `pointer-events: none`.

## Installation

It isn't published to npm yet. Install it from GitHub: npm downloads it and builds it automatically thanks to the `prepare` script.

```bash
npm install github:cesarureno/spotlight-tour-js
```

To pin a version, use a tag or a commit:

```bash
npm install github:cesarureno/spotlight-tour-js#v0.1.0
```

If the repository is private, whoever installs it needs access to it. In CI or on a deploy server, that means an SSH key or a token with read access.

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

Build with `npm run build` and serve `dist/index.umd.js` next to your page. `dist/` isn't committed to the repository.

```html
<script src="index.umd.js"></script>
<script>
  // The UMD build exposes the class on .default
  const tour = new SpotlightTour.default({ steps: [/* ... */] });
  tour.start();
</script>
```

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

### `TourLabels`

```ts
{
  prev: string;   // 'Back'
  next: string;   // 'Next'
  done: string;   // 'Done'
  close: string;  // 'Close tour' — accessible label for the × button
  step: (current: number, total: number) => string; // 'Step 1 / 5'
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

## Known limitations

- **The copy is static.** A `<canvas>` (Chart.js charts, for example) comes out blank. Inputs show their initial value, not what the user typed.
- **Styles that depend on the parent element.** Rules like `.sidebar .item` don't apply to the copy, because it hangs from `<html>`. CSS variables defined on `:root` do work.
- **`position: fixed` elements inside the app root.** While the tour runs, they move with the content instead of staying fixed. `position: sticky` elements work fine.
- **The tooltip and outline colors** are indigo (`#6366f1`) and can't be configured yet.

## Development

```bash
npm install
npm run build   # builds dist/ (ESM, CJS, UMD, and types)
npm run dev     # rebuilds on save
npm run demo    # serves the project at http://localhost:3000
```

With `npm run demo` running, open `http://localhost:3000/demo/` and click "Iniciar tour".

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

## License

MIT
