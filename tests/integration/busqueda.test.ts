import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { crearProductoDirecto, usarBaseTemporal } from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { pagos } from "@/db/esquema";
import { buscarOperaciones } from "@/consultas/admin";
import {
  anularVenta,
  cancelarOperacion,
  registrarApartado,
  registrarEncargo,
  registrarVenta,
} from "@/servicios/operaciones";
import { anularPago } from "@/servicios/pagos";

const codigo = (valor: string) => expect.objectContaining({ codigo: valor });
const ids = (filtro: Parameters<typeof buscarOperaciones>[0]) =>
  buscarOperaciones(filtro).map((o) => o.id).sort();

function fecharPagos(operacionId: string, fecha: string) {
  obtenerBd().update(pagos).set({ fecha }).where(eq(pagos.operacionId, operacionId)).run();
}

function apartado(productoId: string, clienteNombre: string, clienteTelefono: string, fecha: string) {
  const { id } = registrarApartado({ avisoInformado: true,
    productoId,
    cantidad: 1,
    precioUnitarioCentavos: 10000,
    clienteNombre,
    clienteTelefono,
    pagoInicialCentavos: 1000,
  });
  fecharPagos(id, fecha);
  return id;
}

describe("búsqueda de operaciones", () => {
  usarBaseTemporal();

  it("FR-036: busca por rango de fechas de pago", () => {
    const producto = crearProductoDirecto({ existencia: 10 });
    const octubre = apartado(producto.id, "Ana", "5512345678", "2026-10-15T18:00:00.000Z");
    apartado(producto.id, "Bety", "5587654321", "2026-11-15T18:00:00.000Z");
    expect(ids({ desde: "2026-10-01", hasta: "2026-10-31" })).toEqual([octubre]);
  });

  it("FR-036: acepta un rango abierto por cualquier lado", () => {
    const producto = crearProductoDirecto({ existencia: 10 });
    const antes = apartado(producto.id, "Ana", "5512345678", "2026-10-15T18:00:00.000Z");
    const despues = apartado(producto.id, "Bety", "5587654321", "2026-11-15T18:00:00.000Z");
    expect(ids({ desde: "2026-11-01" })).toEqual([despues]);
    expect(ids({ hasta: "2026-10-31" })).toEqual([antes]);
  });

  it("FR-036: el rango se interpreta en hora del centro de México", () => {
    const producto = crearProductoDirecto({ existencia: 10 });
    // 11:30 p. m. del 31 de octubre en México, que ya es 1 de noviembre en UTC.
    const noche = apartado(producto.id, "Ana", "5512345678", "2026-11-01T05:30:00.000Z");
    // 12:30 a. m. del 1 de noviembre en México.
    const madrugada = apartado(producto.id, "Bety", "5587654321", "2026-11-01T06:30:00.000Z");
    expect(ids({ desde: "2026-10-31", hasta: "2026-10-31" })).toEqual([noche]);
    expect(ids({ desde: "2026-11-01", hasta: "2026-11-01" })).toEqual([madrugada]);
  });

  it("FR-036: una operación con varios pagos en el rango aparece una sola vez", () => {
    const producto = crearProductoDirecto({ existencia: 10 });
    const id = apartado(producto.id, "Ana", "5512345678", "2026-10-15T18:00:00.000Z");
    obtenerBd()
      .insert(pagos)
      .values({ operacionId: id, importeCentavos: 1, fecha: "2026-10-16T18:00:00.000Z" })
      .run();
    expect(ids({ desde: "2026-10-01", hasta: "2026-10-31" })).toEqual([id]);
  });

  it("FR-036: los pagos anulados no cuentan para el rango", () => {
    const producto = crearProductoDirecto({ existencia: 10 });
    const id = apartado(producto.id, "Ana", "5512345678", "2026-10-15T18:00:00.000Z");
    const [pago] = obtenerBd().select().from(pagos).where(eq(pagos.operacionId, id)).all();
    anularPago(pago.id);
    expect(ids({ desde: "2026-10-01", hasta: "2026-10-31" })).toEqual([]);
  });

  it("FR-036: busca por nombre completo o parcial", () => {
    const producto = crearProductoDirecto({ existencia: 10 });
    const ana = apartado(producto.id, "Ana María López", "5512345678", "2026-10-15T18:00:00.000Z");
    apartado(producto.id, "Beatriz", "5587654321", "2026-10-15T18:00:00.000Z");
    expect(ids({ nombre: "Ana María López" })).toEqual([ana]);
    expect(ids({ nombre: "maria" })).toEqual([ana]);
  });

  it("FR-037: el nombre ignora mayúsculas, acentos y espacios", () => {
    const producto = crearProductoDirecto({ existencia: 10 });
    const id = apartado(producto.id, "José Núñez", "5512345678", "2026-10-15T18:00:00.000Z");
    expect(ids({ nombre: "  JOSE   nunez " })).toEqual([id]);
  });

  it("FR-037: un % o _ en la búsqueda es texto, no un comodín", () => {
    const producto = crearProductoDirecto({ existencia: 10 });
    apartado(producto.id, "Ana", "5512345678", "2026-10-15T18:00:00.000Z");
    expect(ids({ nombre: "%" })).toEqual([]);
    expect(ids({ nombre: "a_a" })).toEqual([]);
  });

  it("FR-037: el teléfono se compara por sus dígitos", () => {
    const producto = crearProductoDirecto({ existencia: 10 });
    const id = apartado(producto.id, "Ana", "5512345678", "2026-10-15T18:00:00.000Z");
    apartado(producto.id, "Bety", "5587654321", "2026-10-15T18:00:00.000Z");
    expect(ids({ telefono: "55 1234-5678" })).toEqual([id]);
  });

  it("FR-036: combina criterios", () => {
    const producto = crearProductoDirecto({ existencia: 10 });
    const buscada = apartado(producto.id, "Ana", "5512345678", "2026-10-15T18:00:00.000Z");
    apartado(producto.id, "Ana", "5587654321", "2026-10-15T18:00:00.000Z");
    apartado(producto.id, "Ana", "5512345678", "2026-11-15T18:00:00.000Z");
    expect(
      ids({ nombre: "ana", telefono: "5512345678", desde: "2026-10-01", hasta: "2026-10-31" }),
    ).toEqual([buscada]);
  });

  it("US7-4: encuentra por fecha una venta sin comprador", () => {
    const producto = crearProductoDirecto();
    const { id } = registrarVenta({ avisoInformado: true, productoId: producto.id, cantidad: 1, precioUnitarioCentavos: 100 });
    fecharPagos(id, "2026-10-15T18:00:00.000Z");
    expect(ids({ desde: "2026-10-15", hasta: "2026-10-15" })).toEqual([id]);
    expect(ids({ nombre: "ana" })).toEqual([]);
  });

  it("FR-042: una venta anulada sigue apareciendo por fecha", () => {
    const producto = crearProductoDirecto();
    const { id } = registrarVenta({ avisoInformado: true, productoId: producto.id, cantidad: 1, precioUnitarioCentavos: 100 });
    fecharPagos(id, "2026-10-15T18:00:00.000Z");
    anularVenta(id, "Error");
    expect(buscarOperaciones({ desde: "2026-10-15", hasta: "2026-10-15" })).toEqual([
      expect.objectContaining({ id, estado: "anulada" }),
    ]);
  });

  it("FR-036: las canceladas son visibles y una persona ve todas sus operaciones", () => {
    const producto = crearProductoDirecto({ existencia: 10 });
    const cancelada = apartado(producto.id, "Ana", "5512345678", "2026-10-15T18:00:00.000Z");
    cancelarOperacion(cancelada, "Motivo");
    const vigente = apartado(producto.id, "Ana", "5512345678", "2026-10-16T18:00:00.000Z");
    const articulo = registrarEncargo({ avisoInformado: true,
      origen: { articuloNuevo: { nombre: "Tren", descripcion: "Eléctrico" } },
      cantidad: 1,
      precioUnitarioCentavos: 100,
      clienteNombre: "Ana",
      clienteTelefono: "5512345678",
      pagoInicialCentavos: 100,
    });
    expect(ids({ telefono: "5512345678" })).toEqual([cancelada, vigente, articulo.id].sort());
  });

  it("FR-040: rechaza un teléfono incompleto y fechas inválidas", () => {
    expect(() => buscarOperaciones({ telefono: "123" })).toThrow(codigo("DATOS_INVALIDOS"));
    expect(() => buscarOperaciones({ desde: "2026-13-45" })).toThrow(codigo("DATOS_INVALIDOS"));
    expect(() => buscarOperaciones({ desde: "2026-11-02", hasta: "2026-11-01" })).toThrow(
      codigo("DATOS_INVALIDOS"),
    );
  });
});
