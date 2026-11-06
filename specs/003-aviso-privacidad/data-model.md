# Data Model: Aviso de privacidad

**Feature**: [spec.md](spec.md) | **Fecha**: 2026-11-06

Solo cambia la tabla `operaciones` de la spec 001 ([modelo de la 001](../001-catalogo-ventas-apartados/data-model.md)). No hay tablas nuevas. El aviso de privacidad no se guarda en la base ([research 1](research.md#1-dónde-vive-el-texto-del-aviso)).

## `operaciones`: columnas nuevas

| Columna | Tipo | Nulo | Significado |
|---|---|---|---|
| `aviso_informado` | entero booleano | Sí | `1`: se informó al cliente del aviso al registrar. `0`: venta sin datos del cliente. Nulo: operación registrada antes de la spec 003 |
| `datos_borrados_en` | texto ISO 8601 | Sí | Fecha y hora en que se borraron los datos del cliente a petición suya. Nulo mientras no se borren |

La constancia no tiene fecha propia: toma la de `creado_en` (FR-010).

## `operaciones`: restricciones

| Restricción | Antes (spec 001) | Ahora |
|---|---|---|
| `operaciones_cliente` | `tipo = 'venta' OR (cliente_nombre IS NOT NULL AND cliente_telefono IS NOT NULL)` | `tipo = 'venta' OR datos_borrados_en IS NOT NULL OR (cliente_nombre IS NOT NULL AND cliente_telefono IS NOT NULL)` |
| `operaciones_datos_borrados` *(nueva)* | — | `datos_borrados_en IS NULL OR (cliente_nombre IS NULL AND cliente_nombre_norm IS NULL AND cliente_telefono IS NULL)` |
| `operaciones_aviso` *(nueva)* | — | `aviso_informado IS NOT 0 OR (cliente_nombre IS NULL AND cliente_telefono IS NULL)`: si hay datos del cliente, la constancia no puede ser `0` |

Las demás restricciones e índices no cambian. Las operaciones anteriores quedan con `aviso_informado` nulo y cumplen todas las restricciones.

## Reglas de validación

| Regla | Dónde | Requisito |
|---|---|---|
| Apartado o encargo con `avisoInformado` falso → `DATOS_INVALIDOS` con `campos.avisoInformado` | `validarPedido` en `src/servicios/operaciones.ts` | FR-008 |
| Venta con nombre o teléfono, tras recortar espacios, y `avisoInformado` falso → el mismo error | `registrarVenta` | FR-009 |
| Venta sin nombre ni teléfono → se guarda con `aviso_informado = 0` aunque la casilla venga marcada | `registrarVenta` | FR-009 |
| `aviso_informado` no cambia después de registrar | Ningún servicio lo actualiza; la corrección de FR-043 no lo toca | FR-012 |
| Borrar en una operación sin nombre ni teléfono, o ya borrada → `ESTADO_NO_PERMITE` | `borrarDatosCliente` | FR-013, FR-018 |
| Corregir una operación con `datos_borrados_en` → `ESTADO_NO_PERMITE` | `corregirOperacion` | FR-018 |

## Ciclo de vida de los datos del cliente

```text
            registrar (con casilla)
 (sin operación) ─────────────────► con datos ──── borrarDatosCliente ────► datos borrados
                                       │                                  (definitivo)
                                       └── corregirOperacion (FR-043) ──► con datos
```

- El estado de la operación (Pendiente, Pagado, Entregado, Cancelado, Pagada, Entregada o Anulada) es independiente: el borrado no lo cambia y se permite en cualquiera de ellos (FR-013, FR-016).
- Después del borrado, la operación sigue aceptando pagos, entrega, cancelación y anulación según la spec 001 (FR-017).

## Alcance del borrado

Para una operación `o` con datos, el borrado alcanza:

```text
operaciones donde datos_borrados_en IS NULL
             y cliente_nombre_norm IS o.cliente_nombre_norm
             y cliente_telefono   IS o.cliente_telefono
```

`IS` compara también nulos, así que una venta con solo teléfono alcanza a las demás ventas con ese mismo teléfono y sin nombre ([research 5](research.md#5-qué-operaciones-alcanza-el-borrado)).
