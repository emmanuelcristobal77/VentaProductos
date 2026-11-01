# Contrato: acciones de servidor

Todas las acciones, salvo `consultarMisApartados` y `iniciarSesion`, verifican la sesión de administrador. Las entradas se validan en el servidor, y los importes llegan como texto.

## Resultado común

```ts
type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; codigo: CodigoError; mensaje: string; campos?: Record<string, string> };
```

`mensaje` siempre va en español de México y es apto para mostrarse tal cual.

## Códigos de error

| Código | Cuándo |
|---|---|
| `NO_AUTORIZADO` | Sin sesión válida |
| `DEMASIADOS_INTENTOS` | Límite de intentos superado |
| `DATOS_INVALIDOS` | Validación fallida; incluye `campos` |
| `SIN_DISPONIBILIDAD` | Unidades insuficientes; indica cuántas hay |
| `HAY_DISPONIBILIDAD` | Encargo de un producto con unidades disponibles |
| `PAGO_EXCEDE_SALDO` | Pago mayor al saldo; indica el saldo |
| `PRECIO_MENOR_A_PAGADO` | Corrección con total menor a lo pagado |
| `SALDO_PENDIENTE` | Entrega con saldo restante |
| `ESTADO_NO_PERMITE` | La transición no es válida |
| `TIENE_DEPENDENCIAS` | Baja con apartados o productos activos |
| `EXISTENCIA_INSUFICIENTE` | Existencia menor a las unidades apartadas |
| `FOTO_REQUERIDA` | El producto quedaría sin fotos |

## Acciones

| Acción | Entrada | Errores | Requisitos |
|---|---|---|---|
| `iniciarSesion` | usuario, contraseña | `DEMASIADOS_INTENTOS`, `DATOS_INVALIDOS` | FR-001 |
| `cerrarSesion` | — | — | FR-001 |
| `guardarProducto` | datos, categoría y subcategoría por id o por nombre nuevo, fotos | `DATOS_INVALIDOS`, `FOTO_REQUERIDA`, `EXISTENCIA_INSUFICIENTE` | FR-007 a FR-009 |
| `darDeBajaProducto` | id | `TIENE_DEPENDENCIAS` | FR-038 |
| `guardarCategoria`, `guardarSubcategoria` | id opcional, nombre | `DATOS_INVALIDOS` | FR-006 |
| `darDeBajaCategoria`, `darDeBajaSubcategoria` | id | `TIENE_DEPENDENCIAS` | FR-006 |
| `guardarArticuloEncargo`, `darDeBajaArticuloEncargo` | datos o id | `DATOS_INVALIDOS` | FR-025 |
| `registrarVenta` | producto, cantidad, precio, comprador opcional | `SIN_DISPONIBILIDAD`, `DATOS_INVALIDOS` | FR-019 a FR-021 |
| `registrarApartado` | producto, cantidad, precio, nombre, teléfono, pago inicial | `SIN_DISPONIBILIDAD`, `PAGO_EXCEDE_SALDO`, `DATOS_INVALIDOS` | FR-019, FR-022 |
| `registrarEncargo` | producto o artículo (existente o nuevo), cantidad, precio, nombre, teléfono, pago inicial | `HAY_DISPONIBILIDAD`, `PAGO_EXCEDE_SALDO`, `DATOS_INVALIDOS` | FR-017, FR-022, FR-025 |
| `registrarPago` | operación, importe | `PAGO_EXCEDE_SALDO`, `ESTADO_NO_PERMITE` | FR-028, FR-030, FR-031 |
| `anularPago` | pago | `ESTADO_NO_PERMITE` | FR-034 |
| `marcarEntregada` | operación | `SALDO_PENDIENTE`, `ESTADO_NO_PERMITE` | FR-032, FR-033 |
| `cancelarOperacion` | operación, motivo | `ESTADO_NO_PERMITE`, `DATOS_INVALIDOS` | FR-027 |
| `anularVenta` | operación, motivo | `ESTADO_NO_PERMITE`, `DATOS_INVALIDOS` | FR-042 |
| `corregirOperacion` | operación, nombre, teléfono, precio | `PRECIO_MENOR_A_PAGADO`, `ESTADO_NO_PERMITE`, `DATOS_INVALIDOS` | FR-043 |
| `buscarOperaciones` | rango de fechas, nombre, teléfono | `DATOS_INVALIDOS` | FR-036, FR-037 |
| `consultarMisApartados` | nombre, teléfono | `DEMASIADOS_INTENTOS`, `DATOS_INVALIDOS` | FR-035 |
