# Data Model: Sello promocional

**Feature**: [spec.md](spec.md) | **Fecha**: 2026-11-11

## Tabla nueva: `sello_promocional`

Una sola fila para todo el negocio (entidad «Sello promocional» de la spec). La crea la migración `0003`, sin insertar nada y sin tocar las demás tablas.

| Columna | Tipo | Regla |
|---|---|---|
| `id` | integer, llave primaria | Siempre `1`: `CHECK (id = 1)` |
| `texto` | text, no nulo | Ya normalizado a NFC y sin espacios al principio ni al final. Puede ir vacío solo si `activo = 0`. Hasta 40 caracteres visibles ([research 2](research.md#2-cómo-se-cuentan-los-40-caracteres)); la base limita a 400 bytes como tope de seguridad, y `validarSello` aplica el mismo tope antes de guardar |
| `color` | text, no nulo | `CHECK (color IN ('rojo', 'verde', 'dorado', 'azul'))` |
| `activo` | integer (booleano), no nulo | `0` o `1` |
| `actualizado_en` | text, no nulo | Fecha y hora ISO 8601 en UTC del último guardado |

Restricciones adicionales:

- `CHECK (activo = 0 OR length(trim(texto)) > 0)`: no se puede activar sin texto (FR-003).
- `CHECK (length(CAST(texto AS BLOB)) <= 400)`. Un carácter visible puede ocupar muchos bytes: «👍🏽» ocupa 8 y «👨‍👩‍👧‍👦» ocupa 25. Con 400 bytes caben 40 de casi cualquier emoji. Si un texto de hasta 40 caracteres visibles pasa de 400 bytes, `validarSello` lo rechaza con el mensaje de FR-004, para que nunca llegue a la base un error genérico.

## Valor sin fila

Mientras la tabla está vacía, el servicio devuelve:

```text
{ texto: "", color: "rojo", activo: false }
```

Es el estado «Primera vez» de la spec: desactivado, sin texto y con el primer color de la lista.

## Transiciones

```text
(sin fila) ──guardar──▶ fila id=1
fila: activo=0 ⇄ activo=1     (solo a mano, FR-008; activar exige texto)
fila: texto/color cambian en cualquier estado; al desactivar se conservan (FR-007)
```

Gana el último que guarda (caso «Dos vendedores editando a la vez»). No se guarda historial.

## Lo que no cambia

`productos`, `operaciones`, `pagos` y las demás tablas no cambian. El sello no se relaciona con ningún producto ni operación (FR-013).
