import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  categoriaPorNombre,
  crearOperacionDirecta,
  crearProductoDirecto,
  usarBaseTemporal,
} from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { fotos, productos, subcategorias } from "@/db/esquema";
import { actualizarProducto, crearProducto, darDeBajaProducto, type DatosProducto } from "@/servicios/productos";
import { listarProductosAdmin } from "@/consultas/admin";

function datos(cambios: Partial<DatosProducto> = {}): DatosProducto {
  return {
    nombre: "Carrito",
    descripcion: "Carrito de madera",
    categoria: { id: categoriaPorNombre("Juguetes").id },
    subcategoria: null,
    existencia: 4,
    precioCompraCentavos: 5000,
    precioVentaCentavos: 9900,
    fotos: ["uno.jpg"],
    ...cambios,
  };
}

const fotosActivas = (productoId: string) =>
  obtenerBd()
    .select()
    .from(fotos)
    .where(eq(fotos.productoId, productoId))
    .all()
    .filter((f) => f.activo)
    .map((f) => f.archivo);

const codigo = (valor: string) => expect.objectContaining({ codigo: valor });

describe("productos", () => {
  usarBaseTemporal();

  it("FR-008: registra un producto con todos sus datos", () => {
    const { id } = crearProducto(datos());
    expect(listarProductosAdmin({}).productos.find((p) => p.id === id)).toMatchObject({
      nombre: "Carrito",
      existencia: 4,
      disponible: 4,
      precioCompraCentavos: 5000,
      precioVentaCentavos: 9900,
      categoria: "Juguetes",
    });
  });

  it("FR-007: crea la categoría y subcategoría nuevas durante el alta", () => {
    const { id } = crearProducto(
      datos({ categoria: { nombre: "Papelería" }, subcategoria: { nombre: "Cuadernos" } }),
    );
    expect(listarProductosAdmin({}).productos.find((p) => p.id === id)).toMatchObject({
      categoria: "Papelería",
      subcategoria: "Cuadernos",
    });
  });

  it("FR-009: edita datos, precios, existencia y fotos", () => {
    const { id } = crearProducto(datos({ fotos: ["uno.jpg", "dos.jpg"] }));
    actualizarProducto(
      id,
      datos({
        nombre: "Carrito rojo",
        descripcion: "Nuevo",
        existencia: 9,
        precioCompraCentavos: 6000,
        precioVentaCentavos: 12000,
        fotos: ["dos.jpg", "tres.jpg"],
      }),
    );
    expect(obtenerBd().select().from(productos).where(eq(productos.id, id)).get()).toMatchObject({
      nombre: "Carrito rojo",
      existencia: 9,
      precioCompraCentavos: 6000,
      precioVentaCentavos: 12000,
    });
    expect(fotosActivas(id)).toEqual(["dos.jpg", "tres.jpg"]);
  });

  it("US1-3: editar el precio no cambia el precio acordado de operaciones registradas", () => {
    const producto = crearProductoDirecto();
    const operacion = crearOperacionDirecta({ productoId: producto.id, precioUnitarioCentavos: 100000 });
    actualizarProducto(
      producto.id,
      datos({ precioVentaCentavos: 200000, existencia: 5, fotos: ["foto.jpg"] }),
    );
    expect(operacion.precioUnitarioCentavos).toBe(100000);
  });

  it("FR-016: sin foto da FOTO_REQUERIDA", () => {
    expect(() => crearProducto(datos({ fotos: [] }))).toThrow(codigo("FOTO_REQUERIDA"));
  });

  it("FR-016: no se quita la última foto", () => {
    const { id } = crearProducto(datos());
    expect(() => actualizarProducto(id, datos({ fotos: [] }))).toThrow(codigo("FOTO_REQUERIDA"));
    expect(fotosActivas(id)).toEqual(["uno.jpg"]);
  });

  it("FR-004: rechaza una subcategoría de otra categoría", () => {
    const ropa = categoriaPorNombre("Ropa");
    const subRopa = obtenerBd()
      .select()
      .from(subcategorias)
      .where(eq(subcategorias.categoriaId, ropa.id))
      .all()[0];
    expect(() => crearProducto(datos({ subcategoria: { id: subRopa.id } }))).toThrow(
      codigo("DATOS_INVALIDOS"),
    );
  });

  it("FR-011: resta los apartados vigentes y no los entregados ni cancelados", () => {
    const producto = crearProductoDirecto({ existencia: 5 });
    crearOperacionDirecta({ productoId: producto.id, cantidad: 2 });
    crearOperacionDirecta({ productoId: producto.id, cantidad: 1, estado: "pagado" });
    crearOperacionDirecta({ productoId: producto.id, cantidad: 1, estado: "entregado" });
    crearOperacionDirecta({ productoId: producto.id, cantidad: 1, estado: "cancelado", motivo: "x" });
    crearOperacionDirecta({ productoId: producto.id, cantidad: 3, tipo: "encargo" });
    expect(listarProductosAdmin({}).productos.find((p) => p.id === producto.id)?.disponible).toBe(2);
  });

  it.each(["apartado", "encargo"] as const)("baja con %s vigente da TIENE_DEPENDENCIAS", (tipo) => {
    const producto = crearProductoDirecto();
    crearOperacionDirecta({ productoId: producto.id, tipo });
    expect(() => darDeBajaProducto(producto.id)).toThrow(codigo("TIENE_DEPENDENCIAS"));
  });

  it("existencia menor a las unidades apartadas da EXISTENCIA_INSUFICIENTE", () => {
    const producto = crearProductoDirecto({ existencia: 5 });
    crearOperacionDirecta({ productoId: producto.id, cantidad: 3 });
    expect(() =>
      actualizarProducto(producto.id, datos({ existencia: 2, fotos: ["foto.jpg"] })),
    ).toThrow(codigo("EXISTENCIA_INSUFICIENTE"));
  });

  it("FR-038: la baja es lógica y conserva el registro", () => {
    const producto = crearProductoDirecto();
    darDeBajaProducto(producto.id);
    expect(obtenerBd().select().from(productos).where(eq(productos.id, producto.id)).get()).toMatchObject({
      activo: false,
    });
    expect(listarProductosAdmin({}).productos.some((p) => p.id === producto.id)).toBe(false);
  });

  it("FR-010: filtra por categoría y subcategoría", () => {
    const juguetes = categoriaPorNombre("Juguetes");
    const niñas = obtenerBd()
      .select()
      .from(subcategorias)
      .where(eq(subcategorias.categoriaId, juguetes.id))
      .all()
      .find((s) => s.nombre === "Niñas")!;
    const a = crearProductoDirecto({ subcategoriaId: niñas.id });
    const b = crearProductoDirecto({ categoriaId: categoriaPorNombre("Ropa").id });

    const ids = (filtro: Parameters<typeof listarProductosAdmin>[0]) =>
      listarProductosAdmin(filtro).productos.map((p) => p.id);
    expect(ids({})).toEqual(expect.arrayContaining([a.id, b.id]));
    expect(ids({ categoriaId: juguetes.id })).toEqual([a.id]);
    expect(ids({ categoriaId: juguetes.id, subcategoriaId: niñas.id })).toEqual([a.id]);
  });
});
