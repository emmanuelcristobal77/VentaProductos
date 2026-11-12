import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearProductoDirecto, usarBaseTemporal } from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { selloPromocional } from "@/db/esquema";
import { listarCatalogo } from "@/consultas/publicas";
import { MENSAJES_PROMOCION } from "@/dominio/promocion";
import { crearHash } from "@/lib/contrasena";
import { guardarPromocion } from "@/acciones/promocion";
import { iniciarSesion } from "@/acciones/sesion";
import { guardarSello, obtenerSello } from "@/servicios/promocion";

const almacen = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) => (almacen.has(nombre) ? { value: almacen.get(nombre) } : undefined),
    set: (nombre: string, valor: string) => almacen.set(nombre, valor),
    delete: (nombre: string) => almacen.delete(nombre),
  }),
  headers: async () => new Headers({ "x-real-ip": "203.0.113.5" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const BUEN_FIN = { texto: "Buen Fin · Pregunta por tu descuento", color: "rojo", activo: true } as const;
const filas = () => obtenerBd().select().from(selloPromocional).all();

function formulario(datos: Record<string, string>) {
  const f = new FormData();
  for (const [clave, valor] of Object.entries(datos)) f.set(clave, valor);
  return f;
}

describe("sello promocional", () => {
  usarBaseTemporal();

  beforeEach(() => {
    almacen.clear();
    Object.assign(process.env, {
      ADMIN_USUARIO: "vendedor",
      ADMIN_HASH_CONTRASENA: crearHash("correcta"),
      SESION_SECRETO: "secreto-de-prueba-con-al-menos-32-caracteres",
      TELEFONO_NEGOCIO: "5512345678",
    });
  });

  it("Primera vez: sin fila, el sello está desactivado, sin texto y en Rojo", () => {
    expect(obtenerSello()).toEqual({ texto: "", color: "rojo", activo: false });
  });

  it("FR-002: guarda el sello y un segundo guardado reemplaza la misma fila", () => {
    guardarSello(BUEN_FIN);
    expect(obtenerSello()).toEqual(BUEN_FIN);

    guardarSello({ texto: "Venta navideña 🎄", color: "verde", activo: true });
    expect(obtenerSello()).toEqual({ texto: "Venta navideña 🎄", color: "verde", activo: true });
    expect(filas()).toHaveLength(1);
  });

  it("FR-007: desactivar conserva el texto y el color", () => {
    guardarSello(BUEN_FIN);
    guardarSello({ ...BUEN_FIN, activo: false });
    expect(obtenerSello()).toEqual({ ...BUEN_FIN, activo: false });
  });

  it("FR-003: activar con texto vacío da DATOS_INVALIDOS en el campo texto", () => {
    expect(() => guardarSello({ texto: "  ", color: "rojo", activo: true })).toThrow(
      expect.objectContaining({ codigo: "DATOS_INVALIDOS", campos: { texto: MENSAJES_PROMOCION.textoVacio } }),
    );
    expect(filas()).toEqual([]);
  });

  it("FR-004: guarda 40 «👍🏽» sin error de la base", () => {
    const texto = "👍🏽".repeat(40);
    expect(() => guardarSello({ texto, color: "azul", activo: true })).not.toThrow();
    expect(obtenerSello().texto).toBe(texto);
  });

  it("research 2: guarda el texto normalizado, sin espacios al principio ni al final", () => {
    guardarSello({ texto: "  Hola  ", color: "dorado", activo: true });
    expect(obtenerSello().texto).toBe("Hola");
  });

  it("FR-001, Sin sesión: guardarPromocion devuelve NO_AUTORIZADO y no cambia la tabla", async () => {
    const resultado = await guardarPromocion(null, formulario({ texto: "Buen Fin", color: "rojo", activo: "on" }));
    expect(resultado).toMatchObject({ ok: false, codigo: "NO_AUTORIZADO" });
    expect(filas()).toEqual([]);
  });

  it("FR-002: con sesión, guardarPromocion guarda y devuelve lo que quedó guardado", async () => {
    await iniciarSesion(null, formulario({ usuario: "vendedor", contrasena: "correcta" }));
    const resultado = await guardarPromocion(null, formulario({ texto: "  Buen Fin  ", color: "verde", activo: "on" }));
    expect(resultado).toEqual({ ok: true, datos: { texto: "Buen Fin", color: "verde", activo: true } });

    const desactivado = await guardarPromocion(null, formulario({ texto: "", color: "verde" }));
    expect(desactivado).toEqual({ ok: true, datos: { texto: "", color: "verde", activo: false } });
  });

  it("FR-005: con sesión, un color fuera de la lista da el error en campos.color", async () => {
    await iniciarSesion(null, formulario({ usuario: "vendedor", contrasena: "correcta" }));
    const resultado = await guardarPromocion(null, formulario({ texto: "Hola", color: "morado", activo: "on" }));
    expect(resultado).toMatchObject({
      ok: false,
      codigo: "DATOS_INVALIDOS",
      campos: { color: MENSAJES_PROMOCION.colorInvalido },
    });
  });

  it("FR-008: leer el sello varias veces no cambia nada por sí solo", () => {
    guardarSello(BUEN_FIN);
    for (let i = 0; i < 5; i++) expect(obtenerSello()).toEqual(BUEN_FIN);
  });

  it("FR-013: los precios del catálogo son los mismos con el sello activo y desactivado", () => {
    for (let i = 0; i < 5; i++) crearProductoDirecto({ precioVentaCentavos: 100000 + i * 1234 });
    const precios = () =>
      listarCatalogo({}).productos.map((p) => [p.id, p.precioVentaCentavos] as const).sort();

    const sinSello = precios();
    guardarSello(BUEN_FIN);
    const conSello = precios();
    guardarSello({ ...BUEN_FIN, activo: false });

    expect(sinSello).toHaveLength(5);
    expect(conSello).toEqual(sinSello);
    expect(precios()).toEqual(sinSello);
  });
});
