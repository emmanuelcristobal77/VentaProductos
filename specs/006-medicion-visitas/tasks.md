---

description: "Lista de tareas para implementar la medición anónima de visitas"
---

# Tasks: Medición de visitas

**Input**: Design documents from `/specs/006-medicion-visitas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/interfaz.md, quickstart.md

**Tests**: se incluyen porque el Principio V de la constitución los exige. Cada prueba nombra en su título el FR, SC, escenario o caso límite que cubre, por ejemplo `FR-002: el panel no carga el script`. Se escriben primero y deben fallar antes de implementar.

**Organization**: las tareas se agrupan por historia de usuario de la spec 006, en este orden:

- **US1**: saber cuánta gente visita el catálogo y qué ve (P1).
- **US4**: informar al cliente de la medición (P1). Va justo después de US1 porque se publican juntas (FR-007).
- **US3**: saber cuántas visitas terminan en interés por comprar (P2).
- **US2**: saber de dónde llega la gente (P2). No requiere código: Umami lee las etiquetas de la URL por su cuenta. Solo lleva su prueba.

La prueba e2e se llama `us18-medicion-visitas.spec.ts`, después de `us17` de la spec 005. Un solo archivo, con un `test.describe` por historia.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario de la spec 006 a la que pertenece (US1 a US4)

## Reglas para todas las tareas

- Las specs 001 a 006 están aprobadas y sus `spec.md` no se modifican.
- Las constantes van exactamente como en [contracts/interfaz.md](contracts/interfaz.md):
  - script: `https://estadisticas.cristobalia.com/script.js`;
  - `website-id`: `49b620b8-b094-49c2-9ff2-edf6ba9d0c38`;
  - dominio: `app.cristobalia.com`;
  - función: `antesDeEnviarUmami`;
  - evento: `interes-telefono`.
- Nada de lo que la app envía a Umami lleva nombres ni teléfonos de clientes, ni lo que se escribe en formularios o en el buscador (FR-004). No se usan `data-umami-event*`, `identify()`, `data-exclude-search`, `data-do-not-track` ni `data-auto-track` ([research 5 y 6](research.md)).
- Ningún archivo de `src/app/admin/` cambia (FR-002).
- Las pruebas e2e **nunca** cargan el script real: usan los ayudantes de T004, que sustituyen o bloquean `https://estadisticas.cristobalia.com/script.js` con `page.route`.
- Los selectores de Playwright usan `getByRole`, `getByLabel` o `filter({ visible: true })`.
- Los mensajes de commit van en español de México.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: lectura previa que pide AGENTS.md

- [ ] T001 Leer node_modules/next/dist/docs/01-app/03-api-reference/02-components/script.md y node_modules/next/dist/docs/01-app/02-guides/scripts.md. Confirmar tres cosas:
  - que `<Script strategy="afterInteractive">` funciona dentro de un componente cliente en un layout anidado (no el raíz);
  - que se carga una sola vez por documento aunque se navegue entre páginas del mismo layout;
  - cómo pasa los atributos `data-*` a la etiqueta `<script>`.

  Anotar cualquier diferencia con el plan en specs/006-medicion-visitas/research.md, en una sección nueva «12. Notas de implementación»

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: constantes, el filtro del panel y los ayudantes de prueba, que usan todas las historias

**⚠️ CRITICAL**: ninguna historia puede empezar antes de terminar esta fase

- [ ] T002 [P] Escribir tests/unit/estadisticas.test.ts contra `src/lib/estadisticas.ts` (aún no existe; debe fallar):
  - `FR-003`: `UMAMI.script` es `https://estadisticas.cristobalia.com/script.js`, `UMAMI.idSitio` es `49b620b8-b094-49c2-9ff2-edf6ba9d0c38` y `UMAMI.dominios` es `app.cristobalia.com`;
  - `FR-002`: `antesDeEnviarUmami("event", { url: "/admin" })` y `antesDeEnviarUmami("event", { url: "/admin/operaciones/3" })` devuelven `false`, y también `{ url: "https://app.cristobalia.com/admin/promocion" }`;
  - con `{ url: "/" }`, `{ url: "/producto/12?utm_source=whatsapp" }`, `{ url: "/administrador-falso" }` y una carga sin `url` devuelve la misma carga sin cambios (contracts/interfaz.md, sección 1);
  - `paginaActual("/producto/12")` devuelve `"/producto/12"`. La función recibe `location.pathname` y no le agrega consulta ni `#`;
  - `EVENTO_INTERES` es `"interes-telefono"`.
