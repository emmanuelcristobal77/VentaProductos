# Quickstart: validar la medición de visitas

**Feature**: [spec.md](spec.md) | **Fecha**: 2026-11-12

Guía para comprobar la spec 006 usando la app y el tablero de estadísticas (Principio VI). Lo que se envía está en [contracts/interfaz.md](contracts/interfaz.md) y lo que se guarda, en [data-model.md](data-model.md).

## Requisitos

- Acceso al tablero en `https://estadisticas.cristobalia.com`, con la contraseña del propietario.
- Un celular **con datos móviles**, sin wifi, para que la ciudad sea la del celular y no la de la casa.
- Un navegador con bloqueador de anuncios (por ejemplo, Brave) para el paso 10.
- Antes de publicar, en la laptop:

```powershell
npm run verificar        # tipos, lint y pruebas unitarias e integración
npm run test:e2e         # incluye us18-medicion-visitas
```

## Antes de publicar: medir la velocidad de hoy

Corre 3 veces y anota la mediana del LCP ([research 8](research.md#8-velocidad-fr-011-y-sc-006)):

```powershell
npx -y lighthouse@12.8.2 https://app.cristobalia.com/ --only-categories=performance --form-factor=mobile --throttling.rttMs=60 --throttling.throughputKbps=9000 --output=json --output-path=./lcp-antes.json
```

## Pasos

| # | Qué hacer | Qué debe pasar | Cubre |
|---|---|---|---|
| 1 | En la laptop, con `npm run dev`, abre el catálogo y 2 productos. Espera 5 minutos y revisa el tablero | No aparece ninguna visita nueva | FR-003, US1-5 |
| 2 | Publica: sube a `main` y pulsa **Implementar** en Easypanel | La app carga normal en `app.cristobalia.com` | — |
| 3 | Abre el aviso de privacidad desde el celular | En «Datos que recabamos» dice que se miden visitas de forma anónima, sin cookies y sin guardar la IP. «Para qué los usamos» y «Con quién los compartimos» tienen sus párrafos nuevos, y la fecha de actualización es la de hoy | US4, FR-007 a FR-010, SC-007 |
| 4 | Desde el celular, abre el catálogo y 3 productos distintos. Toma la hora | En menos de 5 minutos, el tablero muestra la visita, las 4 páginas (`/` y 3 `/producto/...`), tu país y una ciudad cercana (**no** la del servidor) y el tipo «Mobile» | US1-1 a US1-3, SC-001, [research 11](research.md#11-la-ciudad-detrás-del-proxy-de-easypanel) |
| 5 | Toca una categoría del catálogo | Las páginas vistas suben. En **Pages** se suma a `/`, porque esa sección agrupa por ruta sin lo que va después del `?`. En **Query** (al final del menú de «View details») aparece `categoria` con el identificador de la categoría | «Navegación sin recargar» |
| 6 | Abre en el celular `https://app.cristobalia.com/?utm_source=whatsapp&utm_campaign=prueba` | La página se ve igual. En el tablero, en **Query** (menú de «View details»), aparecen `utm_source = whatsapp` y `utm_campaign = prueba` | US2-1, US2-2, SC-002 |
| 7 | Toca el teléfono de contacto desde 3 productos distintos | Las 3 veces se abre la llamada al instante (cuélgala). En el tablero, en «Eventos», aparecen 3 `interes-telefono` y, en sus datos, los 3 nombres de producto | US3-1, US3-3, FR-006, SC-003 |
| 8 | Toca el teléfono del pie de página en el catálogo y el de un artículo en «Encargos» | Se abre la llamada. El tablero cuenta 2 eventos más: uno con página `/` y otro con página `/encargos` y el nombre del artículo | US3-2 |
| 9 | En la laptop, entra al panel y úsalo 5 minutos: productos, operaciones, «Promoción» | En el tablero no aparece ninguna página que empiece con `/admin` | US1-4, FR-002, SC-004 |
| 10 | Consulta «Mis apartados» con tu teléfono. Luego busca ese teléfono en el tablero: páginas, eventos y datos de eventos | El teléfono no aparece en ningún lugar; solo la página `/mis-apartados` | FR-004, SC-005 |
| 11 | En el navegador con bloqueador, abre el catálogo, un producto y toca el teléfono | Todo se ve y funciona igual; la llamada se abre. Esa visita puede no aparecer en el tablero | FR-005, «Bloqueadores» |
| 12 | Mide otra vez la velocidad, 3 veces, con el comando de arriba y `--output-path=./lcp-despues.json` | La mediana del LCP no supera a la de antes en más de 0.1 s, y el propietario confirma la cifra, como en la spec 002 | FR-011, SC-006 |
| 13 | En el celular o la laptop, abre el catálogo y revisa las cookies del sitio (en Chrome: candado de la barra → «Cookies y datos de sitios»; en la laptop, F12 → Application → Cookies) | `app.cristobalia.com` no tiene cookies, y `estadisticas.cristobalia.com` tampoco aparece con cookies | FR-004 (sin cookies) |
| 14 | En Easypanel, abre `umami-db` y en su consola o en PgWeb revisa las columnas de las tablas `session` y `website_event` | Ninguna columna guarda la dirección IP; solo hay país, región, ciudad, dispositivo, navegador, idioma y pantalla | FR-004 (sin guardar IP) |

## Al terminar: no contar tus propias visitas

Cuando ya pasaron todos los pasos, en cada celular o computadora del propietario y del vendedor:

1. Abre `https://app.cristobalia.com`.
2. En la computadora, abre la consola del navegador (F12) y escribe `localStorage.setItem("umami.disabled", "1")`. En el celular, crea un marcador con esta dirección y ábrelo estando en la página:

   ```text
   javascript:localStorage.setItem('umami.disabled','1');alert('Listo: este dispositivo ya no se cuenta')
   ```
3. Para comprobarlo, abre 2 productos. Después de 5 minutos, no deben aparecer en el tablero.

Esto no cambia la app ([research 10](research.md#10-visitas-propias)). Si se borran los datos del navegador, hay que repetirlo.

## Registro

Anotar los resultados, las 6 mediciones de LCP y la fecha de publicación en `checklists/aceptacion.md`.
