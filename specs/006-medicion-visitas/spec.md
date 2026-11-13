# Feature Specification: Medición de visitas

**Feature Branch**: `006-medicion-visitas`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "Medición de visitas con Umami. El propietario quiere saber cuántas personas visitan el catálogo, qué páginas y productos ven, desde qué país o ciudad aproximada, con qué dispositivo y de dónde llegan (por ejemplo, de qué grupo de WhatsApp, usando etiquetas utm en los enlaces que comparte). Umami ya está instalado por el propietario en su propio Easypanel en https://estadisticas.cristobalia.com con el sitio registrado (data-website-id 49b620b8-b094-49c2-9ff2-edf6ba9d0c38). Alcance: (1) cargar el script de Umami solo en la sección de cliente, nunca en el panel admin, y solo contar visitas del dominio app.cristobalia.com (no desarrollo ni pruebas); (2) registrar un evento cuando un cliente hace un apartado, para saber cuántas visitas terminan en apartado; (3) actualizar el aviso de privacidad (spec 003) para informar la medición anónima de visitas: sin cookies, sin guardar la IP, datos que no identifican a la persona, usados solo para saber qué productos interesan y mejorar la página; los datos se quedan en el servidor propio, sin terceros nuevos; con nueva fecha de actualización; (4) el script no debe empeorar de forma notable la velocidad: el LCP en producción debe seguir alrededor de 1 s. Fuera de alcance: identificar personas, guardar IPs, banner de cookies, Google Analytics, publicidad."

## Relación con las specs anteriores

Las specs 001 a 005 están aprobadas y no se modifican. Esta spec agrega:

- la medición anónima de visitas en la sección de cliente, con el servicio de estadísticas que el propietario ya instaló en su propio servidor;
- el conteo de cada toque al teléfono de contacto, como señal de interés por comprar o apartar. En esta app el cliente no hace el apartado en la página: llama al teléfono del negocio y el vendedor lo registra en el panel (spec 001);
- un nuevo texto en el aviso de privacidad de la spec 003, que informa de la medición. Cambiar el texto del aviso y su fecha de actualización es justo el procedimiento que la spec 003 prevé para corregirlo; la estructura, la constancia en las operaciones y el borrado de datos no cambian.

El panel de administración no cambia y nunca se mide.

## Clarifications

### Session 2026-11-12

- Q: El cliente no hace el apartado en la página. ¿Qué acción se cuenta como interés por comprar? → A: Cada toque al teléfono de contacto, con la página o el producto desde el que se tocó. Las consultas en «Mis apartados» no se cuentan como evento aparte; solo como página vista.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber cuánta gente visita el catálogo y qué ve (Priority: P1)

El propietario comparte el catálogo en sus grupos de WhatsApp. Al día siguiente abre su tablero de estadísticas y ve cuántas personas entraron, qué productos vieron más, desde qué ciudades aproximadas, si fue desde celular o computadora y de qué sitio llegaron. Con eso decide qué productos destacar y qué traer más.

**Why this priority**: es el valor principal de la spec; sin ella el propietario no sabe si compartir el catálogo da resultado.

**Independent Test**: abrir el catálogo y una página de producto desde un celular, y comprobar en el tablero de estadísticas que aparecen la visita, las páginas vistas, el país o la ciudad aproximada y el tipo de dispositivo.

**Acceptance Scenarios**:

1. **Given** la app publicada en su dominio de producción, **When** un cliente abre cualquier página de la sección de cliente, **Then** el tablero de estadísticas del propietario cuenta la visita y la página vista.
2. **Given** un cliente que abre la página de un producto, **When** el propietario revisa el tablero, **Then** puede saber qué producto se vio, porque cada página de producto se distingue de las demás.
3. **Given** cualquier visita, **When** el propietario revisa el tablero, **Then** ve el país y la ciudad aproximados, el tipo de dispositivo y el navegador, sin ningún dato que identifique a la persona.
4. **Given** el vendedor usando el panel de administración, **When** el propietario revisa el tablero, **Then** ninguna página del panel aparece contada.
5. **Given** la app corriendo en la laptop de desarrollo o en las pruebas automáticas, **When** se abren páginas de cliente, **Then** no se cuenta ninguna visita en el tablero.

---

### User Story 2 - Saber de dónde llega la gente (Priority: P2)

Antes de compartir el catálogo en el grupo «Vecinos La Magdalena», el propietario agrega una etiqueta al enlace, por ejemplo `?utm_source=whatsapp&utm_campaign=vecinos`. En el tablero ve cuántas visitas trajo ese enlace, comparado con el que compartió en Facebook.

