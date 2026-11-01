# Data Model: VendeProductos v0

Convenciones: ids UUID; importes en centavos (`bigint`); fechas `timestamptz`; nada se borra (FR-038), las bajas usan `activo = false`. Los campos `*_norm` guardan el texto en minúsculas, sin acentos y sin espacios sobrantes (FR-037).

## categorias

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid | PK |
| nombre | text | Obligatorio |
| nombre_norm | text | Único entre activas; no puede ser "todos" |
| activo | boolean | Por defecto `true` |

Datos iniciales: Juguetes, Ropa y Otros artículos (FR-005).

## subcategorias

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid | PK |
| categoria_id | uuid | FK a categorias |
| nombre | text | Obligatorio |
| nombre_norm | text | Único entre activas de la misma categoría; no puede ser "todos" |
| activo | boolean | Por defecto `true` |

Datos iniciales: Juguetes (Niñas, Niños, Bebés); Ropa (Adulto mujer, Adulto hombre, Niño, Niña). "Todos" no se guarda: es una opción del filtro.

**Baja**: se rechaza si hay productos activos. La baja de una categoría sin productos activos da de baja también sus subcategorías.

## productos

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid | PK |
| nombre, descripcion | text | Obligatorios |
| categoria_id | uuid | FK obligatoria |
| subcategoria_id | uuid | FK opcional; debe pertenecer a la categoría |
| existencia | integer | `>= 0` |
| precio_compra_centavos | bigint | `> 0`; solo administración (FR-003) |
| precio_venta_centavos | bigint | `> 0` |
| activo | boolean | Por defecto `true` |
| creado_en, actualizado_en | timestamptz | |

**Derivado**: `disponible = existencia − SUMA(cantidad de apartados en Pendiente o Pagado)`.

**Validaciones**: `existencia` no puede ser menor a las unidades de apartados vigentes. La baja se rechaza con apartados vigentes.

## articulos_encargo

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid | PK |
| nombre, descripcion | text | Obligatorios |
| precio_centavos | bigint | `> 0` |
| activo | boolean | Por defecto `true` |
| creado_en, actualizado_en | timestamptz | |

## fotos

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid | PK |
| producto_id | uuid | FK; exactamente uno de los dos |
| articulo_encargo_id | uuid | FK; exactamente uno de los dos |
| url | text | Obligatorio |
| orden | integer | La menor es la principal |
| activo | boolean | Quitar una foto es una baja lógica |

**Validación**: un producto activo conserva al menos una foto activa (FR-016). El texto alternativo se deriva del nombre del producto.

## operaciones

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid | PK |
| tipo | enum | `venta`, `apartado`, `encargo` |
| estado | enum | Ver transiciones |
| producto_id | uuid | FK; exactamente uno con `articulo_encargo_id` |
| articulo_encargo_id | uuid | FK; solo en encargos |
| cantidad | integer | `> 0` |
| precio_unitario_centavos | bigint | `> 0`; precio acordado, independiente del catálogo |
| cliente_nombre, cliente_nombre_norm | text | Obligatorios salvo en venta |
| cliente_telefono | char(10) | Solo dígitos; obligatorio salvo en venta |
| motivo | text | Obligatorio si está Anulada o Cancelado |
| creado_en, entregado_en, cerrado_en | timestamptz | `cerrado_en`: anulación o cancelación |

**Derivados**: `total = cantidad × precio_unitario`; `pagado = SUMA(pagos vigentes)`; `saldo = total − pagado`.

**Índices**: `cliente_telefono`, `cliente_nombre_norm`, `(tipo, estado)`.

## pagos

| Campo | Tipo | Reglas |
|---|---|---|
| id | uuid | PK |
| operacion_id | uuid | FK |
| importe_centavos | bigint | `> 0` y `<= saldo` al registrarse |
| fecha | timestamptz | Momento del registro; con índice |
| anulado_en | timestamptz | Nulo si está vigente |

El pago automático de una venta no se anula por separado; se anula la venta completa.

## limite_intentos

| Campo | Tipo | Reglas |
|---|---|---|
| clave | text | PK; acción más hash de la IP |
| intentos | integer | |
| ventana_inicia | timestamptz | |

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

Todos estos eventos, y el registro de pagos, corren en una transacción con bloqueo de la fila del producto o de la operación.
