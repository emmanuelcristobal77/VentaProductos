import { eq, getTableColumns, sql } from "drizzle-orm";
import { conTransaccion, type Conexion } from "@/db/cliente";
import { articulosEncargo, operaciones, pagos, productos } from "@/db/esquema";
import { calcularTotal } from "@/dominio/dinero";
import { calcularEstado, puedeTransicionar } from "@/dominio/estados";
import { normalizarNombre, normalizarTelefono } from "@/dominio/normalizacion";
import { unidadesDisponibles } from "@/consultas/disponibilidad";
import { pagadoCentavos } from "@/consultas/saldos";
import {
  CAMPOS,
  mensajePagoExcedeSaldo,
  mensajeSinDisponibilidad,
} from "@/lib/mensajes";
import { ErrorNegocio } from "@/lib/resultado";

export interface DatosVenta {
  productoId: string;
  cantidad: number;
  precioUnitarioCentavos: number;
  clienteNombre?: string;
  clienteTelefono?: string;
}

export interface DatosPedido {
  productoId: string;
  cantidad: number;
  precioUnitarioCentavos: number;
  clienteNombre: string;
  clienteTelefono: string;
  pagoInicialCentavos: number;
}

export type OrigenEncargo =
  | { productoId: string }
  | { articuloEncargoId: string }
  | { articuloNuevo: { nombre: string; descripcion: string } };

export type DatosEncargo = Omit<DatosPedido, "productoId"> & { origen: OrigenEncargo };

export interface DatosCorreccion {
  clienteNombre: string;
  clienteTelefono: string;
  precioUnitarioCentavos: number;
}

const esPositivo = (valor: number) => Number.isSafeInteger(valor) && valor > 0;

function invalido(campos: Record<string, string>) {
  return new ErrorNegocio("DATOS_INVALIDOS", undefined, campos);
}

function validarPartida(cantidad: number, precioUnitarioCentavos: number) {
  const errores: Record<string, string> = {};
  if (!esPositivo(cantidad)) errores.cantidad = CAMPOS.cantidad;
  if (!esPositivo(precioUnitarioCentavos)) errores.precio = CAMPOS.precio;
  return errores;
}

/** Valida los datos del cliente de un apartado o encargo (FR-022, FR-040). */
function clienteObligatorio(nombreCapturado: string, telefonoCapturado: string) {
  const errores: Record<string, string> = {};
  const clienteNombre = nombreCapturado.trim();
  const clienteTelefono = normalizarTelefono(telefonoCapturado);
  if (!clienteNombre) errores.clienteNombre = CAMPOS.clienteNombre;
  if (!clienteTelefono) errores.clienteTelefono = CAMPOS.clienteTelefono;
  return {
    errores,
    cliente: { clienteNombre, clienteNombreNorm: normalizarNombre(clienteNombre), clienteTelefono },
  };
}

function exigirMotivo(motivo: string) {
  const limpio = motivo.trim();
  if (!limpio) throw invalido({ motivo: CAMPOS.motivo });
  return limpio;
}

function operacionConPagado(tx: Conexion, id: string) {
  const operacion = tx
    .select({ ...getTableColumns(operaciones), pagado: pagadoCentavos })
    .from(operaciones)
    .where(eq(operaciones.id, id))
    .get();
  if (!operacion) throw new ErrorNegocio("ESTADO_NO_PERMITE");
  return operacion;
}

/** Comprueba dentro de la transacción que el producto admite otra operación (FR-011). */
function exigirDisponibles(tx: Conexion, productoId: string, cantidad: number) {
  const producto = tx
    .select({ activo: productos.activo, disponible: unidadesDisponibles })
    .from(productos)
    .where(eq(productos.id, productoId))
    .get();
  if (!producto?.activo) throw new ErrorNegocio("ESTADO_NO_PERMITE");
  if (cantidad > producto.disponible) {
    throw new ErrorNegocio("SIN_DISPONIBILIDAD", mensajeSinDisponibilidad(producto.disponible));
  }
}

function ajustarExistencia(tx: Conexion, productoId: string, cambio: number) {
  tx.update(productos)
    .set({ existencia: sql`${productos.existencia} + ${cambio}`, actualizadoEn: new Date().toISOString() })
    .where(eq(productos.id, productoId))
    .run();
}

