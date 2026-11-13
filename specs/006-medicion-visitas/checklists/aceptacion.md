# Aceptación: Medición de visitas

**Feature**: [spec.md](../spec.md) | **Quickstart**: [quickstart.md](../quickstart.md)

## T018: pruebas automáticas

- **Fecha**: 2026-11-12, en la laptop de desarrollo, sobre `ee80dd4` más los cambios de la implementación.
- **`npm run verificar`**: tipos y lint sin errores; Vitest **427 de 427** en 35 archivos. Las nuevas son `tests/unit/estadisticas.test.ts` (14) y los 5 casos de la spec 006 en `tests/unit/aviso-privacidad.test.ts`. Los casos de la spec 003 siguen pasando.
- **`npm run test:e2e`** (specs 001 a 006, móvil y portátil, con axe): **230 de 230** en 16.4 min, sin fallas ni repeticiones.
- **e2e de la spec 006** (`us18-medicion-visitas`): **28 de 28** en una corrida dedicada (2.8 min). Ninguna prueba carga el Umami real: usan `tests/e2e/ayudantes-medicion.ts`.
- **Nota**: las pruebas unitarias se vieron fallar antes de implementar. La e2e `us18` se escribió antes del código, pero no se corrió antes de implementar, porque cada corrida compila la app.

## T019: desarrollo no cuenta visitas (FR-003)

- **2026-11-12, propietario**: con `npm run dev`, abrió `http://localhost:3000` y 2 productos. Después de esperar, el tablero de `https://estadisticas.cristobalia.com/dashboard` seguía **vacío**. **Cumple FR-003 y US1-5.**

## T020: LCP de producción antes de publicar

- **Fecha**: 2026-11-12, desde la laptop de desarrollo, sin otras pruebas corriendo. Producción tenía el commit de la spec 005, con el sello «Buen Fin» activo.
- **Comando**: el de quickstart.md («Antes de publicar»), Lighthouse 12.8.2, móvil, `rttMs=60`, `throughputKbps=9000`.

| Corrida | LCP |
|---|---|
| 1 | 1.12 s |
| 2 | 1.30 s |
| 3 | 1.26 s |
| **Mediana** | **1.26 s** |

Es más alta que los 1.04 s de la spec 002 sin ningún cambio de esta spec: es la variación de la red y del día. Por eso el criterio de T024 compara contra esta mediana (research 8).

## T021: aprobación del texto del aviso

- **Aprobado por el propietario el 2026-11-12**, sin cambios: los tres párrafos de contracts/interfaz.md, sección 3, tal como están en `src/lib/aviso-privacidad.ts`.

## T022: publicación

- **2026-11-12**: `main` avanzó a `e43665e` (sin commit de merge) y se subió a GitHub. El propietario pulsó Implementar en Easypanel y confirmó que la app carga y el aviso se actualizó.
- **Comprobado desde la laptop**:
  - `/aviso-de-privacidad` muestra «medimos de forma anónima» y «Última actualización: 12 de noviembre de 2026» (FR-007, FR-010);
  - las páginas de cliente traen el script de `estadisticas.cristobalia.com`;
  - `/admin/entrar` no lo trae (FR-002).

## T023: comprobación en producción

Celular Android del propietario con datos móviles, 2026-11-12, alrededor de las 10 p. m. (hora del centro de México).

| Paso | Resultado | Cubre |
|---|---|---|
| 3 | El aviso muestra los párrafos nuevos y «12 de noviembre de 2026» | US4, FR-007 a FR-010, SC-007 |
| 4 | En menos de 5 minutos, el tablero mostró las páginas `/`, `/aviso-de-privacidad` y 2 productos `/producto/...`. País **Mexico**, región «Mexico, Mexico» (Estado de México), ciudad **Toluca** y dispositivo **Mobile** (Android, Chrome). Toluca es la ubicación del proveedor del celular, no la del servidor. El segundo visitante es la laptop del propietario (Windows, Laptop). **Cumple**, y confirma que el proxy de Easypanel pasa la IP real (research 11) | US1-1 a US1-3, SC-001 |

