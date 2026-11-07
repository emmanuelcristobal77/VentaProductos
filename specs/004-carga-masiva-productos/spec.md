# Feature Specification: Carga masiva de productos

**Feature Branch**: `004-carga-masiva-productos`

**Created**: 2026-11-07

**Status**: Approved

**Input**: User description: "Carga masiva de productos desde el panel de administración. El administrador sube un archivo comprimido (.zip) que contiene un archivo .txt con columnas definidas separadas por pipe «|», con la misma información del alta individual de un producto más una columna con el nombre del archivo de imagen; las imágenes vienen dentro del mismo comprimido. Al terminar, el sistema muestra cuántos productos nuevos se dieron de alta, los productos nuevos que quedaron sin foto para que se les suba nuevamente, y los productos que ya existían, para que el administrador elija cuáles se actualizan. Los registros de productos nuevos sin foto y de productos ya existentes se pueden descargar como reporte en un archivo .txt para validar la información."

## Clarifications

### Session 2026-11-07

- Q: ¿Cómo se reconoce que un renglón corresponde a un producto que ya existe? → A: Por el nombre, sin importar mayúsculas ni acentos, entre los productos activos.
- Q: ¿Qué pasa con un producto nuevo que llega sin foto o con una foto que no viene en el comprimido? → A: No se registra; aparece en la lista «Productos nuevos sin foto» y en el reporte para subirlo en otra carga con su foto.
- Q: Al actualizar un producto existente, ¿la existencia se reemplaza o se suma? → A: Se reemplaza por la cantidad del archivo, igual que en la edición individual.
- Q: Al actualizar un producto existente cuyo renglón trae fotos, ¿qué pasa con sus fotos? → A: Se agregan solo las fotos cuyo nombre de archivo no se haya cargado antes para ese producto; no se borra ninguna.
- Q: ¿Qué tamaño máximo tiene una carga? → A: Hasta 200 productos y un comprimido de hasta 50 MB.
- Q: Si un renglón de un producto existente trae exactamente los mismos datos que ya tiene, ¿cómo se muestra? → A: Se cuenta aparte como «Sin cambios»; no aparece en la lista para marcar ni en el reporte.
- Q: ¿El reporte indica qué se decidió con cada producto existente? → A: Sí; se puede descargar antes y después de confirmar, y después de confirmar cada producto existente dice «Actualizado», «No actualizado» o «No se pudo actualizar» con el motivo.

## Relación con la spec 001

La spec 001 está aprobada y no se modifica. Esta spec agrega una segunda forma de dar de alta y de actualizar productos, solo en la sección de administrador:

- una opción «Carga masiva» junto al alta individual de productos (FR-008 de la spec 001);
- la pantalla de resultados de la carga, con la elección de qué productos existentes se actualizan;
- la descarga del reporte de la carga.

Cada producto que entra por carga masiva cumple las mismas reglas que el alta y la edición individuales (FR-004, FR-007, FR-008, FR-009, FR-016 y validaciones de importes de la spec 001), salvo lo que esta spec diga de forma explícita. El catálogo, las operaciones y la sección de cliente no cambian.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dar de alta muchos productos con un solo archivo (Priority: P1)

El vendedor prepara en su computadora un archivo de texto con un renglón por producto y las fotos de esos productos, los mete en un archivo comprimido y lo sube desde la sección de administrador. El sistema da de alta los productos nuevos con sus fotos y, al terminar, le dice cuántos productos nuevos se registraron.

**Why this priority**: es el motivo de la funcionalidad: dejar de capturar los productos uno por uno cuando llega mercancía.

**Independent Test**: subir un comprimido con 10 productos nuevos y sus fotos, y comprobar que el resumen dice «10 productos nuevos» y que los 10 aparecen en la lista de administrador y en el catálogo con su foto, precio y existencia.

**Acceptance Scenarios**:

