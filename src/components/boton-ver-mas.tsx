"use client";

import { Button } from "@/components/ui/button";
import type { EstadoCarga } from "@/lib/usar-lista-paginada";

export const ERROR_CARGA = "No se pudieron cargar más productos. Revisa tu conexión e inténtalo de nuevo.";

/** Botón «Ver más» al final de una lista, con su estado de carga y de error (FR-011, FR-012, FR-015). */
export function BotonVerMas({
  siguiente,
  estado,
  alPulsar,
}: {
  siguiente: string | null;
  estado: EstadoCarga;
  alPulsar: () => void;
}) {
  const cargando = estado === "cargandoMas";

  return (
    <div className="flex flex-col items-center gap-3">
      {estado === "error" && (
        <p role="alert" className="text-destructive text-center text-sm font-medium">
          {ERROR_CARGA}
        </p>
      )}
      {siguiente && (
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full max-w-xs text-base"
          disabled={cargando}
          onClick={alPulsar}
        >
          {cargando ? "Cargando…" : "Ver más"}
        </Button>
      )}
    </div>
  );
}
