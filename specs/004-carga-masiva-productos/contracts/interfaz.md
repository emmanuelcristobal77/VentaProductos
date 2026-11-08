# Contrato: pantalla, ruta de carga y acción de confirmación

**Feature**: [spec.md](../spec.md) | **Fecha**: 2026-11-07

La ruta y la acción responden con el formato `Resultado` de la spec 001 ([acciones de la 001](../../001-catalogo-ventas-apartados/contracts/acciones.md)): `{ ok: true, datos }` o `{ ok: false, codigo, mensaje, campos? }`. Las dos exigen sesión con `exigirSesion()` antes de leer nada (FR-001).

## Entrada desde la lista de productos

En `/admin`, junto a «Nuevo producto», un botón secundario «Carga masiva» que lleva a `/admin/productos/carga-masiva`.

## Página `GET /admin/productos/carga-masiva`

- Dentro de `admin/(panel)`. Sin sesión, `proxy.ts` redirige a `/admin/entrar` (US1-7).
- Título: «Carga masiva | Productos Eli's»; encabezado `h1` «Carga masiva de productos».

### Estado «Subir»

En este orden:

1. Instrucciones breves: qué lleva el comprimido, los límites «Hasta 200 productos y un comprimido de hasta 50 MB» (FR-002) y que las fotos deben ser JPEG, PNG o WebP de hasta 10 MB.
2. La lista de columnas en orden, con su formato ([archivo-carga.md](archivo-carga.md#archivo-de-productos)), y un renglón de ejemplo en un bloque de texto que se puede copiar (FR-004).
3. Enlace «Descargar archivo de ejemplo» → `ejemplo-carga-masiva.txt` (FR-004).
4. Campo de archivo con la etiqueta «Comprimido .zip con productos y fotos» (`accept=".zip,application/zip"`) y el botón «Subir y procesar».
5. Región `aria-live="polite"` con «Subiendo… N %» y luego «Procesando los productos…». El botón queda deshabilitado mientras tanto.

Si la carga se rechaza completa, el mensaje aparece debajo del campo, asociado con `aria-describedby`, y no se pasa al resumen (US1-6).

### Estado «Resumen»

1. «Carga del 7 de noviembre de 2026, 4:35 p. m., hora del centro de México» (FR-021).
2. Seis cantidades (FR-013): «Productos nuevos», «Nuevos sin foto», «Ya existen con cambios», «Sin cambios», «Renglones rechazados» y «Fotos no usadas».
3. Si no hay sin foto, existentes con cambios ni rechazados: «No hay nada que revisar.», sin botón de reporte (US4-5).
4. Botón «Descargar reporte» si hay algo que revisar (FR-018).
5. Sección `h2` «Productos nuevos sin foto»: por renglón, el número, el nombre y el motivo.
6. Sección `h2` «Productos que ya existen» (FR-014, FR-015):
   - por producto, una tarjeta con una casilla «Actualizar «Nombre»» y una tabla «Dato | Ahora | En el archivo»;
   - los datos que cambian llevan el texto «Cambia» y un resaltado;
   - importes con `formatearPrecio`, y las fotos nuevas como miniaturas con texto alternativo «Foto nueva N de Nombre»;
   - si la existencia del archivo es menor que las unidades apartadas del producto, la tarjeta lo advierte («Tiene N apartadas; no se podrá actualizar»), y la casilla se puede marcar de todos modos;
   - botones «Marcar todos», «Desmarcar todos» y «Actualizar marcados (N)».
   - Al confirmar, sin importar cuántos haya marcados (aun cero), cada tarjeta muestra su resultado: «Actualizado», «No actualizado» o «No se pudo actualizar: motivo». Las casillas y el botón quedan deshabilitados, y un aviso dice «Se actualizaron N productos.» (con uno: «Se actualizó 1 producto.»; con cero: «No se actualizó ningún producto.»).
7. Sección `h2` «Renglones rechazados»: número, nombre (si hay) y motivo.
8. Sección `h2` «Avisos de fotos»: por producto, las fotos que faltaron (US2-4).
9. Botones «Hacer otra carga» y «Ir a productos».

Si hay existentes sin confirmar y el administrador intenta salir, `beforeunload` le pide confirmar. Si sale, nada cambia (US3-9).

En móvil, las tarjetas van en una sola columna y ninguna tabla obliga a desplazarse hacia los lados (SC-008).

## Ruta `POST /api/admin/cargas`

| Aspecto | Valor |
|---|---|
| Cuerpo | El comprimido en binario (`Content-Type: application/zip`) |
| Sesión | Sin sesión → 401 `NO_AUTORIZADO`, sin leer el cuerpo |
| Tamaño | Más de 50 MB → 413 `DATOS_INVALIDOS` con el mensaje del límite |
| Rechazo completo | 400 `DATOS_INVALIDOS` con el mensaje de [archivo-carga.md](archivo-carga.md#rechazos-de-toda-la-carga) |
| Éxito | 200 con `{ ok: true, datos: ResumenCarga }` y `Cache-Control: no-store` |

`ResumenCarga`, en TypeScript (definido en `src/dominio/carga-masiva.ts`):

```ts
type Campos = string[]; // los del renglón, recortados

interface ResumenCarga {
  fecha: string; // ISO
  cantidades: {
    nuevos: number; sinFoto: number; existentes: number;
    sinCambios: number; rechazados: number; fotosNoUsadas: number;
  };
  sinFoto: { numero: number; campos: Campos; motivo: string }[];
  rechazados: { numero: number; campos: Campos; motivo: string }[];
  existentes: ExistenteConCambios[];
  avisosFotos: { numero: number; nombre: string; avisos: string[] }[];
}

interface DatosComparables {
  nombre: string; descripcion: string; categoria: string; subcategoria: string | null;
  existencia: number; precioCompraCentavos: number; precioVentaCentavos: number;
}

interface ExistenteConCambios {
  numero: number;
  campos: Campos;
  productoId: string;
  actual: DatosComparables & { apartadas: number; fotos: string[] }; // fotos: archivos activos
  archivo: DatosComparables;
  cambios: ("nombre" | "descripcion" | "categoria" | "subcategoria" | "existencia"
    | "precioCompra" | "precioVenta" | "fotos")[];
  fotosNuevas: { archivo: string; nombreOriginal: string }[];
  fotosFaltantes: string[];
}
```

Los productos nuevos se registran dentro de esta petición; al responder, ya están en la lista del panel y en el catálogo (`revalidatePath("/", "layout")`).

## Acción `confirmarActualizaciones(marcados)`

En `src/acciones/carga-masiva.ts`.

```ts
confirmarActualizaciones(marcados: {
  productoId: string;
  campos: string[];
  fotosNuevas: { archivo: string; nombreOriginal: string }[];
}[]): Promise<Resultado<{
  resultados: ({ productoId: string; ok: true } | { productoId: string; ok: false; motivo: string })[];
}>>
```

- Valida la entrada con Zod: hasta 200 elementos, `archivo` con el patrón `UUID.(jpg|png|webp)`.
- Por cada elemento, en su propia transacción `IMMEDIATE`, aplica los pasos de [research 7](../research.md#7-comparación-y-confirmación-de-los-existentes). Un error de un producto no detiene a los demás (FR-017).
- Motivos de error por producto:
  - «La existencia no puede ser menor a las unidades apartadas.» (`EXISTENCIA_INSUFICIENTE`)
  - «El producto ya no está activo.»
  - «El nombre ya no corresponde a un solo producto.»
  - «Las fotos nuevas ya no están disponibles; vuelve a subir el comprimido.», si un archivo de foto no cumple el patrón o no existe;
  - el motivo de validación del renglón, si alguien lo alteró;
  - «"Todos" está reservado para el filtro; elige otro nombre.»
- Las fotos que ya tienen ese `nombre_original` en el producto se omiten sin error.
- Al terminar, llama a `revalidatePath("/", "layout")` una sola vez.
- Con cero elementos, responde `{ ok: true, datos: { resultados: [] } }` sin tocar la base (US3-9).
