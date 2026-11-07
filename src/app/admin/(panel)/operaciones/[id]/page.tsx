import { notFound } from "next/navigation";
import { anularVenta, cancelarOperacion } from "@/acciones/operaciones";
import { BotonEntregar, DialogoMotivo, FormularioPago } from "@/components/admin/acciones-operacion";
import { DesglosePagos } from "@/components/admin/desglose-pagos";
import { DialogoBorrarDatos } from "@/components/admin/dialogo-borrar-datos";
import { HojaCorreccion } from "@/components/admin/hoja-correccion";
import { Badge } from "@/components/ui/badge";
import { contarOperacionesDelCliente, obtenerOperacionAdmin, type OperacionAdmin } from "@/consultas/admin";
import { formatearPrecio } from "@/dominio/dinero";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO } from "@/dominio/estados";
import { DATOS_BORRADOS } from "@/lib/mensajes";
import { formatearFecha, formatearHora } from "@/dominio/fechas";

export const dynamic = "force-dynamic";

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-sm">{etiqueta}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

/** Spec 003, FR-011 y research 7: 1 informado, 0 venta sin datos (nada que mostrar), nulo anterior al aviso. */
function ConstanciaAviso({ operacion }: { operacion: Pick<OperacionAdmin, "avisoInformado" | "creadoEn"> }) {
  if (operacion.avisoInformado === false) return null;
  return (
    <div className="col-span-2">
      <dt className="text-muted-foreground text-sm">Aviso de privacidad</dt>
      <dd className="font-medium">
        {operacion.avisoInformado
          ? `Se informó al cliente del aviso de privacidad: ${formatearFecha(operacion.creadoEn)}, ${formatearHora(operacion.creadoEn)}`
          : "Sin constancia del aviso: se registró antes de que existiera"}
      </dd>
    </div>
  );
}

export default async function PaginaOperacion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const operacion = obtenerOperacionAdmin(id);
  if (!operacion) notFound();

  const esVenta = operacion.tipo === "venta";
  const abierta = operacion.estado === "pendiente" || operacion.estado === "pagado";
  // Spec 003, FR-013 y FR-018: se ofrece borrar solo si la operación conserva datos del cliente.
  const borrados = Boolean(operacion.datosBorradosEn);
  const cuentaBorrado = contarOperacionesDelCliente(operacion.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {ETIQUETA_TIPO[operacion.tipo]}: {operacion.articulo}
        </h1>
        <Badge>{ETIQUETA_ESTADO[operacion.estado]}</Badge>
      </div>

      <dl className="bg-card grid grid-cols-2 gap-4 rounded-xl border p-4">
        <Dato etiqueta="Cantidad">{operacion.cantidad}</Dato>
        <Dato etiqueta="Precio acordado">{formatearPrecio(operacion.precioUnitarioCentavos)}</Dato>
        <Dato etiqueta="Total">{formatearPrecio(operacion.totalCentavos)}</Dato>
        <Dato etiqueta="Registrada">{formatearFecha(operacion.creadoEn)}</Dato>
        {operacion.datosBorradosEn ? (
          <>
            <Dato etiqueta="Cliente">{DATOS_BORRADOS}</Dato>
            <Dato etiqueta="Datos borrados">
              {formatearFecha(operacion.datosBorradosEn)}, {formatearHora(operacion.datosBorradosEn)}
            </Dato>
          </>
        ) : (
          <>
            {operacion.clienteNombre && <Dato etiqueta="Cliente">{operacion.clienteNombre}</Dato>}
            {operacion.clienteTelefono && <Dato etiqueta="Teléfono">{operacion.clienteTelefono}</Dato>}
          </>
        )}
        {operacion.entregadoEn && (
          <Dato etiqueta="Entrega">
            {formatearFecha(operacion.entregadoEn)}, {formatearHora(operacion.entregadoEn)}
          </Dato>
        )}
        {operacion.motivo && <Dato etiqueta="Motivo">{operacion.motivo}</Dato>}
        <ConstanciaAviso operacion={operacion} />
      </dl>

      {!esVenta && (
        <section aria-labelledby="titulo-pagos" className="flex flex-col gap-3">
          <h2 id="titulo-pagos" className="text-lg font-semibold">
            Pagos
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Dato etiqueta="Pagado">{formatearPrecio(operacion.pagadoCentavos)}</Dato>
            {operacion.estado !== "cancelado" && (
              <div>
                <dt className="text-muted-foreground text-sm">Saldo restante</dt>
                <dd data-testid="saldo" className="font-medium">
                  {formatearPrecio(operacion.saldoCentavos)}
                </dd>
              </div>
            )}
          </dl>
          <DesglosePagos operacion={operacion} />
          {operacion.estado === "pendiente" && <FormularioPago operacionId={operacion.id} />}
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {operacion.estado === "pagada" && <BotonEntregar id={operacion.id} etiqueta="Marcar entregada" />}
        {abierta && <BotonEntregar id={operacion.id} etiqueta="Marcar entregado" />}
        {abierta && !borrados && <HojaCorreccion operacion={operacion} />}
        {cuentaBorrado > 0 && <DialogoBorrarDatos operacionId={operacion.id} cuenta={cuentaBorrado} />}
        {esVenta && operacion.estado !== "anulada" && (
          <DialogoMotivo
            etiqueta="Anular venta"
            titulo="Anular venta"
            descripcion="Úsalo solo para corregir una captura. Las unidades regresan al inventario."
            accion={anularVenta.bind(null, operacion.id)}
            exito="Venta anulada."
          />
        )}
        {abierta && (
          <DialogoMotivo
            etiqueta={`Cancelar ${ETIQUETA_TIPO[operacion.tipo].toLowerCase()}`}
            titulo={`Cancelar ${ETIQUETA_TIPO[operacion.tipo].toLowerCase()}`}
            descripcion="Los pagos se conservan como no devueltos y ya no se podrán registrar más."
            accion={cancelarOperacion.bind(null, operacion.id)}
            exito="Operación cancelada."
          />
        )}
      </div>
    </div>
  );
}
