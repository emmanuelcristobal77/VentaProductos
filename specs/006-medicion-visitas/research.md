# Research: Medición de visitas

**Feature**: [spec.md](spec.md) | **Fecha**: 2026-11-12

La spec no deja preguntas abiertas: la única pregunta se resolvió el 2026-11-12. Este documento registra las decisiones técnicas del plan.

## 1. El servicio de estadísticas

- **Decision**: **Umami**, el que el propietario instaló en su Easypanel (proyecto `elisproductos`, servicios `umami` y `umami-db`) en `https://estadisticas.cristobalia.com`. Se revisó el 2026-11-12:
  - `/api/heartbeat` responde `{"ok":true}`;
  - `script.js` pesa **2,522 bytes**;
  - el script acepta los atributos `website-id`, `domains`, `before-send`, `auto-track`, `exclude-search`, `exclude-hash`, `host-url`, `tag` y `do-not-track`, y respeta `localStorage["umami.disabled"]`.
- **Rationale**: el propietario lo eligió frente a Google Analytics por privacidad, peso y velocidad. No usa cookies. No guarda la IP: la usa al recibir la visita para calcular el país y la ciudad aproximados, y para formar un identificador de sesión con una sal que cambia periódicamente, y luego la descarta. Los datos se quedan en el mismo servidor (Assumptions de la spec).
- **Alternatives considered**: Google Analytics, Cloudflare Web Analytics y los registros del proxy de Easypanel. Se descartaron antes de la spec y quedaron fuera de alcance.

## 2. Configuración: constantes, no variables de entorno

- **Decision**: la dirección del script, el `website-id` (`49b620b8-b094-49c2-9ff2-edf6ba9d0c38`) y el dominio medido (`app.cristobalia.com`) van como constantes en `src/lib/estadisticas.ts`.
- **Rationale**:
  - No son secretos: el `website-id` queda visible en el HTML de la página.
  - Hay un solo sitio.
  - FR-003 se cumple con el atributo `data-domains="app.cristobalia.com"`. El script de Umami compara `location.hostname` y no envía nada desde `localhost`, desde la IP de la laptop ni desde las pruebas. Así no hace falta distinguir entornos.
  - Cambiar de servicio o de dominio es un cambio de comportamiento, así que irá en una spec nueva de todos modos.
- **Alternatives considered**: una variable `NEXT_PUBLIC_*`. Se fija al compilar la imagen de Docker y exige configurar Easypanel, a cambio de nada. Una variable leída en el servidor tampoco aporta nada con un solo sitio.

## 3. Dónde se carga el script y con qué estrategia

- **Decision**: en `src/app/(cliente)/layout.tsx`, con el componente `Script` de Next.js y la estrategia `afterInteractive`, que es la predeterminada, dentro de un componente cliente `MedicionVisitas`. El layout del panel (`src/app/admin/...`) no lo incluye (FR-002).
- **Rationale**:
  - `afterInteractive` inserta el script después de la hidratación, con `async`. Así no bloquea el HTML ni la primera foto (FR-011). Según `node_modules/next/dist/docs/01-app/03-api-reference/02-components/script.md`, `beforeInteractive` solo sirve en el layout raíz y es para scripts críticos.
  - El script se carga una vez por documento. Umami se engancha a `history.pushState` y `replaceState`, así que cuenta también las páginas que Next.js abre sin recargar: producto, «Encargos», «Mis apartados» y los filtros de categoría, que son enlaces `?categoria=` (caso «Navegación sin recargar» de la spec).
  - El buscador y «Ver más» nunca escriben en la URL (`src/lib/estado-listas.ts`), así que no generan páginas vistas. Lo que el cliente escribe en el buscador nunca llega a Umami.
- **Alternatives considered**: `lazyOnload`. Espera a que el navegador esté desocupado, y perdería las visitas de quien entra y sale en uno o dos segundos. Con 2.5 KB y `async`, `afterInteractive` no mueve el LCP; se comprueba en el quickstart.

## 4. Que el panel nunca se cuente

- **Decision**: dos protecciones:
  1. El script solo se incluye en el layout de cliente (FR-002).
  2. El atributo `data-before-send` apunta a una función, `antesDeEnviarUmami`, que descarta cualquier envío cuya `url` empiece con `/admin`. La función pura vive en `src/lib/estadisticas.ts`. El componente `MedicionVisitas` la publica en `window` antes de que el script se cargue.
- **Rationale**: hoy no hay enlaces entre la sección de cliente y el panel. Pero si alguien pasa de una a otro sin recargar (con «atrás» o «adelante» del navegador, o con un enlace futuro), el script ya cargado seguiría escuchando `pushState` y `replaceState`. El filtro es barato y hace imposible contar el panel.
- **Alternatives considered**: `data-auto-track="false"` y contar cada página a mano desde React. Requiere esperar a que el script cargue y llevar una cola de páginas pendientes, y duplica lo que Umami ya hace bien.

