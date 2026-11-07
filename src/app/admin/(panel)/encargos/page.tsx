import Link from "next/link";
import { HojaEncargo } from "@/components/admin/hoja-encargo";
import { Badge } from "@/components/ui/badge";
import { listarEncargosPendientes } from "@/consultas/admin";
import { formatearPrecio } from "@/dominio/dinero";
import { ETIQUETA_ESTADO } from "@/dominio/estados";
import { DATOS_BORRADOS } from "@/lib/mensajes";

export const dynamic = "force-dynamic";

export default function PaginaEncargos() {
  const encargos = listarEncargosPendientes();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Encargos pendientes</h1>
        <HojaEncargo origen={null} />
      </div>

      {encargos.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border p-8 text-center">
          No hay encargos pendientes.
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {encargos.map((encargo) => (
            <li key={encargo.id} className="bg-card rounded-xl border">
              <Link href={`/admin/operaciones/${encargo.id}`} className="flex flex-col gap-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium">{encargo.articulo}</h2>
                  <Badge variant="secondary">{ETIQUETA_ESTADO[encargo.estado]}</Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  {encargo.datosBorradosEn ? DATOS_BORRADOS : `${encargo.clienteNombre} · ${encargo.clienteTelefono}`}
                </p>
                <p className="text-sm">Cantidad: {encargo.cantidad}</p>
                <p className="text-sm">Pagado: {formatearPrecio(encargo.pagadoCentavos)}</p>
                <p className="text-sm">Saldo: {formatearPrecio(encargo.saldoCentavos)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
