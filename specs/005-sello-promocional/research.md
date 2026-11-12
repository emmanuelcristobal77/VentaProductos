# Research: Sello promocional

**Feature**: [spec.md](spec.md) | **Fecha**: 2026-11-11

La spec no deja preguntas abiertas. Este documento registra las decisiones técnicas del plan.

## 1. Dónde se guarda el sello

- **Decision**: una tabla nueva, `sello_promocional`, con **una sola fila** (`id = 1`, forzado con `CHECK`). Tiene `texto`, `color`, `activo` y `actualizado_en`. La migración `0003` solo crea la tabla y no inserta nada: mientras no exista la fila, el sello vale «desactivado, sin texto, Rojo» (caso «Primera vez» de la spec). Al guardar se hace un *upsert* sobre `id = 1`.
- **Rationale**: la spec define un solo sello para todo el negocio, sin historial (entidad Sello promocional). Una fila fija se lee con una consulta por llave primaria y no necesita reglas para elegir «el sello vigente». Crear una tabla no reconstruye ninguna tabla existente, así que no toca productos, operaciones ni pagos, y el respaldo diario la incluye sin cambios.
- **Alternatives considered**:
  - Una tabla genérica de ajustes de clave y valor: no hay otros ajustes que guardar, y con ella se pierden los `CHECK` de color y de longitud (Principio IV).
  - Variables de entorno: el vendedor no podría cambiar el sello desde el panel (FR-002).
  - Un archivo JSON en `/datos`: quedaría fuera de la base y del respaldo de la base.

## 2. Cómo se cuentan los 40 caracteres

- **Decision**: se cuentan los **caracteres que ve una persona**, con `Intl.Segmenter` en modo `grapheme`. Así, «ñ», «á» o un emoji cuentan como 1. Antes de contar, el texto se normaliza a NFC y se le quitan los espacios del principio y del final. El mismo cálculo, en `src/dominio/promocion.ts`, lo usan el contador del formulario y la validación del servidor. El campo es de una sola línea.
- **Rationale**: FR-004 habla de caracteres y el vendedor ve caracteres, no unidades de código. Con `string.length`, un emoji contaría 2 o más y el contador no coincidiría con lo que se ve. `Intl.Segmenter` existe en Node 24 y en los navegadores actuales.
- **Tope de bytes**: la base y `validarSello` limitan el texto a 400 bytes en UTF-8 ([data-model.md](data-model.md)). Un texto que pasa de ese tope se rechaza con el mismo mensaje de los 40 caracteres.
- **Alternatives considered**: el atributo `maxLength` del campo cuenta unidades UTF-16, no caracteres visibles: con 40 banderas (4 unidades cada una) el navegador no dejaría escribir ni la mitad. Por eso el campo no lleva `maxLength`; la regla la dan el contador y la validación del servidor.

## 3. Los colores

- **Decision**: cuatro colores fijos, en este orden, cada uno con un fondo y un color de texto ya probados:

  | Clave | Nombre | Fondo | Texto | Contraste aproximado | Texto de ejemplo | Contraste aproximado |
  |---|---|---|---|---|---|---|
  | `rojo` | Rojo | `#B42318` | `#FFFFFF` | 6.6 : 1 | `#FDE2DF` | 5.4 : 1 |
  | `verde` | Verde | `#1F6F43` | `#FFFFFF` | 6.1 : 1 | `#D3F0DF` | 5.1 : 1 |
  | `dorado` | Dorado | `#F2C14E` | `#3B2A12` | 8.2 : 1 | `#5C4318` | 5.5 : 1 |
  | `azul` | Azul | `#1E4FA3` | `#FFFFFF` | 7.8 : 1 | `#DCE6F9` | 6.2 : 1 |

  El **texto de ejemplo** es el color de «Escribe el texto del sello» en la vista previa cuando no hay texto. Es un color fijo y no una opacidad, para que su contraste se pueda probar.

  La base guarda la clave (`CHECK color IN (...)`), y los valores de color viven en `src/dominio/promocion.ts`. Una prueba unitaria calcula el contraste de cada par, incluido el del texto de ejemplo, y exige al menos 4.5 : 1 (WCAG AA). axe lo vuelve a revisar en el navegador.