- [ ] T003 [P] Crear src/lib/estadisticas.ts, sin `window` ni React, con:
  - `UMAMI = { script, idSitio, dominios } as const`, con los valores de T002;
  - `EVENTO_INTERES = "interes-telefono"`;
  - `NOMBRE_FILTRO = "antesDeEnviarUmami"`;
  - `antesDeEnviarUmami(tipo, carga)`: si `carga?.url` es una ruta `/admin` o `/admin/...`, con o sin dominio, devuelve `false`; si no, devuelve `carga`;
  - `paginaActual(ruta)`;
  - un bloque `declare global { interface Window { umami?: { track: (nombre: string, datos?: Record<string, string>) => unknown }; antesDeEnviarUmami?: typeof antesDeEnviarUmami } }`.

  Dejar T002 en verde
- [ ] T004 [P] Crear tests/e2e/ayudantes-medicion.ts con:
  - `simularUmami(page)`: con `page.route("https://estadisticas.cristobalia.com/script.js", …)`, responde un script falso que define `window.umami = { track: (...a) => { window.__llamadasUmami.push(a) } }` e inicializa `window.__llamadasUmami = []`;
  - `llamadasUmami(page)`: devuelve ese arreglo;
  - `bloquearUmami(page)`: aborta esa ruta con `route.abort()`;
  - `scriptUmami(page)`: devuelve el localizador de `script[src="https://estadisticas.cristobalia.com/script.js"]`.

  Ninguna prueba debe salir a internet.

**Checkpoint**: `npm run verificar` en verde con T002

---

## Phase 3: User Story 1 - Saber cuánta gente visita el catálogo y qué ve (Priority: P1) 🎯 MVP

**Goal**: el script de Umami se carga en todas las páginas de cliente y en ninguna del panel, sin afectar la página si falla.

**Independent Test**: abrir el catálogo, un producto, «Encargos», «Mis apartados» y el aviso, y comprobar que el script está con sus atributos. Abrir `/admin/entrar` y el panel y comprobar que no está.

### Tests for User Story 1

- [ ] T005 [US1] Escribir tests/e2e/us18-medicion-visitas.spec.ts, `test.describe("US1")`, con `simularUmami` en `beforeEach` (debe fallar):
  - `FR-001`: en `/`, en una página de producto (tomada del catálogo con los ayudantes de tests/e2e/ayudantes.ts, como en `us2-catalogo-cliente`), en `/encargos`, en `/mis-apartados` y en `/aviso-de-privacidad`, `scriptUmami(page)` existe una sola vez, con `data-website-id="49b620b8-b094-49c2-9ff2-edf6ba9d0c38"`, `data-domains="app.cristobalia.com"` y `data-before-send="antesDeEnviarUmami"`;
  - `FR-002 / US1-4`: en `/admin/entrar` y, después de `entrar()`, en `/admin` y `/admin/operaciones`, `scriptUmami(page)` no existe;
  - `FR-002`: en `/`, `window.antesDeEnviarUmami` existe y devuelve `false` para `{ url: "/admin" }`;
  - «Navegación sin recargar»: al pasar de `/` a un producto con un clic, sigue habiendo un solo script;
  - `FR-005`: con `bloquearUmami`, `/`, una página de producto y `/mis-apartados` muestran su encabezado `<h1>` y no hay `pageerror`;
  - `FR-004 / SC-005`: en `/mis-apartados`, consultar con el nombre «Ana Prueba» y el teléfono `5598765432`, que son datos de cliente distintos del teléfono del negocio de las pruebas (`5512345678`). Ninguna llamada de `llamadasUmami(page)` debe contener «Ana Prueba» ni `5598765432`, y la URL tampoco.

### Implementation for User Story 1

- [ ] T006 [US1] Crear src/components/cliente/medicion-visitas.tsx con `"use client"`:
  - a nivel de módulo, si `typeof window !== "undefined"`, asigna `window.antesDeEnviarUmami = antesDeEnviarUmami`;
  - dibuja `<Script src={UMAMI.script} strategy="afterInteractive" data-website-id={UMAMI.idSitio} data-domains={UMAMI.dominios} data-before-send={NOMBRE_FILTRO} />` de `next/script`;
  - sin `onError` que muestre nada (FR-005, research 3 y 4)
- [ ] T007 [US1] En src/app/(cliente)/layout.tsx, agregar `<MedicionVisitas />` al final del contenedor, después de `<NavegacionInferior />`. No tocar src/app/layout.tsx ni nada de src/app/admin/ (FR-001, FR-002)
- [ ] T008 [US1] Correr `npx playwright test tests/e2e/us18-medicion-visitas.spec.ts -g US1` y dejar T005 en verde

