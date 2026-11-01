# Feature Specification: VendeProductos v0: catálogo, ventas, apartados y encargos

**Feature Branch**: `001-catalogo-ventas-apartados`

**Created**: 2026-10-31

**Status**: Approved

**Input**: User description: "Especificación VendeProductos v0 para Productos Eli's: catálogo web para mostrar productos a los clientes y registro simple de ventas, apartados y encargos con sus pagos (EU1–EU7, RF1–RF25, CA1–CA5)". Las referencias entre paréntesis (RF, EU, CA) remiten a esa descripción original.

## Clarifications

### Session 2026-10-31

- Q: ¿La subcategoría "Todos" es una subcategoría real o solo el filtro que muestra toda la categoría? → A: Solo filtro; muestra todos los productos de la categoría y no se asigna a ningún producto.
- Q: ¿Cómo entran los vendedores a la sección de administrador? → A: Con un único usuario y contraseña compartido.
- Q: ¿Qué se hace cuando una venta se registró por error? → A: Se anula con un motivo, esté o no entregada, las unidades regresan y se registra la venta correcta; la anulada queda visible como Anulada.
- Q: ¿Qué datos se pueden corregir en un apartado o encargo ya registrado? → A: Nombre, teléfono y precio acordado, hasta antes de entregar; el total no puede quedar por debajo de lo pagado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrar el catálogo de productos (Priority: P1)

El vendedor entra a la sección de administrador, da de alta un producto con sus fotos, nombre, descripción, categoría, subcategoría, cantidad existente, precio de compra y precio de venta, y después puede editarlo, filtrarlo o darlo de baja. Si la categoría o subcategoría que necesita no existe, la crea en el mismo momento del alta. (EU1, RF1–RF5, RF7, RF8, RF25, CA1)

**Why this priority**: sin productos registrados no hay nada que mostrar ni que vender; es la base de todo lo demás.

**Independent Test**: entrar como administrador, registrar un producto en una subcategoría nueva, editar su precio y confirmar que aparece en la lista con los datos correctos.

**Acceptance Scenarios**:

1. **Given** un administrador con sesión iniciada, **When** registra un producto con todos sus datos, **Then** el producto aparece en la lista de administrador con su foto, cantidad, precio de compra y precio de venta.
2. **Given** una categoría que no existe, **When** el administrador la escribe al dar de alta un producto, **Then** la categoría queda creada y disponible para otros productos.
3. **Given** un producto registrado, **When** el administrador edita nombre, descripción, precio de compra, precio de venta o existencia, **Then** los cambios se ven de inmediato en ambas secciones, y las ventas, apartados y encargos ya registrados conservan su precio acordado.
4. **Given** un producto sin apartados ni encargos vigentes, **When** el administrador lo da de baja, **Then** deja de mostrarse en el catálogo y su historial sigue consultable en la sección de administrador.
5. **Given** una persona sin sesión de administrador, **When** intenta entrar a la sección de administrador, **Then** el sistema le niega el acceso.
6. **Given** un alta de producto sin foto, **When** el administrador intenta guardarla, **Then** el sistema no la guarda e indica que falta la foto.

---

### User Story 2 - Consultar el catálogo como cliente (Priority: P1)

El cliente, o el vendedor frente a él, abre el catálogo en su móvil, ve todos los productos, filtra por categoría y subcategoría, y consulta precio, cantidad disponible, la leyenda de no devoluciones y el teléfono de contacto. (EU1, RF6, RF17, RF18, RF24)

**Why this priority**: es el propósito inicial del negocio: mostrar los productos sin tener que cargar con ellos.

**Independent Test**: con productos ya registrados, abrir el catálogo sin iniciar sesión en un móvil y comprobar la información de cada producto y los filtros.

**Acceptance Scenarios**:

