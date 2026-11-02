"use client";

import { registrarApartado } from "@/acciones/operaciones";
import { precioParaCaptura } from "@/dominio/dinero";
import { Campo, HojaFormulario } from "./hoja-formulario";

export function HojaApartado({
  producto,
}: {
  producto: { id: string; nombre: string; precioVentaCentavos: number; disponible: number };
}) {
  return (
    <HojaFormulario
      disparador={
        <>
          Apartar<span className="sr-only"> {producto.nombre}</span>
        </>
      }
      titulo="Registrar apartado"
      descripcion={`${producto.nombre}: ${producto.disponible} disponibles.`}
      accion={registrarApartado}
      envio="Registrar apartado"
    >
      <input type="hidden" name="productoId" value={producto.id} />
      <Campo nombre="cantidad" etiqueta="Cantidad" inputMode="numeric" defaultValue="1" />
      <Campo
        nombre="precio"
        etiqueta="Precio acordado"
        inputMode="decimal"
        defaultValue={precioParaCaptura(producto.precioVentaCentavos)}
      />
      <Campo nombre="clienteNombre" etiqueta="Nombre del cliente" />
      <Campo nombre="clienteTelefono" etiqueta="Teléfono" inputMode="tel" />
      <Campo nombre="pagoInicial" etiqueta="Pago inicial" inputMode="decimal" />
    </HojaFormulario>
  );
}