1. **Given** un administrador con sesión iniciada, **When** abre la administración de productos, **Then** ve la opción «Carga masiva» con las instrucciones del formato y un archivo de ejemplo para descargar.
2. **Given** un comprimido con un archivo de productos válido y todas sus fotos, **When** el administrador lo sube, **Then** cada producto nuevo queda registrado con sus datos y fotos y el resumen muestra cuántos productos nuevos se dieron de alta.
3. **Given** un renglón con una categoría o subcategoría que no existe, **When** se procesa, **Then** la categoría o subcategoría queda creada y el producto queda en ella, igual que en el alta individual.
4. **Given** un renglón con una categoría escrita con otras mayúsculas o sin acentos, por ejemplo «juguetes», **When** se procesa, **Then** se usa la categoría existente «Juguetes» y no se crea un duplicado.
5. **Given** un renglón con datos inválidos, por ejemplo precio de venta en cero o sin nombre, **When** se procesa, **Then** ese producto no se registra, el resto de la carga continúa y el resumen lo muestra como rechazado, con su número de renglón y el motivo.
6. **Given** un archivo que no es un comprimido, o un comprimido sin archivo de productos, **When** el administrador lo sube, **Then** el sistema no registra nada y explica qué falta.
7. **Given** un usuario sin sesión de administrador, **When** intenta entrar a la carga masiva, **Then** el sistema no se la muestra ni le permite subir archivos.

---

### User Story 2 - Ver los productos nuevos que quedaron sin foto (Priority: P1)

Si un renglón nuevo no trae foto, o la foto que menciona no viene en el comprimido o no es una imagen válida, ese producto no se registra. El resumen de la carga lo muestra en la lista «Productos nuevos sin foto», con el motivo, para que el vendedor lo vuelva a subir en otra carga con su foto.

**Why this priority**: todo producto debe tener foto (FR-016 de la spec 001); sin esta lista el vendedor no sabría qué productos no entraron ni por qué.

**Independent Test**: subir un comprimido con 3 productos nuevos donde a uno le falta la foto en el comprimido, y comprobar que el resumen dice «2 productos nuevos», que la lista «Productos nuevos sin foto» muestra solo el tercero con el motivo «La foto no viene en el comprimido» y que ese producto no aparece en la lista de administrador ni en el catálogo.

**Acceptance Scenarios**:

1. **Given** un renglón nuevo con la columna de fotos vacía, **When** se procesa, **Then** no se registra y aparece en «Productos nuevos sin foto» con el motivo «El renglón no indica foto».
2. **Given** un renglón nuevo que menciona una foto que no viene en el comprimido, **When** se procesa, **Then** no se registra y aparece en «Productos nuevos sin foto» con el nombre de la foto que falta.
3. **Given** un renglón nuevo cuya foto no es una imagen válida, **When** se procesa, **Then** no se registra y aparece en «Productos nuevos sin foto» con el motivo «La foto no es una imagen válida».
4. **Given** un renglón nuevo con varias fotos donde al menos una sí viene en el comprimido y es válida, **When** se procesa, **Then** el producto se registra con las fotos válidas y el resumen avisa cuáles faltaron.
5. **Given** productos de la lista «Productos nuevos sin foto», **When** el administrador sube una carga nueva con esos renglones y sus fotos, **Then** se registran como productos nuevos.

---

### User Story 3 - Decidir qué productos existentes se actualizan (Priority: P2)

Cuando un renglón corresponde a un producto que ya está registrado, el sistema no lo cambia por su cuenta: lo muestra en la lista «Productos que ya existen», con los datos actuales junto a los del archivo, y el vendedor marca cuáles se actualizan y cuáles se dejan como están.

**Why this priority**: evita duplicados en el catálogo y evita que un archivo viejo sobrescriba precios o existencias sin que el vendedor lo decida.

**Independent Test**: subir un comprimido con 2 productos que ya existen con precios distintos, marcar solo uno para actualizar, confirmar, y comprobar que solo ese cambió de precio y el otro conserva sus datos.

**Acceptance Scenarios**:

1. **Given** un producto activo «Muñeca de trapo» y un renglón con el nombre «muñeca de trapo» o «Muneca de Trapo», **When** se procesa, **Then** no se crea un producto nuevo ni se modifica el existente, y el renglón aparece en «Productos que ya existen».
2. **Given** la lista «Productos que ya existen», **When** el administrador la revisa, **Then** ve por cada producto los datos actuales junto a los del archivo, con los datos que cambian resaltados.
3. **Given** la lista «Productos que ya existen», **When** el administrador marca algunos y confirma la actualización, **Then** solo los marcados se actualizan con los datos del archivo y el sistema muestra cuántos se actualizaron.
4. **Given** un producto marcado para actualizar, **When** se actualiza, **Then** su existencia se reemplaza por la cantidad del archivo, igual que en la edición individual; por ejemplo, con 5 existentes y 8 en el archivo queda en 8.
5. **Given** un producto marcado para actualizar cuyo renglón trae fotos, **When** se actualiza, **Then** se agregan solo las fotos cuyo nombre de archivo no se haya cargado antes para ese producto, sin quitar ninguna; si se sube dos veces el mismo archivo, las fotos no se duplican.
6. **Given** un producto existente con apartados vigentes, **When** la actualización dejaría su existencia por debajo de las unidades apartadas, **Then** ese producto no se actualiza y el sistema indica el motivo, igual que en la edición individual.
7. **Given** un producto existente con apartados, ventas o encargos registrados, **When** se actualiza su precio de venta, **Then** esas operaciones conservan su precio acordado.
8. **Given** un renglón de un producto existente con los mismos datos que ya tiene y sin fotos nuevas, **When** se procesa, **Then** no aparece en «Productos que ya existen» y el resumen lo cuenta como «Sin cambios».
9. **Given** la lista «Productos que ya existen», **When** el administrador confirma sin marcar ninguno, o sale de la pantalla sin confirmar, **Then** ningún producto existente cambia.

