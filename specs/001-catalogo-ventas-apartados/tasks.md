---

description: "Lista de tareas para implementar VendeProductos v0"
---

# Tasks: VendeProductos v0: catálogo, ventas, apartados y encargos

**Input**: Design documents from `/specs/001-catalogo-ventas-apartados/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rutas.md, contracts/acciones.md, quickstart.md

**Tests**: se incluyen porque el Principio V de la constitución los exige. Cada prueba nombra en su título el FR, SC o escenario que cubre, por ejemplo `FR-030: rechaza un pago mayor al saldo`. Se escriben primero y deben fallar antes de implementar.

**Organization**: las tareas se agrupan por historia de usuario para implementarlas y probarlas de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1 a US7)

## Reglas para todas las tareas

- Todo texto visible va en español de México; los mensajes de error provienen de `src/lib/mensajes.ts`.
- Los importes se manejan como centavos enteros y se muestran solo con `formatearPrecio`; las fechas y horas, solo con `formatearFecha` y `formatearHora`.
- Ninguna acción borra filas: las bajas usan `activo = false`, `anulado_en` o un estado final.
- Toda acción de administrador llama primero a `exigirSesion()`.
- Las acciones devuelven `Resultado<T>` con los códigos de [contracts/acciones.md](contracts/acciones.md).
- Los servicios que afectan inventario o pagos corren en una transacción `BEGIN IMMEDIATE` y recalculan la disponibilidad o el saldo dentro de ella.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: inicialización del proyecto y herramientas

- [X] T001 Registrar la aprobación formal de la spec por su propietario: cambiar **Status** a Approved en specs/001-catalogo-ventas-apartados/spec.md y el estado a Aprobada en specs/MAPA.md. No continuar sin esa aprobación (Constitución, Flujo de desarrollo, paso 2)
- [X] T002 Crear el proyecto Next.js 16.4 con App Router, TypeScript y `src/` en la raíz, sin borrar `.specify/`, `.claude/` ni `specs/`, en package.json y tsconfig.json, con `output: 'standalone'` en next.config.ts. Fijar `next`, `react` y `drizzle-orm` a versiones exactas. Usar TypeScript 7.0 solo si `next build` y `drizzle-kit` funcionan con él; si no, fijar la última 5.x y anotarlo en specs/001-catalogo-ventas-apartados/research.md
- [X] T003 Instalar `drizzle-orm`, `drizzle-kit`, `better-sqlite3`, `sharp`, `@supabase/supabase-js`, `zod`, `jose`, `lucide-react`, `sonner`, `geist` y, como desarrollo, `vitest`, `@playwright/test`, `@axe-core/playwright` y `tsx` en package.json
- [X] T004 Definir en package.json los scripts `dev`, `build`, `lint`, `test`, `test:e2e`, `db:generar`, `db:migrar`, `db:semilla` y `verificar`, donde `verificar` ejecuta tipos, lint y Vitest, incluida la prueba de concurrencia, sin servicios externos
- [X] T005 [P] Configurar Tailwind CSS 4 y shadcn/ui con components.json y agregar `button`, `input`, `textarea`, `label`, `select`, `card`, `badge`, `sheet`, `dialog`, `table`, `tabs` y `skeleton` en src/components/ui/
- [X] T006 [P] Definir tokens de diseño en OKLCH, radios y tipografía Geist en src/app/globals.css, solo tema claro, con contraste WCAG AA y animaciones desactivadas bajo `prefers-reduced-motion`
- [X] T007 [P] Configurar Vitest con proyectos `unit` e `integration` en vitest.config.ts
- [X] T008 [P] Configurar Playwright con perfiles de móvil (390×844) y portátil (1366×768) en playwright.config.ts
- [X] T009 [P] Documentar `DATOS_DIR`, `ADMIN_USUARIO`, `ADMIN_HASH_CONTRASENA`, `SESION_SECRETO`, `IP_SAL`, `TELEFONO_NEGOCIO` y, solo para respaldos, `RESPALDO_SUPABASE_URL` y `RESPALDO_SUPABASE_LLAVE` en .env.example, y validarlas al arrancar en src/lib/entorno.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: base que necesitan todas las historias

**⚠️ CRITICAL**: ninguna historia puede empezar antes de terminar esta fase

### Pruebas de reglas puras

- [X] T010 [P] Escribir pruebas de dinero en tests/unit/dinero.test.ts: `parsearPrecio` acepta `1250`, `1,250.50` y `0.01`, rechaza cero, negativos y más de dos decimales; `formatearPrecio(125000)` da `$1,250.00 MXN` (FR-039, Principio II); `calcularTotal` multiplica precio por cantidad exacto al centavo (FR-020)
- [X] T011 [P] Escribir pruebas de fechas en tests/unit/fechas.test.ts: `31 de octubre de 2026` y `3:05 p. m., hora del centro de México` para `2026-10-31T21:05:00Z` (FR-039)
- [X] T012 [P] Escribir pruebas en tests/unit/normalizacion.test.ts: nombres sin mayúsculas, acentos ni espacios sobrantes (FR-037); teléfonos reducidos a dígitos y validados a 10 (FR-040)
- [X] T013 [P] Escribir pruebas de estados en tests/unit/estados.test.ts con las transiciones de data-model.md, incluidas las inválidas

### Implementación

- [X] T014 [P] Implementar `parsearPrecio`, `formatearPrecio` y `calcularTotal` con aritmética entera, sin `parseFloat` ni `Number` sobre decimales, en src/dominio/dinero.ts
- [X] T015 [P] Implementar `formatearFecha` y `formatearHora` con zona `America/Mexico_City` en src/dominio/fechas.ts
- [X] T016 [P] Implementar `normalizarNombre` y `normalizarTelefono` en src/dominio/normalizacion.ts
- [X] T017 [P] Implementar transiciones de venta, apartado y encargo y `calcularEstado(total, pagado)` en src/dominio/estados.ts
- [X] T018 [P] Definir `Resultado<T>`, `CodigoError` y mensajes en es-MX en src/lib/resultado.ts y src/lib/mensajes.ts
- [X] T019 Definir el esquema Drizzle de data-model.md en src/db/esquema.ts: tablas `categorias`, `subcategorias`, `productos`, `articulos_encargo`, `fotos`, `operaciones`, `pagos` y `limite_intentos`; importes `integer` con `> 0`; `existencia >= 0`; `cantidad > 0`; `cliente_telefono` de 10 dígitos con CHECK; exactamente uno entre `producto_id` y `articulo_encargo_id` en `fotos` y `operaciones`; `nombre_norm` único entre activos; índices en `cliente_telefono`, `cliente_nombre_norm`, `(tipo, estado)` y `pagos.fecha`
- [X] T020 Crear la conexión `better-sqlite3` única en src/db/cliente.ts, con WAL, `foreign_keys = ON` y `busy_timeout = 5000`, el ayudante `conTransaccion` con `BEGIN IMMEDIATE`, y generar la migración inicial en src/db/migraciones/
- [X] T021 Crear la semilla idempotente de FR-005 en src/db/semilla.ts: Juguetes (Niñas, Niños, Bebés), Ropa (Adulto mujer, Adulto hombre, Niño, Niña) y Otros artículos sin subcategorías, sin guardar "Todos"
- [X] T022 Crear el arnés de pruebas con un archivo SQLite temporal por prueba, migraciones y datos de fábrica en tests/integration/arnes.ts
- [X] T023 [P] Escribir pruebas en tests/integration/sesion.test.ts: inicio correcto, contraseña incorrecta, 5 fallos en 15 minutos activan `DEMASIADOS_INTENTOS` (FR-044) y una acción sin sesión da `NO_AUTORIZADO` (FR-001)
- [X] T024 Implementar `verificarContrasena` con `scrypt`, cookie firmada con `jose` (`HttpOnly`, `Secure`, `SameSite=Lax`, 30 días) y `exigirSesion()` en src/lib/sesion.ts, y un generador de hash en scripts/generar-hash.ts
- [X] T025 Implementar el límite de intentos por hash de IP de FR-044, 5 fallos de inicio de sesión o 10 consultas en una ventana de 15 minutos, en src/lib/limite-intentos.ts, tomando la IP real del encabezado del proxy de Easypanel
- [X] T026 Implementar `iniciarSesion` y `cerrarSesion` en src/acciones/sesion.ts
- [X] T027 Proteger `/admin` salvo `/admin/entrar` en src/proxy.ts y crear la pantalla en src/app/admin/entrar/page.tsx
- [X] T028 [P] Crear el layout público con encabezado, navegación inferior móvil y pie con teléfono en src/app/(cliente)/layout.tsx y src/components/cliente/navegacion.tsx
- [X] T029 [P] Crear el layout de administración, adaptable a móvil y portátil, en src/app/admin/(panel)/layout.tsx y src/components/admin/navegacion.tsx
- [X] T030 [P] Implementar en src/app/api/fotos/route.ts la subida con sesión requerida, JPEG, PNG y WebP de hasta 10 MB (FR-045), verificando el contenido real con `sharp`; en src/app/api/fotos/[archivo]/route.ts la lectura pública, sin permitir rutas fuera de `DATOS_DIR/fotos`; y el acceso a disco en src/lib/fotos.ts
- [X] T031 [P] Crear el selector de fotos con vista previa, reducción de tamaño en el navegador antes de subir, mensaje de archivo rechazado (FR-045) y quitar en src/components/admin/selector-fotos.tsx

**Checkpoint**: base lista; inicio de sesión funcionando y `npm run verificar` en verde

---

## Phase 3: User Story 1 - Administrar el catálogo de productos (Priority: P1) 🎯 MVP

**Goal**: el vendedor registra, edita, filtra y da de baja productos y categorías.

**Independent Test**: entrar como administrador, registrar un producto en una subcategoría nueva, editar su precio y confirmar que aparece con los datos correctos.

### Tests for User Story 1

- [X] T032 [P] [US1] Escribir pruebas en tests/integration/categorias.test.ts: FR-006; FR-007; nombre repetido sin importar mayúsculas ni acentos reutiliza el existente; "Todos" se rechaza; baja con productos activos da `TIENE_DEPENDENCIAS`
- [X] T033 [P] [US1] Escribir pruebas en tests/integration/productos.test.ts: FR-008, FR-009, FR-016 (sin foto da `FOTO_REQUERIDA`; no se quita la última), subcategoría de otra categoría se rechaza, baja con apartados o encargos vigentes da `TIENE_DEPENDENCIAS`, existencia menor a apartados da `EXISTENCIA_INSUFICIENTE`, FR-038
- [X] T034 [P] [US1] Escribir el flujo en tests/e2e/us1-catalogo-admin.spec.ts con los escenarios 1 a 6 de la User Story 1, incluido el acceso denegado sin sesión

### Implementation for User Story 1

- [X] T035 [US1] Implementar crear, renombrar, dar de baja y resolver-o-crear en src/servicios/categorias.ts. La baja de una categoría sin productos activos da de baja también sus subcategorías
- [X] T036 [US1] Implementar alta, edición, baja y fotos con baja lógica en src/servicios/productos.ts
- [X] T037 [US1] Implementar `listarProductosAdmin` con disponibilidad y filtros en src/consultas/admin.ts
- [X] T038 [US1] Implementar `guardarProducto` y `darDeBajaProducto` en src/acciones/productos.ts, y las acciones de categorías en src/acciones/categorias.ts
- [X] T039 [P] [US1] Crear la lista con filtros por categoría, subcategoría y "Todos" en src/app/admin/(panel)/page.tsx y src/components/filtro-categorias.tsx, mostrando precio de compra y de venta
- [X] T040 [US1] Crear el formulario con categoría existente o nueva en src/components/admin/formulario-producto.tsx, usado en src/app/admin/(panel)/productos/nuevo/page.tsx y src/app/admin/(panel)/productos/[id]/page.tsx
- [X] T041 [P] [US1] Crear la gestión de categorías en src/app/admin/(panel)/categorias/page.tsx

**Checkpoint**: la User Story 1 funciona y se puede demostrar sola

---

## Phase 4: User Story 2 - Consultar el catálogo como cliente (Priority: P1) 🎯 MVP

**Goal**: el cliente ve productos, filtra y encuentra precio, disponibilidad, leyenda y contacto.

**Independent Test**: con productos registrados, abrir el catálogo sin sesión en un móvil y comprobar los datos y los filtros.

### Tests for User Story 2

- [X] T042 [P] [US2] Escribir pruebas en tests/integration/consultas-publicas.test.ts: el resultado de cada consulta no contiene `precio_compra_centavos` (FR-003, SC-008), oculta productos dados de baja y calcula `disponible` con FR-011
- [X] T043 [P] [US2] Escribir el flujo en tests/e2e/us2-catalogo-cliente.spec.ts con los escenarios 1 a 6 de la User Story 2, filtro sin resultados, y una revisión con axe de cada pantalla pública. Debe comprobar que el HTML no incluye el precio de compra capturado en la prueba

### Implementation for User Story 2

- [X] T044 [US2] Implementar `listarCatalogo`, `obtenerProducto` y `listarArticulosEncargo` seleccionando columnas de forma explícita, con el contrato de datos de contracts/rutas.md, en src/consultas/publicas.ts
- [X] T045 [P] [US2] Crear la tarjeta con foto, precio, disponibilidad y marca "Agotado, disponible por encargo" en src/components/cliente/tarjeta-producto.tsx, con texto alternativo basado en el nombre
- [X] T046 [P] [US2] Crear la leyenda exacta "Favor de revisar el producto antes de comprarlo, ya que no hay devoluciones." y el contacto en src/components/cliente/leyenda-producto.tsx
- [X] T047 [US2] Crear el catálogo con filtros por URL, render dinámico y mensaje de sin resultados en src/app/(cliente)/page.tsx
- [X] T048 [US2] Crear el detalle en src/app/(cliente)/producto/[id]/page.tsx
- [X] T049 [P] [US2] Crear artículos por encargo, separados del catálogo, con fotos si tienen, precio, leyenda y teléfono de contacto, y sin cantidad disponible (FR-025), en src/app/(cliente)/encargos/page.tsx

**Checkpoint**: las User Stories 1 y 2 forman el MVP publicable

---

## Phase 4.1: Publicación del MVP

**Purpose**: poner el catálogo en internet. Los ID siguen la numeración final para no alterar las referencias existentes, pero estas tareas se ejecutan aquí. Requieren cuentas y pagos del propietario.

- [X] T089 Revisar con el propietario en Easypanel qué servicios aloja ya el VPS y cuánta memoria y disco quedan, sin modificar nada; acordar el dominio; crear un repositorio privado para el código; y confirmar límites y condiciones comerciales de Supabase para el bucket privado `respaldos`. Anotar lo confirmado en specs/001-catalogo-ventas-apartados/research.md
- [X] T090 Crear Dockerfile con Node.js 24 y compilación `standalone`, y scripts/iniciar.ts, que aplica migraciones y semilla antes de arrancar. Generar el hash con scripts/generar-hash.ts
- [X] T091 Crear en Easypanel el servicio desde el repositorio privado, con una sola réplica, volumen persistente en `/datos`, dominio con HTTPS y las variables de .env.example, incluido el `TELEFONO_NEGOCIO` real, sin afectar otros servicios ni cargar datos de prueba. Comprobar que los datos sobreviven a un redespliegue
- [ ] T092 Validar en un móvil real, en la dirección pública, los pasos 1 y 2 de specs/001-catalogo-ventas-apartados/quickstart.md, y medir con Lighthouse en perfil móvil, con al menos 30 productos con foto, que la primera vista cargue en menos de 2.5 segundos; anotar el resultado en specs/001-catalogo-ventas-apartados/checklists/aceptacion.md
- [X] T093 Crear scripts/respaldar.ts, que genera la copia con `VACUUM INTO`, la comprime y la sube junto con las fotos nuevas al bucket privado `respaldos`, conserva 14 días y registra cualquier fallo; programarlo a diario. Debe funcionar antes de registrar ventas reales
- [ ] T094 Escribir en README.md el procedimiento de restauración y probarlo en una instancia limpia, comparando productos, operaciones, saldos y fotos contra la original

**Checkpoint**: el negocio ya muestra su catálogo en línea

---

## Phase 5: User Story 3 - Registrar una venta con precio negociado (Priority: P2)

**Goal**: el vendedor registra la venta, ajusta el precio, entrega y puede anular un error.

**Independent Test**: vender una unidad a un precio distinto y comprobar que baja la disponibilidad y que el precio de catálogo no cambia.

### Tests for User Story 3

- [X] T050 [P] [US3] Escribir pruebas en tests/integration/ventas.test.ts: FR-018 (cantidad de una o más unidades), FR-019, FR-021 (comprador opcional, pago automático por el total), FR-023, cantidad mayor a la disponible da `SIN_DISPONIBILIDAD`, FR-032, FR-042 (entregada o no, las unidades regresan, motivo obligatorio)
- [X] T051 [P] [US3] Escribir la prueba de última unidad concurrente en tests/concurrency/ultima-unidad.test.ts con dos procesos sobre el mismo archivo SQLite: de dos registros simultáneos, solo uno se completa
- [X] T052 [P] [US3] Escribir el flujo en tests/e2e/us3-venta.spec.ts con los escenarios 1 a 6 de la User Story 3

### Implementation for User Story 3

- [X] T053 [US3] Implementar `registrarVenta`, `marcarEntregada` y `anularVenta` con bloqueo del producto en src/servicios/operaciones.ts; anular no modifica el pago automático (FR-042)
- [X] T054 [US3] Implementar las acciones en src/acciones/operaciones.ts
- [X] T055 [US3] Crear la hoja de venta con precio propuesto editable y comprador opcional en src/components/admin/hoja-venta.tsx, y mostrar venta y apartado solo con disponibilidad en src/app/admin/(panel)/page.tsx (FR-017)
- [X] T056 [US3] Crear el detalle con entrega y anulación en src/app/admin/(panel)/operaciones/[id]/page.tsx

**Checkpoint**: las ventas funcionan y la disponibilidad se actualiza en ambas secciones

---

## Phase 6: User Story 4 - Apartar un producto y registrar sus pagos (Priority: P2)

**Goal**: el vendedor aparta unidades, registra pagos hasta cubrir el total y entrega.

**Independent Test**: registrar un apartado, ver bajar la disponibilidad, pagar el total y confirmar Pagado y luego Entregado.

### Tests for User Story 4

- [X] T057 [P] [US4] Escribir pruebas en tests/integration/apartados.test.ts: FR-022, FR-011, FR-033, FR-027 (Pendiente y Pagado se cancelan; las unidades regresan; los pagos se conservan), pago inicial que cubre el total nace Pagado, entrega con saldo da `SALDO_PENDIENTE`
- [X] T058 [P] [US4] Escribir pruebas en tests/integration/pagos.test.ts: FR-028, FR-030, FR-031, FR-034 (anular recalcula saldo y estado; rechazado en operación entregada o cancelada; el pago de una venta no se anula por separado), FR-043 (total menor a lo pagado da `PRECIO_MENOR_A_PAGADO`; subir el precio regresa de Pagado a Pendiente; total igual a lo pagado pasa a Pagado), y SC-005 con 20 operaciones con pagos parciales
- [X] T059 [P] [US4] Escribir el flujo en tests/e2e/us4-apartado.spec.ts con los escenarios 1 a 9 de la User Story 4

### Implementation for User Story 4

- [X] T060 [US4] Implementar `registrarApartado`, `cancelarOperacion` y `corregirOperacion` en src/servicios/operaciones.ts
- [X] T061 [US4] Implementar `registrarPago` y `anularPago` con bloqueo de la operación en src/servicios/pagos.ts
- [X] T062 [US4] Agregar las acciones de apartado, pago, cancelación y corrección en src/acciones/operaciones.ts
- [X] T063 [P] [US4] Crear la hoja de apartado con nombre, teléfono, precio y pago inicial en src/components/admin/hoja-apartado.tsx
- [X] T064 [US4] Agregar el desglose de pagos, saldo, registrar y anular pagos, cancelar y corregir en src/app/admin/(panel)/operaciones/[id]/page.tsx y src/components/admin/desglose-pagos.tsx

**Checkpoint**: apartados y pagos cuadran al centavo

---

## Phase 7: User Story 5 - Tomar encargos y revisarlos antes de surtirse (Priority: P3)

**Goal**: el vendedor toma encargos con anticipo y revisa los pendientes.

**Independent Test**: agotar un producto, registrar un encargo con anticipo y verificar que aparece en pendientes con su saldo.

### Tests for User Story 5

- [X] T065 [P] [US5] Escribir pruebas en tests/integration/encargos.test.ts: FR-017 (con disponibilidad da `HAY_DISPONIBILIDAD`), FR-022, FR-024, FR-025, FR-026 (excluye entregados y cancelados), artículo nuevo creado al registrar el encargo, encargo permitido después de agotar el producto con otra operación
- [X] T066 [P] [US5] Escribir el flujo en tests/e2e/us5-encargo.spec.ts con los escenarios 1 a 7 de la User Story 5

### Implementation for User Story 5

- [X] T067 [US5] Implementar `registrarEncargo` para producto agotado o artículo existente o nuevo, sin tocar inventario, en src/servicios/operaciones.ts
- [X] T068 [P] [US5] Implementar alta, edición y baja de artículos con nombre, descripción, precio y fotos opcionales, rechazando la baja con encargos vigentes (`TIENE_DEPENDENCIAS`), en src/servicios/articulos-encargo.ts y src/acciones/articulos-encargo.ts
- [X] T069 [US5] Implementar `listarEncargosPendientes` en src/consultas/admin.ts
- [X] T070 [P] [US5] Crear la gestión de artículos, con selector de fotos opcional, en src/app/admin/(panel)/articulos-encargo/page.tsx
- [X] T071 [US5] Crear la hoja de encargo en src/components/admin/hoja-encargo.tsx y mostrarla solo sin disponibilidad en src/app/admin/(panel)/page.tsx
- [X] T072 [US5] Crear la lista de pendientes en src/app/admin/(panel)/encargos/page.tsx

**Checkpoint**: el ciclo completo de encargos funciona

---

## Phase 8: User Story 6 - El cliente consulta sus apartados y encargos (Priority: P3)

**Goal**: el cliente ve sus saldos con nombre y teléfono, sin iniciar sesión.

**Independent Test**: con un apartado de dos pagos, consultar con los datos del cliente y comparar el desglose.

### Tests for User Story 6

- [X] T073 [P] [US6] Escribir pruebas en tests/integration/consulta-cliente.test.ts: FR-035, FR-037, mismo mensaje si falla cualquiera de los datos, sin datos de otros clientes ni precio de compra, sin ventas, canceladas visibles sin saldo por cubrir, pagos anulados ocultos, 11 consultas en 15 minutos dan `DEMASIADOS_INTENTOS`
- [X] T074 [P] [US6] Escribir el flujo en tests/e2e/us6-consulta.spec.ts con los escenarios 1 a 3 de la User Story 6

### Implementation for User Story 6

- [X] T075 [US6] Implementar `consultarOperacionesCliente`, solo apartados y encargos, con pagos vigentes, en src/consultas/publicas.ts
- [X] T076 [US6] Implementar `consultarMisApartados` con límite de intentos en src/acciones/consulta-cliente.ts
- [X] T077 [US6] Crear la consulta y sus resultados en src/app/(cliente)/mis-apartados/page.tsx

**Checkpoint**: el cliente consulta su saldo sin ayuda

---

## Phase 9: User Story 7 - Buscar ventas, apartados y encargos (Priority: P3)

**Goal**: el administrador localiza operaciones por fecha de pago, nombre o teléfono.

**Independent Test**: registrar operaciones de dos clientes en fechas distintas y buscar por cada criterio.

### Tests for User Story 7

- [X] T078 [P] [US7] Escribir pruebas en tests/integration/busqueda.test.ts: FR-036 solos y combinados, FR-037, rango interpretado en hora del centro de México, venta sin comprador encontrada por fecha, venta anulada encontrada por fecha (FR-042), operaciones anuladas y canceladas visibles, y una persona con varias operaciones
- [X] T079 [P] [US7] Escribir el flujo en tests/e2e/us7-busqueda.spec.ts con los escenarios 1 a 4 de la User Story 7

### Implementation for User Story 7

- [X] T080 [US7] Implementar `buscarOperaciones` por fechas de pagos vigentes, nombre parcial y teléfono en src/consultas/admin.ts
- [X] T081 [US7] Crear la búsqueda con filtros por URL y resultados en src/app/admin/(panel)/operaciones/page.tsx

**Checkpoint**: todas las historias funcionan de forma independiente

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: calidad que afecta a varias historias

- [X] T082 [P] Agregar estados vacíos, de carga y de error en es-MX en src/app/(cliente)/ y src/app/admin/(panel)/ con `loading.tsx`, `error.tsx` y `not-found.tsx`
- [X] T083 [P] Agregar una prueba con axe de todas las pantallas de administración y etiquetas de formularios en tests/e2e/accesibilidad-admin.spec.ts (Principio VII)
- [X] T084 [P] Agregar una prueba que recorra las pantallas públicas y compruebe formatos de precio, fecha y hora en tests/e2e/formatos.spec.ts (FR-039)
- [ ] T085 Ajustar `next/image` con tamaños adaptados en src/app/(cliente)/page.tsx y repetir en producción la medición de T092 tras entregar todas las historias
- [X] T086 [P] Escribir la guía de operación en español, con variables, cambio de contraseña y puesta en marcha, en README.md
- [X] T087 Ejecutar `npm run verificar` y `npm run test:e2e`, y dejar todo en verde
- [ ] T088 Ejecutar la comprobación manual de specs/001-catalogo-ventas-apartados/quickstart.md en un móvil real y registrar resultados, incluidas las acciones del vendedor cronometradas en menos de 1 segundo y la prueba con personas de SC-009, en specs/001-catalogo-ventas-apartados/checklists/aceptacion.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: empieza de inmediato, con T001 como condición para todo lo demás
- **Foundational (Fase 2)**: depende de Setup y bloquea todas las historias
- **Historias (Fases 3 a 9)**: dependen de Foundational
- **Publicación del MVP (Fase 4.1)**: depende de US1 y US2; T093 y T094 deben estar terminadas antes de usar US3 o posteriores en producción
- **Polish (Fase 10)**: depende de las historias que se vayan a entregar

### User Story Dependencies

- **US1 (P1)**: solo depende de Foundational
- **US2 (P1)**: necesita datos; sus pruebas los crean con el arnés, por lo que puede avanzar junto a US1
- **US3 (P2)**: depende de US1 para operar sobre productos
- **US4 (P2)**: depende de US1 y de la pantalla de detalle de US3 (T056)
- **US5 (P3)**: depende de US1 y de los pagos de US4 (T061)
- **US6 (P3)**: depende de US4 para que existan pagos; sus pruebas pueden usar datos del arnés
- **US7 (P3)**: depende de US3 y US4; incluye encargos cuando US5 esté terminada

### Within Each User Story

- Las pruebas se escriben primero y deben fallar
- Consultas y servicios antes que acciones; acciones antes que pantallas
- Cada historia termina con su checkpoint antes de pasar a la siguiente

### Parallel Opportunities

- Fase 1: T005 a T009
- Fase 2: T010 a T013, T014 a T018 y T028 a T031
- Pruebas de cada historia, marcadas con [P]
- US1 y US2 en paralelo después de Foundational
- Varias tareas tocan el mismo archivo en distintas historias (`src/servicios/operaciones.ts`, `src/acciones/operaciones.ts`, `src/consultas/admin.ts`, `src/app/admin/(panel)/page.tsx`), así que US3, US4 y US5 van en secuencia

---

## Parallel Example: User Story 1

```text
Task: "T032 Pruebas de categorías en tests/integration/categorias.test.ts"
Task: "T033 Pruebas de productos en tests/integration/productos.test.ts"
Task: "T034 Flujo en tests/e2e/us1-catalogo-admin.spec.ts"
```

---

## Implementation Strategy

### MVP First (US1 y US2)

1. Completar Setup y Foundational
2. Completar US1 y US2
3. **Detenerse y validar** con los pasos 1 y 2 de quickstart.md
4. Publicar con la Fase 4.1: el negocio ya puede mostrar su catálogo sin cargar los productos

### Incremental Delivery

1. Ventas: US3
2. Apartados y pagos: US4
3. Encargos: US5
4. Consulta del cliente: US6
5. Búsquedas: US7

Cada entrega agrega valor sin romper la anterior, y `npm run verificar` debe seguir en verde.

---

## Notes

- Antes de capturar datos de clientes en producción (US3 en adelante) deben resolverse el aviso de privacidad y los respaldos señalados en research.md; no hay tarea porque la spec no los incluye (Principio IV)
- T087 y T088 son la condición de merge que pide la constitución
- Hacer commit después de cada tarea o grupo lógico
