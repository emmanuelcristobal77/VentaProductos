# Contrato: rutas de la aplicación

## Sección de cliente (pública)

| Ruta | Contenido | Requisitos |
|---|---|---|
| `/` | Catálogo; `?categoria=` y `?subcategoria=` definen el filtro, y sin ellos se ven todos | FR-010, FR-012, FR-015 |
| `/producto/[id]` | Fotos, datos, disponibilidad, leyenda y teléfono | FR-012, FR-013 |
| `/encargos` | Artículos por encargo, separados del catálogo | FR-015, FR-025 |
| `/mis-apartados` | Consulta por nombre y teléfono | FR-035 |

**Contrato de datos público**: `Producto` contiene solo `id, nombre, descripcion, categoria, subcategoria, fotos, precioVenta, disponible, agotado`. Las consultas públicas seleccionan columnas de forma explícita y viven en un módulo separado. `precio_compra_centavos` no debe aparecer en ninguna respuesta pública (FR-003, SC-008).

Las consultas sin coincidencia responden siempre con el mismo mensaje, sin revelar qué dato falló.

## Sección de administrador (requiere sesión)

| Ruta | Contenido | Requisitos |
|---|---|---|
| `/admin/entrar` | Inicio de sesión | FR-001 |
| `/admin` | Productos con filtros y acciones | FR-010, FR-017 |
| `/admin/productos/nuevo`, `/admin/productos/[id]` | Alta y edición | FR-007 a FR-009, FR-016 |
| `/admin/categorias` | Categorías y subcategorías | FR-006 |
| `/admin/articulos-encargo` | Artículos por encargo | FR-025 |
| `/admin/encargos` | Encargos pendientes | FR-026 |
| `/admin/operaciones` | Búsqueda por fecha de pago, nombre o teléfono | FR-036 |
| `/admin/operaciones/[id]` | Detalle, pagos, entrega, correcciones | FR-029, FR-032, FR-043 |

## Endpoint no visual

| Ruta | Uso |
|---|---|
| `POST /api/fotos` | Recibe y valida una foto; requiere sesión (FR-045) |
| `GET /api/fotos/[archivo]` | Sirve una foto; es público y no expone rutas del servidor |
