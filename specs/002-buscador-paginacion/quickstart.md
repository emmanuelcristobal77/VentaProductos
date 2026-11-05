# Quickstart: validar el buscador y la paginación

**Feature**: [spec.md](spec.md) | **Fecha**: 2026-11-05

Guía para comprobar la spec 002 usando la app (Principio VI). Las reglas de búsqueda están en [data-model.md](data-model.md) y las rutas en [contracts/rutas.md](contracts/rutas.md).

## Requisitos

- La app de la spec 001 corriendo en local (`npm run dev`) o en producción.
- Un celular, o el navegador en vista móvil de 390 px de ancho.
- Para los pasos 9 y 10: una base de prueba con 500 productos de ejemplo. **Nunca** se cargan en el catálogo real.

```powershell
npm run verificar        # tipos, lint y pruebas unitarias e integración
npm run test:e2e         # flujos y accesibilidad en móvil y portátil
```

## Escenarios

| # | Pasos | Resultado esperado | Referencia |
|---|---|---|---|
| 1 | En el catálogo, escribir poco a poco el nombre de un producto | La lista se reduce mientras se escribe, sin pulsar ningún botón | FR-001, FR-003, US1-1 |
| 2 | Escribir "muneca" y luego "MUÑECA" | En los dos casos aparece "Muñeca de trapo" | FR-002, US1-2 |
| 3 | Escribir una palabra que solo está en la descripción de un producto | El producto aparece, después de los que la tienen en el nombre | FR-002, FR-007, US1-3, US1-4 |
| 4 | Escribir dos palabras en orden distinto al del nombre, por ejemplo "roja pelota" | Aparece "Pelota roja" | FR-002 |
| 5 | Elegir una categoría y escribir una palabra | Solo aparecen productos de esa categoría que coinciden | FR-004, US1-5 |
| 6 | Escribir "xyzxyz" | Mensaje sin resultados con enlace a los artículos por encargo y el teléfono | FR-005, US1-6 |
| 7 | Buscar, abrir un producto y regresar con el botón de atrás | La misma búsqueda, los mismos resultados y el mismo lugar | FR-008a, US1-10 |
| 8 | Buscar y recargar la página | El buscador está vacío y se ve la lista completa | FR-008, US1-8 |
| 9 | Con 500 productos de ejemplo, pulsar «Ver más» hasta que desaparezca y contar los productos | Se ven los 500, sin repetidos, y el botón ya no aparece | FR-010–FR-013, SC-004 |
| 10 | Con 500 productos de ejemplo, abrir el catálogo en el celular y buscar una palabra | Los primeros productos se ven en 1 s o menos; los resultados aparecen en 1 s o menos después de dejar de escribir | SC-002, SC-003 |
| 11 | Pulsar «Ver más» dos veces, abrir un producto y regresar con atrás | Los mismos productos cargados y el mismo lugar | FR-008a, US2-9 |
| 12 | Pulsar «Ver más» y luego cambiar la categoría | La lista vuelve a los primeros resultados | FR-014, US2-7 |
| 13 | Quitar la conexión del celular y pulsar «Ver más» | Mensaje de error; los productos mostrados siguen ahí; al volver la conexión, el mismo botón funciona | FR-015 |
| 14 | En el panel de administrador, repetir los pasos 1, 5, 7 y 9 | Se comporta igual, con partes de 50 | FR-001, FR-010, US1-9, US2-5 |
| 15 | En el panel, desde el celular, buscar un producto y abrir su edición | Se encuentra en menos de 15 segundos | SC-005 |
| 16 | Con un lector de pantalla, escribir en el buscador y pulsar «Ver más» | Se anuncia el número de resultados y los productos agregados | FR-016 |
| 17 | Prueba con 10 personas nuevas, en su celular: "Encuentra este producto" | 9 de 10 lo encuentran con el buscador sin ayuda | SC-001 |

## Base de prueba con 500 productos (pasos 9 y 10)

```powershell
$env:DATOS_DIR = "./datos/prueba-500"
npx tsx scripts/productos-ejemplo.ts --cantidad 500
npm run build; npx next start -p 3200
```

Medición técnica de SC-002, con el mismo perfil Fast 4G aceptado en la spec 001:

```powershell
npx -y lighthouse@12.8.2 http://localhost:3200 --only-categories=performance --throttling.rttMs=60 --throttling.throughputKbps=9000
```

La meta es un LCP de 1 s o menos. Al terminar, se borra `./datos/prueba-500`. En producción, los pasos 1 a 8 y 14 se repiten con los productos reales.

## Registro de resultados

Los resultados se anotan en `checklists/aceptacion.md` de esta spec, igual que en la spec 001.
