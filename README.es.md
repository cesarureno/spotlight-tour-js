# spotlight-tour

[English](README.md) · **Español**

Tours de onboarding con efecto cinematográfico. Al iniciar, la página se aleja como si la cámara retrocediera. En cada paso, el elemento que quieres mostrar sale volando de la página y crece al centro de la pantalla, con un tooltip para avanzar.

- JavaScript puro: funciona con Vue, React, Svelte o HTML sin framework.
- Sin dependencias. Los estilos se inyectan solos.
- Compatible con SSR: no toca `window` ni `document` hasta llamar a `start()`.
- Tipos de TypeScript incluidos.

**[Ver el demo →](https://cesarureno.github.io/spotlight-tour-js/)** La misma app con y sin la librería, para comparar.

## Cómo funciona

Cada tour pasa por tres fases:

1. **Alejamiento.** El `<body>` se encoge (60 % por defecto) y queda flotando sobre un fondo oscuro. La raíz de la app (`#app`) se recorta a la altura de la ventana y se vuelve el contenedor que se desplaza. Así el tour puede mover la mini página hasta cada elemento sin que el usuario la desplace.
2. **Vuelo.** Para cada paso, la mini página se desplaza hasta el elemento y lo marca con un contorno. Después, una copia del elemento vuela a la franja libre debajo de la mini página y crece hasta 2.2 veces su tamaño (configurable).
3. **Tooltip.** Junto a la copia aparece el tooltip con título, texto, puntos de progreso y botones para avanzar, regresar o cerrar.

### Detalles que importan si lo integras en una app

- **No mueve los nodos de tu página.** Escala el `<body>` en su lugar, así que Vue, React y los demás conservan sus referencias al DOM. Lo que tu framework monta directo en el body (diálogos, toasts, menús) se encoge junto con la página y queda bien posicionado.
- **Las capas del tour cuelgan de `<html>`, junto al `<body>`.** Son el fondo oscuro, la copia y el tooltip. Así no heredan el escalado.
- **Al terminar restaura todo:** los estilos de `<html>`, `<body>` y la raíz quedan como estaban. El scroll de la ventana queda donde terminó el último paso.
- **La copia es una foto del elemento.** No es interactiva y lleva `pointer-events: none`.

## Instalación

Todavía no está publicada en npm. Se instala desde GitHub: npm la descarga y la compila sola gracias al script `prepare`.

```bash
npm install github:cesarureno/spotlight-tour-js
```

Para fijar una versión, usa un tag o un commit:

```bash
npm install github:cesarureno/spotlight-tour-js#v0.1.0
```

### Probarla localmente sin subir cambios

```bash
# en la carpeta de la librería
npm install && npm run build
npm link

# en tu proyecto
npm link spotlight-tour
```

## Uso

```js
import SpotlightTour from 'spotlight-tour';

const tour = new SpotlightTour({
  steps: [
    {
      target: '#nav',
      title: 'Navegación principal',
      text: 'Desde aquí accedes a todos los módulos.',
    },
    {
      target: '.stats-row',
      title: 'Tus indicadores',
      text: 'Se actualizan cada vez que entras.',
      cloneScale: 1.6,
      tooltipSide: 'above',
    },
  ],
  onEnd: () => console.log('tour terminado'),
});

tour.start();
```

### Con Vue y vue-router (tours que cambian de pantalla)

`onEnter` puede devolver una promesa: el tour la espera y luego busca el elemento. Lo busca durante 4 segundos (configurable), así que alcanza el tiempo para que la ruta cargue y la API responda.

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
      target: '[data-tour="tabla-vales"]',
      title: 'Vales de transferencia',
      text: 'Aquí están todos los vales.',
      onEnter: () => router.push('/transferencia-mercancia'),
    },
    {
      // Sin un selector estable, una función que devuelva el elemento.
      target: () => [...document.querySelectorAll('th')].find(th => th.textContent.includes('Capturó')),
      title: 'Columna «Capturó»',
      text: 'Muestra quién capturó el vale.',
    },
  ],
});
```

Créalo una sola vez, fuera de los componentes, para que `start()` no se llame dos veces.

### Desde una etiqueta `<script>`

Compila con `npm run build` y sirve `dist/index.umd.js` junto a tu página. `dist/` no se versiona en el repositorio.

```html
<script src="index.umd.js"></script>
<script>
  // El build UMD expone la clase en .default
  const tour = new SpotlightTour.default({ steps: [/* ... */] });
  tour.start();
