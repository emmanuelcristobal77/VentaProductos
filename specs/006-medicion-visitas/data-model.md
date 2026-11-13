# Data Model: Medición de visitas

**Feature**: [spec.md](spec.md) | **Fecha**: 2026-11-12

## Base de datos de la app

**Sin cambios.** No hay tablas, columnas ni migraciones nuevas. Las visitas y los eventos de interés nunca se guardan en la base SQLite de la app ni en sus respaldos (Key Entities de la spec).

## Datos que guarda el servicio de estadísticas

Los guarda Umami en su propia base PostgreSQL (`umami-db`), en el mismo servidor. La app no los lee ni los escribe directamente; solo los envía por el script ([contracts/interfaz.md](contracts/interfaz.md)).

### Visita (entidad «Visita» de la spec)

| Dato | Origen | Notas |
|---|---|---|
| Página vista | URL con su consulta | Incluye `?categoria=`, `?subcategoria=` y `utm_*` (FR-001) |
| Sitio de origen | Referente del navegador | Por ejemplo, Facebook |
| Etiquetas de origen | `utm_source`, `utm_campaign`, etc. de la URL | Las pone el propietario en los enlaces que comparte (US2) |
| País, región y ciudad aproximados | Calculados por Umami desde la IP al recibir la visita | La IP no se guarda (FR-004) |
| Tipo de dispositivo, sistema, navegador, idioma y tamaño de pantalla | Script | — |
| Sesión | Identificador anónimo calculado por Umami | Sin cookies; no identifica a la persona |

### Evento de interés (entidad «Evento de interés» de la spec)

| Dato | Valor |
|---|---|
| Nombre | `interes-telefono` |
| `pagina` | Ruta desde la que se tocó el teléfono |
| `producto` | Nombre del producto o artículo, solo si se tocó desde su página o tarjeta |

Además, cada evento lleva los mismos datos anónimos de la visita en la que ocurre.

## Lo que nunca se envía

Nombres y teléfonos de clientes, lo que se escribe en el buscador o en «Mis apartados», cualquier página de `/admin` y la dirección IP como dato guardado (FR-004, FR-002).
