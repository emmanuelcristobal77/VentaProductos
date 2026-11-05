# Research: Buscador de productos y paginación

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Fecha**: 2026-11-05

La tecnología es la misma de la spec 001 ([research de la 001](../001-catalogo-ventas-apartados/research.md)). Aquí solo se registran las decisiones nuevas.

## 1. Comparación sin mayúsculas ni acentos

- **Decision**: registrar en cada conexión de SQLite una función determinista `normalizar(texto)` que llama a `normalizarNombre` de `src/dominio/normalizacion.ts`, y comparar con `instr(normalizar(columna), palabra) > 0`. La función se registra en `abrirBase` de `src/db/cliente.ts`, así que la usan la app, las pruebas y los scripts por igual.
- **Rationale**: es la misma regla que ya usa la spec 001 para categorías y nombres de clientes (NFD, sin marcas, minúsculas), así que "muneca" encuentra "Muñeca". Con 500 productos, recorrer la tabla cuesta alrededor de un milisegundo y no hace falta índice. `instr` evita tener que escapar `%` y `_`, como sí lo exige `LIKE`.
- **Alternatives considered**:
  - Columnas `nombre_norm` y `descripcion_norm`, como `cliente_nombre_norm` de las operaciones: exigen una migración, rellenar los productos existentes y mantener las columnas al editar. Es más trabajo y más riesgo sin ninguna ganancia a esta escala.
  - Índice de texto completo (FTS5): no quita acentos por sí solo con el tokenizador por defecto, y añade una tabla virtual que hay que sincronizar.
  - Filtrar en JavaScript después de cargar todo: obliga a leer todos los productos y sus fotos en cada búsqueda, y la paginación por cursor deja de tener sentido.

## 2. Varias palabras y orden de los resultados

- **Decision**: el texto se normaliza, se recorta a 100 caracteres y se divide por espacios; se descartan las palabras vacías y se conservan como máximo 10. Un producto coincide cuando cada palabra aparece en `normalizar(nombre) || ' ' || normalizar(descripcion)`. El grupo es 0 si todas las palabras están en el nombre y 1 en otro caso. El orden es `grupo ASC, creado_en DESC, id DESC`. Sin búsqueda, el grupo es 0 para todos y el orden queda igual que hoy.
- **Rationale**: aplica FR-002 (todas las palabras, en cualquier orden) y FR-007 (primero el nombre). El espacio entre nombre y descripción impide que una palabra coincida uniendo el final de uno con el principio del otro. `id` desempata productos con la misma fecha de alta, y eso es lo que hace estable la paginación.
- **Alternatives considered**: puntuación por relevancia o por número de coincidencias. Se descartó porque la spec solo pide dos grupos y una puntuación haría el orden difícil de explicar y de probar.

## 3. Paginación por cursor

- **Decision**: paginación por cursor (*keyset*). Cada respuesta incluye `siguiente`: un texto opaco en base64url con `{ g, c, i }`, que son el grupo, la fecha de alta y el id del último producto entregado. La siguiente parte pide los productos que van después de esa posición en el orden de la sección 2. Si el cursor no es válido se responde 400 y la lista vuelve a empezar. Los tamaños son 20 en el catálogo y 50 en el panel (FR-010), y cada respuesta trae `total`, la cantidad de coincidencias.
- **Rationale**: con `OFFSET`, un alta o una baja entre dos «Ver más» recorre la lista, y un producto se repite o se salta, lo que rompe FR-011 y SC-004. El cursor siempre continúa después del último producto mostrado. `total` sirve para anunciar los resultados a los lectores de pantalla (FR-016).
- **Alternatives considered**:
  - `LIMIT/OFFSET` quitando repetidos en el navegador: resuelve los repetidos, pero no los faltantes.
  - Cargar todo y mostrarlo por partes: no ayuda a la velocidad, que es justo lo que busca la paginación (SC-002).

## 4. De dónde salen las partes siguientes

- **Decision**: la primera parte se dibuja en el servidor dentro de la página, como hoy, para no afectar la velocidad de la primera vista. Las búsquedas y los «Ver más» se piden a dos Route Handlers `GET`:
  - `/api/catalogo`: público; usa `src/consultas/publicas.ts`.
  - `/api/admin/productos`: llama a `exigirSesion()` y responde 401 sin sesión, igual que `/api/fotos`.

  Ambos responden con `Cache-Control: no-store`. Contrato en [contracts/rutas.md](contracts/rutas.md).
- **Rationale**: la guía de esta versión de Next.js indica que las Server Functions están pensadas para cambios de datos y que el cliente las envía una por una (`07-mutating-data.md`). En una búsqueda mientras se escribe eso formaría una fila de peticiones. Un `GET` se puede cancelar con `AbortController`. Las consultas públicas siguen separadas, así que el precio de compra no puede salir por `/api/catalogo` (FR-009; FR-003 de la spec 001).
- **Alternatives considered**:
  - Server Actions: se envían una por una y no se pueden cancelar.
  - Poner la búsqueda en la URL para que el servidor dibuje los resultados: lo prohíbe FR-008.

