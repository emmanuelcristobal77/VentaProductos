# Aceptación: Sello promocional

**Feature**: [spec.md](../spec.md) | **Quickstart**: [quickstart.md](../quickstart.md)

## T021: pruebas automáticas

- **Fecha**: 2026-11-12, en la laptop de desarrollo, sobre el commit 2021b7f.
- **`npm run verificar`**: tipos y lint sin errores ni avisos; Vitest **408 de 408** en 34 archivos. Las nuevas son `tests/unit/promocion.test.ts`, `tests/integration/promocion.test.ts` y `tests/integration/migracion-0003.test.ts`.
- **`npm run test:e2e`** (specs 001 a 005, móvil y portátil): **199 pasaron y 3 fallaron** en 21.8 min. Las 3 son pruebas de specs anteriores y, al repetirlas 3 veces cada una, pasaron 17 de 18 veces:

| Prueba | Falla | Repetición |
|---|---|---|
| `us2-catalogo-cliente` «las pantallas públicas pasan axe» (móvil) | `page-has-heading-one`: axe revisó antes de que terminara de cargar la página | 6 de 6 |
| `us1-catalogo-admin` «las pantallas de administración pasan axe» (portátil) | La misma | 6 de 6 |
| `us8-buscador` «US1-10, FR-008a: al regresar con atrás…» (portátil) | La posición quedó 50 px más abajo | 5 de 6 |

- **Por qué no vienen de esta spec**: cuando corren, el sello está desactivado (cada archivo e2e de la spec 005 lo desactiva en `afterAll`, y en las repeticiones la base se recrea sin sello), así que la página no tiene franja. Los 50 px de `us8` son lo que mueve `mouse.wheel(0, 50)`: la prueba toma la posición antes de que termine ese desplazamiento. Es una carrera de la prueba, de la spec 002. **Corregida el 2026-11-12, a petición del propietario**: solo cambió cómo espera, igual que en la spec 003. El ayudante nuevo `posicionQuieta`, en `tests/e2e/ayudantes.ts`, espera a que la página deje de moverse antes de anotar la posición. Lo que se comprueba no cambió: el mismo lugar, con 5 px de margen. Se aplicó a las 4 pruebas de la spec 002 con el mismo patrón: dos en `us8-buscador` y dos en `us9-ver-mas`. Después de corregirlas, pasaron **40 de 40** (5 repeticiones de cada una, en móvil y portátil).
- Durante el desarrollo también falló una vez `accesibilidad-admin` «las pantallas de administración no tienen faltas de axe» en móvil (`document-title` justo después de guardar un producto). Repetida, pasó 3 de 3.
- **e2e de la spec 005** (`us16`, `us17` y `accesibilidad-admin`): **36 de 36** en una corrida dedicada.

## T022: ensayo de la migración `0003`

- **Fecha**: 2026-11-12, en la laptop de desarrollo.
- **Base**: copia en `C:\restauracion-prueba\ensayo-0003` de `ensayo-0002-hoy`. Es el respaldo de producción `vende-productos-2026-11-08.sqlite.gz` (fecha UTC), con la migración `0002` ya aplicada, igual que está producción desde el 2026-11-07. **No es el respaldo del día**: antes de publicar hay que repetirlo con un respaldo nuevo, como en la spec 004.
- **Comando**: `DATOS_DIR=C:/restauracion-prueba/ensayo-0003 npx tsx scripts/migrar.ts`.

| Dato | Antes | Después |
|---|---|---|
| `PRAGMA integrity_check` | ok | ok |
| Migraciones aplicadas | 3 | 4 |
| Productos (total / activos) | 48 / 46 | 48 / 46 |
| Fotos (total / activas) | 57 / 56 | 57 / 56 |
| Categorías | 3 | 3 |
| Operaciones / pagos | 11 / 11 | 11 / 11 |
| Tabla `sello_promocional` | No existe | Existe, vacía |
| `PRAGMA foreign_key_check` | 0 filas | 0 filas |

### Repetición con el respaldo del día (antes de publicar)

- **Fecha**: 2026-11-12, en la laptop de desarrollo.
- **Base**: `vende-productos-2026-11-12.sqlite.gz` (fecha UTC), generado por el propietario en Easypanel y descargado de Supabase. Se descomprimió en `C:\restauracion-prueba\ensayo-0003-hoy`.
- **Comando**: `DATOS_DIR=C:/restauracion-prueba/ensayo-0003-hoy npx tsx scripts/migrar.ts`.

| Dato | Antes | Después |
|---|---|---|
| `PRAGMA integrity_check` | ok | ok |
| Migraciones aplicadas | 3 | 4 |
| Productos (total / activos) | 62 / 60 | 62 / 60 |
| Fotos (total / activas) | 75 / 74 | 75 / 74 |
| Categorías | 3 | 3 |
| Operaciones / pagos | 12 / 13 | 12 / 13 |
| Tabla `sello_promocional` | No existe | Existe, vacía |
| `PRAGMA foreign_key_check` | 0 filas | 0 filas |

**Cumple**: la migración solo agrega la tabla vacía y no cambia ningún dato.

## T023: LCP del catálogo con el sello activo

- **Fecha**: 2026-11-12, en la laptop de desarrollo, con `next start` de la compilación de 2021b7f.
- **Datos**: copia de la base e2e, con 78 productos activos con foto. La base local de desarrollo no tenía productos activos.
- **Cómo**: Lighthouse no está instalado en el proyecto, así que se midió con Playwright y CDP: 390 px, Fast 4G (150 ms y 1.6 Mbit/s) y CPU 4 veces más lenta, igual que el perfil de la spec 002. LCP con `PerformanceObserver`. Una carga para calentar y luego 5 pasadas alternadas de sello apagado y sello encendido («Buen Fin · Pregunta por tu descuento», Rojo).

| Sello | Pasadas (ms) | Mediana |
|---|---|---|
| Apagado | 1012, 1036, 984, 1024, 1036 | **1.02 s** |
| Encendido | 1024, 1004, 1040, 996, 1108 | **1.02 s** |

- **Resultado**: el sello no cambia el LCP. La cifra no es la misma que la de Lighthouse en la spec 002 (1.23 s en local, 1.04 s en producción) porque la herramienta es otra; lo que se compara es apagado contra encendido con la misma herramienta y los mismos datos. **Cumple.**

## T024: quickstart en local

- **Fecha**: 2026-11-12, en local (`npm run dev`, con la migración `0003` aplicada a la base local), desde la laptop y desde el celular del propietario (`http://192.168.0.16:3000`).
- **Quién**: el propietario.
- **Resultado**: los **pasos 1 a 18, correctos**, según lo informó el propietario. Esto incluye:
  - el **paso 9**, en el celular real: la franja se lee bien en modo claro y en modo oscuro (FR-014, SC-005);
  - el **paso 18**, con la ventana a unos 800 px: los enlaces del panel no se enciman (FR-001). Por eso no hizo falta mostrar solo iconos entre `md` y `lg` (research 7).
- **Cumple.**

## T025: prueba de SC-004 con 10 personas

- **Fecha**: 2026-11-12.
- **Resultado**: el propietario informó el **paso 19 como correcto**: al menos 9 de 10 personas leyeron el sello completo sin zoom y siguieron encontrando el nombre, el precio y la disponibilidad.
- **Falta registrar**: cuántas personas lo leyeron completo y las observaciones, que pide la tarea.

## T026: publicación y revisión en producción

Pendiente. T021, T022 y T024 ya están; falta que el propietario haga el push a `main` y pulse Implementar en Easypanel.
