# Contrato: rutas de búsqueda y paginación

**Feature**: [spec.md](../spec.md) | **Fecha**: 2026-11-05

Las páginas `/` y `/admin` de la spec 001 ([rutas de la 001](../../001-catalogo-ventas-apartados/contracts/rutas.md)) conservan su URL y sus parámetros `categoria` y `subcategoria`. Ahora dibujan solo la primera parte, de 20 o 50 productos, y agregan el buscador y el botón «Ver más». La búsqueda nunca se agrega a la URL de la página (FR-008).

## `GET /api/catalogo`

Público, sin sesión.

| Parámetro | Tipo | Regla |
|---|---|---|
| `texto` | texto | Opcional; hasta 100 caracteres |
| `categoria` | id | Opcional |
| `subcategoria` | id | Opcional; solo junto con `categoria` |
| `cursor` | texto | Opcional; el `siguiente` de una respuesta anterior |
| `limite` | entero | Opcional; por omisión, el tamaño de la parte. Se acepta entre ese tamaño y 200. Solo se usa al refrescar la lista sin perder el lugar ([research 7](../research.md#7-lista-del-panel-en-el-navegador)) |

**200**:

```json
{
  "ok": true,
  "datos": {
    "productos": [
      {
        "id": "…",
        "nombre": "Muñeca de trapo",
        "descripcion": "…",
        "categoria": "Juguetes",
        "subcategoria": "Niñas",
        "precioVentaCentavos": 25000,
        "disponible": 3,
        "agotado": false,
        "fotos": ["….webp"]
      }
    ],
    "siguiente": "eyJnIjowLC…",
    "total": 57
  }
}
```

- Tamaño de cada parte: 20 (FR-010).
- Los campos de cada producto son exactamente los de `ProductoPublico` en `src/consultas/publicas.ts`. MUST NOT incluir `precioCompraCentavos` ni `existencia` (FR-009; FR-003 de la spec 001).
- Las fotos van como nombres de archivo, en el orden de la spec 001; la interfaz arma `/api/fotos/<archivo>`.

**400** `{ "ok": false, "codigo": "CURSOR_INVALIDO" | "DATOS_INVALIDOS", "mensaje": "…" }`

**Cabeceras**: `Cache-Control: no-store`.

## `GET /api/admin/productos`

Requiere la sesión de administrador. La ruta llama a `exigirSesion()`, igual que `/api/fotos`.

Tiene los mismos parámetros que `/api/catalogo`.

**200**: la misma forma, con los campos de `listarProductosAdmin` en `src/consultas/admin.ts` (incluidos `existencia` y `precioCompraCentavos`). El tamaño de cada parte es 50 (FR-010).

**401** `{ "ok": false, "codigo": "NO_AUTORIZADO", "mensaje": "…" }`: sin sesión.

**400**: igual que en el catálogo.

**Cabeceras**: `Cache-Control: no-store`.

## Consultas compartidas

La página del servidor y la ruta `GET` llaman a la misma función, así que la primera parte y las siguientes siguen siempre la misma regla:

| Función | Archivo | Uso |
|---|---|---|
| `listarCatalogo({ categoriaId, subcategoriaId, texto, cursor, limite })` | `src/consultas/publicas.ts` | `/` y `/api/catalogo` |
| `listarProductosAdmin({ categoriaId, subcategoriaId, texto, cursor, limite })` | `src/consultas/admin.ts` | `/admin` y `/api/admin/productos` |

Las dos devuelven `{ productos, siguiente, total }`. `obtenerProducto` y `obtenerProductoAdmin` no cambian.
