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

## Pasos en celular, en producción (T036 y T038)

Hechos el 2026-11-07 por el propietario, en su celular, contra `https://app.cristobalia.com` con la versión del commit `4a479a5`, publicada después de un respaldo manual (`node respaldar.cjs`). Se usó un cliente de prueba.

| Paso del quickstart | Qué se comprobó | Resultado |
|---|---|---|
| 1 a 6 | Enlace del pie en las cuatro páginas de cliente, línea en «Mis apartados», aviso sin sesión, elementos de FR-004, lectura en celular, enlaces de correo y teléfono | Correcto |
| 7 a 12 | Casilla sin marcar con su enlace, pestaña aparte, rechazo sin casilla, constancia en el detalle, venta con y sin datos, encargo | Correcto |
| 13 a 17 | Confirmación con 3 operaciones, «Volver», borrado, búsqueda y consulta sin resultados, pago tras el borrado, venta sin datos | Correcto |
| 18 | Una operación anterior a la spec 003 muestra «Sin constancia del aviso: se registró antes de que existiera»: la migración 0001 funcionó en producción | Correcto |
| 19 | Lector de pantalla en la casilla, el enlace del formulario y la página del aviso | Correcto |
| 21 | Casilla obligatoria en operaciones con datos del cliente | Correcto, con 3 operaciones (ver abajo) |

- **SC-001**: se llega al aviso en 2 toques o menos desde cada página de cliente. **Cumple.**
- **SC-003**: la spec pide una prueba de 10 operaciones. Se hicieron 3: un apartado, una venta y un encargo con el cliente de prueba, y ninguna se guardó sin la casilla. **Decisión del propietario (2026-11-07)**: lo da por suficiente, para no dejar más operaciones de prueba registradas en producción. La regla también la cubren las pruebas automáticas (`constancia-aviso.test.ts` y `us11-constancia-aviso.spec.ts`). **Cumple, con esa decisión.**
- **SC-004**: la venta sin datos del comprador se registró con los mismos pasos de siempre. **Cumple.**
- **SC-005**: el propietario confirmó que el aviso publicado contiene cada elemento de FR-004. **Cumple.**
- **SC-006**: el borrado de los datos de un cliente con 3 operaciones tomó alrededor de 1 minuto, contra una meta de menos de 2, y los importes no cambiaron. **Cumple.**
- **T038**: como estos pasos se hicieron en producción, cubren la repetición de los pasos 1 a 6 y 18 que pide la T038.

**SC-002**: ver la sección siguiente (T037).

## Prueba con personas (T037)

Registrada el 2026-11-07. El propietario les pidió a más de 10 personas que abrieran el aviso de privacidad en `https://app.cristobalia.com` y buscaran el contacto: el nombre del responsable, el teléfono y el correo.

| Fecha de registro | Personas | Encontraron el contacto sin ayuda | Meta | Cumple |
|---|---|---|---|---|
| 2026-11-07 | Más de 10 (el número exacto no se registró) | Todas | 9 de cada 10 | Sí |

- No se reportó que alguien se atorara.
- El tiempo de cada persona no se midió por separado. El propietario reporta que todas encontraron el contacto sin ayuda.

**SC-002: cumple.** Con esto quedan comprobados los 6 criterios de éxito y las 38 tareas de la spec 003.
