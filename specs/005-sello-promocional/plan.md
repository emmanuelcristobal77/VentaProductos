# Implementation Plan: Sello promocional

**Branch**: `005-sello-promocional` | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-sello-promocional/spec.md`

## Summary

La spec agrega una franja promocional de solo texto que el vendedor configura en el panel:

- **Datos**: la migración `0003` crea la tabla `sello_promocional`, de una sola fila (`id = 1`), con texto, color, si está activo y la fecha del último guardado. No inserta nada ni toca otras tablas; sin fila, el sello está desactivado, sin texto y en Rojo ([data-model.md](data-model.md)).
- **Reglas** en `src/dominio/promocion.ts`: los 4 colores con su fondo y texto probados, la normalización del texto y el conteo de 40 caracteres visibles con `Intl.Segmenter`. El formulario y el servidor usan las mismas ([research 2 y 3](research.md)).
- **Panel**: página `/admin/promocion` con el campo de texto y su contador, los radios de color, la casilla «Mostrar el sello en la página», la vista previa y «Guardar». La acción `guardarPromocion` exige sesión, valida, hace el *upsert* y revalida el layout. El enlace va en la navegación superior en portátil y en el encabezado en celular, porque la barra inferior ya no tiene espacio ([research 7](research.md#7-el-enlace-promoción-en-la-navegación-del-panel)).
- **Sección de cliente**: `src/app/(cliente)/layout.tsx` lee el sello en cada petición y, si está activo, dibuja la franja debajo del encabezado en todas las páginas, sin quedar fija, sin enlace y sin forma de cerrarla ([research 5](research.md#5-dónde-aparece-la-franja-y-cómo-se-actualiza)).
- **Precios**: no se toca ningún cálculo de precios ni de operaciones (FR-013).

## Technical Context

**Language/Version**: TypeScript 5.9 sobre Node.js 24, igual que las specs anteriores

**Primary Dependencies**: las de la spec 004 (Next.js 16.4, React 19.3, Tailwind CSS 4.3, shadcn/ui, Drizzle ORM 0.45, `better-sqlite3` 13, Zod 4). Sin dependencias nuevas. El icono `Megaphone` viene de `lucide-react`, que ya está instalado

**Storage**: SQLite existente. Migración `0003`: `CREATE TABLE sello_promocional`, generada con `drizzle-kit` ([data-model.md](data-model.md))

**Testing**: Vitest 5 para las reglas y el servicio contra SQLite temporal, y Playwright 1.64 con axe en móvil (390 px) y portátil (1,366 px) ([research 8](research.md#8-pruebas))

**Target Platform**: navegadores móviles y de portátil actuales; mismo servicio de Easypanel

**Project Type**: aplicación web de un solo proyecto

**Performance Goals**: leer el sello es una consulta por llave primaria en cada página de cliente. No debe mover el LCP de producción aceptado en la spec 002 (1.04 s)

**Constraints**:
- Texto de hasta 40 caracteres visibles, de una sola línea (FR-004).
- Contraste de al menos 4.5 : 1 en los 4 colores (FR-014).
- Sin cambios en precios ni operaciones (FR-013).
- Todo en es-MX.
- Entrega antes del Buen Fin de 2026.

**Scale/Scope**: una tabla de una fila, una página de panel, una acción, un componente de franja usado en dos lugares, y cambios menores en dos layouts y en la navegación del panel

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Inicial | Post-diseño |
|---|---|---|---|
| I. Spec First | Spec 005 aprobada el 2026-11-11 y registrada en `specs/MAPA.md` con un propietario. Las specs 001 a 004 no se modifican | PASS | PASS |
| II. Números | No hay importes nuevos. Ningún precio se calcula ni se muestra distinto; una prueba lo comprueba (FR-013). La fecha `actualizado_en` no se muestra en pantalla | PASS | PASS |
| III. Idioma y mercado | Etiquetas, mensajes, contador y nombres de los colores en es-MX, con singular y plural correctos ([contracts/interfaz.md](contracts/interfaz.md)) | PASS | PASS |
| IV. Cero alcance fantasma | Sin imágenes, sin historial, sin fechas programadas, sin modo oscuro nuevo, sin enlace en la franja y sin forma de cerrarla. El cambio de lugar del enlace en el celular es solo de diseño y se justifica en [research 7](research.md#7-el-enlace-promoción-en-la-navegación-del-panel) | PASS | PASS |
| V. Tests con la spec | Pruebas unitarias, de integración y e2e nombradas por FR, SC o escenario. Las pruebas de las specs anteriores no cambian; las que dependen del subtítulo «Administración» se revisan en móvil | PASS | PASS |
| VI. Verificable sin técnica | [quickstart.md](quickstart.md) comprueba cada criterio desde la app, incluido el modo oscuro en un celular real | PASS | PASS |
| VII. Interfaz accesible | Campo, radios y casilla nativos con etiqueta; contador y mensajes en `aria-live`; la franja es texto normal, sin `role="alert"`; contraste probado en prueba unitaria y con axe; sin desplazamiento horizontal a 390 px | PASS | PASS |

## Project Structure

### Documentation (this feature)

```text
specs/005-sello-promocional/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── interfaz.md          # Franja, página /admin/promocion, navegación y acción
├── checklists/
│   ├── requirements.md
│   └── aceptacion.md        # Resultados de pruebas, ensayo, LCP y quickstart (T021)
└── tasks.md                 # Lo genera /speckit-tasks
```

### Source Code (repository root)

Solo se listan los archivos nuevos o que cambian.

```text
src/
├── app/
│   ├── (cliente)/layout.tsx                  # Lee el sello y dibuja la franja bajo el encabezado
│   └── admin/(panel)/
│       ├── layout.tsx                        # Botón «Promoción» en celular; subtítulo desde sm
│       └── promocion/page.tsx                # Página «Promoción»
├── acciones/promocion.ts                     # guardarPromocion
├── components/
│   ├── sello-promocional.tsx                 # La franja; la usan el layout y la vista previa
│   └── admin/
│       ├── formulario-promocion.tsx          # Texto, contador, colores, casilla, vista previa
│       └── navegacion.tsx                    # Sexto enlace en la navegación superior
├── db/
│   ├── esquema.ts                            # selloPromocional
│   └── migraciones/0003_*.sql                # CREATE TABLE, generada
├── dominio/promocion.ts                      # COLORES, normalizarTexto, contarCaracteres, validar
└── servicios/promocion.ts                    # obtenerSello, guardarSello

