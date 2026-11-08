import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { usarBaseTemporal } from "./arnes";
import { armarComprimido, armarTxt, foto, renglon } from "./ayudantes-carga";
import { obtenerBd } from "@/db/cliente";
import { productos } from "@/db/esquema";
import { ErrorNegocio } from "@/lib/resultado";
import { procesarCarga } from "@/servicios/carga-masiva/procesar";

let llamadas = 0;
vi.mock("@/servicios/productos", async (original) => {
  const modulo = await original<typeof import("@/servicios/productos")>();
  return {
    ...modulo,
    crearProducto: (...argumentos: Parameters<typeof modulo.crearProducto>) => {
      if (++llamadas === 5) throw new ErrorNegocio("DATOS_INVALIDOS", "Falla simulada");
      return modulo.crearProducto(...argumentos);
    },
  };
});

describe("carga masiva: una transacción por producto (research 6)", () => {
  usarBaseTemporal();

  it("caso límite «Se pierde la conexión»: un fallo no deshace los productos ya registrados", async () => {
    llamadas = 0;
    const renglones = Array.from({ length: 7 }, (_, i) => renglon(`Producto ${i + 1}`));
    const resumen = await procesarCarga(
      armarComprimido({ "productos.txt": armarTxt(renglones), "roja.jpg": foto("roja.jpg") }),
    );

    expect(resumen.cantidades.nuevos).toBe(6);
    expect(resumen.rechazados).toEqual([{ numero: 6, campos: renglones[4], motivo: "Falla simulada" }]);
    const nombres = obtenerBd().select().from(productos).where(eq(productos.activo, true)).all().map((p) => p.nombre);
    expect(nombres).toEqual(expect.arrayContaining(["Producto 1", "Producto 4", "Producto 6", "Producto 7"]));
    expect(nombres).not.toContain("Producto 5");
  });
});
