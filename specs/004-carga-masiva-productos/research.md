# Research: Carga masiva de productos

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Fecha**: 2026-11-07

La tecnología base es la de la spec 001 ([research de la 001](../001-catalogo-ventas-apartados/research.md)). Aquí solo se registran las decisiones nuevas. No quedan puntos «NEEDS CLARIFICATION»: las siete aclaraciones de la spec resolvieron el comportamiento, y lo técnico se decide abajo.

## 1. Lectura del comprimido

- **Decision**: se agrega `fflate` 0.8.3 y se usa `unzipSync` con su opción `filter`. Primero se recorre el directorio central para conocer nombres y tamaños. Luego se descomprime el .txt y después solo las fotos que mencionan los renglones.
- **Rationale**:
  - Node 24 trae `zlib.inflateRawSync`, pero no un lector de .zip; escribir uno a mano exige interpretar el directorio central, Zip64 y las banderas, y es fácil equivocarse.
  - `fflate` está escrito en JavaScript puro y no tiene dependencias, así que no complica la imagen de Docker como lo haría un módulo nativo. Cabe en la salida `standalone` sin configurarlo en `serverExternalPackages`.
  - `filter` recibe el nombre y los tamaños comprimido y original **antes** de descomprimir, lo que permite aplicar los límites de [research 2](#2-límites-y-protección-del-servidor).
- **Alternatives considered**:
  - `yauzl`: lee desde disco o flujo y obligaría a escribir el comprimido en un archivo temporal; su API de callbacks es más larga para un archivo que ya está en memoria.
  - `jszip`: más pesado y asíncrono por entrada, sin ventaja para este caso.
  - `adm-zip`: tiene antecedentes de recorrido de rutas al extraer a disco; aquí nunca se extrae a disco con el nombre original, pero no aporta nada sobre `fflate`.

## 2. Límites y protección del servidor

- **Decision**: la ruta `POST /api/admin/cargas` hace en orden:
  1. `exigirSesion()`.
  2. Si `Content-Length` pasa de 50 MB (52,428,800 bytes), rechaza sin leer el cuerpo.
  3. Lee el cuerpo por partes y se detiene si pasa de 50 MB, aunque `Content-Length` falte o mienta.
  4. Revisa el comprimido: menos de 2,000 entradas, exactamente un `.txt` de hasta 2 MB sin descomprimir y cada foto mencionada de hasta 10 MB (FR-005). Las fotos que pasan del límite se tratan como «La foto no es una imagen válida». Después de descomprimir, compara el tamaño real con el declarado.
  5. Cuenta los renglones de producto. Si son más de 200, rechaza la carga completa antes de registrar nada (FR-002).
- **Rationale**: el límite de 50 MB lo fija la spec. Los otros límites salen de ella: 200 renglones con pocas fotos cada uno no llegan a 2,000 entradas, y 200 renglones caben de sobra en 2 MB. Como las fotos que ningún renglón menciona no se descomprimen, un comprimido con relleno no consume memoria. La ruta no pasa por `proxy.ts`, cuyo `matcher` solo cubre `/admin`, así que el límite de 10 MB de `proxyClientMaxBodySize` no le aplica.
- **Alternatives considered**:
  - Una acción de servidor con `serverActions.bodySizeLimit: "55mb"`: sube el límite para **todas** las acciones del panel y del cliente, y ese límite de 1 MB es una protección que conviene conservar.
  - `multipart/form-data` con `request.formData()`: Next.js arma todo el formulario en memoria antes de poder revisar el tamaño. El cuerpo binario sigue el patrón que ya usa `POST /api/fotos`.

## 3. Nombres de archivo dentro del comprimido

- **Decision**:
  - Se usa solo el nombre del archivo, sin la carpeta.
  - Se ignoran las carpetas, las entradas bajo `__MACOSX/` y los nombres que empiezan con `._` (copias de metadatos que agrega macOS).
  - Si la entrada trae la bandera UTF-8 (bit 11), el nombre ya viene en UTF-8. Si no la trae, se recuperan sus bytes (`fflate` los entrega como latin-1, que conserva cada byte) y se intenta leerlos como UTF-8 estricto; si no son UTF-8 válido, se leen como **CP850**, con una tabla de 128 caracteres en `comprimido.ts`.
  - El nombre para comparar es la forma NFC en minúsculas (`toLowerCase()`). Así `Muñeca.JPG` y `muñeca.jpg` son el mismo archivo, como pide la spec. Los acentos sí cuentan: `muneca.jpg` y `muñeca.jpg` son archivos distintos.
  - Si dos fotos con el mismo nombre vienen en carpetas distintas, se usa la primera según el orden del comprimido.
- **Rationale**: «Enviar a > Carpeta comprimida» de Windows escribe los nombres no ASCII en la página de códigos OEM, que en una instalación en español es la 850, y no pone la bandera UTF-8. Sin esta conversión, una foto `muñeca.jpg` nunca coincidiría con el renglón. macOS guarda los nombres en NFD, de ahí la normalización a NFC.
- **Alternatives considered**:
  - Comparar los nombres de las fotos sin acentos, como los de los productos: la spec pide solo ignorar las mayúsculas de las fotos (caso límite «Mayúsculas en el nombre de la foto»), y dos fotos distintas podrían chocar.
  - Pedir al vendedor que no use acentos en los nombres de las fotos: es más frágil que leerlos bien. El ejemplo descargable sí usa nombres sin acentos.
  - Rechazar los nombres repetidos en carpetas distintas: agregaría un motivo que la spec no define.

## 4. Lectura del archivo de productos

- **Decision**:
  - Se decodifica con `TextDecoder("utf-8", { fatal: true })` y se quita el BOM inicial. Si el texto no es UTF-8 válido, la carga se rechaza completa con «El archivo de productos debe guardarse con codificación UTF-8.».
  - Se separan los renglones por `\r\n` o `\n`, y los vacíos o solo con espacios se ignoran (caso límite «Renglones vacíos»).
  - El número de renglón es su posición en el archivo, contando desde 1 e incluyendo el encabezado y los vacíos, para que coincida con lo que muestra el Bloc de notas.
  - El primer renglón no vacío es el encabezado. Sus columnas se comparan, recortadas y normalizadas con `normalizarNombre`, contra la lista de FR-003. Si no coinciden, la carga se rechaza completa y el mensaje dice qué columnas faltan, cuáles sobran o si el orden es distinto.
- **Rationale**: es el supuesto «UTF-8» de la spec. Leer el archivo como latin-1 sin avisar guardaría nombres con caracteres rotos en el catálogo. Comparar el encabezado normalizado acepta «Nombre» o «descripción» sin cambiar el orden fijo.
- **Alternatives considered**: detectar la codificación por heurística: puede confundirse con textos cortos y la spec ya fija UTF-8.

## 5. Validación de cada renglón

- **Decision**: `validarRenglon(campos)` de `src/dominio/carga-masiva.ts` devuelve los datos listos o el primer motivo de rechazo. Las reglas son:
  - Exactamente 8 columnas (casos límite «Número de columnas incorrecto» y «Carácter |»).
  - Cada campo se recorta y los espacios internos repetidos de nombre, categoría y subcategoría se reducen a uno, igual que en el alta individual.
  - `nombre`, `descripcion` y `categoria` no pueden ir vacíos; `subcategoria` sí.
  - `existencia` debe cumplir `^\d+$`; se acepta el cero.
  - `precio_compra` y `precio_venta` se leen con un validador nuevo, `parsearImporteArchivo`, en `src/dominio/dinero.ts`. Acepta `^\d+(\.\d{1,2})?$`, mayor que cero, y convierte a centavos enteros con la misma aritmética de `parsearPrecio`. A diferencia del alta individual, rechaza `$` y las comas de miles: en el archivo, la coma separa fotos y la spec pide el formato `1250.00`.
  - Los nombres de categoría o subcategoría reservados («Todos») se rechazan con el mensaje de `validarNombre`.
  - `fotos` se separa por coma, se recorta y se quitan los vacíos y los repetidos (sin mayúsculas), conservando el orden.

  Los motivos están en [contracts/archivo-carga.md](contracts/archivo-carga.md#motivos).
- **Rationale**: FR-006 pide las mismas reglas del alta individual, y estas son las de `leerDatos` en `src/acciones/productos.ts`. La única diferencia es el formato del importe, que la spec fija de forma explícita. Como son reglas puras, se prueban sin base de datos.
- **Alternatives considered**: reusar `parsearPrecio` tal cual: aceptaría `1,250.00`, que contradice el caso límite «Importes».

## 6. Clasificación y alta de los nuevos

- **Decision**: `procesarCarga` de `src/servicios/carga-masiva/procesar.ts` recorre los renglones en orden:
  1. **Repetido**: el renglón se rechaza si su nombre normalizado ya apareció en un renglón anterior con 8 columnas y nombre.
  2. **Inválido**: se rechaza con el motivo de `validarRenglon`.
  3. **Coincidencias**: se buscan los productos activos con `normalizar(nombre)` igual (función de SQLite de la spec 002). Si son dos o más, el renglón se rechaza (FR-009).
  4. **Ya existe**: con una coincidencia, se compara con los datos actuales (research 7). Si nada cambia y no trae fotos nuevas, cuenta como «Sin cambios». Si algo cambia, sus fotos nuevas se validan y se guardan en disco con `guardarFoto`, y el renglón va a «Productos que ya existen».
  5. **Nuevo**: sin coincidencias, se validan sus fotos. Si ninguna es válida, va a «Productos nuevos sin foto» con el motivo de la primera que falló, y no se registra nada. Si hay al menos una válida, las válidas se guardan en disco y el producto se crea con `crearProducto` en su propia transacción `IMMEDIATE`, guardando `nombre_original` en cada foto. Las que faltaron van como aviso en el resumen.
  6. Si `crearProducto` lanza un `ErrorNegocio`, por ejemplo por la categoría «Todos», el renglón pasa a rechazados con el mensaje de ese error y la carga sigue (FR-007).

  Al final se cuentan las fotos del comprimido que ningún renglón mencionó, sin contar las ignoradas de `__MACOSX/` (caso límite «Fotos de más»).
- **Rationale**:
  - Una transacción por producto cumple el caso límite «Se pierde la conexión»: lo ya registrado se queda. Al volver a subir el archivo, esos productos ya existen, sus datos coinciden y sus fotos ya tienen `nombre_original`, así que cuentan como «Sin cambios» (SC-004).
  - Las fotos de los nuevos se validan con `sharp` antes de crear el producto. Así un producto nunca queda sin foto (FR-016 de la spec 001).
  - Como un renglón repetido se rechaza antes de buscar coincidencias, dos renglones del mismo archivo nunca crean dos productos.
- **Alternatives considered**:
  - Una sola transacción para toda la carga: un fallo a la mitad tiraría todo, y una carga larga bloquearía las demás escrituras (ventas, apartados) mientras dura.
  - Guardar las fotos después de crear el producto: si el disco fallara, el producto quedaría sin foto.

## 7. Comparación y confirmación de los existentes

- **Decision**:
  - **Comparación** (`compararConActual`, puro): nombre, descripción, categoría y subcategoría se comparan con `normalizarNombre`; existencia y precios, en enteros y centavos. Una foto es nueva si su nombre normalizado no está en el `nombre_original` de **ninguna** foto del producto, activa o dada de baja: «no se haya cargado antes» incluye las que el vendedor quitó a mano, para que una carga no las reviva. Las fotos del renglón que no vienen en el comprimido se avisan, pero no impiden la actualización.
  - **Estado entre el resumen y la confirmación**: el servidor no guarda la carga. La respuesta trae, por cada existente con cambios, `productoId`, los 8 campos originales del renglón, los datos actuales, los cambios y las fotos nuevas ya guardadas en disco como `{ archivo, nombreOriginal }`. El navegador conserva todo eso mientras el administrador está en la pantalla.
  - **Confirmación**: `confirmarActualizaciones` de `src/acciones/carga-masiva.ts` recibe los renglones marcados y, por cada uno, en su propia transacción:
    1. vuelve a validar los 8 campos con `validarRenglon`;
    2. comprueba que el producto sigue activo y que el nombre del renglón sigue coincidiendo, normalizado, con él y solo con él;
    3. acepta solo fotos con nombre UUID válido que existan en la carpeta de fotos;
    4. revisa que la existencia nueva no quede por debajo de `unidadesApartadas` (FR-017);
    5. actualiza las columnas con `columnas()` de `servicios/productos.ts`, exportada, lo que resuelve o crea la categoría y la subcategoría;
    6. agrega las fotos con `agregarFotosNuevas`, que se salta las que ya tengan ese `nombre_original` y nunca da de baja ninguna.

    Devuelve por producto `actualizado` o `error` con su mensaje. Los no marcados quedan «No actualizado» en el navegador.
  - **Precios de las operaciones**: la actualización solo escribe en `productos` y `fotos`; las operaciones guardan su `precio_unitario_centavos`, así que conservan el precio acordado (US3-7).
- **Rationale**:
  - Guardar la carga en la base o en memoria del servidor sería un historial que la spec excluye. En memoria, además, se perdería al reiniciar o al desplegar.
  - Como el servidor vuelve a validar todo, los datos que vienen del navegador no se usan sin revisar; el único efecto de manipularlos sería el mismo que editar el producto a mano.
  - `sincronizarFotos` da de baja las fotos que no vienen en la lista, y FR-016 pide no quitar ninguna; por eso se agrega una función aparte.
  - Repetir la confirmación (doble clic, reintento) no duplica fotos por la revisión de `nombre_original`, y los datos quedan iguales.
- **Alternatives considered**:
  - Volver a subir el comprimido al confirmar: dobla el tiempo de subida desde el celular.
  - Guardar las fotos de los existentes solo al confirmar: obliga a conservar el comprimido en el servidor entre las dos peticiones.

## 8. Subida desde el navegador

- **Decision**: `cargador-masivo.tsx` usa un `<input type="file" accept=".zip,application/zip">` nativo con su etiqueta. Antes de subir revisa la extensión y el tamaño, y si el archivo pasa de 50 MB lo rechaza ahí mismo con el mismo mensaje del servidor. Envía el archivo con `XMLHttpRequest` para mostrar el progreso de subida en un `<progress>` con texto en una región `aria-live="polite"`. Al terminar la subida muestra «Procesando los productos…» hasta que llega el resumen. El botón queda deshabilitado mientras tanto.
- **Rationale**: en el celular, 50 MB pueden tardar minutos; sin progreso, el vendedor no sabe si la página se colgó (SC-008). `fetch` no informa el progreso de subida en todos los navegadores actuales.
- **Alternatives considered**: `fetch` con un indicador indeterminado: no distingue «subiendo» de «colgado».

## 9. Reporte y archivo de ejemplo

- **Decision**:
  - Se arman en el navegador con funciones puras de `src/dominio/carga-masiva.ts` y se descargan con un `Blob` y un enlace `download`. No hay ruta en el servidor.
  - El texto lleva el BOM UTF-8 (`﻿`) y renglones `\r\n`, para que el Bloc de notas muestre bien acentos y «ñ» (FR-020, SC-006).
  - Columnas: las 8 de FR-003 primero y al final `renglon|lista|resultado|motivo`. Para reutilizar el reporte basta con borrar las cuatro últimas columnas de cada renglón y del encabezado (US4-4).
  - Un renglón rechazado por número de columnas se escribe con sus campos tal como venían; si traía menos de 8, se completa con campos vacíos para que las columnas del reporte queden en su lugar.
  - Nombre del archivo: `reporte-carga-AAAA-MM-DD-HHMM.txt`, con la hora de México. Ejemplo: `ejemplo-carga-masiva.txt`.
  - Si no hay renglones que revisar, no se ofrece el botón (US4-5).
- **Rationale**: el reporte cambia al confirmar (US4-3) y el servidor no guarda la carga, así que el navegador, que tiene el resumen y los resultados, es quien puede armarlo. Poner las columnas del formato primero facilita reutilizarlas.
- **Alternatives considered**:
  - Una ruta que reciba el resumen y devuelva el archivo: hace un viaje de ida y vuelta para algo que el navegador ya tiene.
  - Las columnas del reporte primero: para reutilizarlo habría que borrar el inicio de cada renglón, que es más fácil de hacer mal en el Bloc de notas.

## 10. Nombre original de la foto

- **Decision**: columna `nombre_original text` nula en `fotos`, con el nombre normalizado (minúsculas, NFC, sin carpeta). Se guarda solo en las fotos que entran por carga masiva; las del alta individual quedan en nulo. Migración `0002` generada con `npm run db:generar`: un `ALTER TABLE … ADD COLUMN` y un índice único parcial `(producto_id, nombre_original) WHERE nombre_original IS NOT NULL`, sin reconstrucción. Las filas existentes quedan en nulo y no chocan con el índice.
- **Rationale**: lo pide la entidad «Foto» de la spec. El archivo en disco se sigue llamando con un UUID, así que el nombre del vendedor nunca llega a una ruta del sistema de archivos.
- **Alternatives considered**: comparar las fotos por su contenido (hash): detectaría la misma foto con otro nombre, pero la spec define la regla por el nombre.

## 11. Pantalla del resumen

- **Decision**:
  - Una sola página de cliente con dos estados: «Subir» y «Resumen».
  - Arriba del resumen, la fecha y hora de la carga y seis cantidades, en tarjetas con número y texto (FR-013).
  - Secciones con encabezado `h2`, en este orden: «Productos nuevos sin foto», «Productos que ya existen», «Renglones rechazados» y «Avisos de fotos».
  - Cada producto existente es una tarjeta con su casilla nativa y una tabla de dos columnas, «Ahora» y «En el archivo». Los datos que cambian llevan el texto «Cambia» además del resaltado de color (FR-014, Principio VII).
  - Botones «Marcar todos», «Desmarcar todos» y «Actualizar marcados (N)».
  - Si el administrador intenta salir con existentes sin confirmar, el navegador lo avisa con `beforeunload`. Si sale, nada cambia (US3-9).
- **Rationale**: en el celular, una tabla ancha con 8 columnas por producto no cabe; una tarjeta por producto con dos columnas sí (SC-008). El texto «Cambia» hace que la diferencia no dependa solo del color.
- **Alternatives considered**: una tabla con una fila por producto y columnas dobles: obliga a desplazarse hacia los lados en el celular.

## 12. Textos nuevos (es-MX)

Los textos de la pantalla, los motivos y los encabezados del reporte están en [contracts/archivo-carga.md](contracts/archivo-carga.md) y [contracts/interfaz.md](contracts/interfaz.md). Se escriben en un solo módulo, `src/dominio/carga-masiva.ts`, para que las pruebas comparen contra la misma fuente.

## 13. Notas de implementación

- **T002 (guías de Next.js 16.4)**: la guía de Route Handlers confirma que el cuerpo se lee con los métodos estándar de `Request` (`request.body` es un `ReadableStream`) y que no hay `bodyParser` ni límite de tamaño propio. La de `proxy` confirma que `proxyClientMaxBodySize` solo aplica a las rutas que cubre el `matcher`; el de `src/proxy.ts` cubre solo `/admin`, así que `/api/admin/cargas` no pasa por ahí. `revalidatePath` se puede llamar desde un Route Handler y marca la ruta para revalidarse en la siguiente visita. Nada cambia respecto a lo planeado.
- **Banderas UTF-8 del comprimido**: `fflate` entrega los nombres sin la bandera UTF-8 como latin-1, pero no informa si la entrada la traía. Un nombre con la bandera y solo caracteres hasta U+00FF (por ejemplo «muñeca.jpg») sería indistinguible. Por eso `comprimido.ts` recorre el directorio central para leer la bandera de cada entrada, en el mismo orden en que `fflate` llama a `filter`. Si el recorrido no cuadra (por ejemplo, con Zip64), se usan los nombres de `fflate` tal cual.
- **Descompresión por foto**: cada foto se descomprime cuando el renglón la pide y se escribe en disco de inmediato. Así la memoria nunca guarda más de una foto a la vez, aunque el comprimido declare muchas fotos grandes.
- **Textos de la pantalla**: los mensajes, motivos y textos del reporte viven en `src/dominio/carga-masiva.ts`, que es lo que comparan las pruebas. Las etiquetas de botones y encabezados están en los componentes, igual que en el resto del panel.
- **Dos mensajes que el contrato no tenía**: «El comprimido trae demasiados archivos. Divide los productos en varias cargas.» (límite de 2,000 entradas de research 2) y «Las fotos nuevas ya no están disponibles; vuelve a subir el comprimido.» (confirmación con un archivo de foto inexistente). Se agregaron a los contratos.
