# Data Model: Carga masiva de productos

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Fecha**: 2026-11-07

La spec no agrega datos a Producto, Categoría ni Subcategoría. El único cambio en la base es una columna de `fotos`. El archivo, los renglones, el resumen y el reporte **no se guardan**: viven en la petición y en el navegador mientras dura la pantalla (supuesto «No se guarda un historial»).

## Cambio en la base

### `fotos` (spec 001), columna nueva

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `nombre_original` | text | Sí | Nombre del archivo como venía en el comprimido, sin carpeta, en NFC y minúsculas ([research 3](research.md#3-nombres-de-archivo-dentro-del-comprimido)). Nulo en las fotos del alta individual y en las anteriores a esta spec |

- Índice nuevo `fotos_nombre_original`: único y parcial sobre `(producto_id, nombre_original)` `WHERE nombre_original IS NOT NULL`. Es la última defensa contra fotos repetidas (SC-004) si dos confirmaciones del mismo producto llegaran juntas. `agregarFotosNuevas` se salta las repetidas antes de insertar, así que en el uso normal el índice nunca rechaza nada.
- Migración `0002`: `ALTER TABLE fotos ADD COLUMN nombre_original text;` y `CREATE UNIQUE INDEX … WHERE nombre_original IS NOT NULL`. No reconstruye tablas. Todas las filas existentes quedan en nulo, así que el índice no puede chocar con ellas.
- `archivo` sigue siendo `UUID.ext`, generado por `guardarFoto`; el nombre del vendedor nunca se usa como ruta.

**Regla «ya se cargó»** (FR-016): una foto del renglón ya se cargó para el producto si existe una fila de `fotos` con ese `producto_id` y ese `nombre_original`, **activa o no** ([research 7](research.md#7-comparación-y-confirmación-de-los-existentes)).

## Entidades en memoria

Se definen como tipos de TypeScript en `src/dominio/carga-masiva.ts`; la respuesta de `POST /api/admin/cargas` y la entrada de `confirmarActualizaciones` usan esos tipos ([contracts/interfaz.md](contracts/interfaz.md)).

### Archivo de carga

| Campo | Regla |
|---|---|
| Comprimido | `.zip` de hasta 50 MB |
| Archivo de productos | Exactamente un `.txt` fuera de `__MACOSX/`, de hasta 2 MB, en UTF-8 |
| Fotos | Entradas cuyo nombre, sin carpeta, menciona algún renglón; JPEG, PNG o WebP de hasta 10 MB |
| Fotos no usadas | Entradas que no son el `.txt` ni carpetas ni metadatos de macOS, y que ningún renglón menciona; solo se cuentan |

Rechazos de toda la carga, sin registrar nada: no es un .zip, pasa de 50 MB, no trae `.txt`, trae más de uno, no está en UTF-8, encabezado incorrecto, más de 200 renglones o ningún renglón de producto ([contracts/archivo-carga.md](contracts/archivo-carga.md#rechazos-de-toda-la-carga)).

### Renglón de carga

| Campo | Tipo | Nota |
|---|---|---|
| `numero` | entero | Posición en el archivo desde 1, contando encabezado y vacíos |
| `campos` | 8 textos (o los que trajo) | Tal como venían, recortados; se usan para el reporte y para confirmar |
| `resultado` | `nuevo` \| `sinFoto` \| `existe` \| `sinCambios` \| `rechazado` | Ver transiciones |
| `motivo` | texto | Solo en `sinFoto` y `rechazado`, de la lista de motivos |
| `fotosFaltantes` | textos | En `nuevo` y `existe`: nombres mencionados que no vinieron o no son válidos |

**Transiciones** (una sola vez por renglón, en `procesarCarga`):

```text
renglón ──► ¿8 columnas y nombre?──no──► rechazado
               │sí
               ▼
         ¿nombre repetido antes?──sí──► rechazado («Renglón repetido en el archivo»)
               │no
               ▼
         ¿datos válidos?──no──► rechazado (motivo de validación)
               │sí
               ▼
         coincidencias activas por nombre normalizado
          ├─ 2 o más ──► rechazado («Hay más de un producto con este nombre…»)
          ├─ 1 ──► ¿cambia algún dato o trae fotos nuevas?
          │          ├─ no ──► sinCambios
          │          └─ sí ──► existe (fotos nuevas guardadas en disco)
          └─ 0 ──► ¿al menos una foto válida?
                     ├─ no ──► sinFoto (motivo de la primera foto que falló)
                     └─ sí ──► crearProducto ──ok──► nuevo
                                      └─error──► rechazado (mensaje del error)
```

### Producto existente con cambios

Lo que el navegador recibe y conserva por cada renglón `existe`:

| Campo | Nota |
|---|---|
| `numero`, `campos` | Del renglón |
| `productoId` | El único producto activo que coincide |
| `actual` | Nombre, descripción, categoría, subcategoría, existencia y precios en centavos del producto al procesar; más sus unidades apartadas |
| `archivo` | Los mismos datos leídos del renglón |
| `cambios` | Lista de campos que difieren: `nombre`, `descripcion`, `categoria`, `subcategoria`, `existencia`, `precioCompra`, `precioVenta`, `fotos` |
| `fotosNuevas` | `{ archivo: "UUID.ext", nombreOriginal }` ya guardadas en disco |
| `fotosFaltantes` | Nombres mencionados que no vinieron o no son válidos |
| `decision` | Solo en el navegador: `pendiente` → `actualizado` \| `noActualizado` \| `error` (con `motivo`) |

**Transición de `decision`**: empieza en `pendiente`. Al confirmar, los marcados pasan a `actualizado` o `error` según la respuesta, y los no marcados a `noActualizado`. Después de confirmar ya no se puede volver a confirmar: hay que subir el archivo de nuevo.

### Resumen de carga

| Campo | Nota |
|---|---|
| `fecha` | ISO de cuando terminó el procesamiento; se muestra con `formatearFecha` y `formatearHora` |
| `cantidades` | `nuevos`, `sinFoto`, `existentes`, `sinCambios`, `rechazados`, `fotosNoUsadas` (FR-013) |
| `sinFoto` | Renglones con su número, campos y motivo |
| `existentes` | Productos existentes con cambios |
| `rechazados` | Renglones con su número, campos y motivo |
| `avisosFotos` | Por producto registrado, las fotos que faltaron (US2-4) |

**Invariantes**:
- `cantidades.nuevos` es igual al número de productos creados por la carga (SC-002).
- `sinFoto + existentes + rechazados` es igual al número de renglones de datos del reporte (SC-006).
- La suma de las cinco cantidades de renglones es igual al número de renglones de producto del archivo.

### Reporte de carga

Archivo de texto generado en el navegador; su formato está en [contracts/archivo-carga.md](contracts/archivo-carga.md#reporte).

## Reglas reutilizadas de la spec 001

| Regla | Dónde vive | Uso en esta spec |
|---|---|---|
| Crear o reusar categoría y subcategoría sin mayúsculas ni acentos, «Todos» reservado | `resolverCategoria`, `resolverSubcategoria` en `servicios/categorias.ts` | Alta y actualización (FR-008) |
| Columnas válidas y al menos una foto | `columnas()` en `servicios/productos.ts`, exportada | Alta y actualización |
| Existencia no menor a las unidades apartadas | `unidadesApartadas` en `consultas/disponibilidad.ts` | Actualización (FR-017) |
| Foto JPEG, PNG o WebP de hasta 10 MB, guardada con UUID | `guardarFoto` en `lib/fotos.ts` | Fotos del comprimido (FR-005) |
| Normalización de nombres | `normalizarNombre` y la función SQLite `normalizar` | Coincidencia de productos y comparación |
