import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buscarOperaciones, type FiltroOperaciones } from "@/consultas/admin";
import { formatearPrecio } from "@/dominio/dinero";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO } from "@/dominio/estados";
import { formatearFecha } from "@/dominio/fechas";
import { ejecutar } from "@/lib/resultado";

export const dynamic = "force-dynamic";

const CAMPOS = [
  { nombre: "desde", etiqueta: "Desde (fecha de pago)", tipo: "date" },
  { nombre: "hasta", etiqueta: "Hasta (fecha de pago)", tipo: "date" },
  { nombre: "nombre", etiqueta: "Nombre", tipo: "text" },
  { nombre: "telefono", etiqueta: "Teléfono", tipo: "tel" },
] as const;

export default async function PaginaOperaciones({
  searchParams,
}: {
  searchParams: Promise<FiltroOperaciones>;
}) {
  const filtro = await searchParams;
  const resultado = await ejecutar(() => buscarOperaciones(filtro));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Operaciones</h1>

      {/* La clave reinicia los campos cuando cambia la búsqueda en la URL. */}
      <form
        key={JSON.stringify(filtro)}
        className="bg-card grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {CAMPOS.map((campo) => (
          <div key={campo.nombre} className="flex flex-col gap-2">
            <Label htmlFor={campo.nombre}>{campo.etiqueta}</Label>
            <Input
              id={campo.nombre}
              name={campo.nombre}
              type={campo.tipo}
              defaultValue={filtro[campo.nombre]}
            />
          </div>
        ))}
        <Button type="submit" className="h-11 sm:col-span-2 lg:col-span-4">
          Buscar
        </Button>
      </form>

      {!resultado.ok ? (
        <p role="alert" className="text-destructive">
          {resultado.mensaje}
        </p>
      ) : resultado.datos.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border p-8 text-center">
          No se encontraron operaciones.
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {resultado.datos.map((operacion) => (
            <li key={operacion.id} className="bg-card rounded-xl border">
              <Link href={`/admin/operaciones/${operacion.id}`} className="flex flex-col gap-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium">
                    {ETIQUETA_TIPO[operacion.tipo]}: {operacion.articulo}
                  </h2>
                  <Badge variant="secondary">{ETIQUETA_ESTADO[operacion.estado]}</Badge>
                </div>
                {operacion.clienteNombre && (
                  <p className="text-muted-foreground text-sm">
                    {operacion.clienteNombre}
                    {operacion.clienteTelefono && ` · ${operacion.clienteTelefono}`}
                  </p>
                )}
                <p className="text-sm">{formatearFecha(operacion.creadoEn)}</p>
                <p className="text-sm">
                  Total: {formatearPrecio(operacion.totalCentavos)}
                  {operacion.tipo !== "venta" &&
                    operacion.estado !== "cancelado" &&
                    ` · Saldo: ${formatearPrecio(operacion.saldoCentavos)}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
