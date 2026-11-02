# Research: VendeProductos v0

Investigación de la Fase 0. Las versiones se confirmaron en el registro de npm el 2026-10-31.

## 1. Framework web

- **Decision**: Next.js 16 (App Router) con React 19 y TypeScript, ejecutado en Node.js 24.
- **Rationale**: un solo proyecto cubre catálogo público, administración y lógica de servidor. Server Components entrega el catálogo rápido en móviles, y al renderizar en el servidor los datos privados no viajan al navegador salvo que se seleccionen de forma explícita.
- **Alternatives considered**: SvelteKit y Nuxt, con menos ecosistema de componentes para la interfaz elegida; frontend y API separados, que duplica despliegue y costo sin beneficio para una sola persona operando.

## 2. Interfaz y apariencia 2026

- **Decision**: Tailwind CSS 4 con shadcn/ui sobre primitivas accesibles, íconos `lucide-react`, avisos `sonner`, tipografía Geist y colores definidos en OKLCH.
- **Rationale**: los componentes se copian al repositorio y se adaptan a la marca, en lugar de verse como una plantilla. Las primitivas resuelven foco, teclado y etiquetas, requisitos del Principio VII.
- **Lineamientos visuales**: mucho espacio en blanco, tarjetas con fotos grandes y esquinas redondeadas, navegación inferior en móvil, hojas deslizables (sheets) para formularios, jerarquía tipográfica fuerte, y transiciones breves que respetan `prefers-reduced-motion`. Tema claro únicamente, porque la spec no pide modo oscuro (Principio IV).
- **Alternatives considered**: MUI, de apariencia reconocible y más pesada; construir componentes desde cero, que traslada la accesibilidad al proyecto.

## 3. Base de datos

- **Decision**: SQLite en modo WAL con `better-sqlite3` 13 y Drizzle ORM, en un archivo dentro de un volumen persistente del VPS. Un solo proceso de la app abre la base.
- **Rationale**: el negocio tiene de 50 a 80 productos y 1 a 3 vendedores. SQLite ofrece transacciones reales, sin un servicio aparte, sin costo y sin API pública que proteger. `BEGIN IMMEDIATE` atiende las escrituras una tras otra, lo que protege dinero y existencias.
- **Alternatives considered**: PostgreSQL en Supabase, descartado porque agrega pausas por inactividad, una API pública que bloquear y límites de plan; se reconsidera si la app debe correr en varios servidores o recibe escrituras continuas de muchas personas. Con SQLite, el tamaño del catálogo no es el límite: lo será la pantalla sin paginación, a partir de unos 300 a 500 productos.
- **Nota**: Drizzle sigue en versión 0.x. Se fija la versión exacta para evitar cambios incompatibles.

## 4. Fotos

- **Decision**: archivos en el mismo volumen persistente del VPS, subidos a `/api/fotos` y servidos por la app, con `next/image` para optimizarlos. Se aceptan JPEG, PNG y WebP de hasta 10 MB, verificando el contenido real del archivo. Cada archivo se guarda con un nombre generado.
- **Rationale**: es la opción más simple cuando la app ya vive en un solo servidor. Las fotos se reducen en el navegador antes de subirlas para ahorrar datos móviles y disco.
- **Alternatives considered**: Supabase Storage y Cloudflare R2, que suman otra cuenta y configuración; guardar fotos en la base de datos, que encarece y hace lentas las consultas y los respaldos.
- **Capacidad**: con unos 80 productos y 3 fotos de hasta 300 KB se usan cerca de 72 MB de los 100 GB del VPS.

## 5. Hospedaje

- **Decision**: el VPS KVM 2 de Hostinger que ya tiene el propietario (Ubuntu 24.04 con Easypanel), con la app como servicio de Easypanel: imagen Docker con Node.js 24 construida en el VPS desde un repositorio privado, una sola réplica, volumen persistente en `/datos`, y dominio y HTTPS gestionados por Easypanel.
- **Rationale**: no agrega costo mensual, y el proceso queda siempre activo, sin pausas por inactividad. Easypanel normalmente ya ocupa los puertos 80 y 443, así que instalar otro proxy chocaría con él. Compilar en Docker evita fallos por compilar en Windows componentes que dependen del sistema operativo, como `better-sqlite3` y `sharp`.
- **Alternatives considered**: Single Web Hosting, descartado porque no incluye Node.js Web Apps; Vercel Pro, más simple pero con un costo estimado de 20 USD al mes, y su plan Hobby no permite uso comercial; Cloudflare Workers con OpenNext, con más piezas y más riesgo de incompatibilidades. La app no usa funciones exclusivas de un hospedaje, de modo que migrar es viable.

## 6. Acceso de administrador

