"use client";

import { registrarEncargo } from "@/acciones/operaciones";
import { precioParaCaptura } from "@/dominio/dinero";
import { Campo, HojaFormulario } from "./hoja-formulario";

type Origen =
  | { campo: "productoId" | "articuloEncargoId"; id: string; nombre: string; precioCentavos: number }
  | null;

/** Sin origen, captura un artículo que no está en el catálogo (US5-2). */
export function HojaEncargo({ origen }: { origen: Origen }) {
  return (
    <HojaFormulario
      disparador={
        origen ? (
          <>
            Encargar<span className="sr-only"> {origen.nombre}</span>
          </>
        ) : (
          "Nuevo encargo"
        )
      }
      titulo="Registrar encargo"
      descripcion={origen ? origen.nombre : "Para un artículo que no está en el catálogo."}
      accion={registrarEncargo}
      envio="Registrar encargo"
      varianteDisparador={origen ? "outline" : "default"}
    >
      {origen ? (
        <input type="hidden" name={origen.campo} value={origen.id} />
      ) : (
        <>
          <Campo nombre="articuloNombre" etiqueta="Artículo" />
          <Campo nombre="articuloDescripcion" etiqueta="Descripción" />
        </>
      )}
      <Campo nombre="cantidad" etiqueta="Cantidad" inputMode="numeric" defaultValue="1" />
      <Campo
        nombre="precio"
        etiqueta="Precio acordado"
        inputMode="decimal"
        defaultValue={origen ? precioParaCaptura(origen.precioCentavos) : ""}
      />
      <Campo nombre="clienteNombre" etiqueta="Nombre del cliente" />
      <Campo nombre="clienteTelefono" etiqueta="Teléfono" inputMode="tel" />
      <Campo nombre="pagoInicial" etiqueta="Anticipo" inputMode="decimal" />
    </HojaFormulario>
  );
}