**Why this priority**: permite saber dónde conviene compartir el catálogo. Depende de que las visitas se cuenten (US1).

**Independent Test**: abrir el catálogo con un enlace etiquetado y comprobar que la visita aparece en el tablero con su etiqueta.

**Acceptance Scenarios**:

1. **Given** un enlace al catálogo con etiquetas de origen, **When** un cliente lo abre, **Then** el tablero muestra la visita asociada a esas etiquetas.
2. **Given** un enlace con etiquetas, **When** el cliente lo abre, **Then** la página se ve y funciona igual que sin etiquetas.
3. **Given** una visita que llega desde otro sitio, como Facebook, **When** el propietario revisa el tablero, **Then** ve ese sitio como origen.

---

### User Story 3 - Saber cuántas visitas terminan en interés por comprar (Priority: P2)

El propietario quiere saber, de cada 100 visitas, cuántas terminan en un toque al teléfono de contacto para comprar o apartar, y desde qué productos.

**Why this priority**: mide si el catálogo realmente genera ventas, no solo visitas.

**Independent Test**: tocar el teléfono de contacto desde una página de producto y comprobar que el tablero cuenta un interesado con ese producto.

**Acceptance Scenarios**:

1. **Given** un cliente en la página de un producto, **When** toca el teléfono de contacto, **Then** el tablero cuenta un evento de interés con ese producto.
2. **Given** un cliente en el catálogo o en artículos por encargo, **When** toca el teléfono de contacto, **Then** el tablero cuenta un evento de interés con esa página.
3. **Given** cualquier toque al teléfono, **When** el cliente lo hace, **Then** se abre la llamada exactamente igual que antes de esta spec, aunque el servicio de estadísticas no responda.

---

### User Story 4 - Informar al cliente de la medición (Priority: P1)

Un cliente abre el aviso de privacidad y lee que la página mide las visitas de forma anónima, para qué y que no se usan cookies ni se guarda su dirección IP.

**Why this priority**: el aviso hoy dice que solo se recaban nombre y teléfono; medir visitas sin decirlo lo haría incompleto. Va junto con US1: la medición no se publica sin el aviso actualizado.

**Independent Test**: abrir el aviso de privacidad y comprobar que contiene lo de FR-009 y la nueva fecha de actualización.

**Acceptance Scenarios**:

1. **Given** la página del aviso de privacidad, **When** un cliente la abre, **Then** lee qué datos de navegación se miden, para qué, que no se usan cookies, que no se guarda su dirección IP y que esos datos no lo identifican.
2. **Given** el aviso actualizado, **When** el cliente lo abre, **Then** la fecha de actualización es la de la publicación de esta spec.

---

### Edge Cases

- **Servicio de estadísticas caído o lento**: la sección de cliente se ve y funciona igual; solo se pierden esas visitas en el tablero.
- **Bloqueadores de anuncios o navegadores que bloquean la medición**: la página funciona igual; esas visitas no se cuentan. El tablero puede contar algo menos de las visitas reales.
- **«Mis apartados»**: el teléfono que el cliente escribe para consultar sus apartados nunca se envía al servicio de estadísticas; solo se cuenta que se abrió la página.
- **Visitas del propio propietario o del vendedor a la sección de cliente**: se cuentan como cualquier otra, salvo que excluyan su dispositivo desde el servicio de estadísticas (ver Assumptions).
- **Enlaces con etiquetas mal escritas**: la página funciona igual; la visita aparece con la etiqueta tal como se escribió.
- **Navegación sin recargar** (por ejemplo, al usar filtros, el buscador o «Ver más»): cada cambio de página de la sección de cliente se cuenta como página vista; los filtros y búsquedas no generan visitas extra más allá de las páginas que se abren.

## Requirements *(mandatory)*

### Functional Requirements

**Medición de visitas**

- **FR-001**: Cada página de la sección de cliente MUST contarse en el servicio de estadísticas del propietario cuando se abre, con la página vista, el sitio de origen y las etiquetas de origen del enlace, si las tiene.
- **FR-002**: Las páginas del panel de administración, incluido el inicio de sesión, MUST NOT medirse.
- **FR-003**: Solo MUST contarse las visitas a la app publicada en su dominio de producción (`app.cristobalia.com`). La app corriendo en desarrollo, en pruebas o en cualquier otra dirección MUST NOT contar visitas.
- **FR-004**: La medición MUST NOT usar cookies, MUST NOT guardar la dirección IP y MUST NOT enviar al servicio de estadísticas ningún dato personal: nombres, teléfonos ni lo que el cliente escribe en formularios.
- **FR-005**: Si el servicio de estadísticas no responde o está bloqueado, la sección de cliente MUST verse y funcionar igual que antes de esta spec.

