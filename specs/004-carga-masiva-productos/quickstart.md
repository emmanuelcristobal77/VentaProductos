# Quickstart: validar la carga masiva

**Feature**: [spec.md](spec.md) | **Fecha**: 2026-11-07

Guía para comprobar la spec 004 usando la app (Principio VI). El formato de los archivos está en [contracts/archivo-carga.md](contracts/archivo-carga.md), la pantalla en [contracts/interfaz.md](contracts/interfaz.md) y los datos en [data-model.md](data-model.md).

## Requisitos

- La app corriendo en local (`npm run dev`) o en producción, con la migración `0002` aplicada.
- Sesión iniciada en el panel.
- Una computadora con Windows, para armar los comprimidos con el Bloc de notas y el Explorador («Enviar a > Carpeta comprimida (en zip)»).
- Un celular, o el navegador en vista móvil de 390 px de ancho, para el paso 20.
- En producción, los productos de prueba llevan el prefijo «Prueba carga» y se dan de baja al terminar.

```powershell
npm run verificar        # tipos, lint y pruebas unitarias e integración
npm run test:e2e         # flujos y accesibilidad en móvil y portátil
```

## Comprimidos de prueba

Cada uno es una carpeta con un `productos.txt` guardado en UTF-8 y sus fotos, comprimida con el Explorador.

| Comprimido | Contenido |
|---|---|
| **A** | 10 productos nuevos «Prueba carga 1» a «Prueba carga 10», cada uno con su foto. Uno en una categoría nueva «Prueba categoría» y otro en «juguetes», en minúsculas. Una foto se llama `Muñeca.JPG` y su renglón dice `muñeca.jpg`. Otra va dentro de una subcarpeta. Además, dos fotos que ningún renglón menciona |
| **B** | 3 productos nuevos: los dos primeros con foto y el tercero, «Prueba carga sin foto», mencionando `falta.jpg`, que no viene. Más un renglón con la columna de fotos vacía, otro cuya foto es un `.txt` renombrado a `.jpg` y otro con dos fotos donde solo una viene |
| **C** | Renglones inválidos: precio de venta `0`, sin nombre, precio `1,250.00`, existencia `-1`, 7 columnas, un nombre repetido y un renglón vacío en medio |
| **D** | Dos productos de **A** con otro precio de venta y otra existencia, y uno de ellos con una foto nueva |

## Escenarios

