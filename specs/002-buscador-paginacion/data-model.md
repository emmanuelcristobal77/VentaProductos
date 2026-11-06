# Data Model: Buscador de productos y paginación

**Feature**: [spec.md](spec.md) | **Fecha**: 2026-11-05

## Cambios al esquema

**Ninguno.** No hay tablas, columnas, índices ni migraciones nuevas. Se usan las columnas `nombre`, `descripcion`, `activo`, `creado_en` e `id` de `productos`, definidas en el [modelo de la spec 001](../001-catalogo-ventas-apartados/data-model.md).

La única adición a la base es la función `normalizar(texto)`, que se registra al abrir cada conexión ([research 1](research.md#1-comparación-sin-mayúsculas-ni-acentos)). No se guarda en el archivo SQLite, así que no afecta los respaldos ni las restauraciones.

## Conceptos de consulta (no se guardan)

### Búsqueda

| Campo | Regla |
|---|---|
| texto | Opcional. Se recorta a 100 caracteres, se normaliza como `normalizarNombre` y se divide por espacios. Sin palabras equivale a no buscar |
| palabras | De 0 a 10. Cada una debe aparecer en el nombre o en la descripción normalizados (FR-002) |
| categoriaId / subcategoriaId | Opcionales; el mismo filtro de FR-010 de la spec 001 (FR-004) |
| solo activos | Siempre (FR-006) |

### Grupo de orden

| Valor | Cuándo |
|---|---|
| 0 | No hay búsqueda, o todas las palabras están en el nombre |
| 1 | Al menos una palabra está solo en la descripción |

Orden completo: `grupo ASC, creado_en DESC, id DESC` (FR-007).

### Cursor

Texto opaco en base64url de `{ g: 0|1, c: creado_en, i: id }` con la posición del último producto entregado. Un producto va después del cursor cuando:

```text
grupo > g
OR (grupo = g AND creado_en < c)
OR (grupo = g AND creado_en = c AND id < i)
```

Un cursor que no se puede leer, o con valores fuera de su forma, se rechaza con `CURSOR_INVALIDO`.

### Parte de resultados

| Campo | Contenido |
|---|---|
| productos | Hasta 20 (catálogo) o 50 (panel). Cada producto lleva los campos de su sección: los públicos nunca incluyen el precio de compra |
| siguiente | Cursor de la parte siguiente, o `null` si no quedan productos (FR-012) |
| total | Número de productos que cumplen la búsqueda y el filtro (FR-016) |

### Estado de una lista en el navegador

Vive solo en memoria y se pierde al recargar (FR-008):

| Campo | Uso |
|---|---|
| texto | Lo escrito en el buscador |
| filtro | Categoría y subcategoría de la URL |
| productos | Todos los ya cargados |
| siguiente | Cursor para «Ver más» |
| desplazamiento | Posición de la página, para regresar al mismo lugar (FR-008a) |
