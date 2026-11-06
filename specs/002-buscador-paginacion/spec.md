# Feature Specification: Buscador de productos y paginación

**Feature Branch**: `002-buscador-paginacion`

**Created**: 2026-11-05

**Status**: Approved

**Input**: User description: "Buscador de productos por nombre y descripción, que filtra mientras se escribe, en el catálogo de cliente y en el panel de administrador; y paginación con un botón «Ver más», de 20 productos en el catálogo y 50 en el panel, para cuando la cantidad de productos crezca". Nace de la prueba de SC-009 de la spec 001, en la que 7 de 10 personas preguntaron por un buscador.

## Clarifications

### Session 2026-11-05

- Q: Si el cliente buscó o pulsó «Ver más», abre un producto y regresa con el botón de atrás, ¿qué debe ver? → A: La lista como estaba: la misma búsqueda, el mismo filtro, los productos ya cargados y el mismo lugar de la lista.
- Q: Si el cliente busca algo que no está en el catálogo, ¿qué debe pasar con la sección de artículos por encargo? → A: Además del mensaje de que no hay productos, se le invita a ver la sección de artículos por encargo o a llamar al teléfono de contacto; el buscador no busca en esa sección.
- Q: Si el cliente escribe varias palabras, como "pelota roja", ¿qué productos deben aparecer? → A: Los que tienen todas las palabras, en cualquier orden, en el nombre o la descripción.

## Relación con la spec 001

La spec 001 está aprobada y no se modifica. Esta spec agrega comportamiento a las listas de productos que define FR-010 de la spec 001: el catálogo de cliente y la lista de productos del panel de administrador. Todo lo demás de la spec 001 sigue igual, incluidos los filtros por categoría y subcategoría, la información de cada producto y la sección de artículos por encargo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Buscar un producto escribiendo (Priority: P1)

El cliente abre el catálogo en su celular y escribe parte del nombre o de la descripción de lo que busca. La lista se va reduciendo mientras escribe y muestra solo los productos que coinciden, sin que tenga que saber en qué categoría están. El vendedor hace lo mismo en el panel de administrador para encontrar rápido un producto y editarlo o mostrárselo a un cliente.

**Why this priority**: en la prueba de SC-009, 7 de 10 personas preguntaron por un buscador. Es la forma que la gente espera para encontrar un producto.

**Independent Test**: con productos registrados en varias categorías, escribir en el buscador del catálogo parte del nombre de un producto, luego una palabra que solo esté en la descripción de otro, y comprobar que en cada caso aparecen solo los productos que coinciden. Repetir en el panel de administrador.

**Acceptance Scenarios**:

1. **Given** el catálogo abierto, **When** el cliente escribe parte del nombre de un producto, **Then** la lista se actualiza mientras escribe y muestra solo los productos cuyo nombre o descripción contienen lo escrito.
2. **Given** un producto llamado "Muñeca de trapo", **When** el cliente escribe "muneca" o "MUÑECA", **Then** el producto aparece, porque la búsqueda no distingue mayúsculas ni acentos.
3. **Given** un producto que tiene la palabra "lavable" solo en su descripción, **When** el cliente escribe "lavable", **Then** el producto aparece en los resultados.
4. **Given** una búsqueda con resultados en el nombre de unos productos y en la descripción de otros, **When** se muestran los resultados, **Then** primero aparecen los que coinciden en el nombre y después los que solo coinciden en la descripción.
5. **Given** un filtro de categoría o subcategoría activo, **When** el cliente escribe en el buscador, **Then** solo ve los productos que coinciden con la búsqueda y además pertenecen a ese filtro.
6. **Given** una búsqueda sin coincidencias, **When** el cliente termina de escribir, **Then** ve un mensaje claro de que no hay productos que coincidan, en lugar de una página vacía, con una invitación a ver la sección de artículos por encargo o a llamar al teléfono de contacto.
7. **Given** una búsqueda escrita, **When** el cliente borra todo el texto, **Then** vuelve a ver la lista completa según el filtro activo.
8. **Given** una búsqueda escrita, **When** el cliente recarga la página o comparte el enlace, **Then** la búsqueda no se conserva y se ve la lista sin búsqueda.
9. **Given** el panel de administrador abierto, **When** el vendedor escribe en el buscador, **Then** la lista de productos del panel se comporta igual que la del catálogo.
10. **Given** una búsqueda escrita, **When** el cliente abre un producto de los resultados y regresa con el botón de atrás, **Then** ve la misma búsqueda, los mismos resultados y el mismo lugar de la lista.

---

