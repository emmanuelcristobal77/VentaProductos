import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { categoriaPorNombre, crearProductoDirecto, usarBaseTemporal } from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { subcategorias } from "@/db/esquema";
import { listarProductosAdmin } from "@/consultas/admin";
import { listarCatalogo } from "@/consultas/publicas";
import { darDeBajaProducto } from "@/servicios/productos";

/** Fechas de alta distintas y conocidas: el minuto n después de una fecha fija. */
const fecha = (minuto: number) => new Date(Date.UTC(2026, 10, 5, 10, minuto)).toISOString();

const crear = (nombre: string, descripcion: string, minuto: number, otros = {}) =>
  crearProductoDirecto({ nombre, descripcion, creadoEn: fecha(minuto), ...otros });

const nombresCatalogo = (texto: string, filtro = {}) =>
  listarCatalogo({ texto, ...filtro }).productos.map((p) => p.nombre);
const nombresPanel = (texto: string, filtro = {}) =>
  listarProductosAdmin({ texto, ...filtro }).productos.map((p) => p.nombre);

describe("búsqueda de productos (spec 002)", () => {
  usarBaseTemporal();

  describe("FR-002", () => {
    it.each(["muneca", "MUÑECA", "Muñeca", "trapo muñeca"])('encuentra "Muñeca de trapo" al escribir %j', (texto) => {
      crear("Muñeca de trapo", "Hecha a mano", 1);
      crear("Pelota", "Bota mucho", 2);
      expect(nombresCatalogo(texto)).toEqual(["Muñeca de trapo"]);
      expect(nombresPanel(texto)).toEqual(["Muñeca de trapo"]);
    });

    it("una palabra solo en la descripción encuentra el producto", () => {
      crear("Playera", "Algodón lavable", 1);
      crear("Gorra", "Ajustable", 2);
      expect(nombresCatalogo("lavable")).toEqual(["Playera"]);
    });

    it('"roja pelota" encuentra "Pelota roja"', () => {
      crear("Pelota roja", "De goma", 1);
      crear("Pelota azul", "De goma", 2);
      expect(nombresCatalogo("roja pelota")).toEqual(["Pelota roja"]);
    });

    it("con varias palabras exige todas, entre el nombre y la descripción", () => {
      crear("Pelota", "Color rojo", 1);
      crear("Pelota", "Color azul", 2);
      expect(nombresCatalogo("pelota rojo")).toEqual(["Pelota"]);
      expect(listarCatalogo({ texto: "pelota rojo" }).productos[0].descripcion).toBe("Color rojo");
    });

    it("una palabra partida entre el final del nombre y el inicio de la descripción no coincide", () => {
      crear("Carro", "Tenis de juguete", 1);
      // "rote" solo existiría uniendo "Car-ro" con "Te-nis".
      expect(nombresCatalogo("rote")).toEqual([]);
      expect(nombresCatalogo("rotenis")).toEqual([]);
    });

    it("un texto de solo espacios equivale a no buscar", () => {
      crear("Uno", "x", 1);
      crear("Dos", "x", 2);
      expect(nombresCatalogo("   ")).toEqual(["Dos", "Uno"]);
    });
  });

  describe("FR-004", () => {
    it("la búsqueda se combina con la categoría", () => {
      crear("Pelota", "x", 1, { categoriaId: categoriaPorNombre("Juguetes").id });
      crear("Pelota de playa estampada", "x", 2, { categoriaId: categoriaPorNombre("Ropa").id });
      const filtro = { categoriaId: categoriaPorNombre("Juguetes").id };
      expect(nombresCatalogo("pelota", filtro)).toEqual(["Pelota"]);
      expect(nombresPanel("pelota", filtro)).toEqual(["Pelota"]);
    });

    it("la búsqueda se combina con categoría y subcategoría", () => {
      const juguetes = categoriaPorNombre("Juguetes");
      const subs = obtenerBd().select().from(subcategorias).where(eq(subcategorias.categoriaId, juguetes.id)).all();
      const ninas = subs.find((s) => s.nombre === "Niñas")!;
      const ninos = subs.find((s) => s.nombre === "Niños")!;
      crear("Pelota rosa", "x", 1, { categoriaId: juguetes.id, subcategoriaId: ninas.id });
      crear("Pelota verde", "x", 2, { categoriaId: juguetes.id, subcategoriaId: ninos.id });
      const filtro = { categoriaId: juguetes.id, subcategoriaId: ninas.id };
      expect(nombresCatalogo("pelota", filtro)).toEqual(["Pelota rosa"]);
      expect(nombresPanel("pelota", filtro)).toEqual(["Pelota rosa"]);
    });
  });

  it("FR-006: los productos dados de baja no aparecen en ninguna de las dos secciones", () => {
    const baja = crear("Trompo viejo", "x", 1);
    crear("Trompo nuevo", "x", 2);
    darDeBajaProducto(baja.id);
    expect(nombresCatalogo("trompo")).toEqual(["Trompo nuevo"]);
    expect(nombresPanel("trompo")).toEqual(["Trompo nuevo"]);
  });

  describe("FR-007", () => {
    it("primero las coincidencias en el nombre y después las de la descripción, cada grupo con el más reciente primero", () => {
      crear("Osito de peluche", "Café", 1);
      crear("Cojín", "Relleno de peluche", 2);
      crear("Peluche de conejo", "Blanco", 3);
      crear("Llavero", "Mini peluche", 4);
      crear("Pelota", "Sin relación", 5);
      expect(nombresCatalogo("peluche")).toEqual(["Peluche de conejo", "Osito de peluche", "Llavero", "Cojín"]);
      expect(nombresPanel("peluche")).toEqual(["Peluche de conejo", "Osito de peluche", "Llavero", "Cojín"]);
    });

    it("con varias palabras, cuenta como coincidencia en el nombre solo si todas están en el nombre", () => {
      crear("Pelota roja", "Grande", 1);
      crear("Pelota", "Roja y grande", 2);
      expect(nombresCatalogo("pelota roja")).toEqual(["Pelota roja", "Pelota"]);
    });

    it("sin búsqueda, el orden de la spec 001: el más reciente primero", () => {
      crear("Primero", "x", 1);
      crear("Tercero", "x", 3);
      crear("Segundo", "x", 2);
      expect(nombresCatalogo("")).toEqual(["Tercero", "Segundo", "Primero"]);
      expect(nombresPanel("")).toEqual(["Tercero", "Segundo", "Primero"]);
    });
  });

  it("FR-009: las claves de cada producto público no incluyen precioCompraCentavos ni existencia", () => {
    crear("Muñeca", "x", 1);
    const [producto] = listarCatalogo({ texto: "muneca" }).productos;
    expect(producto).not.toHaveProperty("precioCompraCentavos");
    expect(producto).not.toHaveProperty("existencia");
    expect(Object.keys(producto).sort()).toEqual(
      ["agotado", "categoria", "descripcion", "disponible", "fotos", "id", "nombre", "precioVentaCentavos", "subcategoria"].sort(),
    );
  });

  it("FR-009: el precio de compra no se usa para buscar", () => {
    crear("Muñeca", "x", 1, { precioCompraCentavos: 80017 });
    expect(nombresCatalogo("80017")).toEqual([]);
    expect(nombresCatalogo("800.17")).toEqual([]);
  });

  it("FR-016: total cuenta todas las coincidencias, no solo la parte", () => {
    for (let i = 0; i < 25; i++) crear(`Carrito ${i}`, "x", i);
    crear("Pelota", "x", 30);
    const parte = listarCatalogo({ texto: "carrito" });
    expect(parte.productos).toHaveLength(20);
    expect(parte.total).toBe(25);
    expect(listarProductosAdmin({ texto: "carrito" }).total).toBe(25);
  });
});
