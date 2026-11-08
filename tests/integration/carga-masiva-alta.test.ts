import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { categoriaPorNombre, crearProductoDirecto, usarBaseTemporal } from "./arnes";
import { armarComprimido, armarTxt, foto, renglon } from "./ayudantes-carga";
import { obtenerBd } from "@/db/cliente";
import { categorias, fotos, productos, subcategorias } from "@/db/esquema";
import { MOTIVO, RECHAZO } from "@/dominio/carga-masiva";
import { procesarCarga } from "@/servicios/carga-masiva/procesar";

const activos = () => obtenerBd().select().from(productos).where(eq(productos.activo, true)).all();
const porNombre = (nombre: string) => activos().find((p) => p.nombre === nombre);
const fotosDe = (productoId: string) =>
  obtenerBd()
    .select()
    .from(fotos)
    .where(eq(fotos.productoId, productoId))
    .all()
    .sort((a, b) => a.orden - b.orden);

const FOTOS = { "roja.jpg": foto("roja.jpg"), "azul.png": foto("azul.png"), "verde.webp": foto("verde.webp") };
const cargar = (renglones: string[][], extras: Record<string, Uint8Array | string> = FOTOS) =>
  procesarCarga(armarComprimido({ "productos.txt": armarTxt(renglones), ...extras }));

const rechazoDe = async (promesa: Promise<unknown>) => {
  try {
    await promesa;
  } catch (error) {
    return (error as Error).message;
  }
  return null;
};

