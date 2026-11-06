# Research: Aviso de privacidad

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Fecha**: 2026-11-06

La tecnología es la misma de la spec 001 ([research de la 001](../001-catalogo-ventas-apartados/research.md)) y no se agregan dependencias. Aquí solo se registran las decisiones nuevas.

## 1. Dónde vive el texto del aviso

- **Decision**: el aviso es una página de servidor estática en `src/app/(cliente)/aviso-de-privacidad/page.tsx`. Los datos que fija FR-004 (responsable, domicilio, correo y fecha de última actualización) están en un solo módulo, `src/lib/aviso-privacidad.ts`, y la página arma las secciones con ellos. El teléfono sale de `telefonoNegocio()`, el mismo del pie de página.
- **Rationale**: la spec deja la redacción fuera de la app y pide que se cambie con una nueva publicación (supuesto «Texto del aviso»). Con los datos en un módulo, el abogado o el propietario corrigen el texto en un solo lugar y una prueba verifica que no falte ningún elemento de FR-004. La página no lee la base, así que se dibuja una vez al construir y no afecta la velocidad del catálogo.
- **Alternatives considered**:
  - Guardar el texto en la base y editarlo desde el panel: la spec lo deja fuera de alcance.
  - Un archivo Markdown con un convertidor: agrega una dependencia para una sola página.
  - Variables de entorno para el correo y el domicilio: son parte del texto legal, no de la configuración; si cambian, el aviso entero se revisa y se vuelve a publicar.

## 2. Casilla de constancia y su validación

- **Decision**: cada formulario (venta, apartado y encargo) envía un campo `avisoInformado` desde una casilla nativa `<input type="checkbox">` con su `<Label>`, que se agrega como componente `CasillaAviso` en `hoja-formulario.tsx`. Usa el mismo contexto de errores por campo que `Campo`. El servicio valida:
  - apartado y encargo: la casilla es obligatoria (FR-008);
  - venta: es obligatoria solo si, tras recortar espacios, hay nombre o teléfono (FR-009).

  El error va en `campos.avisoInformado`, con el mensaje «Informa al cliente del aviso de privacidad y marca la casilla.».
- **Rationale**: la regla vive en el servicio, igual que las de FR-021 y FR-022, así que no se puede saltar desde el navegador y las pruebas de integración la cubren sin abrir la app. Una casilla nativa es accesible sin configuración extra y el proyecto no tiene un componente de casilla de shadcn/ui.
- **Alternatives considered**:
  - Validar solo en el navegador: se puede saltar, y no deja prueba en el servidor.
  - Agregar el componente `Checkbox` de shadcn/ui: es un botón con `role="checkbox"` que no se envía en el `FormData` sin un campo oculto, y no aporta nada sobre el control nativo.

## 3. Enlace al aviso dentro del formulario

- **Decision**: el enlace junto a la casilla abre `/aviso-de-privacidad` en una pestaña nueva (`target="_blank"`, `rel="noopener"`), con un texto que lo avisa a los lectores de pantalla.
- **Rationale**: si el enlace navegara en la misma pestaña, el vendedor perdería lo que ya capturó en la hoja. En una pestaña nueva le muestra el aviso al cliente y regresa al formulario intacto.
- **Alternatives considered**: mostrar el aviso en un diálogo encima de la hoja. Obliga a duplicar la página dentro del panel y a mantener dos versiones del mismo texto.

## 4. Datos nuevos en `operaciones` y migración

- **Decision**: migración `0001` generada con `npm run db:generar`, que agrega dos columnas a `operaciones` y cambia sus restricciones ([data-model.md](data-model.md)):
  - `aviso_informado` (entero booleano, nulo para las operaciones anteriores);
  - `datos_borrados_en` (texto ISO, nulo mientras no se borren).

  Cambiar una restricción `CHECK` en SQLite obliga a reconstruir la tabla. Drizzle Kit genera esa reconstrucción: copia a `__new_operaciones`, borra la tabla anterior y renombra. El migrador de Drizzle corre todo dentro de una transacción, y ahí `PRAGMA foreign_keys=OFF` no tiene efecto; con las llaves foráneas activas, el `DROP TABLE` fallaría por las filas de `pagos`. Por eso se agrega a mano `PRAGMA defer_foreign_keys = ON;` al principio de la migración generada. Eso pospone la revisión de las llaves hasta el `COMMIT`, cuando `operaciones` ya existe otra vez con los mismos `id`.
- **Rationale**: la restricción `operaciones_cliente` de la spec 001 exige nombre y teléfono en todo apartado y encargo. Sin cambiarla, un borrado tendría que dejar textos falsos en el nombre y el teléfono, y la búsqueda por teléfono los encontraría. Con la restricción nueva, el borrado deja las columnas en nulo y la base misma impide que se mezclen datos y borrado.
- **Alternatives considered**:
  - Solo `ALTER TABLE … ADD COLUMN`, sin cambiar restricciones, y guardar «Datos borrados…» como nombre y un teléfono ficticio: rompe la búsqueda, porque todos los borrados compartirían el mismo teléfono.
  - Una tabla aparte de borrados: la restricción `operaciones_cliente` seguiría impidiendo dejar el nombre en nulo.
