import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { crearProductoDirecto, usarBaseTemporal } from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { operaciones, pagos } from "@/db/esquema";
import { obtenerOperacionAdmin } from "@/consultas/admin";
import {
  cancelarOperacion,
  corregirOperacion,
  marcarEntregada,
  registrarApartado,
  registrarVenta,
} from "@/servicios/operaciones";
import { anularPago, registrarPago } from "@/servicios/pagos";

const codigo = (valor: string) => expect.objectContaining({ codigo: valor });
const detalle = (id: string) => obtenerOperacionAdmin(id)!;
const pagosDe = (id: string) =>
  obtenerBd().select().from(pagos).where(eq(pagos.operacionId, id)).all();

/** Un apartado de una unidad: su total es el precio. */
function apartado(totalCentavos: number, pagoInicialCentavos: number) {
  const producto = crearProductoDirecto({ existencia: 50 });
  return registrarApartado({
    productoId: producto.id,
    cantidad: 1,
    precioUnitarioCentavos: totalCentavos,
    clienteNombre: "Ana López",
    clienteTelefono: "5512345678",
    pagoInicialCentavos,
  });
}

const correccion = (precioUnitarioCentavos: number) => ({
  clienteNombre: "Ana López",
  clienteTelefono: "5512345678",
  precioUnitarioCentavos,
});

