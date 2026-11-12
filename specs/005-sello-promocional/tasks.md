---

description: "Lista de tareas para implementar el sello promocional personalizable"
---

# Tasks: Sello promocional

**Input**: Design documents from `/specs/005-sello-promocional/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/interfaz.md, quickstart.md

**Tests**: se incluyen porque el Principio V de la constitución los exige. Cada prueba nombra en su título el FR, SC, escenario o caso límite que cubre, por ejemplo `FR-003: no se activa con texto vacío`. Se escriben primero y deben fallar antes de implementar.

**Organization**: las tareas se agrupan por historia de usuario de la spec 005:

- **US1**: anunciar una temporada de promociones (P1).
- **US2**: cambiar el sello para otra temporada (P2).

Las pruebas e2e se llaman `us16-sello-promocional.spec.ts` (US1) y `us17-cambiar-sello.spec.ts` (US2), después de `us15` de la spec 004.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario de la spec 005 a la que pertenece (US1 o US2)

## Reglas para todas las tareas

- Las specs 001 a 005 están aprobadas y sus `spec.md` no se modifican.
- Todo texto visible va en español de México, exactamente como en [contracts/interfaz.md](contracts/interfaz.md). Los textos y mensajes viven en `src/dominio/promocion.ts`, y las pruebas comparan contra sus constantes.
- Ningún precio, cálculo de operación ni consulta del catálogo cambia (FR-013).
- La franja muestra el texto con React normal; se prohíbe `dangerouslySetInnerHTML` (FR-012).
- Las pruebas e2e cambian el sello de una base compartida. Cada archivo e2e de esta spec deja el sello **desactivado** al terminar (`test.afterAll`), para que las pruebas de las specs 001 a 004 vean la página como antes. Playwright ya corre con `workers: 1`.
- Los selectores de Playwright usan `getByRole`, `getByLabel` o `filter({ visible: true })`.
- Los mensajes de commit van en español de México.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: lectura previa que pide AGENTS.md

- [X] T001 Leer en node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md y 09-revalidating.md, y en 01-app/02-guides/caching-without-cache-components.md, lo que aplica a una acción de servidor con `useActionState`, a `revalidatePath("/", "layout")` y a `export const dynamic = "force-dynamic"` en un layout. Anotar cualquier diferencia con el plan en specs/005-sello-promocional/research.md, en una sección nueva «9. Notas de implementación»

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tabla del sello, reglas puras y servicio, que usan las dos historias

**⚠️ CRITICAL**: ninguna historia puede empezar antes de terminar esta fase

### Pruebas de la fase base

- [X] T002 [P] Escribir tests/unit/promocion.test.ts contra `src/dominio/promocion.ts` (aún no existe; debe fallar):
  - `COLORES` trae exactamente las claves `rojo`, `verde`, `dorado` y `azul`, en ese orden, con los nombres «Rojo», «Verde», «Dorado» y «Azul» (FR-005);
  - el contraste WCAG de cada par fondo/texto y fondo/texto de ejemplo es de al menos 4.5 : 1, calculado en la prueba con la fórmula de luminancia relativa (FR-014, research 3);
  - `normalizarTexto` aplica NFC y quita los espacios del principio y del final;
  - `contarCaracteres` cuenta grafemas con `Intl.Segmenter`: «Ñandú» = 5, «Venta navideña 🎄» = 16, una «á» escrita como «a» más acento combinante = 1 (research 2);
  - `validarSello` rechaza activar con texto vacío o con solo espacios y devuelve el mensaje «Escribe el texto del sello para mostrarlo.» (FR-003); permite desactivar con texto vacío («Desactivar sin texto»); rechaza 41 caracteres con «El texto puede tener hasta 40 caracteres.» y acepta exactamente 40 (FR-004); acepta 40 «👍🏽» (320 bytes) y rechaza con el mismo mensaje un texto de hasta 40 caracteres visibles que pasa de 400 bytes (data-model.md); rechaza un color fuera de la lista con «Elige uno de los colores de la lista.» en `campos.color`;
  - `textoContador` devuelve «Te quedan 40 caracteres», «Te queda 1 carácter», «Te quedan 0 caracteres», «Te pasaste por 1 carácter» y «Te pasaste por 3 caracteres» (contracts/interfaz.md)
- [X] T003 [P] Escribir tests/integration/migracion-0003.test.ts siguiendo el patrón de tests/integration/migracion-0002.test.ts: aplicar las migraciones hasta la `0002`, insertar un producto, una foto y una operación con pago, aplicar todas, y comprobar que existe la tabla `sello_promocional` vacía y que el producto, la foto, la operación y el pago no cambiaron. Comprobar también los `CHECK`: `id = 2` se rechaza, `color = 'morado'` se rechaza y `activo = 1` con `texto = '  '` se rechaza (data-model.md)
- [X] T004 [P] Escribir tests/integration/promocion.test.ts con `usarBaseTemporal()` contra `src/servicios/promocion.ts` (aún no existe):
  - «Primera vez»: `obtenerSello()` sin fila devuelve `{ texto: "", color: "rojo", activo: false }`;
  - FR-002: `guardarSello({ texto: "Buen Fin · Pregunta por tu descuento", color: "rojo", activo: true })` guarda y `obtenerSello()` lo devuelve; un segundo guardado reemplaza la misma fila y la tabla sigue con una sola fila;
  - FR-007: desactivar conserva el texto y el color;
  - FR-003: activar con texto vacío lanza `ErrorNegocio("DATOS_INVALIDOS")` con `campos.texto`;
  - FR-004: guardar 40 «👍🏽» funciona y la base no lanza error de `CHECK`;
  - FR-001, «Sin sesión»: `guardarPromocion` sin sesión devuelve el error `NO_AUTORIZADO` y la tabla sigue sin cambios, con el mismo arnés de sesión que tests/integration/sesion.test.ts;
  - FR-008: `obtenerSello()` no cambia `activo` por sí solo; leer el sello varias veces, sin guardar nada, devuelve siempre lo último guardado;
  - FR-013: `listarCatalogo` devuelve los mismos `precioVentaCentavos` con el sello activo y desactivado, en 5 productos

### Implementación base

- [X] T005 Agregar `selloPromocional` a src/db/esquema.ts, según data-model.md: `id` integer llave primaria con `CHECK (id = 1)`; `texto` text no nulo; `color` text no nulo con `CHECK (color IN ('rojo', 'verde', 'dorado', 'azul'))`; `activo` integer `mode: "boolean"` no nulo; `actualizado_en` text no nulo con la fecha ISO; `CHECK (activo = 0 OR length(trim(texto)) > 0)` y `CHECK (length(CAST(texto AS BLOB)) <= 400)`
- [X] T006 Generar la migración con `npm run db:generar`, revisar que src/db/migraciones/0003_*.sql solo haga `CREATE TABLE sello_promocional` sin `INSERT` ni cambios a otras tablas, y que se agreguen el snapshot y la entrada del diario en src/db/migraciones/meta/. Dejar T003 en verde
- [X] T007 [P] Crear src/dominio/promocion.ts, sin base ni disco, con:
  - `COLORES`: lista ordenada de `{ clave, nombre, fondo, texto, textoEjemplo }`, con Rojo `#B42318`/`#FFFFFF`/`#FDE2DF`, Verde `#1F6F43`/`#FFFFFF`/`#D3F0DF`, Dorado `#F2C14E`/`#3B2A12`/`#5C4318` y Azul `#1E4FA3`/`#FFFFFF`/`#DCE6F9` (research 3), y el tipo `ClaveColor`;
  - `MAXIMO_CARACTERES = 40`, `MAXIMO_BYTES = 400`, `normalizarTexto`, `contarCaracteres` y `textoContador`;
  - `validarSello({ texto, color, activo })`, que devuelve los errores por campo; el texto se rechaza si pasa de 40 caracteres visibles o de 400 bytes en UTF-8, con el mismo mensaje;
  - las constantes con los mensajes y etiquetas de contracts/interfaz.md: «Escribe el texto del sello para mostrarlo.», «El texto puede tener hasta 40 caracteres.», «Elige uno de los colores de la lista.», «Listo. El sello se muestra en la página.», «Listo. El sello está desactivado.», «Escribe el texto del sello», «Texto del sello», «Color», «Mostrar el sello en la página», «Así se verá» y «Promoción»;
  - `SELLO_INICIAL = { texto: "", color: "rojo", activo: false }`.

  Dejar T002 en verde
