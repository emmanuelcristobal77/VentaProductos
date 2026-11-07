import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { crearProductoDirecto, usarBaseTemporal } from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { articulosEncargo, fotos, operaciones, productos } from "@/db/esquema";
import { listarEncargosPendientes, obtenerOperacionAdmin } from "@/consultas/admin";
import { listarArticulosEncargo, obtenerProducto } from "@/consultas/publicas";
import {
  actualizarArticulo,
  crearArticulo,
  darDeBajaArticulo,
} from "@/servicios/articulos-encargo";
import {
  cancelarOperacion,
  marcarEntregada,
  registrarEncargo,
  registrarVenta,
  type DatosEncargo,
} from "@/servicios/operaciones";
import { registrarPago } from "@/servicios/pagos";

const codigo = (valor: string) => expect.objectContaining({ codigo: valor });
const operacion = (id: string) =>
  obtenerBd().select().from(operaciones).where(eq(operaciones.id, id)).get()!;
const existencia = (id: string) =>
  obtenerBd().select().from(productos).where(eq(productos.id, id)).get()!.existencia;

function datos(origen: DatosEncargo["origen"], cambios: Partial<DatosEncargo> = {}): DatosEncargo {
  return {
    origen,
    cantidad: 2,
    precioUnitarioCentavos: 15000,
    clienteNombre: "Ana López",
    clienteTelefono: "5512345678",
    pagoInicialCentavos: 5000,
    avisoInformado: true,
    ...cambios,
  };
}

const articulo = () =>
  crearArticulo({ nombre: "Bicicleta", descripcion: "Rodada 20", precioCentavos: 150000, fotos: [] });

