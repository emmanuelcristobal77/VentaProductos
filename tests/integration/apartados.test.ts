import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { crearProductoDirecto, usarBaseTemporal } from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { operaciones, pagos, productos } from "@/db/esquema";
import { obtenerProducto } from "@/consultas/publicas";
import {
  cancelarOperacion,
  marcarEntregada,
  registrarApartado,
  registrarVenta,
  type DatosPedido,
} from "@/servicios/operaciones";
import { registrarPago } from "@/servicios/pagos";

const codigo = (valor: string) => expect.objectContaining({ codigo: valor });
const operacion = (id: string) =>
  obtenerBd().select().from(operaciones).where(eq(operaciones.id, id)).get()!;
const existencia = (id: string) =>
  obtenerBd().select().from(productos).where(eq(productos.id, id)).get()!.existencia;
const disponible = (id: string) => obtenerProducto(id)?.disponible;

function apartado(productoId: string, cambios: Partial<DatosPedido> = {}) {
  return registrarApartado({
    productoId,
    cantidad: 2,
    precioUnitarioCentavos: 25000,
    clienteNombre: "Ana López",
    clienteTelefono: "5512345678",
    pagoInicialCentavos: 10000,
    ...cambios,
  });
}

describe("apartados", () => {
  usarBaseTemporal();

  it.each([
    ["nombre", { clienteNombre: "   " }],
    ["teléfono", { clienteTelefono: "" }],
    ["pago inicial en cero", { pagoInicialCentavos: 0 }],
  ])("FR-022: exige %s", (_dato, cambios) => {
    const producto = crearProductoDirecto();
    expect(() => apartado(producto.id, cambios)).toThrow(codigo("DATOS_INVALIDOS"));
    expect(obtenerBd().select().from(operaciones).all()).toHaveLength(0);
  });

  it("FR-022: indica qué datos faltan", () => {
    const producto = crearProductoDirecto();
    expect(() =>
      apartado(producto.id, { clienteNombre: "", clienteTelefono: "", pagoInicialCentavos: 0 }),
    ).toThrow(
      expect.objectContaining({
        campos: expect.objectContaining({
          clienteNombre: expect.any(String),
          clienteTelefono: expect.any(String),
          pagoInicial: expect.any(String),
        }),
      }),
    );
  });

  it("FR-040: rechaza un teléfono que no tenga 10 dígitos", () => {
    const producto = crearProductoDirecto();
    expect(() => apartado(producto.id, { clienteTelefono: "123" })).toThrow(codigo("DATOS_INVALIDOS"));
  });

  it("FR-011: un apartado de 2 sobre 5 existentes deja 3 disponibles sin tocar la existencia", () => {
    const producto = crearProductoDirecto({ existencia: 5 });
    apartado(producto.id);
    expect(disponible(producto.id)).toBe(3);
    expect(existencia(producto.id)).toBe(5);
  });

  it("FR-011: se rechaza un apartado mayor a lo disponible, contando otros apartados", () => {
    const producto = crearProductoDirecto({ existencia: 3 });
    apartado(producto.id);
    expect(() => apartado(producto.id)).toThrow(
      expect.objectContaining({ codigo: "SIN_DISPONIBILIDAD", message: expect.stringContaining("1") }),
    );
  });

  it("FR-030: un pago inicial mayor al total se rechaza", () => {
    const producto = crearProductoDirecto();
    expect(() => apartado(producto.id, { pagoInicialCentavos: 50001 })).toThrow(codigo("PAGO_EXCEDE_SALDO"));
    expect(obtenerBd().select().from(operaciones).all()).toHaveLength(0);
  });

  it("Caso límite: un pago inicial que cubre el total nace Pagado", () => {
    const producto = crearProductoDirecto();
    const { id } = apartado(producto.id, { pagoInicialCentavos: 50000 });
    expect(operacion(id).estado).toBe("pagado");
  });

  it("FR-032: la entrega con saldo da SALDO_PENDIENTE", () => {
    const producto = crearProductoDirecto();
    const { id } = apartado(producto.id);
    expect(() => marcarEntregada(id)).toThrow(codigo("SALDO_PENDIENTE"));
    expect(operacion(id).estado).toBe("pendiente");
  });

  it("FR-033: entregar baja la existencia sin alterar la disponibilidad", () => {
    const producto = crearProductoDirecto({ existencia: 5 });
    const { id } = apartado(producto.id, { pagoInicialCentavos: 50000 });
    expect(disponible(producto.id)).toBe(3);
    marcarEntregada(id);
    expect(operacion(id).estado).toBe("entregado");
    expect(existencia(producto.id)).toBe(3);
    expect(disponible(producto.id)).toBe(3);
  });

  it("FR-033: un apartado entregado no se entrega dos veces", () => {
    const producto = crearProductoDirecto({ existencia: 5 });
    const { id } = apartado(producto.id, { pagoInicialCentavos: 50000 });
    marcarEntregada(id);
    expect(() => marcarEntregada(id)).toThrow(codigo("ESTADO_NO_PERMITE"));
    expect(existencia(producto.id)).toBe(3);
  });

  it.each([
    ["Pendiente", 10000],
    ["Pagado", 50000],
  ])("FR-027: cancelar desde %s regresa las unidades y conserva los pagos", (_estado, inicial) => {
    const producto = crearProductoDirecto({ existencia: 5 });
    const { id } = apartado(producto.id, { pagoInicialCentavos: inicial });
    cancelarOperacion(id, "El cliente ya no lo quiere");
    expect(operacion(id)).toMatchObject({ estado: "cancelado", motivo: "El cliente ya no lo quiere" });
    expect(operacion(id).cerradoEn).not.toBeNull();
    expect(disponible(producto.id)).toBe(5);
    expect(existencia(producto.id)).toBe(5);
    expect(obtenerBd().select().from(pagos).where(eq(pagos.operacionId, id)).all()).toEqual([
      expect.objectContaining({ importeCentavos: inicial, anuladoEn: null }),
    ]);
  });

  it("FR-027: el motivo es obligatorio", () => {
    const producto = crearProductoDirecto();
    const { id } = apartado(producto.id);
    expect(() => cancelarOperacion(id, "")).toThrow(codigo("DATOS_INVALIDOS"));
    expect(operacion(id).estado).toBe("pendiente");
  });

  it("FR-027: un apartado cancelado no admite pagos, entrega ni otra cancelación", () => {
    const producto = crearProductoDirecto();
    const { id } = apartado(producto.id);
    cancelarOperacion(id, "Motivo");
    expect(() => registrarPago(id, 100)).toThrow(codigo("ESTADO_NO_PERMITE"));
    expect(() => marcarEntregada(id)).toThrow(codigo("ESTADO_NO_PERMITE"));
    expect(() => cancelarOperacion(id, "Otra")).toThrow(codigo("ESTADO_NO_PERMITE"));
  });

  it("FR-027: un apartado entregado ya no se cancela", () => {
    const producto = crearProductoDirecto();
    const { id } = apartado(producto.id, { pagoInicialCentavos: 50000 });
    marcarEntregada(id);
    expect(() => cancelarOperacion(id, "Motivo")).toThrow(codigo("ESTADO_NO_PERMITE"));
  });

  it("FR-042: cancelar no aplica a ventas", () => {
    const producto = crearProductoDirecto();
    const { id } = registrarVenta({ productoId: producto.id, cantidad: 1, precioUnitarioCentavos: 100 });
    expect(() => cancelarOperacion(id, "Motivo")).toThrow(codigo("ESTADO_NO_PERMITE"));
  });
});
