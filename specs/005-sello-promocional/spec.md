# Feature Specification: Sello promocional

**Feature Branch**: `005-sello-promocional`

**Created**: 2026-11-11

**Status**: Approved

**Input**: User description: "Sello promocional personalizable en el catálogo público. El administrador puede activar o desactivar desde el panel de administración un sello o aviso visual de promoción, hecho con texto (sin imagen), que se muestra en el catálogo a los clientes. El texto del sello es personalizable para reutilizarlo en distintas temporadas: por ejemplo «Buen Fin · Descuentos» ahora y después «Venta navideña». El sello es solo visual: no cambia los precios del catálogo ni de las operaciones; los descuentos se siguen aplicando al registrar la venta, como hoy. Cuando está desactivado, el catálogo se ve igual que ahora."

## Relación con las specs anteriores

Las specs 001 a 004 están aprobadas y no se modifican. Esta spec agrega:

- una sección nueva en el panel de administración para configurar el sello promocional;
- una franja con el sello en todas las páginas de la sección de cliente, solo mientras está activado.

Los precios del catálogo, el precio que se propone al registrar una operación (FR-019 de la spec 001) y el precio acordado no cambian. El vendedor sigue aplicando el descuento al registrar la venta, como hoy.

## Clarifications

### Session 2026-11-11

- Q: ¿Dónde aparece el sello? → A: En una franja debajo del encabezado, en todas las páginas de la sección de cliente; no tapa ningún producto.
- Q: ¿Qué se puede personalizar? → A: El texto y el color, elegido entre unos colores predefinidos con buen contraste en modo claro y oscuro.
- Q: ¿Cómo se activa y desactiva? → A: Solo a mano, desde el panel; no hay programación por fechas.
- Q: ¿Qué tipo de texto se recomienda? → A: Uno que no prometa un descuento que no se ve en los precios, como «Buen Fin · Pregunta por tu descuento». El propietario está de acuerdo.
- Q: Cuando el cliente toque la franja, ¿debe pasar algo, por ejemplo llamar al teléfono del negocio? → A: No; la franja es solo un aviso de texto, sin enlace ni acción.
- Q: ¿El cliente puede cerrar la franja? → A: No; se ve en todas las páginas de cliente mientras el sello esté activo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Anunciar una temporada de promociones (Priority: P1)

Antes del Buen Fin, el vendedor entra al panel, abre «Promoción», escribe «Buen Fin · Pregunta por tu descuento», elige el color rojo y activa el sello. A partir de ese momento, los clientes que abren la página desde su celular ven una franja roja con ese texto debajo del encabezado y saben que hay promociones. Cuando termina la temporada, el vendedor lo desactiva y la página vuelve a verse como siempre.

**Why this priority**: es todo el valor de la spec: avisar a los clientes de una temporada de descuentos sin tocar precios.

**Independent Test**: activar el sello con un texto, abrir el catálogo, una página de producto y «Mis apartados» desde un celular y comprobar que la franja aparece en todas con ese texto; desactivarlo y comprobar que se ven igual que antes de esta spec.

**Acceptance Scenarios**:

1. **Given** el sello desactivado, **When** un cliente abre cualquier página de la sección de cliente, **Then** se ve igual que antes de esta spec.
2. **Given** la sección «Promoción» del panel, **When** el vendedor escribe un texto, elige un color, activa el sello y guarda, **Then** el sistema confirma que el sello está activo.
3. **Given** el sello activo, **When** un cliente abre cualquier página de la sección de cliente, **Then** ve, debajo del encabezado, una franja con el texto y el color que eligió el vendedor.
4. **Given** el sello activo, **When** un cliente lo ve en un celular, **Then** el texto se lee completo sin hacer zoom ni desplazarse hacia los lados, y la franja no tapa el nombre, el precio, la foto ni la disponibilidad de ningún producto.
5. **Given** el sello activo, **When** el vendedor lo desactiva y guarda, **Then** la franja deja de aparecer para los clientes, y el texto y el color se conservan en el panel para volver a usarlos.
6. **Given** el sello activo, **When** el vendedor registra una venta, un apartado o un encargo, **Then** el precio propuesto es el precio de venta vigente del producto, igual que antes de esta spec.