describe("pagos", () => {
  usarBaseTemporal();

  it("FR-028: registra pagos sucesivos con importe, fecha y hora", () => {
    const { id } = apartado(50000, 10000);
    registrarPago(id, 15000);
    const registrados = pagosDe(id);
    expect(registrados.map((p) => p.importeCentavos)).toEqual([10000, 15000]);
    expect(new Date(registrados[1].fecha).toISOString()).toBe(registrados[1].fecha);
    expect(detalle(id)).toMatchObject({ totalCentavos: 50000, pagadoCentavos: 25000, saldoCentavos: 25000 });
  });

  it("FR-030: rechaza un pago mayor al saldo e indica el saldo", () => {
    const { id } = apartado(20000, 10000);
    expect(() => registrarPago(id, 15000)).toThrow(
      expect.objectContaining({
        codigo: "PAGO_EXCEDE_SALDO",
        message: expect.stringContaining("$100.00 MXN"),
      }),
    );
    expect(pagosDe(id)).toHaveLength(1);
  });

  it("Caso límite: rechaza importes en cero, negativos o fraccionarios", () => {
    const { id } = apartado(20000, 10000);
    expect(() => registrarPago(id, 0)).toThrow(codigo("DATOS_INVALIDOS"));
    expect(() => registrarPago(id, -5)).toThrow(codigo("DATOS_INVALIDOS"));
    expect(() => registrarPago(id, 1.5)).toThrow(codigo("DATOS_INVALIDOS"));
  });

  it("FR-031: un pago que cubre exactamente el total cambia a Pagado", () => {
    const { id } = apartado(20000, 10000);
    registrarPago(id, 10000);
    expect(detalle(id)).toMatchObject({ estado: "pagado", saldoCentavos: 0 });
  });

  it("FR-030: una operación Pagada no admite más pagos", () => {
    const { id } = apartado(20000, 20000);
    expect(() => registrarPago(id, 1)).toThrow(codigo("PAGO_EXCEDE_SALDO"));
  });

  it("FR-034: anular un pago recalcula saldo y estado", () => {
    const { id } = apartado(20000, 10000);
    registrarPago(id, 10000);
    const ultimo = pagosDe(id)[1];
    anularPago(ultimo.id);
    expect(detalle(id)).toMatchObject({ estado: "pendiente", pagadoCentavos: 10000, saldoCentavos: 10000 });
    expect(pagosDe(id)[1].anuladoEn).not.toBeNull();
  });

  it("FR-034: un pago anulado no se anula dos veces", () => {
    const { id } = apartado(20000, 10000);
    const [pago] = pagosDe(id);
    anularPago(pago.id);
    expect(() => anularPago(pago.id)).toThrow(codigo("ESTADO_NO_PERMITE"));
  });

  it("FR-034: se rechaza anular un pago de una operación entregada o cancelada", () => {
    const entregada = apartado(20000, 20000);
    marcarEntregada(entregada.id);
    expect(() => anularPago(pagosDe(entregada.id)[0].id)).toThrow(codigo("ESTADO_NO_PERMITE"));

    const cancelada = apartado(20000, 10000);
    cancelarOperacion(cancelada.id, "Motivo");
    expect(() => anularPago(pagosDe(cancelada.id)[0].id)).toThrow(codigo("ESTADO_NO_PERMITE"));
  });

  it("FR-034: el pago automático de una venta no se anula por separado", () => {
    const producto = crearProductoDirecto();
    const { id } = registrarVenta({ productoId: producto.id, cantidad: 1, precioUnitarioCentavos: 100 });
    expect(() => anularPago(pagosDe(id)[0].id)).toThrow(codigo("ESTADO_NO_PERMITE"));
  });

  it("FR-028: una venta no admite pagos", () => {
    const producto = crearProductoDirecto();
    const { id } = registrarVenta({ productoId: producto.id, cantidad: 1, precioUnitarioCentavos: 100 });
    expect(() => registrarPago(id, 1)).toThrow(codigo("ESTADO_NO_PERMITE"));
  });

  it("FR-043: un total menor a lo pagado da PRECIO_MENOR_A_PAGADO", () => {
    const { id } = apartado(50000, 30000);
    expect(() => corregirOperacion(id, correccion(20000))).toThrow(codigo("PRECIO_MENOR_A_PAGADO"));
    expect(detalle(id).totalCentavos).toBe(50000);
  });

  it("FR-043: corregir el precio recalcula el saldo", () => {
    const { id } = apartado(50000, 30000);
    corregirOperacion(id, correccion(40000));
    expect(detalle(id)).toMatchObject({ totalCentavos: 40000, saldoCentavos: 10000, estado: "pendiente" });
  });

  it("FR-043: subir el precio regresa de Pagado a Pendiente", () => {
    const { id } = apartado(30000, 30000);
    corregirOperacion(id, correccion(50000));
    expect(detalle(id)).toMatchObject({ estado: "pendiente", saldoCentavos: 20000 });
  });

  it("FR-043: un total igual a lo pagado pasa a Pagado", () => {
    const { id } = apartado(50000, 30000);
    corregirOperacion(id, correccion(30000));
    expect(detalle(id)).toMatchObject({ estado: "pagado", saldoCentavos: 0 });
  });

  it("FR-043: el total usa la cantidad, no solo el precio", () => {
    const producto = crearProductoDirecto({ existencia: 5 });
    const { id } = registrarApartado({
      productoId: producto.id,
      cantidad: 3,
      precioUnitarioCentavos: 10000,
      clienteNombre: "Ana",
      clienteTelefono: "5512345678",
      pagoInicialCentavos: 25000,
    });
    expect(() => corregirOperacion(id, correccion(8000))).toThrow(codigo("PRECIO_MENOR_A_PAGADO"));
    corregirOperacion(id, correccion(9000));
    expect(detalle(id)).toMatchObject({ totalCentavos: 27000, saldoCentavos: 2000 });
  });

  it("FR-043: corrige nombre y teléfono, y actualiza el nombre normalizado", () => {
    const { id } = apartado(50000, 10000);
    corregirOperacion(id, {
      clienteNombre: "Beatriz Núñez",
      clienteTelefono: "55-8765-4321",
      precioUnitarioCentavos: 50000,
    });
    const fila = obtenerBd().select().from(operaciones).where(eq(operaciones.id, id)).get()!;
    expect(fila).toMatchObject({
      clienteNombre: "Beatriz Núñez",
      clienteNombreNorm: "beatriz nunez",
      clienteTelefono: "5587654321",
    });
  });

  it("FR-043: no se corrige una operación entregada, cancelada ni una venta", () => {
    const entregada = apartado(20000, 20000);
    marcarEntregada(entregada.id);
    expect(() => corregirOperacion(entregada.id, correccion(20000))).toThrow(codigo("ESTADO_NO_PERMITE"));

    const cancelada = apartado(20000, 10000);
    cancelarOperacion(cancelada.id, "Motivo");
    expect(() => corregirOperacion(cancelada.id, correccion(20000))).toThrow(codigo("ESTADO_NO_PERMITE"));

    const producto = crearProductoDirecto();
    const venta = registrarVenta({ productoId: producto.id, cantidad: 1, precioUnitarioCentavos: 100 });
    expect(() => corregirOperacion(venta.id, correccion(100))).toThrow(codigo("ESTADO_NO_PERMITE"));
  });

  it("SC-005: 20 operaciones con pagos parciales coinciden al centavo con una suma manual", () => {
    for (let n = 1; n <= 20; n++) {
      const total = 10001 * n + 7;
      const abonos = [1, 33, 777 * n, 1999].filter((a) => a < total);
      const { id } = apartado(total, abonos[0]);
      for (const abono of abonos.slice(1)) registrarPago(id, abono);

      let suma = 0;
      for (const abono of abonos) suma += abono;
      expect(detalle(id)).toMatchObject({ pagadoCentavos: suma, saldoCentavos: total - suma });
    }
  });
});
