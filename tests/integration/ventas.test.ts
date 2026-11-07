import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { crearProductoDirecto, usarBaseTemporal } from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { operaciones, pagos, productos } from "@/db/esquema";
import { obtenerProductoAdmin } from "@/consultas/admin";
import { obtenerProducto } from "@/consultas/publicas";
import { anularVenta, marcarEntregada, registrarVenta } from "@/servicios/operaciones";

const codigo = (valor: string) => expect.objectContaining({ codigo: valor });
const pagosDe = (operacionId: string) =>
  obtenerBd().select().from(pagos).where(eq(pagos.operacionId, operacionId)).all();
const operacion = (id: string) =>
  obtenerBd().select().from(operaciones).where(eq(operaciones.id, id)).get()!;
const existencia = (id: string) =>
  obtenerBd().select().from(productos).where(eq(productos.id, id)).get()!.existencia;

function venta(productoId: string, cambios: Partial<Parameters<typeof registrarVenta>[0]> = {}) {
  return registrarVenta({ avisoInformado: true, productoId, cantidad: 1, precioUnitarioCentavos: 110000, ...cambios });
}

describe("ventas", () => {
  usarBaseTemporal();

  it("FR-018: registra una venta de una o más unidades", () => {
    const producto = crearProductoDirecto({ existencia: 5 });
    const { id } = venta(producto.id, { cantidad: 3 });
    expect(operacion(id)).toMatchObject({ tipo: "venta", estado: "pagada", cantidad: 3 });
  });

  it("FR-018: rechaza una cantidad de cero o fraccionaria", () => {
    const producto = crearProductoDirecto();
    expect(() => venta(producto.id, { cantidad: 0 })).toThrow(codigo("DATOS_INVALIDOS"));
    expect(() => venta(producto.id, { cantidad: 1.5 })).toThrow(codigo("DATOS_INVALIDOS"));
  });

  it("FR-019: guarda el precio acordado sin cambiar el precio de catálogo", () => {
    const producto = crearProductoDirecto({ precioVentaCentavos: 125000 });
    const { id } = venta(producto.id, { precioUnitarioCentavos: 110000 });
    expect(operacion(id).precioUnitarioCentavos).toBe(110000);
    expect(obtenerProducto(producto.id)?.precioVentaCentavos).toBe(125000);
  });

  it("FR-021: acepta una venta sin comprador y crea el pago automático por el total", () => {
    const producto = crearProductoDirecto();
    const { id } = venta(producto.id, { cantidad: 2, precioUnitarioCentavos: 33333 });
    expect(operacion(id)).toMatchObject({ clienteNombre: null, clienteTelefono: null });
    expect(pagosDe(id)).toEqual([expect.objectContaining({ importeCentavos: 66666, anuladoEn: null })]);
  });

  it("FR-021: guarda el comprador cuando se captura", () => {
    const producto = crearProductoDirecto();
    const { id } = venta(producto.id, { clienteNombre: " Ána  López ", clienteTelefono: "55 1234 5678" });
    expect(operacion(id)).toMatchObject({
      clienteNombre: "Ána  López",
      clienteNombreNorm: "ana lopez",
      clienteTelefono: "5512345678",
    });
  });

  it("FR-040: rechaza un teléfono opcional que no tenga 10 dígitos", () => {
    const producto = crearProductoDirecto();
    expect(() => venta(producto.id, { clienteTelefono: "12345" })).toThrow(codigo("DATOS_INVALIDOS"));
    expect(existencia(producto.id)).toBe(5);
  });

  it("FR-023: la disponibilidad baja en N en ambas secciones", () => {
    const producto = crearProductoDirecto({ existencia: 5 });
    venta(producto.id, { cantidad: 2 });
    expect(obtenerProductoAdmin(producto.id)?.disponible).toBe(3);
    expect(obtenerProducto(producto.id)?.disponible).toBe(3);
  });

  it("Caso límite: una cantidad mayor a la disponible se rechaza indicando cuántas hay", () => {
    const producto = crearProductoDirecto({ existencia: 2 });
    expect(() => venta(producto.id, { cantidad: 3 })).toThrow(
      expect.objectContaining({ codigo: "SIN_DISPONIBILIDAD", message: expect.stringContaining("2") }),
    );
    expect(existencia(producto.id)).toBe(2);
    expect(obtenerBd().select().from(operaciones).all()).toHaveLength(0);
  });

  it("FR-011: las unidades apartadas no se pueden vender", () => {
    const producto = crearProductoDirecto({ existencia: 2 });
    obtenerBd()
      .insert(operaciones)
      .values({
        tipo: "apartado",
        estado: "pendiente",
        productoId: producto.id,
        cantidad: 2,
        precioUnitarioCentavos: 100,
        clienteNombre: "Ana",
        clienteNombreNorm: "ana",
        clienteTelefono: "5512345678",
      })
      .run();
    expect(() => venta(producto.id)).toThrow(codigo("SIN_DISPONIBILIDAD"));
  });

  it("FR-038: no se vende un producto dado de baja", () => {
    const producto = crearProductoDirecto({ activo: false });
    expect(() => venta(producto.id)).toThrow(codigo("ESTADO_NO_PERMITE"));
  });

  it("FR-032: marca la venta como entregada una sola vez y no vuelve a descontar", () => {
    const producto = crearProductoDirecto({ existencia: 5 });
    const { id } = venta(producto.id);
    marcarEntregada(id);
    expect(operacion(id).estado).toBe("entregada");
    expect(operacion(id).entregadoEn).not.toBeNull();
    expect(existencia(producto.id)).toBe(4);
    expect(() => marcarEntregada(id)).toThrow(codigo("ESTADO_NO_PERMITE"));
  });

  it("FR-042: anular regresa las unidades, guarda el motivo y conserva el pago", () => {
    const producto = crearProductoDirecto({ existencia: 5 });
    const { id } = venta(producto.id, { cantidad: 2 });
    anularVenta(id, "Se capturó el producto equivocado");
    expect(operacion(id)).toMatchObject({ estado: "anulada", motivo: "Se capturó el producto equivocado" });
    expect(operacion(id).cerradoEn).not.toBeNull();
    expect(existencia(producto.id)).toBe(5);
    expect(obtenerProducto(producto.id)?.disponible).toBe(5);
    expect(pagosDe(id)).toEqual([expect.objectContaining({ importeCentavos: 220000, anuladoEn: null })]);
  });

  it("FR-042: una venta entregada también se puede anular", () => {
    const producto = crearProductoDirecto({ existencia: 5 });
    const { id } = venta(producto.id);
    marcarEntregada(id);
    anularVenta(id, "Error de captura");
    expect(operacion(id).estado).toBe("anulada");
    expect(existencia(producto.id)).toBe(5);
  });

  it("FR-042: el motivo es obligatorio", () => {
    const producto = crearProductoDirecto({ existencia: 5 });
    const { id } = venta(producto.id);
    expect(() => anularVenta(id, "   ")).toThrow(codigo("DATOS_INVALIDOS"));
    expect(operacion(id).estado).toBe("pagada");
    expect(existencia(producto.id)).toBe(4);
  });

  it("FR-042: una venta anulada no se anula dos veces ni se entrega", () => {
    const producto = crearProductoDirecto({ existencia: 5 });
    const { id } = venta(producto.id);
    anularVenta(id, "Error");
    expect(() => anularVenta(id, "Otra vez")).toThrow(codigo("ESTADO_NO_PERMITE"));
    expect(() => marcarEntregada(id)).toThrow(codigo("ESTADO_NO_PERMITE"));
    expect(existencia(producto.id)).toBe(5);
  });
});