---

### User Story 2 - Cambiar el sello para otra temporada (Priority: P2)

Al terminar el Buen Fin, el vendedor cambia el texto a «Venta navideña», elige el color verde y guarda. Los clientes ven el sello nuevo la siguiente vez que abren o recargan la página.

**Why this priority**: es lo que hace reutilizable el sello en cada temporada sin pedir cambios a la app. Depende de que el sello exista (US1).

**Independent Test**: con el sello activo, cambiar el texto y el color, guardar, recargar el catálogo y comprobar que aparecen el texto y el color nuevos y no los anteriores.

**Acceptance Scenarios**:

1. **Given** el sello activo, **When** el vendedor cambia el texto o el color y guarda, **Then** los clientes ven el cambio la siguiente vez que abren o recargan la página.
2. **Given** la sección «Promoción», **When** el vendedor escribe el texto o elige un color, **Then** ve una vista previa de cómo se verá la franja antes de guardar.
3. **Given** un texto vacío o con solo espacios, **When** el vendedor intenta activar el sello, **Then** el sistema no lo guarda y muestra un mensaje claro junto al texto.
4. **Given** el campo del texto, **When** el vendedor escribe, **Then** ve cuántos caracteres le quedan y no puede guardar un texto de más de 40 caracteres.
5. **Given** la lista de colores, **When** el vendedor la ve, **Then** cada color tiene su nombre escrito, como «Rojo» o «Verde», además de la muestra de color.

---

### Edge Cases

- **Texto con caracteres especiales**: emojis, acentos, «ñ» y signos como «·», «%» o «¡!» se muestran tal como se escribieron. Un texto nunca se interpreta como formato ni como código.
- **Texto que promete un descuento concreto**: la app no valida lo que dice el texto; el vendedor es responsable de cumplir la promoción que anuncia (ver Assumptions).
- **Productos agotados**: la franja no cambia la marca «Agotado, disponible por encargo» (FR-015 de la spec 001).
- **Desactivar sin texto**: el vendedor puede desactivar el sello aunque el texto esté vacío; solo activarlo requiere texto.
- **Primera vez**: antes de que el vendedor guarde algo, el sello está desactivado, sin texto y con el primer color de la lista.
- **Dos vendedores editando a la vez**: gana el último que guarda; el panel muestra siempre lo que quedó guardado.
- **Sin sesión**: solo quien tiene acceso de administrador puede ver o cambiar la sección «Promoción».

## Requirements *(mandatory)*

### Functional Requirements

**Configuración en el panel**

- **FR-001**: El panel de administración MUST tener una sección «Promoción», accesible desde la navegación del panel, solo para quien tiene acceso de administrador.
- **FR-002**: En esa sección, el vendedor MUST poder escribir el texto del sello, elegir su color, activarlo o desactivarlo y guardar. Al guardar, el sistema MUST confirmar si el sello quedó activo o desactivado.
- **FR-003**: El sistema MUST rechazar la activación con un texto vacío o con solo espacios, con un mensaje claro junto al texto. Desactivar MUST ser posible aunque el texto esté vacío.
- **FR-004**: El texto MUST tener como máximo 40 caracteres. El campo MUST mostrar cuántos caracteres quedan.
- **FR-005**: El color MUST elegirse de esta lista, en este orden: **Rojo**, **Verde**, **Dorado** y **Azul**. Cada opción MUST mostrar su nombre escrito junto a la muestra de color.
- **FR-006**: La sección MUST mostrar una vista previa de la franja con el texto y el color elegidos, antes de guardar.
- **FR-007**: Al desactivar el sello, el sistema MUST conservar el texto y el color para volver a usarlos.
- **FR-008**: El sello MUST activarse y desactivarse solo a mano, desde la sección «Promoción».

