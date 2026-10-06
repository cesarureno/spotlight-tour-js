# spotlight-tour

[![npm](https://img.shields.io/npm/v/spotlight-tour)](https://www.npmjs.com/package/spotlight-tour)

[English](README.md) · **Español**

Tours de onboarding con efecto cinematográfico. Al iniciar, la página se aleja como si la cámara retrocediera. En cada paso, el elemento que quieres mostrar sale volando de la página y crece al centro de la pantalla, con un tooltip para avanzar.

- JavaScript puro: funciona con Vue, React, Svelte o HTML sin framework.
- Sin dependencias. Los estilos se inyectan solos.
- Compatible con SSR: no toca `window` ni `document` hasta llamar a `start()`.
- Tipos de TypeScript incluidos.

**[Ver el demo →](https://cesarureno.github.io/spotlight-tour-js/)** Prueba cada tipo de paso, haz el tour de la página de documentación y abre una app de ejemplo.

## Cómo funciona

Cada tour pasa por tres fases:

1. **Alejamiento.** El `<body>` se encoge (60 % por defecto) y queda flotando sobre un fondo oscuro. La raíz de la app (`#app`) se recorta a la altura de la ventana y se vuelve el contenedor que se desplaza. Así el tour puede mover la mini página hasta cada elemento sin que el usuario la desplace.
2. **Vuelo.** Para cada paso, la mini página se desplaza hasta el elemento y lo marca con un contorno. Después, una copia del elemento vuela a la franja libre debajo de la mini página y crece hasta 2.2 veces su tamaño (configurable).
3. **Tooltip.** Junto a la copia aparece el tooltip con título, texto, puntos de progreso y botones para avanzar, regresar o cerrar.

Los [pasos interactivos](#pasos-interactivos) funcionan distinto: en lugar de una copia, la cámara se acerca al elemento real y el usuario tiene que usarlo para avanzar.

### Detalles que importan si lo integras en una app

- **No mueve los nodos de tu página.** Escala el `<body>` en su lugar, así que Vue, React y los demás conservan sus referencias al DOM. Lo que tu framework monta directo en el body (diálogos, toasts, menús) se encoge junto con la página y queda bien posicionado.
- **Las capas del tour cuelgan de `<html>`, junto al `<body>`.** Son el fondo oscuro, la copia y el tooltip. Así no heredan el escalado.
- **Al terminar restaura todo:** los estilos de `<html>`, `<body>` y la raíz quedan como estaban. El scroll de la ventana queda donde terminó el último paso.
- **La copia es una foto del elemento.** No es interactiva y lleva `pointer-events: none`. Si el usuario debe usar el elemento de verdad, haz el paso [interactivo](#pasos-interactivos).

## Instalación

```bash
npm install spotlight-tour
```

El paquete es [`spotlight-tour` en npm](https://www.npmjs.com/package/spotlight-tour). El repositorio se llama `spotlight-tour-js`, pero el paquete no.

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

Carga el build UMD desde un CDN. Fija la versión menor (`@0.4` trae la última `0.4.x`) para que una versión incompatible no llegue a tu página sin avisar.

```html
<script src="https://unpkg.com/spotlight-tour@0.4/dist/index.umd.js"></script>
<script>
  // El build UMD expone la clase en .default
  const tour = new SpotlightTour.default({ steps: [/* ... */] });
  tour.start();
</script>
```

### Elementos reales

La copia sale volando de la página, así que pierde cualquier estilo que venga de sus padres: una celda con el estilo de su tabla, una opción con el estilo de su menú. Para esos, usa `mode: 'real'`. La cámara se acerca al elemento en su lugar, como en un paso interactivo, pero no hay nada que hacer: «Siguiente» está habilitado y la página no recibe clicks.

```js
{
  target: () => [...document.querySelectorAll('th')].find(th => th.textContent.includes('Capturó')),
  title: 'Columna nueva',
  text: 'Muestra quién capturó el vale.',
  mode: 'real',
}
```

### Pasos interactivos

Agrega `action` a un paso y deja de ser una demostración del elemento: el usuario tiene que usarlo. La cámara pasa de la página encogida a la página real, centrada en el elemento, con el resto oscurecido y sin poder tocarse. «Siguiente» queda deshabilitado hasta que el usuario hace lo que pide el paso; luego el tour avanza solo.

```js
steps: [
  {
    // Un click real: se ejecuta el handler de la app (aquí, abre el vale).
    target: '[data-tour="ver-vale"]',
    title: 'Abre un vale',
    text: 'Dale click al ojo de cualquier fila.',
    action: {
      until: () => document.querySelector('.p-dialog') !== null, // listo cuando el modal está abierto
    },
  },
  {
    // Escribir no hace daño. intercept bloquea Enter, así que el formulario no se envía.
    target: '#signup-email',
    title: 'Tu correo de trabajo',
    text: 'Escribe cualquier dirección.',
    action: { type: 'input', intercept: true, zoom: 1.4 },
  },
  {
    // intercept: el click cuenta, pero los handlers de la app nunca se ejecutan. No se guarda nada.
    target: '#boton-guardar',
    title: 'Guarda tus cambios',
    text: 'Este es el botón que guarda. Dale click.',
    action: { type: 'click', intercept: true },
  },
],
```

**¿Cuándo se cumple el paso?**

| `type` | Se cumple cuando el usuario… |
|---|---|
| `'click'` (por defecto) | hace click en el elemento o en algo dentro de él. |
| `'input'` | escribe en él y el campo no queda vacío. |
| `'change'` | lo cambia (selects, checkboxes, radios). |

Con `until`, el evento solo no basta: el paso se cumple cuando `until()` devuelve `true` (se revisa cada 150 ms). Úsalo cuando «listo» es un resultado, como «el modal está abierto» o «la columna se ve». Puedes usar `until` sin `type`; entonces cualquier interacción sirve mientras la condición se vuelva verdadera.

**Usar la app de verdad sin guardar nada.** Un tour que enseña haciendo no debe crear registros ni enviar formularios. Hay dos capas y conviene usar las dos:

1. **`intercept: true` en cada paso que guardaría o enviaría algo.** El tour escucha en la fase de captura de `window`, por donde pasa todo evento antes de llegar a tu app, y lo detiene ahí. El click (o el Enter) cuenta como hecho, pero tus handlers nunca se ejecutan. Los pasos con `intercept` también bloquean cualquier `submit` de formulario.
2. **Un candado en tu cliente HTTP mientras el tour corre.** `intercept` solo cubre lo que el usuario hace sobre el elemento de ese paso. El candado atrapa todo lo demás, como un watcher que guarda solo:

```js
// axios
http.interceptors.request.use(config => {
  if (tour.isActive && config.method !== 'get') {
    return Promise.reject(new Error('Bloqueado durante el recorrido'));
  }
  return config;
});
```

Los pasos sin `intercept` sirven para todo lo que solo lee o cambia la vista: abrir un modal de detalle, cambiar de pestaña, filtrar una tabla.

<a id="popups"></a>**Popups.** La lista de opciones de un select o un menú de acciones suele dibujarse en otra parte del DOM, fuera del target. Nómbralo en `include` y, mientras se vea, el hueco lo cubre también y sus clicks cuentan como del target:

```js
{
  target: '[data-tour="acciones-fila"]',
  title: 'Abre el registro',
  text: 'Abre el menú y elige «Ver».',
  include: '.p-menu-overlay', // el menú emergente de PrimeVue
  action: { until: () => document.querySelector('.p-dialog') !== null },
}
```

**Contenedores con scroll.** Si el elemento está dentro de algo que se desplaza por su cuenta, como el cuerpo de un modal largo, el tour lo trae a la vista primero.

**Elementos que se redibujan.** Si la app reemplaza el elemento mientras el paso está en pantalla (un calendario que se vuelve a dibujar al llegar sus datos), el tour lo vuelve a buscar con el mismo `target` y sigue al nuevo.

**Tamaño real por defecto.** Los pasos interactivos muestran el elemento a su tamaño real (`zoom: 1`). Con `zoom` mayor a 1 se agranda. Va bien con elementos simples como inputs y botones, pero los dropdowns y popovers que se posicionan con JavaScript pueden aparecer fuera de lugar mientras la página está agrandada.

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
| `mode` | `'copy' \| 'real'` | `'copy'` | `'real'` acerca la cámara al elemento en su lugar en vez de hacer volar una copia. Ver [Elementos reales](#elementos-reales). |
| `zoom` | `number` | `1` | Con `mode: 'real'`: agranda la página sobre el elemento. |
| `include` | `string` | — | Selector de elementos que pertenecen al paso además del target mientras se ven, como el popup que abre. Ver [Popups](#popups). |
| `action` | `StepAction` | — | Hace el paso [interactivo](#pasos-interactivos). Entonces `cloneScale` no aplica. |

### `StepAction`

| Campo | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `type` | `'click' \| 'input' \| 'change'` | `'click'` | Qué tiene que hacer el usuario con el elemento. |
| `until` | `() => boolean` | — | El paso se cumple cuando devuelve `true`. Se revisa cada 150 ms. |
| `intercept` | `boolean` | `false` | Detiene la interacción antes de que la app la vea. En clicks se traga el click completo (incluidos pointer down/up); en inputs, el Enter. En cualquier paso con `intercept` se bloquean los submits de formulario. |
| `autoAdvance` | `boolean` | `true` | Pasa solo al siguiente paso cuando se cumple. |
| `zoom` | `number` | `1` | Agranda la página sobre el elemento. Se limita para que el elemento quepa en pantalla. |
| `hint` | `string` | según `type` | La instrucción bajo el texto del paso, por ejemplo «Cambia a anual». |

### `TourLabels`

```ts
{
  prev: string;   // 'Back'
  next: string;   // 'Next'
  done: string;   // 'Done'
  close: string;  // 'Close tour' — etiqueta accesible del botón ×
  step: (current: number, total: number) => string; // 'Step 1 / 5'
  clickHint: string;  // 'Click it to continue'
  inputHint: string;  // 'Type something to continue'
  changeHint: string; // 'Pick an option to continue'
  actionDone: string; // 'Nice! That’s it.'
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

Las flechas no saltan un paso interactivo que el usuario no ha cumplido, y se ignoran mientras escribe en un campo.

## Limitaciones conocidas

- **La copia es estática.** Un `<canvas>` (por ejemplo, gráficas de Chart.js) sale en blanco. Los inputs muestran su valor inicial, no lo que el usuario escribió.
- **Estilos que dependen del elemento padre.** Reglas como `.sidebar .item` no se aplican en la copia, porque esta cuelga de `<html>`. Las variables CSS definidas en `:root` sí funcionan. Para esos elementos usa [`mode: 'real'`](#elementos-reales).
- **Elementos `position: fixed` dentro de la raíz de la app.** Mientras el tour corre, se mueven junto con el contenido en lugar de quedarse fijos. Los `position: sticky` sí funcionan.
- **Pasos interactivos con `zoom` mayor a 1.** Los popups que se posicionan con JavaScript (dropdowns, popovers) pueden aparecer fuera de lugar. Deja `zoom: 1` en los pasos que abren uno.
- **Los colores del tooltip y del contorno** son índigo (`#6366f1`) y por ahora no se pueden configurar.

## Desarrollo

```bash
npm install
npm run build   # compila dist/ (ESM, CJS, UMD y tipos)
npm run dev     # compila al guardar
npm run demo    # sirve el proyecto en http://localhost:3000
npm run lint
npm run typecheck
npm test
```

Con `npm run demo` corriendo, abre `http://localhost:3000/demo/`. `index.html` es la página de documentación, con su propio tour y una tarjeta para probar cada tipo de paso. `app.html` es una app de ejemplo; todo lo que agrega la librería está al final del archivo.

Cada push a `main` publica el demo en GitHub Pages (`.github/workflows/pages.yml`).

Los cambios entran por pull request hacia `main`. El CI (`.github/workflows/ci.yml`) corre el lint, la revisión de tipos, los tests y una revisión del paquete tal como lo publicaría npm.

Para sacar una versión, súbela en un pull request (`npm version patch --no-git-tag-version`). Cuando se haga merge, pon el tag en `main` y súbelo:

```bash
git tag v0.4.4 && git push origin v0.4.4
```

El tag dispara `.github/workflows/publish.yml`, que publica en npm.

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
