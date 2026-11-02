import { anularPago } from "@/acciones/operaciones";
import { BotonConfirmar } from "@/components/admin/boton-confirmar";
import { Badge } from "@/components/ui/badge";
import type { OperacionAdmin } from "@/consultas/admin";
import { formatearPrecio } from "@/dominio/dinero";
import { formatearFecha, formatearHora } from "@/dominio/fechas";

export function DesglosePagos({ operacion }: { operacion: OperacionAdmin }) {
  const abierta = operacion.estado === "pendiente" || operacion.estado === "pagado";
  const cancelada = operacion.estado === "cancelado";

  return (
    <ul className="flex flex-col gap-2">
      {operacion.pagos.map((pago) => (
        <li key={pago.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          <div className="min-w-0">
            <p className={pago.anuladoEn ? "text-muted-foreground font-medium line-through" : "font-medium"}>
              {formatearPrecio(pago.importeCentavos)}
            </p>
            <p className="text-muted-foreground">
              {formatearFecha(pago.fecha)}, {formatearHora(pago.fecha)}
            </p>
          </div>
          {pago.anuladoEn ? (
            <Badge variant="secondary">Anulado</Badge>
          ) : cancelada ? (
            <Badge variant="secondary">No devuelto</Badge>
          ) : (
            abierta && (
              <BotonConfirmar
                etiqueta={
                  <>
                    Anular<span className="sr-only"> pago de {formatearPrecio(pago.importeCentavos)}</span>
                  </>
                }
                titulo="Anular pago"
                descripcion={`El pago de ${formatearPrecio(pago.importeCentavos)} seguirá visible como anulado y dejará de sumar.`}
                accion={anularPago.bind(null, pago.id)}
                exito="Pago anulado."
                confirmacion="Anular pago"
              />
            )
          )}
        </li>
      ))}
    </ul>
  );
}
