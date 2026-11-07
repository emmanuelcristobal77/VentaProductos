# Implementation Plan: Carga masiva de productos

**Branch**: `004-carga-masiva-productos` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-carga-masiva-productos/spec.md`

## Summary

La spec agrega una segunda forma de dar de alta y de actualizar productos, solo en el panel:

- **Pantalla «Carga masiva»**: `/admin/productos/carga-masiva`, enlazada junto a «Nuevo producto». Muestra las columnas, los límites, un renglón de ejemplo y el archivo de ejemplo descargable (FR-002, FR-004).
- **Procesamiento**: el comprimido se sube completo a una ruta nueva, `POST /api/admin/cargas`, con el cuerpo binario, igual que `POST /api/fotos`. Una acción de servidor no sirve aquí porque su límite es de 1 MB. El servidor lee el .zip con `fflate` y valida cada renglón con las reglas del alta individual. Da de alta los nuevos con foto, **cada uno en su propia transacción**, y devuelve el resumen en JSON. No guarda la carga en la base (supuesto «No se guarda un historial»).
- **Productos que ya existen**: la respuesta trae, por producto, sus datos actuales, los del archivo y las fotos nuevas, que ya quedaron guardadas en disco. El navegador conserva ese resumen. Al confirmar, una acción de servidor recibe los renglones marcados, **los vuelve a validar** y actualiza cada producto en su propia transacción. Las fotos se agregan sin quitar ninguna.
- **Reporte**: se arma en el navegador a partir del resumen, como .txt UTF-8 con BOM, separado por «|», con las columnas de FR-003 primero y las del reporte al final. Así puede descargarse antes y después de confirmar (FR-018 a FR-020).
- **Datos**: la migración `0002` agrega a `fotos` una columna nula, `nombre_original`, con el nombre de archivo normalizado que traía el comprimido. Con ella se sabe si una foto ya se había cargado para ese producto (FR-016, entidad Foto). No reconstruye ninguna tabla.

El detalle de las decisiones está en [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 sobre Node.js 24, igual que las specs anteriores

**Primary Dependencies**: las de la spec 001 (Next.js 16.4, React 19.3, Tailwind CSS 4.3, shadcn/ui, Drizzle ORM 0.45, `better-sqlite3` 13, Zod 4, `sharp` 0.35). Se agrega una dependencia, **`fflate` 0.8.3**, para leer el .zip ([research 1](research.md#1-lectura-del-comprimido))

**Storage**: SQLite existente y la carpeta `fotos/` del volumen. Migración `0002`: `ALTER TABLE fotos ADD COLUMN nombre_original text` y un índice único parcial por producto y nombre original ([data-model.md](data-model.md))

**Testing**: Vitest 5 para el lector del archivo, la validación de renglones, el procesamiento y la confirmación contra SQLite temporal, con comprimidos armados en la prueba con `fflate`. Playwright 1.64 con axe para los flujos en móvil y portátil

**Target Platform**: navegadores móviles y de portátil actuales; mismo servicio de Easypanel

**Project Type**: aplicación web de un solo proyecto

**Performance Goals**: una carga de 50 productos con sus fotos se procesa en menos de 30 s en el servidor de producción. Así cabe de sobra en los 10 minutos de SC-001, que también cuentan la subida desde el celular

**Constraints**:
- 50 MB por comprimido y 200 renglones de producto; se revisan antes de procesar (FR-002).
- Cada foto, de hasta 10 MB y en JPEG, PNG o WebP, igual que el alta individual (FR-005).
- Protección contra comprimidos que crecen demasiado al descomprimirse ([research 2](research.md#2-límites-y-protección-del-servidor)).
- Importes exactos en centavos enteros (Principio II).
- Todo en es-MX.

**Scale/Scope**: una pantalla nueva con su resumen, una ruta nueva, una acción nueva, un módulo de carga en `src/servicios/carga-masiva/` y una migración de una columna. El catálogo actual tiene decenas de productos; una carga, hasta 200

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Inicial | Post-diseño |
|---|---|---|---|
| I. Spec First | Spec 004 aprobada el 2026-11-07 y registrada en `specs/MAPA.md` con un propietario. Las specs 001 a 003 no se modifican | PASS | PASS |
| II. Números | Los importes del archivo se leen con un validador estricto que los convierte a centavos enteros sin pasar por flotantes. Las comparaciones de «Sin cambios» se hacen en centavos, y en pantalla se usan `formatearPrecio`, `formatearFecha` y `formatearHora` ([research 5](research.md#5-validación-de-cada-renglón)) | PASS | PASS |
| III. Idioma y mercado | Mensajes, motivos, encabezados del reporte y pantalla en es-MX ([contracts/archivo-carga.md](contracts/archivo-carga.md)) | PASS | PASS |
| IV. Cero alcance fantasma | Sin historial de cargas, sin artículos por encargo, sin bajas, sin quitar fotos y sin reactivar productos dados de baja. La única guía adicional es la del formato que pide FR-004 | PASS | PASS |
| V. Tests con la spec | Pruebas nombradas por FR, SC o escenario. Las pruebas de la spec 001 no cambian, porque `crearProducto` y `actualizarProducto` conservan su comportamiento | PASS | PASS |
| VI. Verificable sin técnica | [quickstart.md](quickstart.md) comprueba cada criterio con comprimidos de prueba hechos con el Explorador de Windows y el Bloc de notas | PASS | PASS |
| VII. Interfaz accesible | Campo de archivo nativo con etiqueta, progreso anunciado con `aria-live`, tablas con encabezados y cambios resaltados con texto y no solo con color, casillas nativas con etiqueta por producto, axe en móvil y portátil | PASS | PASS |

## Project Structure

### Documentation (this feature)

```text
specs/004-carga-masiva-productos/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── archivo-carga.md      # Formato del .txt, del comprimido y del reporte
│   └── interfaz.md           # Pantalla, ruta POST /api/admin/cargas y acción de confirmación
├── checklists/
│   └── requirements.md
└── tasks.md                  # Lo genera /speckit-tasks
```

### Source Code (repository root)

Solo se listan los archivos nuevos o que cambian.

```text
src/
├── app/
│   ├── admin/(panel)/
│   │   ├── page.tsx                              # Botón «Carga masiva» junto a «Nuevo producto»
│   │   └── productos/carga-masiva/page.tsx       # Pantalla de carga y resumen
│   └── api/admin/cargas/route.ts                 # POST: recibe el .zip y devuelve el resumen
├── acciones/carga-masiva.ts                      # confirmarActualizaciones
├── components/admin/
│   ├── cargador-masivo.tsx                       # Instrucciones, ejemplo, archivo y progreso
│   ├── resumen-carga.tsx                         # Cantidades, sin foto, rechazados y avisos
│   └── lista-existentes.tsx                      # Comparación, casillas y confirmación
├── db/
│   ├── esquema.ts                                # fotos.nombreOriginal
│   └── migraciones/0002_*.sql                    # ADD COLUMN e índice único parcial, generada
├── dominio/
│   ├── dinero.ts                                 # parsearImporteArchivo (sin símbolo ni miles)
│   └── carga-masiva.ts                           # Columnas, validar renglón, comparar, reporte
└── servicios/
    ├── productos.ts                              # Exporta columnas; crearProducto acepta nombres originales
    ├── fotos.ts                                  # nombre_original al insertar; agregarFotosNuevas
    └── carga-masiva/
        ├── comprimido.ts                         # Leer el .zip, nombres, carpetas y límites
        ├── procesar.ts                           # Clasificar renglones y dar de alta los nuevos
        └── confirmar.ts                          # Actualizar los existentes marcados