| # | Pasos | Resultado esperado | Referencia |
|---|---|---|---|
| 1 | Abrir el panel, «Productos» | Junto a «Nuevo producto» está «Carga masiva» | US1-1 |
| 2 | Abrir «Carga masiva» | Se ven las columnas en orden, el renglón de ejemplo, los límites de 200 productos y 50 MB, y el enlace del archivo de ejemplo | FR-002, FR-004, US1-1 |
| 3 | Descargar el ejemplo y abrirlo en el Bloc de notas | «Muñeca de trapo» y «algodón» se leen bien | FR-004, FR-020 |
| 4 | En una ventana privada, abrir `/admin/productos/carga-masiva` | Lleva a «Entrar»; no se ve la carga masiva | FR-001, US1-7 |
| 5 | Subir **A** | El resumen dice 10 productos nuevos y 2 fotos no usadas. La categoría «Prueba categoría» se creó, el de «juguetes» quedó en «Juguetes» sin duplicarla, y la foto `Muñeca.JPG` y la de la subcarpeta se usaron | US1-2, US1-3, US1-4, casos límite de fotos |
| 6 | Ir a «Productos» y al catálogo | Están los 10 con su foto, precio y existencia; el número coincide con el del resumen | SC-002, US1 prueba independiente |
| 7 | Subir **A** otra vez | 0 productos nuevos y 10 sin cambios; el catálogo no tiene duplicados ni fotos repetidas | SC-004, FR-012, US3-8 |
| 8 | Subir **B** | 3 productos nuevos y 3 sin foto, con los motivos «La foto no viene en el comprimido: falta.jpg», «El renglón no indica foto» y «La foto no es una imagen válida: …». El de dos fotos se registró con una y aparece en «Avisos de fotos» | US2-1, US2-2, US2-3, US2-4, FR-011 |
| 9 | Buscar en «Productos» y en el catálogo los 3 sin foto | No aparecen | SC-003 |
| 10 | Agregar a **B** las fotos que faltaban y subirlo de nuevo | Los que antes no tenían foto quedan como nuevos; los demás, sin cambios | US2-5 |
| 11 | Subir **C** | Ningún renglón de **C** se registra; cada rechazado sale con su número de renglón, igual al del Bloc de notas, y su motivo; el renglón vacío no cuenta | US1-5, FR-007, casos límite de importes, columnas, repetidos y vacíos |
| 12 | Subir un `.pdf` renombrado a `.zip`, un `.zip` sin `.txt`, uno con el encabezado cambiado y uno con 201 renglones | No se registra nada; cada uno explica qué falta o qué límite pasó | US1-6, FR-002, caso límite «Encabezado» |
| 13 | Subir un comprimido de más de 50 MB | Se rechaza antes de subir, con el límite | FR-002 |
| 14 | Subir **D** | Los dos salen en «Productos que ya existen», con «Ahora» y «En el archivo» y los cambios marcados con «Cambia»; la foto nueva se ve en miniatura | US3-1, US3-2, FR-014 |
| 15 | Descargar el reporte antes de confirmar | Los dos dicen «Pendiente de decidir» | US4-3, FR-019 |
| 16 | Marcar solo uno y confirmar | Ese cambió precio y existencia (reemplazada, no sumada) y tiene la foto nueva además de las anteriores; el otro conserva sus datos | US3-3, US3-4, US3-5, SC-005 |
| 17 | Descargar el reporte después de confirmar y abrirlo en el Bloc de notas | Uno dice «Actualizado» y otro «No actualizado»; acentos y «ñ» correctos; los renglones coinciden con las cantidades del resumen | US4-2, US4-3, SC-006 |
| 18 | Apartar 3 unidades de un producto de **A**, subir un archivo con ese producto y existencia 1, marcarlo y confirmar | «No se pudo actualizar: La existencia no puede ser menor a las unidades apartadas.»; el producto no cambia; el apartado conserva su precio | US3-6, US3-7, FR-017 |
| 19 | Subir **D** otra vez y salir de la pantalla sin confirmar; luego subirlo y confirmar sin marcar ninguno | El navegador avisa al salir; en los dos casos ningún producto cambia | US3-9 |
| 20 | En el celular, hacer los pasos 2, 5 y 14 | Se ve el progreso de subida; nada obliga a desplazarse a los lados; las casillas se pueden tocar | SC-008 |
| 21 | Con una persona que no ha usado la función, darle solo la pantalla y 5 fotos | Arma el archivo y hace su primera carga sin ayuda | SC-007 |
| 22 | Cronometrar una carga de 50 productos con sus fotos ya listos, desde elegir el archivo hasta ver el resumen | Menos de 10 minutos | SC-001 |
| 23 | Una carga sin sin foto, sin existentes con cambios y sin rechazados | «No hay nada que revisar.» y sin botón de reporte | US4-5 |
| 24 | **Diferida** hasta la primera carga grande (decisión del propietario, 2026-11-07). En producción, subir un comprimido de cerca de 50 MB | Se procesa sin error del servidor ni del proxy | FR-002, riesgo del plan |
| 25 | Dar de baja «Prueba carga 1» y subir un archivo con ese nombre | Se registra como producto nuevo | Caso límite «Producto dado de baja» |

## Antes de publicar

1. Copiar el último respaldo de producción a la laptop, aplicar la `0002` con `npm run db:migrar` y comprobar que el número de fotos no cambió.
2. Hacer los pasos 1 a 25 en local, salvo el 24; en producción, los pasos 2, 5, 14, 16 y 20 con productos «Prueba carga» y darlos de baja al terminar. El paso 24 se hace en producción antes de la primera carga grande y su resultado se agrega a `checklists/aceptacion.md`.
3. Registrar los resultados en `checklists/aceptacion.md`.
