"use client";

import { darDeBajaProducto } from "@/acciones/productos";
import { BotonConfirmar } from "./boton-confirmar";

export function BotonBajaProducto({ id, nombre }: { id: string; nombre: string }) {
  return (
    <BotonConfirmar
      etiqueta={
        <>
          Dar de baja<span className="sr-only"> {nombre}</span>
        </>
      }
      titulo={`Dar de baja ${nombre}`}
      descripcion="Dejará de mostrarse en el catálogo. Su historial se conserva."
      accion={() => darDeBajaProducto(id)}
      exito="Producto dado de baja."
    />
  );
}