## 5. El evento de interés: el toque al teléfono

- **Decision**: un componente cliente `EnlaceTelefono` sustituye las cinco etiquetas `<a href={telefono.enlace}>` de la sección de cliente:

  | Lugar | Archivo | Dato `producto` |
  |---|---|---|
  | Pie de página, en todas las páginas | `src/app/(cliente)/layout.tsx` | — |
  | Página de producto | `src/components/cliente/leyenda-producto.tsx` | nombre del producto |
  | Cada artículo de «Encargos» | `src/components/cliente/leyenda-producto.tsx` | nombre del artículo |
  | Búsqueda sin resultados | `src/components/cliente/catalogo-buscable.tsx` | — |
  | Aviso de privacidad, sección «Dudas» | `src/app/(cliente)/aviso-de-privacidad/page.tsx` | — |

  `EnlaceTelefono` dibuja el mismo `<a href="tel:...">`, con las mismas clases e hijos. En su `onClick` llama a `window.umami?.track("interes-telefono", { pagina, producto })` dentro de `try/catch`, **sin `preventDefault`**. `LeyendaProducto` recibe un nuevo `producto` opcional con el nombre.
- **Rationale**: FR-006 exige que la llamada se abra igual aunque Umami no responda. No se usan los atributos `data-umami-event` del propio Umami: con ellos, en un enlace, el script cancela la navegación, espera a que termine el envío y luego abre el enlace. Si el servidor de estadísticas tarda, la llamada tardaría con él. Con `onClick` propio, el enlace `tel:` se abre de inmediato. Como abrir `tel:` no descarga la página, el envío termina por su lado. Si el script no cargó (servicio caído o bloqueador), `window.umami` no existe y no pasa nada.
  - `pagina` es `location.pathname`, sin la consulta. Así no se envían etiquetas ni filtros dos veces.
  - `producto` es el nombre visible, que ya es público. Facilita leer el tablero sin buscar ids.
- **Alternatives considered**: los atributos `data-umami-event`, descartados por el retraso. También contar el evento en el servidor, que no es posible, porque el `tel:` lo abre el teléfono y nunca llega a la app.

## 6. Privacidad de lo que se envía

- **Decision**: lo único que la app envía a Umami es lo que el script toma solo y el evento de la sección 5:
  - lo que toma el script: URL con su consulta, referente, título, idioma y tamaño de pantalla;
  - el evento: `pagina` y `producto`.
  - Sin `data-umami-event-*` en formularios y sin `identify()`. El formulario de «Mis apartados» envía el teléfono por una acción del servidor, que no lo pone en la URL; se revisó en `src/components/cliente/consulta-apartados.tsx`.
- **Rationale**: FR-004 y el caso «Mis apartados» de la spec. Ninguna URL de la sección de cliente lleva datos personales: solo `?categoria=`, `?subcategoria=` y las etiquetas `utm_*` que pone el propietario.
- **Por qué no se usa `data-exclude-search`**: quitaría la consulta de la URL y, con ella, las etiquetas de origen que pide FR-001.
- **Alternatives considered**: `data-do-not-track`. Ignora las visitas de navegadores con «No rastrear». La spec no lo pide y la medición ya es anónima, así que no se activa (Principio IV).

## 7. El aviso de privacidad

