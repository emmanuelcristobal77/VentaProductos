import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { crearProductoDirecto, usarBaseTemporal } from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { respaldar, type AlmacenRespaldo } from "@/lib/respaldo";
import { registrarApartado } from "@/servicios/operaciones";

function almacenEnMemoria(iniciales: string[] = []) {
  const objetos = new Map<string, Buffer>(iniciales.map((ruta) => [ruta, Buffer.alloc(0)]));
  const almacen: AlmacenRespaldo = {
    listar: async (prefijo) => [...objetos.keys()].filter((ruta) => ruta.startsWith(prefijo)),
    subir: async (ruta, contenido) => void objetos.set(ruta, contenido),
    borrar: async (rutas) => rutas.forEach((ruta) => objetos.delete(ruta)),
  };
  return { almacen, objetos };
}

const AHORA = new Date("2026-11-01T12:00:00.000Z");
const COPIA = "base/vende-productos-2026-11-01.sqlite.gz";

describe("respaldos", () => {
  usarBaseTemporal();

  it("T094: la copia restaurada coincide con productos, operaciones y saldos", async () => {
    const producto = crearProductoDirecto({ nombre: "Muñeca" });
    registrarApartado({ avisoInformado: true,
      productoId: producto.id,
      cantidad: 2,
      precioUnitarioCentavos: 12345,
      clienteNombre: "Ana",
      clienteTelefono: "5512345678",
      pagoInicialCentavos: 1000,
    });
    const { almacen, objetos } = almacenEnMemoria();

    await respaldar(obtenerBd(), almacen, AHORA);

    const carpeta = mkdtempSync(path.join(tmpdir(), "restauracion-"));
    const restaurada = path.join(carpeta, "vende-productos.sqlite");
    writeFileSync(restaurada, gunzipSync(objetos.get(COPIA)!));
    const copia = new Database(restaurada, { readonly: true });
    const consulta = "SELECT * FROM operaciones ORDER BY id";
    expect(copia.prepare(consulta).all()).toEqual(obtenerBd().$client.prepare(consulta).all());
    expect(copia.prepare("SELECT * FROM productos").all()).toEqual(
      obtenerBd().$client.prepare("SELECT * FROM productos").all(),
    );
    expect(copia.prepare("SELECT * FROM pagos").all()).toEqual(
      obtenerBd().$client.prepare("SELECT * FROM pagos").all(),
    );
    copia.close();
    rmSync(carpeta, { recursive: true, force: true });
  });

  it("T093: conserva 14 días de copias de la base y borra las anteriores", async () => {
    const dentro = "base/vende-productos-2026-10-18.sqlite.gz";
    const fuera = "base/vende-productos-2026-10-17.sqlite.gz";
    const { almacen, objetos } = almacenEnMemoria([dentro, fuera]);

    await respaldar(obtenerBd(), almacen, AHORA);

    expect(objetos.has(dentro)).toBe(true);
    expect(objetos.has(fuera)).toBe(false);
    expect(objetos.has(COPIA)).toBe(true);
  });

  it("T093: sube solo las fotos nuevas y no borra las anteriores", async () => {
    const carpeta = path.join(process.env.DATOS_DIR!, "fotos");
    mkdirSync(carpeta, { recursive: true });
    writeFileSync(path.join(carpeta, "vieja.webp"), "contenido local");
    writeFileSync(path.join(carpeta, "nueva.webp"), "foto nueva");
    const { almacen, objetos } = almacenEnMemoria(["fotos/vieja.webp", "fotos/retirada.webp"]);

    await respaldar(obtenerBd(), almacen, AHORA);

    expect(objetos.get("fotos/nueva.webp")?.toString()).toBe("foto nueva");
    expect(objetos.get("fotos/vieja.webp")?.length).toBe(0);
    expect(objetos.has("fotos/retirada.webp")).toBe(true);
  });

  it("T093: un fallo al subir no borra las copias anteriores y se propaga", async () => {
    const anterior = "base/vende-productos-2026-10-01.sqlite.gz";
    const { almacen, objetos } = almacenEnMemoria([anterior]);
    almacen.subir = async () => {
      throw new Error("sin conexión");
    };

    await expect(respaldar(obtenerBd(), almacen, AHORA)).rejects.toThrow("sin conexión");
    expect(objetos.has(anterior)).toBe(true);
  });
});