- [X] T008 Crear src/servicios/promocion.ts con `obtenerSello(conexion = obtenerBd())`, que lee la fila `id = 1` o devuelve `SELLO_INICIAL`, y `guardarSello(datos, conexion = obtenerBd())`, que normaliza el texto con `normalizarTexto`, valida con `validarSello` (si falla, lanza `ErrorNegocio("DATOS_INVALIDOS", …, campos)`) y hace un *upsert* de `id = 1` con `actualizado_en` en ISO UTC. Dejar T004 en verde

**Checkpoint**: `npm run verificar` en verde; la tabla, las reglas y el servicio funcionan sin interfaz

---

## Phase 3: User Story 1 - Anunciar una temporada de promociones (Priority: P1) 🎯 MVP

**Goal**: el vendedor escribe un texto, elige un color y activa o desactiva el sello desde «Promoción»; los clientes ven la franja debajo del encabezado en todas las páginas de cliente mientras está activo.

**Independent Test**: activar el sello con un texto, abrir el catálogo, una página de producto y «Mis apartados» en móvil y comprobar la franja; desactivarlo y comprobar que se ven igual que antes de la spec.

### Tests for User Story 1

- [X] T009 [US1] Escribir tests/e2e/us16-sello-promocional.spec.ts (debe fallar), con `test.afterAll` que deja el sello desactivado:
  - US1-1 y «Primera vez»: sin guardar nada, el catálogo no tiene `[data-sello-promocional]`;
  - FR-001: en móvil, el botón «Promoción» del encabezado es visible y su caja no se encima con la marca «Productos Eli's» ni con «Salir» (comparar `boundingBox()`); en portátil, el enlace «Promoción» está en la navegación «Administración» y queda con `aria-current="page"` en /admin/promocion;
  - FR-001, «Sin sesión»: sin sesión, /admin/promocion manda a /admin/entrar;
  - US1-2, FR-008: escribir «Buen Fin · Pregunta por tu descuento», elegir «Rojo», marcar «Mostrar el sello en la página», guardar y ver «Listo. El sello se muestra en la página.»;
  - US2-3, FR-003: marcar la casilla con el texto vacío y guardar, y luego con solo espacios: no se guarda y aparece «Escribe el texto del sello para mostrarlo.» junto al campo (va aquí porque el error junto al campo es parte de T014);
  - US1-3, FR-009: la franja aparece con ese texto debajo del encabezado en `/`, en una página de producto, en /mis-apartados, en /encargos y en /aviso-de-privacidad;
  - SC-002: a 390 px, al cargar el catálogo y sin desplazarse, la caja de la franja queda completa dentro de la ventana;
  - «Productos agotados»: con el sello activo, un producto agotado sigue mostrando «Agotado, disponible por encargo» completo;
  - FR-009: la franja no contiene enlaces ni botones, y no hay control para cerrarla;
  - US1-4, FR-011: a 390 px, `document.documentElement.scrollWidth` no supera el ancho de la ventana y la franja no se cruza con la primera tarjeta de producto;
  - FR-012: con el texto `<b>Hola</b>`, la franja muestra literalmente `<b>Hola</b>` y no contiene un elemento `b`;
  - US1-5, FR-007, FR-008: al desmarcar la casilla y guardar aparece «Listo. El sello está desactivado.», la franja desaparece del catálogo, y en «Promoción» siguen el texto y el color;
  - «Desactivar sin texto»: con la casilla desmarcada y el texto vacío, guardar no da error;
  - US1-6, FR-013, SC-003: con el sello activo, el precio de un producto en el catálogo y el precio propuesto al registrar una venta, un apartado y un encargo son los mismos que con el sello desactivado;
  - FR-014, SC-005: con el sello activo en cada uno de los 4 colores, axe no encuentra faltas en el catálogo
