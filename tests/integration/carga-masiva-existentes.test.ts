import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { categoriaPorNombre, crearOperacionDirecta, crearProductoDirecto, usarBaseTemporal } from "./arnes";
import { armarComprimido, armarTxt, foto, renglon } from "./ayudantes-carga";
import { obtenerBd } from "@/db/cliente";
import { categorias, fotos, operaciones, productos } from "@/db/esquema";
import { MOTIVO, type ExistenteConCambios } from "@/dominio/carga-masiva";
import { MENSAJES } from "@/lib/mensajes";
import { confirmarCarga, type Marcado } from "@/servicios/carga-masiva/confirmar";
import { procesarCarga } from "@/servicios/carga-masiva/procesar";

const FOTOS = { "roja.jpg": foto("roja.jpg"), "azul.png": foto("azul.png") };
const cargar = (renglones: string[][], extras: Record<string, Uint8Array> = FOTOS) =>
  procesarCarga(armarComprimido({ "productos.txt": armarTxt(renglones), ...extras }));

const producto = (id: string) => obtenerBd().select().from(productos).where(eq(productos.id, id)).get()!;
const fotosDe = (id: string) =>
  obtenerBd()
    .select()
    .from(fotos)
    .where(eq(fotos.productoId, id))
    .all()
    .sort((a, b) => a.orden - b.orden);
const marcar = (e: ExistenteConCambios): Marcado => ({
  productoId: e.productoId,
  campos: e.campos,
  fotosNuevas: e.fotosNuevas,
});

/** Datos de «Muñeca de trapo» tal como los deja crearProductoDirecto. */
const MUNECA = {
  descripcion: "Muñeca de trapo",
  categoria: "Juguetes",
  existencia: "5",
  precio_compra: "800.00",
  precio_venta: "1250",
  fotos: "",
};