**Checkpoint**: el script está en la sección de cliente y en ningún lugar del panel

---

## Phase 4: User Story 4 - Informar al cliente de la medición (Priority: P1)

**Goal**: el aviso de privacidad explica la medición, y sale en el mismo despliegue que el script (FR-007).

**Independent Test**: abrir el aviso y encontrar los tres párrafos nuevos.

### Tests for User Story 4

- [ ] T009 [P] [US4] Agregar a tests/unit/aviso-privacidad.test.ts un `describe("Spec 006: medición de visitas")` (debe fallar), sin cambiar los casos existentes de la spec 003:
  - `FR-009`: `texto("datos")` contiene «de forma anónima», «No usamos cookies», «no guardamos tu dirección IP» y «no sirven para identificarte»;
  - `texto("finalidades")` contiene «qué productos interesan más»;
  - `texto("terceros")` contiene «mismo servidor» y «no los compartimos con nadie»;
  - `FR-008`: las secciones siguen siendo 8, con los mismos títulos y en el mismo orden (ya lo cubre la prueba de la spec 003; solo confirmar que corre);
  - `FR-010`: `AVISO_PRIVACIDAD.actualizado` es mayor o igual que `"2026-11-12"`.
- [ ] T010 [US4] Agregar a tests/e2e/us18-medicion-visitas.spec.ts un `test.describe("US4")`: en `/aviso-de-privacidad`, `US4-1 / SC-007` ve el texto «medimos de forma anónima» y «No usamos cookies» (debe fallar)

### Implementation for User Story 4

- [ ] T011 [US4] En src/lib/aviso-privacidad.ts, agregar al final de los `parrafos` de `datos`, `finalidades` y `terceros` los tres párrafos de contracts/interfaz.md, sección 3, copiados palabra por palabra.
  - Cambiar `actualizado` a `"2026-11-12"`. T024 la cambia a la fecha real de publicación si es otra.
  - No tocar otras secciones ni los párrafos existentes (FR-008).

  Dejar T009 y T010 en verde. Las pruebas de la spec 003 (`tests/unit/aviso-privacidad.test.ts`, `tests/e2e/us10-aviso-privacidad.spec.ts`) deben seguir en verde

**Checkpoint**: aviso y medición listos para salir juntos

---

## Phase 5: User Story 3 - Saber cuántas visitas terminan en interés por comprar (Priority: P2)

**Goal**: cada toque a un teléfono de contacto de la sección de cliente envía `interes-telefono`, sin cambiar ni retrasar la llamada.

**Independent Test**: tocar el teléfono en una página de producto y comprobar que se registra el evento con ese producto y que el enlace sigue siendo `tel:`.

### Tests for User Story 3

- [ ] T012 [US3] Agregar a tests/e2e/us18-medicion-visitas.spec.ts un `test.describe("US3")` con `simularUmami` (debe fallar). Antes de cada clic, instalar en la página un listener `click` en `document`, en fase de burbuja, que guarde `event.defaultPrevented` en `window.__prevenido` y después llame a `preventDefault()`, para que el navegador de prueba no intente abrir `tel:`. Casos:
  - `US3-1 / FR-006`: en una página de producto, el enlace «Contacto: 55 1234 5678» tiene `href="tel:+525512345678"`. Al tocarlo, `llamadasUmami` contiene exactamente `["interes-telefono", { pagina: "/producto/<id>", producto: "<nombre del producto>" }]` y `window.__prevenido` es `false`;
  - `US3-2`: en `/encargos`, el teléfono de un artículo envía `pagina: "/encargos"` y `producto` con el nombre del artículo. El teléfono del pie de página en `/` envía `{ pagina: "/" }` sin `producto`;
  - en `/aviso-de-privacidad`, el teléfono de «Dudas» envía `{ pagina: "/aviso-de-privacidad" }`;
  - con una búsqueda sin resultados en `/`, el teléfono del mensaje envía `{ pagina: "/" }`;
  - `US3-3 / FR-005`: con `bloquearUmami`, tocar el teléfono de un producto no produce `pageerror`, `window.__prevenido` es `false` y el `href` sigue igual;
  - `FR-004`: ninguna llamada de esta prueba contiene un teléfono.

  Si hacen falta un producto o un artículo por encargo, usar los ayudantes existentes, como en `us5-encargo`.

### Implementation for User Story 3

