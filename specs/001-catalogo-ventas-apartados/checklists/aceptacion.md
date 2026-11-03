# Aceptación: VendeProductos v0

**Feature**: [spec.md](../spec.md) · **Guía**: [quickstart.md](../quickstart.md)

## Velocidad del catálogo (T092 y T085)

Meta de [plan.md](../plan.md): primera vista del catálogo en menos de 2.5 segundos en una conexión móvil 4G.

Medido el 2026-11-03 en `https://app.cristobalia.com/`, con 34 productos con foto. Herramienta: Lighthouse 12.8.2 en perfil móvil, con su simulación por defecto (4G lento: 1.6 Mbps, 150 ms de latencia y CPU 4 veces más lenta). Tres pasadas por versión; se reporta la mediana.

| Versión | Puntaje | FCP | LCP | Cumple |
|---|---|---|---|---|
| Inicial | 77 | 2.6 s | 3.0 s | No |
| `2070787`: fotos con prioridad alta y fuente solo latina | 94 | 1.1 s | 2.7 s | No |
| `affbf4f`: avisos solo en administración | 94 | 1.1 s | 2.6 s (2.5–2.8) | No |

- Con la versión `affbf4f`, la foto principal se descarga en unos 0.2 s, pero tarda unos 0.55 s más en pintarse mientras el teléfono ejecuta el JavaScript, que es sobre todo React y Next.js.
- Con un 4G normal (perfil "Fast 4G" de Chrome: 9 Mbps y 60 ms de latencia, con la misma CPU 4 veces más lenta), la versión `affbf4f` da una mediana de puntaje 99, FCP 0.6 s y LCP 0.9 s.
- **Decisión del propietario (2026-11-03)**: la meta se mide con el perfil 4G normal, que es el que describe plan.md; el perfil 4G lento de Lighthouse queda solo como referencia. **Cumple**: LCP de 0.9 s.
- **Celular real (2026-11-03)**: con datos 4G, la primera fila de productos con foto apareció en 1.22 s. Con wifi, ver las 34 fotos bajando hasta el final tomó menos de 6 s; ese tiempo no es la primera vista.

## Comprobación manual en un celular real (T092)

| # | Resultado | Criterio | Cumple |
|---|---|---|---|
| 1 | 2026-11-03: alta de un producto real con 3 fotos en unos 1.5 minutos, incluido el guardado de unos 3 s; se ve en el catálogo público. Se usó una subcategoría existente; crear subcategorías lo cubren las pruebas automáticas | SC-001 | Sí |
| 2 | 2026-11-03: sin sesión, en incógnito, el filtro por categoría funciona y el detalle muestra foto, leyenda y teléfono de contacto; solo aparece el precio de venta, nunca el de compra | SC-002, SC-008 | Sí |

## Comprobación manual de operaciones (T088)

Hecha el 2026-11-03 en una copia local del respaldo de ese día (`C:\prueba-t088`), con compilación de producción y credenciales de prueba, para no dejar operaciones ficticias en producción. Producto de prueba: "Prueba T088", 5 unidades a $1,250.00 MXN. Cada acción del vendedor se completó en menos de 1 segundo.

| # | Resultado | Criterio | Cumple |
|---|---|---|---|
| 3 | Venta de 1 unidad a $1,100.00: quedan 4 disponibles y el catálogo sigue en $1,250.00. Marcarla como entregada no cambia la existencia | SC-003, SC-004 | Sí |
| 4 | Apartado de 2 unidades con $200.00 iniciales, en lugar de $300.00: quedan 2 disponibles y el saldo es $2,300.00 | SC-004 | Sí |
| 5 | Pago de $2,300.00: saldo $0.00 y estado Pagado; al marcar la entrega pasa a Entregado, la existencia baja a 2 y siguen 2 disponibles | SC-005 | Sí |
| 6 | Venta de las 2 unidades restantes: el catálogo marca "Agotado, disponible por encargo" | FR-015 | Sí |
| 7 | Encargo de 1 unidad con $500.00 de anticipo: aparece en encargos pendientes con saldo de $750.00 y el catálogo sigue agotado. Un encargo cancelado conserva su pago como no devuelto (FR-027) | FR-024, FR-026 | Sí |
| 8 | Consulta en `/mis-apartados`: muestra el encargo con su pago y saldo, sin precio de compra, en menos de 1 minuto. Con un teléfono equivocado responde "No encontramos información con esos datos", sin decir qué dato falló | SC-007 | Sí |
| 9 | Búsqueda en administración por fecha, nombre y teléfono: encuentra las operaciones y abre su desglose | SC-006 | Sí |
| 10 | Anulación de la venta de 2 unidades ya entregada: queda Anulada y la existencia vuelve a 2. Apartado nuevo de 1 unidad con $100.00, cancelado: queda Cancelado, vuelven 2 disponibles y el pago sigue visible. Ambas siguen en el historial | FR-027, FR-042 | Sí |
| 11 | 20 operaciones: las 6 anteriores y 14 registradas desde la interfaz con un navegador automático (5 ventas, 5 apartados y 4 encargos, con importes como 3 × $333.33, abonos de $0.01, un pago anulado y un apartado cancelado). Total, pagado y saldo coinciden al centavo con cuentas hechas aparte. El propietario revisó con calculadora 3 de ellas (un apartado y dos encargos, uno con pago anulado) y coinciden | SC-005 | Sí |

## Prueba con personas (SC-009)

Meta: 9 de cada 10 personas que usan el catálogo por primera vez en su móvil filtran por categoría y encuentran un producto sin ayuda. Se hace en `app.cristobalia.com`.

| Fecha | Personas | Encontraron el producto sin ayuda | Notas |
|---|---|---|---|
| 2026-11-03 | 4 | 4 | Tardaron un poco, pero todas lo encontraron. El propietario propone un buscador de productos para una spec nueva |

- **Pendiente**: 6 personas más para completar 10.