- **Rationale**: FR-005 y FR-014. El dorado lleva texto oscuro porque, con texto blanco, no llega a 4.5 : 1.
- **Alternatives considered**: cualquier color (opción C de la aclaración), que el propietario descartó.

## 4. Modo claro y modo oscuro

- **Decision**: la app solo tiene tema claro ([research 001](../001-catalogo-ventas-apartados/research.md), «Tema claro únicamente»). La franja usa sus propios colores de fondo y de texto, sin depender del tema. Así, con el celular en modo oscuro la página se sigue viendo clara y la franja conserva su contraste. FR-014 y SC-005 se comprueban abriendo la página con el celular en modo claro y en modo oscuro.
- **Rationale**: no hace falta crear un modo oscuro para cumplir la spec, y crearlo sería alcance fantasma (Principio IV).
- **Riesgo**: algunos navegadores, como Samsung Internet con su «modo oscuro forzado», recolorean las páginas por su cuenta. Eso no se controla desde la app. Como los cuatro pares tienen mucho contraste, el texto sigue leyéndose. El quickstart lo revisa en un celular real.

## 5. Dónde aparece la franja y cómo se actualiza

- **Decision**: la franja se dibuja en `src/app/(cliente)/layout.tsx`, justo debajo del `<header>`, a todo lo ancho y **sin quedar fija** al desplazarse. El layout lee el sello en cada petición, con una consulta por llave primaria. Todas las páginas de cliente ya son `force-dynamic`, y el layout también lo declara. Al guardar, la acción llama a `revalidatePath("/", "layout")`, igual que categorías (FR-010).
- **Rationale**: FR-009 pide la franja en todas las páginas de cliente, y el layout es el único lugar común. Si quedara fija, se sumaría al encabezado, que ya es fijo, y quitaría alto de pantalla en el celular. Como no es fija, nunca tapa productos (FR-011). Leer una fila de SQLite en el mismo servidor no afecta el LCP de la spec 002.
- **Accesibilidad**: es un `<div>` con un `<p>` de texto normal. No es un enlace ni un botón y no tiene acción (aclaración del 2026-11-11). No usa `role="alert"`: no es un aviso urgente y no debe interrumpir al lector de pantalla. El texto se centra, se parte en dos líneas si hace falta (`break-words`) y mide al menos 14 px.
- **Texto seguro**: React escapa el texto. No se usa `dangerouslySetInnerHTML` (FR-012).

## 6. La sección «Promoción» en el panel

- **Decision**: la página `/admin/promocion`, dentro de `admin/(panel)`, que `proxy.ts` y el layout ya protegen. Tiene un formulario con:
  - el campo «Texto del sello», con contador «Te quedan N caracteres» en `aria-live="polite"`;
  - un grupo de radios nativos «Color», con el nombre escrito y la muestra de color de cada opción (FR-005);
  - una casilla nativa «Mostrar el sello en la página»;
  - la vista previa, con el mismo componente que usa la sección de cliente (FR-006);
  - el botón «Guardar».

  El formulario se envía a la acción de servidor `guardarPromocion` con `useActionState`, igual que las demás acciones del panel.
- **Rationale**: es el patrón que ya usan categorías y productos: `exigirSesion()`, `ejecutar()` y `Resultado`. La vista previa reutiliza el componente de la franja, así que se ve igual que en la página.
- **Alternatives considered**: un interruptor tipo *switch* de Radix. La casilla nativa es más sencilla, tiene etiqueta clara y no necesita otro componente.

## 7. El enlace «Promoción» en la navegación del panel

- **Decision**:
  - **Portátil (`md` en adelante)**: «Promoción» se agrega como sexto enlace de la navegación superior, con el icono `Megaphone`.
  - **Celular**: la barra inferior se queda con sus 5 enlaces, y «Promoción» aparece en el encabezado como botón con icono y texto, junto a «Salir». Para que quepa, el subtítulo «Administración» del encabezado solo se muestra de `sm` en adelante.
