"use client";

import { registrarVenta } from "@/acciones/operaciones";
import { precioParaCaptura } from "@/dominio/dinero";
import { CasillaAviso, Campo, HojaFormulario } from "./hoja-formulario";

export function HojaVenta({
  producto,
}: {
  producto: { id: string; nombre: string; precioVentaCentavos: number; disponible: number };
}) {
  return (
    <HojaFormulario
      disparador={
        <>
          Vender<span className="sr-only"> {producto.nombre}</span>
        </>
      }
      titulo="Registrar venta"
      descripcion={`${producto.nombre}: ${producto.disponible} disponibles.`}
      accion={registrarVenta}
      envio="Registrar venta"
      varianteDisparador="default"
    >
      <input type="hidden" name="productoId" value={producto.id} />
      <Campo nombre="cantidad" etiqueta="Cantidad" inputMode="numeric" defaultValue="1" />
      <Campo
        nombre="precio"
        etiqueta="Precio acordado"
        inputMode="decimal"
        defaultValue={precioParaCaptura(producto.precioVentaCentavos)}
      />
      <Campo nombre="clienteNombre" etiqueta="Nombre del comprador (opcional)" />
      <Campo nombre="clienteTelefono" etiqueta="Teléfono (opcional)" inputMode="tel" />
      <CasillaAviso />
    </HojaFormulario>
  );
}
