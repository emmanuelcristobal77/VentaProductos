import { and, eq, sql } from "drizzle-orm";
import { obtenerBd } from "@/db/cliente";
import { categorias, fotos, productos, subcategorias } from "@/db/esquema";
import {
  compararConActual,
  leerArchivoProductos,
  MOTIVO,
  validarRenglon,
  type DatosComparables,
  type DatosRenglon,
  type ExistenteConCambios,
  type FotoNueva,
  type ResumenCarga,
} from "@/dominio/carga-masiva";
import { normalizarNombre } from "@/dominio/normalizacion";
import { unidadesApartadas } from "@/consultas/disponibilidad";
import { guardarFoto } from "@/lib/fotos";
import { ErrorNegocio } from "@/lib/resultado";
import { crearProducto } from "@/servicios/productos";
import { leerComprimido, type Comprimido } from "./comprimido";

/** Mensaje legible de un error de negocio, con el del campo si lo trae. */
export function motivoDeError(error: ErrorNegocio): string {
  return Object.values(error.campos ?? {})[0] ?? error.message;
}

/** Productos activos por nombre normalizado (FR-009). */
export function productosActivosPorNombre(): Map<string, string[]> {
  const filas = obtenerBd()
    .select({ id: productos.id, norm: sql<string>`normalizar(${productos.nombre})` })
    .from(productos)
    .where(eq(productos.activo, true))
    .all();
  const mapa = new Map<string, string[]>();
  for (const { id, norm } of filas) mapa.set(norm, [...(mapa.get(norm) ?? []), id]);
  return mapa;
}

type FotoProcesada = { ok: true; archivo: string; nombre: string } | { ok: false; motivo: string; aviso: string };

/** Busca la foto en el comprimido y la guarda en disco con su UUID (FR-005, research 6). */
async function procesarFoto(comprimido: Comprimido, nombre: string): Promise<FotoProcesada> {
  const contenido = comprimido.foto(nombre);
  if (contenido === "noViene") {
    return { ok: false, motivo: MOTIVO.fotoNoViene(nombre), aviso: MOTIVO.avisoNoViene(nombre) };
  }
  const noValida = { ok: false as const, motivo: MOTIVO.fotoNoValida(nombre), aviso: MOTIVO.avisoNoValida(nombre) };
  if (contenido === "noValida") return noValida;
  try {
    return { ok: true, archivo: await guardarFoto(Buffer.from(contenido)), nombre };
  } catch (error) {
    if (error instanceof ErrorNegocio) return noValida;
    throw error;
  }
}

function productoActual(id: string) {
  const fila = obtenerBd()
    .select({
      nombre: productos.nombre,
      descripcion: productos.descripcion,
      categoria: categorias.nombre,
      subcategoria: subcategorias.nombre,
      existencia: productos.existencia,
      precioCompraCentavos: productos.precioCompraCentavos,
      precioVentaCentavos: productos.precioVentaCentavos,
      apartadas: unidadesApartadas,
    })
    .from(productos)
    .innerJoin(categorias, eq(categorias.id, productos.categoriaId))
    .leftJoin(subcategorias, eq(subcategorias.id, productos.subcategoriaId))
    .where(eq(productos.id, id))
    .get();
  const filasFotos = obtenerBd()
    .select({ archivo: fotos.archivo, activo: fotos.activo, nombreOriginal: fotos.nombreOriginal, orden: fotos.orden })
    .from(fotos)
    .where(and(eq(fotos.productoId, id)))
    .all();
  return {
    ...fila!,
    fotos: filasFotos.filter((f) => f.activo).sort((a, b) => a.orden - b.orden).map((f) => f.archivo),
    cargadas: new Set(filasFotos.map((f) => f.nombreOriginal).filter((n): n is string => Boolean(n))),
  };
}

const comparables = (d: DatosComparables): DatosComparables => ({
  nombre: d.nombre,
  descripcion: d.descripcion,
  categoria: d.categoria,
  subcategoria: d.subcategoria,
  existencia: d.existencia,
  precioCompraCentavos: d.precioCompraCentavos,
  precioVentaCentavos: d.precioVentaCentavos,
});

/**
 * Procesa una carga (research 6): da de alta los nuevos con foto, cada uno en su propia transacción,
 * y clasifica los demás renglones. No modifica productos existentes (FR-012).
 */
