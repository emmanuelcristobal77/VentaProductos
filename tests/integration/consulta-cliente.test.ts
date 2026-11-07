import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearProductoDirecto, usarBaseTemporal } from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { pagos } from "@/db/esquema";
import { consultarMisApartados } from "@/acciones/consulta-cliente";
import { consultarOperacionesCliente } from "@/consultas/publicas";
import { cancelarOperacion, registrarApartado, registrarEncargo, registrarVenta } from "@/servicios/operaciones";
import { anularPago, registrarPago } from "@/servicios/pagos";

let ipActual = "203.0.113.5";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-real-ip": ipActual }),
}));

function apartado(productoId: string, cliente = { clienteNombre: "Ana López", clienteTelefono: "5512345678" }) {
  return registrarApartado({ avisoInformado: true,
    productoId,
    cantidad: 1,
    precioUnitarioCentavos: 50000,
    pagoInicialCentavos: 10000,
    ...cliente,
  });
}

function formulario(nombre: string, telefono: string) {
  const datos = new FormData();
  datos.set("nombre", nombre);
  datos.set("telefono", telefono);
  return datos;
}

describe("consulta del cliente", () => {
  usarBaseTemporal();

  beforeEach(() => {
    ipActual = "203.0.113.5";
  });

  it("FR-035: muestra apartados y encargos con estado, precio, pagos y saldo", () => {
    const producto = crearProductoDirecto({ nombre: "Muñeca" });
    const { id } = apartado(producto.id);
    registrarPago(id, 15000);
    const agotado = crearProductoDirecto({ nombre: "Tren", existencia: 0 });
    registrarEncargo({ avisoInformado: true,
      origen: { productoId: agotado.id },
      cantidad: 2,
      precioUnitarioCentavos: 1000,
      clienteNombre: "Ana López",
      clienteTelefono: "5512345678",
      pagoInicialCentavos: 500,
    });

    const resultado = consultarOperacionesCliente("Ana López", "5512345678");
    expect(resultado).toHaveLength(2);
    expect(resultado.find((o) => o.articulo === "Muñeca")).toMatchObject({
      tipo: "apartado",
      estado: "pendiente",
      precioUnitarioCentavos: 50000,
      totalCentavos: 50000,
      pagadoCentavos: 25000,
      saldoCentavos: 25000,
      pagos: [
        expect.objectContaining({ importeCentavos: 10000 }),
        expect.objectContaining({ importeCentavos: 15000 }),
      ],
    });
    expect(resultado.find((o) => o.articulo === "Tren")).toMatchObject({ tipo: "encargo", totalCentavos: 2000 });
  });

  it("FR-037: ignora mayúsculas, acentos y espacios; el teléfono se compara por dígitos", () => {
    const producto = crearProductoDirecto();
    apartado(producto.id);
    expect(consultarOperacionesCliente("  ANA   lopez ", "55 1234-5678")).toHaveLength(1);
  });

  it("Caso límite: muestra todos los apartados de la misma persona", () => {
    const producto = crearProductoDirecto();
    apartado(producto.id);
    apartado(producto.id);
    expect(consultarOperacionesCliente("Ana López", "5512345678")).toHaveLength(2);
  });

  it("FR-035: no encuentra nada si solo coincide uno de los dos datos, sin distinguir cuál", async () => {
    const producto = crearProductoDirecto();
    apartado(producto.id);
    const soloNombre = await consultarMisApartados(null, formulario("Ana López", "5500000000"));
    const soloTelefono = await consultarMisApartados(null, formulario("Otra Persona", "5512345678"));
    const ninguno = await consultarMisApartados(null, formulario("Otra Persona", "5500000000"));
    expect(soloNombre).toEqual({ ok: true, datos: [] });
    expect(soloTelefono).toEqual(soloNombre);
    expect(ninguno).toEqual(soloNombre);
  });

  it("US6-3: no expone datos de otros clientes ni el precio de compra", () => {
    const producto = crearProductoDirecto({ precioCompraCentavos: 7654321 });
    apartado(producto.id);
    apartado(producto.id, { clienteNombre: "Beatriz Núñez", clienteTelefono: "5587654321" });

    const texto = JSON.stringify(consultarOperacionesCliente("Ana López", "5512345678"));
    expect(texto).not.toContain("Beatriz");
    expect(texto).not.toContain("5587654321");
    expect(texto).not.toContain("7654321");
    expect(texto).not.toMatch(/compra/i);
  });

  it("FR-035: no incluye ventas", () => {
    const producto = crearProductoDirecto();
    registrarVenta({ avisoInformado: true,
      productoId: producto.id,
      cantidad: 1,
      precioUnitarioCentavos: 100,
      clienteNombre: "Ana López",
      clienteTelefono: "5512345678",
    });
    expect(consultarOperacionesCliente("Ana López", "5512345678")).toEqual([]);
  });

  it("FR-035: una cancelada se ve con su estado y lo pagado, sin saldo por cubrir ni motivo", () => {
    const producto = crearProductoDirecto();
    const { id } = apartado(producto.id);
    cancelarOperacion(id, "Nota interna del vendedor");
    const [cancelada] = consultarOperacionesCliente("Ana López", "5512345678");
    expect(cancelada).toMatchObject({ estado: "cancelado", pagadoCentavos: 10000, saldoCentavos: null });
    expect(JSON.stringify(cancelada)).not.toContain("Nota interna");
  });

  it("FR-035: los pagos anulados no se muestran al cliente", () => {
    const producto = crearProductoDirecto();
    const { id } = apartado(producto.id);
    registrarPago(id, 5000);
    const segundo = obtenerBd().select().from(pagos).all().find((p) => p.importeCentavos === 5000)!;
    anularPago(segundo.id);
    const [operacion] = consultarOperacionesCliente("Ana López", "5512345678");
    expect(operacion.pagos).toHaveLength(1);
    expect(operacion.pagadoCentavos).toBe(10000);
  });

  it("FR-044: la consulta 11 en 15 minutos da DEMASIADOS_INTENTOS", async () => {
    for (let n = 0; n < 10; n++) {
      expect((await consultarMisApartados(null, formulario("Ana", "5512345678"))).ok).toBe(true);
    }
    expect(await consultarMisApartados(null, formulario("Ana", "5512345678"))).toMatchObject({
      ok: false,
      codigo: "DEMASIADOS_INTENTOS",
    });

    ipActual = "203.0.113.9";
    expect((await consultarMisApartados(null, formulario("Ana", "5512345678"))).ok).toBe(true);
  });

  it("FR-040: un teléfono incompleto da DATOS_INVALIDOS y cuenta como consulta", async () => {
    expect(await consultarMisApartados(null, formulario("Ana", "123"))).toMatchObject({
      ok: false,
      codigo: "DATOS_INVALIDOS",
    });
    for (let n = 0; n < 9; n++) await consultarMisApartados(null, formulario("Ana", "123"));
    expect(await consultarMisApartados(null, formulario("Ana", "5512345678"))).toMatchObject({
      codigo: "DEMASIADOS_INTENTOS",
    });
  });
});