1. **Given** productos registrados, **When** el cliente entra al catálogo, **Then** ve todos los productos activos con foto, nombre, descripción, categoría, precio de venta y cantidad disponible.
2. **Given** el catálogo abierto, **When** el cliente filtra por una categoría o por una categoría y subcategoría, **Then** ve solo los productos que corresponden.
3. **Given** cualquier producto mostrado, **When** el cliente lo consulta, **Then** ve la leyenda "Favor de revisar el producto antes de comprarlo, ya que no hay devoluciones." y el teléfono de contacto.
4. **Given** cualquier producto, **When** el cliente lo consulta, **Then** en ningún lugar de su sección aparece el precio de compra.
5. **Given** un producto sin unidades disponibles, **When** el cliente entra al catálogo, **Then** lo ve marcado como "Agotado, disponible por encargo".
6. **Given** artículos por encargo registrados, **When** el cliente abre esa sección, **Then** los ve separados del catálogo, con su precio y el teléfono de contacto, y sin cantidad disponible.

---

### User Story 3 - Registrar una venta con precio negociado (Priority: P2)

El cliente compra un producto disponible. El vendedor registra la venta; el precio aparece igual al de catálogo y puede cambiarlo si decide dar un descuento. El nombre y el teléfono del comprador son opcionales. La disponibilidad se actualiza sola y el vendedor marca la entrega. (EU4, EU7, RF9, RF10, RF15, RF16, CA2)

**Why this priority**: registrar ventas es el segundo objetivo del negocio y mantiene correcta la disponibilidad que ve el cliente.

**Independent Test**: registrar la venta de una unidad a un precio distinto al de catálogo y comprobar que la cantidad disponible baja en ambas secciones y que el precio del catálogo no cambia.

**Acceptance Scenarios**:

1. **Given** un producto con unidades disponibles, **When** el administrador lo abre, **Then** se ofrecen las opciones de venta y apartado, y no la de encargo.
2. **Given** una venta en captura, **When** el administrador cambia el precio ofrecido, **Then** la venta guarda ese precio y el precio de venta del catálogo permanece igual.
3. **Given** una venta sin nombre ni teléfono del comprador, **When** el administrador la registra, **Then** el sistema la acepta.
4. **Given** una venta registrada de N unidades, **When** se consulta el producto en cualquier sección, **Then** la cantidad disponible disminuyó en N.
5. **Given** una venta registrada, **When** el administrador marca la entrega, **Then** la venta queda en estado Entregada.
6. **Given** una venta de N unidades registrada por error, **When** el administrador la anula con un motivo, **Then** queda en estado Anulada, sigue visible en las búsquedas y la existencia y la disponibilidad aumentan en N.

---

### User Story 4 - Apartar un producto y registrar sus pagos (Priority: P2)

El cliente quiere apartar un producto. El vendedor registra el apartado con nombre, teléfono, precio acordado y un pago inicial. Después registra los pagos siguientes hasta cubrir el total; entonces el apartado pasa a Pagado y el vendedor entrega el producto. (EU2, EU3, EU4, EU7, RF9, RF11–RF13, RF16, RF23, CA2, CA3)

**Why this priority**: evita llevar en la memoria o en papel quién debe cuánto, y evita vender dos veces la misma unidad.

**Independent Test**: registrar un apartado con pago inicial, ver que baja la disponibilidad, registrar pagos hasta cubrir el total y confirmar el cambio a Pagado y luego a Entregado.

**Acceptance Scenarios**:

1. **Given** un producto con unidades disponibles, **When** el administrador registra un apartado sin nombre, teléfono o pago inicial, **Then** el sistema no lo guarda e indica qué dato falta.
2. **Given** un producto con 5 existentes, **When** se registra un apartado de 2, **Then** el catálogo muestra 3 disponibles.
3. **Given** un apartado con saldo restante, **When** el administrador registra un pago, **Then** el desglose muestra el pago con su fecha y el saldo restante se actualiza al centavo.
4. **Given** un apartado con saldo de $100.00 MXN, **When** el administrador intenta registrar un pago de $150.00 MXN, **Then** el sistema lo rechaza e indica el saldo restante.
5. **Given** un apartado con saldo restante, **When** un pago cubre exactamente el total, **Then** el estado cambia automáticamente a Pagado.
6. **Given** un apartado con saldo restante, **When** el administrador intenta marcar la entrega, **Then** el sistema no lo permite.
7. **Given** un apartado Pagado, **When** el administrador marca la entrega, **Then** el estado cambia a Entregado, la existencia disminuye y la cantidad disponible no vuelve a cambiar.
8. **Given** un apartado no entregado de 2 unidades con pagos registrados, **When** el administrador lo cancela con un motivo, **Then** el estado cambia a Cancelado, la disponibilidad aumenta en 2 y los pagos siguen visibles como no devueltos.
9. **Given** un apartado con $300.00 MXN pagados de un total de $500.00 MXN, **When** el administrador corrige el precio para que el total sea $400.00 MXN, **Then** el saldo restante es $100.00 MXN; si intenta un total de $200.00 MXN, el sistema lo rechaza.

