# Feature Specification: Aviso de privacidad

**Feature Branch**: `003-aviso-privacidad`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "Aviso de privacidad para VendeProductos (Productos Eli's): una página pública con el aviso integral en /aviso-de-privacidad, enlazada desde el pie de página de la sección de cliente y desde «Mis apartados»; y una casilla en los formularios del vendedor, «Se informó al cliente del aviso de privacidad», que queda guardada con la operación como comprobante". Nace de research.md de la spec 001, que señaló el aviso como requisito antes de capturar datos reales de clientes.

## Relación con las specs 001 y 002

Las specs 001 y 002 están aprobadas y no se modifican. Esta spec agrega:

- una página nueva a la sección de cliente y un enlace en su pie de página;
- una línea con enlace en «Mis apartados» (FR-035 de la spec 001);
- una casilla en los formularios para registrar ventas, apartados y encargos (FR-021 y FR-022 de la spec 001), y el registro de esa casilla en cada operación;
- una acción para borrar los datos de contacto de un cliente que lo pida. Es una excepción acotada a FR-038 de la spec 001: solo se reemplazan el nombre y el teléfono; la operación, sus importes y sus pagos se conservan.

Todo lo demás de las specs 001 y 002 sigue igual.

## Contexto legal

El negocio no está constituido como empresa; el responsable de los datos es una persona física. El sistema guarda nombre y teléfono de clientes, y las operaciones y pagos asociados. Son datos que no se consideran sensibles, por lo que basta el consentimiento tácito: dar a conocer el aviso al cliente cuando se le piden los datos. Como el vendedor pide los datos en persona, el vendedor le da a conocer el aviso en ese momento y la app guarda constancia de que se hizo.

Esta spec fija los elementos mínimos que debe contener el aviso, no su redacción legal. El texto final debe revisarlo un abogado, porque en 2025 se publicó una nueva Ley Federal de Protección de Datos Personales en Posesión de los Particulares.

## Clarifications

### Session 2026-11-06

- Q: Si un cliente pide por correo que se borren sus datos (derecho de cancelación), ¿cómo debe atenderlo el vendedor en la app? → A: Con una acción «Borrar datos del cliente» que reemplaza el nombre y el teléfono por «Datos borrados a petición del cliente», con la fecha, y conserva el producto, los importes y los pagos.
- Q: ¿Qué debe decir el aviso sobre cuánto tiempo se guardan los datos del cliente? → A: Que se guardan mientras sirvan para dar seguimiento a las operaciones y para el historial del negocio, hasta que el cliente pida borrarlos; no hay borrado automático.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar el aviso de privacidad (Priority: P1)

Un cliente, antes o después de dar sus datos al vendedor, abre la página del negocio en su celular y encuentra el enlace «Aviso de privacidad» en el pie de cualquier página. Ahí lee quién es el responsable de sus datos, para qué se usan y cómo pedir que se los muestren, corrijan o borren. También llega al aviso escribiendo la dirección que le da el vendedor o desde la sección «Mis apartados», donde escribe su nombre y teléfono para consultar.

**Why this priority**: sin el aviso publicado no se pueden capturar datos reales de clientes; es lo que hoy frena las ventas, apartados y encargos en producción.

**Independent Test**: abrir el catálogo, una página de producto, la sección de artículos por encargo y «Mis apartados»; en cada una, pulsar el enlace del pie de página y comprobar que se abre el aviso con todos los elementos de FR-004. Abrir la dirección del aviso escribiéndola directamente en el navegador y comprobar que también se abre.

**Acceptance Scenarios**:

1. **Given** cualquier página de la sección de cliente, **When** el cliente baja al pie de página, **Then** ve el enlace «Aviso de privacidad» y, al pulsarlo, se abre el aviso.
2. **Given** la sección «Mis apartados», **When** el cliente ve el formulario de consulta, **Then** junto a él hay una línea con un enlace al aviso de privacidad.
3. **Given** el aviso abierto, **When** el cliente lo lee, **Then** encuentra el nombre y domicilio del responsable, los datos que se recaban, para qué se usan, y el correo para ejercer sus derechos.
4. **Given** el aviso abierto en un celular, **When** el cliente lo lee, **Then** el texto se lee sin hacer zoom ni desplazarse hacia los lados.
5. **Given** que alguien escribe la dirección del aviso en su navegador, **When** se abre, **Then** ve el aviso sin iniciar sesión.
6. **Given** el aviso abierto, **When** el cliente pulsa el correo de contacto, **Then** su celular abre un correo nuevo dirigido a esa dirección.

---

### User Story 2 - Dejar constancia de que se informó al cliente (Priority: P2)