- [X] T010 [P] [US1] Agregar /admin/promocion a la lista de rutas de tests/e2e/accesibilidad-admin.spec.ts y comprobar axe sin faltas en móvil y portátil (Principio VII)

### Implementation for User Story 1

- [X] T011 [P] [US1] Crear src/components/sello-promocional.tsx, un componente que sirve en el servidor y en el cliente (sin `"use client"` ni hooks), que recibe `{ texto, color }` y dibuja según contracts/interfaz.md: `<div data-sello-promocional data-color={color}>` a todo lo ancho, con el `fondo` y el `texto` de `COLORES` como estilos en línea, y un `<p>` centrado con `break-words`, de al menos 14 px (`text-sm`) y `font-medium`. Sin enlace, sin botón, sin `role` y sin `dangerouslySetInnerHTML`. Si recibe `vacio`, muestra el texto de ejemplo «Escribe el texto del sello» con el color `textoEjemplo` de `COLORES`, sin opacidad, solo para la vista previa
- [X] T012 [US1] En src/app/(cliente)/layout.tsx, agregar `export const dynamic = "force-dynamic"`, leer `obtenerSello()` y, si `activo`, dibujar `<SelloPromocional>` justo después de `</header>` y antes de `<main>`, fuera del encabezado fijo. Con el sello desactivado el HTML queda igual que antes (FR-009, FR-010, research 5)
- [X] T013 [P] [US1] Crear src/acciones/promocion.ts con `"use server"` y `guardarPromocion(_anterior, formulario)`, que hace `exigirSesion()`, lee `texto`, `color` y `activo` (`"on"` cuando la casilla está marcada), llama a `guardarSello` dentro de `ejecutar()`, llama a `revalidatePath("/", "layout")` y devuelve `Resultado<{ activo: boolean; texto: string; color: ClaveColor }>` con lo que quedó guardado (contracts/interfaz.md)
- [X] T014 [US1] Crear src/components/admin/formulario-promocion.tsx con `"use client"` y `useActionState(guardarPromocion)`, que recibe el sello guardado y dibuja, con los textos de `src/dominio/promocion.ts`:
  - el campo de una línea «Texto del sello» (`name="texto"`, sin `maxLength`, research 2), con el error de `campos.texto` junto al campo y `aria-describedby`;
  - el grupo de radios nativos «Color» (`<fieldset>` con `<legend>`), con las 4 opciones de `COLORES`, cada una con su nombre escrito y una muestra `aria-hidden`, y el error de `campos.color` junto al grupo;
  - la casilla nativa «Mostrar el sello en la página» (`name="activo"`);
  - el botón «Guardar»;
  - el mensaje de resultado en `aria-live="polite"`: «Listo. El sello se muestra en la página.» o «Listo. El sello está desactivado.»