---

### User Story 5 - Tomar encargos y revisarlos antes de surtirse (Priority: P3)

Cuando no hay disponibilidad, o el artículo no se maneja, el vendedor toma un encargo con los datos del cliente, un precio y un anticipo, y va registrando los pagos. Antes de ir a surtirse revisa la lista de encargos pendientes. (EU5, EU6, RF12, RF13, RF15, RF19–RF21, RF23, CA2, CA3)

**Why this priority**: recupera ventas que de otro modo se perderían, pero depende de que el catálogo y los pagos ya funcionen.

**Independent Test**: agotar un producto, registrar un encargo con anticipo y verificar que aparece en la lista de encargos pendientes con su saldo.

**Acceptance Scenarios**:

1. **Given** un producto sin unidades disponibles, **When** el administrador lo abre, **Then** se ofrece la opción de encargo y no las de venta y apartado.
2. **Given** un artículo que no está en el catálogo, **When** el administrador registra un encargo, **Then** captura nombre, descripción y el precio que él establece.
3. **Given** un encargo sin nombre, teléfono, precio o anticipo, **When** el administrador intenta guardarlo, **Then** el sistema no lo guarda e indica qué dato falta.
4. **Given** encargos no entregados, **When** el administrador consulta los encargos pendientes, **Then** ve de cada uno el artículo, la cantidad, el cliente, lo pagado y el saldo restante.
5. **Given** un encargo, **When** se registra, paga o entrega, **Then** la existencia y la disponibilidad del producto no cambian.
6. **Given** un encargo con el total cubierto, **When** el administrador marca la entrega, **Then** el estado pasa de Pagado a Entregado y sale de la lista de pendientes.
7. **Given** un encargo no entregado, **When** el administrador lo cancela con un motivo, **Then** el estado cambia a Cancelado, sale de la lista de pendientes y sus pagos se conservan como no devueltos.

---

### User Story 6 - El cliente consulta sus apartados y encargos (Priority: P3)

El cliente, sin iniciar sesión, escribe su nombre y teléfono en su sección y ve sus apartados y encargos por producto, con el desglose de pagos y lo que le falta por pagar. (RF14, CA5)

**Why this priority**: da confianza al cliente y reduce consultas al vendedor, pero el negocio puede operar sin ello.

**Independent Test**: con un apartado que tiene dos pagos, consultar con el nombre y teléfono del cliente y comparar el desglose contra lo registrado.

**Acceptance Scenarios**:

1. **Given** un cliente con apartados y encargos, **When** consulta con su nombre y teléfono, **Then** ve cada producto con su estado, precio acordado, pagos con fecha, total pagado y saldo restante.
2. **Given** un nombre y teléfono que no coinciden juntos con ningún registro, **When** se hace la consulta, **Then** el sistema muestra un mensaje de que no se encontró información, sin revelar si alguno de los dos datos existe.
3. **Given** un cliente con la consulta abierta, **When** revisa la información, **Then** no aparece el precio de compra ni datos de otros clientes.

---

### User Story 7 - Buscar ventas, apartados y encargos (Priority: P3)

El administrador busca operaciones por fecha de pago, nombre o teléfono, solos o combinados, para atender a un cliente o revisar lo cobrado. (RF13, RF22, CA3, CA4)

**Why this priority**: se vuelve necesaria conforme crece el historial, no el primer día.

