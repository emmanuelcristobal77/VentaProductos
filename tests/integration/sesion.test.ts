import { beforeEach, describe, expect, it, vi } from "vitest";
import { usarBaseTemporal } from "./arnes";
import { crearHash } from "@/lib/contrasena";
import { guardarCategoria } from "@/acciones/categorias";
import { iniciarSesion } from "@/acciones/sesion";

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

function formulario(usuario: string, contrasena: string) {
  const datos = new FormData();
  datos.set("usuario", usuario);
  datos.set("contrasena", contrasena);
  return datos;
}

describe("acceso de administrador", () => {
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

  it("FR-001: inicia sesión con la credencial correcta", async () => {
    const resultado = await iniciarSesion(null, formulario("vendedor", "correcta"));
    expect(resultado.ok).toBe(true);
    expect(almacen.size).toBe(1);
  });

  it("FR-001: rechaza una contraseña incorrecta sin revelar qué dato falló", async () => {
    const resultado = await iniciarSesion(null, formulario("vendedor", "incorrecta"));
    expect(resultado).toMatchObject({ ok: false, mensaje: "Usuario o contraseña incorrectos." });
    expect(almacen.size).toBe(0);
  });

  it("FR-044: 5 fallos en 15 minutos activan DEMASIADOS_INTENTOS, aun con la clave correcta", async () => {
    for (let i = 0; i < 5; i++) await iniciarSesion(null, formulario("vendedor", "incorrecta"));
    const resultado = await iniciarSesion(null, formulario("vendedor", "correcta"));
    expect(resultado).toMatchObject({ ok: false, codigo: "DEMASIADOS_INTENTOS" });
  });

  it("FR-001: una acción sin sesión da NO_AUTORIZADO", async () => {
    const datos = new FormData();
    datos.set("nombre", "Zapatos");
    const resultado = await guardarCategoria(null, datos);
    expect(resultado).toMatchObject({ ok: false, codigo: "NO_AUTORIZADO" });
  });
});
