# Implementation Plan: Medición de visitas

**Branch**: `006-medicion-visitas` | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-medicion-visitas/spec.md`

## Summary

La spec agrega la medición anónima de visitas en la sección de cliente, con el Umami que el propietario ya instaló en `https://estadisticas.cristobalia.com`:

- **Script**: un componente cliente `MedicionVisitas`, dentro de `src/app/(cliente)/layout.tsx`, carga `script.js` con `next/script` (`afterInteractive`). Lleva `data-domains="app.cristobalia.com"`, así que nada se cuenta desde la laptop ni desde las pruebas, y `data-before-send`, que descarta cualquier ruta `/admin`. El panel no lo incluye ([research 2 a 4](research.md)).
- **Interesados**: un componente cliente `EnlaceTelefono` sustituye los 5 enlaces `tel:` de la sección de cliente. Al tocarlo envía `interes-telefono` con la página y, si aplica, el nombre del producto, sin retrasar ni cancelar la llamada ([research 5](research.md#5-el-evento-de-interés-el-toque-al-teléfono)).
- **Aviso de privacidad**: tres párrafos nuevos y la fecha de publicación en `src/lib/aviso-privacidad.ts`. Salen en el mismo despliegue que el script ([contracts/interfaz.md](contracts/interfaz.md#3-aviso-de-privacidad)).
- **Datos**: la base de la app no cambia ([data-model.md](data-model.md)).

## Technical Context

**Language/Version**: TypeScript 5.9 sobre Node.js 24, igual que las specs anteriores

**Primary Dependencies**: las de la spec 005 (Next.js 16.4, React 19.3, Tailwind CSS 4.3, shadcn/ui). Sin dependencias nuevas en `package.json`. El script de Umami se descarga del servidor del propietario; no es un paquete de npm

**Storage**: sin cambios. Umami guarda sus datos en su propia base PostgreSQL (`umami-db`), fuera de la app

**Testing**: Vitest 5 para `antesDeEnviarUmami` y el texto del aviso, y Playwright 1.64 con el script de Umami sustituido por `page.route` ([research 9](research.md#9-pruebas))

**Target Platform**: navegadores móviles y de portátil actuales; mismo servicio de Easypanel

**Project Type**: aplicación web de un solo proyecto

**Performance Goals**: el script pesa 2.5 KB, carga con `async` después de hidratar y no debe mover el LCP de producción: no más de 0.1 s sobre la medición previa, y el propietario confirma la cifra, como en la spec 002 ([research 8](research.md#8-velocidad-fr-011-y-sc-006))

**Constraints**:
- Sin cookies, sin guardar IP y sin datos personales en lo que se envía (FR-004).
- Sin medir el panel (FR-002).
- La llamada se abre igual si Umami falla (FR-005, FR-006).
- El aviso sale junto con la medición (FR-007).
- Todo en es-MX.

**Scale/Scope**: una constante y una función pura, dos componentes cliente, cambios en 4 archivos que tienen enlaces `tel:`, tres párrafos del aviso y una prueba e2e nueva

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Inicial | Post-diseño |
|---|---|---|---|
| I. Spec First | Spec 006 aprobada el 2026-11-12 y registrada en `specs/MAPA.md` con un propietario. Las specs 001 a 005 no se modifican; el cambio del aviso es el procedimiento previsto por la spec 003 | PASS | PASS |
| II. Números | No hay importes, fechas ni horas nuevas en pantalla, salvo la fecha del aviso, que ya se muestra con `formatearFecha` | PASS | PASS |
| III. Idioma y mercado | Los párrafos nuevos del aviso están en es-MX. El nombre del evento (`interes-telefono`) solo se ve en el tablero del propietario | PASS | PASS |
| IV. Cero alcance fantasma | Sin banner de cookies, sin estadísticas dentro del panel, sin `do-not-track`, sin proxy del script y sin eventos distintos del teléfono. El filtro `before-send` es una protección de FR-002, no una función nueva ([research 4](research.md#4-que-el-panel-nunca-se-cuente)) | PASS | PASS |
| V. Tests con la spec | Pruebas unitarias y e2e nombradas por FR y SC. Las pruebas de la spec 003 sobre el aviso siguen pasando sin cambios | PASS | PASS |
| VI. Verificable sin técnica | [quickstart.md](quickstart.md) comprueba cada criterio desde el celular y el tablero. La medición de LCP repite el método técnico ya aceptado en las specs 001 y 002, igual que en la 005 | PASS | PASS |
| VII. Interfaz accesible | Los enlaces del teléfono conservan su texto, su icono con `aria-hidden` y su tamaño. No hay controles nuevos. Las pruebas de axe existentes siguen pasando | PASS | PASS |

## Project Structure

### Documentation (this feature)

```text
specs/006-medicion-visitas/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── interfaz.md          # Script, evento interes-telefono y texto del aviso
├── checklists/
│   ├── requirements.md
│   └── aceptacion.md        # Resultados del quickstart y del LCP (se crea en tasks)
└── tasks.md                 # Lo genera /speckit-tasks
```

### Source Code (repository root)

Solo se listan los archivos nuevos o que cambian.

```text
src/
├── app/(cliente)/
│   ├── layout.tsx                            # <MedicionVisitas />; teléfono del pie con EnlaceTelefono
│   ├── aviso-de-privacidad/page.tsx          # Teléfono de «Dudas» con EnlaceTelefono
│   ├── producto/[id]/page.tsx                # <LeyendaProducto producto={nombre} />
│   └── encargos/page.tsx                     # <LeyendaProducto producto={nombre} />
├── components/cliente/
│   ├── medicion-visitas.tsx                  # "use client": publica antesDeEnviarUmami y carga el script
│   ├── enlace-telefono.tsx                   # "use client": <a href="tel:..."> que envía interes-telefono
│   ├── leyenda-producto.tsx                  # Usa EnlaceTelefono; nuevo prop producto opcional
│   └── catalogo-buscable.tsx                 # Teléfono de «sin resultados» con EnlaceTelefono
└── lib/
    ├── estadisticas.ts                       # Constantes de Umami y antesDeEnviarUmami
    └── aviso-privacidad.ts                   # 3 párrafos nuevos y fecha

tests/
├── unit/
│   ├── estadisticas.test.ts                  # FR-002 (before-send), FR-003 (constantes)
│   └── aviso-privacidad.test.ts              # Casos nuevos de FR-008 y FR-009
└── e2e/
    └── us18-medicion-visitas.spec.ts         # FR-001, FR-002, FR-004 a FR-006, con script falso
```

**Structure Decision**: se mantiene el proyecto único de la spec 001.

- **Constantes y lógica pura** en `src/lib/estadisticas.ts`, sin `window`, para probarlas con Vitest.
- **Componentes cliente pequeños**: el layout de cliente sigue siendo de servidor y solo inserta `MedicionVisitas` y `EnlaceTelefono`. `catalogo-buscable.tsx` ya es cliente.
- **Numeración e2e**: `us18` sigue a `us17` de la spec 005.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Umami caído o lento | El script es `async` y el `onClick` no espera el envío. Prueba e2e con el script bloqueado y paso 11 del quickstart |
| La ciudad aparece como la del servidor | Paso 4 del quickstart. Si pasa, se revisa que el proxy de Easypanel pase `X-Forwarded-For` al servicio `umami`; es configuración del servidor, no de la app ([research 11](research.md#11-la-ciudad-detrás-del-proxy-de-easypanel)) |
| Una actualización de Umami cambia o quita `before-send` o `domains` | Se revisó en el `script.js` instalado el 2026-11-12. Si una versión futura los quita, `domains` sigue protegiendo FR-003 y el layout sigue protegiendo FR-002. Se revisa al actualizar Umami |
| Las visitas del propietario y del vendedor inflan los números | Exclusión por dispositivo al final del quickstart, sin cambiar la app |
| Bloqueadores de anuncios ocultan visitas | Asumido en la spec. Servir el script desde el dominio de la app queda fuera de alcance (Principio IV) |
| Pruebas e2e anteriores sin red | El script real falla en silencio y no envía nada desde `localhost`; no afecta otras pruebas |

## Complexity Tracking

Sin violaciones de la constitución que justificar.
