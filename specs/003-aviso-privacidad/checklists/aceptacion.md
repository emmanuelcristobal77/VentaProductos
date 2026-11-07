# Aceptación: aviso de privacidad

**Feature**: [spec.md](../spec.md) · **Guía**: [quickstart.md](../quickstart.md)

## Texto del aviso (T033)

- **2026-11-06**: el propietario revisó el aviso en la app local (`/aviso-de-privacidad`) y lo aprobó tal como está, de forma provisional, mientras sabe qué conviene cambiarle. Las correcciones posteriores, por ejemplo las de un abogado, se hacen en `src/lib/aviso-privacidad.ts` actualizando la fecha, sin spec nueva (supuesto «Texto del aviso» de la spec).

## Ensayo de la migración 0001 sobre el respaldo de producción (T035)

Hecho el 2026-11-06 con el respaldo `vende-productos-2026-11-06.sqlite.gz`, que el propietario descargó de Supabase a `C:\restauracion-prueba`. El archivo `.gz` no se modificó: se descomprimió en una carpeta aparte, `C:\restauracion-prueba\ensayo-0001`, y ahí se aplicó `aplicarMigraciones` del código de la spec 003, sin commit todavía, igual que lo hará el arranque en producción.

| Dato | Antes | Después |
|---|---|---|
| Migraciones aplicadas | 1 | 2 |
| Operaciones | 6 | 6 |
| Pagos | 6 | 6 |
| Suma de los pagos | $1,090.00 MXN | $1,090.00 MXN |
| Productos | 48 | 48 |

- Las 6 operaciones conservan exactamente las 14 columnas de la spec 001, y los 6 pagos son idénticos fila por fila.
- Las columnas nuevas, `aviso_informado` y `datos_borrados_en`, quedaron en nulo en las 6 operaciones. Por eso su detalle mostrará «Sin constancia del aviso: se registró antes de que existiera».
- `PRAGMA foreign_key_check`: 0 filas huérfanas. `PRAGMA integrity_check`: `ok`.

**Resultado: cumple.** La migración es segura con los datos reales. Antes de pulsar Implementar se hará un respaldo manual (`node respaldar.cjs` en la consola de Easypanel), por si hubiera que regresar.

## Suite completa (T034)

Corrida el 2026-11-07 en el equipo del propietario, sin otros procesos en paralelo:

| Suite | Resultado |
|---|---|
| `npm run verificar` (tipos, lint, unitarias e integración) | 24 archivos, 266 de 266 pruebas |
| `npm run test:e2e` (móvil y portátil, con axe) | 152 de 152 pruebas, en 12.4 min |

Antes de lograrlo se corrigieron tres pruebas de las specs 001 y 002 que fallaban de forma intermitente. Solo cambió cómo esperan la página; lo que comprueban sigue igual:

- `formatos.spec.ts`: espera a que aparezca el precio antes de leer el texto de la página del producto.
- `us7-busqueda.spec.ts`: busca el aviso de error que dice «10 dígitos», sin confundirlo con el anunciador de rutas de Next.js, que también tiene `role="alert"`.
- `us1-catalogo-admin.spec.ts` (US1-4): espera «Producto dado de baja.» antes de ir al catálogo. Con el diálogo abierto, la lista queda oculta para la accesibilidad, y la prueba navegaba antes de que la baja terminara. Después del cambio pasó 20 de 20 veces.

**Resultado: cumple.**