- [X] T015 [US1] Crear src/app/admin/(panel)/promocion/page.tsx con `export const dynamic = "force-dynamic"`, `metadata = { title: "Promoción" }`, el encabezado `<h1>` «Promoción» y `<FormularioPromocion sello={obtenerSello()} />`
- [X] T016 [US1] Agregar «Promoción» a la navegación del panel (FR-001, research 7):
  - en src/components/admin/navegacion.tsx, agregar `{ href: "/admin/promocion", etiqueta: "Promoción", icono: <Megaphone />, exacto: false }` **solo** a la navegación superior; `NavegacionAdminInferior` sigue con sus 5 enlaces;
  - en src/app/admin/(panel)/layout.tsx, agregar antes de «Salir» un botón `ghost` `size="sm"` con `asChild`, enlace a /admin/promocion, icono `Megaphone` y texto «Promoción», visible solo debajo de `md` (`md:hidden`);
  - en el mismo archivo, mostrar el subtítulo «Administración» solo desde `sm` (`hidden sm:inline`)
- [X] T017 [US1] Correr `npx playwright test tests/e2e/us16-sello-promocional.spec.ts tests/e2e/accesibilidad-admin.spec.ts` y dejar T009 y T010 en verde. Si alguna prueba anterior buscaba el subtítulo «Administración» en móvil, ajustarla sin cambiar lo que comprueba

