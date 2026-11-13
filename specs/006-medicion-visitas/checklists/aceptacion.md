# Aceptación: Medición de visitas

**Feature**: [spec.md](../spec.md) | **Quickstart**: [quickstart.md](../quickstart.md)

## T018: pruebas automáticas

- **Fecha**: 2026-11-12, en la laptop de desarrollo, sobre `ee80dd4` más los cambios de la implementación.
- **`npm run verificar`**: tipos y lint sin errores; Vitest **427 de 427** en 35 archivos. Las nuevas son `tests/unit/estadisticas.test.ts` (14) y los 5 casos de la spec 006 en `tests/unit/aviso-privacidad.test.ts`. Los casos de la spec 003 siguen pasando.
- **`npm run test:e2e`** (specs 001 a 006, móvil y portátil, con axe): **230 de 230** en 16.4 min, sin fallas ni repeticiones.
- **e2e de la spec 006** (`us18-medicion-visitas`): **28 de 28** en una corrida dedicada (2.8 min). Ninguna prueba carga el Umami real: usan `tests/e2e/ayudantes-medicion.ts`.
- **Nota**: las pruebas unitarias se vieron fallar antes de implementar. La e2e `us18` se escribió antes del código, pero no se corrió antes de implementar, porque cada corrida compila la app.

## T019: desarrollo no cuenta visitas (FR-003)

Pendiente: lo hace el propietario con acceso al tablero.

## T020: LCP de producción antes de publicar

- **Fecha**: 2026-11-12, desde la laptop de desarrollo, sin otras pruebas corriendo. Producción tenía el commit de la spec 005, con el sello «Buen Fin» activo.
- **Comando**: el de quickstart.md («Antes de publicar»), Lighthouse 12.8.2, móvil, `rttMs=60`, `throughputKbps=9000`.

| Corrida | LCP |
|---|---|
| 1 | 1.12 s |
| 2 | 1.30 s |
| 3 | 1.26 s |
| **Mediana** | **1.26 s** |

Es más alta que los 1.04 s de la spec 002 sin ningún cambio de esta spec: es la variación de la red y del día. Por eso el criterio de T024 compara contra esta mediana (research 8).

## T021: aprobación del texto del aviso

Pendiente.

## T022 a T025: publicación y comprobación en producción

Pendiente.
