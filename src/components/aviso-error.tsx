"use client";

import { Button } from "@/components/ui/button";

export function AvisoError({ reintentar }: { reintentar: () => void }) {
  return (
    <div role="alert" className="bg-card flex flex-col items-center gap-4 rounded-xl border p-8 text-center">
      <p>Algo salió mal. Inténtalo de nuevo.</p>
      <Button onClick={reintentar} className="h-11">
        Reintentar
      </Button>
    </div>
  );
}