export function registrarVenta(datos: DatosVenta) {
  const errores = validarPartida(datos.cantidad, datos.precioUnitarioCentavos);
  const nombre = datos.clienteNombre?.trim() || null;
  const telefonoCapturado = datos.clienteTelefono?.trim() || null;
  const telefono = telefonoCapturado && normalizarTelefono(telefonoCapturado);
  if (telefonoCapturado && !telefono) errores.clienteTelefono = CAMPOS.clienteTelefono;
  if (Object.keys(errores).length > 0) throw invalido(errores);

  return conTransaccion((tx) => {
    exigirDisponibles(tx, datos.productoId, datos.cantidad);
    ajustarExistencia(tx, datos.productoId, -datos.cantidad);

    const venta = tx
      .insert(operaciones)
      .values({
        tipo: "venta",
        estado: "pagada",
        productoId: datos.productoId,
        cantidad: datos.cantidad,
        precioUnitarioCentavos: datos.precioUnitarioCentavos,
        clienteNombre: nombre,
        clienteNombreNorm: nombre && normalizarNombre(nombre),
        clienteTelefono: telefono,
      })
      .returning({ id: operaciones.id })
      .get();
    tx.insert(pagos)
      .values({
        operacionId: venta.id,
        importeCentavos: calcularTotal(datos.precioUnitarioCentavos, datos.cantidad),
      })
      .run();
    return venta;
  });
}

type CamposPedido = Omit<DatosPedido, "productoId">;

/** Prepara la inserción de un apartado o encargo, que comparten datos y pago inicial (FR-022). */
function validarPedido(datos: CamposPedido, mensajePago: string, adicionales: Record<string, string> = {}) {
  const { errores: erroresCliente, cliente } = clienteObligatorio(datos.clienteNombre, datos.clienteTelefono);
  const errores = {
    ...adicionales,
    ...validarPartida(datos.cantidad, datos.precioUnitarioCentavos),
    ...erroresCliente,
  };
  if (!esPositivo(datos.pagoInicialCentavos)) errores.pagoInicial = mensajePago;
  if (Object.keys(errores).length > 0) throw invalido(errores);

  const total = calcularTotal(datos.precioUnitarioCentavos, datos.cantidad);
  if (datos.pagoInicialCentavos > total) {
    throw new ErrorNegocio("PAGO_EXCEDE_SALDO", mensajePagoExcedeSaldo(total));
  }

  return {
    estado: calcularEstado(total, datos.pagoInicialCentavos),
    cantidad: datos.cantidad,
    precioUnitarioCentavos: datos.precioUnitarioCentavos,
    ...cliente,
    clienteTelefono: cliente.clienteTelefono!,
  };
}

function insertarPedido(
  tx: Conexion,
  valores: typeof operaciones.$inferInsert,
  pagoInicialCentavos: number,
) {
  const pedido = tx.insert(operaciones).values(valores).returning({ id: operaciones.id }).get();
  tx.insert(pagos).values({ operacionId: pedido.id, importeCentavos: pagoInicialCentavos }).run();
  return pedido;
}

export function registrarApartado(datos: DatosPedido) {
  const valores = validarPedido(datos, CAMPOS.pagoInicial);

  return conTransaccion((tx) => {
    exigirDisponibles(tx, datos.productoId, datos.cantidad);
    return insertarPedido(
      tx,
      { ...valores, tipo: "apartado", productoId: datos.productoId },
      datos.pagoInicialCentavos,
    );
  });
}

/** Resuelve qué se encarga; un artículo nuevo se crea dentro de la misma transacción. */
function resolverOrigen(tx: Conexion, origen: OrigenEncargo, precioCentavos: number) {
  if ("productoId" in origen) {
    const producto = tx
      .select({ activo: productos.activo, disponible: unidadesDisponibles })
      .from(productos)
      .where(eq(productos.id, origen.productoId))
      .get();
    if (!producto?.activo) throw new ErrorNegocio("ESTADO_NO_PERMITE");
    if (producto.disponible > 0) throw new ErrorNegocio("HAY_DISPONIBILIDAD");
    return { productoId: origen.productoId };
  }

  if ("articuloEncargoId" in origen) {
    const articulo = tx
      .select({ activo: articulosEncargo.activo })
      .from(articulosEncargo)
      .where(eq(articulosEncargo.id, origen.articuloEncargoId))
      .get();
    if (!articulo?.activo) throw new ErrorNegocio("ESTADO_NO_PERMITE");
    return { articuloEncargoId: origen.articuloEncargoId };
  }

  const articulo = tx
    .insert(articulosEncargo)
    .values({ ...origen.articuloNuevo, precioCentavos })
    .returning({ id: articulosEncargo.id })
    .get();
  return { articuloEncargoId: articulo.id };
}

