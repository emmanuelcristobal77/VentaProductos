# Contrato: comprimido, archivo de productos y reporte

**Feature**: [spec.md](../spec.md) | **Fecha**: 2026-11-07

Los textos de este contrato son los que ve el vendedor. Viven en `src/dominio/carga-masiva.ts` y las pruebas los comparan contra esa fuente.

## Comprimido

- Un solo archivo `.zip` de hasta 50 MB (52,428,800 bytes).
- Dentro: exactamente un `.txt` (el archivo de productos) y las fotos, en la raíz o en carpetas.
- Se ignoran: carpetas, todo lo que esté bajo `__MACOSX/` y los nombres que empiezan con `._`.
- Las fotos se buscan por su nombre de archivo sin carpeta, sin importar mayúsculas. Los acentos sí cuentan ([research 3](../research.md#3-nombres-de-archivo-dentro-del-comprimido)).

## Archivo de productos

- Texto UTF-8, con o sin BOM, con renglones terminados en `\r\n` o `\n`.
- El primer renglón no vacío es el encabezado y debe tener exactamente estas columnas, en este orden. Se comparan sin mayúsculas, sin acentos y sin espacios alrededor:

  ```text
  nombre|descripcion|categoria|subcategoria|existencia|precio_compra|precio_venta|fotos
  ```

- Un renglón por producto, hasta 200. Los renglones vacíos o solo con espacios se ignoran.
- El número de renglón es la línea del archivo, contando desde 1 y contando el encabezado y los vacíos.

| Columna | Obligatoria | Formato |
|---|---|---|
| `nombre` | Sí | Texto; identifica al producto sin mayúsculas ni acentos |
| `descripcion` | Sí | Texto |
| `categoria` | Sí | Texto; se usa la existente si coincide sin mayúsculas ni acentos, o se crea |
| `subcategoria` | No | Texto; se usa la existente dentro de la categoría, o se crea en ella |
| `existencia` | Sí | Entero de 0 en adelante, solo dígitos |
| `precio_compra` | Sí | `^\d+(\.\d{1,2})?$`, mayor que cero, sin `$` ni comas. Ejemplo: `1250.00` |
| `precio_venta` | Sí | Igual que `precio_compra` |
| `fotos` | Para productos nuevos | Uno o más nombres separados por coma; la primera es la principal |

Ningún dato puede contener «|».

### Ejemplo descargable (`ejemplo-carga-masiva.txt`)

```text
nombre|descripcion|categoria|subcategoria|existencia|precio_compra|precio_venta|fotos
Muñeca de trapo|Muñeca hecha a mano de 30 cm|Juguetes|Muñecas|5|120.00|250.00|muneca1.jpg,muneca2.jpg
Playera infantil rayada|Playera de algodón talla 6|Ropa||12|80|149.90|playera.jpg
```

La pantalla muestra además, como renglón de ejemplo, el segundo renglón de este archivo.

## Rechazos de toda la carga

No se registra nada y se muestra el mensaje:

| Caso | Mensaje |
|---|---|
| No es un .zip o está dañado | «El archivo no es un comprimido .zip válido.» |
| Pasa de 50 MB | «El comprimido pasa de 50 MB. Divide los productos en varias cargas.» |
| No trae `.txt` | «El comprimido no trae el archivo de productos (.txt).» |
| Trae más de un `.txt` | «El comprimido trae más de un archivo .txt; deja solo el de productos.» |
| El `.txt` pasa de 2 MB | «El archivo de productos es demasiado grande. Divide los productos en varias cargas.» |
| No está en UTF-8 | «El archivo de productos debe guardarse con codificación UTF-8.» |
| Falta el encabezado o no coincide | «El encabezado no coincide con el formato.» seguido de una o varias líneas: «Falta la columna «X».», «Sobra la columna «X».», «Las columnas están en otro orden.» |
| Más de 200 renglones | «El archivo trae N productos; el máximo por carga es 200.» |
| Sin renglones de producto | «El archivo de productos no trae ningún producto.» |

## Motivos

### Rechazado

| Caso | Motivo |
|---|---|
| Columnas de menos o de más | «El renglón trae N columnas; deben ser 8.» |
| Sin nombre | «Falta el nombre.» |
| Repetido | «Renglón repetido en el archivo» |
| Sin descripción | «Falta la descripción.» |
| Sin categoría | «Falta la categoría.» |
| Categoría o subcategoría «Todos» | «"Todos" está reservado para el filtro; elige otro nombre.» |
| Existencia inválida | «La existencia debe ser un número entero de 0 en adelante.» |
| Precio de compra inválido | «El precio de compra debe ser mayor a cero, con punto decimal y hasta dos decimales, sin $ ni comas.» |
| Precio de venta inválido | «El precio de venta debe ser mayor a cero, con punto decimal y hasta dos decimales, sin $ ni comas.» |
| Más de un producto activo con el nombre | «Hay más de un producto con este nombre; actualízalo desde la edición individual» |

Si un renglón tiene varios problemas, se informa el primero en el orden de esta tabla.

### Nuevo sin foto

| Caso | Motivo |
|---|---|
| Columna `fotos` vacía | «El renglón no indica foto» |
| La foto no viene | «La foto no viene en el comprimido: X» |
| La foto no es JPEG, PNG o WebP de hasta 10 MB | «La foto no es una imagen válida: X» |

Si el renglón menciona varias fotos y ninguna sirve, el motivo es el de la primera.

### Avisos de fotos

En productos nuevos registrados y en existentes con cambios, una línea por foto que no se usó: «No viene en el comprimido: X» o «No es una imagen válida: X».

## Reporte

- Nombre: `reporte-carga-AAAA-MM-DD-HHMM.txt`, con la fecha y hora de México de la carga.
- UTF-8 con BOM, renglones `\r\n`, separado por «|».
- Encabezado:

  ```text
  nombre|descripcion|categoria|subcategoria|existencia|precio_compra|precio_venta|fotos|renglon|lista|resultado|motivo
  ```

- Un renglón por cada renglón en «Nuevo sin foto», «Ya existe» o «Rechazado», en orden de número de renglón. Los «Sin cambios» y los nuevos registrados no aparecen.
- Las 8 primeras columnas son los datos del archivo original, recortados. Si un rechazado traía menos de 8 columnas, se completa con vacíos; si traía más, se escriben todas y el motivo lo explica.

| `lista` | `resultado` | `motivo` |
|---|---|---|
| `Nuevo sin foto` | vacío | El motivo de la tabla «Nuevo sin foto» |
| `Rechazado` | vacío | El motivo de la tabla «Rechazado» |
| `Ya existe` | `Pendiente de decidir`, `Actualizado`, `No actualizado` o `No se pudo actualizar` | Los campos que cambian, por ejemplo «Cambia: precio de venta, existencia». En `No se pudo actualizar`, el mensaje del error, por ejemplo «La existencia no puede ser menor a las unidades apartadas.» |

Para volver a usar los renglones en una carga nueva: corregir los datos, borrar `|renglon|lista|resultado|motivo` del encabezado y las cuatro últimas columnas de cada renglón (US4-4).