### User Story 2 - Ver los productos por partes con «Ver más» (Priority: P2)

Cuando el catálogo crece, la lista no carga todos los productos de golpe. El cliente ve los primeros 20 y, al llegar al final, pulsa «Ver más» para agregar los siguientes debajo de los que ya vio. En el panel de administrador, que también se usa desde el celular, funciona igual, pero con 50 productos a la vez.

**Why this priority**: hoy el catálogo tiene pocos productos y abre rápido. La paginación evita que se vuelva lento conforme crece, pero su valor aparece cuando hay más productos que los que se ven en una sola carga.

**Independent Test**: con más de 20 productos activos, abrir el catálogo y comprobar que se ven 20 y el botón «Ver más»; pulsarlo hasta que desaparezca y comprobar que se vieron todos los productos, sin repetidos. Repetir en el panel con más de 50 productos.

**Acceptance Scenarios**:

1. **Given** más de 20 productos activos, **When** el cliente abre el catálogo, **Then** ve los primeros 20 y, al final de la lista, el botón «Ver más».
2. **Given** el catálogo con el botón «Ver más» visible, **When** el cliente lo pulsa, **Then** se agregan hasta 20 productos más debajo de los que ya estaban, sin repetir ninguno y sin perder su lugar en la lista.
3. **Given** que ya se muestran todos los productos, **When** el cliente llega al final de la lista, **Then** el botón «Ver más» ya no aparece.
4. **Given** 20 productos o menos, **When** el cliente abre el catálogo, **Then** ve todos y no aparece el botón «Ver más».
5. **Given** más de 50 productos activos, **When** el vendedor abre la lista de productos del panel, **Then** ve los primeros 50 y el botón «Ver más», que agrega hasta 50 productos más cada vez.
6. **Given** un producto que está más allá de los primeros 20, **When** el cliente lo busca por su nombre, **Then** aparece en los resultados, porque la búsqueda abarca todo el catálogo y no solo lo que ya se cargó.
7. **Given** una lista con varios «Ver más» ya pulsados, **When** el cliente cambia lo que busca o cambia el filtro, **Then** la lista vuelve a mostrar desde los primeros resultados.
8. **Given** una búsqueda o un filtro con más de 20 resultados, **When** se muestran, **Then** también aparecen por partes con el botón «Ver más».
9. **Given** una lista con «Ver más» pulsado varias veces, **When** el cliente abre un producto y regresa con el botón de atrás, **Then** ve los mismos productos que ya había cargado y está en el mismo lugar de la lista.

---

### Edge Cases

- **Espacios de más**: los espacios al principio o al final de lo escrito no cuentan; una búsqueda de solo espacios equivale a no buscar.
- **Varias palabras**: si se escriben varias palabras, un producto coincide cuando contiene todas, en cualquier orden, entre su nombre y su descripción. Cuenta como coincidencia en el nombre solo si todas están en el nombre.
- **Una sola letra**: la búsqueda funciona desde el primer carácter escrito.
- **Escritura rápida**: si el cliente escribe rápido, la lista muestra siempre los resultados de lo último que escribió, nunca los de un texto anterior.
- **Producto dado de baja**: no aparece en los resultados de ninguna de las dos listas, igual que hoy no aparece en ellas.
- **Producto agotado**: aparece en los resultados del catálogo con su marca "Agotado, disponible por encargo", como indica la spec 001.
- **Cambios mientras se navega**: si se da de alta o de baja un producto mientras alguien ya pulsó «Ver más», al cambiar la búsqueda o el filtro, o al recargar, la lista refleja el catálogo actualizado.
- **Sin conexión o error al cargar más**: si falla la carga de la siguiente parte, se muestra un mensaje claro y el botón «Ver más» sigue disponible para intentarlo de nuevo; los productos ya mostrados no se pierden.
- **Catálogo vacío**: sin productos activos, se muestra un mensaje claro y no aparecen el botón «Ver más» ni resultados de búsqueda.

## Requirements *(mandatory)*

### Functional Requirements

**Buscador**

