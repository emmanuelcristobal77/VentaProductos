# Implementation Plan: Aviso de privacidad

**Branch**: `003-aviso-privacidad` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-aviso-privacidad/spec.md`

## Summary

La spec agrega tres cosas sobre la app de las specs 001 y 002:

- **Página del aviso**: `/aviso-de-privacidad` es una página estática del grupo `(cliente)`. Los datos que fija FR-004 están en un solo módulo, `src/lib/aviso-privacidad.ts`, para que el texto se corrija en un lugar. Se enlaza desde el pie de página y desde «Mis apartados».
- **Constancia**: los formularios de venta, apartado y encargo tienen una casilla nativa. El servicio la exige en apartados y encargos, y en ventas solo cuando hay nombre o teléfono. Se guarda en una columna nueva, `aviso_informado`, y el detalle la muestra con la fecha de registro.
- **Borrado a petición del cliente**: una acción nueva deja en nulo el nombre y el teléfono de todas las operaciones con el mismo nombre normalizado y teléfono, y guarda `datos_borrados_en`. Los importes y pagos no se tocan.

La migración `0001` reconstruye `operaciones` para cambiar sus restricciones, con las llaves foráneas pospuestas hasta el `COMMIT`. El detalle de las decisiones está en [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 sobre Node.js 24, igual que las specs 001 y 002

**Primary Dependencies**: las de la spec 001 (Next.js 16.4, React 19.3, Tailwind CSS 4.3, shadcn/ui, Drizzle ORM 0.45, `better-sqlite3` 13, Zod 4). No se agregan dependencias

**Storage**: SQLite existente. Migración `0001`: dos columnas nuevas en `operaciones` y dos restricciones nuevas más una cambiada, con reconstrucción de la tabla ([research 4](research.md#4-datos-nuevos-en-operaciones-y-migración))

**Testing**: Vitest 5 para reglas, borrado y migración contra SQLite temporal; Playwright 1.64 con axe para flujos y accesibilidad en móvil y portátil

**Target Platform**: navegadores móviles y de portátil actuales; mismo servicio de Easypanel

**Project Type**: aplicación web de un solo proyecto

**Performance Goals**: sin metas nuevas. La página del aviso es estática y el pie de página solo suma un enlace, así que el LCP del catálogo aceptado en la spec 002 no debe cambiar

**Constraints**: la constancia y la fecha del borrado nunca salen por las consultas públicas (FR-012). El borrado no cambia ningún importe (Principio II). Todo en es-MX

**Scale/Scope**: una página nueva, una casilla en tres formularios, una acción nueva y una migración. Hoy hay pocas operaciones registradas, y el borrado de un cliente alcanza unas cuantas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Inicial | Post-diseño |
|---|---|---|---|
| I. Spec First | Spec 003 registrada en `specs/MAPA.md` con un propietario. Las specs 001 y 002 no se modifican; la excepción a FR-038 está escrita en la spec 003. **La 003 debe aprobarse antes de implementar** | PASS (condicionado a la aprobación) | PASS (condicionado a la aprobación) |
| II. Números | El borrado no toca precio, cantidad, pagos ni estado (FR-016); una prueba compara saldos al centavo antes y después. Fechas con los formateadores existentes | PASS | PASS |
| III. Idioma y mercado | Textos nuevos en es-MX ([research 9](research.md#9-textos-nuevos-es-mx)) | PASS | PASS |
| IV. Cero alcance fantasma | Sin editor del aviso, sin aceptación expresa, sin borrado automático ni edición de respaldos | PASS | PASS |
| V. Tests con la spec | Pruebas nombradas por FR, SC o escenario. Las pruebas de la spec 001 que registran apartados, encargos o ventas con datos solo agregan la casilla marcada a sus datos de entrada; sus aserciones no cambian | PASS | PASS |
| VI. Verificable sin técnica | [quickstart.md](quickstart.md) comprueba cada criterio usando la app; la prueba de la migración sobre una copia del respaldo es un paso técnico previo a publicar | PASS | PASS |
| VII. Interfaz accesible | Casilla nativa con etiqueta, error asociado con `aria-describedby`, enlace que avisa que abre otra pestaña, axe en la página nueva y en los formularios | PASS | PASS |

## Project Structure

### Documentation (this feature)

```text
specs/003-aviso-privacidad/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── interfaz.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Lo genera /speckit-tasks
```

### Source Code (repository root)

Solo se listan los archivos nuevos o que cambian.

```text
src/
├── app/
│   ├── (cliente)/
│   │   ├── layout.tsx                       # Enlace «Aviso de privacidad» en el pie
│   │   └── aviso-de-privacidad/page.tsx     # Página estática del aviso
│   └── admin/(panel)/
│       ├── operaciones/[id]/page.tsx        # Constancia, datos borrados y botón de borrado
│       ├── operaciones/page.tsx             # Texto de datos borrados en la lista
│       └── encargos/page.tsx                # Texto de datos borrados en la lista
├── acciones/operaciones.ts                  # Lee avisoInformado; nueva borrarDatosCliente
├── components/
│   ├── admin/
│   │   ├── hoja-formulario.tsx              # CasillaAviso con su error y enlace
│   │   ├── hoja-venta.tsx                   # Agrega CasillaAviso
│   │   ├── hoja-apartado.tsx                # Agrega CasillaAviso
│   │   ├── hoja-encargo.tsx                 # Agrega CasillaAviso
│   │   └── dialogo-borrar-datos.tsx         # Confirmación con la cuenta de operaciones
│   └── cliente/consulta-apartados.tsx       # Línea con enlace al aviso
├── consultas/admin.ts                       # contarOperacionesDelCliente
├── db/
│   ├── esquema.ts                           # Columnas y restricciones nuevas
│   └── migraciones/0001_*.sql               # Generada, con defer_foreign_keys agregado a mano
├── lib/
│   ├── aviso-privacidad.ts                  # Responsable, domicilio, correo y fecha
│   └── mensajes.ts                          # Mensaje de la casilla
└── servicios/operaciones.ts                 # Validación de la casilla, borrado y rechazo de corrección