- [ ] T013 [US3] Crear src/components/cliente/enlace-telefono.tsx con `"use client"`:
  - recibe `{ enlace, producto?, className?, children }` y dibuja `<a href={enlace} className={className}>{children}</a>`;
  - en `onClick` hace `try { window.umami?.track(EVENTO_INTERES, producto ? { pagina: paginaActual(location.pathname), producto } : { pagina: paginaActual(location.pathname) }) } catch {}`;
  - sin `preventDefault`, sin `await` y sin cambiar el marcado (contracts/interfaz.md, sección 2; research 5)
- [ ] T014 [US3] Usar `EnlaceTelefono` en src/components/cliente/leyenda-producto.tsx:
  - `LeyendaProducto` recibe un nuevo `producto?: string` y lo pasa;
  - se conservan el icono `Phone` con `aria-hidden`, el texto «Contacto: …» y las clases;
  - pasar `producto={producto.nombre}` en src/app/(cliente)/producto/[id]/page.tsx y `producto={articulo.nombre}` en src/app/(cliente)/encargos/page.tsx.
- [ ] T015 [US3] Sustituir por `EnlaceTelefono`, sin `producto` y con las mismas clases e hijos, los enlaces `tel:` de:
  - src/app/(cliente)/layout.tsx (pie de página);
  - src/components/cliente/catalogo-buscable.tsx (búsqueda sin resultados);
  - src/app/(cliente)/aviso-de-privacidad/page.tsx (sección «Dudas»).

  Confirmar con `grep -rn "telefono.enlace" src` que no queda ningún `<a href={telefono.enlace}>` en la sección de cliente
- [ ] T016 [US3] Correr `npx playwright test tests/e2e/us18-medicion-visitas.spec.ts -g US3` y dejar T012 en verde

**Checkpoint**: cada teléfono de contacto cuenta un interesado y sigue abriendo la llamada

---

## Phase 6: User Story 2 - Saber de dónde llega la gente (Priority: P2)