Al registrar un apartado o un encargo, o una venta en la que el cliente da su nombre o teléfono, el vendedor le muestra o menciona el aviso de privacidad y marca la casilla «Se informó al cliente del aviso de privacidad». El sistema no deja guardar la operación con datos del cliente si la casilla no está marcada. Después, en el detalle de la operación, el vendedor ve que se informó y cuándo.

**Why this priority**: es el comprobante de que el aviso se dio a conocer al pedir los datos; sin él, el negocio no podría demostrarlo. Depende de que el aviso exista (US1).

**Independent Test**: registrar un apartado sin marcar la casilla y comprobar que el sistema no lo guarda y explica por qué; marcarla y comprobar que se guarda. Registrar una venta sin nombre ni teléfono sin marcar la casilla y comprobar que se guarda. Abrir el detalle de ambas operaciones y comprobar lo que muestra cada una.

**Acceptance Scenarios**:

1. **Given** el formulario de apartado o encargo, **When** el vendedor lo abre, **Then** ve la casilla «Se informó al cliente del aviso de privacidad», sin marcar.
2. **Given** un apartado o encargo con todos sus datos y la casilla sin marcar, **When** el vendedor intenta guardarlo, **Then** el sistema no lo guarda y muestra un mensaje claro junto a la casilla que pide informar al cliente y marcarla.
3. **Given** un apartado o encargo con la casilla marcada, **When** el vendedor lo guarda, **Then** se registra la operación junto con la constancia de que se informó al cliente.
4. **Given** una venta en la que el vendedor escribió el nombre o el teléfono del comprador, **When** intenta guardarla con la casilla sin marcar, **Then** el sistema no la guarda y muestra el mismo mensaje.
5. **Given** una venta sin nombre ni teléfono del comprador, **When** el vendedor la guarda con la casilla sin marcar, **Then** la venta se registra, porque no se capturaron datos del cliente.
6. **Given** una operación guardada con la casilla marcada, **When** el vendedor abre su detalle, **Then** ve «Se informó al cliente del aviso de privacidad» con la fecha y hora de registro de la operación.
7. **Given** una operación registrada antes de esta spec, **When** el vendedor abre su detalle, **Then** ve que no hay constancia del aviso porque se registró antes de que existiera.
8. **Given** el formulario de venta, apartado o encargo, **When** el vendedor ve la casilla, **Then** junto a ella hay un enlace que abre el aviso de privacidad, para mostrárselo al cliente si lo pide.

---

### User Story 3 - Borrar los datos de un cliente que lo pide (Priority: P3)

Un cliente manda un correo pidiendo que se borren sus datos. El vendedor busca sus operaciones por nombre o teléfono, abre una de ellas y pulsa «Borrar datos del cliente». El sistema le muestra cuántas operaciones tienen ese mismo nombre y teléfono y le pide confirmar. Al confirmar, en todas ellas el nombre y el teléfono se reemplazan por «Datos borrados a petición del cliente», con la fecha, y el producto, los importes y los pagos siguen iguales.

**Why this priority**: el aviso promete el derecho de cancelación y sin esta acción no podría cumplirse. Se usará pocas veces y depende de que existan operaciones con datos (US2).

**Independent Test**: registrar dos apartados y una venta con el mismo nombre y teléfono, con pagos. Borrar los datos del cliente desde uno de ellos y comprobar que las tres operaciones muestran «Datos borrados a petición del cliente», que sus importes, pagos y saldos no cambiaron, y que ni la búsqueda del panel ni «Mis apartados» las encuentran con el nombre o el teléfono anteriores.

**Acceptance Scenarios**:

1. **Given** el detalle de una operación con nombre y teléfono, **When** el vendedor pulsa «Borrar datos del cliente», **Then** el sistema le dice cuántas operaciones tienen ese mismo nombre y teléfono, le advierte que no se puede deshacer y le pide confirmar.
2. **Given** la confirmación abierta, **When** el vendedor confirma, **Then** en todas esas operaciones el nombre y el teléfono se reemplazan por «Datos borrados a petición del cliente» y se guarda la fecha y hora del borrado.
3. **Given** la confirmación abierta, **When** el vendedor la cancela, **Then** no cambia ninguna operación.
4. **Given** operaciones con los datos borrados, **When** el vendedor revisa sus importes, pagos, saldos y estados, **Then** son los mismos que antes del borrado, al centavo.
5. **Given** operaciones con los datos borrados, **When** alguien busca en el panel o consulta en «Mis apartados» con el nombre o el teléfono anteriores, **Then** no aparecen.
6. **Given** un apartado o encargo pendiente con los datos borrados, **When** el vendedor registra un pago o lo entrega, **Then** puede hacerlo como con cualquier otra operación.
7. **Given** una venta registrada sin nombre ni teléfono, **When** el vendedor abre su detalle, **Then** no aparece la acción «Borrar datos del cliente».

---