**Independent Test**: registrar operaciones de dos clientes en fechas distintas y buscar por cada criterio.

**Acceptance Scenarios**:

1. **Given** operaciones registradas, **When** el administrador busca por un rango de fechas de pago, **Then** ve las operaciones con algún pago en ese rango; la fecha de pago de una venta es la fecha de la venta.
2. **Given** operaciones registradas, **When** busca por nombre o por teléfono, **Then** ve las de ese cliente.
3. **Given** un resultado de apartado o encargo, **When** lo abre, **Then** ve el desglose de pagos, el saldo restante y el estado.
4. **Given** una venta sin datos del comprador, **When** el administrador busca por fecha, **Then** la encuentra.

---

### Edge Cases

- **Última unidad**: si dos registros compiten por la última unidad disponible, solo el primero se completa y el segundo recibe un aviso de que ya no hay disponibilidad.
- **Cantidad mayor a la disponible**: una venta o apartado por más unidades de las disponibles se rechaza, indicando cuántas hay.
- **Cliente que pide más de lo disponible**: se registra primero una venta o un apartado por las unidades disponibles y después un encargo por el resto.
- **Pago inicial que cubre el total**: el apartado o encargo nace en estado Pagado.
- **Importes inválidos**: se rechazan precios y pagos en cero, negativos o con más de dos decimales.
- **Pago capturado por error**: no se borra; se anula de forma lógica, sigue visible como anulado para el administrador, deja de sumar y el saldo y el estado se recalculan.
- **Cambio de precio con operaciones abiertas**: los apartados y encargos conservan su precio acordado.
- **Baja con operaciones vigentes**: un producto con apartados o encargos vigentes, o un artículo por encargo con encargos vigentes, no se puede dar de baja hasta que se entreguen o se cancelen.
- **Cancelación con saldo cubierto**: un apartado o encargo Pagado aún puede cancelarse antes de entregarse; lo pagado queda como no devuelto.
- **Producto que se agota y se resurte**: al aumentar la existencia, deja de mostrarse como agotado y vuelve a ofrecer venta y apartado.
- **Última foto**: no se puede quitar la única foto de un producto.
- **Reducción de existencia**: no se permite capturar una existencia menor a las unidades de apartados vigentes.
- **Categoría repetida**: si el nombre escrito coincide con uno existente, sin importar mayúsculas ni acentos, se usa el existente y no se crea un duplicado.
- **Baja de categoría o subcategoría con productos activos**: no se permite mientras tenga productos activos.
- **Misma persona con varios apartados**: la consulta y la búsqueda muestran todos.
- **Filtro sin resultados**: se muestra un mensaje claro en lugar de una página vacía.

## Requirements *(mandatory)*

### Functional Requirements

**Acceso y roles**

- **FR-001**: El sistema MUST ofrecer una sección de administrador protegida por un único usuario y contraseña, compartido por quienes venden, desde la que se gestionan productos, categorías, ventas, apartados, encargos y pagos. (RF1)
- **FR-002**: El sistema MUST ofrecer una sección de cliente de libre acceso, sin inicio de sesión, solo de consulta. (RF6)
- **FR-003**: El precio de compra MUST ser visible únicamente en la sección de administrador; el precio de venta es visible en ambas secciones. (RF24)

**Categorías**

- **FR-004**: El sistema MUST organizar los productos en un máximo de dos niveles, categoría y subcategoría. Cada producto MUST pertenecer a una categoría y, si aplica, a una de sus subcategorías. (RF4)
- **FR-005**: El sistema MUST iniciar con estas categorías: Juguetes (Niñas, Niños, Bebés), Ropa (Adulto mujer, Adulto hombre, Niño, Niña) y Otros artículos (sin subcategorías). "Todos" MUST mostrarse como opción de filtro en cada categoría, y al elegirla se ven todos sus productos; no es una subcategoría y no se asigna a productos. (RF4)
- **FR-006**: El administrador MUST poder crear, renombrar y dar de baja categorías y subcategorías. (RF2)
- **FR-007**: Al dar de alta un producto, el sistema MUST crear la categoría o subcategoría indicada si no existe. (RF3)

