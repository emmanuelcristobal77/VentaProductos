import { Phone } from "lucide-react";
import { EnlaceTelefono } from "@/components/cliente/enlace-telefono";
import { telefonoNegocio } from "@/lib/contacto";

export const LEYENDA_DEVOLUCIONES =
  "Favor de revisar el producto antes de comprarlo, ya que no hay devoluciones.";

export const textoDisponible = (cantidad: number) =>
  cantidad === 1 ? "1 disponible" : `${cantidad} disponibles`;

/** `producto`: nombre del producto o artículo, para contar el interesado (spec 006, FR-006). */
export function LeyendaProducto({ producto }: { producto?: string }) {
  const telefono = telefonoNegocio();

  return (
    <div className="bg-accent flex flex-col gap-2 rounded-xl p-4 text-sm">
      <p>{LEYENDA_DEVOLUCIONES}</p>
      <EnlaceTelefono enlace={telefono.enlace} producto={producto} className="inline-flex items-center gap-2 font-semibold">
        <Phone aria-hidden className="size-4" />
        Contacto: {telefono.texto}
      </EnlaceTelefono>
    </div>
  );
}
