# Data Model: VendeProductos v0

Convenciones: base SQLite con claves foráneas activadas; ids UUID como texto; importes en centavos enteros; fechas en UTC como texto ISO 8601; booleanos como 0 o 1; nada se borra (FR-038), las bajas usan `activo = 0`. Los campos `*_norm` guardan el texto en minúsculas, sin acentos y sin espacios sobrantes (FR-037).

## categorias

| Campo | Tipo | Reglas |
|---|---|---|
| id | text | PK |
| nombre | text | Obligatorio |
| nombre_norm | text | Único entre activas; no puede ser "todos" |
| activo | integer (0 o 1) | Por defecto 1 |

Datos iniciales: Juguetes, Ropa y Otros artículos (FR-005).

## subcategorias

| Campo | Tipo | Reglas |
|---|---|---|
| id | text | PK |
| categoria_id | text | FK a categorias |
| nombre | text | Obligatorio |
| nombre_norm | text | Único entre activas de la misma categoría; no puede ser "todos" |
| activo | integer (0 o 1) | Por defecto 1 |

Datos iniciales: Juguetes (Niñas, Niños, Bebés); Ropa (Adulto mujer, Adulto hombre, Niño, Niña). "Todos" no se guarda: es una opción del filtro.

**Baja**: se rechaza si hay productos activos. La baja de una categoría sin productos activos da de baja también sus subcategorías.

## productos

| Campo | Tipo | Reglas |
|---|---|---|
| id | text | PK |
| nombre, descripcion | text | Obligatorios |
| categoria_id | text | FK obligatoria |
| subcategoria_id | text | FK opcional; debe pertenecer a la categoría |
| existencia | integer | `>= 0` |
| precio_compra_centavos | integer | `> 0`; solo administración (FR-003) |
| precio_venta_centavos | integer | `> 0` |
| activo | integer (0 o 1) | Por defecto 1 |
| creado_en, actualizado_en | text | |

**Derivado**: `disponible = existencia − SUMA(cantidad de apartados en Pendiente o Pagado)`.

**Validaciones**: `existencia` no puede ser menor a las unidades de apartados vigentes. La baja se rechaza con apartados o encargos vigentes.

## articulos_encargo

| Campo | Tipo | Reglas |
|---|---|---|
| id | text | PK |
| nombre, descripcion | text | Obligatorios |
| precio_centavos | integer | `> 0` |
| activo | integer (0 o 1) | Por defecto 1 |
| creado_en, actualizado_en | text | |

**Validación**: la baja se rechaza con encargos vigentes.

## fotos

| Campo | Tipo | Reglas |
|---|---|---|
| id | text | PK |
| producto_id | text | FK; exactamente uno de los dos |
| articulo_encargo_id | text | FK; exactamente uno de los dos |
| archivo | text | Nombre generado del archivo en `/datos/fotos` |
| orden | integer | Orden de carga; la primera es la principal (FR-045) |
| activo | integer (0 o 1) | Quitar una foto es una baja lógica |

**Validación**: un producto activo conserva al menos una foto activa (FR-016). El texto alternativo se deriva del nombre del producto.

## operaciones

| Campo | Tipo | Reglas |
|---|---|---|
| id | text | PK |
| tipo | text con CHECK | `venta`, `apartado`, `encargo` |
| estado | text con CHECK | Ver transiciones |
| producto_id | text | FK; exactamente uno con `articulo_encargo_id` |
| articulo_encargo_id | text | FK; solo en encargos |
| cantidad | integer | `> 0` |
| precio_unitario_centavos | integer | `> 0`; precio acordado, independiente del catálogo |
| cliente_nombre, cliente_nombre_norm | text | Obligatorios salvo en venta |
| cliente_telefono | text | 10 dígitos; obligatorio salvo en venta |
| motivo | text | Obligatorio si está Anulada o Cancelado |
| creado_en, entregado_en, cerrado_en | text | `cerrado_en`: anulación o cancelación |

**Derivados**: `total = cantidad × precio_unitario`; `pagado = SUMA(pagos vigentes)`; `saldo = total − pagado`.

**Índices**: `cliente_telefono`, `cliente_nombre_norm`, `(tipo, estado)`.

## pagos

| Campo | Tipo | Reglas |
|---|---|---|
| id | text | PK |
| operacion_id | text | FK |
| importe_centavos | integer | `> 0` y `<= saldo` al registrarse |
| fecha | text | Momento del registro; con índice |
| anulado_en | text | Nulo si está vigente |

El pago automático de una venta no se anula por separado; se anula la venta completa.

## limite_intentos

| Campo | Tipo | Reglas |
|---|---|---|
| clave | text | PK; acción más hash de la IP |
| intentos | integer | |
| ventana_inicia | text | |

## Transiciones de estado

### Venta

```text
Pagada ──entregar──▶ Entregada
Pagada ──anular──▶ Anulada
Entregada ──anular──▶ Anulada
```

### Apartado y encargo

```text
                 saldo llega a 0
Pendiente ─────────────────────────▶ Pagado ──entregar──▶ Entregado
    ▲                                  │
    └──anular pago o subir el precio───┘
Pendiente ──cancelar──▶ Cancelado
Pagado ──cancelar──▶ Cancelado
```

Si el pago inicial cubre el total, la operación nace Pagado. Entregado, Cancelado y Anulada son finales, salvo Entregada a Anulada en ventas.

## Efecto en inventario

| Evento | Existencia | Disponible |
|---|---|---|
| Registrar venta | −N | −N |
| Anular venta | +N | +N |
| Registrar apartado | Sin cambio | −N |
| Cancelar apartado | Sin cambio | +N |
| Entregar apartado | −N | Sin cambio |
| Cualquier evento de encargo | Sin cambio | Sin cambio |

Todos estos eventos, y el registro de pagos, corren en una transacción `BEGIN IMMEDIATE`.
