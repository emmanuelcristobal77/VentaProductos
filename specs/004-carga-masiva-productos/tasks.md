---

description: "Lista de tareas para implementar la carga masiva de productos desde un comprimido .zip"
---

# Tasks: Carga masiva de productos

**Input**: Design documents from `/specs/004-carga-masiva-productos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/archivo-carga.md, contracts/interfaz.md, quickstart.md

**Tests**: se incluyen porque el Principio V de la constitución los exige. Cada prueba nombra en su título el FR, SC, escenario o caso límite que cubre, por ejemplo `FR-011: un nuevo sin foto válida no se registra`. Se escriben primero y deben fallar antes de implementar.

**Organization**: las tareas se agrupan por historia de usuario de la spec 004:

- **US1**: dar de alta muchos productos con un solo archivo (P1).
- **US2**: ver los productos nuevos que quedaron sin foto (P1).
- **US3**: decidir qué productos existentes se actualizan (P2).
- **US4**: descargar el reporte de la carga (P3).

Para no chocar con las specs anteriores, sus pruebas e2e se llaman `us13-carga-masiva.spec.ts` (US1 y US2), `us14-existentes.spec.ts` (US3) y `us15-reporte-carga.spec.ts` (US4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario de la spec 004 a la que pertenece (US1 a US4)

## Reglas para todas las tareas

- Las specs 001 a 004 están aprobadas y sus `spec.md` no se modifican.
- Todo texto visible, motivo y mensaje va en español de México, exactamente como en [contracts/archivo-carga.md](contracts/archivo-carga.md) y [contracts/interfaz.md](contracts/interfaz.md), y vive en un solo módulo, `src/dominio/carga-masiva.ts` (research 12). Las pruebas comparan contra las constantes de ese módulo.
- Los importes se guardan y se comparan en centavos enteros; en pantalla se muestran con `formatearPrecio`, y la fecha y hora con `formatearFecha` y `formatearHora` (Principio II, FR-021).
- `crearProducto`, `actualizarProducto` y `sincronizarFotos` conservan su comportamiento para el alta y la edición individuales; las pruebas de las specs 001 a 003 no cambian sus aserciones.
- Ningún nombre de archivo del vendedor se usa como ruta en disco: las fotos se guardan siempre con `guardarFoto`, que les pone un UUID (research 10).
- La carga masiva no crea artículos por encargo, ni operaciones, ni da de baja productos o fotos, ni reactiva productos dados de baja (Principio IV, supuestos de la spec).
- Los selectores de Playwright usan `getByRole`, `getByLabel` o `filter({ visible: true })`.
- Los mensajes de commit van en español de México.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependencia nueva, lectura previa y material de prueba

- [X] T001 Instalar `fflate` con la versión exacta `0.8.3` en dependencies de package.json (`npm install fflate@0.8.3 --save-exact`) y confirmar que `npm run build` sigue generando la salida `standalone` sin agregarlo a `serverExternalPackages` de next.config.ts (research 1)
- [X] T002 Leer en node_modules/next/dist/docs/ las guías de Route Handlers (lectura del cuerpo como flujo con `request.body`, `Content-Length`, respuestas con estado), de `proxy` (`matcher` y `proxyClientMaxBodySize`) y de `revalidatePath` dentro de un Route Handler, como pide AGENTS.md. Anotar en specs/004-carga-masiva-productos/research.md, sección 13 «Notas de implementación», cualquier diferencia con lo planeado (research 2)
- [X] T003 [P] Crear tests/fixtures/carga-masiva/ con fotos pequeñas válidas (`roja.jpg`, `azul.png`, `verde.webp`, de menos de 20 KB, generadas con `sharp` desde un script o copiadas), un archivo `no-es-imagen.jpg` con texto plano, y un README.md de una línea que diga para qué sirven
- [X] T004 [P] Crear tests/integration/ayudantes-carga.ts con:
  - `armarComprimido(entradas: Record<string, Uint8Array | string>)`, que usa `zipSync` de `fflate` y codifica los textos en UTF-8;
  - `armarTxt(renglones: string[][], { bom?, crlf? })`, que antepone el encabezado de FR-003;
  - `comprimidoConNombreCp850(nombre, contenido)`, que arma el .zip con un nombre ASCII provisional del mismo largo en bytes y luego reemplaza esos bytes por los del nombre en CP850 en el encabezado local y en el directorio central, con la bandera UTF-8 (bit 11) apagada en ambos (research 3)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: columna nueva de `fotos`, reglas puras del archivo y lector del comprimido, que usan todas las historias

**⚠️ CRITICAL**: ninguna historia puede empezar antes de terminar esta fase

### Pruebas de la fase base

- [X] T005 [P] Escribir pruebas en tests/integration/migracion-0002.test.ts: aplicar solo las migraciones `0000` y `0001` en una carpeta temporal (como tests/integration/migracion-0001.test.ts), sembrar un producto con dos fotos y un artículo por encargo con una, aplicar la carpeta completa y comprobar:
  - el número de fotos no cambió y todas tienen `nombre_original` en `NULL`;
  - `PRAGMA foreign_key_check` no devuelve filas;
  - el índice `fotos_nombre_original` rechaza dos fotos del mismo `producto_id` con el mismo `nombre_original` no nulo, y acepta dos fotos con `nombre_original` nulo en el mismo producto
- [X] T006 [P] Agregar casos a tests/unit/dinero.test.ts para `parsearImporteArchivo` (caso límite «Importes»): acepta `1250`, `1250.5` → 125050, `1250.00` → 125000, `0.01` → 1; rechaza `0`, `0.00`, `-5`, `1,250.00`, `$1250`, `12.345`, `12a`, `''`, ` ` y `1e3`
- [X] T007 [P] Escribir pruebas en tests/unit/carga-masiva-renglones.test.ts para las funciones puras de src/dominio/carga-masiva.ts:
  - `leerArchivoProductos(bytes)`: quita el BOM; acepta `\r\n` y `\n`; ignora los renglones vacíos o solo con espacios y conserva la numeración del Bloc de notas (encabezado = 1, cuenta los vacíos); lanza el mensaje «El archivo de productos debe guardarse con codificación UTF-8.» con bytes latin-1 inválidos en UTF-8; rechaza «El archivo de productos no trae ningún producto.» y «El archivo trae 201 productos; el máximo por carga es 200.» (FR-002)
  - `revisarEncabezado(campos)`: acepta `Nombre|Descripción|…` con mayúsculas, acentos y espacios; devuelve «Falta la columna «fotos».», «Sobra la columna «color».» y «Las columnas están en otro orden.» según el caso (caso límite «Encabezado»)
  - `validarRenglon(campos)`: devuelve los datos con importes en centavos, existencia entera y fotos separadas por coma, recortadas, sin vacíos ni repetidas sin importar mayúsculas y en su orden (FR-003); acepta existencia `0` y subcategoría vacía; reduce los espacios internos repetidos de nombre, categoría y subcategoría; devuelve el primer motivo en el orden de la tabla «Rechazado» de contracts/archivo-carga.md: «El renglón trae 7 columnas; deben ser 8.», «Falta el nombre.», «Falta la descripción.», «Falta la categoría.», «La existencia debe ser un número entero de 0 en adelante.» (para `-1`, `2.5`, `a`, vacío), y los dos motivos de precio (FR-006, casos límite «Número de columnas» y «Carácter |»)
  - `compararConActual(actual, archivo, fotosNuevas)`: compara nombre, descripción, categoría y subcategoría con `normalizarNombre` («muñeca de trapo» = «Muneca de Trapo»), existencia y precios en enteros, y agrega `fotos` a `cambios` solo si `fotosNuevas` no está vacía; sin diferencias devuelve `cambios` vacío (FR-012)
- [X] T008 [P] Escribir pruebas en tests/integration/carga-masiva-comprimido.test.ts para `leerComprimido` de src/servicios/carga-masiva/comprimido.ts, con los ayudantes de T004 (FR-002, research 2 y 3):
  - un archivo que no es .zip (los bytes de una foto) → «El archivo no es un comprimido .zip válido.»;
  - sin `.txt` → «El comprimido no trae el archivo de productos (.txt).»; con dos → «El comprimido trae más de un archivo .txt; deja solo el de productos.»; un `.txt` de más de 2 MB → «El archivo de productos es demasiado grande. Divide los productos en varias cargas.»;
  - ignora carpetas, `__MACOSX/._productos.txt` y `._foto.jpg`, que no cuentan como segundo `.txt` ni como fotos no usadas;
  - encuentra `fotos/sub/Muñeca.JPG` al pedir `muñeca.jpg` (casos límite «Mayúsculas» y «Fotos en carpetas»), y no lo encuentra al pedir `muneca.jpg`;
  - encuentra una foto cuyo nombre `muñeca.jpg` viene en CP850 sin la bandera UTF-8, y una con nombre NFD (como lo guarda macOS);
  - con dos fotos del mismo nombre en carpetas distintas, entrega la primera del comprimido;
  - no descomprime las fotos que no se piden y cuenta como no usadas las que ningún renglón menciona (caso límite «Fotos de más»);
  - una foto pedida que declara más de 10 MB se marca como no válida sin descomprimirse

### Implementación base

- [X] T009 Agregar a `fotos` en src/db/esquema.ts, según data-model.md, la columna `nombreOriginal: text("nombre_original")`, nulo permitido: «Nombre del archivo como venía en el comprimido, sin carpeta, en NFC y minúsculas. Nulo en las fotos del alta individual y en las anteriores a esta spec», y el índice `uniqueIndex("fotos_nombre_original").on(t.productoId, t.nombreOriginal).where(sql\`nombre_original IS NOT NULL\`)`
- [X] T010 Generar la migración con `npm run db:generar` en src/db/migraciones/0002_*.sql. Revisar el SQL: debe ser solo `ALTER TABLE fotos ADD COLUMN nombre_original text` y `CREATE UNIQUE INDEX fotos_nombre_original … WHERE nombre_original IS NOT NULL`, **sin reconstruir la tabla**. Hacer pasar T005
- [X] T011 [P] Agregar `parsearImporteArchivo(texto)` en src/dominio/dinero.ts: acepta solo `^\d+(\.\d{1,2})?$` tras recortar, convierte a centavos con la misma aritmética entera de `parsearPrecio` y devuelve `null` si no es mayor que cero o no es entero seguro (research 5). Hacer pasar T006
- [X] T012 Crear src/dominio/carga-masiva.ts con:
  - `COLUMNAS` (`nombre|descripcion|categoria|subcategoria|existencia|precio_compra|precio_venta|fotos`), `LIMITE_RENGLONES = 200`, `LIMITE_BYTES = 52_428_800`, `LIMITE_TXT = 2 * 1024 * 1024`, el texto del ejemplo de contracts/archivo-carga.md y todos los mensajes, motivos y textos de pantalla de los dos contratos como constantes;
  - los tipos `Campos`, `DatosRenglon`, `DatosComparables`, `ExistenteConCambios` y `ResumenCarga` de contracts/interfaz.md;
  - `leerArchivoProductos`, `revisarEncabezado`, `validarRenglon` y `compararConActual`, sin importar nada de `@/db`, `node:` ni `sharp`, para que también los use el navegador. El rechazo de «Todos» se valida aquí con el mismo texto de `validarNombre` de src/servicios/categorias.ts.

  Hacer pasar T007
- [X] T013 Crear src/servicios/carga-masiva/comprimido.ts con `leerComprimido(bytes)`, que devuelve `{ txt: Uint8Array, buscarFoto(nombre): Uint8Array | "noViene" | "noValida", fotosNoUsadas(mencionadas): number }`:
  - recorre el comprimido con `unzipSync` y `filter` sin descomprimir para listar las entradas, y rechaza si hay 2,000 o más;
  - ignora carpetas, `__MACOSX/` y nombres que empiezan con `._`;
  - decodifica cada nombre según research 3: con la bandera UTF-8, tal cual; sin ella, recupera los bytes del texto latin-1 que entrega `fflate`, intenta UTF-8 estricto y si falla usa la tabla CP850 de 128 caracteres de este módulo; luego toma solo el nombre sin carpeta en NFC y `toLowerCase()`;
  - descomprime el `.txt` y, bajo pedido, solo las fotos mencionadas; una entrada que declara más de 10 MB (`TAMANO_MAXIMO_FOTO`) o cuyo tamaño real no coincide con el declarado se trata como `"noValida"`;
  - traduce cualquier error de `fflate` al mensaje «El archivo no es un comprimido .zip válido.».

  Los rechazos completos se lanzan como `ErrorNegocio("DATOS_INVALIDOS", mensaje)`. Hacer pasar T008
- [X] T014 En src/servicios/fotos.ts, agregar un parámetro opcional `nombresOriginales?: Map<string, string>` (archivo → nombre original) a `sincronizarFotos`, que se guarda en `nombre_original` al insertar; y una función nueva `agregarFotosNuevas(tx, productoId, fotos: { archivo, nombreOriginal }[])` que inserta al final del orden solo las que no tengan ya una fila de ese producto con ese `nombre_original`, **activa o no**, y nunca da de baja ninguna (FR-016, data-model «Regla ya se cargó»). En src/servicios/productos.ts, exportar `columnas` y agregar a `crearProducto` el parámetro opcional `nombresOriginales`, que pasa a `sincronizarFotos`
- [X] T015 Ejecutar `npm run verificar` y confirmar que las pruebas de las specs 001 a 003 siguen en verde, antes de empezar las historias

**Checkpoint**: la base guarda el nombre original de las fotos, las reglas del archivo están probadas y el comprimido se lee con todos sus casos

---

## Phase 3: User Story 1 - Dar de alta muchos productos con un solo archivo (Priority: P1) 🎯 MVP

**Goal**: pantalla «Carga masiva» con instrucciones y ejemplo; la ruta procesa el comprimido, da de alta los nuevos con sus fotos, rechaza los inválidos con su renglón y motivo, y muestra el resumen

**Independent Test**: subir un comprimido con 10 productos nuevos y sus fotos y comprobar que el resumen dice «10 productos nuevos» y que los 10 están en la lista del panel y en el catálogo con su foto, precio y existencia

### Tests for User Story 1

- [X] T016 [P] [US1] Escribir pruebas en tests/integration/carga-masiva-alta.test.ts para `procesarCarga(bytes)` de src/servicios/carga-masiva/procesar.ts, con la base temporal de tests/integration/arnes.ts y los ayudantes de T004:
  - US1-2 y SC-002: 10 renglones nuevos con foto → `cantidades.nuevos` = 10 y hay 10 productos activos más, con sus datos, importes en centavos exactos y fotos en el orden del renglón, la primera como principal, con `nombre_original` en minúsculas;
  - US1-3 y FR-008: categoría y subcategoría nuevas se crean; la subcategoría que existe en otra categoría se crea en la indicada (caso límite «Subcategoría que no pertenece»);
  - US1-4: «juguetes» usa la categoría «Juguetes» existente y no crea otra;
  - US1-5 y FR-007: un renglón con precio de venta `0` y otro sin nombre se rechazan con su número de renglón y su motivo, y los demás se registran;
  - casos límite: un nombre repetido en el archivo → el segundo se rechaza con «Renglón repetido en el archivo» y solo hay un producto; un nombre que coincide con dos productos activos → «Hay más de un producto con este nombre; actualízalo desde la edición individual»; un producto dado de baja con el mismo nombre no cuenta y se registra uno nuevo; existencia `0` se acepta; categoría «Todos» se rechaza con el mensaje de `validarNombre` y la carga sigue;
  - US1-6: los rechazos completos de T008 y T007 no registran ningún producto ni categoría;
  - caso límite «Se pierde la conexión»: cada producto se crea en su propia transacción (simular un `ErrorNegocio` en el quinto renglón y comprobar que los cuatro anteriores quedaron);
  - FR-013: `cantidades` trae las seis cantidades y la suma de las cinco de renglones es igual al número de renglones de producto (data-model, invariantes); `fecha` es ISO
- [X] T017 [P] [US1] Escribir pruebas e2e en tests/e2e/us13-carga-masiva.spec.ts, en móvil y portátil, con un comprimido armado en la prueba con `fflate` y las fotos de tests/fixtures/carga-masiva/:
  - US1-1: en `/admin` hay un enlace «Carga masiva» junto a «Nuevo producto»; la página muestra las columnas, el renglón de ejemplo, «Hasta 200 productos y un comprimido de hasta 50 MB» y el enlace «Descargar archivo de ejemplo», que descarga `ejemplo-carga-masiva.txt` con BOM y el texto del contrato (FR-002, FR-004);
  - US1-2 y SC-002: al subir 3 productos nuevos, el resumen muestra la fecha con el mes escrito, «a. m.» o «p. m.» y la zona, y «Productos nuevos» = 3; los 3 aparecen en `/admin` y en el catálogo `/`;
  - US1-5: un renglón inválido aparece en «Renglones rechazados» con su número y motivo;
  - US1-6: un `.zip` sin `.txt` muestra el mensaje debajo del campo, asociado con `aria-describedby`, y no pasa al resumen; un archivo de más de 50 MB se rechaza antes de subir;
  - US1-7: sin sesión, `/admin/productos/carga-masiva` lleva a `/admin/entrar` y `POST /api/admin/cargas` responde 401;
  - axe sin violaciones en la pantalla de subida y en el resumen (Principio VII)

### Implementation for User Story 1

- [X] T018 [US1] Crear src/servicios/carga-masiva/procesar.ts con `procesarCarga(bytes): Promise<ResumenCarga>` según research 6, para los resultados `nuevo` y `rechazado`. La rama de existentes queda mínima: con una coincidencia, el renglón no toca la base y se agrega a `existentes` solo con `numero`, `campos` y `productoId`, sin comparar; T032 de US3 la completa:
  - lee el comprimido (T013) y el archivo (T012) y revisa el encabezado y el límite de 200 antes de registrar nada;
  - recorre los renglones en orden: repetido → inválido → coincidencias entre activos con `normalizar(nombre)` de SQLite (0, 1 o 2 o más);
  - para un nuevo, guarda con `guardarFoto` las fotos que `buscarFoto` entrega y crea el producto con `crearProducto(datos, nombresOriginales)` en su propia transacción; un `ErrorNegocio` de cualquiera de los dos pasa el renglón a rechazados con su mensaje y la carga sigue;
  - al final cuenta las fotos no usadas y arma el `ResumenCarga`.

  Hacer pasar los casos de US1 de T016
- [X] T019 [US1] Crear src/app/api/admin/cargas/route.ts con `POST` según contracts/interfaz.md y research 2: `exigirSesion()` antes de leer el cuerpo (401 `NO_AUTORIZADO`); 413 si `Content-Length` pasa de `LIMITE_BYTES`; lectura del cuerpo por partes con `request.body.getReader()` que se detiene y responde 413 al pasar el límite; `procesarCarga`; `revalidatePath("/", "layout")` si hubo nuevos; respuesta `Resultado` con `Cache-Control: no-store` y 400 en rechazo completo. Seguir el patrón de src/app/api/fotos/route.ts
- [X] T020 [P] [US1] Agregar en src/app/admin/(panel)/page.tsx, junto a «Nuevo producto», un botón secundario `Button variant="outline" asChild` con un `Link` «Carga masiva» a `/admin/productos/carga-masiva`, con ícono `Upload` de lucide-react y `className="h-11"`; en móvil los dos botones caben sin desbordar
- [X] T021 [US1] Crear src/components/admin/cargador-masivo.tsx (cliente) con el estado «Subir» de contracts/interfaz.md y research 8: instrucciones y límites, lista de columnas con su formato, renglón de ejemplo en un bloque `<pre>` copiable, enlace «Descargar archivo de ejemplo» que arma con un `Blob` el texto del ejemplo con BOM y `\r\n`, campo `<input type="file" accept=".zip,application/zip">` con `<Label>` «Comprimido .zip con productos y fotos», revisión de extensión y de `LIMITE_BYTES` antes de subir, envío con `XMLHttpRequest` y `Content-Type: application/zip`, `<progress>` y región `aria-live="polite"` con «Subiendo… N %» y «Procesando los productos…», botón «Subir y procesar» deshabilitado mientras tanto, y el error de rechazo completo debajo del campo con `aria-describedby`. Al recibir el resumen, lo entrega al componente padre
- [X] T022 [US1] Crear src/components/admin/resumen-carga.tsx (cliente) con la parte de contracts/interfaz.md, estado «Resumen», que toca a US1: fecha con `formatearFecha` y `formatearHora`, las seis cantidades en tarjetas con número y texto (FR-013), la sección `h2` «Renglones rechazados» con número, nombre si hay y motivo, y los botones «Hacer otra carga» (vuelve al estado «Subir») e «Ir a productos». En móvil, una sola columna
- [X] T023 [US1] Crear src/app/admin/(panel)/productos/carga-masiva/page.tsx con `metadata` «Carga masiva | Productos Eli's», un `h1` «Carga masiva de productos» y un componente cliente que alterna entre `CargadorMasivo` y `ResumenCarga` según haya resumen
- [X] T024 [US1] Hacer pasar T016 (casos de US1) y T017, y ejecutar `npm run verificar`

**Checkpoint**: el vendedor ya puede dar de alta muchos productos con sus fotos y ver cuántos entraron y cuáles se rechazaron

---

## Phase 4: User Story 2 - Ver los productos nuevos que quedaron sin foto (Priority: P1)

**Goal**: un renglón nuevo sin ninguna foto válida no se registra y aparece en «Productos nuevos sin foto» con su motivo; si al menos una foto sirve, se registra y se avisa cuáles faltaron

**Independent Test**: subir 3 productos nuevos donde a uno le falta la foto y comprobar que el resumen dice «2 productos nuevos», que «Productos nuevos sin foto» muestra el tercero con «La foto no viene en el comprimido» y que no está en el panel ni en el catálogo

### Tests for User Story 2

- [X] T025 [P] [US2] Agregar a tests/integration/carga-masiva-alta.test.ts:
  - US2-1: columna de fotos vacía → `sinFoto` con «El renglón no indica foto» y ningún producto creado;
  - US2-2: foto que no viene → «La foto no viene en el comprimido: falta.jpg»;
  - US2-3: `no-es-imagen.jpg` → «La foto no es una imagen válida: no-es-imagen.jpg»; lo mismo para una foto de más de 10 MB declarados (FR-005);
  - FR-011: con varias fotos y ninguna válida, el motivo es el de la primera;
  - US2-4: con dos fotos y solo una válida, el producto se crea con una foto y `avisosFotos` trae «No viene en el comprimido: …» para ese renglón;
  - SC-003: ningún producto de `sinFoto` existe en la base;
  - US2-5: al subir de nuevo esos renglones con sus fotos, se registran como nuevos;
  - SC-004 (parte de alta): al subir dos veces el mismo comprimido, la segunda no crea productos ni fotos (los renglones quedan en `existentes` o `sinCambios`; US3 completa la aserción de «Sin cambios»)
- [X] T026 [P] [US2] Agregar a tests/e2e/us13-carga-masiva.spec.ts: US2 prueba independiente con 3 productos, uno sin su foto en el comprimido; la sección `h2` «Productos nuevos sin foto» muestra el número de renglón, el nombre y el motivo; «Avisos de fotos» muestra la foto faltante de un producto registrado con dos fotos; el producto sin foto no aparece en la búsqueda de `/admin` ni en `/`

### Implementation for User Story 2

- [X] T027 [US2] En src/servicios/carga-masiva/procesar.ts, completar la rama de nuevos según research 6 y la tabla «Nuevo sin foto» de contracts/archivo-carga.md: si el renglón no indica foto, o ninguna de sus fotos es válida (`"noViene"`, `"noValida"` o rechazada por `guardarFoto`), el renglón va a `sinFoto` con el motivo de la primera que falló y **no se crea nada**; si al menos una sirve, se crea con las válidas y las demás van a `avisosFotos` con «No viene en el comprimido: X» o «No es una imagen válida: X» (FR-010, FR-011). Hacer pasar T025
- [X] T028 [US2] Agregar a src/components/admin/resumen-carga.tsx las secciones `h2` «Productos nuevos sin foto» (número de renglón, nombre y motivo) y «Avisos de fotos» (por producto, sus avisos), antes y después de «Renglones rechazados» respectivamente, según el orden de contracts/interfaz.md
- [X] T029 [US2] Hacer pasar T026 y ejecutar `npm run verificar`

**Checkpoint**: ningún producto entra sin foto y el vendedor sabe cuáles volver a subir y por qué. Con US1 y US2 la función ya cumple FR-016 de la spec 001 y se puede publicar como MVP

---

## Phase 5: User Story 3 - Decidir qué productos existentes se actualizan (Priority: P2)

**Goal**: los renglones de productos que ya existen no cambian nada por sí solos; el resumen los compara con los datos actuales y solo se actualizan los que el vendedor marca

**Independent Test**: subir 2 productos que ya existen con otro precio, marcar solo uno, confirmar y comprobar que solo ese cambió y el otro conserva sus datos

### Tests for User Story 3

- [X] T030 [P] [US3] Escribir pruebas en tests/integration/carga-masiva-existentes.test.ts, con `procesarCarga` y `confirmarCarga` de src/servicios/carga-masiva/confirmar.ts:
  - US3-1: con el producto activo «Muñeca de trapo», los renglones «muñeca de trapo» y «Muneca de Trapo» no crean producto ni lo modifican al procesar, y quedan en `existentes` con su `productoId`;
  - US3-2 y FR-014: `actual`, `archivo` y `cambios` traen los valores y solo los campos que difieren; `actual.apartadas` trae las unidades apartadas vigentes;
  - US3-8, FR-012 y SC-004: un renglón idéntico (texto sin mayúsculas ni acentos, importes al centavo) sin fotos nuevas cuenta en `sinCambios` y no aparece en `existentes`; al subir dos veces el mismo comprimido, la segunda da 0 nuevos y todos como «Sin cambios», sin fotos repetidas;
  - FR-016 (fotos): una foto cuyo `nombre_original` ya tiene el producto, activa **o dada de baja**, no cuenta como nueva; una foto nueva se guarda en disco al procesar pero no se asocia al producto hasta confirmar;
  - US3-3, FR-015 y SC-005: con dos marcados de tres, solo esos dos cambian; el tercero queda idéntico campo por campo;
  - US3-4: existencia 5 y 8 en el archivo → queda en 8;
  - US3-5: las fotos nuevas se agregan al final del orden sin dar de baja ninguna; confirmar dos veces lo mismo no duplica fotos;
  - US3-6 y FR-017: con 3 unidades apartadas y existencia 1 en el archivo, ese producto devuelve `{ ok: false, motivo: "La existencia no puede ser menor a las unidades apartadas." }`, no cambia, y los demás marcados sí se actualizan;
  - US3-7: un producto con un apartado y una venta conserva el `precio_unitario_centavos` de esas operaciones tras cambiar su precio de venta;
  - US3-9: `confirmarCarga([])` no toca la base;
  - research 7: si el producto se dio de baja entre procesar y confirmar → «El producto ya no está activo.»; si ya hay dos activos con ese nombre → «El nombre ya no corresponde a un solo producto.»; campos alterados que no pasan `validarRenglon` → su motivo; un `archivo` que no cumple el patrón UUID o no existe en la carpeta de fotos se rechaza sin tocar el producto; FR-008: una categoría nueva en el archivo se crea al confirmar
- [X] T031 [P] [US3] Escribir pruebas e2e en tests/e2e/us14-existentes.spec.ts, en móvil y portátil:
  - US3 prueba independiente: dos productos existentes con otro precio; la sección «Productos que ya existen» muestra por producto una tabla «Dato | Ahora | En el archivo» con el texto «Cambia» en los que difieren y la foto nueva en miniatura con su texto alternativo;
  - US3-3: marcar uno, «Actualizar marcados (1)»; aparece «Se actualizó 1 producto.», la tarjeta dice «Actualizado» y la otra «No actualizado»; en `/admin/productos/[id]` solo cambió el marcado;
  - «Marcar todos» y «Desmarcar todos» cambian las casillas y el número del botón;
  - US3-6: un producto con apartados advierte «Tiene N apartadas; no se podrá actualizar» y al confirmarlo dice «No se pudo actualizar: …»;
  - US3-9: confirmar sin marcar ninguno no cambia nada; al intentar salir con existentes sin confirmar, `beforeunload` se dispara (`page.on("dialog")`);
  - después de confirmar, las casillas y el botón quedan deshabilitados;
  - axe sin violaciones con la lista abierta

### Implementation for User Story 3

- [X] T032 [US3] En src/servicios/carga-masiva/procesar.ts, completar la rama de una coincidencia según research 6 y 7: leer los datos actuales del producto con su categoría, subcategoría, unidades apartadas (`unidadesApartadas`), fotos activas y todos los `nombre_original` de sus fotos (activas o no); calcular las fotos nuevas por nombre; `compararConActual`; sin cambios → `sinCambios`; con cambios → guardar en disco las fotos nuevas válidas con `guardarFoto`, avisar las que faltan en `fotosFaltantes` y agregar el `ExistenteConCambios` a `existentes`. Hacer pasar los casos de procesamiento de T030
- [X] T033 [US3] Crear src/servicios/carga-masiva/confirmar.ts con `confirmarCarga(marcados)`, que por cada elemento abre su propia `conTransaccion` y aplica los pasos 1 a 6 de research 7: `validarRenglon`; producto activo y único por `normalizar(nombre)`; archivos con el patrón `^[0-9a-f-]{36}\.(jpg|png|webp)$` que existan en la carpeta de fotos (usar `leerFoto` de src/lib/fotos.ts o una función nueva `existeFoto` ahí); existencia no menor a `unidadesApartadas` (`EXISTENCIA_INSUFICIENTE`); `update` con `columnas()` y `actualizadoEn`; `agregarFotosNuevas`. Un error de un producto se devuelve como `{ productoId, ok: false, motivo }` y no detiene a los demás. Hacer pasar los casos de confirmación de T030
- [X] T034 [US3] Crear src/acciones/carga-masiva.ts con la acción `confirmarActualizaciones(marcados)` de contracts/interfaz.md: `"use server"`, `exigirSesion()`, validación con Zod (hasta 200 elementos; `campos` arreglo de textos; `fotosNuevas[].archivo` con el patrón UUID; `nombreOriginal` texto no vacío), `confirmarCarga`, un solo `revalidatePath("/", "layout")` si hubo algún actualizado, y respuesta `Resultado<{ resultados }>` con `ejecutar`
- [X] T035 [US3] Crear src/components/admin/lista-existentes.tsx (cliente) según contracts/interfaz.md y research 11: una tarjeta por producto con casilla nativa `<input type="checkbox">` y `<Label>` «Actualizar «Nombre»»; tabla de dos columnas «Ahora» y «En el archivo» con encabezados `<th scope>`, importes con `formatearPrecio`, existencia y las fotos nuevas como miniaturas (`urlFoto`) con alt «Foto nueva N de Nombre»; cada dato que cambia lleva el texto «Cambia» y un resaltado de color con buen contraste en los dos temas; la advertencia de apartadas si la existencia del archivo es menor a `actual.apartadas`; botones «Marcar todos», «Desmarcar todos» y «Actualizar marcados (N)»; al confirmar, llama a `confirmarActualizaciones` y fija en cada tarjeta su `decision` (`actualizado`, `noActualizado` o `error` con motivo), muestra el aviso con la cuenta de actualizados, y deshabilita casillas y botón. Registra un `beforeunload` mientras haya existentes sin confirmar (US3-9)
- [X] T036 [US3] Agregar `ListaExistentes` en la sección `h2` «Productos que ya existen» de src/components/admin/resumen-carga.tsx, después de «Productos nuevos sin foto», y subir al componente padre las decisiones para que US4 las use en el reporte
- [X] T037 [US3] Hacer pasar T030 y T031 (incluidas las aserciones de SC-004 de T025) y ejecutar `npm run verificar` y `npm run test:e2e`

**Checkpoint**: ningún producto existente cambia sin que el vendedor lo marque, y los marcados se actualizan con las mismas reglas que la edición individual

---

## Phase 6: User Story 4 - Descargar el reporte de la carga (Priority: P3)

**Goal**: desde el resumen se descarga un .txt separado por «|» con los nuevos sin foto, los existentes con su resultado y los rechazados, legible en el Bloc de notas

**Independent Test**: tras una carga con sin foto y existentes, descargar el reporte, abrirlo en el Bloc de notas y comprobar que trae exactamente los renglones de las listas, con su motivo

### Tests for User Story 4

- [X] T038 [P] [US4] Escribir pruebas en tests/unit/carga-masiva-reporte.test.ts para `armarReporte(resumen, decisiones)` y `nombreReporte(fecha)` de src/dominio/carga-masiva.ts, según contracts/archivo-carga.md, sección «Reporte»:
  - US4-1 y FR-020: empieza con `\uFEFF`, usa `\r\n` y el encabezado `nombre|descripcion|categoria|subcategoria|existencia|precio_compra|precio_venta|fotos|renglon|lista|resultado|motivo`;
  - US4-2 y FR-019: un renglón por cada sin foto, existente y rechazado, en orden de número de renglón, con las 8 columnas originales, `renglon`, `lista` («Nuevo sin foto», «Ya existe» o «Rechazado») y el motivo; los «Sin cambios» y los nuevos registrados no aparecen;
  - US4-3: antes de confirmar, los existentes dicen «Pendiente de decidir» con «Cambia: …» como motivo; después, «Actualizado», «No actualizado» o «No se pudo actualizar» con el mensaje del error;
  - un rechazado con 6 columnas se completa con 2 vacías; uno con 9 conserva las 9;
  - US4-4: al quitar las 4 últimas columnas del reporte, `leerArchivoProductos` y `validarRenglon` aceptan los renglones de sin foto y existentes;
  - SC-006: el número de renglones de datos es `sinFoto + existentes + rechazados`;
  - `nombreReporte` da `reporte-carga-AAAA-MM-DD-HHMM.txt` con la hora de México (por ejemplo, un instante UTC de las 00:30 del día 8 da el día 7 en México)
- [X] T039 [P] [US4] Escribir pruebas e2e en tests/e2e/us15-reporte-carga.spec.ts, en portátil: tras una carga con un sin foto, un existente y un rechazado, «Descargar reporte» descarga un archivo (`page.waitForEvent("download")`) cuyo contenido, leído como UTF-8, tiene el BOM, 3 renglones de datos y «Pendiente de decidir»; tras confirmar, una segunda descarga dice «Actualizado»; con una carga sin nada que revisar, aparece «No hay nada que revisar.» y no hay botón de reporte (US4-5)

### Implementation for User Story 4

- [X] T040 [US4] Agregar `armarReporte` y `nombreReporte` a src/dominio/carga-masiva.ts según contracts/archivo-carga.md y research 9. Para la hora de México en el nombre, usar `Intl.DateTimeFormat` con `timeZone: "America/Mexico_City"` como en src/dominio/fechas.ts. Hacer pasar T038
- [X] T041 [US4] En src/components/admin/resumen-carga.tsx, agregar el botón «Descargar reporte», que arma un `Blob` de tipo `text/plain;charset=utf-8` con `armarReporte(resumen, decisiones)` y lo descarga con un enlace `download` y `nombreReporte(resumen.fecha)`; y el texto «No hay nada que revisar.» sin botón cuando no hay sin foto, existentes con cambios ni rechazados (FR-018, US4-5). Hacer pasar T039

**Checkpoint**: el vendedor puede revisar la carga con calma y reutilizar los renglones corregidos

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: rendimiento, móvil, regresión y aceptación

- [X] T042 [P] Medir en local `procesarCarga` con 50 renglones y 50 fotos de unos 500 KB y registrar el tiempo en specs/004-carga-masiva-productos/checklists/aceptacion.md; debe quedar por debajo de 30 s (plan, Performance Goals). **Resultado (2026-11-07)**: 0.42 s con 50 fotos de 180 KB en promedio (8.8 MB en total)
- [X] T043 [P] Agregar a tests/e2e/accesibilidad-admin.spec.ts la pantalla de carga masiva y su resumen con las cuatro secciones llenas, a 390 px y en portátil, comprobando axe sin violaciones y que `document.documentElement.scrollWidth` no supera el ancho de la ventana (SC-008, Principio VII)
- [X] T044 Ejecutar `npm run verificar` y `npm run test:e2e`, incluidas las pruebas de las specs 001 a 003, y dejar todo en verde (Principio V). **Resultado (2026-11-07)**: 376 pruebas de Vitest y 172 de Playwright en verde
- [X] T045 Ensayar la migración `0002` sobre una copia del último respaldo de producción, restaurada en `C:\restauracion-prueba`, según «Antes de publicar» de quickstart.md: el número de fotos no cambia. Registrar antes y después en specs/004-carga-masiva-productos/checklists/aceptacion.md. **Resultado (2026-11-07)**: 57 fotos antes y después, sin huérfanas, sobre el respaldo del 2026-11-06, y repetido con el del 2026-11-08 UTC sin diferencias (48 productos, 57 fotos, 11 operaciones y 11 pagos)
- [X] T046 Armar los comprimidos A, B, C y D de quickstart.md con el Bloc de notas y el Explorador de Windows (al menos una foto con «ñ» en el nombre, para comprobar CP850), ejecutar en local los pasos 1 a 23 y 25 de specs/004-carga-masiva-productos/quickstart.md, con el paso 20 en un celular real, y registrar los resultados en specs/004-carga-masiva-productos/checklists/aceptacion.md
- [ ] T047 Hacer con una persona que no haya usado la función la prueba de SC-007 (quickstart, paso 21) y cronometrar SC-001 (paso 22); registrar fecha, persona, tiempo y observaciones en specs/004-carga-masiva-productos/checklists/aceptacion.md **Diferida (decisión del propietario, 2026-11-07)**: por ahora solo el propietario hace las cargas; se hace cuando otra persona vaya a usar la función. No bloquea el cierre
- [ ] T048 Después de publicar en Easypanel (pulsar Implementar tras el push a `main`), repetir en producción los pasos 2, 5, 14, 16 y 20 de quickstart.md con productos «Prueba carga», darlos de baja al terminar y registrar los resultados en specs/004-carga-masiva-productos/checklists/aceptacion.md. El paso 24 queda diferido hasta la primera carga grande (decisión del propietario, 2026-11-07) y no bloquea el cierre. **Avance (2026-11-07)**: publicada desde `main` (ac35dbe) y revisada sin sesión (pantalla 307 a «Entrar», ruta 401, catálogo 200). Los pasos en producción se harán con la primera carga real de productos nuevos (decisión del propietario)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: empieza de inmediato. T003 y T004 en paralelo después de T001
- **Foundational (Fase 2)**: depende de Setup y bloquea todas las historias. T009 → T010; T011 → T012; T012 → T013 (usa los límites y mensajes del dominio); T014 depende de T010
- **US1 (Fase 3)**: depende de Foundational
- **US2 (Fase 4)**: depende de T018 de US1 (misma función `procesarCarga`) y de T022 (mismo componente de resumen)
- **US3 (Fase 5)**: depende de US1. Puede hacerse en paralelo con US2 solo si se coordinan los cambios a procesar.ts y resumen-carga.tsx; lo recomendable es en secuencia
- **US4 (Fase 6)**: T038 y T040 dependen solo de Foundational (funciones puras) y pueden hacerse en paralelo con US1 a US3; T041 depende de T036
- **Polish (Fase 7)**: depende de todas las historias. T045 depende de T010; T048 depende de T044 a T046 (T047 quedó diferida por el propietario)

### User Story Dependencies

- **US1 (P1)**: independiente; es la base del procesamiento y de la pantalla
- **US2 (P1)**: completa la rama de nuevos de `procesarCarga`; sin US1 no hay qué clasificar
- **US3 (P2)**: completa la rama de existentes y agrega la confirmación; usa el resumen de US1
- **US4 (P3)**: el reporte es puro y se puede probar antes, pero sus resultados finales dependen de las decisiones de US3

### Within Each User Story

- Las pruebas se escriben primero y deben fallar
- Dominio antes que servicios; servicios antes que la ruta o la acción; ruta y acción antes que los componentes; componentes antes que la página
- Cada historia termina con su checkpoint antes de pasar a la siguiente

### Parallel Opportunities

- Fase 1: T003 y T004 juntas
- Fase 2: T005, T006, T007 y T008 juntas; T011 junto con T009 y T010
- US1: T016 y T017 juntas; T020 en paralelo con T018 y T019
- US2: T025 y T026 juntas
- US3: T030 y T031 juntas
- US4: T038 y T040 en cualquier momento después de T012; T039 junto con T038
- Polish: T042 y T043 juntas

---

## Parallel Example: Foundational

```text
Task: "T005 Migración 0002 en tests/integration/migracion-0002.test.ts"
Task: "T006 parsearImporteArchivo en tests/unit/dinero.test.ts"
Task: "T007 Reglas del archivo en tests/unit/carga-masiva-renglones.test.ts"
Task: "T008 Lector del comprimido en tests/integration/carga-masiva-comprimido.test.ts"
```

## Parallel Example: User Story 1

```text
Task: "T016 Procesamiento en tests/integration/carga-masiva-alta.test.ts"
Task: "T017 Flujo en tests/e2e/us13-carga-masiva.spec.ts"
Task: "T020 Botón «Carga masiva» en src/app/admin/(panel)/page.tsx"
```

## Parallel Example: User Story 3

```text
Task: "T030 Existentes y confirmación en tests/integration/carga-masiva-existentes.test.ts"
Task: "T031 Flujo en tests/e2e/us14-existentes.spec.ts"
Task: "T038 Reporte en tests/unit/carga-masiva-reporte.test.ts (US4, solo depende del dominio)"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Completar Setup y Foundational
2. Completar US1 y US2: las dos son P1 y juntas garantizan que ningún producto entre sin foto
3. **Detenerse y validar** con los pasos 1 a 13 de quickstart.md
4. Se puede publicar. Mientras no esté US3, los renglones de productos existentes no cambian nada: solo se cuentan en «Ya existen con cambios», lo que cumple FR-012 y SC-005

### Incremental Delivery

1. Alta masiva con fotos y rechazos: US1 + US2 (MVP)
2. Actualización de existentes con confirmación: US3
3. Reporte descargable: US4

Lo recomendable es publicar las cuatro juntas, porque la spec pide la lista de existentes y el reporte desde el primer resumen. Cada entrega deja `npm run verificar` en verde.

---

## Notes

- T044 a T046 son la condición de merge que pide la constitución; T047 quedó diferida por decisión del propietario (2026-11-07)
- T045 se hace antes de publicar, aunque la `0002` no reconstruye tablas
- Las fotos guardadas para existentes que nunca se confirman quedan en disco sin usarse; es la deuda conocida del plan (Riesgos) y no se resuelve en esta spec
- Easypanel no despliega solo después de un push: hay que pulsar Implementar
- Hacer commit después de cada tarea o grupo lógico, con el mensaje en español de México
