import { and, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { obtenerBd } from "@/db/cliente";
import { productos } from "@/db/esquema";
import { LARGO_MAXIMO_BUSQUEDA, palabrasDeBusqueda } from "@/dominio/normalizacion";
import { ErrorNegocio } from "@/lib/resultado";

/*
 * Reglas de búsqueda, orden y cursor que comparten el catálogo y el panel (spec 002).
 * Cada sección elige sus columnas en su propio archivo; aquí solo se decide qué productos
 * entran, en qué orden y dónde continúa la parte siguiente.
 *
 * Las columnas van escritas a mano y calificadas, como en disponibilidad.ts: Drizzle omite
 * el nombre de la tabla en consultas de una sola tabla y aquí se usan en ambas.
 */

export const TAMANO_CATALOGO = 20;
export const TAMANO_PANEL = 50;
export const LIMITE_MAXIMO = 200;

export interface ParametrosLista {
  categoriaId?: string;
  subcategoriaId?: string;
  texto?: string;
  cursor?: string;
  limite?: number;
}

export interface Parte<P> {
  productos: P[];
  siguiente: string | null;
  total: number;
}

const NOMBRE = sql`normalizar("productos"."nombre")`;
// El espacio impide que una palabra coincida uniendo el final del nombre con el inicio de la descripción.
const NOMBRE_Y_DESCRIPCION = sql`(normalizar("productos"."nombre") || ' ' || normalizar("productos"."descripcion"))`;
const CREADO_EN = sql`"productos"."creado_en"`;
const ID = sql`"productos"."id"`;

/** FR-002: cada palabra debe aparecer en el nombre o en la descripción. */
export function condicionPalabras(palabras: string[]): SQL | undefined {
  if (palabras.length === 0) return undefined;
  return and(...palabras.map((palabra) => sql`instr(${NOMBRE_Y_DESCRIPCION}, ${palabra}) > 0`));
}

/** FR-007: 0 si todas las palabras están en el nombre (o no hay búsqueda); 1 en otro caso. */
export function expresionGrupo(palabras: string[]): SQL<number> {
  if (palabras.length === 0) return sql<number>`0`;
  const enNombre = sql.join(
    palabras.map((palabra) => sql`instr(${NOMBRE}, ${palabra}) > 0`),
    sql` AND `,
  );
  return sql<number>`(CASE WHEN ${enNombre} THEN 0 ELSE 1 END)`;
}

export const esquemaCursor = z.object({
  g: z.union([z.literal(0), z.literal(1)]),
  c: z.string().min(1).max(64),
  i: z.string().min(1).max(64),
});

export type Posicion = z.infer<typeof esquemaCursor>;

/** Los productos que van después del último entregado (data-model, Cursor). */
export function condicionCursor(cursor: Posicion, grupo: SQL<number>): SQL {
  return sql`(
    ${grupo} > ${cursor.g}
    OR (${grupo} = ${cursor.g} AND ${CREADO_EN} < ${cursor.c})
    OR (${grupo} = ${cursor.g} AND ${CREADO_EN} = ${cursor.c} AND ${ID} < ${cursor.i})
  )`;
}

/**
 * grupo ASC, creado_en DESC, id DESC: el id desempata y hace estable la paginación.
 * Sin búsqueda el grupo es 0 para todos y se omite: SQLite leería "ORDER BY 0" como número de columna.
 */
export function ordenDeLista(palabras: string[]): SQL[] {
  const porFecha = [sql`${CREADO_EN} DESC`, sql`${ID} DESC`];
  return palabras.length === 0 ? porFecha : [sql`${expresionGrupo(palabras)} ASC`, ...porFecha];
}

export function codificarCursor(posicion: Posicion): string {
  return Buffer.from(JSON.stringify(posicion), "utf8").toString("base64url");
}

export function decodificarCursor(cursor: string): Posicion {
  let valor: unknown;
  try {
    valor = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new ErrorNegocio("CURSOR_INVALIDO");
  }
  const resultado = esquemaCursor.safeParse(valor);
  if (!resultado.success) throw new ErrorNegocio("CURSOR_INVALIDO");
  return resultado.data;
}

/** Entre el tamaño de la parte y 200 (contracts/rutas.md); sin límite, el tamaño de la parte. */
export function limiteValido(limite: number | undefined, tamano: number): number {
  if (limite === undefined) return tamano;
  if (!Number.isInteger(limite) || limite < tamano || limite > LIMITE_MAXIMO) {
    throw new ErrorNegocio("DATOS_INVALIDOS");
  }
  return limite;
}

/** Arma la consulta de una parte: filtro, búsqueda, cursor, orden y límite. */
export function prepararParte(parametros: ParametrosLista, tamano: number) {
  const { categoriaId, subcategoriaId, texto, cursor, limite } = parametros;
  const limiteParte = limiteValido(limite, tamano);
  const posicion = cursor ? decodificarCursor(cursor) : null;
  const palabras = palabrasDeBusqueda(texto ?? "");
  const grupo = expresionGrupo(palabras);

  // FR-004, FR-006 y FR-013: solo activos, con el filtro de la URL, sobre todo el catálogo.
  const filtro = and(
    eq(productos.activo, true),
    categoriaId ? eq(productos.categoriaId, categoriaId) : undefined,
    subcategoriaId ? eq(productos.subcategoriaId, subcategoriaId) : undefined,
    condicionPalabras(palabras),
  );

  return {
    /** Columnas que necesita cerrarParte; se agregan a la selección de cada sección. */
    posicion: { grupo, creadoEn: productos.creadoEn },
    condicion: and(filtro, posicion ? condicionCursor(posicion, grupo) : undefined),
    orden: ordenDeLista(palabras),
    /** Se pide uno de más para saber si hay parte siguiente. */
    filasAPedir: limiteParte + 1,
    limite: limiteParte,
    contar: () =>
      obtenerBd()
        .select({ total: sql<number>`count(*)` })
        .from(productos)
        .where(filtro)
        .get()?.total ?? 0,
  };
}

type FilaConPosicion = { id: string; grupo: number; creadoEn: string };

/** Corta la parte, calcula el cursor de la siguiente y quita las columnas de posición. */
export function cerrarParte<F extends FilaConPosicion>(filas: F[], limite: number) {
  const parte = filas.slice(0, limite);
  const ultima = parte.at(-1);
  const siguiente =
    filas.length > limite && ultima
      ? codificarCursor({ g: ultima.grupo === 1 ? 1 : 0, c: ultima.creadoEn, i: ultima.id })
      : null;
  const filasSinPosicion = parte.map((fila) => {
    const resto: Omit<F, "grupo" | "creadoEn"> & Partial<FilaConPosicion> = { ...fila };
    delete resto.grupo;
    delete resto.creadoEn;
    return resto as Omit<F, "grupo" | "creadoEn">;
  });
  return { filas: filasSinPosicion, siguiente };
}


const esquemaParametros = z
  .object({
    texto: z.string().max(LARGO_MAXIMO_BUSQUEDA).optional(),
    categoria: z.string().max(64).optional(),
    subcategoria: z.string().max(64).optional(),
    cursor: z.string().max(512).optional(),
    limite: z.coerce.number().int().optional(),
  })
  .refine((p) => !p.subcategoria || p.categoria, { path: ["subcategoria"] });

/** Valida los parámetros de /api/catalogo y /api/admin/productos (contracts/rutas.md). */
export function leerParametros(busqueda: URLSearchParams): ParametrosLista {
  const valores = Object.fromEntries([...busqueda.entries()].filter(([, valor]) => valor !== ""));
  const resultado = esquemaParametros.safeParse(valores);
  if (!resultado.success) throw new ErrorNegocio("DATOS_INVALIDOS");
  const { texto, categoria, subcategoria, cursor, limite } = resultado.data;
  return { texto, categoriaId: categoria, subcategoriaId: subcategoria, cursor, limite };
}