| 5 | Las páginas vistas subieron de 11 a 22. **Pages** las suma a `/`, porque agrupa por ruta. En **Query** aparecen `categoria` (3 valores) y `subcategoria` (2 valores) con su identificador interno, no con su nombre. **Cumple.** Se corrigió el paso 5 del quickstart para indicar dónde verlo. Mostrar nombres en lugar de identificadores sería una spec nueva | «Navegación sin recargar» |

| 6 | Con `/?utm_source=whatsapp&utm_campaign=prueba`, el catálogo cargó (vistas: 22 → 23). En **Query** aparecen `utm_source = whatsapp` y `utm_campaign = prueba`. **Cumple** | US2-1, US2-2, SC-002 |

| 7 | El propietario tocó «Contacto» en 3 productos: la llamada se abrió rápido las 3 veces. Después de recargar el tablero (antes mostraba datos viejos: 1 evento), **Events** cuenta **3 `interes-telefono`** | US3-1, US3-3, FR-006, SC-003 |

| 7 (propiedades) | En **Events → Properties**: 7 eventos con `pagina` y 4 con `producto`: «Rex Toy Story» (2), «Figuras DC» (1) y «Rompecabezas en Cilindro» (1). Al principio solo mostraba 1 con producto: el tablero tarda unos minutos en actualizar las propiedades. Los eventos sin `producto` vienen de teléfonos fuera de una ficha, como el pie de página, como está diseñado. Revisión directa en producción con un Umami falso (sin sumar al tablero): «Contacto» en 3 productos envió `pagina` y `producto` con su nombre («Trailer negro Hot Wheels», «Stacie to the rescue», «Moana 2»). **Cumple** | SC-003, FR-006 |

**Nota para el propietario**: el tablero de Umami puede tardar unos minutos en mostrar eventos y propiedades nuevos; recargar la página (F5) ayuda.

| 8 | En `pagina` aparecen `/` (2) y `/encargos` (1). **En producción no hay artículos por encargo**: `/encargos` no tiene ningún «Contacto», así que ese toque fue el del pie de página y por eso no lleva `producto`. El caso del artículo con su nombre lo cubre la e2e `US3-2`; se verá en el tablero cuando haya artículos. Revisión directa en producción (Umami falso): en «Rex Toy Story», «Contacto» envía `pagina` + `producto` y el pie de página solo `pagina`. Los toques sin `producto` en páginas de producto vienen del pie, que en el celular queda justo debajo del recuadro. **Cumple** con esa salvedad | US3-2 |

| 9 | El propietario usó el panel desde la laptop. En **Pages** (9 páginas, lista completa) no aparece ninguna que empiece con `/admin`; solo `/`, `/encargos`, `/aviso-de-privacidad` y 6 `/producto/...`. **Cumple** | US1-4, FR-002, SC-004 |

| 10 | El propietario consultó «Mis apartados» con su nombre y su teléfono. En **Events → Activity** solo aparece «Viewed page `/mis-apartados`» (11:45 p. m.), sin nombre, sin teléfono y sin eventos adicionales. **Cumple** | FR-004, SC-005 |

| 11 | Con Brave en el celular: la página funciona y «Contacto» abre la llamada; la visita **no** se registra en el tablero, como se espera con un bloqueador. **Cumple** | FR-005, «Bloqueadores» |

| 13 | Comprobado desde la laptop el 2026-11-12. Ninguna respuesta trae `Set-Cookie`: ni `/`, ni una página de producto, ni `/mis-apartados`, ni `estadisticas.cristobalia.com/script.js`, ni el envío a `/api/send` (probado con un sitio inexistente, que Umami rechazó con 400 sin registrar nada). El `script.js` instalado no contiene la palabra «cookie»; solo lee `localStorage` para la marca `umami.disabled`. **Cumple** | FR-004 (sin cookies) |

| 14 | En los registros de `umami-db` en Easypanel (2026-11-13 05:49 UTC), el `INSERT INTO "public"."session"` muestra todas las columnas que guarda Umami: `session_id, website_id, browser, os, device, screen, language, country, region, city, distinct_id, created_at`. **Ninguna guarda la IP.** **Cumple.** Los `duplicate key value violates unique constraint "session_pkey"` del mismo registro son inofensivos: dos envíos de la misma visita llegan casi juntos y la base rechaza el duplicado | FR-004 (sin guardar IP) |

**T023 completa**: pasos 3 a 11, 13 y 14 cumplen.

## T024 y T025

Pendiente.