- **Verificación**: una prueba de integración aplica solo la migración `0000`, inserta operaciones con pagos, aplica la `0001` y comprueba que no se perdió ninguna fila, que `pagos` sigue apuntando a sus operaciones y que `PRAGMA foreign_key_check` no devuelve nada. Antes de publicar, se hace lo mismo con una copia del respaldo de producción.

## 5. Qué operaciones alcanza el borrado

- **Decision**: el borrado toma el `cliente_nombre_norm` y el `cliente_telefono` de la operación desde la que se pulsa y alcanza todas las operaciones sin borrar que tengan esos dos valores iguales, comparados con `IS` para que una venta con solo teléfono alcance también a las que solo tienen ese teléfono. Es la misma regla de FR-035 y FR-037 de la spec 001: el nombre normalizado y el teléfono por sus dígitos. En una transacción `IMMEDIATE`:
  1. se ponen en nulo `cliente_nombre`, `cliente_nombre_norm` y `cliente_telefono`;
  2. se guarda `datos_borrados_en` con la hora actual;
  3. se devuelve cuántas operaciones cambiaron.

  El detalle de la operación muestra antes la cuenta de `contarOperacionesDelCliente(id)`, y el aviso de éxito dice la cuenta real.
- **Rationale**: es la regla con la que el cliente ya consulta sus apartados, así que el borrado cubre exactamente lo que el cliente podría ver con sus datos. Al quedar en nulo, ni `buscarOperaciones` ni `consultarOperacionesCliente` pueden encontrarlas sin cambiar esas consultas (FR-017). Los importes y pagos no se tocan (FR-016).
- **Alternatives considered**:
  - Coincidencia parcial del nombre, como en la búsqueda del panel: borraría datos de otros clientes con nombres parecidos.
  - Solo por teléfono: borraría datos de otra persona que comparte el número.

## 6. Cómo se muestran las operaciones con datos borrados

- **Decision**: donde hoy se muestra el nombre del cliente (detalle, lista de operaciones y encargos pendientes), si `datos_borrados_en` tiene valor se muestra «Datos borrados a petición del cliente». En el detalle se muestra también la fecha y la hora del borrado. En esas operaciones no aparecen «Borrar datos del cliente» ni «Corregir» (FR-018), y `corregirOperacion` las rechaza con `ESTADO_NO_PERMITE`.
- **Rationale**: el texto es para quien lee la pantalla; guardarlo en la base mezclaría un texto de interfaz con un dato. Rechazar la corrección también en el servidor evita que alguien vuelva a capturar datos en una operación borrada.

## 7. Constancia en el detalle

- **Decision**: el detalle muestra uno de tres textos según `aviso_informado`:
  - `1`: «Se informó al cliente del aviso de privacidad», con la fecha y hora de `creado_en`;
  - `0` (solo ventas sin datos): no se muestra nada, porque no se capturaron datos;
  - nulo: «Sin constancia del aviso: se registró antes de que existiera».
- **Rationale**: FR-010 pide que la constancia tome la fecha de registro. Separar el nulo del `0` distingue las operaciones anteriores a la spec de las ventas que nunca tuvieron datos.

## 8. Respaldos

- **Decision**: los respaldos no se editan. El aviso dice que las copias de respaldo se conservan 14 días, el plazo de `DIAS_CONSERVADOS` en `src/lib/respaldo.ts`, y que después de ese plazo ya no contienen los datos borrados.
- **Rationale**: cubre el caso límite «Respaldos» de la spec con un plazo comprobable, sin abrir y reescribir archivos comprimidos en Supabase.

## 9. Textos nuevos (es-MX)

| Lugar | Texto |
|---|---|
| Pie de página | «Aviso de privacidad» |
| «Mis apartados» | «Consulta cómo usamos tus datos en nuestro aviso de privacidad.» |
| Casilla | «Se informó al cliente del aviso de privacidad» |
| Enlace de la casilla | «Ver aviso de privacidad (se abre en otra pestaña)» |
| Error de la casilla | «Informa al cliente del aviso de privacidad y marca la casilla.» |
| Botón | «Borrar datos del cliente» |
| Confirmación | «Se borrarán el nombre y el teléfono de N operaciones. Los importes y pagos se conservan. Esta acción no se puede deshacer.» |
| Éxito | «Datos del cliente borrados en N operaciones.» |
| Operación borrada | «Datos borrados a petición del cliente» |
| Sin constancia | «Sin constancia del aviso: se registró antes de que existiera» |

## 10. Guías de Next.js revisadas

Antes de implementar se revisan en `node_modules/next/dist/docs/` las guías de páginas estáticas del App Router y de `Link` con `target`, como pide `AGENTS.md`. No se usan APIs nuevas: la página del aviso es un componente de servidor sin datos dinámicos y las acciones siguen el patrón de `src/acciones/operaciones.ts`.
