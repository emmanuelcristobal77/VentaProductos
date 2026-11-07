import { and, asc, desc, eq, getTableColumns, inArray, sql, type SQL } from "drizzle-orm";
import { obtenerBd } from "@/db/cliente";
import {
  articulosEncargo,
  categorias,
  operaciones,
  pagos,
  productos,
  subcategorias,
} from "@/db/esquema";
import { calcularTotal } from "@/dominio/dinero";
import { ESTADOS_APARTADO_VIGENTE } from "@/dominio/estados";
import { inicioDeDia, inicioDelDiaSiguiente } from "@/dominio/fechas";
import { normalizarNombre, normalizarTelefono } from "@/dominio/normalizacion";
import { CAMPOS } from "@/lib/mensajes";
import { ErrorNegocio } from "@/lib/resultado";
import { unidadesDisponibles } from "./disponibilidad";
import { cerrarParte, prepararParte, TAMANO_PANEL, type ParametrosLista } from "./busqueda";
import { fotosPorArticulo, fotosPorProducto } from "./fotos";
import { pagadoCentavos } from "./saldos";

const seleccion = {
  id: productos.id,
  nombre: productos.nombre,
  descripcion: productos.descripcion,
  categoriaId: productos.categoriaId,
  subcategoriaId: productos.subcategoriaId,
  categoria: categorias.nombre,
  subcategoria: subcategorias.nombre,
  existencia: productos.existencia,
  disponible: unidadesDisponibles,
  precioCompraCentavos: productos.precioCompraCentavos,
  precioVentaCentavos: productos.precioVentaCentavos,
};

function conFotos<F extends { id: string }>(filas: F[]) {
  const fotos = fotosPorProducto(filas.map((f) => f.id));
  return filas.map((fila) => ({ ...fila, fotos: fotos.get(fila.id) ?? [] }));
}

function consultar(condicion: SQL | undefined) {
  return conFotos(
    obtenerBd()
      .select(seleccion)
      .from(productos)
      .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
      .leftJoin(subcategorias, eq(productos.subcategoriaId, subcategorias.id))
      .where(condicion)
      .orderBy(desc(productos.creadoEn))
      .all(),
  );
}

/** Una parte de la lista del panel con búsqueda y cursor (spec 002, contracts/rutas.md). */
export function listarProductosAdmin(parametros: ParametrosLista) {
  const parte = prepararParte(parametros, TAMANO_PANEL);
  const filas = obtenerBd()
    .select({ ...seleccion, ...parte.posicion })
    .from(productos)
    .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
    .leftJoin(subcategorias, eq(productos.subcategoriaId, subcategorias.id))
    .where(parte.condicion)
    .orderBy(...parte.orden)
    .limit(parte.filasAPedir)
    .all();
  const { filas: entregadas, siguiente } = cerrarParte(filas, parte.limite);
  return { productos: conFotos(entregadas), siguiente, total: parte.contar() };
}

export function obtenerProductoAdmin(id: string) {
  return consultar(and(eq(productos.id, id), eq(productos.activo, true)))[0] ?? null;
}

export type ProductoAdmin = NonNullable<ReturnType<typeof obtenerProductoAdmin>>;

const seleccionOperacion = {
  ...getTableColumns(operaciones),
  pagado: pagadoCentavos,
  articulo: sql<string>`coalesce(${productos.nombre}, ${articulosEncargo.nombre})`,
};

type FilaOperacion = {
  precioUnitarioCentavos: number;
  cantidad: number;
  pagado: number;
};

function conSaldo<T extends FilaOperacion>({ pagado, ...fila }: T) {
  const totalCentavos = calcularTotal(fila.precioUnitarioCentavos, fila.cantidad);
  return { ...fila, totalCentavos, pagadoCentavos: pagado, saldoCentavos: totalCentavos - pagado };
}

function consultarOperaciones(condicion: SQL | undefined) {
  return obtenerBd()
    .select(seleccionOperacion)
    .from(operaciones)
    .leftJoin(productos, eq(operaciones.productoId, productos.id))
    .leftJoin(articulosEncargo, eq(operaciones.articuloEncargoId, articulosEncargo.id))
    .where(condicion)
    .orderBy(desc(operaciones.creadoEn))
    .all()
    .map(conSaldo);
}

export function obtenerOperacionAdmin(id: string) {
  const operacion = consultarOperaciones(eq(operaciones.id, id))[0];
  if (!operacion) return null;

  const registrados = obtenerBd()
    .select()
    .from(pagos)
    .where(eq(pagos.operacionId, id))
    .orderBy(asc(pagos.fecha))
    .all();
  return { ...operacion, pagos: registrados };
}

