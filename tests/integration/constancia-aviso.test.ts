import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { crearProductoDirecto, usarBaseTemporal } from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { operaciones } from "@/db/esquema";
import { consultarOperacionesCliente } from "@/consultas/publicas";
import { CAMPOS } from "@/lib/mensajes";
import {
  corregirOperacion,
  registrarApartado,
  registrarEncargo,
  registrarVenta,
} from "@/servicios/operaciones";

const faltaCasilla = expect.objectContaining({
  codigo: "DATOS_INVALIDOS",
  campos: expect.objectContaining({ avisoInformado: CAMPOS.avisoInformado }),
});
const operacion = (id: string) =>
  obtenerBd().select().from(operaciones).where(eq(operaciones.id, id)).get()!;

const cliente = { clienteNombre: "Ana López", clienteTelefono: "5512345678" };

function apartado(productoId: string, avisoInformado: boolean) {
  return registrarApartado({
    productoId,
    cantidad: 1,
    precioUnitarioCentavos: 125000,
    pagoInicialCentavos: 20000,
    avisoInformado,
    ...cliente,
  });
}

function encargo(productoId: string, avisoInformado: boolean) {
  return registrarEncargo({
    origen: { productoId },
    cantidad: 1,
    precioUnitarioCentavos: 125000,
    pagoInicialCentavos: 20000,
    avisoInformado,
    ...cliente,
  });
}

function venta(productoId: string, cambios: Partial<Parameters<typeof registrarVenta>[0]>) {
  return registrarVenta({ productoId, cantidad: 1, precioUnitarioCentavos: 110000, avisoInformado: false, ...cambios });
}

describe("constancia del aviso de privacidad (spec 003, US2)", () => {
  usarBaseTemporal();

  it("FR-008: rechaza un apartado sin la casilla", () => {
    const producto = crearProductoDirecto();
    expect(() => apartado(producto.id, false)).toThrow(faltaCasilla);
  });

  it("FR-008 y FR-010: con la casilla, el apartado guarda la constancia", () => {
    const producto = crearProductoDirecto();
    const { id } = apartado(producto.id, true);
    expect(operacion(id).avisoInformado).toBe(true);
  });

  it("FR-008: rechaza un encargo sin la casilla y lo guarda con ella", () => {
    const producto = crearProductoDirecto({ existencia: 0 });
    expect(() => encargo(producto.id, false)).toThrow(faltaCasilla);
    const { id } = encargo(producto.id, true);
    expect(operacion(id).avisoInformado).toBe(true);
  });

  it("FR-009: rechaza una venta con nombre, o solo con teléfono, sin la casilla", () => {
    const producto = crearProductoDirecto();
    expect(() => venta(producto.id, { clienteNombre: "Ana López" })).toThrow(faltaCasilla);
    expect(() => venta(producto.id, { clienteTelefono: "5512345678" })).toThrow(faltaCasilla);
  });

  it("FR-009 y FR-010: una venta con datos y casilla guarda la constancia", () => {
    const producto = crearProductoDirecto();
    const { id } = venta(producto.id, { ...cliente, avisoInformado: true });
    expect(operacion(id).avisoInformado).toBe(true);
  });

  it("FR-009 y caso límite «Solo espacios»: una venta sin datos se guarda sin la casilla, con constancia 0", () => {
    const producto = crearProductoDirecto();
    const sinDatos = venta(producto.id, {});
    const soloEspacios = venta(producto.id, { clienteNombre: "   ", clienteTelefono: "  " });
    expect(operacion(sinDatos.id).avisoInformado).toBe(false);
    expect(operacion(soloEspacios.id).avisoInformado).toBe(false);
  });

  it("data-model: una venta sin datos guarda 0 aunque la casilla venga marcada", () => {
    const producto = crearProductoDirecto();
    const { id } = venta(producto.id, { avisoInformado: true });
    expect(operacion(id).avisoInformado).toBe(false);
  });

  it("FR-012: corregir el nombre o el teléfono no cambia la constancia", () => {
    const producto = crearProductoDirecto();
    const { id } = apartado(producto.id, true);
    corregirOperacion(id, { clienteNombre: "Ana María López", clienteTelefono: "5599998888", precioUnitarioCentavos: 125000 });
    expect(operacion(id).avisoInformado).toBe(true);
  });

  it("FR-012: la consulta del cliente no devuelve la constancia ni la fecha del borrado", () => {
    const producto = crearProductoDirecto();
    apartado(producto.id, true);
    const [consultada] = consultarOperacionesCliente(cliente.clienteNombre, cliente.clienteTelefono);
    expect(consultada).toBeDefined();
    expect(consultada).not.toHaveProperty("avisoInformado");
    expect(consultada).not.toHaveProperty("datosBorradosEn");
  });
});