---

### User Story 4 - Descargar el reporte de la carga (Priority: P3)

Desde el resumen de la carga, el vendedor descarga un archivo de texto con los productos nuevos sin foto y los productos que ya existían, para revisarlo con calma, corregir sus datos y volver a subirlos si hace falta.

**Why this priority**: ayuda a validar la información, pero la carga ya es útil sin el reporte.

**Independent Test**: después de una carga con productos sin foto y productos existentes, descargar el reporte, abrirlo en un editor de texto y comprobar que contiene exactamente los renglones mostrados en ambas listas, con su motivo.

**Acceptance Scenarios**:

1. **Given** una carga con productos nuevos sin foto o productos que ya existen, **When** el administrador pide el reporte, **Then** descarga un archivo .txt separado por «|» con esos renglones.
2. **Given** el reporte descargado, **When** el administrador lo abre, **Then** cada renglón trae los datos del archivo original, el número de renglón, la lista a la que pertenece («Nuevo sin foto», «Ya existe» o «Rechazado») y el motivo.
3. **Given** una carga en la que el administrador ya confirmó la actualización de productos existentes, **When** descarga el reporte, **Then** cada producto existente dice «Actualizado», «No actualizado» o «No se pudo actualizar» con el motivo; si lo descarga antes de confirmar, dice «Pendiente de decidir».
4. **Given** un reporte descargado, **When** el administrador corrige sus renglones y quita las columnas del reporte, **Then** puede usarlos en una carga nueva con el mismo formato.
5. **Given** una carga sin productos sin foto, sin existentes con cambios y sin rechazados, **When** termina, **Then** el resumen indica que no hay nada que revisar y no ofrece un reporte vacío.

---

### Edge Cases

- **Nombre que coincide con más de un producto activo**: el renglón se rechaza con el motivo «Hay más de un producto con este nombre; actualízalo desde la edición individual».
- **Renglón repetido dentro del mismo archivo**: si dos renglones tienen el mismo nombre, sin importar mayúsculas ni acentos, se procesa el primero y el segundo se marca como rechazado con el motivo «Renglón repetido en el archivo».
- **Encabezado**: el primer renglón del archivo es el encabezado con los nombres de las columnas y no se procesa como producto; si falta o las columnas no coinciden con el formato, la carga se rechaza completa y se explica qué columna falta o sobra.
- **Número de columnas incorrecto en un renglón**: ese renglón se rechaza con su número y el motivo; el resto continúa.
- **Renglones vacíos**: se ignoran y no cuentan como rechazados.
- **Carácter «|» dentro de un texto**: no se admite en ningún dato; un renglón con columnas de más se rechaza.
- **Importes**: se aceptan con o sin decimales, con punto decimal y sin símbolo ni separador de miles, por ejemplo `1250.00`; se rechazan en cero, negativos, con más de dos decimales o con letras. Se guardan exactos al centavo.
- **Existencia**: número entero de cero o más; cero se acepta y el producto se muestra como agotado, igual que en el alta individual.
- **Subcategoría que no pertenece a la categoría**: si la subcategoría existe en otra categoría, se crea en la categoría indicada, como en el alta individual.
- **Fotos de más en el comprimido**: las fotos que ningún renglón menciona se ignoran y el resumen indica cuántas fueron.
- **Mayúsculas en el nombre de la foto**: `Muñeca.JPG` y `muñeca.jpg` se consideran el mismo archivo.
- **Fotos en carpetas dentro del comprimido**: se encuentran por su nombre de archivo, sin importar la carpeta.
- **Comprimido demasiado grande o con demasiados productos**: con más de 50 MB o más de 200 renglones de producto, se rechaza completo antes de procesar y se indica el límite.
- **Se pierde la conexión o se cierra la página durante la carga**: los productos ya registrados se quedan; el administrador puede volver a subir el mismo archivo y los ya registrados se contarán como «Sin cambios», sin duplicarse.
- **Producto dado de baja con el mismo nombre**: no cuenta como existente; el renglón se registra como producto nuevo.