describe("encargos", () => {
  usarBaseTemporal();

  it("FR-017: con disponibilidad un producto da HAY_DISPONIBILIDAD", () => {
    const producto = crearProductoDirecto({ existencia: 1 });
    expect(() => registrarEncargo(datos({ productoId: producto.id }))).toThrow(codigo("HAY_DISPONIBILIDAD"));
  });

  it("FR-017: se permite después de agotar el producto con otra operación", () => {
    const producto = crearProductoDirecto({ existencia: 1 });
    registrarVenta({ avisoInformado: true, productoId: producto.id, cantidad: 1, precioUnitarioCentavos: 100 });
    const { id } = registrarEncargo(datos({ productoId: producto.id }));
    expect(operacion(id)).toMatchObject({ tipo: "encargo", estado: "pendiente", productoId: producto.id });
  });

  it.each([
    ["nombre", { clienteNombre: "" }],
    ["teléfono", { clienteTelefono: "" }],
    ["precio", { precioUnitarioCentavos: 0 }],
    ["anticipo", { pagoInicialCentavos: 0 }],
  ])("FR-022: exige %s", (_dato, cambios) => {
    const { id } = articulo();
    expect(() => registrarEncargo(datos({ articuloEncargoId: id }, cambios))).toThrow(
      codigo("DATOS_INVALIDOS"),
    );
    expect(obtenerBd().select().from(operaciones).all()).toHaveLength(0);
  });

  it("FR-022: un anticipo que cubre el total nace Pagado y uno mayor se rechaza", () => {
    const { id } = articulo();
    const cubierto = registrarEncargo(datos({ articuloEncargoId: id }, { pagoInicialCentavos: 30000 }));
    expect(operacion(cubierto.id).estado).toBe("pagado");
    expect(() =>
      registrarEncargo(datos({ articuloEncargoId: id }, { pagoInicialCentavos: 30001 })),
    ).toThrow(codigo("PAGO_EXCEDE_SALDO"));
  });

  it("FR-024: registrar, pagar y entregar no cambia existencia ni disponibilidad", () => {
    const producto = crearProductoDirecto({ existencia: 0 });
    const { id } = registrarEncargo(datos({ productoId: producto.id }));
    registrarPago(id, 25000);
    marcarEntregada(id);
    expect(operacion(id).estado).toBe("entregado");
    expect(existencia(producto.id)).toBe(0);
    expect(obtenerProducto(producto.id)?.disponible).toBe(0);
  });

  it("FR-024: un encargo cancelado tampoco cambia la disponibilidad", () => {
    const producto = crearProductoDirecto({ existencia: 0 });
    const { id } = registrarEncargo(datos({ productoId: producto.id }));
    cancelarOperacion(id, "Ya no lo necesita");
    expect(obtenerProducto(producto.id)?.disponible).toBe(0);
  });

  it("FR-025: crea el artículo nuevo al registrar el encargo", () => {
    const { id } = registrarEncargo(
      datos({ articuloNuevo: { nombre: "Triciclo", descripcion: "Rojo" } }, { precioUnitarioCentavos: 80000 }),
    );
    expect(obtenerOperacionAdmin(id)?.articulo).toBe("Triciclo");
    expect(listarArticulosEncargo()).toEqual([
      expect.objectContaining({ nombre: "Triciclo", descripcion: "Rojo", precioCentavos: 80000 }),
    ]);
  });

  it("FR-025: un artículo nuevo exige nombre y descripción, y no se crea si el encargo se rechaza", () => {
    expect(() => registrarEncargo(datos({ articuloNuevo: { nombre: "", descripcion: "" } }))).toThrow(
      codigo("DATOS_INVALIDOS"),
    );
    expect(() =>
      registrarEncargo(datos({ articuloNuevo: { nombre: "T", descripcion: "R" } }, { pagoInicialCentavos: 999999 })),
    ).toThrow(codigo("PAGO_EXCEDE_SALDO"));
    expect(obtenerBd().select().from(articulosEncargo).all()).toHaveLength(0);
  });

  it("FR-025: no se encarga un artículo dado de baja", () => {
    const { id } = articulo();
    darDeBajaArticulo(id);
    expect(() => registrarEncargo(datos({ articuloEncargoId: id }))).toThrow(codigo("ESTADO_NO_PERMITE"));
  });

  it("FR-025: da de alta y edita artículos con fotos opcionales", () => {
    const { id } = crearArticulo({
      nombre: "Patines",
      descripcion: "Talla 25",
      precioCentavos: 50000,
      fotos: ["uno.jpg"],
    });
    actualizarArticulo(id, { nombre: "Patines rojos", descripcion: "Talla 25", precioCentavos: 55000, fotos: [] });
    expect(listarArticulosEncargo()).toEqual([
      expect.objectContaining({ nombre: "Patines rojos", precioCentavos: 55000, fotos: [] }),
    ]);
    expect(obtenerBd().select().from(fotos).where(eq(fotos.articuloEncargoId, id)).all()).toHaveLength(1);
  });

  it("FR-025: la baja con encargos vigentes da TIENE_DEPENDENCIAS", () => {
    const { id } = articulo();
    const encargo = registrarEncargo(datos({ articuloEncargoId: id }));
    expect(() => darDeBajaArticulo(id)).toThrow(codigo("TIENE_DEPENDENCIAS"));
    cancelarOperacion(encargo.id, "Motivo");
    darDeBajaArticulo(id);
    expect(listarArticulosEncargo()).toEqual([]);
  });

  it("FR-026: los pendientes muestran artículo, cantidad, cliente, pagado y saldo", () => {
    const { id } = articulo();
    registrarEncargo(datos({ articuloEncargoId: id }));
    expect(listarEncargosPendientes()).toEqual([
      expect.objectContaining({
        articulo: "Bicicleta",
        cantidad: 2,
        clienteNombre: "Ana López",
        pagadoCentavos: 5000,
        saldoCentavos: 25000,
      }),
    ]);
  });

  it("FR-026: excluye entregados, cancelados y otros tipos de operación", () => {
    const { id } = articulo();
    const entregado = registrarEncargo(datos({ articuloEncargoId: id }, { pagoInicialCentavos: 30000 }));
    marcarEntregada(entregado.id);
    const cancelado = registrarEncargo(datos({ articuloEncargoId: id }));
    cancelarOperacion(cancelado.id, "Motivo");
    const pagado = registrarEncargo(datos({ articuloEncargoId: id }, { pagoInicialCentavos: 30000 }));
    const producto = crearProductoDirecto();
    registrarVenta({ avisoInformado: true, productoId: producto.id, cantidad: 1, precioUnitarioCentavos: 100 });

    expect(listarEncargosPendientes().map((e) => e.id)).toEqual([pagado.id]);
  });
});
