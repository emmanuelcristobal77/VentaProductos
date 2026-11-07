"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { borrarDatosCliente } from "@/acciones/operaciones";
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

const operacionesEn = (n: number) => (n === 1 ? "1 operación" : `${n} operaciones`);

/** Confirma el borrado de los datos del cliente, que no se puede deshacer (spec 003, FR-014 y FR-015). */
export function DialogoBorrarDatos({ operacionId, cuenta }: { operacionId: string; cuenta: number }) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  function confirmar() {
    iniciar(async () => {
      const resultado = await borrarDatosCliente(operacionId);
      if (resultado.ok) {
        setAbierto(false);
        toast.success(`Datos del cliente borrados en ${operacionesEn(resultado.datos.borradas)}.`);
      } else {
        setError(resultado.mensaje);
      }
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive">
          Borrar datos del cliente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrar datos del cliente</DialogTitle>
          <DialogDescription>
            Se borrarán el nombre y el teléfono de {operacionesEn(cuenta)}. Los importes y pagos se conservan.
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
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