- **Decision**: una credencial única guardada como variables de entorno, con la contraseña en hash `scrypt` (`node:crypto`), y una sesión en cookie firmada con `jose` (`HttpOnly`, `Secure`, `SameSite=Lax`, 30 días). La sesión se verifica en `proxy.ts` y además dentro de cada acción de servidor.
- **Rationale**: FR-001 pide un único acceso compartido; una librería de autenticación completa traería tablas y flujos que nadie usaría. Cambiar la contraseña se hace actualizando la variable, porque la gestión de usuarios está fuera de alcance.
- **Alternatives considered**: Better Auth y Auth.js, que son excesivos para una sola credencial.

## 7. Dinero

- **Decision**: guardar todo importe como entero de centavos (`integer` de SQLite, de 64 bits). La captura se convierte de texto a centavos sin pasar por números flotantes, y el formato `$1,250.00 MXN` se arma con aritmética entera.
- **Rationale**: cumple el Principio II; ningún cálculo puede producir redondeos implícitos.
- **Alternatives considered**: `numeric` con librería decimal, correcto pero con más superficie de error en la app.

## 8. Fechas y horas

- **Decision**: guardar en UTC como texto ISO 8601 y mostrar en `America/Mexico_City` con un formateador propio.
- **Rationale**: se verificó que `Intl` en es-MX produce `31 de octubre de 2026`, válido, pero también `3:05 p.m. GMT-6`, que no cumple el formato exigido. El formateador produce `3:05 p. m., hora del centro de México`.

## 9. Disponibilidad y concurrencia

- **Decision**: la disponibilidad se calcula siempre como existencia menos apartados vigentes. Cada operación que la afecta corre en una transacción `BEGIN IMMEDIATE`, que recalcula la disponibilidad antes de escribir.
- **Rationale**: un contador aparte podría desincronizarse. La transacción obtiene el permiso de escritura desde el inicio, así que dos registros por la última unidad se atienden en orden y el segundo recibe el aviso del caso límite. El volumen esperado permite calcularla en cada lectura.
- **Alternatives considered**: guardar el contador con una restricción `CHECK`, más rápido pero con dos fuentes de verdad.

## 10. Modelo de operaciones

- **Decision**: una sola tabla `operaciones` con `tipo` (venta, apartado, encargo). La venta genera un pago automático por el total.
- **Rationale**: las tres comparten campos, y FR-036 busca entre las tres por fecha de pago, nombre o teléfono. Con el pago automático, esa búsqueda funciona igual para todas.
- **Alternatives considered**: tres tablas, que obliga a uniones en cada búsqueda.

## 11. Pruebas

- **Decision**: Vitest para reglas de negocio contra archivos SQLite temporales, con el mismo motor de producción, y Playwright con axe en viewport móvil y de portátil para flujos y accesibilidad. Cada prueba nombra el FR, SC o escenario que cubre.
- **Rationale**: cumple el Principio V y corre en este equipo sin instalar servidores.
- **Concurrencia**: la prueba de la última unidad usa dos procesos contra el mismo archivo y corre dentro de `npm run verificar`, sin servicios externos.
- **Puerta de merge**: `npm run verificar` ejecuta tipos, lint y pruebas. Aún no hay remoto configurado, así que la puerta es local hasta que exista uno con integración continua.

## 12. Límite de intentos

- **Decision**: aplicar FR-044 por IP, con registro en base de datos y solo el hash de la IP.
- **Rationale**: la consulta muestra datos personales y financieros con solo nombre y teléfono; el límite dificulta probar combinaciones. Se resolvió aquí el punto diferido en la clarificación.

## 13. Respaldos

- **Decision**: una copia diaria fuera del VPS hacia un bucket privado de la cuenta de Supabase del propietario, con la base (`VACUUM INTO`, comprimida) y las fotos nuevas, conservando 14 días de copias de la base. El procedimiento de restauración se prueba antes de registrar ventas reales.
- **Rationale**: con SQLite, las ventas y los pagos viven en un solo servidor. Los respaldos semanales del VPS incluidos pueden perder hasta una semana y restauran el VPS completo; quedan como segunda protección.
- **Alternatives considered**: respaldos diarios de Hostinger (122.99 MXN al mes), que restauran todo el VPS; Cloudflare R2, que suma otra cuenta.

## Riesgos abiertos

