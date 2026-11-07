import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { crearProductoDirecto, usarBaseTemporal } from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { operaciones, pagos } from "@/db/esquema";
import { buscarOperaciones, contarOperacionesDelCliente, obtenerOperacionAdmin } from "@/consultas/admin";
import { consultarOperacionesCliente } from "@/consultas/publicas";
import {
  anularVenta,
  borrarDatosCliente,
  cancelarOperacion,
  corregirOperacion,
  marcarEntregada,
  registrarApartado,
  registrarVenta,
} from "@/servicios/operaciones";
import { registrarPago } from "@/servicios/pagos";

const codigo = (valor: string) => expect.objectContaining({ codigo: valor });
const fila = (id: string) => obtenerBd().select().from(operaciones).where(eq(operaciones.id, id)).get()!;
const pagosDe = (id: string) => obtenerBd().select().from(pagos).where(eq(pagos.operacionId, id)).all();

function apartado(productoId: string, clienteNombre: string, clienteTelefono: string) {
  return registrarApartado({
    productoId,
    cantidad: 1,
    precioUnitarioCentavos: 50000,
    clienteNombre,
    clienteTelefono,
    pagoInicialCentavos: 10000,
    avisoInformado: true,
  });
}

function venta(productoId: string, datos: { clienteNombre?: string; clienteTelefono?: string } = {}) {
  return registrarVenta({ productoId, cantidad: 1, precioUnitarioCentavos: 30000, avisoInformado: true, ...datos });
}

/** Dos apartados y una venta de José, y un apartado de otro José con otro teléfono. */
function clienteConTresOperaciones() {
  const producto = crearProductoDirecto({ existencia: 10 });
  const primero = apartado(producto.id, "José Pérez", "5511112222");
  registrarPago(primero.id, 15000);
  const segundo = apartado(producto.id, "JOSE PEREZ", "55 1111 2222");
  const compra = venta(producto.id, { clienteNombre: "José  Pérez", clienteTelefono: "5511112222" });
  const otro = apartado(producto.id, "José Pérez", "5599990000");
  return { producto, ids: [primero.id, segundo.id, compra.id], otro: otro.id };
}

const resumen = (id: string) => {
  const operacion = obtenerOperacionAdmin(id)!;
  return {
    productoId: operacion.productoId,
    cantidad: operacion.cantidad,
    precio: operacion.precioUnitarioCentavos,
    estado: operacion.estado,
    pagado: operacion.pagadoCentavos,
    saldo: operacion.saldoCentavos,
    aviso: operacion.avisoInformado,
    pagos: pagosDe(id),
  };
};

describe("borrado de datos a petición del cliente (spec 003, US3)", () => {
  usarBaseTemporal();

  it("FR-014: cuenta las operaciones con el mismo nombre normalizado y teléfono", () => {
    const { ids } = clienteConTresOperaciones();
    expect(contarOperacionesDelCliente(ids[0])).toBe(3);
  });

  it("FR-015 y SC-006: borra nombre y teléfono de las 3 operaciones y guarda la fecha; la del otro cliente no cambia", () => {
    const { ids, otro } = clienteConTresOperaciones();
    const otroAntes = fila(otro);

    expect(borrarDatosCliente(ids[1])).toEqual({ borradas: 3 });

    for (const id of ids) {
      expect(fila(id)).toMatchObject({ clienteNombre: null, clienteNombreNorm: null, clienteTelefono: null });
      expect(Number.isNaN(Date.parse(fila(id).datosBorradosEn!))).toBe(false);
    }
    expect(fila(otro)).toEqual(otroAntes);
  });

  it("data-model: una venta con solo teléfono alcanza a las ventas con ese teléfono y sin nombre", () => {
    const producto = crearProductoDirecto({ existencia: 10 });
    const a = venta(producto.id, { clienteTelefono: "5533334444" });
    const b = venta(producto.id, { clienteTelefono: "5533334444" });
    const conNombre = venta(producto.id, { clienteNombre: "Rosa", clienteTelefono: "5533334444" });
    expect(contarOperacionesDelCliente(a.id)).toBe(2);
    expect(borrarDatosCliente(a.id)).toEqual({ borradas: 2 });
    expect(fila(b.id).datosBorradosEn).not.toBeNull();
    expect(fila(conNombre.id).datosBorradosEn).toBeNull();
  });

  it("FR-016: no cambia producto, cantidad, precio, estado, pagos, saldo ni constancia, al centavo", () => {
    const { ids } = clienteConTresOperaciones();
    const antes = ids.map(resumen);
    borrarDatosCliente(ids[0]);
    expect(ids.map(resumen)).toEqual(antes);
  });

  it("FR-017: ya no aparecen al buscar en el panel ni al consultar en «Mis apartados»", () => {
    const { ids } = clienteConTresOperaciones();
    borrarDatosCliente(ids[0]);
    const encontradas = [
      ...buscarOperaciones({ nombre: "José Pérez" }),
      ...buscarOperaciones({ telefono: "5511112222" }),
    ].map((o) => o.id);
    for (const id of ids) expect(encontradas).not.toContain(id);
    expect(consultarOperacionesCliente("José Pérez", "5511112222")).toEqual([]);
  });

  it("FR-017: siguen aceptando pagos, entrega, cancelación y anulación", () => {
    const { ids } = clienteConTresOperaciones();
    const [primero, segundo, compra] = ids;
    borrarDatosCliente(primero);

    registrarPago(primero, 25000);
    expect(fila(primero).estado).toBe("pagado");
    marcarEntregada(primero);
    expect(fila(primero).estado).toBe("entregado");
    cancelarOperacion(segundo, "Ya no lo quiere");
    expect(fila(segundo).estado).toBe("cancelado");
    anularVenta(compra, "Error de captura");
    expect(fila(compra).estado).toBe("anulada");
  });

  it("FR-018: no se puede borrar dos veces ni corregir una operación borrada", () => {
    const { ids } = clienteConTresOperaciones();
    borrarDatosCliente(ids[0]);
    expect(() => borrarDatosCliente(ids[0])).toThrow(codigo("ESTADO_NO_PERMITE"));
    expect(contarOperacionesDelCliente(ids[0])).toBe(0);
    expect(() =>
      corregirOperacion(ids[1], {
        clienteNombre: "José Pérez",
        clienteTelefono: "5511112222",
        precioUnitarioCentavos: 50000,
      }),
    ).toThrow(codigo("ESTADO_NO_PERMITE"));
  });

  it("FR-013: una venta sin datos no se puede borrar", () => {
    const producto = crearProductoDirecto();
    const { id } = venta(producto.id);
    expect(contarOperacionesDelCliente(id)).toBe(0);
    expect(() => borrarDatosCliente(id)).toThrow(codigo("ESTADO_NO_PERMITE"));
  });

  it("caso límite «Operaciones anuladas o canceladas»: se pueden borrar y conservan su constancia", () => {
    const producto = crearProductoDirecto();
    const { id } = apartado(producto.id, "Marta Ruiz", "5544445555");
    cancelarOperacion(id, "Se arrepintió");
    expect(borrarDatosCliente(id)).toEqual({ borradas: 1 });
    expect(fila(id)).toMatchObject({ estado: "cancelado", avisoInformado: true, clienteNombre: null });
  });

  it("FR-013: una operación que no existe no se puede borrar", () => {
    expect(() => borrarDatosCliente("no-existe")).toThrow(codigo("ESTADO_NO_PERMITE"));
  });
});
