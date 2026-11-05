---

description: "Lista de tareas para implementar el buscador de productos y la paginación"
---

# Tasks: Buscador de productos y paginación

**Input**: Design documents from `/specs/002-buscador-paginacion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rutas.md, quickstart.md

**Tests**: se incluyen porque el Principio V de la constitución los exige. Cada prueba nombra en su título el FR, SC o escenario que cubre, por ejemplo `FR-002: encuentra "Muñeca" al escribir "muneca"`. Se escriben primero y deben fallar antes de implementar.

**Organization**: las tareas se agrupan por historia de usuario de la spec 002:

- **US1**: buscar un producto escribiendo (P1).
- **US2**: ver los productos por partes con «Ver más» (P2).

Para no chocar con la spec 001, sus pruebas e2e se llaman `us8-buscador.spec.ts` y `us9-ver-mas.spec.ts`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario de la spec 002 a la que pertenece (US1 o US2)

## Reglas para todas las tareas

- La spec 001 y su `spec.md` no se modifican.
- Todo texto visible va en español de México, con los textos exactos de [research.md, sección 9](research.md#9-textos-de-la-interfaz-es-mx). Los mensajes de error provienen de `src/lib/mensajes.ts`.
- Las consultas públicas eligen sus columnas una por una. `precioCompraCentavos` y `existencia` nunca salen por `/` ni por `/api/catalogo` (FR-009; FR-003 de la spec 001).
- Las reglas de búsqueda, orden y cursor viven solo en `src/consultas/busqueda.ts`, y las usan las dos secciones.
- La búsqueda nunca se escribe en la URL, ni en `sessionStorage`, `localStorage` o `history.state` (FR-008).
- Los selectores de Playwright usan `getByRole`, `getByLabel` o `filter({ visible: true })`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: aprobación y herramientas de prueba

- [ ] T001 Registrar la aprobación formal de la spec por su propietario: cambiar **Status** a Approved en specs/002-buscador-paginacion/spec.md y el estado a "Aprobada el <fecha>" en specs/MAPA.md. No continuar sin esa aprobación (Constitución, Principio I y Flujo de desarrollo, paso 2)
- [ ] T002 [P] Crear scripts/productos-ejemplo.ts. Recibe `--cantidad N` (500 por omisión) y se niega a correr si `DATOS_DIR` está vacío o no contiene `prueba`. Aplica migraciones y semilla, y crea N productos activos con nombre, descripción, categoría y subcategoría variados (incluidos nombres con acentos y "ñ") y una foto generada con `sharp` y guardada con `guardarFoto` de src/lib/fotos.ts. Las fechas de alta deben ser distintas (research 8)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: reglas de búsqueda, consultas paginadas, rutas y estado de las listas que usan las dos historias

**⚠️ CRITICAL**: ninguna historia puede empezar antes de terminar esta fase

### Pruebas de reglas puras

- [ ] T003 [P] Escribir pruebas en tests/unit/busqueda.test.ts:
  - `palabrasDeBusqueda` recorta a "hasta 100 caracteres", normaliza como `normalizarNombre`, divide por espacios, descarta vacías, conserva "como máximo 10" y devuelve `[]` para un texto de solo espacios (data-model, Búsqueda; casos límite "Espacios de más" y "Una sola letra").
  - `codificarCursor` y `decodificarCursor` hacen un viaje de ida y vuelta de `{ g: 0|1, c, i }`.
  - Un cursor ilegible o con `g` fuera de 0 y 1 lanza `ErrorNegocio("CURSOR_INVALIDO")`.

### Implementación base

- [ ] T004 Agregar el código `CURSOR_INVALIDO` a `CodigoError` y su mensaje es-MX en src/lib/mensajes.ts
- [ ] T005 Implementar `palabrasDeBusqueda(texto)` en src/dominio/normalizacion.ts según data-model.md: "Se recorta a 100 caracteres, se normaliza como `normalizarNombre` y se divide por espacios", "De 0 a 10" palabras
- [ ] T006 Registrar en `abrirBase` de src/db/cliente.ts la función de SQLite `normalizar` con `{ deterministic: true }`. Llama a `normalizarNombre` y devuelve `null` para `null` (research 1)
- [ ] T007 Crear src/consultas/busqueda.ts con:
  - Las constantes `TAMANO_CATALOGO = 20`, `TAMANO_PANEL = 50` y `LIMITE_MAXIMO = 200`.
  - `condicionPalabras(palabras)`: cada palabra con `instr(normalizar(nombre) || ' ' || normalizar(descripcion), ?) > 0`.
  - `expresionGrupo(palabras)`: 0 si todas las palabras están en `normalizar(nombre)` o si no hay palabras; 1 en otro caso.
  - `condicionCursor(cursor, grupo)`: la regla de data-model.md, sección Cursor.
  - El orden `grupo ASC, creado_en DESC, id DESC`.
  - `codificarCursor` y `decodificarCursor`: base64url con validación Zod.
  - `limiteValido(limite, tamano)`: entre el tamaño de la parte y 200 (contracts/rutas.md).
- [ ] T008 Cambiar `listarCatalogo({ categoriaId, subcategoriaId, texto, cursor, limite })` en src/consultas/publicas.ts para que use src/consultas/busqueda.ts y devuelva `{ productos, siguiente, total }`.
  - La selección de columnas no cambia.
  - Las fotos se piden solo para los productos de la parte y siguen como nombres de archivo, igual que hoy.
  - `ProductoPublico` pasa a ser `ReturnType<typeof listarCatalogo>["productos"][number]`.
  - `obtenerProducto` sigue igual.
- [ ] T009 Cambiar `listarProductosAdmin({ categoriaId, subcategoriaId, texto, cursor, limite })` en src/consultas/admin.ts de la misma forma. `ProductoAdmin` se define con `obtenerProductoAdmin`, que sigue igual
- [ ] T010 Ajustar a la nueva forma de respuesta (`.productos`) las llamadas de tests/integration/consultas-publicas.test.ts y tests/integration/productos.test.ts, sin cambiar ninguna aserción de la spec 001. Ejecutar `npm run test` y dejar esas pruebas en verde
- [ ] T011 Ajustar src/app/(cliente)/page.tsx y src/app/admin/(panel)/page.tsx a la nueva forma de respuesta, pidiendo `limite: LIMITE_MAXIMO` para no ocultar productos mientras US2 no esté terminada
- [ ] T012 [P] Crear `GET` en src/app/api/catalogo/route.ts según contracts/rutas.md:
  - Valida con Zod `texto` ("hasta 100 caracteres"), `categoria`, `subcategoria` ("solo junto con `categoria`"), `cursor` y `limite`.
  - Llama a `listarCatalogo` con `TAMANO_CATALOGO`.
  - Responde `Resultado<T>` con 400 para `CURSOR_INVALIDO` o `DATOS_INVALIDOS`, y siempre con `Cache-Control: no-store`.
- [ ] T013 [P] Crear `GET` en src/app/api/admin/productos/route.ts con las mismas reglas. Llama primero a `exigirSesion()` y responde 401 con `NO_AUTORIZADO`, igual que src/app/api/fotos/route.ts; usa `listarProductosAdmin` con `TAMANO_PANEL`
- [ ] T014 [P] Escribir pruebas de contrato en tests/e2e/api-productos.spec.ts:
  - `/api/catalogo` no devuelve `precioCompraCentavos` ni `existencia` (FR-009).
  - `/api/admin/productos` sin sesión da 401.
  - Un cursor alterado da 400 con `CURSOR_INVALIDO`.
  - Las dos rutas responden con `Cache-Control: no-store`.
- [ ] T015 Crear src/lib/estado-listas.ts con:
  - Un `Map` a nivel de módulo por lista (`catalogo` y `panel`) con texto, filtro, productos, siguiente, total y desplazamiento (data-model, Estado de una lista).
  - Un escucha de `popstate` registrado al cargar el módulo que marca la siguiente lista que se monte como regreso con atrás o adelante.
  - `guardarEstado`, `tomarEstadoAlRegresar(lista, filtro)`, que devuelve el estado solo si fue un regreso y el filtro coincide, y `olvidar(lista)` (research 6).
- [ ] T016 Crear el hook `usarListaPaginada({ lista, ruta, filtro, inicial })` en src/lib/usar-lista-paginada.ts:
  - Se inicia de forma síncrona desde `tomarEstadoAlRegresar` o desde `inicial`.
  - Guarda el estado y el desplazamiento (con `scroll` limitado a uno cada 100 ms).
  - Al regresar, vuelve al desplazamiento guardado en `useLayoutEffect`.
  - Expone `productos`, `siguiente`, `total` y `estado` (`listo`, `buscando`, `cargandoMas` o `error`) (FR-008a).
- [ ] T017 [P] Mover la tarjeta de producto del panel desde src/app/admin/(panel)/page.tsx a un componente de cliente en src/components/admin/tarjeta-producto-admin.tsx, que recibe `ProductoAdmin` y arma la URL como `/api/fotos/${archivo}`, igual que src/components/cliente/tarjeta-producto.tsx, porque src/lib/fotos.ts importa `sharp` y no puede llegar al navegador. No cambia lo que muestra ni sus acciones (research 7)

**Checkpoint**: `npm run verificar` en verde; el catálogo y el panel se ven igual que antes

---

## Phase 3: User Story 1 - Buscar un producto escribiendo (Priority: P1) 🎯 MVP

**Goal**: el cliente y el vendedor escriben parte del nombre o de la descripción y la lista se reduce mientras escriben.

**Independent Test**: con productos en varias categorías, escribir parte de un nombre y luego una palabra que solo esté en la descripción de otro producto, y comprobar los resultados en el catálogo y en el panel (quickstart, pasos 1 a 8 y 14).

### Tests for User Story 1 ⚠️

> **NOTE: escribirlas primero y comprobar que fallan antes de implementar**

- [ ] T018 [P] [US1] Escribir pruebas en tests/integration/busqueda-productos.test.ts:
  - **FR-002**:
    - "muneca" y "MUÑECA" encuentran "Muñeca de trapo".
    - Una palabra solo en la descripción encuentra el producto.
    - "roja pelota" encuentra "Pelota roja".
    - Una palabra partida entre el final del nombre y el inicio de la descripción no coincide.
  - **FR-004**: la búsqueda se combina con categoría y con categoría y subcategoría.
  - **FR-006**: los productos dados de baja no aparecen en ninguna de las dos secciones.
  - **FR-007**: primero las coincidencias en el nombre y después las de la descripción, cada grupo con el más reciente primero; sin búsqueda, el orden de la spec 001.
  - **FR-009**: las claves de cada producto público no incluyen `precioCompraCentavos` ni `existencia`.
  - **FR-016**: `total` cuenta todas las coincidencias.
  - **Research 1**: `normalizar()` de SQLite da lo mismo que `normalizarNombre` para "Ñandú", "  Muñeca  " y "ÁRBOL".
- [ ] T019 [P] [US1] Escribir pruebas en tests/e2e/us8-buscador.spec.ts, en móvil y portátil:
  - **Escenarios US1-1 a US1-8** en el catálogo.
  - **US1-6 / FR-005**: el mensaje sin resultados enlaza a `/encargos` y muestra el teléfono como enlace `tel:`.
  - **US1-8 / FR-008**: al recargar, el campo queda vacío y la URL no cambia al escribir.
  - **US1-9**: lo mismo en `/admin`.
  - **US1-10 / FR-008a**: buscar, abrir un producto y regresar con `page.goBack()` conserva el texto, los resultados y el desplazamiento.
  - **Caso límite "Escritura rápida"**: escribir con `pressSequentially` sin pausa y comprobar que solo quedan los resultados del texto final.
  - **FR-016 y Principio VII**: la región `aria-live` anuncia "{N} productos encontrados"; axe pasa con resultados y sin resultados.

### Implementation for User Story 1

- [ ] T020 [P] [US1] Crear src/components/buscador-productos.tsx:
  - Un `input type="search"` con la etiqueta visible "Buscar productos", el marcador "Escribe el nombre o una palabra", `enterKeyHint="search"` y `autoComplete="off"`, y altura táctil de 44 px o más.
  - Una región `aria-live="polite"` con "Buscando…" y "{N} productos encontrados" (FR-001, FR-016; research 9).
- [ ] T021 [US1] Agregar la búsqueda al hook en src/lib/usar-lista-paginada.ts (research 5):
  - Mantiene `texto` y `setTexto`; espera 250 ms desde la última tecla.
  - Cancela la petición anterior con `AbortController` y descarta respuestas que no correspondan al texto actual.
  - Mientras busca, conserva la lista anterior visible.
  - Al vaciar el texto vuelve a `inicial` (US1-7).
  - Si cambia el filtro de la URL con texto escrito, conserva el texto y vuelve a pedir desde el principio (FR-004, FR-014).
- [ ] T022 [US1] Crear src/components/cliente/catalogo-buscable.tsx, un componente de cliente:
  - Recibe `inicial`, `filtro`, `telefono` (de `telefonoNegocio()`) y los filtros como `children`.
  - Muestra `BuscadorProductos` arriba de los filtros (FR-001) y las tarjetas con `TarjetaProducto`, con las 4 primeras como prioritarias.
  - Si hay texto y no hay coincidencias, muestra el mensaje de research 9 con el enlace a `/encargos` y el teléfono (FR-005).
  - Si no hay texto y no hay productos, muestra el mensaje actual "No hay productos en esta categoría por ahora.".
- [ ] T023 [US1] Usar `CatalogoBuscable` en src/app/(cliente)/page.tsx, pasando `FiltroCategorias` como `children` y el filtro de `searchParams`
- [ ] T024 [P] [US1] Crear src/components/admin/lista-productos-admin.tsx, un componente de cliente:
  - Usa el hook con `lista: "panel"` y `ruta: "/api/admin/productos"`.
  - Muestra `BuscadorProductos`, los filtros como `children` y `TarjetaProductoAdmin`.
  - Sin resultados, muestra "No hay productos que coincidan con «{texto}»."; sin texto, el mensaje actual "No hay productos en esta selección.".
- [ ] T025 [US1] Usar `ListaProductosAdmin` en src/app/admin/(panel)/page.tsx, conservando el encabezado y el botón "Nuevo producto"

**Checkpoint**: T018 y T019 en verde; la búsqueda funciona en el catálogo y en el panel, y al regresar con atrás se conserva

---

## Phase 4: User Story 2 - Ver los productos por partes con «Ver más» (Priority: P2)

**Goal**: las listas cargan 20 productos en el catálogo y 50 en el panel, y «Ver más» agrega la siguiente parte sin repetir ni saltar productos.

**Independent Test**: con más de 20 productos activos, pulsar «Ver más» hasta que desaparezca y comprobar que se vieron todos, sin repetidos. Repetir en el panel con más de 50 (quickstart, pasos 9 y 11 a 14).

### Tests for User Story 2 ⚠️

- [ ] T026 [P] [US2] Escribir pruebas en tests/integration/paginacion-productos.test.ts:
  - **Tamaños y fin de la lista**:
    - FR-010: partes de 20 en el catálogo y de 50 en el panel.
    - FR-011 y SC-004: recorrer todas las partes con 45 y con 120 productos da todos los ids, sin repetidos.
    - FR-012: `siguiente` es `null` en la última parte y cuando todo cabe en la primera.
  - **Alcance y estabilidad**:
    - FR-013: la búsqueda encuentra un producto que está más allá de los primeros 20.
    - Caso límite "Cambios mientras se navega": un alta y una baja entre dos partes no causan repetidos ni faltantes entre los productos restantes.
    - FR-007 con paginación: el paso del grupo 0 al grupo 1 entre dos partes mantiene el orden.
  - **Límites y cursor**:
    - Contrato: `limite` fuera de 20 a 200, o de 50 a 200 en el panel, da `DATOS_INVALIDOS`.
    - Un cursor alterado da `CURSOR_INVALIDO`.
- [ ] T027 [P] [US2] Agregar a tests/e2e/ayudantes.ts `crearProductosDePrueba(n, prefijo)`, que inserta con `sqlDePrueba` n productos activos con fechas de alta distintas y una foto que reutiliza un archivo existente
- [ ] T028 [US2] Escribir pruebas en tests/e2e/us9-ver-mas.spec.ts, en móvil y portátil, usando T027:
  - **Escenarios US2-1 a US2-9** en el catálogo.
  - **US2-5**: en `/admin`, partes de 50.
  - **US2-9 / FR-008a**: pulsar «Ver más» dos veces, abrir un producto y regresar con atrás conserva los productos y el desplazamiento.
  - **FR-015**: con `page.route` se hace fallar `/api/catalogo`; aparece el mensaje de error, los productos siguen y, al quitar la falla, el mismo botón carga la parte.
  - **FR-016**: se anuncia "Se agregaron {N} productos".
  - **Principio VII**: axe pasa con el botón visible.

### Implementation for User Story 2

- [ ] T029 [P] [US2] Crear src/components/boton-ver-mas.tsx (FR-011, FR-012, FR-015):
  - Un `button` real con el texto "Ver más", que se deshabilita y muestra "Cargando…" mientras carga, y no se dibuja si `siguiente` es `null`.
  - Si falla, un mensaje con `role="alert"`: "No se pudieron cargar más productos. Revisa tu conexión e inténtalo de nuevo.".
- [ ] T030 [US2] Agregar `verMas()` al hook en src/lib/usar-lista-paginada.ts:
  - Pide la parte siguiente con el cursor y la agrega al final, ignorando ids ya presentes.
  - Si falla, pasa a `error` sin perder los productos (FR-015).
  - Anuncia "Se agregaron {N} productos".
  - Cuando cambie `inicial` porque el servidor revalidó tras una venta, baja o edición, vuelve a pedir desde el principio con `limite` igual a los productos mostrados, hasta 200 (research 7).
- [ ] T031 [US2] Mostrar `BotonVerMas` al final de las listas en src/components/cliente/catalogo-buscable.tsx y src/components/admin/lista-productos-admin.tsx
- [ ] T032 [US2] Cambiar `limite: LIMITE_MAXIMO` (de T011) por `TAMANO_CATALOGO` en src/app/(cliente)/page.tsx y por `TAMANO_PANEL` en src/app/admin/(panel)/page.tsx (FR-010)

**Checkpoint**: T026 y T028 en verde; las dos historias funcionan juntas y por separado

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: comprobación completa y aceptación

- [ ] T033 [P] Agregar al README.md cómo usar scripts/productos-ejemplo.ts para medir velocidad, con la advertencia de que nunca se ejecuta contra la carpeta de datos de producción
- [ ] T034 Ejecutar `npm run verificar` y `npm run test:e2e`, incluidas las pruebas de la spec 001, y dejar todo en verde
- [ ] T035 Medir SC-002 y SC-003 con 500 productos de ejemplo según quickstart.md (Lighthouse 12.8.2, perfil Fast 4G, meta de LCP ≤ 1 s; resultados ≤ 1 s después de dejar de escribir), borrar `./datos/prueba-500` y registrar los resultados en specs/002-buscador-paginacion/checklists/aceptacion.md
- [ ] T036 Ejecutar en un celular real los pasos 1 a 16 de specs/002-buscador-paginacion/quickstart.md, incluido SC-005 cronometrado, y registrar los resultados en specs/002-buscador-paginacion/checklists/aceptacion.md
- [ ] T037 Hacer la prueba con 10 personas nuevas de SC-001 (quickstart, paso 17) y registrar fecha, personas, cuántas encontraron el producto con el buscador sin ayuda y observaciones en specs/002-buscador-paginacion/checklists/aceptacion.md
- [ ] T038 Después de publicar en Easypanel (pulsar Implementar tras el push a `main`), repetir en producción los pasos 1 a 8 y 14 de quickstart.md con los productos reales y registrarlos en specs/002-buscador-paginacion/checklists/aceptacion.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: empieza de inmediato, con T001 como condición para todo lo demás
- **Foundational (Fase 2)**: depende de T001 y bloquea las dos historias
- **US1 (Fase 3)** y **US2 (Fase 4)**: dependen de Foundational
- **Polish (Fase 5)**: depende de las dos historias. T035 depende de T002; T038 depende de T034 a T037

### User Story Dependencies

- **US1 (P1)**: solo depende de Foundational. Mientras US2 no esté, las páginas piden hasta 200 productos (T011), así que no se oculta ninguno
- **US2 (P2)**: depende de Foundational. T031 necesita los componentes de lista de US1 (T022 y T024). Si US2 se hiciera primero, esos componentes se crearían sin el buscador

### Within Each User Story

- Las pruebas se escriben primero y deben fallar
- Reglas y consultas antes que rutas; rutas y hook antes que componentes; componentes antes que páginas
- Cada historia termina con su checkpoint antes de pasar a la siguiente

### Parallel Opportunities

- Fase 1: T002 junto con T001, una vez aprobada la spec
- Fase 2: T003; T012, T013 y T014 después de T008 y T009; T017 en cualquier momento de la fase
- US1: T018, T019 y T020 juntas; T024 junto con T022
- US2: T026, T027 y T029 juntas
- Varias tareas tocan los mismos archivos en las dos historias (`src/lib/usar-lista-paginada.ts`, `src/components/cliente/catalogo-buscable.tsx`, `src/components/admin/lista-productos-admin.tsx` y las dos `page.tsx`), así que US1 y US2 van en secuencia

---

## Parallel Example: User Story 1

```text
Task: "T018 Pruebas de búsqueda en tests/integration/busqueda-productos.test.ts"
Task: "T019 Flujo en tests/e2e/us8-buscador.spec.ts"
Task: "T020 Campo de búsqueda en src/components/buscador-productos.tsx"
```

## Parallel Example: User Story 2

```text
Task: "T026 Pruebas de paginación en tests/integration/paginacion-productos.test.ts"
Task: "T027 Ayudante crearProductosDePrueba en tests/e2e/ayudantes.ts"
Task: "T029 Botón en src/components/boton-ver-mas.tsx"
```

---

## Implementation Strategy

### MVP First (US1)

1. Completar Setup y Foundational
2. Completar US1
3. **Detenerse y validar** con los pasos 1 a 8 y 14 de quickstart.md
4. Se puede publicar: el buscador ya responde a lo que pidieron 7 de 10 personas en SC-009 de la spec 001, y ningún producto queda oculto

### Incremental Delivery

1. Buscador: US1
2. Paginación con «Ver más»: US2. Después se miden SC-002 y SC-003 con 500 productos (T035)

Cada entrega agrega valor sin romper la anterior, y `npm run verificar` debe seguir en verde.

---

## Notes

- T034 a T037 son la condición de merge que pide la constitución
- Easypanel no despliega solo después de un push: hay que pulsar Implementar
- Hacer commit después de cada tarea o grupo lógico
