import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { categoriaPorNombre, usarBaseTemporal } from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { categorias, subcategorias } from "@/db/esquema";
import { sembrar } from "@/db/semilla";
import { darDeBajaCategoria, darDeBajaSubcategoria, renombrarCategoria } from "@/servicios/categorias";

const activas = () =>
  obtenerBd().select().from(categorias).all().filter((c) => c.activo).map((c) => c.nombre);

describe("semilla al arrancar", () => {
  usarBaseTemporal();

  it("FR-005: sembrar de nuevo no duplica las categorías iniciales", () => {
    sembrar(obtenerBd());
    expect(activas().sort()).toEqual(["Juguetes", "Otros artículos", "Ropa"]);
    expect(obtenerBd().select().from(subcategorias).all()).toHaveLength(7);
  });

  it("FR-006: un arranque no revive una categoría dada de baja", () => {
    darDeBajaCategoria(categoriaPorNombre("Ropa").id);
    sembrar(obtenerBd());
    expect(activas()).not.toContain("Ropa");
  });

  it("FR-006: un arranque no recrea una categoría renombrada", () => {
    renombrarCategoria(categoriaPorNombre("Juguetes").id, "Juguetería");
    sembrar(obtenerBd());
    expect(activas()).toContain("Juguetería");
    expect(activas()).not.toContain("Juguetes");
  });

  it("FR-006: un arranque no revive una subcategoría dada de baja", () => {
    const juguetes = categoriaPorNombre("Juguetes");
    const bebes = obtenerBd()
      .select()
      .from(subcategorias)
      .where(eq(subcategorias.categoriaId, juguetes.id))
      .all()
      .find((s) => s.nombre === "Bebés")!;
    darDeBajaSubcategoria(bebes.id);
    sembrar(obtenerBd());
    const vigentes = obtenerBd()
      .select()
      .from(subcategorias)
      .where(eq(subcategorias.categoriaId, juguetes.id))
      .all()
      .filter((s) => s.activo)
      .map((s) => s.nombre);
    expect(vigentes).not.toContain("Bebés");
  });
});