## Requirements *(mandatory)*

### Functional Requirements

**Acceso**

- **FR-001**: La carga masiva MUST estar disponible solo en la sección de administrador, para quien tenga sesión de administrador (FR-001 de la spec 001).

**Formato del archivo**

- **FR-002**: El administrador MUST subir un solo archivo comprimido en formato .zip que contenga exactamente un archivo de productos .txt y las fotos de esos productos. Una carga MUST admitir hasta 200 renglones de producto y un comprimido de hasta 50 MB; una carga que exceda cualquiera de los dos límites MUST rechazarse completa antes de procesarse, indicando el límite. La pantalla de carga MUST mostrar ambos límites.
- **FR-003**: El archivo de productos MUST tener un renglón de encabezado y un renglón por producto, con estas columnas en este orden, separadas por «|»:

  `nombre|descripcion|categoria|subcategoria|existencia|precio_compra|precio_venta|fotos`

  - `subcategoria` puede ir vacía.
  - `fotos` lleva uno o más nombres de archivo de imagen separados por coma, por ejemplo `muneca1.jpg,muneca2.jpg`; la primera es la foto principal.
- **FR-004**: La sección de carga masiva MUST mostrar las columnas, un ejemplo de renglón y un archivo de ejemplo descargable.
- **FR-005**: El sistema MUST aceptar fotos en los mismos formatos y tamaños que el alta individual.

**Procesamiento**

- **FR-006**: El sistema MUST validar cada renglón con las mismas reglas del alta individual: nombre, descripción, categoría, existencia, precio de compra y precio de venta obligatorios; importes mayores que cero con dos decimales como máximo; existencia entera de cero o más.
- **FR-007**: Un renglón inválido MUST NOT registrarse y MUST NOT detener la carga del resto; el sistema MUST informar su número de renglón y el motivo.
- **FR-008**: El sistema MUST crear las categorías y subcategorías que no existan, y usar las existentes cuando el nombre coincida sin importar mayúsculas ni acentos (FR-007 de la spec 001).
- **FR-009**: Un renglón MUST considerarse de un producto que ya existe cuando su nombre coincide con el de un producto activo, sin importar mayúsculas ni acentos. Si coincide con más de uno, el renglón MUST rechazarse con su motivo.
- **FR-010**: El sistema MUST registrar como producto nuevo cada renglón válido que no corresponda a un producto existente y que tenga al menos una foto válida en el comprimido, con sus fotos y el texto alternativo basado en su nombre (FR-016 de la spec 001).
- **FR-011**: Un renglón nuevo sin ninguna foto válida, porque no indica foto, porque la foto no viene en el comprimido o porque no es una imagen válida, MUST NOT registrarse y MUST aparecer en la lista «Productos nuevos sin foto» con el motivo. Si al menos una de sus fotos es válida, el producto se registra con las válidas y el resumen avisa cuáles faltaron.
- **FR-012**: Un renglón que corresponde a un producto existente MUST NOT crear un producto nuevo ni modificar el existente hasta que el administrador lo elija (FR-014 a FR-017). Si todos sus datos coinciden con los actuales, comparando el texto sin importar mayúsculas ni acentos y los importes al centavo, y no trae fotos nuevas, MUST contarse como «Sin cambios» y MUST NOT aparecer en la lista «Productos que ya existen» ni en el reporte.

**Resumen de la carga**

- **FR-013**: Al terminar el procesamiento, el sistema MUST mostrar un resumen con: productos nuevos registrados, productos nuevos sin foto, productos que ya existen con cambios, productos sin cambios, renglones rechazados y fotos del comprimido que no se usaron, cada uno con su cantidad.

**Productos existentes**

- **FR-014**: La lista «Productos que ya existen» MUST mostrar por producto sus datos actuales junto a los del archivo y resaltar los que cambian.
- **FR-015**: El administrador MUST poder marcar uno, varios o todos los productos de la lista y confirmar su actualización; solo los marcados se actualizan.
- **FR-016**: Al actualizar un producto, el sistema MUST reemplazar nombre, descripción, categoría, subcategoría, precio de compra y precio de venta con los del archivo, reemplazar la existencia por la cantidad del archivo, y agregar las fotos del renglón cuyo nombre de archivo no se haya cargado antes para ese producto, sin quitar las que ya tiene.
- **FR-017**: Un producto cuya actualización viole una regla de la edición individual, como dejar la existencia por debajo de las unidades apartadas vigentes, MUST NOT actualizarse; el sistema MUST indicar el motivo y actualizar los demás marcados.

