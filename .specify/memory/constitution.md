<!--
SYNC IMPACT REPORT
- Cambio de versión: 1.0.0 → 1.1.0
- Motivo de la enmienda: el negocio puede operar con más de un vendedor; aprobada por el responsable del proyecto
- Secciones modificadas: introducción y Alcance del producto ("vendedor principal" → "vendedor")
- Principios modificados: ninguno
- Historial: sin versión (plantilla) → 1.0.0, ratificación inicial
- Principios añadidos:
  I. Spec First
  II. Los números no admiten creatividad
  III. Idioma y mercado
  IV. Cero alcance fantasma
  V. Los tests acompañan a la spec
  VI. Verificable por una persona no técnica
  VII. Interfaz clara, moderna y accesible
- Secciones añadidas: Alcance del producto, Flujo de desarrollo, Governance
- Secciones eliminadas: ninguna
- Plantillas: no modificadas (leen la constitución en tiempo de ejecución)
- TODO diferidos: crear specs/MAPA.md con la primera spec (el Principio I lo exige)
-->

# VendeProductos Constitution

**VendeProductos** es la herramienta web de **Productos Eli's**, un negocio que va comenzando y que
vende juguetes, ropa y otros artículos. La página muestra el catálogo para no tener que cargar con
todo el producto: los clientes lo consultan por su cuenta y usan un contacto telefónico para pedir
más información, hacer un apartado o solicitar la compra. El vendedor, que puede ser el dueño o cualquier persona autorizada, administra los
artículos en venta.

## Core Principles

### I. Spec First

- Todo comportamiento observable MUST nacer de una spec aprobada en `specs/`.
- Todo cambio de comportamiento MUST empezar corrigiendo o creando su spec, antes de tocar el código.
- La propiedad de cada spec MUST constar en `specs/MAPA.md`, con exactamente un propietario por spec.

**Razón**: la spec es la única fuente de verdad; sin un propietario único, nadie responde por ella.

### II. Los números no admiten creatividad

- Todos los importes MUST cuadrar al centavo, siempre, en todo lugar donde aparezcan.
- Los importes MUST calcularse y guardarse con aritmética exacta; se prohíbe el redondeo implícito.
- Los precios MUST mostrarse con símbolo, separador de miles y dos decimales, por ejemplo
  `$1,250.00 MXN`.
- Toda fecha MUST mostrarse con el mes escrito y el año completo, por ejemplo
  `31 de octubre de 2026`; se prohíben formatos numéricos ambiguos como `03/04/26`.
- Toda hora MUST indicar si es a. m. o p. m. y su zona horaria.

**Razón**: un precio o una fecha dudosos cuestan dinero y la confianza del cliente.

### III. Idioma y mercado

- Todo el producto MUST estar en español de México: textos, mensajes de error y notificaciones.
- La única moneda MUST ser el peso mexicano (MXN).

**Razón**: los clientes y el vendedor son de este mercado y no deben traducir ni convertir nada.

### IV. Cero alcance fantasma

- MUST NOT implementarse ninguna funcionalidad que no esté escrita en la spec.
- Si surge una idea nueva, MUST proponerse y esperar su aprobación; no se construye mientras tanto.

**Razón**: el negocio va comenzando; cada función no pedida es costo y riesgo sin valor demostrado.

### V. Los tests acompañan a la spec

- Cada regla de negocio y cada criterio de aceptación relevante MUST tener un test que los referencie.
- La suite en verde MUST ser condición de merge, sin excepciones.

**Razón**: sin tests trazables a la spec, nada demuestra que el producto la cumple.

### VI. Verificable por una persona no técnica

- Cada criterio de éxito MUST poder comprobarse usando la app, sin leer código.
- Un criterio que solo pueda comprobarse con herramientas técnicas MUST reescribirse antes de
  aprobar la spec.

**Razón**: quien opera el negocio debe poder confirmar por sí mismo que la app hace lo acordado.

### VII. Interfaz clara, moderna y accesible

- El vendedor y el cliente MUST poder usar la interfaz sin formación y sin manual.
- La interfaz MUST ser accesible: texto legible con buen contraste, controles con etiqueta clara e
  imágenes con texto alternativo.
- El alta y la administración de productos MUST funcionar en portátil y en móvil.
- El catálogo MUST funcionar en el móvil de cualquier cliente que acceda a la página.
- La tecnología de la interfaz se decide en el plan, no en la constitución ni en las specs.

**Razón**: la mayoría de los clientes llegará desde el móvil y nadie estará ahí para explicarles.

## Alcance del producto

- **Cliente**: consulta el catálogo y usa el contacto telefónico publicado para pedir más
  información, hacer un apartado o solicitar la compra.
- **Vendedor**: administra los artículos en venta. Las funciones de administración MUST
  estar restringidas a quienes tengan el acceso de administrador.
- La página muestra el catálogo y conecta con el vendedor; cualquier capacidad adicional, como el
  cobro en línea, queda fuera hasta que exista una spec aprobada (Principio IV).

## Flujo de desarrollo

1. Se escribe o corrige la spec en `specs/` y se registra su propietario en `specs/MAPA.md`.
2. El propietario aprueba la spec; sus criterios de éxito cumplen el Principio VI.
3. El plan decide la tecnología y confirma el cumplimiento de esta constitución.
4. Se implementa solo lo escrito en la spec, con tests que referencian sus reglas y criterios.
5. El merge requiere la suite en verde y la comprobación de los criterios de éxito usando la app.

## Governance

- Esta constitución prevalece sobre cualquier otra práctica del proyecto.
- Toda enmienda MUST documentarse en este archivo, explicar su motivo y contar con la aprobación del
  responsable del proyecto.
- El versionado sigue SemVer: MAJOR para eliminar o redefinir principios de forma incompatible, MINOR
  para añadir principios o secciones o ampliarlos materialmente, y PATCH para aclaraciones de redacción.
- Cada spec, plan y revisión MUST verificar el cumplimiento de estos principios. Si hay conflicto,
  se corrige el artefacto o se enmienda la constitución; no se ignora.

**Version**: 1.1.0 | **Ratified**: 2026-10-31 | **Last Amended**: 2026-10-31