### Edge Cases

- **Venta con datos borrados antes de guardar**: si el vendedor escribe un nombre o teléfono y luego los borra, la casilla deja de ser obligatoria; cuenta lo que hay en el formulario al guardar.
- **Solo espacios**: un nombre o teléfono con solo espacios cuenta como vacío, igual que en la spec 001.
- **Corrección de datos (FR-043 de la spec 001)**: al corregir nombre o teléfono de un apartado o encargo, no se vuelve a pedir la casilla; la constancia de la operación se conserva igual.
- **Venta sin datos**: como las ventas no admiten correcciones en la spec 001, una venta registrada sin datos del cliente no puede recibirlos después.
- **Operaciones anuladas o canceladas**: conservan su constancia del aviso como cualquier otra información de la operación.
- **Cliente que pide ver el aviso en el momento**: el vendedor lo abre desde el enlace junto a la casilla y se lo muestra en su celular, o le dice la dirección de la página para que lo abra en el suyo.
- **Cliente que no acepta el aviso**: si el cliente se opone a que se usen sus datos, no se registra el apartado ni el encargo; una venta puede registrarse sin sus datos.
- **Mismo cliente escrito distinto**: el borrado alcanza las operaciones cuyo nombre y teléfono coinciden con las reglas de búsqueda de FR-037 de la spec 001. Si el cliente aparece con otro teléfono, el vendedor repite el borrado desde una operación con ese teléfono.
- **Datos ya borrados**: una operación con los datos borrados no ofrece otra vez la acción ni permite corregir el nombre o el teléfono (FR-043 de la spec 001).
- **Respaldos**: los respaldos anteriores al borrado conservan los datos hasta que se reemplazan por respaldos nuevos; no se editan.

## Requirements *(mandatory)*

### Functional Requirements

**Página del aviso**

- **FR-001**: La sección de cliente MUST tener una página pública con el aviso de privacidad integral, en la dirección `/aviso-de-privacidad`, con el mismo encabezado y pie de página que el resto de la sección y sin pedir inicio de sesión.
- **FR-002**: El pie de página de todas las páginas de la sección de cliente MUST incluir un enlace «Aviso de privacidad» a esa página. La barra de navegación MUST NOT incluirlo.
- **FR-003**: La sección «Mis apartados» MUST mostrar, junto al formulario de consulta, una línea con un enlace al aviso de privacidad.
- **FR-004**: El aviso MUST contener, como mínimo:
  - el nombre del responsable, **Emmanuel Cristóbal Trejo**, y su domicilio, **Andador Poleo No. 20, Col. La Magdalena Chichicaspa, Huixquilucan, Estado de México**;
  - los datos que se recaban: nombre y teléfono del cliente, y las ventas, apartados, encargos y pagos asociados;
  - para qué se usan: registrar y dar seguimiento a las ventas, apartados y encargos; contactar al cliente sobre ellos, y permitirle consultar sus apartados y encargos;
  - que los datos no se usan para publicidad ni se comparten con terceros para sus propios fines, y que se guardan con proveedores de tecnología que solo los almacenan por cuenta del negocio;
  - cuánto tiempo se guardan: mientras sirvan para dar seguimiento a las operaciones y para el historial del negocio, hasta que el cliente pida borrarlos. El aviso MUST NOT prometer un plazo de borrado automático;
  - cómo ejercer los derechos de acceso, rectificación, cancelación y oposición, y cómo revocar el consentimiento: por correo a **emmanuelcristobal@yahoo.com.mx**, con una identificación del titular;
  - el teléfono del negocio que ya muestra el catálogo, para dudas;
  - cómo se darán a conocer los cambios al aviso: en esta misma página;
  - la fecha de su última actualización.
- **FR-005**: El correo de contacto del aviso MUST ser un enlace que abra un correo nuevo dirigido a esa dirección, y el teléfono un enlace que inicie la llamada.
- **FR-006**: El aviso MUST leerse en un celular sin hacer zoom ni desplazarse hacia los lados, con títulos que separen cada elemento de FR-004.

**Constancia en las operaciones**

- **FR-007**: Los formularios para registrar venta, apartado y encargo MUST mostrar una casilla con la etiqueta «Se informó al cliente del aviso de privacidad», sin marcar al abrir el formulario, y junto a ella un enlace que abra el aviso.
- **FR-008**: El sistema MUST rechazar un apartado o un encargo si la casilla no está marcada, con un mensaje claro junto a la casilla.
- **FR-009**: El sistema MUST rechazar una venta con nombre o teléfono del comprador si la casilla no está marcada, con el mismo mensaje. Una venta sin nombre ni teléfono MUST poder registrarse con la casilla sin marcar.
- **FR-010**: Cada operación MUST guardar si se informó al cliente del aviso de privacidad. La constancia toma la fecha y hora de registro de la operación.
- **FR-011**: El detalle de cada operación en el panel MUST mostrar si se informó al cliente del aviso, con la fecha y hora de registro. Las operaciones registradas antes de esta spec MUST mostrarse sin constancia, indicando que se registraron antes del aviso.
- **FR-012**: La constancia MUST NOT poder editarse ni borrarse después de registrar la operación, y MUST NOT mostrarse en la sección de cliente.