export function registrarEncargo({ origen, ...datos }: DatosEncargo) {
  const errores: Record<string, string> = {};
  if ("articuloNuevo" in origen) {
    origen = {
      articuloNuevo: {
        nombre: origen.articuloNuevo.nombre.trim(),
        descripcion: origen.articuloNuevo.descripcion.trim(),
      },
    };
    if (!origen.articuloNuevo.nombre) errores.articuloNombre = CAMPOS.articuloNombre;
    if (!origen.articuloNuevo.descripcion) errores.articuloDescripcion = CAMPOS.articuloDescripcion;
  }
  const valores = validarPedido(datos, CAMPOS.anticipo, errores);

  return conTransaccion((tx) =>
    insertarPedido(
      tx,
      { ...valores, tipo: "encargo", ...resolverOrigen(tx, origen, datos.precioUnitarioCentavos) },
      datos.pagoInicialCentavos,
    ),
  );
}

export function marcarEntregada(id: string) {
  conTransaccion((tx) => {
    const operacion = operacionConPagado(tx, id);
    const destino = operacion.tipo === "venta" ? "entregada" : "entregado";

    if (operacion.estado === "pendiente") throw new ErrorNegocio("SALDO_PENDIENTE");
    if (!puedeTransicionar(operacion.tipo, operacion.estado, destino)) {
      throw new ErrorNegocio("ESTADO_NO_PERMITE");
    }

    // La venta ya descontó sus unidades y el encargo nunca toca inventario (FR-024, FR-033).
    if (operacion.tipo === "apartado") ajustarExistencia(tx, operacion.productoId!, -operacion.cantidad);

    tx.update(operaciones)
      .set({ estado: destino, entregadoEn: new Date().toISOString() })
      .where(eq(operaciones.id, id))
      .run();
  });
}

export function anularVenta(id: string, motivo: string) {
  const motivoLimpio = exigirMotivo(motivo);

  conTransaccion((tx) => {
    const venta = operacionConPagado(tx, id);
    if (venta.tipo !== "venta" || !puedeTransicionar("venta", venta.estado, "anulada")) {
      throw new ErrorNegocio("ESTADO_NO_PERMITE");
    }

    ajustarExistencia(tx, venta.productoId!, venta.cantidad);
    tx.update(operaciones)
      .set({ estado: "anulada", motivo: motivoLimpio, cerradoEn: new Date().toISOString() })
      .where(eq(operaciones.id, id))
      .run();
  });
}

export function cancelarOperacion(id: string, motivo: string) {
  const motivoLimpio = exigirMotivo(motivo);

  conTransaccion((tx) => {
    const operacion = operacionConPagado(tx, id);
    if (operacion.tipo === "venta" || !puedeTransicionar(operacion.tipo, operacion.estado, "cancelado")) {
      throw new ErrorNegocio("ESTADO_NO_PERMITE");
    }

    tx.update(operaciones)
      .set({ estado: "cancelado", motivo: motivoLimpio, cerradoEn: new Date().toISOString() })
      .where(eq(operaciones.id, id))
      .run();
  });
}

export function corregirOperacion(id: string, datos: DatosCorreccion) {
  const { errores: erroresCliente, cliente } = clienteObligatorio(datos.clienteNombre, datos.clienteTelefono);
  const errores = { ...erroresCliente };
  if (!esPositivo(datos.precioUnitarioCentavos)) errores.precio = CAMPOS.precio;
  if (Object.keys(errores).length > 0) throw invalido(errores);

  conTransaccion((tx) => {
    const operacion = operacionConPagado(tx, id);
    if (operacion.estado !== "pendiente" && operacion.estado !== "pagado") {
      throw new ErrorNegocio("ESTADO_NO_PERMITE");
    }

    const total = calcularTotal(datos.precioUnitarioCentavos, operacion.cantidad);
    if (total < operacion.pagado) throw new ErrorNegocio("PRECIO_MENOR_A_PAGADO");

    tx.update(operaciones)
      .set({
        ...cliente,
        precioUnitarioCentavos: datos.precioUnitarioCentavos,
        estado: calcularEstado(total, operacion.pagado),
      })
      .where(eq(operaciones.id, id))
      .run();
  });
}
