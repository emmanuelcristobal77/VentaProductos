import { Phone } from "lucide-react";
import { telefonoNegocio } from "@/lib/contacto";

export const LEYENDA_DEVOLUCIONES =
  "Favor de revisar el producto antes de comprarlo, ya que no hay devoluciones.";

export const textoDisponible = (cantidad: number) =>
  cantidad === 1 ? "1 disponible" : `${cantidad} disponibles`;

export function LeyendaProducto() {
  const telefono = telefonoNegocio();

  return (
    <div className="bg-accent flex flex-col gap-2 rounded-xl p-4 text-sm">
      <p>{LEYENDA_DEVOLUCIONES}</p>
      <a href={telefono.enlace} className="inline-flex items-center gap-2 font-semibold">
        <Phone aria-hidden className="size-4" />
        Contacto: {telefono.texto}
      </a>
    </div>
  );
}
