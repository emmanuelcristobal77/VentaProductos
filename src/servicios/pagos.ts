import { eq, getTableColumns } from "drizzle-orm";
import { conTransaccion, type Conexion } from "@/db/cliente";
import { operaciones, pagos } from "@/db/esquema";
import { calcularTotal } from "@/dominio/dinero";
import { calcularEstado } from "@/dominio/estados";
import { pagadoCentavos } from "@/consultas/saldos";
import { CAMPOS, mensajePagoExcedeSaldo } from "@/lib/mensajes";
import { ErrorNegocio } from "@/lib/resultado";

/** Solo un apartado o encargo abierto admite cambios en sus pagos (FR-027, FR-034). */
function pedidoAbierto(tx: Conexion, id: string) {
  const operacion = tx
    .select({ ...getTableColumns(operaciones), pagado: pagadoCentavos })
    .from(operaciones)
    .where(eq(operaciones.id, id))
    .get();
  if (!operacion || (operacion.estado !== "pendiente" && operacion.estado !== "pagado")) {
    throw new ErrorNegocio("ESTADO_NO_PERMITE");
  }
  return {
    ...operacion,
    total: calcularTotal(operacion.precioUnitarioCentavos, operacion.cantidad),
  };
}

function actualizarEstado(tx: Conexion, id: string, total: number, pagado: number) {
  tx.update(operaciones)
    .set({ estado: calcularEstado(total, pagado) })
    .where(eq(operaciones.id, id))
    .run();
}

export function registrarPago(operacionId: string, importeCentavos: number) {
  if (!Number.isSafeInteger(importeCentavos) || importeCentavos <= 0) {
    throw new ErrorNegocio("DATOS_INVALIDOS", undefined, { importe: CAMPOS.importe });
  }

  conTransaccion((tx) => {
    const operacion = pedidoAbierto(tx, operacionId);
    const saldo = operacion.total - operacion.pagado;
    if (importeCentavos > saldo) {
      throw new ErrorNegocio("PAGO_EXCEDE_SALDO", mensajePagoExcedeSaldo(saldo));
    }

    tx.insert(pagos).values({ operacionId, importeCentavos }).run();
    actualizarEstado(tx, operacionId, operacion.total, operacion.pagado + importeCentavos);
  });
}

export function anularPago(pagoId: string) {
  conTransaccion((tx) => {
    const pago = tx.select().from(pagos).where(eq(pagos.id, pagoId)).get();
    if (!pago || pago.anuladoEn) throw new ErrorNegocio("ESTADO_NO_PERMITE");

    const operacion = pedidoAbierto(tx, pago.operacionId);
    tx.update(pagos).set({ anuladoEn: new Date().toISOString() }).where(eq(pagos.id, pagoId)).run();
    actualizarEstado(tx, pago.operacionId, operacion.total, operacion.pagado - pago.importeCentavos);
  });
}