**Sello en la sección de cliente**

- **FR-009**: Mientras el sello está activo, todas las páginas de la sección de cliente MUST mostrar, debajo del encabezado y a todo lo ancho, una franja con el texto y el color guardados. La franja MUST ser solo un aviso de texto: tocarla no abre enlaces ni inicia ninguna acción, y el cliente no puede cerrarla ni ocultarla. Mientras está desactivado, la sección de cliente MUST verse igual que antes de esta spec.
- **FR-010**: Los cambios guardados MUST verse en la sección de cliente la siguiente vez que el cliente abre o recarga una página.
- **FR-011**: La franja MUST NOT tapar el nombre, el precio, la foto ni la disponibilidad de ningún producto, y su texto MUST leerse completo en un celular sin hacer zoom ni desplazarse hacia los lados.
- **FR-012**: La franja MUST mostrar el texto tal como se escribió, sin interpretarlo como formato ni como código.

**Precios**

- **FR-013**: El sello MUST NOT cambiar los precios del catálogo, el precio que se propone al registrar una operación (FR-019 de la spec 001) ni los precios acordados, pagos o saldos de ninguna operación.

**Generales**

- **FR-014**: Todo texto nuevo de la app MUST estar en español de México. Cada color de FR-005 MUST tener buen contraste entre el texto y el fondo de la franja, en modo claro y en modo oscuro, y los controles de la sección «Promoción» MUST tener etiquetas claras. (Constitución III y VII)

### Key Entities

- **Sello promocional**: uno solo para todo el negocio. Tiene un texto de hasta 40 caracteres, un color de la lista de FR-005 y si está activo o desactivado. No guarda historial de temporadas anteriores.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El vendedor activa el sello con un texto y un color nuevos, desde su celular y sin ayuda, en menos de 1 minuto.
- **SC-002**: Al activar el sello, un cliente ve la franja en el catálogo, en una página de producto y en «Mis apartados» de su celular sin desplazarse, y al desactivarlo deja de verla.
- **SC-003**: Con el sello activo, el precio que aparece en el catálogo y el que se propone al registrar una venta son los mismos que con el sello desactivado, al centavo, en 5 productos revisados.
- **SC-004**: 9 de cada 10 personas que ven la página con el sello activo leen su texto completo sin hacer zoom, y siguen encontrando el nombre, el precio y la disponibilidad de los productos.
- **SC-005**: El propietario revisa la franja con cada uno de los 4 colores, en modo claro y en modo oscuro, y confirma que el texto se lee bien en todos.

## Assumptions

- **Solo texto**: el sello no usa imágenes ni logotipos. El logotipo oficial del Buen Fin es una marca registrada y queda fuera de alcance.
- **Un solo sello**: hay un sello para todo el negocio a la vez. Varias promociones simultáneas, historial de temporadas, textos distintos por categoría, sellos en las tarjetas de producto y programación por fechas quedan fuera de alcance.
- **Cumplir lo que se anuncia**: la ley de protección al consumidor pide que la publicidad no engañe. Como los precios del catálogo no cambian, el texto recomendado es del tipo «Buen Fin · Pregunta por tu descuento», en vez de prometer un porcentaje que no se ve en los precios. El propietario está de acuerdo. La app no revisa el texto.
- **Descuentos**: el descuento se sigue aplicando al registrar la venta, cambiando el precio propuesto, como permite la spec 001. Precios de oferta en el catálogo, precios tachados y descuentos automáticos quedan fuera de alcance; si se necesitan, irán en una spec nueva.
- **Colores**: la lista de FR-005 cubre las temporadas previstas (Buen Fin, Navidad y otras). Agregar un color se hace en una spec nueva.