**Productos y catálogo**

- **FR-008**: El administrador MUST poder registrar un producto con nombre, descripción, categoría, subcategoría si aplica, cantidad existente, precio de compra, precio de venta y fotos. (RF8)
- **FR-009**: El administrador MUST poder editar esos mismos datos, incluidas las fotos y la cantidad existente para reflejar nueva mercancía o ajustes. (RF5)
- **FR-010**: Ambas secciones MUST mostrar al entrar todos los productos activos y permitir filtrar por categoría y por subcategoría. (RF6, RF7)
- **FR-011**: La cantidad disponible MUST ser igual a la existencia menos las unidades de apartados vigentes, es decir, sin entregar ni cancelar. (EU2)
- **FR-012**: La sección de cliente MUST mostrar por producto sus fotos, nombre, descripción, categoría, subcategoría si tiene, precio de venta y cantidad disponible, junto con el teléfono de contacto del negocio.
- **FR-013**: Cada producto mostrado MUST incluir la leyenda "Favor de revisar el producto antes de comprarlo, ya que no hay devoluciones." (RF17)
- **FR-014**: Todo producto del catálogo con unidades disponibles MUST corresponder a mercancía física; lo que no está en existencia solo se muestra según FR-015. (RF18)
- **FR-015**: Un producto sin unidades disponibles MUST seguir en el catálogo marcado como "Agotado, disponible por encargo". La sección de cliente MUST incluir una sección de artículos por encargo, claramente separada del catálogo, para que estos artículos no se confundan con mercancía en existencia. (RF18, RF19, RF21)
- **FR-016**: Cada producto MUST tener al menos una foto y admitir varias; ambas secciones las muestran, y cada foto MUST tener texto alternativo basado en el nombre del producto. El administrador MUST poder agregar y quitar fotos, sin dejar un producto en cero.

**Operaciones**

- **FR-017**: Para un producto con unidades disponibles, el sistema MUST ofrecer venta y apartado; sin unidades disponibles, MUST ofrecer solo encargo. (RF15, RF21)
- **FR-018**: Cada venta, apartado o encargo MUST corresponder a un producto o artículo y a una cantidad de una o más unidades.
- **FR-019**: Al registrar una operación, el sistema MUST proponer como precio unitario el precio de venta vigente, permitir cambiarlo y guardarlo como precio acordado, independiente del precio de catálogo. (EU4, RF9)
- **FR-020**: El total de la operación MUST ser el precio acordado por la cantidad, exacto al centavo. No se calcula ni se registra IVA.
- **FR-021**: Una venta MUST pedir nombre y teléfono del comprador de forma opcional y considerarse pagada por completo al registrarse. (RF10)
- **FR-042**: El administrador MUST poder anular una venta registrada por error, entregada o no, capturando un motivo. La anulación es lógica, regresa las unidades a la existencia y a la disponibilidad, y la venta anulada MUST NOT contarse como vendida. No sustituye a una devolución: se usa solo para corregir la captura. El pago automático de la venta anulada se conserva como registro, y la venta sigue apareciendo en las búsquedas por fecha con estado Anulada. (RF25)
- **FR-022**: Un apartado o encargo MUST exigir nombre, teléfono y un pago inicial mayor a cero. (RF11, RF12)
- **FR-023**: El sistema MUST actualizar la cantidad disponible en ambas secciones al registrar una venta o un apartado. (RF16)
- **FR-024**: Los encargos MUST NOT modificar la existencia ni la disponibilidad de ningún producto.
- **FR-025**: La sección de artículos por encargo MUST ser administrada por el vendedor, quien registra, edita y da de baja artículos con nombre, descripción, precio y fotos opcionales. Al cliente se le muestran con esos datos, la leyenda de FR-013 y el teléfono de contacto, sin cantidad disponible. (RF19, RF20)
- **FR-026**: El administrador MUST poder consultar los encargos sin entregar ni cancelar con artículo, cantidad, cliente, total pagado y saldo restante. (EU6)
- **FR-027**: El administrador MUST poder cancelar un apartado o encargo no entregado capturando un motivo. La cancelación es lógica: las unidades apartadas vuelven a estar disponibles, los pagos se conservan como no devueltos, no se registra devolución de dinero ni saldo a favor, y la operación ya no admite pagos ni entrega. (RF25)