export type OperacionAdmin = NonNullable<ReturnType<typeof obtenerOperacionAdmin>>;

export function listarEncargosPendientes() {
  return consultarOperaciones(
    and(eq(operaciones.tipo, "encargo"), inArray(operaciones.estado, [...ESTADOS_APARTADO_VIGENTE])),
  );
}

export interface FiltroOperaciones {
  desde?: string;
  hasta?: string;
  nombre?: string;
  telefono?: string;
}

function condicionFechas(desde?: string, hasta?: string): SQL | undefined {
  if (!desde && !hasta) return undefined;

  const inicio = desde ? inicioDeDia(desde) : null;
  const fin = hasta ? inicioDelDiaSiguiente(hasta) : null;
  if ((desde && !inicio) || (hasta && !fin) || (inicio && fin && inicio >= fin)) {
    throw new ErrorNegocio("DATOS_INVALIDOS", CAMPOS.rangoFechas);
  }

  return sql`EXISTS (
    SELECT 1 FROM pagos p
    WHERE p.operacion_id = "operaciones"."id"
      AND p.anulado_en IS NULL
      ${inicio ? sql`AND p.fecha >= ${inicio}` : sql``}
      ${fin ? sql`AND p.fecha < ${fin}` : sql``}
  )`;
}

export function buscarOperaciones({ desde, hasta, nombre, telefono }: FiltroOperaciones) {
  const nombreNorm = nombre ? normalizarNombre(nombre) : "";
  const digitos = telefono?.trim() ? normalizarTelefono(telefono) : "";
  if (digitos === null) throw new ErrorNegocio("DATOS_INVALIDOS", CAMPOS.clienteTelefono);

  const patron = `%${nombreNorm.replace(/[\\%_]/g, "\\$&")}%`;

  return consultarOperaciones(
    and(
      condicionFechas(desde, hasta),
      nombreNorm ? sql`${operaciones.clienteNombreNorm} LIKE ${patron} ESCAPE '\\'` : undefined,
      digitos ? eq(operaciones.clienteTelefono, digitos) : undefined,
    ),
  );
}

export function listarArticulosAdmin() {
  const filas = obtenerBd()
    .select()
    .from(articulosEncargo)
    .where(eq(articulosEncargo.activo, true))
    .orderBy(desc(articulosEncargo.creadoEn))
    .all();
  const fotos = fotosPorArticulo(filas.map((f) => f.id));
  return filas.map((fila) => ({ ...fila, fotos: fotos.get(fila.id) ?? [] }));
}

export type ArticuloAdmin = ReturnType<typeof listarArticulosAdmin>[number];

/** Datos de contacto con los que se identifica a un cliente al borrar sus datos (spec 003). */
export type ClienteDeOperacion = { clienteNombreNorm: string | null; clienteTelefono: string | null };

/**
 * Operaciones del mismo cliente que aún conservan sus datos: el mismo nombre normalizado y el mismo
 * teléfono, comparados con IS para que también coincidan los nulos (spec 003, data-model,
 * «Alcance del borrado»). La usan la cuenta de la confirmación y el borrado, para que nunca difieran.
 */
export function condicionMismoCliente({ clienteNombreNorm, clienteTelefono }: ClienteDeOperacion): SQL {
  return sql`${operaciones.datosBorradosEn} IS NULL
    AND ${operaciones.clienteNombreNorm} IS ${clienteNombreNorm}
    AND ${operaciones.clienteTelefono} IS ${clienteTelefono}`;
}

/** Cuántas operaciones alcanzaría el borrado desde esta; 0 si no tiene datos o ya están borrados (FR-014). */
export function contarOperacionesDelCliente(id: string): number {
  const bd = obtenerBd();
  const origen = bd
    .select({
      clienteNombreNorm: operaciones.clienteNombreNorm,
      clienteTelefono: operaciones.clienteTelefono,
      datosBorradosEn: operaciones.datosBorradosEn,
    })
    .from(operaciones)
    .where(eq(operaciones.id, id))
    .get();
  if (!origen || origen.datosBorradosEn || (!origen.clienteNombreNorm && !origen.clienteTelefono)) return 0;

  return bd
    .select({ total: sql<number>`count(*)` })
    .from(operaciones)
    .where(condicionMismoCliente(origen))
    .get()!.total;
}
