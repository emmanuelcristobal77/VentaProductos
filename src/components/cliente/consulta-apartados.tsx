"use client";

import { useState, useTransition } from "react";
import { consultarMisApartados } from "@/acciones/consulta-cliente";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OperacionCliente } from "@/consultas/publicas";
import { formatearPrecio } from "@/dominio/dinero";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO } from "@/dominio/estados";
import { formatearFecha, formatearHora } from "@/dominio/fechas";
import { SIN_INFORMACION } from "@/lib/mensajes";
import type { Resultado } from "@/lib/resultado";

function TarjetaOperacion({ operacion }: { operacion: OperacionCliente }) {
  return (
    <article className="bg-card flex flex-col gap-3 rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-muted-foreground text-sm">{ETIQUETA_TIPO[operacion.tipo]}</p>
          <h2 className="font-medium">{operacion.articulo}</h2>
        </div>
        <Badge variant="secondary">{ETIQUETA_ESTADO[operacion.estado]}</Badge>
      </div>
      <p className="text-sm">
        {operacion.cantidad} × {formatearPrecio(operacion.precioUnitarioCentavos)} ={" "}
        <span className="font-medium">{formatearPrecio(operacion.totalCentavos)}</span>
      </p>
      <ul className="flex flex-col gap-1 text-sm">
        {operacion.pagos.map((pago) => (
          <li key={pago.id} className="flex flex-wrap justify-between gap-x-3">
            <span className="font-medium">{formatearPrecio(pago.importeCentavos)}</span>
            <span className="text-muted-foreground">
              {formatearFecha(pago.fecha)}, {formatearHora(pago.fecha)}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm">Total pagado: {formatearPrecio(operacion.pagadoCentavos)}</p>
      {operacion.saldoCentavos !== null && (
        <p className="font-semibold">Saldo restante: {formatearPrecio(operacion.saldoCentavos)}</p>
      )}
    </article>
  );
}

export function ConsultaApartados() {
  const [resultado, setResultado] = useState<Resultado<OperacionCliente[]> | null>(null);
  const [enviando, iniciar] = useTransition();

  // Se envía a mano para conservar lo capturado cuando la consulta no encuentra nada.
  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    iniciar(async () => setResultado(await consultarMisApartados(null, datos)));
  }

  const campos = resultado && !resultado.ok ? resultado.campos : undefined;

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={enviar} noValidate className="bg-card flex flex-col gap-4 rounded-2xl border p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" autoComplete="name" aria-invalid={Boolean(campos?.nombre)} />
          {campos?.nombre && <p className="text-destructive text-sm">{campos.nombre}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            name="telefono"
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={Boolean(campos?.telefono)}
          />
          {campos?.telefono && <p className="text-destructive text-sm">{campos.telefono}</p>}
        </div>
        {resultado && !resultado.ok && !campos && (
          <p role="alert" className="text-destructive text-sm">
            {resultado.mensaje}
          </p>
        )}
        <Button type="submit" disabled={enviando} className="h-11">
          {enviando ? "Consultando…" : "Consultar"}
        </Button>
      </form>

      {resultado?.ok &&
        (resultado.datos.length === 0 ? (
          <p role="status" className="text-muted-foreground bg-card rounded-xl border p-8 text-center">
            {SIN_INFORMACION}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {resultado.datos.map((operacion) => (
              <TarjetaOperacion key={operacion.id} operacion={operacion} />
            ))}
          </div>
        ))}
    </div>
  );
}