**Pagos y estados**

- **FR-043**: El administrador MUST poder corregir nombre, teléfono y precio acordado de un apartado o encargo que no esté entregado ni cancelado. El sistema MUST rechazar un precio cuyo total quede por debajo de lo pagado y recalcular el saldo y el estado. El producto y la cantidad no se pueden corregir.
- **FR-028**: El administrador MUST poder registrar pagos sucesivos en un apartado o encargo; cada pago guarda importe, fecha y hora. (RF13)
- **FR-029**: El sistema MUST mostrar el desglose de pagos por producto y por nombre y teléfono del cliente, con total pagado y saldo restante. (RF13)
- **FR-030**: El sistema MUST rechazar cualquier pago que exceda el saldo restante.
- **FR-031**: El estado de un apartado o encargo MUST ser Pendiente mientras tenga saldo y cambiar automáticamente a Pagado cuando el saldo llegue a cero; también puede terminar en Entregado o Cancelado. (RF23)
- **FR-032**: El administrador MUST poder marcar como entregada una venta o un apartado o encargo Pagado; el sistema MUST impedir la entrega con saldo restante. (EU7)
- **FR-033**: Al entregar un apartado, la existencia MUST disminuir en la cantidad entregada sin alterar la cantidad disponible.
- **FR-034**: Al anular de forma lógica un pago, el sistema MUST recalcular el saldo y el estado; un pago de una operación entregada o cancelada MUST NOT poder anularse.

**Consultas**

- **FR-035**: La sección de cliente MUST permitir consultar con nombre y teléfono, ambos coincidiendo, los apartados y encargos por producto, con estado, desglose de pagos y saldo restante. Las operaciones canceladas se muestran con su estado y lo pagado, sin saldo por cubrir; los pagos anulados no se muestran al cliente. (RF14, CA5)
- **FR-036**: La sección de administrador MUST permitir buscar ventas, apartados y encargos por rango de fechas de pago, nombre completo o parcial, o teléfono, solos o combinados. (RF22, CA4)
- **FR-037**: Las búsquedas por nombre MUST ignorar mayúsculas, acentos y espacios sobrantes; el teléfono se compara solo por sus dígitos.

**Reglas generales**

- **FR-038**: Ninguna acción MUST borrar información de forma definitiva; toda baja es lógica y conserva el historial. (RF25)
- **FR-039**: Todo el producto MUST mostrarse en español de México, con importes como `$1,250.00 MXN`, fechas como `31 de octubre de 2026` y horas con a. m. o p. m. y zona horaria. (Constitución II, III)
- **FR-040**: El sistema MUST validar que el teléfono tenga 10 dígitos, tanto el obligatorio como el opcional cuando se captura.
- **FR-041**: La administración y el catálogo MUST funcionar en móvil; la administración además en portátil. La interfaz MUST tener etiquetas claras y buen contraste. (Constitución VII)
- **FR-044**: El sistema MUST bloquear temporalmente el inicio de sesión tras 5 intentos fallidos en 15 minutos y la consulta de clientes tras 10 consultas en 15 minutos, mostrando un mensaje que pida intentar más tarde.
- **FR-045**: Las fotos MUST ser JPEG, PNG o WebP de hasta 10 MB; el sistema rechaza otros archivos con un mensaje claro. La primera foto agregada es la principal.

### Key Entities *(include if feature involves data)*

