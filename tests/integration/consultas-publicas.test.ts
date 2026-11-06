import { describe, expect, it } from "vitest";
import { crearOperacionDirecta, crearProductoDirecto, categoriaPorNombre, usarBaseTemporal } from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { articulosEncargo } from "@/db/esquema";
import { listarArticulosEncargo, listarCatalogo, obtenerProducto } from "@/consultas/publicas";
import { darDeBajaProducto } from "@/servicios/productos";

const PRECIO_COMPRA = 80017;

describe("consultas públicas", () => {
  usarBaseTemporal();

  it("FR-003, SC-008: ninguna consulta contiene el precio de compra", () => {
    const producto = crearProductoDirecto({ precioCompraCentavos: PRECIO_COMPRA });
    const resultados = [listarCatalogo({}).productos, obtenerProducto(producto.id)];
    for (const resultado of resultados) {
      const texto = JSON.stringify(resultado);
      expect(texto).not.toContain(String(PRECIO_COMPRA));
      expect(texto.toLowerCase()).not.toContain("compra");
    }
  });

  it("FR-012: entrega exactamente los datos del contrato público", () => {
    crearProductoDirecto();
    expect(Object.keys(listarCatalogo({}).productos[0]).sort()).toEqual(
      [
        "agotado",
        "categoria",
        "descripcion",
        "disponible",
        "fotos",
        "id",
        "nombre",
        "precioVentaCentavos",
        "subcategoria",
      ].sort(),
    );
  });

  it("FR-038: oculta productos dados de baja", () => {
    const producto = crearProductoDirecto();
    darDeBajaProducto(producto.id);
    expect(listarCatalogo({}).productos).toEqual([]);
    expect(obtenerProducto(producto.id)).toBeNull();
  });

  it("FR-011: calcula disponible como existencia menos apartados vigentes", () => {
    const producto = crearProductoDirecto({ existencia: 5 });
    crearOperacionDirecta({ productoId: producto.id, cantidad: 2 });
    expect(listarCatalogo({}).productos[0]).toMatchObject({ disponible: 3, agotado: false });
  });

  it("FR-015: un producto sin unidades disponibles sigue visible como agotado", () => {
    const producto = crearProductoDirecto({ existencia: 2 });
    crearOperacionDirecta({ productoId: producto.id, cantidad: 2 });
    expect(listarCatalogo({}).productos[0]).toMatchObject({ disponible: 0, agotado: true });
  });

  it("FR-010: filtra por categoría", () => {
    const a = crearProductoDirecto();
    crearProductoDirecto({ categoriaId: categoriaPorNombre("Ropa").id });
    const filtrados = listarCatalogo({ categoriaId: categoriaPorNombre("Juguetes").id }).productos;
    expect(filtrados.map((p) => p.id)).toEqual([a.id]);
  });

  it("FR-025: lista los artículos por encargo activos, sin cantidad disponible", () => {
    const bd = obtenerBd();
    bd.insert(articulosEncargo)
      .values({ nombre: "Bicicleta", descripcion: "Rodado 20", precioCentavos: 300000 })
      .run();
    bd.insert(articulosEncargo)
      .values({ nombre: "Baja", descripcion: "x", precioCentavos: 100, activo: false })
      .run();
    const articulos = listarArticulosEncargo();
    expect(articulos.map((a) => a.nombre)).toEqual(["Bicicleta"]);
    expect(articulos[0]).not.toHaveProperty("disponible");
  });
});