tests/
├── unit/
│   ├── carga-masiva-renglones.test.ts            # FR-003, FR-006, casos límite de importes y columnas
│   ├── carga-masiva-reporte.test.ts              # FR-019, FR-020, US4
│   └── dinero.test.ts                            # Casos nuevos de parsearImporteArchivo
├── integration/
│   ├── carga-masiva-comprimido.test.ts           # FR-002, carpetas, mayúsculas, __MACOSX, límites
│   ├── carga-masiva-alta.test.ts                 # US1, US2, FR-007–FR-011, FR-013, SC-002, SC-003
│   ├── carga-masiva-existentes.test.ts           # US3, FR-012, FR-014–FR-017, SC-004, SC-005
│   └── migracion-0002.test.ts                    # Columna nueva sin perder fotos
├── fixtures/carga-masiva/                        # Fotos pequeñas para armar los comprimidos
└── e2e/
    ├── us13-carga-masiva.spec.ts                 # Historias 1 y 2 de la spec 004, con axe
    ├── us14-existentes.spec.ts                   # Historia 3 de la spec 004
    └── us15-reporte-carga.spec.ts                # Historia 4 de la spec 004
```

**Structure Decision**: se mantiene el proyecto único de la spec 001.

- **Reglas puras** en `src/dominio/carga-masiva.ts`: columnas, validación de un renglón, comparación con los datos actuales y armado del reporte. No tocan la base ni el disco, así que el navegador y el servidor usan las mismas.
- **Servicios** en `src/servicios/carga-masiva/`: leen el comprimido, consultan y escriben en la base, y reutilizan `resolverCategoria`, `resolverSubcategoria`, `columnas` y `unidadesApartadas`. Así las reglas del alta y la edición individuales son las mismas, sin copiarlas.
- **Acceso**: la página vive en `admin/(panel)`, que `proxy.ts` y el layout ya protegen. La ruta `/api/admin/cargas` y la acción llaman a `exigirSesion()` antes de leer el cuerpo (FR-001).
- **Numeración de las pruebas e2e**: sigue la de las specs anteriores; `us13` a `us15` son las historias de la spec 004.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El Explorador de Windows guarda los nombres con «ñ» o acentos en la página de códigos 850 y no en UTF-8, y las fotos no se encuentran | Los nombres sin la marca UTF-8 del .zip se decodifican como CP850 ([research 3](research.md#3-nombres-de-archivo-dentro-del-comprimido)). Hay una prueba con un comprimido hecho con el Explorador y el ejemplo usa nombres sin acentos |
| Un comprimido pequeño que al descomprimirse ocupa gigabytes satura la memoria | Solo se descomprimen el .txt y las fotos que mencionan los renglones. Antes de descomprimir se revisa el tamaño declarado de cada entrada contra los límites, y después se revisa el real ([research 2](research.md#2-límites-y-protección-del-servidor)) |
| El administrador manipula en el navegador los datos que se confirman | La acción vuelve a validar cada renglón con las mismas reglas, comprueba que el nombre sigue correspondiendo al producto y solo acepta fotos con nombre UUID que existan en la carpeta ([research 7](research.md#7-confirmación-de-los-existentes)) |
| Quedan fotos en disco de productos existentes que nunca se confirmaron | Igual que hoy con `POST /api/fotos` cuando no se guarda el formulario: no se ven en ningún lado, el respaldo diario solo copia la base y ocupan poco. Se registra como deuda conocida |
| La subida de 50 MB desde el celular tarda y parece colgada | Barra de progreso de subida con `XMLHttpRequest` y un mensaje «Procesando…» mientras el servidor trabaja ([research 8](research.md#8-subida-desde-el-navegador)) |
| Easypanel o su proxy limitan el tamaño del cuerpo | El proxy de Easypanel no trae un límite por omisión. Por ahora las cargas serán chicas, así que la prueba con un comprimido de cerca de 50 MB en producción (paso 24 del quickstart) se hace antes de la primera carga grande y no bloquea el cierre de la spec (decisión del propietario, 2026-11-07) |

## Complexity Tracking

Sin violaciones de la constitución que justificar. La dependencia nueva (`fflate`) se justifica en [research 1](research.md#1-lectura-del-comprimido).