**Checkpoint**: US1 funciona sola (pasos 1 a 10 y 14 a 17 de quickstart.md). No se publica hasta terminar US2

---

## Phase 4: User Story 2 - Cambiar el sello para otra temporada (Priority: P2)

**Goal**: el vendedor cambia el texto y el color, ve una vista previa y un contador mientras escribe, y los clientes ven el cambio al recargar.

**Independent Test**: con el sello activo, cambiar el texto y el color, guardar, recargar el catálogo y comprobar que aparecen el texto y el color nuevos y no los anteriores.

### Tests for User Story 2

- [X] T018 [US2] Escribir tests/e2e/us17-cambiar-sello.spec.ts (debe fallar), con `test.afterAll` que deja el sello desactivado:
  - US2-1, FR-010: con el sello activo en Rojo, cambiar a «Venta navideña 🎄» en Verde, guardar, recargar el catálogo y ver la franja con `data-color="verde"` y el texto nuevo, sin el anterior;
  - US2-2, FR-006: al escribir y al cambiar de color, la vista previa «Así se verá» cambia antes de guardar; sin texto muestra «Escribe el texto del sello»;
  - «Dos vendedores editando a la vez»: guardar «  Hola  » activo y ver «Hola» en el campo después de guardar, sin espacios; luego guardar otro texto desde una segunda pestaña, recargar la primera y ver lo último guardado;
  - US2-4, FR-004: al escribir, el contador dice «Te quedan N caracteres»; con 41 caracteres dice «Te pasaste por 1 carácter» y «Guardar» queda deshabilitado; con 40 se guarda;
  - US2-5, FR-005: el grupo «Color» tiene los radios «Rojo», «Verde», «Dorado» y «Azul», en ese orden, accesibles por su nombre

### Implementation for User Story 2

- [X] T019 [US2] En src/components/admin/formulario-promocion.tsx, agregar el estado local del texto y del color y, con él:
  - el contador debajo del campo, con `textoContador(contarCaracteres(normalizarTexto(texto)))`, en `aria-live="polite"` y con el color de error cuando pasa de 40;
  - `disabled` en «Guardar» mientras el texto pasa de 40;
  - la vista previa «Así se verá» con `<SelloPromocional>` y el texto y el color actuales, aunque la casilla esté desmarcada, o con `vacio` si no hay texto (FR-006);
  - al guardar con éxito, el estado local toma el texto y el color que quedaron guardados, ya normalizados, para que el panel muestre siempre lo guardado («Dos vendedores editando a la vez»). La acción los devuelve en `Resultado<{ activo, texto, color }>`
- [X] T020 [US2] Correr `npx playwright test tests/e2e/us17-cambiar-sello.spec.ts` y dejar T018 en verde

**Checkpoint**: US1 y US2 funcionan juntas; los pasos 11 a 13 de quickstart.md pasan

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: regresión, rendimiento, ensayo de la migración y aceptación