describe("carga masiva: alta de productos nuevos", () => {
  usarBaseTemporal();

  describe("US1", () => {
    it("US1-2 y SC-002: registra 10 productos nuevos con sus datos y fotos", async () => {
      const antes = activos().length;
      const renglones = Array.from({ length: 10 }, (_, i) =>
        renglon(`Prueba carga ${i + 1}`, { fotos: "Roja.JPG,azul.png", existencia: String(i), precio_venta: "1250.5" }),
      );
      const resumen = await cargar(renglones);

      expect(resumen.cantidades.nuevos).toBe(10);
      expect(activos().length - antes).toBe(10);
      const producto = porNombre("Prueba carga 4")!;
      expect(producto).toMatchObject({
        descripcion: "Descripción de Prueba carga 4",
        categoriaId: categoriaPorNombre("Juguetes").id,
        existencia: 3,
        precioCompraCentavos: 10000,
        precioVentaCentavos: 125050,
      });
      const suyas = fotosDe(producto.id);
      expect(suyas.map((f) => f.nombreOriginal)).toEqual(["roja.jpg", "azul.png"]);
      expect(suyas[0].archivo).toMatch(/^[0-9a-f-]{36}\.jpg$/);
      expect(suyas[1].archivo).toMatch(/^[0-9a-f-]{36}\.png$/);
    });

    it("US1-3 y FR-008: crea la categoría y la subcategoría que no existen", async () => {
      await cargar([renglon("Cuaderno", { categoria: "Papelería", subcategoria: "Cuadernos" })]);
      const producto = porNombre("Cuaderno")!;
      const categoria = obtenerBd().select().from(categorias).where(eq(categorias.id, producto.categoriaId)).get();
      const subcategoria = obtenerBd().select().from(subcategorias).where(eq(subcategorias.id, producto.subcategoriaId!)).get();
      expect(categoria?.nombre).toBe("Papelería");
      expect(subcategoria?.nombre).toBe("Cuadernos");
    });

    it("caso límite «Subcategoría que no pertenece»: la crea en la categoría indicada", async () => {
      await cargar([renglon("Mameluco", { categoria: "Ropa", subcategoria: "Bebés" })]);
      const producto = porNombre("Mameluco")!;
      const subcategoria = obtenerBd().select().from(subcategorias).where(eq(subcategorias.id, producto.subcategoriaId!)).get();
      expect(subcategoria).toMatchObject({ nombre: "Bebés", categoriaId: categoriaPorNombre("Ropa").id });
    });

    it("US1-4: «juguetes» usa la categoría existente y no crea otra", async () => {
      const cuantas = obtenerBd().select().from(categorias).all().length;
      await cargar([renglon("Pelota", { categoria: "juguetes", subcategoria: "ninas" })]);
      expect(obtenerBd().select().from(categorias).all()).toHaveLength(cuantas);
      expect(porNombre("Pelota")?.categoriaId).toBe(categoriaPorNombre("Juguetes").id);
    });

    it("US1-5 y FR-007: rechaza los inválidos con su renglón y motivo, y registra los demás", async () => {
      const resumen = await cargar([
        renglon("Bueno 1"),
        renglon("Precio cero", { precio_venta: "0" }),
        renglon("", { descripcion: "Sin nombre" }),
        renglon("Bueno 2"),
      ]);
      expect(resumen.cantidades.nuevos).toBe(2);
      expect(resumen.rechazados).toEqual([
        { numero: 3, campos: renglon("Precio cero", { precio_venta: "0" }), motivo: MOTIVO.precioVenta },
        { numero: 4, campos: renglon("", { descripcion: "Sin nombre" }), motivo: MOTIVO.sinNombre },
      ]);
      expect(porNombre("Precio cero")).toBeUndefined();
    });

    it("caso límite «Renglón repetido»: procesa el primero y rechaza el segundo", async () => {
      const resumen = await cargar([renglon("Muñeca de trapo"), renglon("MUNECA DE TRAPO")]);
      expect(resumen.cantidades.nuevos).toBe(1);
      expect(resumen.rechazados).toEqual([{ numero: 3, campos: renglon("MUNECA DE TRAPO"), motivo: MOTIVO.repetido }]);
    });

    it("FR-009: un nombre que coincide con dos productos activos se rechaza", async () => {
      crearProductoDirecto({ nombre: "Gemelo" });
      crearProductoDirecto({ nombre: "gemelo" });
      const resumen = await cargar([renglon("Gemelo")]);
      expect(resumen.rechazados[0].motivo).toBe(MOTIVO.ambiguo);
      expect(activos().filter((p) => p.nombre.toLowerCase() === "gemelo")).toHaveLength(2);
    });

    it("caso límite «Producto dado de baja»: no cuenta como existente", async () => {
      crearProductoDirecto({ nombre: "Retirado", activo: false });
      const resumen = await cargar([renglon("Retirado")]);
      expect(resumen.cantidades.nuevos).toBe(1);
      expect(porNombre("Retirado")?.activo).toBe(true);
    });

    it("caso límite «Existencia»: acepta cero", async () => {
      await cargar([renglon("Agotado", { existencia: "0" })]);
      expect(porNombre("Agotado")?.existencia).toBe(0);
    });

    it("rechaza la categoría «Todos» y sigue con la carga", async () => {
      const resumen = await cargar([renglon("Reservado", { categoria: "Todos" }), renglon("Normal")]);
      expect(resumen.rechazados[0].motivo).toBe(MOTIVO.todos);
      expect(resumen.cantidades.nuevos).toBe(1);
    });

    it.each([
      ["sin .txt", { "roja.jpg": foto("roja.jpg") }, RECHAZO.sinTxt],
      ["encabezado incorrecto", { "p.txt": "nombre|precio\nA|1\n" }, `${RECHAZO.encabezado}\nFalta la columna «descripcion».`],
    ])("US1-6: %s no registra nada", async (_, entradas, mensaje) => {
      const antes = activos().length;
      const categoriasAntes = obtenerBd().select().from(categorias).all().length;
      expect(await rechazoDe(procesarCarga(armarComprimido(entradas)))).toContain(mensaje.split("\n")[0]);
      expect(activos()).toHaveLength(antes);
      expect(obtenerBd().select().from(categorias).all()).toHaveLength(categoriasAntes);
    });

    it("US1-6: más de 200 renglones no registra nada", async () => {
      const renglones = Array.from({ length: 201 }, (_, i) => renglon(`P${i}`, { categoria: "Nueva" }));
      expect(await rechazoDe(cargar(renglones))).toBe(RECHAZO.demasiados(201));
      expect(porNombre("P0")).toBeUndefined();
    });

    it("FR-013: trae las seis cantidades y la suma de renglones cuadra", async () => {
      crearProductoDirecto({ nombre: "Existente" });
      const resumen = await cargar(
        [renglon("Nuevo"), renglon("Sin foto", { fotos: "" }), renglon("Existente", { existencia: "9" }), renglon("Malo", { existencia: "x" })],
        { ...FOTOS, "sobra.jpg": foto("roja.jpg") },
      );
      expect(resumen.cantidades).toEqual({ nuevos: 1, sinFoto: 1, existentes: 1, sinCambios: 0, rechazados: 1, fotosNoUsadas: 3 });
      const { nuevos, sinFoto, existentes, sinCambios, rechazados } = resumen.cantidades;
      expect(nuevos + sinFoto + existentes + sinCambios + rechazados).toBe(4);
      expect(new Date(resumen.fecha).toISOString()).toBe(resumen.fecha);
    });
  });

  describe("US2", () => {
    it("US2-1: sin foto indicada no se registra", async () => {
      const resumen = await cargar([renglon("Sin foto", { fotos: "" })]);
      expect(resumen.sinFoto).toEqual([{ numero: 2, campos: renglon("Sin foto", { fotos: "" }), motivo: MOTIVO.sinFoto }]);
      expect(porNombre("Sin foto")).toBeUndefined();
    });

    it("US2-2 y SC-003: la foto que no viene en el comprimido", async () => {
      const resumen = await cargar([renglon("Uno"), renglon("Dos", { fotos: "azul.png" }), renglon("Tres", { fotos: "falta.jpg" })]);
      expect(resumen.cantidades.nuevos).toBe(2);
      expect(resumen.sinFoto.map((r) => r.motivo)).toEqual(["La foto no viene en el comprimido: falta.jpg"]);
      expect(porNombre("Tres")).toBeUndefined();
    });

    it("US2-3 y FR-005: la foto que no es una imagen válida", async () => {
      const resumen = await cargar([renglon("Falsa", { fotos: "no-es-imagen.jpg" })], { "no-es-imagen.jpg": foto("no-es-imagen.jpg") });
      expect(resumen.sinFoto[0].motivo).toBe("La foto no es una imagen válida: no-es-imagen.jpg");
      expect(porNombre("Falsa")).toBeUndefined();
    });

    it("FR-011: sin ninguna foto válida, el motivo es el de la primera", async () => {
      const resumen = await cargar([renglon("Varias", { fotos: "falta.jpg,no-es-imagen.jpg" })], {
        "no-es-imagen.jpg": foto("no-es-imagen.jpg"),
      });
      expect(resumen.sinFoto[0].motivo).toBe(MOTIVO.fotoNoViene("falta.jpg"));
    });

    it("US2-4: con una foto válida se registra y avisa cuáles faltaron", async () => {
      const resumen = await cargar([renglon("Media", { fotos: "falta.jpg,roja.jpg" })]);
      expect(resumen.cantidades.nuevos).toBe(1);
      expect(fotosDe(porNombre("Media")!.id).map((f) => f.nombreOriginal)).toEqual(["roja.jpg"]);
      expect(resumen.avisosFotos).toEqual([{ numero: 2, nombre: "Media", avisos: ["No viene en el comprimido: falta.jpg"] }]);
    });

    it("US2-5: al subirlos otra vez con su foto, se registran", async () => {
      await cargar([renglon("Tarde", { fotos: "verde.webp" })], {});
      expect(porNombre("Tarde")).toBeUndefined();
      const resumen = await cargar([renglon("Tarde", { fotos: "verde.webp" })]);
      expect(resumen.cantidades.nuevos).toBe(1);
      expect(porNombre("Tarde")).toBeDefined();
    });

    it("SC-004 (alta): subir dos veces lo mismo no crea productos ni fotos nuevas", async () => {
      const renglones = [renglon("Una vez", { fotos: "roja.jpg,azul.png" })];
      await cargar(renglones);
      const productosAntes = activos().length;
      const fotosAntes = obtenerBd().select().from(fotos).all().length;

      const resumen = await cargar(renglones);
      expect(resumen.cantidades.nuevos).toBe(0);
      expect(activos()).toHaveLength(productosAntes);
      expect(obtenerBd().select().from(fotos).all()).toHaveLength(fotosAntes);
    });
  });
});