- **Aviso de privacidad**: el sistema guarda nombres, teléfonos y pagos de clientes. La legislación mexicana de datos personales (LFPDPPP) normalmente exige un aviso de privacidad. La spec no lo incluye y, por el Principio IV, no se agrega aquí. Debe evaluarse antes de capturar datos de clientes en producción, es decir, antes de publicar US3 o posteriores. El MVP solo muestra el catálogo y no los captura.
- **TypeScript**: se fijó la última versión 5.x, porque `typescript-eslint` aún no admite TypeScript 7 (comprobado el 2026-10-31).
- **Costos**: el destino de los respaldos usa el plan gratuito de Supabase (según fuentes externas, 1 GB de archivos). Sus límites y condiciones comerciales deben confirmarse antes de publicar.
- **Mantenimiento del VPS**: a diferencia de un hospedaje administrado, el sistema operativo, el firewall y las actualizaciones de seguridad quedan a cargo del propietario. Se reduce con actualizaciones automáticas y solo los puertos 22, 80 y 443 abiertos.
- **VPS compartido**: si ya aloja otros sistemas, esta app no debe interferir con ellos; se revisa antes de instalar.
- **Pausa del destino de respaldos**: los proyectos gratuitos de Supabase se pausan tras unos 7 días sin actividad. Si eso detiene las copias, deben fallar de forma visible en los registros de Easypanel; se confirma en T093.
- **Punto único de falla**: si el VPS se pierde, la app queda fuera de línea hasta reinstalarla y restaurar la copia más reciente; se pueden perder las operaciones del último día.

## Estado del VPS (T089)

Revisado en Easypanel v2.37.0 el 2026-11-01, sin modificar nada.

- **Recursos**: 2 núcleos con 1 % de uso; memoria 2.1 GB de 7.8 GB; disco 10.5 GB de 95.8 GB.
- **Servicios existentes**: proyecto `orangutania` con `chatwoot`, `chatwoot-db`, `chatwoot-redis`, `chatwoot-sidekiq`, `n8n`, `n8n-db`, `n8n-runner` y `redis_orangutan`, todos activos. La app va en un proyecto aparte para no afectarlos.
- **Dominio**: `app.cristobalia.com`, con HTTPS de Let's Encrypt; el repositorio privado es `emmanuelcristobal77/VentaProductos`.
- **Tareas programadas**: el cron del VPS ejecuta `/usr/local/bin/respaldo-elis.sh` a diario a las 09:00 UTC (3:00 a. m. local). La copia del 2026-11-02 se subió a esa hora (T093).
- **Supabase**: proyecto `elisproductos-respaldos` en plan Free. Revisado el 2026-11-02:
  - 1 GB de almacenamiento de archivos, 50 MB por archivo y 5 GB de transferencia al mes; la copia de la base pesa hoy 4.84 KB.
  - El plan Free no incluye respaldos automáticos propios; el bucket es la única copia fuera del VPS.
  - El proyecto se pausa tras una semana sin "actividad suficiente de la base de datos", con un correo de aviso antes. Un proyecto pausado se puede restaurar hasta un año después. La documentación no aclara si las subidas a Storage cuentan como actividad, y el respaldo solo usa Storage.
  - Uso comercial: la página de precios y los términos no lo prohíben de forma explícita para el plan Free; no hay una confirmación oficial.
- **Decisión contra la pausa**: tras cada respaldo correcto, `scripts/respaldar.ts` actualiza la única fila de la tabla `latido` en Supabase con la hora del respaldo. Así hay actividad diaria en la base de datos sin pagar el plan Pro. Comprobado el 2026-11-02: un respaldo manual dejó `ultimo_respaldo` en 18:32 UTC.
- **Despliegue**: Easypanel no despliega solo al recibir un `push`; hay que pulsar **Implementar** en el servicio.

## Prueba de restauración (T094)

Hecha el 2026-11-02 en la laptop del propietario, con `DATOS_DIR=C:\restauracion-prueba` y credenciales de prueba, siguiendo el README con la copia de las 13:15 (hora local).

- La base descomprimida pasó `integrity_check` y trae 3 productos (1 activo y 2 inactivos), 3 fotos, 3 categorías y 7 subcategorías. Las 3 fotos de `fotos/` coinciden con los registros.
- El catálogo restaurado se ve igual que el de `app.cristobalia.com`: mismo producto, foto, precio y categoría.
- Aún no hay operaciones ni pagos, así que los saldos no se pudieron comparar. Conviene repetir la prueba cuando haya ventas registradas.

## Fuentes

- [Vercel: plan Hobby](https://vercel.com/docs/plans/hobby)
- [Node.js en Hostinger](https://docs.hostinger.com/node.js/overview)
- [Límites del plan gratuito de Supabase](https://automationatlas.io/answers/supabase-free-tier-limits-2026/)
- [Precios de Supabase](https://supabase.com/pricing)
- [Pausa de proyectos en Supabase](https://supabase.com/docs/guides/platform/project-pausing)
- [Términos de servicio de Supabase](https://supabase.com/terms)
- [Drizzle vs Prisma en 2026](https://makerkit.dev/blog/md/tutorials/drizzle-vs-prisma)
- [Librerías de componentes para Tailwind v4](https://www.pkgpulse.com/guides/best-tailwind-v4-component-libraries-2026)