</script>
```

## API

### `new SpotlightTour(options)`

| Opción | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `steps` | `TourStep[]` | — | Los pasos del tour. Obligatorio. |
| `zoomOutScale` | `number` | `0.6` | Tamaño de la página alejada (1 = sin alejar). |
| `overlayOpacity` | `number` | `0.88` | Opacidad del fondo oscuro detrás de la página. |
| `root` | `string \| HTMLElement` | `#app, #root, #__nuxt, #__next` | Raíz de la app: el elemento que se desplaza durante el tour. Debe ser hijo directo del `<body>`. Si no hay ninguno, los hijos del body se envuelven en un contenedor temporal. |
| `targetTimeout` | `number` | `4000` | Milisegundos que espera a que aparezca el elemento de cada paso. |
| `onMissingTarget` | `'skip' \| 'end'` | `'skip'` | Qué hacer si el elemento nunca aparece: saltar al siguiente paso (en la dirección en que iba el usuario) o terminar el tour. |
| `labels` | `Partial<TourLabels>` | en inglés | Textos del tooltip (ver abajo). |
| `onEnd` | `() => void` | — | Se llama cuando el tour terminó y la página ya se restauró. |

### `TourStep`

| Campo | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `target` | `string \| () => Element \| null` | — | Selector CSS o función que devuelve el elemento. Debe estar visible: uno con `display: none` cuenta como que no existe. |
| `title` | `string` | — | Título del tooltip. |
| `text` | `string` | — | Texto del tooltip. Se muestra como texto plano, no como HTML. |
| `cloneScale` | `number` | `2.2` | Cuánto crece la copia. Se reduce sola si no cabe en la pantalla. |
| `tooltipSide` | `'below' \| 'above' \| 'left' \| 'right'` | `'below'` | Lado de la copia donde aparece el tooltip. |
| `timeout` | `number` | `targetTimeout` | Espera máxima solo para este paso. |
| `onEnter` | `() => void \| Promise<void>` | — | Corre antes de buscar el elemento. Si devuelve una promesa, el tour la espera. |
| `onLeave` | `() => void \| Promise<void>` | — | Corre al salir del paso, también cuando el tour se cierra. |

### `TourLabels`

```ts
{
  prev: string;   // 'Back'
  next: string;   // 'Next'
  done: string;   // 'Done'
  close: string;  // 'Close tour' — etiqueta accesible del botón ×
  step: (current: number, total: number) => string; // 'Step 1 / 5'
}
```

### Métodos

| Método | Descripción |
|---|---|
| `start()` | Inicia el tour. No hace nada si ya está corriendo o terminando de cerrarse. |
| `goTo(index)` | Va al paso `index` (desde 0). Devuelve una promesa que se resuelve cuando el paso se mostró o se saltó. |
| `next()` / `prev()` | Paso siguiente o anterior. |
| `end()` | Cierra el tour y restaura la página. |
| `isActive` | `true` mientras el tour corre. Sirve, por ejemplo, para bloquear peticiones que guardan datos. |

### Teclado

| Tecla | Acción |
|---|---|
| `→` / `↓` | Siguiente paso |
| `←` / `↑` | Paso anterior |
| `Esc` | Cerrar el tour |

## Limitaciones conocidas

- **La copia es estática.** Un `<canvas>` (por ejemplo, gráficas de Chart.js) sale en blanco. Los inputs muestran su valor inicial, no lo que el usuario escribió.
- **Estilos que dependen del elemento padre.** Reglas como `.sidebar .item` no se aplican en la copia, porque esta cuelga de `<html>`. Las variables CSS definidas en `:root` sí funcionan.
- **Elementos `position: fixed` dentro de la raíz de la app.** Mientras el tour corre, se mueven junto con el contenido en lugar de quedarse fijos. Los `position: sticky` sí funcionan.
- **Los colores del tooltip y del contorno** son índigo (`#6366f1`) y por ahora no se pueden configurar.

## Desarrollo

```bash
npm install
npm run build   # compila dist/ (ESM, CJS, UMD y tipos)
npm run dev     # compila al guardar
npm run demo    # sirve el proyecto en http://localhost:3000
```

Con `npm run demo` corriendo, abre `http://localhost:3000/demo/`. Hay dos páginas con la misma app: `without-tour.html` y `with-tour.html`. Todo lo que agrega la librería está al final de `with-tour.html`.

Cada push a `main` publica el demo en GitHub Pages (`.github/workflows/pages.yml`).

Estructura:

```
src/
├── index.ts     clase SpotlightTour: navegación entre pasos y ciclo de vida
├── stage.ts     prepara la página (escala, scroll de la raíz) y la restaura
├── clone.ts     la copia que vuela y crece
├── tooltip.ts   el tooltip con navegación
├── overlay.ts   el fondo oscuro
├── styles.ts    estilos que se inyectan en el <head>
└── types.ts     tipos públicos
```

## Licencia

MIT