- **Decision**: se agregan tres párrafos en `src/lib/aviso-privacidad.ts`: uno en «Datos que recabamos», uno en «Para qué los usamos» y uno en «Con quién los compartimos». El texto exacto está en [contracts/interfaz.md](contracts/interfaz.md#3-aviso-de-privacidad). `actualizado` cambia a la fecha en que se publica (FR-010). Las 8 secciones, su orden y los demás párrafos no cambian (FR-008); las pruebas de la spec 003 siguen pasando.
- **Rationale**: es el procedimiento que la spec 003 prevé para cambiar el aviso. FR-007 se cumple porque el aviso y el script salen en el mismo despliegue. No hay forma de publicar uno sin el otro.
- **Fecha**: se escribe el día de la publicación, en la misma tarea del despliegue, para que coincida con el día en que empieza la medición.

## 8. Velocidad (FR-011 y SC-006)

- **Decision**: medir el LCP del catálogo en producción **antes y después** de publicar, con el mismo comando de Lighthouse y el perfil Fast 4G aceptado en las specs 001 y 002:

  ```powershell
  npx -y lighthouse@12.8.2 https://app.cristobalia.com/ --only-categories=performance --form-factor=mobile --throttling.rttMs=60 --throttling.throughputKbps=9000 --output=json --output-path=./lcp.json
  ```

  Se toman 3 corridas y se usa la mediana. **Criterio** (decidido por el propietario el 2026-11-12, en el análisis): el mismo de la spec 002. La mediana después no supera a la de antes en más de 0.1 s, y **el propietario confirma la cifra** al registrarla, igual que aceptó 1.04 s en la spec 002. No hay un tope fijo de 1.2 s.
- **Rationale**: SC-006 dice «1 segundo o menos, igual que antes». En la spec 002 el propietario aceptó 1.04 s como cumplimiento de esa misma meta. Medir antes y después aísla el efecto del script del ruido de la red.
- **Alternatives considered**: medir solo después. No distingue el efecto del script de la variación normal entre días.

## 9. Pruebas

- **Unitarias** (`tests/unit/estadisticas.test.ts`):
  - `antesDeEnviarUmami` descarta `/admin` y `/admin/...`, y deja pasar `/`, `/producto/1` y `/administrador-falso` (FR-002).
  - Las constantes apuntan al dominio de producción (FR-003).
- **Unitarias del aviso** (`tests/unit/aviso-privacidad.test.ts`, se agregan casos): los párrafos de FR-009 mencionan «anónima», «cookies», «dirección IP» y «mismo servidor», y siguen siendo 8 secciones (FR-008).
- **e2e** (`tests/e2e/us18-medicion-visitas.spec.ts`): con `page.route`, el script de `estadisticas.cristobalia.com` se sustituye por uno falso que guarda en `window` las llamadas a `umami.track`.
  - El script está en las páginas de cliente con `data-website-id`, `data-domains` y `data-before-send` correctos, y no está en `/admin/entrar` ni en el panel (FR-001, FR-002).
  - Tocar el teléfono en una página de producto registra `interes-telefono` con ese `producto` y `pagina`, y el `href` sigue siendo `tel:+52...` (FR-006).
  - Con el script bloqueado (`route.abort()`), las páginas cargan, el enlace mantiene su `href` y no hay errores en la consola (FR-005).
  - El formulario de «Mis apartados» no genera llamadas a `track` con el teléfono (FR-004).
  - Los nombres siguen la numeración: `us16` y `us17` son de la spec 005, así que esta usa `us18`.
- **Pruebas que existían**: las demás pruebas e2e no hacen nada especial. El script real se puede descargar, pero no envía nada desde `localhost` (`data-domains`). Si no hay red, falla en silencio sin afectar la página.
- **Manual**: lo que depende de Umami en producción (tablero, ciudad, etiquetas y el teléfono que nunca aparece) se comprueba en [quickstart.md](quickstart.md).

## 10. Visitas propias

- **Decision**: no se cambia la app. El quickstart explica cómo el propietario y el vendedor excluyen su celular: abren `https://app.cristobalia.com`, y en la consola del navegador o con un marcador ejecutan `localStorage.setItem("umami.disabled", "1")`. El script lo respeta, y se revisó en el `script.js` instalado.
- **Rationale**: Assumptions de la spec («Visitas propias»).
- **Nota**: en celular no hay consola. Un marcador con `javascript:localStorage.setItem('umami.disabled','1');alert('Listo')` se puede pegar en la barra de direcciones estando en la página. Las pruebas de SC-001 a SC-005 se hacen **antes** de excluir el dispositivo.

## 11. La ciudad detrás del proxy de Easypanel

- **Decision**: verificar en el quickstart que la ciudad que muestra el tablero sea la del visitante y no la del VPS.
- **Rationale**: Umami toma la IP de la cabecera `X-Forwarded-For`, que agrega el proxy de Easypanel (Traefik). Si no llegara, todas las visitas aparecerían en la ciudad del servidor. Es configuración del servicio de Umami, fuera del código de la app.

## 12. Notas de implementación

Revisado el 2026-11-12 en `node_modules/next/dist/docs/01-app/02-guides/scripts.md`, `03-api-reference/02-components/script.md` y en `node_modules/next/dist/client/script.js` (Next.js 16.4). El plan no cambia:

- **Layout anidado**: `afterInteractive` puede ir en cualquier página o layout, y solo se carga cuando se abre esa sección. Next.js garantiza que el script se carga **una sola vez**, aunque se navegue entre páginas del mismo layout.
- **Componente cliente**: `Script` funciona igual dentro de un componente con `"use client"`. `onLoad`, `onReady` y `onError` solo funcionan ahí, pero este plan no los usa.
- **Atributos `data-*`**: `Script` pasa los atributos que no reconoce con `setAttributesFromProps` antes de `document.body.appendChild`. Así, `data-website-id`, `data-domains` y `data-before-send` ya están cuando Umami lee `document.currentScript`.
- **El script se queda en `<body>`**: Next.js lo agrega al final de `<body>`, fuera del árbol de React. Si alguien pasa sin recargar de la sección de cliente al panel, la etiqueta sigue ahí y Umami sigue escuchando el historial. Esto confirma que el filtro `antesDeEnviarUmami` hace falta ([sección 4](#4-que-el-panel-nunca-se-cuente)). La prueba e2e de FR-002 abre el panel con una carga completa.
