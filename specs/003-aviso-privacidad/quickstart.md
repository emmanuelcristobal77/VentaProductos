# Quickstart: validar el aviso de privacidad

**Feature**: [spec.md](spec.md) | **Fecha**: 2026-11-06

Guía para comprobar la spec 003 usando la app (Principio VI). Los datos nuevos están en [data-model.md](data-model.md) y la página y las acciones en [contracts/interfaz.md](contracts/interfaz.md).

## Requisitos

- La app corriendo en local (`npm run dev`) o en producción, con la migración `0001` aplicada.
- Un celular, o el navegador en vista móvil de 390 px de ancho.
- Para los pasos 7 a 15: sesión iniciada en el panel y al menos un producto con 3 unidades disponibles. En producción se usan datos de prueba que se anulan o cancelan al terminar, y después se borran sus datos con el paso 13.

```powershell
npm run verificar        # tipos, lint y pruebas unitarias e integración
npm run test:e2e         # flujos y accesibilidad en móvil y portátil
```

## Escenarios

| # | Pasos | Resultado esperado | Referencia |
|---|---|---|---|
| 1 | En el celular, abrir el catálogo, un producto, los artículos por encargo y «Mis apartados»; en cada uno, bajar al pie y pulsar «Aviso de privacidad» | Se abre el aviso en 2 toques o menos desde cada página; la barra de navegación no tiene el enlace | FR-001, FR-002, US1-1, SC-001 |
| 2 | En «Mis apartados», mirar junto al formulario | Hay una línea con enlace al aviso | FR-003, US1-2 |
| 3 | Escribir la dirección `/aviso-de-privacidad` en una ventana privada | Se ve el aviso sin iniciar sesión | FR-001, US1-5 |
| 4 | Leer el aviso con la lista de FR-004 en mano | Están todos los elementos, cada uno con su título, y la fecha de última actualización | FR-004, FR-006, US1-3, SC-005 |
| 5 | En el celular, leer el aviso completo | No hace falta hacer zoom ni desplazarse hacia los lados | FR-006, US1-4 |
| 6 | Pulsar el correo y luego el teléfono | Se abre un correo nuevo a emmanuelcristobal@yahoo.com.mx; luego se ofrece llamar al teléfono del negocio | FR-005, US1-6 |
| 7 | En el panel, abrir «Apartar» de un producto | La casilla «Se informó al cliente del aviso de privacidad» está sin marcar y tiene al lado un enlace al aviso | FR-007, US2-1, US2-8 |
| 8 | Pulsar el enlace junto a la casilla y regresar a la pestaña del panel | El aviso se abrió en otra pestaña y el formulario conserva lo capturado | FR-007, US2-8 |
| 9 | Llenar el apartado sin marcar la casilla y guardar | No se guarda; junto a la casilla aparece «Informa al cliente del aviso de privacidad y marca la casilla.» | FR-008, US2-2 |
| 10 | Marcar la casilla y guardar | Se guarda; el detalle dice «Se informó al cliente del aviso de privacidad» con la fecha y hora de registro | FR-010, FR-011, US2-3, US2-6 |
| 11 | Registrar una venta con teléfono y sin casilla; luego otra sin nombre ni teléfono y sin casilla | La primera no se guarda y muestra el mismo mensaje; la segunda se guarda en los mismos pasos que antes | FR-009, US2-4, US2-5, SC-004 |
| 12 | Repetir los pasos 9 y 10 con un encargo | Se comporta igual que el apartado | FR-008, FR-010 |
| 13 | Registrar 2 apartados y 1 venta con el mismo nombre y teléfono, con pagos. Abrir uno y pulsar «Borrar datos del cliente» | La confirmación dice que se borrarán los datos de 3 operaciones y que no se puede deshacer | FR-013, FR-014, US3-1 |
| 14 | Cancelar la confirmación; luego repetir y confirmar | Al cancelar no cambia nada. Al confirmar, las 3 muestran «Datos borrados a petición del cliente» con la fecha, y sus importes, pagos y saldos son los mismos de antes; todo en menos de 2 minutos | FR-015, FR-016, US3-2–US3-4, SC-006 |
| 15 | Buscar en el panel con el nombre y luego con el teléfono anteriores; consultar en «Mis apartados» con los dos | No aparecen esas operaciones | FR-017, US3-5 |
| 16 | En un apartado pendiente con datos borrados, registrar un pago y abrir su detalle | El pago se registra; no aparecen «Borrar datos del cliente» ni «Corregir» | FR-017, FR-018, US3-6 |
| 17 | Abrir una venta registrada sin nombre ni teléfono | No aparece «Borrar datos del cliente» | FR-013, US3-7 |
| 18 | Abrir una operación registrada antes de publicar esta spec | Dice «Sin constancia del aviso: se registró antes de que existiera» | FR-011, US2-7 |
| 19 | Con un lector de pantalla, recorrer la casilla, el enlace del formulario y la página del aviso | La casilla y los enlaces se anuncian con su etiqueta; el enlace avisa que abre otra pestaña | FR-019 |
| 20 | Prueba con 10 personas que no conocen la app, en su celular: «Encuentra quién es el responsable de tus datos y a qué correo pedir que los borren» | 9 de 10 lo encuentran sin ayuda en menos de 1 minuto | SC-002 |
| 21 | Prueba de 10 operaciones con datos del cliente: intentar guardar cada una sin la casilla y después con ella | Ninguna se guarda sin la casilla; las 10 muestran la constancia | SC-003 |

## Antes de publicar: migración sobre una copia de producción

La migración `0001` reconstruye la tabla `operaciones` ([research 4](research.md#4-datos-nuevos-en-operaciones-y-migración)). Antes de publicar se prueba sobre el último respaldo:

```powershell
$env:DATOS_DIR = "C:\restauracion-prueba"
# Restaurar ahí el último respaldo, como en la T094 de la spec 001
npm run db:migrar
```

Se comprueba que el número de operaciones y de pagos no cambió y que las operaciones anteriores muestran «Sin constancia del aviso» (paso 18).

## Registro de resultados

Los resultados se anotan en `checklists/aceptacion.md` de esta spec, igual que en las specs 001 y 002.