**Interés por comprar**

- **FR-006**: El sistema MUST contar cada toque al teléfono de contacto, en cualquier página de la sección de cliente, como un evento de interés aparte en el tablero, con la página o el producto desde el que se tocó. Tocar el teléfono MUST seguir abriendo la llamada igual que antes de esta spec, aunque el servicio de estadísticas no responda.

**Aviso de privacidad**

- **FR-007**: La medición MUST publicarse junto con el aviso actualizado, nunca antes.
- **FR-008**: El aviso MUST conservar sus secciones y su estructura de la spec 003; solo se agregan párrafos y cambia la fecha de actualización.
- **FR-009**: El aviso MUST informar que:
  - al visitar la página se miden de forma anónima las páginas vistas, la ciudad o el país aproximados, el tipo de dispositivo y navegador y el sitio desde el que se llegó;
  - no se usan cookies, no se guarda la dirección IP y esos datos no sirven para identificar a la persona;
  - esos datos se usan solo para saber qué productos interesan y mejorar la página;
  - se guardan en el mismo servidor de la página, sin compartirlos con terceros.
- **FR-010**: La fecha de actualización del aviso MUST cambiar a la fecha en que se publica esta spec.

**Velocidad**

- **FR-011**: La medición MUST NOT retrasar la aparición del catálogo: se carga después de mostrar el contenido y sin bloquearlo.

**Generales**

- **FR-012**: Todo texto nuevo de la app MUST estar en español de México. (Constitución III)

### Key Entities

- **Visita**: el paso anónimo de una persona por la sección de cliente. Tiene páginas vistas, sitio y etiquetas de origen, ciudad o país aproximados, tipo de dispositivo y navegador. Se guarda en el servicio de estadísticas, no en la base de datos de la app.
- **Evento de interés**: un toque al teléfono de contacto, con la página o el producto desde el que se hizo. Tampoco se guarda en la base de datos de la app.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El propietario abre el catálogo y 3 páginas de producto desde su celular y, en menos de 5 minutos, las ve contadas en su tablero de estadísticas, con su país, su ciudad aproximada y su tipo de dispositivo.
- **SC-002**: El propietario abre el catálogo con un enlace etiquetado y ve la visita en el tablero con esa etiqueta.
- **SC-003**: El propietario toca el teléfono de contacto desde 3 productos distintos y el tablero cuenta 3 eventos de interés, con el producto de cada uno; en las 3 veces se abrió la llamada.
- **SC-004**: El vendedor usa el panel de administración durante 5 minutos y ninguna de esas páginas aparece en el tablero.
- **SC-005**: El propietario consulta «Mis apartados» con su teléfono y revisa el tablero: su teléfono no aparece en ningún lugar.
- **SC-006**: Al abrir el catálogo en un celular con datos móviles, los primeros productos siguen apareciendo en 1 segundo o menos, igual que antes de esta spec.
- **SC-007**: Un cliente abre el aviso de privacidad desde su celular y encuentra, sin ayuda, que la página mide visitas de forma anónima y sin cookies.

## Assumptions

- **Servicio de estadísticas**: el propietario ya lo instaló en su propio servidor, en `estadisticas.cristobalia.com`, y registró el sitio. Instalarlo, actualizarlo, respaldar sus datos y administrar su acceso quedan fuera de esta spec.
- **Tablero**: el propietario consulta las estadísticas en el tablero del servicio de estadísticas, no en el panel de la app. Mostrar estadísticas dentro del panel queda fuera de alcance.
- **Sin terceros nuevos**: el servicio corre en el mismo servidor que la app. Si algún día se cambia a un servicio externo, el aviso debe nombrarlo en una spec nueva.
- **Sin banner de cookies**: como la medición no usa cookies ni identifica a la persona, no se pide consentimiento con un banner. El propietario puede consultarlo con un abogado, igual que el resto del aviso (spec 003).
- **Visitas propias**: el servicio de estadísticas permite que el propietario y el vendedor excluyan su propio dispositivo desde el navegador; hacerlo no requiere cambios en la app.
- **Velocidad**: el plan define cómo se mide técnicamente SC-006, con el mismo perfil de conexión aceptado en las specs 001 y 002 (Fast 4G).
- **Fuera de alcance**: identificar personas, guardar direcciones IP, Google Analytics, publicidad, enlazar visitas con operaciones o clientes y medir el panel de administración.
