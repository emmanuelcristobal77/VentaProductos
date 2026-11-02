"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { marcarEntregada, registrarPago } from "@/acciones/operaciones";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Resultado } from "@/lib/resultado";

export function BotonEntregar({ id, etiqueta }: { id: string; etiqueta: string }) {
  const [enviando, iniciar] = useTransition();

  function entregar() {
    iniciar(async () => {
      const resultado = await marcarEntregada(id);
      if (resultado.ok) toast.success("Entrega registrada.");
      else toast.error(resultado.mensaje);
    });
  }

  return (
    <Button disabled={enviando} onClick={entregar}>
      {etiqueta}
    </Button>
  );
}

/** Confirma una acción que no se puede deshacer y exige su motivo (FR-027, FR-042). */
export function DialogoMotivo({
  etiqueta,
  titulo,
  descripcion,
  accion,
  exito,
}: {
  etiqueta: string;
  titulo: string;
  descripcion: string;
  accion: (motivo: string) => Promise<Resultado<null>>;
  exito: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  function confirmar() {
    iniciar(async () => {
      const resultado = await accion(motivo);
      if (resultado.ok) {
        setAbierto(false);
        toast.success(exito);
      } else {
        setError(resultado.campos?.motivo ?? resultado.mensaje);
      }
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive">
          {etiqueta}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="motivo">Motivo</Label>
          <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Volver
          </Button>
          <Button variant="destructive" disabled={enviando} onClick={confirmar}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FormularioPago({ operacionId }: { operacionId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const importe = String(new FormData(formulario).get("importe") ?? "");
    iniciar(async () => {
      const resultado = await registrarPago(operacionId, importe);
      if (resultado.ok) {
        setError(null);
        formulario.reset();
        toast.success("Pago registrado.");
      } else {
        setError(resultado.campos?.importe ?? resultado.mensaje);
      }
    });
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-2">
      <Label htmlFor="importe">Importe del pago</Label>
      <div className="flex gap-2">
        <Input id="importe" name="importe" inputMode="decimal" aria-invalid={Boolean(error)} />
        <Button type="submit" disabled={enviando}>
          Registrar pago
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </form>
  );
}