**Goal**: los enlaces con etiquetas de origen funcionan igual y llevan sus etiquetas en la URL que lee Umami. No hay código nuevo: Umami toma `utm_*` de la URL ([research 6](research.md#6-privacidad-de-lo-que-se-envía)).

**Independent Test**: abrir `/?utm_source=whatsapp&utm_campaign=prueba` y comprobar que el catálogo se ve igual y que el script está cargado.

- [ ] T017 [US2] Agregar a tests/e2e/us18-medicion-visitas.spec.ts un `test.describe("US2")` con `simularUmami`:
  - `US2-1 / US2-2`: `/?utm_source=whatsapp&utm_campaign=prueba` muestra el mismo `<h1>` y la misma cantidad de tarjetas de producto que `/`, y el script está una sola vez;
  - `page.url()` conserva `utm_source=whatsapp` y `utm_campaign=prueba` después de cargar, para que Umami las lea;
  - «Etiquetas mal escritas»: `/?utm_sorce=x` también carga normal.

  Correr `npx playwright test tests/e2e/us18-medicion-visitas.spec.ts -g US2` y dejarla en verde

**Checkpoint**: las cuatro historias pasan sus pruebas

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: condición de merge, velocidad, aprobación del aviso y publicación

- [ ] T018 Crear specs/006-medicion-visitas/checklists/aceptacion.md con la estructura de la de la spec 005. Ejecutar `npm run verificar` y `npm run test:e2e`, incluidas las pruebas de las specs 001 a 005 con axe, y dejar todo en verde (Principio V). Registrar el número de pruebas y cualquier falla intermitente con su repetición, como en la spec 005
- [ ] T019 [P] Ejecutar en local el paso 1 de quickstart.md: con `npm run dev`, abrir el catálogo y 2 productos y confirmar en el tablero que no se contó nada (FR-003). Registrar en specs/006-medicion-visitas/checklists/aceptacion.md
- [ ] T020 [P] **Antes de publicar**, medir 3 veces el LCP de producción con el comando de quickstart.md («Antes de publicar») y registrar las 3 cifras y la mediana en specs/006-medicion-visitas/checklists/aceptacion.md (research 8)
- [ ] T021 Pedir al propietario que apruebe la redacción de los tres párrafos del aviso (contracts/interfaz.md, sección 3). Registrar la fecha de aprobación en specs/006-medicion-visitas/checklists/aceptacion.md. Si pide cambios, se ajustan el contrato, T011 y T009 antes de seguir
- [ ] T022 Publicar:
  - con el respaldo del día ya hecho, ajustar `actualizado` en src/lib/aviso-privacidad.ts a la fecha de publicación si no es `2026-11-12` (FR-010);
  - hacer merge a `main`, push y pulsar **Implementar** en Easypanel (FR-007: aviso y script en el mismo despliegue);
  - confirmar que `https://app.cristobalia.com` carga.
- [ ] T023 En producción, ejecutar desde un celular con datos móviles los pasos 3 a 11 de quickstart.md, más los pasos 13 (sin cookies) y 14 (sin columna de IP en `umami-db`). Registrar los resultados en specs/006-medicion-visitas/checklists/aceptacion.md (SC-001 a SC-005, SC-007 y FR-004). Si en el paso 4 la ciudad es la del servidor, anotarlo y revisar con el propietario que el proxy de Easypanel pase `X-Forwarded-For` al servicio `umami` (research 11)
- [ ] T024 Medir 3 veces el LCP después de publicar (quickstart, paso 12) y registrar las cifras y la mediana. Criterio, el mismo de la spec 002: no más de 0.1 s sobre la mediana de T020, y el propietario confirma la cifra. Registrar su confirmación con la fecha (SC-006, FR-011, research 8)
- [ ] T025 Con el propietario, excluir sus dispositivos y los del vendedor siguiendo «Al terminar» de quickstart.md, y registrar cuáles quedaron excluidos en specs/006-medicion-visitas/checklists/aceptacion.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: empieza de inmediato
- **Foundational (Fase 2)**: depende de Setup y bloquea todas las historias. T002, T003 y T004 en paralelo; T003 deja T002 en verde
- **US1 (Fase 3)**: depende de Foundational
- **US4 (Fase 4)**: depende solo de Foundational para sus pruebas; puede hacerse junto con US1. T010 comparte archivo con T005, así que va después de T005
- **US3 (Fase 5)**: depende de T003 y T004. Sus pruebas usan el script falso, que el layout carga desde T007, así que va después de US1
- **US2 (Fase 6)**: depende de US1 (el script en el layout)
- **Polish (Fase 7)**: T018 y T019 dependen de todas las historias. T020 puede hacerse en cualquier momento antes de T022. T022 depende de T018, T020 y T021. T023 y T024 dependen de T022. T025 depende de T023

### User Story Dependencies

- **US1 (P1)**: independiente; trae el script y el filtro del panel
- **US4 (P1)**: independiente en código; se publica junto con US1 (FR-007)
- **US3 (P2)**: necesita el script de US1 para que `window.umami` exista en producción; el código del enlace es independiente
- **US2 (P2)**: solo prueba sobre lo que trae US1

### Within Each User Story

- Las pruebas se escriben primero y deben fallar
- Constantes y funciones puras antes que los componentes; componentes antes que los cambios en páginas
- Cada historia termina con su checkpoint antes de pasar a la siguiente

### Parallel Opportunities

- Fase 2: T002, T003 y T004 juntas
- US4 en paralelo con US1, salvo T010, que espera a T005 porque es el mismo archivo
- Polish: T019 y T020 juntas

---

## Parallel Example: Foundational

```text
Task: "T002 Constantes y filtro en tests/unit/estadisticas.test.ts"
Task: "T003 src/lib/estadisticas.ts"
Task: "T004 Ayudantes del script falso en tests/e2e/ayudantes-medicion.ts"
```

## Parallel Example: US1 + US4

```text
Task: "T006 Componente MedicionVisitas en src/components/cliente/medicion-visitas.tsx"
Task: "T009 Casos de la spec 006 en tests/unit/aviso-privacidad.test.ts"
Task: "T011 Párrafos nuevos en src/lib/aviso-privacidad.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US4)

1. Completar Setup y Foundational
2. Completar US1 y US4: script en la sección de cliente y aviso actualizado
3. **Detenerse y validar** con `npm run verificar` y la prueba `us18` de US1 y US4
4. Seguir con US3 y US2 sin publicar todavía

### Entrega

Se publica **la spec completa en un solo despliegue**: US1 y US4 no pueden salir separadas (FR-007), y US3 es la mitad del valor que pidió el propietario («visitas e interesados»). US2 no agrega código. Cada historia deja `npm run verificar` en verde.

---

## Notes

- T018, T021 y T023 son la condición de merge y aceptación que pide la constitución
- No hay migración ni cambios en la base: no hace falta ensayar con un respaldo
- Easypanel no despliega solo después de un push: hay que pulsar Implementar
- Hacer commit después de cada tarea o grupo lógico, con el mensaje en español de México
