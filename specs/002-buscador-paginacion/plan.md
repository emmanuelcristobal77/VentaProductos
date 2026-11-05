# Implementation Plan: Buscador de productos y paginación

**Branch**: `002-buscador-paginacion` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-buscador-paginacion/spec.md`

## Summary

Se agrega un buscador por nombre y descripción, que filtra mientras se escribe, y un botón «Ver más» al catálogo de cliente (`/`) y a la lista de productos del panel (`/admin`).

- **Primera parte**: el servidor la sigue dibujando, con 20 productos en el catálogo y 50 en el panel.
- **Búsquedas y partes siguientes**: se piden a dos rutas `GET` que reutilizan las consultas existentes, con paginación por cursor para no repetir ni saltar productos.
- **Comparación**: sin mayúsculas ni acentos, con una función `normalizar` registrada en SQLite que aplica la misma regla de la spec 001. No hay cambios al esquema.
- **Regreso con atrás**: el estado de cada lista vive en memoria del navegador, así que se conserva al regresar con atrás y se pierde al recargar.

El detalle de las decisiones está en [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 24, igual que la spec 001

**Primary Dependencies**: las de la spec 001 (Next.js 16.4, React 19.3, Tailwind CSS 4.3, shadcn/ui, Drizzle ORM 0.45, `better-sqlite3` 13, Zod 4). No se agregan dependencias

**Storage**: SQLite existente; sin migraciones. Se registra una función de SQLite en cada conexión (research 1)

**Testing**: Vitest 5 para reglas y consultas contra SQLite temporal; Playwright 1.64 con axe para flujos, regreso con atrás y accesibilidad

**Target Platform**: navegadores móviles y de portátil actuales; mismo servicio de Easypanel

**Project Type**: aplicación web de un solo proyecto

**Performance Goals**: LCP de la primera vista del catálogo ≤ 1 s con 500 productos, medido con Lighthouse en el perfil Fast 4G de la spec 001 (SC-002). Resultados ≤ 1 s después de dejar de escribir, con 250 ms de espera y una consulta de milisegundos (SC-003)

**Constraints**: el precio de compra nunca sale por las rutas públicas; la búsqueda no va en la URL ni sobrevive a la recarga; todo en es-MX

**Scale/Scope**: hoy menos de 100 productos; meta de 500. Dos listas, dos rutas `GET` nuevas y ninguna tabla nueva

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Inicial | Post-diseño |
|---|---|---|---|
| I. Spec First | Spec 002 registrada en `specs/MAPA.md` con un propietario. La spec 001 no se modifica. **La 002 debe aprobarse antes de implementar** | PASS (condicionado a la aprobación) | PASS (condicionado a la aprobación) |
| II. Números | Sin cálculos nuevos de importes; los precios se muestran con los formateadores existentes | PASS | PASS |
| III. Idioma y mercado | Textos nuevos en es-MX (research 9) | PASS | PASS |
| IV. Cero alcance fantasma | Solo lo escrito en la spec. Sin sugerencias, sin analítica y sin `cacheComponents` (research 6) | PASS | PASS |
| V. Tests con la spec | Pruebas nombradas por FR, SC o escenario. Las pruebas de la spec 001 que llaman a las consultas cambiadas solo se ajustan a la nueva forma de respuesta (`.productos`); sus aserciones no cambian | PASS | PASS |
| VI. Verificable sin técnica | [quickstart.md](quickstart.md) comprueba cada criterio usando la app; la medición técnica de SC-002 queda en el plan | PASS | PASS |
| VII. Interfaz accesible | Campo con etiqueta, región `aria-live`, botón real, axe en móvil y portátil | PASS | PASS |

## Project Structure

### Documentation (this feature)

```text
specs/002-buscador-paginacion/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── rutas.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Lo genera /speckit-tasks
```

### Source Code (repository root)

Solo se listan los archivos nuevos o que cambian.

```text
src/
├── app/
│   ├── (cliente)/page.tsx                  # Primera parte de 20 + lista buscable
│   ├── admin/(panel)/page.tsx              # Primera parte de 50 + lista buscable
│   └── api/
│       ├── catalogo/route.ts               # GET público (contrato)
│       └── admin/productos/route.ts        # GET con exigirSesion()
├── components/
│   ├── buscador-productos.tsx              # Campo de búsqueda y región aria-live
│   ├── boton-ver-mas.tsx                   # Botón, estado de carga y error
│   ├── cliente/catalogo-buscable.tsx       # Lista del catálogo y mensaje sin resultados
│   └── admin/
│       ├── lista-productos-admin.tsx       # Lista del panel
│       └── tarjeta-producto-admin.tsx      # Sale de admin/(panel)/page.tsx
├── consultas/
│   ├── busqueda.ts                         # Palabras, grupo, cursor y orden compartidos
│   ├── publicas.ts                         # listarCatalogo paginado
│   └── admin.ts                            # listarProductosAdmin paginado
├── db/cliente.ts                           # Registra normalizar() en abrirBase
├── dominio/normalizacion.ts                # palabrasDeBusqueda()
└── lib/
    ├── estado-listas.ts                    # Almacén en memoria y detección de popstate
    └── usar-lista-paginada.ts              # Espera, cancelación, «Ver más» y restauración

scripts/productos-ejemplo.ts                # Base de prueba con N productos (nunca producción)

tests/
├── unit/busqueda.test.ts                   # Palabras y cursor
├── integration/busqueda-productos.test.ts  # FR-002, FR-004, FR-006, FR-007, FR-009–FR-013
└── e2e/
    ├── us8-buscador.spec.ts                # Historia 1 de la spec 002, catálogo y panel
    └── us9-ver-mas.spec.ts                 # Historia 2 de la spec 002, catálogo y panel
```

**Structure Decision**: se mantiene el proyecto único de la spec 001.

- **Reglas de búsqueda**: viven en `src/consultas/busqueda.ts` y las comparten las dos secciones, así que el catálogo y el panel no pueden comportarse distinto.
- **Selección de columnas**: sigue separada entre `publicas.ts` y `admin.ts`, para que el precio de compra no pueda filtrarse.
- **Lógica del navegador**: espera, cancelación, «Ver más» y restauración están en un solo hook que usan las dos listas.
- **Numeración de las pruebas e2e**: siguen la de la spec 001 (`us1` a `us7`); `us8` y `us9` son las historias 1 y 2 de la spec 002.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Next.js restaura el desplazamiento antes de que la lista recupere sus productos | La lista se inicia de forma síncrona desde el almacén y vuelve a la posición en `useLayoutEffect`. Una prueba e2e de regreso con atrás lo cubre en móvil y portátil |
| La detección de `popstate` cambia en una versión futura de Next.js | Está aislada en `src/lib/estado-listas.ts` y la cubre la misma prueba e2e |
| La primera parte del servidor cambia tras una venta o baja mientras hay partes extra cargadas | La lista vuelve a pedir la misma cantidad que mostraba, hasta 200 (research 7) |

## Complexity Tracking

Sin violaciones de la constitución que justificar.
