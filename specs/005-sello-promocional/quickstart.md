# Quickstart: validar el sello promocional

**Feature**: [spec.md](spec.md) | **Fecha**: 2026-11-11

Guía para comprobar la spec 005 usando la app (Principio VI). La pantalla está en [contracts/interfaz.md](contracts/interfaz.md) y los datos en [data-model.md](data-model.md).

## Requisitos

- La app corriendo en local (`npm run dev`) o en producción, con la migración `0003` aplicada.
- Sesión iniciada en el panel.
- Un celular, o el navegador en vista móvil de 390 px de ancho. Para el paso 9, un celular real que se pueda poner en modo oscuro.

```powershell
npm run verificar        # tipos, lint y pruebas unitarias e integración
npm run test:e2e         # flujos y accesibilidad en móvil y portátil
```

## Pasos

| # | Qué hacer | Qué debe pasar | Cubre |
|---|---|---|---|
| 1 | Antes de guardar nada, abre el catálogo | Se ve igual que antes de esta spec, sin franja | US1-1, «Primera vez» |
| 2 | En el celular, entra al panel y busca «Promoción» | Está en el encabezado, junto a «Salir», sin encimarse con nada. En la portátil está en la navegación superior | FR-001 |
| 3 | Abre «Promoción» | El texto está vacío, el color es Rojo, la casilla está desmarcada y la vista previa dice «Escribe el texto del sello» | «Primera vez», FR-006 |
| 4 | Marca la casilla sin escribir texto y guarda. Luego escribe solo espacios y guarda | No se guarda, y junto al campo aparece «Escribe el texto del sello para mostrarlo.» | US2-3, FR-003 |
| 5 | Escribe «Buen Fin · Pregunta por tu descuento», elige Rojo, marca la casilla y guarda; toma el tiempo desde que abres «Promoción» | El contador baja mientras escribes, la vista previa cambia y aparece «Listo. El sello se muestra en la página.» Tarda menos de 1 minuto | US1-2, FR-004, FR-006, SC-001 |
| 6 | Abre el catálogo, una página de producto, «Mis apartados», «Encargos» y el aviso de privacidad | En todas hay una franja roja con el texto, debajo del encabezado, que se lee completa sin zoom ni desplazarse hacia los lados | US1-3, US1-4, FR-009, FR-011, SC-002 |
| 7 | Toca la franja. Luego baja por el catálogo | Al tocarla no pasa nada y no hay forma de cerrarla. La franja se va con la página y no tapa ningún producto | FR-009, FR-011 |
| 8 | Revisa un producto agotado | Sigue diciendo «Agotado, disponible por encargo» completo | «Productos agotados» |
| 9 | Pon el celular en modo oscuro y abre el catálogo. Repite en modo claro | La franja se lee bien en los dos | FR-014, SC-005 |
| 10 | Anota el precio de 5 productos en el catálogo. En el panel, abre «Registrar venta» de cada uno y mira el precio propuesto | Son iguales a los de antes de activar el sello, al centavo | US1-6, FR-013, SC-003 |
| 11 | En «Promoción», cambia el texto a «Venta navideña 🎄», elige Verde y guarda. Recarga el catálogo | Aparece la franja verde con «Venta navideña 🎄» y no la anterior | US2-1, FR-010, «Caracteres especiales» |
| 12 | Repite el paso 11 con Dorado y con Azul, y revisa cada color en el catálogo, en modo claro y oscuro | El texto se lee bien con los 4 colores | FR-005, FR-014, SC-005 |
| 13 | Escribe un texto de 41 caracteres, por ejemplo «Ñandú» repetido | El contador dice «Te pasaste por 1 carácter» y no se puede guardar. Un texto de exactamente 40 sí se guarda | US2-4, FR-004 |
| 14 | Escribe `<b>Hola</b>` y guarda activo | La franja muestra literalmente `<b>Hola</b>`, sin negritas | FR-012 |
| 15 | Desmarca la casilla y guarda. Recarga el catálogo. Vuelve a «Promoción» | Aparece «Listo. El sello está desactivado.», la franja ya no se ve, y en el panel siguen el último texto y el último color | US1-5, FR-007 |
| 16 | Borra el texto con la casilla desmarcada y guarda | Se guarda sin error | «Desactivar sin texto» |
| 17 | Cierra la sesión y abre `/admin/promocion` | Te manda a iniciar sesión | FR-001, «Sin sesión» |
| 18 | En una tableta o con la ventana a unos 800 px, mira la navegación del panel | Los enlaces no se enciman (research 7, riesgo conocido) | FR-001 |
| 19 | Pide a 10 personas que abran el catálogo con el sello activo y lean el texto | Al menos 9 lo leen completo sin zoom y siguen encontrando el nombre, el precio y la disponibilidad | SC-004 |

## En producción, para el Buen Fin

1. Publicar la versión con la migración `0003`. Antes, sacar el respaldo del día, como en la spec 004.
2. Hacer los pasos 2 a 7, 9 y 15 en producción.
3. Dejar el sello activo con el texto acordado: «Buen Fin · Pregunta por tu descuento», en Rojo.
