import { and, eq, ne } from "drizzle-orm";
import { conTransaccion, obtenerBd, type Conexion } from "@/db/cliente";
import { categorias, productos, subcategorias } from "@/db/esquema";
import { normalizarNombre } from "@/dominio/normalizacion";
import { ErrorNegocio } from "@/lib/resultado";

export type ReferenciaCategoria = { id: string } | { nombre: string };

function validarNombre(nombre: string): { nombre: string; nombreNorm: string } {
  const limpio = nombre.trim().replace(/\s+/g, " ");
  const nombreNorm = normalizarNombre(limpio);
  if (!nombreNorm) {
    throw new ErrorNegocio("DATOS_INVALIDOS", undefined, { nombre: "Escribe un nombre." });
  }
  if (nombreNorm === "todos") {
    throw new ErrorNegocio("DATOS_INVALIDOS", undefined, {
      nombre: '"Todos" está reservado para el filtro; elige otro nombre.',
    });
  }
  return { nombre: limpio, nombreNorm };
}

const nombreOcupado = () =>
  new ErrorNegocio("DATOS_INVALIDOS", undefined, { nombre: "Ya existe con ese nombre." });

function buscarCategoria(bd: Conexion, nombreNorm: string) {
  return bd
    .select()
    .from(categorias)
    .where(and(eq(categorias.nombreNorm, nombreNorm), eq(categorias.activo, true)))
    .get();
}

function buscarSubcategoria(bd: Conexion, categoriaId: string, nombreNorm: string) {
  return bd
    .select()
    .from(subcategorias)
    .where(
      and(
        eq(subcategorias.categoriaId, categoriaId),
        eq(subcategorias.nombreNorm, nombreNorm),
        eq(subcategorias.activo, true),
      ),
    )
    .get();
}

function crearCategoriaEn(bd: Conexion, nombre: string) {
  const valores = validarNombre(nombre);
  return (
    buscarCategoria(bd, valores.nombreNorm) ?? bd.insert(categorias).values(valores).returning().get()
  );
}

function crearSubcategoriaEn(bd: Conexion, categoriaId: string, nombre: string) {
  const valores = validarNombre(nombre);
  return (
    buscarSubcategoria(bd, categoriaId, valores.nombreNorm) ??
    bd.insert(subcategorias).values({ ...valores, categoriaId }).returning().get()
  );
}

export function resolverCategoria(bd: Conexion, referencia: ReferenciaCategoria) {
  if ("nombre" in referencia) return crearCategoriaEn(bd, referencia.nombre);

  const categoria = bd
    .select()
    .from(categorias)
    .where(and(eq(categorias.id, referencia.id), eq(categorias.activo, true)))
    .get();
  if (!categoria) {
    throw new ErrorNegocio("DATOS_INVALIDOS", undefined, { categoria: "Elige una categoría." });
  }
  return categoria;
}

export function resolverSubcategoria(
  bd: Conexion,
  categoriaId: string,
  referencia: ReferenciaCategoria | null,
) {
  if (!referencia) return null;
  if ("nombre" in referencia) return crearSubcategoriaEn(bd, categoriaId, referencia.nombre);

  const subcategoria = bd
    .select()
    .from(subcategorias)
    .where(
      and(
        eq(subcategorias.id, referencia.id),
        eq(subcategorias.categoriaId, categoriaId),
        eq(subcategorias.activo, true),
      ),
    )
    .get();
  if (!subcategoria) {
    throw new ErrorNegocio("DATOS_INVALIDOS", undefined, {
      subcategoria: "La subcategoría no pertenece a la categoría elegida.",
    });
  }
  return subcategoria;
}

export function crearCategoria(nombre: string) {
  return conTransaccion((tx) => crearCategoriaEn(tx, nombre));
}

export function crearSubcategoria(categoriaId: string, nombre: string) {
  return conTransaccion((tx) => crearSubcategoriaEn(tx, categoriaId, nombre));
}

export function renombrarCategoria(id: string, nombre: string) {
  conTransaccion((tx) => {
    const valores = validarNombre(nombre);
    const repetida = tx
      .select({ id: categorias.id })
      .from(categorias)
      .where(
        and(
          eq(categorias.nombreNorm, valores.nombreNorm),
          eq(categorias.activo, true),
          ne(categorias.id, id),
        ),
      )
      .get();
    if (repetida) throw nombreOcupado();
    tx.update(categorias).set(valores).where(eq(categorias.id, id)).run();
  });
}

export function renombrarSubcategoria(id: string, nombre: string) {
  conTransaccion((tx) => {
    const valores = validarNombre(nombre);
    const actual = tx.select().from(subcategorias).where(eq(subcategorias.id, id)).get();
    if (!actual) throw new ErrorNegocio("DATOS_INVALIDOS");

    const repetida = buscarSubcategoria(tx, actual.categoriaId, valores.nombreNorm);
    if (repetida && repetida.id !== id) throw nombreOcupado();
    tx.update(subcategorias).set(valores).where(eq(subcategorias.id, id)).run();
  });
}

export function darDeBajaCategoria(id: string) {
  conTransaccion((tx) => {
    const conProductos = tx
      .select({ id: productos.id })
      .from(productos)
      .where(and(eq(productos.categoriaId, id), eq(productos.activo, true)))
      .get();
    if (conProductos) throw new ErrorNegocio("TIENE_DEPENDENCIAS");

    tx.update(subcategorias).set({ activo: false }).where(eq(subcategorias.categoriaId, id)).run();
    tx.update(categorias).set({ activo: false }).where(eq(categorias.id, id)).run();
  });
}

export function darDeBajaSubcategoria(id: string) {
  conTransaccion((tx) => {
    const conProductos = tx
      .select({ id: productos.id })
      .from(productos)
      .where(and(eq(productos.subcategoriaId, id), eq(productos.activo, true)))
      .get();
    if (conProductos) throw new ErrorNegocio("TIENE_DEPENDENCIAS");

    tx.update(subcategorias).set({ activo: false }).where(eq(subcategorias.id, id)).run();
  });
}

export function listarCategorias() {
  const bd = obtenerBd();
  const subs = bd.select().from(subcategorias).where(eq(subcategorias.activo, true)).all();
  return bd
    .select()
    .from(categorias)
    .where(eq(categorias.activo, true))
    .all()
    .map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre,
      subcategorias: subs
        .filter((s) => s.categoriaId === categoria.id)
        .map((s) => ({ id: s.id, nombre: s.nombre })),
    }));
}

export type CategoriaConSubcategorias = ReturnType<typeof listarCategorias>[number];