- **Rationale**: FR-001 pide el enlace en la navegación del panel. A 390 px, la barra inferior da unos 75 px por enlace con 5 enlaces, y con 6 bajaría a unos 62 px, menos de lo que ocupa «Operaciones». Las etiquetas se encimarían. En el encabezado sobra espacio si se oculta el subtítulo.
- **Alternatives considered**:
  - Un sexto enlace en la barra inferior: las etiquetas no caben.
  - Un menú «Más»: cambia cómo se llega a secciones que ya existen y retrasa la entrega.
  - Solo un botón en la página de productos: no está en la navegación.
- **Riesgo conocido**: entre 768 px y 1,024 px, la navegación superior ya estaba justa con 5 enlaces y con 6 lo está más. La prueba e2e usa 390 px y 1,366 px; el quickstart revisa además una tableta. Si se enciman, el arreglo es mostrar solo iconos en ese rango. Es un cambio de diseño que no cambia comportamiento.

## 8. Pruebas

- **Decision**:
  - **Unitarias** (`tests/unit/promocion.test.ts`): normalización y conteo con acentos, «ñ» y emojis, límite de 40, texto vacío o con solo espacios, colores válidos y su orden, y contraste ≥ 4.5 : 1 de cada par (FR-003 a FR-005, FR-014).
  - **Integración** (`tests/integration/promocion.test.ts`, `migracion-0003.test.ts`): estado de primera vez, activar, desactivar conservando el texto y el color, desactivar con el texto vacío, rechazo sin sesión, y que los precios del catálogo no cambian (FR-002, FR-003, FR-007, FR-013). La migración crea la tabla sin tocar las demás.
  - **e2e con axe en móvil y portátil** (`us16-sello-promocional.spec.ts`, `us17-cambiar-sello.spec.ts`): las historias 1 y 2, la franja en el catálogo, una página de producto, «Mis apartados» y el aviso de privacidad, el texto con caracteres especiales, la vista previa, el contador, cada uno de los 4 colores revisado con axe, y que el encabezado del panel no se encime a 390 px.
- **Rationale**: Principio V. La numeración e2e sigue a la de la spec 004 (`us13` a `us15`).

## 9. Notas de implementación

Lectura de las guías de Next.js 16.4 instaladas (`node_modules/next/dist/docs/`), hecha el 2026-11-11 antes de escribir código (AGENTS.md):

- **`useActionState`** (`01-getting-started/07-mutating-data.md`): devuelve `[estado, accion, pendiente]` y recibe la acción de servidor con la firma `(estadoAnterior, formData)`. Es el patrón que ya usan categorías y productos; no hay diferencia con el plan.
- **`revalidatePath("/", "layout")`** (`03-api-reference/04-functions/revalidatePath.md`, sección «Revalidating all data»): vacía la caché del cliente e invalida todo lo que esté en caché para la siguiente visita. Coincide con el plan.
- **`export const dynamic = "force-dynamic"` en un layout** (`02-guides/caching-without-cache-components.md`): la opción se puede declarar en `layout.tsx`, `page.tsx` o `route.ts` y obliga a dibujar en cada petición. El proyecto no usa `cacheComponents`, así que la opción sigue vigente. Sin diferencias con el plan.
- **La franja es un `<aside aria-label="Promoción">`**, no un `<div>` (cambio encontrado al correr T017). Entre `<header>` y `<main>`, un `<div>` queda fuera de todo landmark y axe lo marca con la regla `region`. El `<aside>` no lleva `role`, no es enlace ni botón y no interrumpe al lector de pantalla, así que se mantiene lo que pide research 5. En la vista previa del panel, que está dentro de `<main>`, sigue siendo `<div>`, porque un `<aside>` dentro de `<main>` falla la regla `landmark-complementary-is-top-level`.
- **La revisión de axe de `/admin/promocion` va en una prueba aparte** dentro de `tests/e2e/accesibilidad-admin.spec.ts` (T010): agregada a la lista de rutas de la prueba existente, esa prueba pasaba del tiempo límite de 45 s en móvil.
