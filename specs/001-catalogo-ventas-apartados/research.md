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

- **Decision**: PostgreSQL administrado en Neon, con Drizzle ORM y el controlador `pg` sobre la cadena de conexión con pooling.
- **Rationale**: las reglas de dinero y existencias necesitan transacciones y bloqueos reales. Drizzle mantiene el esquema en TypeScript con SQL explícito. El controlador `pg` admite transacciones interactivas, necesarias para `SELECT ... FOR UPDATE`.
- **Alternatives considered**: Prisma, también válido y más maduro, pero con más capas para este caso; SQLite/Turso, con menos garantías para escrituras concurrentes.
- **Nota**: Drizzle sigue en versión 0.x. Se fija la versión exacta para evitar cambios incompatibles.

## 4. Fotos

- **Decision**: Vercel Blob con subida directa desde el navegador y `next/image` para servirlas optimizadas. Se aceptan JPEG, PNG y WebP de hasta 10 MB.
- **Rationale**: las fotos de un móvil pueden superar el límite de cuerpo de una función de servidor; la subida directa lo evita, con un token emitido solo a la sesión de administrador.
- **Alternatives considered**: Cloudflare R2, más barato a gran volumen pero con otra cuenta y configuración; guardar fotos en la base de datos, que encarece y hace lentas las consultas.

## 5. Hospedaje

- **Decision**: Vercel plan Pro (costo estimado de 20 USD al mes por asiento; confirmar antes de contratar), con Neon en su plan gratuito mientras alcance.
- **Rationale**: el plan Hobby de Vercel es solo para uso personal y no comercial, según sus propios términos, y este es un negocio. Next.js funciona sin configuración adicional en Vercel, lo que importa porque el operador no es técnico.
- **Alternatives considered**: Cloudflare Workers con OpenNext, sin esa restricción comercial pero con más piezas y más riesgo de incompatibilidades; un servidor virtual, que exige mantenimiento y respaldos. La app no usa funciones exclusivas de Vercel salvo Blob, aislado en un módulo, de modo que migrar es viable.

## 6. Acceso de administrador

- **Decision**: una credencial única guardada como variables de entorno, con la contraseña en hash `scrypt` (`node:crypto`), y una sesión en cookie firmada con `jose` (`HttpOnly`, `Secure`, `SameSite=Lax`, 30 días). La sesión se verifica en `proxy.ts` y además dentro de cada acción de servidor.
- **Rationale**: FR-001 pide un único acceso compartido; una librería de autenticación completa traería tablas y flujos que nadie usaría. Cambiar la contraseña se hace actualizando la variable, porque la gestión de usuarios está fuera de alcance.
- **Alternatives considered**: Better Auth y Auth.js, que son excesivos para una sola credencial.

## 7. Dinero

- **Decision**: guardar todo importe como entero de centavos (`bigint`). La captura se convierte de texto a centavos sin pasar por números flotantes, y el formato `$1,250.00 MXN` se arma con aritmética entera.
- **Rationale**: cumple el Principio II; ningún cálculo puede producir redondeos implícitos.
- **Alternatives considered**: `numeric` con librería decimal, correcto pero con más superficie de error en la app.

## 8. Fechas y horas

- **Decision**: guardar en `timestamptz` y mostrar en `America/Mexico_City` con un formateador propio.
- **Rationale**: se verificó que `Intl` en es-MX produce `31 de octubre de 2026`, válido, pero también `3:05 p.m. GMT-6`, que no cumple el formato exigido. El formateador produce `3:05 p. m., hora del centro de México`.

## 9. Disponibilidad y concurrencia

- **Decision**: la disponibilidad se calcula siempre como existencia menos apartados vigentes. Cada operación que la afecta abre una transacción y bloquea la fila del producto con `SELECT ... FOR UPDATE`.
- **Rationale**: un contador aparte podría desincronizarse; con el bloqueo, dos registros por la última unidad se atienden en orden y el segundo recibe el aviso del caso límite. El volumen esperado permite calcularla en cada lectura.
- **Alternatives considered**: guardar el contador con una restricción `CHECK`, más rápido pero con dos fuentes de verdad.

## 10. Modelo de operaciones

- **Decision**: una sola tabla `operaciones` con `tipo` (venta, apartado, encargo). La venta genera un pago automático por el total.
- **Rationale**: las tres comparten campos, y FR-036 busca entre las tres por fecha de pago, nombre o teléfono. Con el pago automático, esa búsqueda funciona igual para todas.
- **Alternatives considered**: tres tablas, que obliga a uniones en cada búsqueda.

## 11. Pruebas

- **Decision**: Vitest para reglas de negocio contra PGlite (PostgreSQL embebido, sin Docker, que no está instalado) y Playwright con axe en viewport móvil y de portátil para flujos y accesibilidad. Cada prueba nombra el FR, SC o escenario que cubre.
- **Rationale**: cumple el Principio V y corre en este equipo sin instalar servidores.
- **Limitación**: PGlite atiende una conexión a la vez, por lo que no reproduce una carrera real. La prueba de la última unidad concurrente corre contra una rama de prueba de Neon.
- **Puerta de merge**: `npm run verificar` ejecuta tipos, lint y pruebas. Aún no hay remoto configurado, así que la puerta es local hasta que exista uno con integración continua.

## 12. Límite de intentos

- **Decision**: limitar el inicio de sesión a 5 intentos fallidos y la consulta de clientes a 10 por cada 15 minutos, por IP, con registro en base de datos y solo el hash de la IP.
- **Rationale**: la consulta muestra datos personales y financieros con solo nombre y teléfono; el límite dificulta probar combinaciones. Se resolvió aquí el punto diferido en la clarificación. No agrega funciones visibles más allá de un mensaje de espera.

## Riesgos abiertos

- **Aviso de privacidad**: el sistema guarda nombres, teléfonos y pagos de clientes. La legislación mexicana de datos personales (LFPDPPP) normalmente exige un aviso de privacidad. La spec no lo incluye y, por el Principio IV, no se agrega aquí. Debe evaluarse antes de publicar.
- **TypeScript 7**: es la versión vigente en npm. Si `next` o `drizzle-kit` no la admiten aún al iniciar, se fija la última 5.x compatible.
- **Costos**: los límites gratuitos de Neon y Blob deben confirmarse antes de contratar.

## Fuentes

- [Vercel: plan Hobby](https://vercel.com/docs/plans/hobby)
- [Vercel Blob: uso y precios](https://vercel.com/docs/vercel-blob/usage-and-pricing)
- [Drizzle vs Prisma en 2026](https://makerkit.dev/blog/md/tutorials/drizzle-vs-prisma)
- [Librerías de componentes para Tailwind v4](https://www.pkgpulse.com/guides/best-tailwind-v4-component-libraries-2026)
