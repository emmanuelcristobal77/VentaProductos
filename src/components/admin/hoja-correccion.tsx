"use client";

import { corregirOperacion } from "@/acciones/operaciones";
import { precioParaCaptura } from "@/dominio/dinero";
import { Campo, HojaFormulario } from "./hoja-formulario";

export function HojaCorreccion({
  operacion,
}: {
  operacion: {
    id: string;
    clienteNombre: string | null;
    clienteTelefono: string | null;
    precioUnitarioCentavos: number;
  };
}) {
  return (
    <HojaFormulario
      disparador="Corregir datos"
      titulo="Corregir datos"
      descripcion="El producto y la cantidad no se pueden corregir."
      accion={corregirOperacion}
      envio="Guardar corrección"
    >
      <input type="hidden" name="id" value={operacion.id} />
      <Campo nombre="clienteNombre" etiqueta="Nombre del cliente" defaultValue={operacion.clienteNombre ?? ""} />
      <Campo
        nombre="clienteTelefono"
        etiqueta="Teléfono"
        inputMode="tel"
        defaultValue={operacion.clienteTelefono ?? ""}
      />
      <Campo
        nombre="precio"
        etiqueta="Precio acordado"
        inputMode="decimal"
        defaultValue={precioParaCaptura(operacion.precioUnitarioCentavos)}
      />
    </HojaFormulario>
  );
}