## 5. Búsqueda mientras se escribe

- **Decision**: se espera 250 ms desde la última tecla antes de pedir resultados. Cada petición nueva cancela la anterior con `AbortController`, y se descarta cualquier respuesta que no corresponda al texto actual. Mientras llega la respuesta, la lista anterior sigue visible y la región `aria-live` dice "Buscando…". Al llegar, anuncia "N productos encontrados".
- **Rationale**: cubre el caso límite de la escritura rápida (nunca se muestran resultados de un texto anterior). También cabe con holgura en SC-003: 250 ms de espera más una consulta de milisegundos dan menos de 1 s.
- **Alternatives considered**: buscar con cada tecla sin esperar. Se descartó porque en un celular con datos móviles genera muchas peticiones inútiles.

## 6. Regreso con el botón de atrás (FR-008a)

- **Decision**: un almacén en memoria del navegador, un `Map` a nivel de módulo en `src/lib/estado-listas.ts`, guarda por lista (catálogo o panel) el texto, el filtro, los productos cargados, el cursor y la posición de desplazamiento. Ese mismo módulo escucha `popstate` para saber si la navegación fue con atrás o adelante.
  - **Al regresar con atrás**, si el filtro de la URL coincide, la lista se inicia desde el almacén y en `useLayoutEffect` se regresa a la posición guardada.
  - **En cualquier otra navegación**, la lista empieza de nuevo.
  - **Al recargar**, la memoria del módulo se pierde sola, así que la búsqueda no se conserva (FR-008).
- **Rationale**: consigue FR-008a sin guardar nada en la URL ni en `sessionStorage`; este último sobrevive a la recarga y rompería FR-008. Además, el cambio se limita a dos listas.
- **Alternatives considered**:
  - **Activar `cacheComponents`**: Next.js 16 conserva el estado de la página con `<Activity>` (`02-guides/preserving-ui-state.md`). Se descartó en esta spec porque exige quitar `export const dynamic` de 12 archivos y cambia el comportamiento de navegación de toda la app, incluidos formularios de la spec 001. Puede evaluarse por separado.
  - **`history.state`**: sobrevive a la recarga, igual que `sessionStorage`.

## 7. Lista del panel en el navegador

- **Decision**: la tarjeta de producto del panel sale de `src/app/admin/(panel)/page.tsx` a un componente de cliente, `src/components/admin/tarjeta-producto-admin.tsx`, que se usa tanto para la primera parte como para las siguientes. La URL de la foto se arma como `/api/fotos/<archivo>`, igual que en la tarjeta del catálogo, porque `src/lib/fotos.ts` importa `sharp` y no puede llegar al navegador. Las acciones de la spec 001 ya llaman a `revalidatePath("/", "layout")`. Cuando eso cambia la primera parte que dibuja el servidor, la lista vuelve a pedir desde el principio tantos productos como ya mostraba, hasta 200, para reflejar ventas, bajas y ediciones sin perder el lugar.
- **Rationale**: las hojas de venta, apartado y encargo y el botón de baja ya son componentes de cliente, así que funcionan igual dentro de una lista que crece en el navegador.
- **Alternatives considered**: dejar la tarjeta en el servidor y agregar las partes siguientes como HTML del servidor. Es más complejo y no encaja con la búsqueda en el navegador.

## 8. Cómo se comprueban SC-002 y SC-003

- **Decision**: un script `scripts/productos-ejemplo.ts` llena una base de prueba en `./datos/prueba-500` con 500 productos de ejemplo con foto. Se arranca la app con `DATOS_DIR` apuntando ahí y se mide con el mismo perfil aceptado en la spec 001:

  `npx -y lighthouse@12.8.2 <url> --throttling.rttMs=60 --throttling.throughputKbps=9000`

  La meta técnica es LCP ≤ 1 s. Para SC-003, la persona escribe una palabra y cuenta si los resultados aparecen en menos de 1 s, lo que también se ve en la región `aria-live`. En producción se confirma con los productos reales.
- **Rationale**: cumple el supuesto de la spec (nunca se llena el catálogo real con productos de prueba) y el Principio VI: la persona comprueba la sensación de velocidad en el celular y el plan conserva la medición técnica.
- **Alternatives considered**: medir solo en producción. Se descartó porque hoy no hay 500 productos.

## 9. Textos de la interfaz (es-MX)

| Lugar | Texto |
|---|---|
| Etiqueta del campo | Buscar productos |
| Marcador del campo | Escribe el nombre o una palabra |
| Sin resultados en el catálogo | No encontramos productos con «{texto}». Revisa los artículos por encargo o llámanos al {teléfono}. |
| Sin resultados en el panel | No hay productos que coincidan con «{texto}». |
| Botón | Ver más |
| Error al cargar más | No se pudieron cargar más productos. Revisa tu conexión e inténtalo de nuevo. |
| Región `aria-live` | Buscando… / {N} productos encontrados / Se agregaron {N} productos |

En el mensaje sin resultados del catálogo, "artículos por encargo" enlaza a `/encargos` y el teléfono es un enlace `tel:` (FR-005).