tests/
├── unit/promocion.test.ts                    # FR-003–FR-005, FR-014 (contraste)
├── integration/
│   ├── promocion.test.ts                     # FR-002, FR-003, FR-007, FR-013, «Primera vez»
│   └── migracion-0003.test.ts                # Crea la tabla sin tocar las demás
└── e2e/
    ├── us16-sello-promocional.spec.ts        # Historia 1, con axe y los 4 colores
    └── us17-cambiar-sello.spec.ts            # Historia 2: cambio, contador, vista previa
```

**Structure Decision**: se mantiene el proyecto único de la spec 001.

- **Reglas puras** en `src/dominio/promocion.ts`, sin base ni disco, para que el formulario y la acción usen las mismas.
- **Servicio** en `src/servicios/promocion.ts`, con la conexión de `obtenerBd()`, igual que categorías.
- **Acción** en `src/acciones/promocion.ts`, con `exigirSesion()`, `ejecutar()` y `Resultado`.
- **Componente compartido** `sello-promocional.tsx`, que sirve igual en el servidor y en el cliente. Así la vista previa es idéntica a la franja.
- **Numeración e2e**: `us16` y `us17` siguen a `us15` de la spec 004.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El Buen Fin empieza en días | La función es chica y no tiene dependencias nuevas. El propietario decidió el 2026-11-11 publicar las historias 1 y 2 juntas, para que la spec salga completa |
| Los enlaces del panel se enciman en el celular | El enlace va en el encabezado en celular y la barra inferior no cambia. La prueba e2e a 390 px comprueba que no se enciman ([research 7](research.md#7-el-enlace-promoción-en-la-navegación-del-panel)) |
| La navegación superior no cabe entre 768 y 1,024 px | Paso 18 del quickstart. Si se enciman, se muestran solo iconos en ese rango |
| Un navegador recolorea la página en su modo oscuro forzado | Los 4 pares tienen contraste alto; paso 9 del quickstart en un celular real ([research 4](research.md#4-modo-claro-y-modo-oscuro)) |
| Las pruebas e2e anteriores buscan el subtítulo «Administración» en móvil | Revisarlas al implementar. `entrar()` busca el encabezado «Productos», no el subtítulo |
| Una migración nueva en producción | Solo crea una tabla. Antes de publicar se ensaya con el respaldo del día, como la `0002` |

## Complexity Tracking

Sin violaciones de la constitución que justificar.