- **Categoría**: primer nivel de clasificación; tiene nombre y estado activo o de baja; contiene subcategorías.
- **Subcategoría**: segundo nivel; pertenece a una categoría; agrupa productos.
- **Producto**: artículo del catálogo; tiene nombre, descripción, categoría, subcategoría opcional, una o más fotos, existencia, precio de compra, precio de venta y estado activo o de baja. Su cantidad disponible se calcula de la existencia y los apartados vigentes.
- **Artículo por encargo**: artículo sin existencia, gestionado por el vendedor y visible para el cliente; tiene nombre, descripción, precio, fotos opcionales y estado activo o de baja.
- **Cliente (datos de contacto)**: nombre y teléfono capturados en cada operación; no es una cuenta.
- **Venta**: operación pagada por completo al registrarse; tiene producto, cantidad, precio acordado, fecha, comprador opcional, estado Pagada, Entregada o Anulada, y motivo si se anuló.
- **Apartado**: reserva de unidades de un producto; tiene cantidad, precio acordado, cliente, pagos, estado Pendiente, Pagado, Entregado o Cancelado, y motivo si se canceló.
- **Encargo**: pedido de un producto agotado o de un artículo por encargo; tiene cantidad, precio acordado, cliente, pagos, estado Pendiente, Pagado, Entregado o Cancelado, y motivo si se canceló.
- **Pago**: abono a un apartado o encargo, o el cobro total de una venta; tiene importe, fecha y hora, y estado vigente o anulado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El vendedor, sin capacitación, da de alta un producto completo, con foto, en menos de 3 minutos usando el móvil. (CA1)
- **SC-002**: El vendedor encuentra y muestra a un cliente cualquier producto del catálogo en menos de 30 segundos.
- **SC-003**: El vendedor registra una venta en menos de 1 minuto y un apartado con pago inicial en menos de 2 minutos. (CA2)
- **SC-004**: Tras cualquier venta o apartado, al recargar el catálogo se ve la cantidad disponible correcta en el 100 % de los casos. (CA2)
- **SC-005**: En una prueba con 20 operaciones con pagos parciales, el total pagado y el saldo de cada una coinciden al centavo con una suma manual. (CA3)
- **SC-006**: El administrador localiza una operación por fecha, nombre o teléfono en menos de 30 segundos. (CA4)
- **SC-007**: Un cliente consulta su saldo con su nombre y teléfono en menos de 1 minuto y sin ayuda. (CA5)
- **SC-008**: En una revisión de todas las pantallas de cliente, el precio de compra no aparece en ninguna.
- **SC-009**: 9 de cada 10 personas que usan el catálogo por primera vez en su móvil filtran por categoría y encuentran un producto sin ayuda.

## Assumptions

- **Precio de venta visible (RF24)**: como la sección 2 de la descripción indica que el cliente ve su precio, RF24 se interpreta como que solo el precio de compra es exclusivo del administrador.
- **Rol único**: todo vendedor usa el mismo acceso de administrador; no se registra qué vendedor hizo cada operación. La administración de usuarios queda fuera de esta spec.
- **Quién opera**: ventas, apartados, encargos y pagos los registra solo el administrador. El cliente no compra ni aparta desde la página; usa el teléfono publicado o trata con el vendedor (Constitución, Alcance del producto).
- **Teléfono y WhatsApp**: "teléfono" y "número de WhatsApp" son el mismo dato.
- **Teléfono del negocio**: es un único número, definido al poner en marcha el sistema; cambiarlo desde la app no forma parte de esta spec.
- **Un producto por operación**: si un cliente lleva varios productos, se registra una operación por producto.
- **Precio al alza o a la baja**: el precio acordado puede ser cualquier importe mayor a cero, y no se exige un porcentaje mínimo de pago inicial.
- **Venta sin pagos parciales**: el pago en parcialidades existe solo en apartados y encargos.
- **Vigencia de apartados**: no vencen por tiempo; los recordatorios quedan fuera de alcance.
- **Encargos pendientes**: son los no entregados ni cancelados. No se registra si ya se pidieron al proveedor, y la mercancía del encargo no entra a la existencia.
- **Fecha de pago**: es el momento en que se registra; no se captura forma de pago, porque el cobro ocurre fuera del sistema.
- **Sin reactivación**: un producto dado de baja no se reactiva desde la app en esta versión.
- **Privacidad de la consulta**: nombre y teléfono juntos bastan para ver apartados y encargos, como pide RF14.
- **Fuera de alcance**: administración de usuarios vendedores, recordatorios, analítica, pagos en línea, IVA y devoluciones.
