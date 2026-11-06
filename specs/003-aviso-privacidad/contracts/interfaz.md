# Contrato: página del aviso y acciones

**Feature**: [spec.md](../spec.md) | **Fecha**: 2026-11-06

Las acciones de servidor siguen el formato `Resultado` de la spec 001 ([acciones de la 001](../../001-catalogo-ventas-apartados/contracts/acciones.md)): `{ ok: true, datos }` o `{ ok: false, codigo, mensaje, campos? }`. Todas las del panel exigen sesión con `exigirSesion()`.

## Página `GET /aviso-de-privacidad`

- Pública, sin sesión, dentro del grupo `(cliente)`, con su encabezado y su pie.
- Estática: no lee la base.
- Título de la página: «Aviso de privacidad | Productos Eli's».
- Una sección con título (`h2`) por cada elemento de FR-004, en este orden:
  1. Responsable
  2. Datos que recabamos
  3. Para qué los usamos
  4. Con quién los compartimos
  5. Cuánto tiempo los guardamos
  6. Tus derechos y cómo ejercerlos
  7. Dudas
  8. Cambios a este aviso
- La fecha de última actualización va al inicio, con el formato de FR-039 de la spec 001, por ejemplo «Última actualización: 6 de noviembre de 2026».
- El correo es `mailto:emmanuelcristobal@yahoo.com.mx` y el teléfono `tel:+52…` (FR-005).

## Enlaces nuevos

| Lugar | Destino | Abre en |
|---|---|---|
| Pie de página de `(cliente)/layout.tsx` | `/aviso-de-privacidad` | La misma pestaña |
| Junto al formulario de `/mis-apartados` | `/aviso-de-privacidad` | La misma pestaña |
| Junto a la casilla de venta, apartado y encargo | `/aviso-de-privacidad` | Pestaña nueva ([research 3](../research.md#3-enlace-al-aviso-dentro-del-formulario)) |

## Acciones que cambian

`registrarVenta`, `registrarApartado` y `registrarEncargo` de `src/acciones/operaciones.ts` leen un campo nuevo del `FormData`:

| Campo | Valor | Regla |
|---|---|---|
| `avisoInformado` | `"on"` si la casilla está marcada; ausente si no | Obligatorio en apartado y encargo; en venta, solo si hay nombre o teléfono |

Error nuevo, con el código existente `DATOS_INVALIDOS`:

```json
{
  "ok": false,
  "codigo": "DATOS_INVALIDOS",
  "mensaje": "Revisa los datos marcados e inténtalo de nuevo.",
  "campos": { "avisoInformado": "Informa al cliente del aviso de privacidad y marca la casilla." }
}
```

`corregirOperacion` responde `ESTADO_NO_PERMITE` si la operación tiene los datos borrados.

## Acción nueva: `borrarDatosCliente(id: string)`

En `src/acciones/operaciones.ts`.

**Éxito**: `{ ok: true, datos: { borradas: number } }`, con la cantidad de operaciones que cambiaron. Después se refresca la ruta, igual que las demás acciones.

**Errores**:

| Código | Cuándo |
|---|---|
| `NO_AUTORIZADO` | Sin sesión |
| `ESTADO_NO_PERMITE` | La operación no existe, no tiene nombre ni teléfono, o ya tiene los datos borrados |

## Consulta nueva: `contarOperacionesDelCliente(id: string): number`

En `src/consultas/admin.ts`. La usa el detalle de la operación para el texto de la confirmación (FR-014). Aplica la regla de alcance de [data-model.md](../data-model.md#alcance-del-borrado). Devuelve 0 si la operación no tiene datos o ya están borrados.

## Datos nuevos en `OperacionAdmin`

`obtenerOperacionAdmin`, `buscarOperaciones` y `listarEncargosPendientes` devuelven ya todas las columnas de `operaciones`, así que incluyen `avisoInformado` y `datosBorradosEn` sin cambiar la selección. Las consultas públicas no las seleccionan (FR-012).
