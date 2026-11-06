"use client";

import { useId, type Ref } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Campo de búsqueda de las listas de productos y su región aria-live (spec 002, FR-001 y FR-016). */
export function BuscadorProductos({
  texto,
  alCambiar,
  anuncio,
  ref,
}: {
  texto: string;
  alCambiar: (texto: string) => void;
  anuncio: string;
  ref?: Ref<HTMLDivElement>;
}) {
  const id = useId();

  return (
    <div ref={ref} className="flex scroll-mt-20 flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        Buscar productos
      </label>
      <div className="relative">
        <Search aria-hidden className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2" />
        <Input
          id={id}
          type="search"
          value={texto}
          onChange={(evento) => alCambiar(evento.target.value)}
          onKeyDown={(evento) => {
            // En el celular, "Buscar" en el teclado solo lo cierra: los resultados ya están a la vista.
            if (evento.key === "Enter") evento.currentTarget.blur();
          }}
          placeholder="Escribe el nombre o una palabra"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={100}
          className="bg-card h-12 pl-10 text-base md:text-base"
        />
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </p>
    </div>
  );
}
