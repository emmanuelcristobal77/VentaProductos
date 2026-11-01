"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import type { Resultado } from "@/lib/resultado";

export function BotonConfirmar({
  etiqueta,
  titulo,
  descripcion,
  accion,
  exito,
}: {
  etiqueta: React.ReactNode;
  titulo: string;
  descripcion: string;
  accion: () => Promise<Resultado<null>>;
  exito: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [enviando, iniciar] = useTransition();

  function confirmar() {
    iniciar(async () => {
      const resultado = await accion();
      setAbierto(false);
      if (resultado.ok) toast.success(exito);
      else toast.error(resultado.mensaje);
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">
          {etiqueta}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Volver
          </Button>
          <Button variant="destructive" disabled={enviando} onClick={confirmar}>
            Confirmar baja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
