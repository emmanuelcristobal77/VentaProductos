# VendeProductos

Catálogo en línea y registro de ventas, apartados, encargos y pagos de Productos Eli's. El detalle de lo que hace la aplicación está en [la especificación](specs/001-catalogo-ventas-apartados/spec.md).

## Poner en marcha en su equipo

Necesita Node.js 24.

1. Copie `.env.example` a `.env.local` y llene los valores (vea [Variables](#variables)).
2. Ejecute:

```powershell
npm install
npx playwright install chromium
npm run db:migrar
npm run db:semilla
npm run dev
```

3. Abra `http://localhost:3000`. La administración está en `http://localhost:3000/admin`.

## Variables

| Variable | Para qué sirve |
|---|---|
| `DATOS_DIR` | Carpeta de la base de datos y las fotos. En producción: `/datos` |
| `ADMIN_USUARIO` | Usuario de administrador |
| `ADMIN_HASH_CONTRASENA` | Contraseña cifrada; vea [Cambiar la contraseña](#cambiar-la-contraseña) |
| `SESION_SECRETO` | Texto aleatorio de al menos 32 caracteres |
| `IP_SAL` | Texto aleatorio; protege las direcciones IP guardadas para el límite de intentos |
| `TELEFONO_NEGOCIO` | Teléfono de contacto publicado, 10 dígitos |
| `RESPALDO_SUPABASE_URL` | Dirección del proyecto de Supabase; solo para respaldos |
| `RESPALDO_SUPABASE_LLAVE` | Llave de servicio de Supabase; solo para respaldos. Nunca debe publicarse |

## Cambiar la contraseña

1. Ejecute `npx tsx scripts/generar-hash.ts "la-nueva-contraseña"`.
2. Copie el resultado en `ADMIN_HASH_CONTRASENA`, en las variables del servicio en Easypanel.
3. Vuelva a desplegar el servicio.

Para cerrar todas las sesiones abiertas, cambie también `SESION_SECRETO`.

## Publicar en Easypanel

El servicio se construye con el `Dockerfile` de este repositorio.

- Use **una sola réplica**: la base de datos es un archivo y solo un proceso debe abrirla.
- Monte un **volumen persistente en `/datos`**. Sin él, cada despliegue borra la información.
- Defina las variables de la tabla anterior con `DATOS_DIR=/datos`.
- Al arrancar, la app aplica las migraciones y crea las categorías iniciales si la base está vacía.

Compruebe después de desplegar que los datos siguen ahí tras un redespliegue.

## Respaldos

`node respaldar.cjs`, dentro del contenedor, genera una copia de la base y la sube junto con las fotos nuevas al bucket privado `respaldos` de Supabase. Debe programarse a diario. Conserva 14 días de copias de la base; las fotos no se borran.

Si falla, termina con error y lo escribe en los registros del servicio. Revise esos registros: los proyectos gratuitos de Supabase se pausan tras unos días sin actividad.

## Restaurar un respaldo

Los respaldos no sirven si no se ha probado restaurarlos. Hágalo en una instancia limpia antes de registrar ventas reales.

1. En Supabase, abra el bucket `respaldos` y descargue de `base/` el archivo más reciente, por ejemplo `vende-productos-2026-11-01.sqlite.gz`, y todo lo que haya en `fotos/`.
2. Detenga el servicio.
3. Descomprima el archivo y guárdelo como `vende-productos.sqlite` dentro de `/datos`. Borre de `/datos` los archivos `vende-productos.sqlite-wal` y `vende-productos.sqlite-shm`, si existen: pertenecen a la base anterior.
4. Copie las fotos a `/datos/fotos`.
5. Inicie el servicio.
6. Compare productos, operaciones, saldos y fotos contra lo que esperaba encontrar.

## Revisar que todo funciona

```powershell
npm run verificar
npm run test:e2e
```

`verificar` revisa tipos, estilo y reglas de negocio sin servicios externos. `test:e2e` recorre la aplicación en un navegador con tamaño de móvil y de portátil. La comprobación manual está en [quickstart.md](specs/001-catalogo-ventas-apartados/quickstart.md).