tests/
├── unit/aviso-privacidad.test.ts            # FR-004: el módulo tiene todos los elementos
├── integration/
│   ├── constancia-aviso.test.ts             # FR-008–FR-012
│   ├── borrado-datos.test.ts                # FR-013–FR-018, SC-006
│   └── migracion-0001.test.ts               # Reconstrucción sin perder operaciones ni pagos
└── e2e/
    ├── us10-aviso-privacidad.spec.ts        # Historia 1 de la spec 003, con axe
    ├── us11-constancia-aviso.spec.ts        # Historia 2 de la spec 003
    └── us12-borrar-datos.spec.ts            # Historia 3 de la spec 003
```

**Structure Decision**: se mantiene el proyecto único de la spec 001.

- **Reglas**: la validación de la casilla, el borrado y el rechazo de la corrección viven en `src/servicios/operaciones.ts`, junto a las reglas de FR-021, FR-022 y FR-043. No se pueden saltar desde el navegador.
- **Consultas públicas**: `src/consultas/publicas.ts` no cambia. Como sigue eligiendo sus columnas una por una, la constancia y la fecha del borrado no pueden salir a la sección de cliente.
- **Numeración de las pruebas e2e**: siguen la de las specs anteriores (`us1` a `us9`). `us10` a `us12` son las historias 1 a 3 de la spec 003.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| La reconstrucción de `operaciones` falla o pierde filas en producción | `defer_foreign_keys` dentro de la transacción del migrador, prueba de integración desde la `0000` con datos, y ensayo sobre una copia del último respaldo antes de publicar (quickstart). Hay respaldo diario de 14 días |
| Drizzle Kit genera una migración distinta a la esperada (por ejemplo, sin copiar alguna columna) | Se revisa el SQL generado línea por línea antes del commit, y la prueba de migración compara todas las columnas de las filas anteriores |
| Las pruebas de la spec 001 dejan de pasar porque no marcan la casilla | Se agrega `avisoInformado` a sus datos de entrada en el mismo cambio; las aserciones no se tocan (Principio V) |
| El borrado alcanza a otra persona con el mismo nombre y teléfono | Es la misma regla con la que la spec 001 ya le muestra las operaciones al cliente; la confirmación dice cuántas operaciones cambiarán antes de borrar |

## Complexity Tracking

Sin violaciones de la constitución que justificar.