**Borrado de datos a petición del cliente**

- **FR-013**: El detalle de cada operación con nombre o teléfono del cliente MUST ofrecer la acción «Borrar datos del cliente», en cualquier estado de la operación.
- **FR-014**: Antes de borrar, el sistema MUST mostrar cuántas operaciones tienen el mismo nombre y teléfono, según las reglas de FR-037 de la spec 001, advertir que no se puede deshacer y pedir confirmación.
- **FR-015**: Al confirmar, el sistema MUST reemplazar el nombre y el teléfono de todas esas operaciones por «Datos borrados a petición del cliente» y guardar la fecha y hora del borrado, que se muestra en el detalle de cada operación.
- **FR-016**: El borrado MUST NOT cambiar el producto, la cantidad, el precio acordado, los pagos, el saldo, el estado ni la constancia del aviso de ninguna operación.
- **FR-017**: Las operaciones con los datos borrados MUST NOT aparecer al buscar o consultar con el nombre o el teléfono anteriores, ni en el panel ni en «Mis apartados», y MUST seguir aceptando pagos, entrega, cancelación y anulación como cualquier otra.
- **FR-018**: Una operación con los datos borrados MUST NOT ofrecer otra vez la acción ni permitir corregir el nombre o el teléfono.

**Generales**

- **FR-019**: Todo texto nuevo MUST estar en español de México y las fechas y horas mostrarse como indica FR-039 de la spec 001. La casilla, los enlaces y la página MUST tener etiquetas claras y buen contraste. (Constitución III y VII)

### Key Entities

- **Aviso de privacidad**: texto público con los elementos de FR-004 y su fecha de última actualización. No es un dato que el vendedor capture.
- **Venta, Apartado y Encargo**: los mismos de la spec 001, con dos datos nuevos: si se informó al cliente del aviso de privacidad, y la fecha y hora en que se borraron los datos del cliente, si los pidió borrar. Las operaciones anteriores a esta spec quedan sin constancia del aviso.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Desde cualquier página de la sección de cliente, una persona llega al aviso de privacidad en 2 toques o menos, desde su celular.
- **SC-002**: 9 de cada 10 personas que abren el aviso por primera vez encuentran, sin ayuda y en menos de 1 minuto, el nombre del responsable y el correo para pedir que se borren sus datos.
- **SC-003**: En una prueba de 10 operaciones con datos del cliente (apartados, encargos y ventas con nombre o teléfono), ninguna se guarda sin la casilla marcada y todas muestran la constancia en su detalle.
- **SC-004**: Una venta sin datos del comprador se registra en el mismo número de pasos que antes de esta spec.
- **SC-005**: El propietario revisa el aviso publicado y confirma que contiene cada elemento de FR-004.
- **SC-006**: El vendedor borra los datos de un cliente con 3 operaciones en menos de 2 minutos, y después las 3 conservan sus importes, pagos y saldos al centavo y ya no aparecen al buscar con el nombre o el teléfono anteriores.

## Assumptions

- **Texto del aviso**: el propietario aprueba la redacción completa antes de publicarla, idealmente con revisión de un abogado. Actualizar la redacción o la fecha del aviso, sin cambiar los elementos de FR-004 ni el comportamiento de la app, se hace con una nueva publicación y no requiere una spec nueva. Editarlo desde el panel queda fuera de alcance.
- **Cómo se da a conocer el aviso en persona**: al pedir los datos, el vendedor le avisa al cliente que existe el aviso de privacidad y, si el cliente quiere verlo, se lo muestra desde el enlace junto a la casilla o le dice la dirección de la página. Un letrero o una tarjeta con código QR es opcional y queda a criterio del negocio, fuera de la app.
- **Consulta de «Mis apartados»**: el nombre y teléfono que escribe el cliente para consultar no se guardan como datos nuevos; por eso esa sección solo lleva el enlace y no una casilla.
- **Proveedores de tecnología**: el servidor de la app y el servicio de respaldos almacenan los datos por cuenta del negocio; el aviso los menciona de forma general, sin nombrarlos.
- **Fuera de alcance**: aceptación expresa del cliente en la app, cuentas de cliente, formulario en línea para los derechos de acceso, rectificación, cancelación y oposición, borrado automático de datos, borrado de datos dentro de los respaldos, avisos de cookies y versiones anteriores del aviso.