- **FR-001**: El catálogo de cliente y la lista de productos del panel de administrador MUST mostrar un campo de búsqueda arriba de los filtros de categoría y subcategoría, con una etiqueta clara.
- **FR-002**: La búsqueda MUST encontrar productos por su nombre y por su descripción, sin distinguir mayúsculas ni acentos. Con varias palabras, un producto coincide cuando contiene todas, en cualquier orden, entre su nombre y su descripción.
- **FR-003**: Los resultados MUST actualizarse mientras se escribe, sin pulsar ningún botón.
- **FR-004**: La búsqueda MUST combinarse con el filtro de categoría y subcategoría activo: solo se muestran los productos que cumplen ambos.
- **FR-005**: Si ningún producto coincide, el sistema MUST mostrar un mensaje claro de que no hay resultados. En el catálogo de cliente, el mensaje MUST incluir un enlace a la sección de artículos por encargo y el teléfono de contacto del negocio. El buscador MUST NOT buscar en los artículos por encargo.
- **FR-006**: La búsqueda MUST mostrar solo productos activos, igual que las listas actuales de la spec 001.
- **FR-007**: Los resultados MUST mostrar primero los productos que coinciden en el nombre y después los que solo coinciden en la descripción. Dentro de cada grupo, y cuando no hay búsqueda, se mantiene el orden actual de la lista.
- **FR-008**: Lo que se busca MUST NOT guardarse en el enlace ni conservarse al recargar la página.
- **FR-008a**: Al regresar con el botón de atrás desde un producto, el sistema MUST mostrar la lista como estaba: la misma búsqueda, el mismo filtro, los productos ya cargados con «Ver más» y el mismo lugar de la lista. Aplica en el catálogo y en el panel.
- **FR-009**: La búsqueda MUST NOT buscar en el precio de compra ni mostrarlo en el catálogo de cliente; solo se busca en el nombre y la descripción.

**Paginación**

- **FR-010**: El catálogo de cliente MUST mostrar los productos de 20 en 20, y la lista de productos del panel de administrador de 50 en 50.
- **FR-011**: Al final de cada lista, el sistema MUST mostrar un botón «Ver más» que agregue la siguiente parte debajo de los productos ya mostrados, sin repetir ninguno.
- **FR-012**: El botón «Ver más» MUST desaparecer cuando ya no quedan productos por mostrar, y no aparecer si todos caben en la primera parte.
- **FR-013**: La búsqueda y los filtros MUST abarcar todos los productos activos, no solo los que ya se muestran.
- **FR-014**: Al cambiar lo que se busca o el filtro, la lista MUST volver a los primeros resultados.
- **FR-015**: Si falla la carga de la siguiente parte, el sistema MUST mostrar un mensaje claro, conservar los productos ya mostrados y permitir intentarlo de nuevo con el mismo botón.

**Accesibilidad**

- **FR-016**: El campo de búsqueda y el botón «Ver más» MUST poder usarse en el celular sin formación, con buen contraste y etiquetas claras, y los cambios en la lista MUST anunciarse a quien usa un lector de pantalla, por ejemplo con el número de resultados.

### Key Entities

- **Producto**: el mismo de la spec 001. Esta spec no agrega datos; usa su nombre y su descripción para la búsqueda, y el orden actual de la lista para la paginación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 9 de cada 10 personas que usan el catálogo por primera vez en su celular encuentran un producto con el buscador, sin ayuda.
- **SC-002**: Con 500 productos activos registrados, al abrir el catálogo en un celular con datos móviles, los primeros productos aparecen en 1 segundo o menos, igual de rápido que con pocos productos.
- **SC-003**: Al dejar de escribir en el buscador, la lista muestra los resultados en 1 segundo o menos, con 500 productos activos registrados.
- **SC-004**: Con más de 20 productos, una persona pulsa «Ver más» hasta que el botón desaparece y cuenta en pantalla la misma cantidad de productos activos que tiene el negocio, sin repetidos ni faltantes.
- **SC-005**: El vendedor encuentra un producto con el buscador del panel, desde su celular, en menos de 15 segundos.

## Assumptions

- **Listas afectadas**: solo el catálogo de cliente y la lista de productos del panel. La sección de artículos por encargo, las operaciones, los encargos pendientes y la consulta de apartados no cambian.
- **Orden actual**: hoy ambas listas muestran primero los productos registrados más recientemente; ese orden se conserva.
- **Medición de velocidad**: el plan define cómo se mide técnicamente SC-002, con el mismo perfil de conexión aceptado para la spec 001 (Fast 4G).
- **Cifra de 500 productos**: el catálogo actual tiene menos; 500 es la meta de crecimiento que la app debe soportar sin volverse lenta. SC-002 y SC-003 se comprueban en una copia de prueba con 500 productos de ejemplo, nunca en el catálogo real, y en producción se confirman con los productos que haya.
- **Fuera de alcance**: corrección de errores de escritura, sugerencias mientras se escribe, historial de búsquedas, guardado de la búsqueda, analítica de búsquedas, páginas numeradas y carga automática al bajar.
