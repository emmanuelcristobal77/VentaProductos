---

description: "Lista de tareas para implementar el aviso de privacidad, la constancia en las operaciones y el borrado de datos a petición del cliente"
---

# Tasks: Aviso de privacidad

**Input**: Design documents from `/specs/003-aviso-privacidad/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/interfaz.md, quickstart.md

**Tests**: se incluyen porque el Principio V de la constitución los exige. Cada prueba nombra en su título el FR, SC o escenario que cubre, por ejemplo `FR-008: rechaza un apartado sin la casilla`. Se escriben primero y deben fallar antes de implementar.

**Organization**: las tareas se agrupan por historia de usuario de la spec 003:

- **US1**: consultar el aviso de privacidad (P1).
- **US2**: dejar constancia de que se informó al cliente (P2).
- **US3**: borrar los datos de un cliente que lo pide (P3).

Para no chocar con las specs 001 y 002, sus pruebas e2e se llaman `us10-aviso-privacidad.spec.ts`, `us11-constancia-aviso.spec.ts` y `us12-borrar-datos.spec.ts`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario de la spec 003 a la que pertenece (US1, US2 o US3)

## Reglas para todas las tareas

- Las specs 001, 002 y 003 están aprobadas y sus `spec.md` no se modifican.
- Todo texto visible va en español de México, con los textos exactos de [research.md, sección 9](research.md#9-textos-nuevos-es-mx). Los mensajes de error provienen de `src/lib/mensajes.ts`.
- Las fechas y horas se muestran con `formatearFecha` y `formatearHora` de `src/dominio/fechas.ts` (FR-019; FR-039 de la spec 001).
- `src/consultas/publicas.ts` no selecciona `aviso_informado` ni `datos_borrados_en` (FR-012).
- Ningún cambio toca `precio_unitario_centavos`, `cantidad`, `estado` ni la tabla `pagos` fuera de lo que ya hacía la spec 001 (Principio II, FR-016).
- En las pruebas de las specs 001 y 002 solo se agregan datos de entrada (la casilla marcada); sus aserciones no cambian (plan, Principio V).
- Los selectores de Playwright usan `getByRole`, `getByLabel` o `filter({ visible: true })`.
- Los mensajes de commit van en español de México.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: aprobación y lectura previa

- [X] T001 Registrar la aprobación formal de la spec por su propietario: **Status** Approved en specs/003-aviso-privacidad/spec.md y "Aprobada el 2026-11-06" en specs/MAPA.md (Constitución, Principio I). Hecho en el commit 8a13e0d
- [ ] T002 Leer en node_modules/next/dist/docs/ las guías de páginas estáticas del App Router, de `metadata` por página y de `Link` con `target`, como pide AGENTS.md, y anotar en specs/003-aviso-privacidad/research.md, sección 10, cualquier diferencia con lo planeado (research 10)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: columnas y restricciones nuevas de `operaciones`, que usan US2 y US3

**⚠️ CRITICAL**: US2 y US3 no pueden empezar antes de terminar esta fase. US1 no depende de ella

### Pruebas de la fase base

- [ ] T003 Escribir pruebas en tests/integration/migracion-0001.test.ts (research 4):
  - Copiar a una carpeta temporal solo `0000_adorable_orphan.sql` y su `meta/_journal.json` recortado a esa entrada; aplicar con `migrate`, sembrar e insertar un apartado con dos pagos, un encargo con un pago y una venta sin cliente.
  - Aplicar después la carpeta completa de src/db/migraciones y comprobar que el número de operaciones y de pagos no cambió, que todas las columnas anteriores conservan su valor, que `aviso_informado` y `datos_borrados_en` quedaron en `NULL` y que `PRAGMA foreign_key_check` no devuelve filas.
  - Comprobar que la base rechaza: un apartado con `datos_borrados_en` y `cliente_nombre` no nulo (`operaciones_datos_borrados`); un apartado con `cliente_telefono` y `aviso_informado = 0` (`operaciones_aviso`); y que acepta un apartado con `datos_borrados_en` y nombre y teléfono nulos (`operaciones_cliente`).

### Implementación base

- [ ] T004 Agregar a `operaciones` en src/db/esquema.ts, según data-model.md:
  - `avisoInformado: integer("aviso_informado", { mode: "boolean" })`, nulo permitido: "`1`: se informó al cliente del aviso al registrar. `0`: venta sin datos del cliente. Nulo: operación registrada antes de la spec 003".
  - `datosBorradosEn: text("datos_borrados_en")`, nulo permitido: "Fecha y hora en que se borraron los datos del cliente a petición suya. Nulo mientras no se borren".
  - Cambiar `operaciones_cliente` a `tipo = 'venta' OR datos_borrados_en IS NOT NULL OR (cliente_nombre IS NOT NULL AND cliente_telefono IS NOT NULL)`.
  - Agregar `operaciones_datos_borrados`: `datos_borrados_en IS NULL OR (cliente_nombre IS NULL AND cliente_nombre_norm IS NULL AND cliente_telefono IS NULL)`.
  - Agregar `operaciones_aviso`: `aviso_informado IS NOT 0 OR (cliente_nombre IS NULL AND cliente_telefono IS NULL)`.
- [ ] T005 Generar la migración con `npm run db:generar` en src/db/migraciones/0001_*.sql. Revisar el SQL línea por línea: debe reconstruir `operaciones` copiando todas sus columnas e índices. Agregar a mano `PRAGMA defer_foreign_keys = ON;--> statement-breakpoint` como primera sentencia, con un comentario SQL que explique por qué (research 4). Hacer pasar T003
- [ ] T006 Ejecutar `npm run verificar` y confirmar que las pruebas de las specs 001 y 002 siguen en verde con el esquema nuevo, antes de cambiar ningún servicio

**Checkpoint**: la base tiene los datos nuevos y nada de lo existente cambió de comportamiento

---

## Phase 3: User Story 1 - Consultar el aviso de privacidad (Priority: P1) 🎯 MVP

**Goal**: página pública `/aviso-de-privacidad` con todos los elementos de FR-004, enlazada desde el pie de la sección de cliente y desde «Mis apartados»

**Independent Test**: abrir el catálogo, una página de producto, los artículos por encargo y «Mis apartados»; en cada una, pulsar el enlace del pie y comprobar que se abre el aviso con todos los elementos de FR-004. Abrir la dirección directamente y comprobar que también se abre

### Tests for User Story 1

- [ ] T007 [P] [US1] Escribir pruebas en tests/unit/aviso-privacidad.test.ts (FR-004, SC-005): el módulo de src/lib/aviso-privacidad.ts exporta el responsable "Emmanuel Cristóbal Trejo", el domicilio "Andador Poleo No. 20, Col. La Magdalena Chichicaspa, Huixquilucan, Estado de México", el correo "emmanuelcristobal@yahoo.com.mx", una fecha de última actualización válida y las 8 secciones en el orden de contracts/interfaz.md, cada una con título y texto no vacíos. La sección "Cuánto tiempo los guardamos" menciona los 14 días de los respaldos y no promete un plazo de borrado automático
- [ ] T008 [P] [US1] Escribir pruebas e2e en tests/e2e/us10-aviso-privacidad.spec.ts, en móvil y portátil:
  - US1-1 y SC-001: desde `/`, un producto, `/encargos` y `/mis-apartados`, el enlace «Aviso de privacidad» del pie abre `/aviso-de-privacidad`; la navegación superior e inferior no lo tienen (FR-002).
  - US1-2: en `/mis-apartados` hay un enlace al aviso junto al formulario (FR-003).
  - US1-3 y US1-5: sin sesión, la página muestra un `h2` por sección y la fecha «Última actualización: …» con el mes escrito (FR-001, FR-004).
  - US1-4: a 390 px de ancho, `document.documentElement.scrollWidth` no supera el ancho de la ventana (FR-006).
  - US1-6: el correo es un enlace `mailto:emmanuelcristobal@yahoo.com.mx` y el teléfono un enlace `tel:+52…` (FR-005).
  - axe sin violaciones en la página (FR-019).

### Implementation for User Story 1

- [ ] T009 [US1] Crear src/lib/aviso-privacidad.ts con el responsable, el domicilio, el correo, la fecha de última actualización como texto ISO y las 8 secciones de contracts/interfaz.md, cada una con `titulo` y sus párrafos, redactadas con los elementos de FR-004 y la clarificación de conservación de la spec; la de conservación incluye el plazo de 14 días de `DIAS_CONSERVADOS` de src/lib/respaldo.ts (research 1 y 8). El texto queda pendiente de la aprobación del propietario (T033). Hacer pasar T007
- [ ] T010 [US1] Crear src/app/(cliente)/aviso-de-privacidad/page.tsx: componente de servidor estático, `metadata` con el título «Aviso de privacidad | Productos Eli's», un `h1`, la fecha con `formatearFecha`, un `h2` por sección, el correo como enlace `mailto:` y el teléfono de `telefonoNegocio()` como enlace `tel:` (FR-001, FR-004–FR-006). Texto legible en móvil, con el ancho máximo de lectura que ya usa la sección
- [ ] T011 [P] [US1] Agregar en el pie de src/app/(cliente)/layout.tsx, debajo del teléfono, un `Link` «Aviso de privacidad» a `/aviso-de-privacidad`, con buen contraste y un área táctil de al menos 44 px de alto (FR-002)
- [ ] T012 [P] [US1] Agregar en src/components/cliente/consulta-apartados.tsx, junto al formulario, la línea «Consulta cómo usamos tus datos en nuestro aviso de privacidad.», con «aviso de privacidad» como enlace a `/aviso-de-privacidad` (FR-003)
- [ ] T013 [US1] Hacer pasar T008 y ejecutar `npm run verificar`

**Checkpoint**: el aviso está publicado y se llega a él desde toda la sección de cliente. Se puede publicar solo, porque no depende de la migración

---

## Phase 4: User Story 2 - Dejar constancia de que se informó al cliente (Priority: P2)

**Goal**: casilla «Se informó al cliente del aviso de privacidad» en venta, apartado y encargo, validada en el servicio y mostrada en el detalle

**Independent Test**: registrar un apartado sin la casilla y comprobar que no se guarda; marcarla y comprobar que se guarda. Registrar una venta sin datos ni casilla y comprobar que se guarda. Abrir el detalle de ambas

### Tests for User Story 2

- [ ] T014 [P] [US2] Escribir pruebas en tests/integration/constancia-aviso.test.ts:
  - FR-008: `registrarApartado` y `registrarEncargo` con `avisoInformado: false` lanzan `DATOS_INVALIDOS` con `campos.avisoInformado` igual a `CAMPOS.avisoInformado`; con `true` guardan `aviso_informado = 1`.
  - FR-009: `registrarVenta` con nombre, o solo con teléfono, y `avisoInformado: false` lanza el mismo error; sin nombre ni teléfono (o con solo espacios, caso límite "Solo espacios") y casilla sin marcar se guarda con `aviso_informado = 0`; sin datos y casilla marcada también guarda `0` (data-model, Reglas de validación).
  - FR-012: `corregirOperacion` no cambia `aviso_informado`.
  - FR-012: `consultarOperacionesCliente` no devuelve `avisoInformado` ni `datosBorradosEn`.
- [ ] T015 [P] [US2] Escribir pruebas e2e en tests/e2e/us11-constancia-aviso.spec.ts, en móvil y portátil:
  - US2-1 y US2-8: las hojas de apartar, vender y encargar muestran la casilla sin marcar y un enlace al aviso con `target="_blank"` (FR-007).
  - US2-2 y US2-4: guardar sin la casilla muestra «Informa al cliente del aviso de privacidad y marca la casilla.» junto a ella, asociado con `aria-describedby`, y conserva lo capturado.
  - US2-3 y US2-6: con la casilla, el detalle muestra «Se informó al cliente del aviso de privacidad» con fecha y hora (FR-011).
  - US2-5 y SC-004: una venta sin datos se registra sin tocar la casilla.
  - US2-7: una operación insertada con `aviso_informado` nulo muestra «Sin constancia del aviso: se registró antes de que existiera».
  - axe sin violaciones en la hoja de apartado abierta (FR-019).

### Implementation for User Story 2

- [ ] T016 [US2] Agregar `avisoInformado: "Informa al cliente del aviso de privacidad y marca la casilla."` a `CAMPOS` en src/lib/mensajes.ts
- [ ] T017 [US2] En src/servicios/operaciones.ts: agregar `avisoInformado: boolean` a `DatosVenta` y `DatosPedido`; en `validarPedido`, si es falso, agregar `errores.avisoInformado` y guardar `avisoInformado: true`; en `registrarVenta`, exigirlo solo si hay nombre o teléfono tras recortar, y guardar `avisoInformado: Boolean(nombre || telefono)` (FR-008–FR-010; data-model, Reglas de validación). `corregirOperacion` no lo toca
- [ ] T018 [US2] En src/acciones/operaciones.ts, leer `avisoInformado` como `formulario.get("avisoInformado") === "on"` en `registrarVenta`, `registrarApartado` y `registrarEncargo` (contracts/interfaz.md, Acciones que cambian)
- [ ] T019 [US2] Agregar `avisoInformado: true` a los datos de entrada de las pruebas que registran apartados, encargos o ventas con cliente, sin cambiar sus aserciones: tests/integration/arnes.ts, apartados.test.ts, encargos.test.ts, ventas.test.ts, pagos.test.ts, consulta-cliente.test.ts, busqueda.test.ts, productos.test.ts, respaldo.test.ts, tests/concurrency/trabajador.ts y ultima-unidad.test.ts. En tests/e2e/us3-venta.spec.ts, us4-apartado.spec.ts, us5-encargo.spec.ts, us6-consulta.spec.ts, us7-busqueda.spec.ts y accesibilidad-admin.spec.ts, marcar la casilla antes de guardar donde se capturan datos del cliente. Hacer pasar T014
- [ ] T020 [US2] Agregar `CasillaAviso` en src/components/admin/hoja-formulario.tsx: `<input type="checkbox" name="avisoInformado">` nativo con `<Label>` «Se informó al cliente del aviso de privacidad», el error de `ErroresCampo` asociado con `aria-describedby` y un enlace «Ver aviso de privacidad (se abre en otra pestaña)» con `target="_blank"` y `rel="noopener"` (FR-007; research 2 y 3)
- [ ] T021 [US2] Agregar `<CasillaAviso />` después de los campos del cliente en src/components/admin/hoja-venta.tsx, hoja-apartado.tsx y hoja-encargo.tsx
- [ ] T022 [US2] En src/app/admin/(panel)/operaciones/[id]/page.tsx, mostrar la constancia según research 7: con `avisoInformado` verdadero, «Se informó al cliente del aviso de privacidad» con `formatearFecha` y `formatearHora` de `creadoEn`; con `false`, nada; con nulo, «Sin constancia del aviso: se registró antes de que existiera» (FR-011)
- [ ] T023 [US2] Hacer pasar T015 y ejecutar `npm run verificar` y `npm run test:e2e`

**Checkpoint**: ninguna operación con datos del cliente se guarda sin la constancia, y el detalle la muestra

---

## Phase 5: User Story 3 - Borrar los datos de un cliente que lo pide (Priority: P3)

**Goal**: acción «Borrar datos del cliente» que deja en nulo el nombre y el teléfono de todas las operaciones del mismo cliente, sin tocar importes ni pagos

**Independent Test**: registrar dos apartados y una venta con el mismo nombre y teléfono, con pagos; borrar desde uno y comprobar que las tres quedan borradas, con los mismos importes, pagos y saldos, y que ni el panel ni «Mis apartados» las encuentran

### Tests for User Story 3

- [ ] T024 [P] [US3] Escribir pruebas en tests/integration/borrado-datos.test.ts:
  - FR-013 a FR-015 y SC-006: con dos apartados y una venta del mismo cliente, más una operación de otro cliente con el mismo nombre y otro teléfono, `contarOperacionesDelCliente` da 3 y `borrarDatosCliente` devuelve `{ borradas: 3 }`, deja en `NULL` `cliente_nombre`, `cliente_nombre_norm` y `cliente_telefono`, y guarda `datos_borrados_en`; la operación del otro cliente no cambia.
  - Mismo nombre escrito con otras mayúsculas o acentos ("José" y "JOSE") cuenta como el mismo cliente (FR-037 de la spec 001). Una venta con solo teléfono alcanza a las ventas con ese teléfono y sin nombre (data-model, Alcance del borrado).
  - FR-016: precio, cantidad, estado, pagos, saldo y `aviso_informado` iguales al centavo antes y después.
  - FR-017: `buscarOperaciones` por nombre o por teléfono anteriores y `consultarOperacionesCliente` no las devuelven; `registrarPago`, `marcarEntregada`, `cancelarOperacion` y `anularVenta` siguen funcionando en ellas.
  - FR-018: `borrarDatosCliente` en una operación ya borrada o en una venta sin datos lanza `ESTADO_NO_PERMITE`; `corregirOperacion` en una operación borrada lanza `ESTADO_NO_PERMITE`.
  - Caso límite "Operaciones anuladas o canceladas": se pueden borrar y conservan su constancia.
- [ ] T025 [P] [US3] Escribir pruebas e2e en tests/e2e/us12-borrar-datos.spec.ts, en móvil y portátil:
  - US3-1: «Borrar datos del cliente» abre una confirmación que dice que se borrarán los datos de 3 operaciones y que no se puede deshacer.
  - US3-3: «Volver» no cambia nada.
  - US3-2 y US3-4: al confirmar, aparece «Datos del cliente borrados en 3 operaciones.» y el detalle muestra «Datos borrados a petición del cliente» con fecha y hora, con el mismo saldo.
  - US3-5: la búsqueda de `/admin/operaciones` y `/mis-apartados` con el nombre y el teléfono anteriores no las encuentran.
  - US3-6: en un apartado pendiente borrado se registra un pago, y no aparecen «Borrar datos del cliente» ni «Corregir».
  - US3-7: una venta sin datos no muestra la acción.
  - axe sin violaciones con la confirmación abierta (FR-019).

### Implementation for User Story 3

- [ ] T026 [US3] Agregar `contarOperacionesDelCliente(id)` en src/consultas/admin.ts, con la regla de data-model.md: "operaciones donde datos_borrados_en IS NULL y cliente_nombre_norm IS o.cliente_nombre_norm y cliente_telefono IS o.cliente_telefono". Devuelve 0 si la operación no tiene nombre ni teléfono o ya está borrada
- [ ] T027 [US3] Agregar `borrarDatosCliente(id)` en src/servicios/operaciones.ts, dentro de `conTransaccion`: rechazar con `ESTADO_NO_PERMITE` si la operación no existe, no tiene nombre ni teléfono o tiene `datosBorradosEn`; con la misma regla de T026, poner en nulo `clienteNombre`, `clienteNombreNorm` y `clienteTelefono`, guardar `datosBorradosEn` con la hora actual en ISO y devolver `{ borradas }` (FR-015, FR-016). En `corregirOperacion`, rechazar con `ESTADO_NO_PERMITE` si `datosBorradosEn` tiene valor (FR-018)
- [ ] T028 [US3] Agregar la acción `borrarDatosCliente(id)` en src/acciones/operaciones.ts con `exigirSesion()`, `ejecutar` y `refrescar()`, que devuelve `Resultado<{ borradas: number }>` (contracts/interfaz.md). Hacer pasar T024
- [ ] T029 [US3] Crear src/components/admin/dialogo-borrar-datos.tsx: botón «Borrar datos del cliente» con estilo destructivo, diálogo con el texto «Se borrarán el nombre y el teléfono de N operaciones. Los importes y pagos se conservan. Esta acción no se puede deshacer.», botones «Volver» y «Confirmar», y aviso de éxito «Datos del cliente borrados en N operaciones.» con la cuenta real que devuelve la acción (research 9). Seguir el patrón de `DialogoMotivo` en src/components/admin/acciones-operacion.tsx, sin campo de motivo
- [ ] T030 [US3] En src/app/admin/(panel)/operaciones/[id]/page.tsx: si `datosBorradosEn` tiene valor, mostrar en «Cliente» el texto «Datos borrados a petición del cliente» y en «Datos borrados» la fecha y hora; si no, y hay nombre o teléfono, mostrar `DialogoBorrarDatos` con la cuenta de `contarOperacionesDelCliente`. Ocultar `HojaCorreccion` cuando `datosBorradosEn` tiene valor (FR-013, FR-015, FR-018; research 6)
- [ ] T031 [P] [US3] Mostrar «Datos borrados a petición del cliente» en lugar del nombre y el teléfono cuando `datosBorradosEn` tiene valor en src/app/admin/(panel)/operaciones/page.tsx y src/app/admin/(panel)/encargos/page.tsx (research 6)
- [ ] T032 [US3] Hacer pasar T025 y ejecutar `npm run verificar` y `npm run test:e2e`

**Checkpoint**: el negocio puede cumplir una solicitud de cancelación sin perder sus cuentas

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: aprobación del texto, ensayo de la migración y aceptación

- [ ] T033 Mostrarle al propietario el texto completo del aviso de src/lib/aviso-privacidad.ts y aplicar sus correcciones, idealmente tras la revisión de un abogado (supuesto «Texto del aviso» de la spec). Actualizar la fecha de última actualización al publicarlo
- [ ] T034 Ejecutar `npm run verificar` y `npm run test:e2e`, incluidas las pruebas de las specs 001 y 002, y dejar todo en verde
- [ ] T035 Ensayar la migración `0001` sobre una copia del último respaldo de producción, restaurada en `C:\restauracion-prueba` como en la T094 de la spec 001, según la sección «Antes de publicar» de quickstart.md. Registrar el número de operaciones y pagos antes y después en specs/003-aviso-privacidad/checklists/aceptacion.md
- [ ] T036 Ejecutar en un celular real los pasos 1 a 19 y 21 de specs/003-aviso-privacidad/quickstart.md, incluido SC-006 cronometrado, y registrar los resultados en specs/003-aviso-privacidad/checklists/aceptacion.md
- [ ] T037 Hacer la prueba con 10 personas de SC-002 (quickstart, paso 20) y registrar fecha, personas, cuántas encontraron el responsable y el correo sin ayuda en menos de 1 minuto, y observaciones en specs/003-aviso-privacidad/checklists/aceptacion.md
- [ ] T038 Después de publicar en Easypanel (pulsar Implementar tras el push a `main`), repetir en producción los pasos 1 a 6 y 18 de quickstart.md y registrarlos en specs/003-aviso-privacidad/checklists/aceptacion.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: T001 ya está hecha; T002 empieza de inmediato
- **Foundational (Fase 2)**: depende de T002 y bloquea US2 y US3
- **US1 (Fase 3)**: depende solo de T002; puede hacerse antes de la Fase 2 o al mismo tiempo
- **US2 (Fase 4)** y **US3 (Fase 5)**: dependen de Foundational
- **Polish (Fase 6)**: depende de las tres historias. T033 depende de T009; T035 depende de T005; T038 depende de T033 a T037

### User Story Dependencies

- **US1 (P1)**: independiente de las otras dos historias y de la migración
- **US2 (P2)**: depende de Foundational. El enlace de la casilla apunta a la página de US1; sin US1 el enlace daría 404, así que US2 no se publica antes que US1
- **US3 (P3)**: depende de Foundational. Las pruebas de T024 registran operaciones con `avisoInformado: true`, así que necesitan T017 de US2

### Within Each User Story

- Las pruebas se escriben primero y deben fallar
- Mensajes y servicios antes que acciones; acciones antes que componentes; componentes antes que páginas
- Cada historia termina con su checkpoint antes de pasar a la siguiente

### Parallel Opportunities

- US1 completa en paralelo con la Fase 2: tocan archivos distintos
- US1: T007 y T008 juntas; T011 y T012 juntas después de T010
- US2: T014 y T015 juntas, antes de implementar
- US3: T024 y T025 juntas; T031 junto con T029 y T030
- US2 y US3 tocan los mismos archivos (src/servicios/operaciones.ts, src/acciones/operaciones.ts y la página del detalle), así que van en secuencia

---

## Parallel Example: User Story 1

```text
Task: "T007 Pruebas del módulo del aviso en tests/unit/aviso-privacidad.test.ts"
Task: "T008 Flujo en tests/e2e/us10-aviso-privacidad.spec.ts"
Task: "T003 Prueba de la migración en tests/integration/migracion-0001.test.ts (Fase 2, en paralelo con US1)"
```

## Parallel Example: User Story 3

```text
Task: "T024 Pruebas del borrado en tests/integration/borrado-datos.test.ts"
Task: "T025 Flujo en tests/e2e/us12-borrar-datos.spec.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Completar Setup
2. Completar US1
3. **Detenerse y validar** con los pasos 1 a 6 de quickstart.md
4. Se puede publicar sin migración, pero todavía no conviene capturar datos reales: falta la constancia (US2)

### Incremental Delivery

1. Aviso publicado: US1
2. Migración y constancia: Fase 2 y US2. Desde aquí ya se pueden capturar datos reales de clientes, con el texto del aviso aprobado (T033)
3. Borrado a petición del cliente: US3, que cumple el derecho de cancelación que promete el aviso

Lo recomendable es publicar US1 a US3 juntas: el aviso promete el borrado desde el primer día. Cada entrega deja `npm run verificar` en verde.

---

## Notes

- T034 a T037 son la condición de merge que pide la constitución
- T035 se hace antes de publicar, porque la migración reconstruye `operaciones`
- Easypanel no despliega solo después de un push: hay que pulsar Implementar
- Hacer commit después de cada tarea o grupo lógico, con el mensaje en español de México
