# Quickstart: validación de VendeProductos v0

Esta guía comprueba que la funcionalidad cumple la spec. Los detalles están en [data-model.md](data-model.md) y [contracts/](contracts/).

## Requisitos previos

- Node.js 24 y npm.
- Una base de datos en Neon y un almacén de Vercel Blob para ejecutar la app. Las pruebas de reglas de negocio no los necesitan.
- Archivo `.env.local` con `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_USUARIO`, `ADMIN_HASH_CONTRASENA`, `SESION_SECRETO` y `TELEFONO_NEGOCIO`.

## Puesta en marcha

```powershell
npm install
npx playwright install chromium
npm run db:migrar
npm run db:semilla
npm run dev
```

Resultado esperado: la app abre en `http://localhost:3000` con el catálogo vacío, y `/admin/categorias` muestra las categorías iniciales de FR-005.

## Pruebas automáticas

```powershell
npm run verificar
npm run test:e2e
```

Resultado esperado: todo en verde. `verificar` corre tipos, lint y pruebas de reglas de negocio sin servicios externos.

## Comprobación manual

Se hace en un móvil real o en un navegador con tamaño de móvil, sin leer código (Principio VI).

| # | Acción | Resultado esperado | Criterio |
|---|---|---|---|
| 1 | Dar de alta un producto con foto y 5 unidades, en una subcategoría nueva, a $1,250.00 MXN | Queda en menos de 3 minutos y se ve en el catálogo | SC-001 |
| 2 | Abrir el catálogo sin sesión y filtrar por categoría | Se ve con foto, leyenda y teléfono; sin precio de compra | SC-002, SC-008 |
| 3 | Vender 1 unidad a $1,100.00 MXN | Quedan 4 disponibles; el catálogo sigue en $1,250.00 MXN | SC-003, SC-004 |
| 4 | Apartar 2 unidades con $300.00 MXN iniciales | Quedan 2 disponibles; el saldo es correcto | SC-004 |
| 5 | Registrar el saldo y marcar entrega | Pasa a Pagado y a Entregado; siguen 2 disponibles | SC-005 |
| 6 | Vender las unidades restantes | El catálogo marca "Agotado, disponible por encargo" | FR-015 |
| 7 | Registrar un encargo con anticipo | Aparece en encargos pendientes; la disponibilidad no cambia | FR-024, FR-026 |
| 8 | Consultar en `/mis-apartados` con nombre y teléfono | Se ven pagos y saldo en menos de 1 minuto | SC-007 |
| 9 | Buscar en administración por fecha, nombre y teléfono | La operación aparece en menos de 30 segundos | SC-006 |
| 10 | Cancelar un apartado y anular una venta | Las unidades regresan; quedan Cancelado y Anulada en el historial | FR-027, FR-042 |
| 11 | Comparar 20 operaciones con una suma manual | Coinciden al centavo | SC-005 |

SC-009 se valida con personas reales: 9 de cada 10 deben filtrar y encontrar un producto sin ayuda.