describe("carga masiva: productos que ya existen", () => {
  usarBaseTemporal();

  it("US3-1: reconoce el producto sin mayúsculas ni acentos y no lo modifica", async () => {
    const { id } = crearProductoDirecto({ nombre: "Muñeca de trapo" });
    const antes = producto(id);
    const productosAntes = obtenerBd().select().from(productos).all().length;

    const resumen = await cargar([
      renglon("muñeca de trapo", { ...MUNECA, precio_venta: "1300" }),
      renglon("Muneca de Trapo", { ...MUNECA, precio_venta: "1400" }),
    ]);

    expect(resumen.existentes.map((e) => e.productoId)).toEqual([id]);
    expect(resumen.rechazados[0].motivo).toBe(MOTIVO.repetido);
    expect(producto(id)).toEqual(antes);
    expect(obtenerBd().select().from(productos).all()).toHaveLength(productosAntes);
  });

  it("US3-2 y FR-014: trae los datos actuales, los del archivo y solo los campos que cambian", async () => {
    const { id } = crearProductoDirecto({ nombre: "Muñeca de trapo" });
    crearOperacionDirecta({ productoId: id, cantidad: 2 });

    const resumen = await cargar([renglon("Muñeca de trapo", { ...MUNECA, existencia: "8", precio_venta: "1300.50" })]);

    expect(resumen.existentes[0]).toMatchObject({
      numero: 2,
      productoId: id,
      actual: { existencia: 5, precioVentaCentavos: 125000, categoria: "Juguetes", subcategoria: null, apartadas: 2, fotos: ["foto.jpg"] },
      archivo: { existencia: 8, precioVentaCentavos: 130050 },
      cambios: ["existencia", "precioVenta"],
      fotosNuevas: [],
    });
  });

  it("US3-8, FR-012: un renglón idéntico sin fotos nuevas cuenta como «Sin cambios»", async () => {
    crearProductoDirecto({ nombre: "Muñeca de trapo" });
    const resumen = await cargar([renglon("MUNECA DE TRAPO", { ...MUNECA, categoria: "juguetes" })]);
    expect(resumen.cantidades.sinCambios).toBe(1);
    expect(resumen.existentes).toEqual([]);
  });

  it("SC-004: al subir dos veces el mismo comprimido, todo queda «Sin cambios» y sin fotos repetidas", async () => {
    const renglones = [renglon("Uno", { fotos: "roja.jpg,azul.png" }), renglon("Dos", { fotos: "Roja.JPG" })];
    const primera = await cargar(renglones);
    expect(primera.cantidades.nuevos).toBe(2);
    const fotosAntes = obtenerBd().select().from(fotos).all().length;

    const segunda = await cargar(renglones);
    expect(segunda.cantidades).toMatchObject({ nuevos: 0, sinCambios: 2, existentes: 0 });
    expect(obtenerBd().select().from(fotos).all()).toHaveLength(fotosAntes);
  });

  it("FR-016: una foto ya cargada, activa o dada de baja, no cuenta como nueva", async () => {
    const { id } = crearProductoDirecto({ nombre: "Muñeca de trapo" });
    obtenerBd().insert(fotos).values({ productoId: id, archivo: "b.jpg", orden: 1, nombreOriginal: "roja.jpg", activo: false }).run();
    const resumen = await cargar([renglon("Muñeca de trapo", { ...MUNECA, fotos: "roja.jpg" })]);
    expect(resumen.cantidades.sinCambios).toBe(1);
  });

  it("FR-016: una foto nueva se guarda en disco pero no se asocia hasta confirmar", async () => {
    const { id } = crearProductoDirecto({ nombre: "Muñeca de trapo" });
    const resumen = await cargar([renglon("Muñeca de trapo", { ...MUNECA, fotos: "azul.png" })]);
    expect(resumen.existentes[0].cambios).toEqual(["fotos"]);
    expect(resumen.existentes[0].fotosNuevas).toEqual([
      { archivo: expect.stringMatching(/^[0-9a-f-]{36}\.png$/), nombreOriginal: "azul.png" },
    ]);
    expect(fotosDe(id)).toHaveLength(1);
  });

  it("avisa las fotos de un existente que no vienen en el comprimido", async () => {
    crearProductoDirecto({ nombre: "Muñeca de trapo" });
    const resumen = await cargar([renglon("Muñeca de trapo", { ...MUNECA, existencia: "9", fotos: "falta.jpg" })]);
    expect(resumen.existentes[0].fotosFaltantes).toEqual([MOTIVO.avisoNoViene("falta.jpg")]);
  });

  describe("confirmación", () => {
    it("US3-3, FR-015 y SC-005: solo cambian los marcados", async () => {
      const ids = ["Uno", "Dos", "Tres"].map((nombre) => crearProductoDirecto({ nombre }).id);
      const antes = ids.map(producto);
      const resumen = await cargar(["Uno", "Dos", "Tres"].map((n) => renglon(n, { ...MUNECA, precio_venta: "999" })));

      const resultados = await confirmarCarga(resumen.existentes.slice(0, 2).map(marcar));
      expect(resultados).toEqual([
        { productoId: ids[0], ok: true },
        { productoId: ids[1], ok: true },
      ]);
      expect(producto(ids[0]).precioVentaCentavos).toBe(99900);
      expect(producto(ids[1]).precioVentaCentavos).toBe(99900);
      expect(producto(ids[2])).toEqual(antes[2]);
    });

    it("US3-4: la existencia se reemplaza, no se suma", async () => {
      const { id } = crearProductoDirecto({ nombre: "Muñeca de trapo", existencia: 5 });
      const resumen = await cargar([renglon("Muñeca de trapo", { ...MUNECA, existencia: "8" })]);
      await confirmarCarga(resumen.existentes.map(marcar));
      expect(producto(id).existencia).toBe(8);
    });

    it("US3-5: agrega las fotos nuevas al final sin quitar ninguna, y no las duplica al repetir", async () => {
      const { id } = crearProductoDirecto({ nombre: "Muñeca de trapo" });
      const resumen = await cargar([renglon("Muñeca de trapo", { ...MUNECA, fotos: "azul.png,roja.jpg" })]);
      const marcados = resumen.existentes.map(marcar);

      await confirmarCarga(marcados);
      await confirmarCarga(marcados);

      const suyas = fotosDe(id);
      expect(suyas.map((f) => [f.archivo === "foto.jpg" ? "foto.jpg" : f.nombreOriginal, f.activo])).toEqual([
        ["foto.jpg", true],
        ["azul.png", true],
        ["roja.jpg", true],
      ]);
    });

    it("US3-6 y FR-017: no deja la existencia por debajo de las apartadas y sigue con los demás", async () => {
      const apartado = crearProductoDirecto({ nombre: "Apartado" });
      crearOperacionDirecta({ productoId: apartado.id, cantidad: 3 });
      const otro = crearProductoDirecto({ nombre: "Otro" });
      const resumen = await cargar([
        renglon("Apartado", { ...MUNECA, existencia: "1" }),
        renglon("Otro", { ...MUNECA, existencia: "1" }),
      ]);

      const resultados = await confirmarCarga(resumen.existentes.map(marcar));
      expect(resultados).toEqual([
        { productoId: apartado.id, ok: false, motivo: MENSAJES.EXISTENCIA_INSUFICIENTE },
        { productoId: otro.id, ok: true },
      ]);
      expect(producto(apartado.id).existencia).toBe(5);
      expect(producto(otro.id).existencia).toBe(1);
    });

    it("US3-7: las operaciones conservan su precio acordado", async () => {
      const { id } = crearProductoDirecto({ nombre: "Muñeca de trapo" });
      const apartado = crearOperacionDirecta({ productoId: id, cantidad: 1 });
      const venta = crearOperacionDirecta({
        productoId: id,
        tipo: "venta",
        estado: "pagada",
        clienteNombre: null,
        clienteNombreNorm: null,
        clienteTelefono: null,
        avisoInformado: false,
      });
      const resumen = await cargar([renglon("Muñeca de trapo", { ...MUNECA, precio_venta: "2000" })]);
      await confirmarCarga(resumen.existentes.map(marcar));

      const precios = obtenerBd().select().from(operaciones).all().map((o) => [o.id, o.precioUnitarioCentavos]);
      expect(precios).toEqual(expect.arrayContaining([[apartado.id, 125000], [venta.id, 125000]]));
      expect(producto(id).precioVentaCentavos).toBe(200000);
    });

    it("US3-9: sin marcados no toca la base", async () => {
      const { id } = crearProductoDirecto({ nombre: "Muñeca de trapo" });
      const antes = producto(id);
      await cargar([renglon("Muñeca de trapo", { ...MUNECA, precio_venta: "2000" })]);
      expect(await confirmarCarga([])).toEqual([]);
      expect(producto(id)).toEqual(antes);
    });

    it("FR-008: crea la categoría nueva del archivo al confirmar", async () => {
      const { id } = crearProductoDirecto({ nombre: "Muñeca de trapo" });
      const resumen = await cargar([renglon("Muñeca de trapo", { ...MUNECA, categoria: "Muñecas finas" })]);
      await confirmarCarga(resumen.existentes.map(marcar));
      const categoria = obtenerBd().select().from(categorias).where(eq(categorias.id, producto(id).categoriaId)).get();
      expect(categoria?.nombre).toBe("Muñecas finas");
      expect(categoriaPorNombre("Juguetes")).toBeDefined();
    });

    describe("research 7: vuelve a validar lo que llega del navegador", () => {
      it("rechaza un producto dado de baja entre procesar y confirmar", async () => {
        const { id } = crearProductoDirecto({ nombre: "Muñeca de trapo" });
        const resumen = await cargar([renglon("Muñeca de trapo", { ...MUNECA, precio_venta: "2000" })]);
        obtenerBd().update(productos).set({ activo: false }).where(eq(productos.id, id)).run();
        expect(await confirmarCarga(resumen.existentes.map(marcar))).toEqual([
          { productoId: id, ok: false, motivo: MOTIVO.productoInactivo },
        ]);
      });

      it("rechaza un nombre que ya corresponde a dos productos", async () => {
        const { id } = crearProductoDirecto({ nombre: "Muñeca de trapo" });
        const resumen = await cargar([renglon("Muñeca de trapo", { ...MUNECA, precio_venta: "2000" })]);
        crearProductoDirecto({ nombre: "MUÑECA DE TRAPO" });
        expect(await confirmarCarga(resumen.existentes.map(marcar))).toEqual([
          { productoId: id, ok: false, motivo: MOTIVO.nombreNoUnico },
        ]);
      });

      it("rechaza campos alterados que no pasan la validación", async () => {
        const { id } = crearProductoDirecto({ nombre: "Muñeca de trapo" });
        const resumen = await cargar([renglon("Muñeca de trapo", { ...MUNECA, precio_venta: "2000" })]);
        const alterado = { ...marcar(resumen.existentes[0]), campos: renglon("Muñeca de trapo", { ...MUNECA, precio_venta: "-1" }) };
        expect(await confirmarCarga([alterado])).toEqual([{ productoId: id, ok: false, motivo: MOTIVO.precioVenta }]);
        expect(producto(id).precioVentaCentavos).toBe(125000);
      });

      it("rechaza una foto que no existe en la carpeta, sin tocar el producto", async () => {
        const { id } = crearProductoDirecto({ nombre: "Muñeca de trapo" });
        const resumen = await cargar([renglon("Muñeca de trapo", { ...MUNECA, fotos: "azul.png", precio_venta: "2000" })]);
        const alterado = {
          ...marcar(resumen.existentes[0]),
          fotosNuevas: [{ archivo: "00000000-0000-0000-0000-000000000000.png", nombreOriginal: "azul.png" }],
        };
        expect(await confirmarCarga([alterado])).toEqual([{ productoId: id, ok: false, motivo: MOTIVO.fotosNoDisponibles }]);
        expect(producto(id).precioVentaCentavos).toBe(125000);
        expect(fotosDe(id)).toHaveLength(1);
      });
    });
  });
});