**Reporte**

- **FR-018**: Desde el resumen, el administrador MUST poder descargar un reporte .txt separado por «|» con los renglones de productos nuevos sin foto, productos que ya existen y renglones rechazados.
- **FR-019**: Cada renglón del reporte MUST traer el número de renglón del archivo original, la lista a la que pertenece, el motivo y las columnas del formato de FR-003 con los datos del archivo. Los renglones de productos existentes MUST traer además su resultado: «Pendiente de decidir» antes de confirmar, y «Actualizado», «No actualizado» o «No se pudo actualizar» con el motivo después de confirmar. El reporte MUST poder descargarse antes y después de confirmar, mientras el administrador siga en el resumen de la carga.
- **FR-020**: El reporte MUST poder abrirse en cualquier editor de texto con acentos y «ñ» legibles.

**Idioma y formato**

- **FR-021**: Todos los textos, mensajes y el reporte MUST estar en español de México; los importes en pantalla MUST mostrarse con símbolo, separador de miles y dos decimales, y la fecha de la carga con el mes escrito, el año completo, a. m. o p. m. y la zona horaria.

### Key Entities

- **Archivo de carga**: el comprimido que sube el administrador; contiene el archivo de productos y las fotos.
- **Renglón de carga**: un producto descrito en el archivo, con su número de renglón, sus datos y su resultado: nuevo, nuevo sin foto, ya existe, sin cambios o rechazado, con motivo.
- **Resumen de carga**: el resultado de una carga, con sus cantidades por resultado, la fecha y hora en que se hizo y las decisiones del administrador sobre los productos existentes.
- **Reporte de carga**: el archivo de texto descargable con los renglones que requieren revisión.
- **Producto, Categoría, Subcategoría**: las mismas de la spec 001; esta spec no les agrega datos.
- **Foto**: la misma de la spec 001; las fotos que entran por carga masiva conservan el nombre de archivo con el que venían en el comprimido, para no volver a agregarlas a un producto que ya las tiene.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El vendedor da de alta 50 productos con sus fotos en menos de 10 minutos, contando desde que tiene listo el comprimido hasta ver el resumen, frente a capturarlos uno por uno.
- **SC-002**: Después de una carga, el número de «productos nuevos» del resumen coincide exactamente con los productos nuevos que aparecen en la lista de administrador.
- **SC-003**: En una carga de prueba con productos sin foto preparados a propósito, el 100 % aparece en «Productos nuevos sin foto» y ninguno aparece en la lista de administrador ni en el catálogo.
- **SC-004**: Al volver a subir el mismo comprimido, el resumen marca 0 productos nuevos y todos los registrados en la primera carga como «Sin cambios»; el catálogo no muestra duplicados ni fotos repetidas.
- **SC-005**: Ningún producto existente cambia si el administrador no lo marcó; se comprueba revisando sus datos antes y después de la carga.
- **SC-006**: El reporte descargado se abre en el Bloc de notas con acentos y «ñ» correctos, y su número de renglones coincide con el total de productos sin foto, existentes y rechazados del resumen.
- **SC-007**: Un vendedor que no ha usado la función antes logra hacer su primera carga solo con las instrucciones y el ejemplo de la pantalla, sin ayuda.
- **SC-008**: La carga masiva y su resumen funcionan en portátil y en móvil.

## Assumptions

- El archivo de productos usa codificación UTF-8, la que guardan por omisión el Bloc de notas y la mayoría de los editores actuales.
- Los precios se escriben en pesos mexicanos sin símbolo; no hay columna de moneda.
- El orden de las columnas es fijo; no se admiten columnas extra ni columnas en otro orden.
- Las decisiones sobre productos existentes se toman en la misma pantalla de resultados; si el administrador sale sin confirmar, esos productos no se actualizan y puede volver a subir el archivo.
- No se guarda un historial de cargas anteriores; el reporte se descarga desde el resumen de la carga recién hecha.
- La carga masiva no da de alta artículos por encargo (FR-025 de la spec 001) ni registra ventas, apartados o encargos.
- La carga masiva no da de baja productos ni quita fotos.
- Solo los productos activos cuentan como «ya existen»; los dados de baja no se reactivan por carga masiva.