export async function procesarCarga(datos: Uint8Array): Promise<ResumenCarga> {
  const comprimido = leerComprimido(datos);
  const renglones = leerArchivoProductos(comprimido.txt);
  const activos = productosActivosPorNombre();

  const resumen: ResumenCarga = {
    fecha: "",
    cantidades: { nuevos: 0, sinFoto: 0, existentes: 0, sinCambios: 0, rechazados: 0, fotosNoUsadas: 0 },
    sinFoto: [],
    rechazados: [],
    existentes: [],
    avisosFotos: [],
  };
  const vistos = new Set<string>();
  const mencionadas = new Set<string>();
  const rechazar = (numero: number, campos: string[], motivo: string) =>
    resumen.rechazados.push({ numero, campos, motivo });

  for (const { numero, campos } of renglones) {
    const validacion = validarRenglon(campos);
    if (validacion.ok) validacion.datos.fotos.forEach((f) => mencionadas.add(f));

    if (campos.length === 8) {
      const norm = normalizarNombre(campos[0]);
      if (norm && vistos.has(norm)) {
        rechazar(numero, campos, MOTIVO.repetido);
        continue;
      }
      if (norm) vistos.add(norm);
    }
    if (!validacion.ok) {
      rechazar(numero, campos, validacion.motivo);
      continue;
    }

    const datosRenglon = validacion.datos;
    const coincidencias = activos.get(normalizarNombre(datosRenglon.nombre)) ?? [];
    if (coincidencias.length > 1) {
      rechazar(numero, campos, MOTIVO.ambiguo);
    } else if (coincidencias.length === 1) {
      await procesarExistente(resumen, comprimido, numero, campos, coincidencias[0], datosRenglon);
    } else {
      await procesarNuevo(resumen, comprimido, numero, campos, datosRenglon);
    }
  }

  resumen.fecha = new Date().toISOString();
  resumen.cantidades = {
    nuevos: resumen.cantidades.nuevos,
    sinFoto: resumen.sinFoto.length,
    existentes: resumen.existentes.length,
    sinCambios: resumen.cantidades.sinCambios,
    rechazados: resumen.rechazados.length,
    fotosNoUsadas: comprimido.fotosNoUsadas(mencionadas),
  };
  return resumen;
}

async function procesarNuevo(
  resumen: ResumenCarga,
  comprimido: Comprimido,
  numero: number,
  campos: string[],
  datos: DatosRenglon,
) {
  if (datos.fotos.length === 0) {
    resumen.sinFoto.push({ numero, campos, motivo: MOTIVO.sinFoto });
    return;
  }

  const procesadas = [];
  for (const nombre of datos.fotos) procesadas.push(await procesarFoto(comprimido, nombre));
  const validas = procesadas.filter((f) => f.ok);
  if (validas.length === 0) {
    const primera = procesadas[0] as Extract<FotoProcesada, { ok: false }>;
    resumen.sinFoto.push({ numero, campos, motivo: primera.motivo });
    return;
  }

  try {
    crearProducto(
      {
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        categoria: { nombre: datos.categoria },
        subcategoria: datos.subcategoria ? { nombre: datos.subcategoria } : null,
        existencia: datos.existencia,
        precioCompraCentavos: datos.precioCompraCentavos,
        precioVentaCentavos: datos.precioVentaCentavos,
        fotos: validas.map((f) => f.archivo),
      },
      new Map(validas.map((f) => [f.archivo, f.nombre])),
    );
  } catch (error) {
    if (!(error instanceof ErrorNegocio)) throw error;
    resumen.rechazados.push({ numero, campos, motivo: motivoDeError(error) });
    return;
  }

  resumen.cantidades.nuevos++;
  const avisos = procesadas.flatMap((f) => (f.ok ? [] : [f.aviso]));
  if (avisos.length > 0) resumen.avisosFotos.push({ numero, nombre: datos.nombre, avisos });
}

async function procesarExistente(
  resumen: ResumenCarga,
  comprimido: Comprimido,
  numero: number,
  campos: string[],
  productoId: string,
  datos: DatosRenglon,
) {
  const actual = productoActual(productoId);
  const candidatas = datos.fotos.filter((f) => !actual.cargadas.has(f));

  const fotosNuevas: FotoNueva[] = [];
  const fotosFaltantes: string[] = [];
  for (const nombre of candidatas) {
    const procesada = await procesarFoto(comprimido, nombre);
    if (procesada.ok) fotosNuevas.push({ archivo: procesada.archivo, nombreOriginal: nombre });
    else fotosFaltantes.push(procesada.aviso);
  }

  const archivo = comparables(datos);
  const cambios = compararConActual(comparables(actual), archivo, fotosNuevas.length > 0);
  if (cambios.length === 0) {
    resumen.cantidades.sinCambios++;
    return;
  }

  const existente: ExistenteConCambios = {
    numero,
    campos,
    productoId,
    actual: { ...comparables(actual), apartadas: actual.apartadas, fotos: actual.fotos },
    archivo,
    cambios,
    fotosNuevas,
    fotosFaltantes,
  };
  resumen.existentes.push(existente);
}
