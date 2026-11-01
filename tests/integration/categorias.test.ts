import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { categoriaPorNombre, crearProductoDirecto, usarBaseTemporal } from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { categorias, subcategorias } from "@/db/esquema";
import {
  crearCategoria,
  crearSubcategoria,
  darDeBajaCategoria,
  darDeBajaSubcategoria,
  renombrarCategoria,
  renombrarSubcategoria,
  resolverCategoria,
  resolverSubcategoria,
} from "@/servicios/categorias";

const contarCategorias = () => obtenerBd().select().from(categorias).all().length;
const subs = (categoriaId: string) =>
  obtenerBd().select().from(subcategorias).where(eq(subcategorias.categoriaId, categoriaId)).all();

describe("categorías y subcategorías", () => {
  usarBaseTemporal();

  it("FR-005: inicia con las categorías indicadas y sin guardar Todos", () => {
    expect(obtenerBd().select().from(categorias).all().map((c) => c.nombre).sort()).toEqual([
      "Juguetes",
      "Otros artículos",
      "Ropa",
    ]);
    expect(subs(categoriaPorNombre("Juguetes").id).map((s) => s.nombre).sort()).toEqual([
      "Bebés",
      "Niñas",
      "Niños",
    ]);
    expect(subs(categoriaPorNombre("Ropa").id)).toHaveLength(4);
    expect(subs(categoriaPorNombre("Otros artículos").id)).toHaveLength(0);
  });

  it("FR-006: crea, renombra y da de baja una categoría", () => {
    const zapatos = crearCategoria("Zapatos");
    renombrarCategoria(zapatos.id, "Calzado");
    expect(categoriaPorNombre("Calzado").id).toBe(zapatos.id);

    darDeBajaCategoria(zapatos.id);
    expect(categoriaPorNombre("Calzado").activo).toBe(false);
  });

  it("FR-006: crea, renombra y da de baja una subcategoría", () => {
    const juguetes = categoriaPorNombre("Juguetes");
    const sub = crearSubcategoria(juguetes.id, "Mesa");
    renombrarSubcategoria(sub.id, "De mesa");
    darDeBajaSubcategoria(sub.id);
    const fila = subs(juguetes.id).find((s) => s.id === sub.id);
    expect(fila).toMatchObject({ nombre: "De mesa", activo: false });
  });

  it("FR-007: crea la categoría y la subcategoría indicadas si no existen", () => {
    const bd = obtenerBd();
    const categoria = resolverCategoria(bd, { nombre: "Papelería" });
    const sub = resolverSubcategoria(bd, categoria.id, { nombre: "Cuadernos" });
    expect(categoriaPorNombre("Papelería").id).toBe(categoria.id);
    expect(sub?.categoriaId).toBe(categoria.id);
  });

  it("un nombre repetido reutiliza el existente, sin importar mayúsculas ni acentos", () => {
    const antes = contarCategorias();
    expect(crearCategoria("  JUGUETES ").id).toBe(categoriaPorNombre("Juguetes").id);
    expect(crearCategoria("otros articulos").id).toBe(categoriaPorNombre("Otros artículos").id);
    expect(contarCategorias()).toBe(antes);

    const juguetes = categoriaPorNombre("Juguetes");
    expect(crearSubcategoria(juguetes.id, "BEBES").nombre).toBe("Bebés");
    expect(subs(juguetes.id)).toHaveLength(3);
  });

  it('rechaza "Todos" como categoría o subcategoría', () => {
    expect(() => crearCategoria("Todos")).toThrow();
    expect(() => crearSubcategoria(categoriaPorNombre("Ropa").id, "todos")).toThrow();
  });

  it("baja con productos activos da TIENE_DEPENDENCIAS", () => {
    const juguetes = categoriaPorNombre("Juguetes");
    const sub = subs(juguetes.id)[0];
    crearProductoDirecto({ subcategoriaId: sub.id });

    expect(() => darDeBajaCategoria(juguetes.id)).toThrow(
      expect.objectContaining({ codigo: "TIENE_DEPENDENCIAS" }),
    );
    expect(() => darDeBajaSubcategoria(sub.id)).toThrow(
      expect.objectContaining({ codigo: "TIENE_DEPENDENCIAS" }),
    );
  });

  it("la baja de una categoría sin productos activos da de baja sus subcategorías", () => {
    const ropa = categoriaPorNombre("Ropa");
    darDeBajaCategoria(ropa.id);
    expect(subs(ropa.id).every((s) => !s.activo)).toBe(true);
  });

  it("no permite renombrar a un nombre que ya existe", () => {
    const zapatos = crearCategoria("Zapatos");
    expect(() => renombrarCategoria(zapatos.id, "juguetes")).toThrow(
      expect.objectContaining({ codigo: "DATOS_INVALIDOS" }),
    );
  });
});
