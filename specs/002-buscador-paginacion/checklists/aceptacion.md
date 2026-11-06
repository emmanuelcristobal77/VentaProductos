# Aceptación: buscador de productos y paginación

**Feature**: [spec.md](../spec.md) · **Guía**: [quickstart.md](../quickstart.md)

## Velocidad con 500 productos (T036)

Medido el 2026-11-05 en una base de prueba local (`./datos/prueba-500`) con 500 productos de ejemplo con foto, creada con `scripts/productos-ejemplo.ts`. Nunca se usó el catálogo real. Compilación de producción (`next start`) del commit `6e3371c` en el equipo del propietario, con credenciales de prueba.

Herramienta: Lighthouse 12.8.2 en perfil móvil, con el perfil Fast 4G aceptado en la spec 001 (9 Mbps, 60 ms de latencia y CPU 4 veces más lenta). Tres pasadas por medición; se reporta la mediana.

**Limitación**: las fotos de ejemplo son de un solo color y pesan unos 5 KB cada una, menos que una foto real. En la medición, la foto principal se descargó en unos 0.05 s; el tiempo se fue en ejecutar el JavaScript.

### SC-002: primera vista del catálogo

| Medición | Productos | Puntaje | FCP | LCP |
|---|---|---|---|---|
| Versión nueva (`6e3371c`) | 500 | 91 | 0.4 s | 1.2 s |
| Versión nueva (`6e3371c`) | 34 | 91 | 0.4 s | 1.3 s |

- **Con 500 productos es igual de rápido que con pocos**: la primera vista carga solo 20 productos, así que la cantidad total no cambia el tiempo.
- **La meta técnica de LCP ≤ 1 s no se alcanzó en este equipo**: el 81 % del LCP es espera de render, es decir, el celular simulado ejecutando JavaScript. Lighthouse simula la CPU lenta a partir de la del equipo que mide, y este equipo también corría el servidor.
- **Comparación con la versión anterior a la spec 002**: se compiló `c2c2da5` en una copia aparte y se midió con la misma base de 34 productos, alternando 5 pasadas de cada versión. Mediana de la versión anterior: LCP 1.30 s y TBT 365 ms. Mediana de la nueva: LCP 1.23 s y TBT 415 ms. La spec 002 no hizo más lenta la primera vista. En este equipo, la versión anterior da 1.3 s, mientras que en producción dio 0.9 s (aceptación de la spec 001), así que la diferencia viene de medir en local.
- **Decisión del propietario (2026-11-05)**: se acepta con esta evidencia. La spec 002 no hizo más lenta la primera vista y con 500 productos es igual de rápida que con pocos. El LCP ≤ 1 s se confirma en producción en la T039, con el mismo perfil Fast 4G con que se aceptó la spec 001. **Cumple, con confirmación pendiente en la T039.**

### SC-003: resultados después de dejar de escribir

Dato técnico de apoyo, medido con Playwright en vista móvil de 390 px, con la misma red Fast 4G y CPU 4 veces más lenta: tiempo desde la última tecla hasta que la lista y el anuncio cambian, incluida la espera de 250 ms. Siete búsquedas: "pelota", "muneca de trapo", "lavable", "roja", "pijama clasica", "oaxaca" y "zzz".

| Mediana | Máximo | Meta | Cumple |
|---|---|---|---|
| 0.37 s | 0.45 s | ≤ 1 s | Sí |

La consulta en el servidor tarda unos 16 ms con 500 productos.

- **Comprobación por el propietario (2026-11-05)**: en el celular y en la portátil, con la base de 500 productos, el buscador muestra los resultados en menos de 1 segundo, tanto en el catálogo como en el panel de administrador. **Cumple.**

### Paso 9 del quickstart: «Ver más» con 500 productos (SC-004)

| Resultado | Criterio | Cumple |
|---|---|---|
| Con Playwright, 24 pulsaciones de «Ver más» mostraron 500 productos, los 500 distintos, y el botón desapareció al final | FR-010 a FR-013, SC-004 | Sí |

- **Comprobación por el propietario (2026-11-05)**: en el catálogo y en el panel de administrador, al pulsar «Ver más» se agregan más productos en menos de 1 segundo. El recorrido completo de los 500, sin repetidos y con el botón desapareciendo al final, queda cubierto por la medición con Playwright.

Al terminar las comprobaciones de la T036 se apagó la app de prueba y se borró la carpeta `./datos/prueba-500`.

## Comprobación en un celular real (T037)

Hecha por el propietario el 2026-11-05 en su celular, conectado por Wi-Fi a la app de prueba local con la base de 500 productos de ejemplo (`./datos/prueba-500`), con credenciales de prueba. Los pasos 9 y 10 los cubre la T036.

| # | Paso del quickstart | Criterio | Cumple |
|---|---|---|---|
| 1 | Escribir poco a poco el nombre de un producto: la lista se reduce mientras se escribe | FR-001, FR-003, US1-1 | Sí |
| 2 | "muneca" y "MUÑECA" encuentran "Muñeca de trapo" | FR-002, US1-2 | Sí |
| 3 | Una palabra que solo está en la descripción ("lavable") encuentra el producto | FR-002, US1-3 | Sí |
| 4 | "roja pelota" encuentra "Pelota roja" | FR-002 | Sí |
| 5 | Con una categoría elegida, solo aparecen productos de esa categoría que coinciden | FR-004, US1-5 | Sí |
| 6 | "xyzxyz" muestra el mensaje sin resultados con el enlace a los artículos por encargo y el teléfono | FR-005, US1-6 | Sí |
| 7 | Buscar, abrir un producto y regresar con atrás conserva la búsqueda, los resultados y el lugar | FR-008a, US1-10 | Sí |
| 8 | Al recargar, el buscador queda vacío y se ve la lista completa | FR-008, US1-8 | Sí |
| 11 | Tras «Ver más» dos veces, abrir un producto y regresar conserva los productos y el lugar | FR-008a, US2-9 | Sí |
| 12 | Tras «Ver más», cambiar la categoría vuelve a los primeros resultados | FR-014, US2-7 | Sí |
| 13 | Sin conexión, «Ver más» muestra el error y conserva los productos; al volver la conexión, el mismo botón funciona | FR-015 | Sí |
| 14 | En el panel, los pasos 1, 5, 7 y 9 se comportan igual, con partes de 50 | FR-001, FR-010, US1-9, US2-5 | Sí |
| 15 | En el panel, desde el celular, encontrar un producto con el buscador y abrir su edición en menos de 15 segundos | SC-005 | Sí |
| 16 | Con el lector de pantalla se anuncian el número de resultados y los productos agregados | FR-016 | Sí |

- En el paso 3, los datos de ejemplo no tienen una palabra que esté a la vez en nombres y en descripciones, así que el orden "primero el nombre" (FR-007, US1-4) se respalda con las pruebas automáticas (`busqueda-productos.test.ts` y `us8-buscador.spec.ts`).
- Al terminar se apagó la app de prueba y se borró la carpeta `./datos/prueba-500`.