- [X] T021 Crear specs/005-sello-promocional/checklists/aceptacion.md con la estructura de la de la spec 004. Ejecutar `npm run verificar` y `npm run test:e2e`, incluidas las pruebas de las specs 001 a 004, y dejar todo en verde (Principio V). Registrar el número de pruebas en ese archivo
- [ ] T022 Ensayar la migración `0003` sobre una copia del último respaldo de producción, como T045 de la spec 004: el número de productos, fotos, operaciones y pagos no cambia y la tabla `sello_promocional` queda vacía. Registrar antes y después en specs/005-sello-promocional/checklists/aceptacion.md
- [X] T023 [P] Con el sello activo, medir en local el LCP del catálogo a 390 px y compararlo con el de la spec 002; no debe empeorar de forma apreciable (plan, Performance Goals). Registrar el resultado en specs/005-sello-promocional/checklists/aceptacion.md
- [ ] T024 Ejecutar en local los pasos 1 a 18 de specs/005-sello-promocional/quickstart.md, con el paso 9 en un celular real en modo claro y oscuro, y el paso 18 con la ventana a unos 800 px. Registrar los resultados en specs/005-sello-promocional/checklists/aceptacion.md. Si en el paso 18 los enlaces se enciman, mostrar solo iconos entre `md` y `lg` en src/components/admin/navegacion.tsx (research 7, riesgo conocido)
- [ ] T025 Hacer con 10 personas la prueba de SC-004 (quickstart, paso 19) y registrar fecha, cuántas personas leyeron el texto completo y observaciones en specs/005-sello-promocional/checklists/aceptacion.md
- [ ] T026 Después de publicar en Easypanel (pulsar Implementar tras el push a `main`, con el respaldo del día ya hecho), hacer en producción los pasos 2 a 7, 9 y 15 de quickstart.md, dejar el sello activo con «Buen Fin · Pregunta por tu descuento» en Rojo y registrar los resultados en specs/005-sello-promocional/checklists/aceptacion.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: empieza de inmediato
- **Foundational (Fase 2)**: depende de Setup y bloquea las dos historias. T002, T003 y T004 en paralelo; T005 → T006; T007 en paralelo con T005 y T006; T008 depende de T006 y T007
- **US1 (Fase 3)**: depende de Foundational
- **US2 (Fase 4)**: depende de T011 y T014 de US1 (usa el componente de la franja y amplía el formulario)
- **Polish (Fase 5)**: depende de las dos historias. T022 depende de T006; T026 depende de T021, T022 y T024

### User Story Dependencies

- **US1 (P1)**: independiente; trae la franja, la acción, la página y la navegación
- **US2 (P2)**: agrega el contador, el botón deshabilitado y la vista previa al formulario de US1

### Within Each User Story

- Las pruebas se escriben primero y deben fallar
- Dominio antes que el servicio; servicio antes que la acción; acción antes que el formulario; formulario antes que la página
- Cada historia termina con su checkpoint antes de pasar a la siguiente

### Parallel Opportunities

- Fase 2: T002, T003 y T004 juntas; T007 junto con T005
- US1: T010, T011 y T013 juntas después de T009
- Polish: T023 junto con T022

---

## Parallel Example: Foundational

```text
Task: "T002 Reglas del sello en tests/unit/promocion.test.ts"
Task: "T003 Migración 0003 en tests/integration/migracion-0003.test.ts"
Task: "T004 Servicio del sello en tests/integration/promocion.test.ts"
```

## Parallel Example: User Story 1

```text
Task: "T010 /admin/promocion en tests/e2e/accesibilidad-admin.spec.ts"
Task: "T011 Franja en src/components/sello-promocional.tsx"
Task: "T013 Acción guardarPromocion en src/acciones/promocion.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Completar Setup y Foundational
2. Completar US1
3. **Detenerse y validar** con los pasos 1 a 10 y 14 a 17 de quickstart.md
4. Seguir con US2 sin publicar todavía

### Entrega

El propietario decidió el 2026-11-11 publicar **US1 y US2 juntas** para el Buen Fin, con la spec completa. US1 sola no se publica, porque le faltarían el contador (FR-004) y la vista previa (FR-006). Cada historia deja `npm run verificar` en verde.

---

## Notes

- T021, T022 y T024 son la condición de merge que pide la constitución
- T025 (SC-004 con 10 personas) puede hacerse después de publicar, si el propietario lo decide, como T047 de la spec 004
- Easypanel no despliega solo después de un push: hay que pulsar Implementar
- Hacer commit después de cada tarea o grupo lógico, con el mensaje en español de México
