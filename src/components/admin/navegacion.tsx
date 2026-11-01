import { LayoutGrid, Package } from "lucide-react";
import { EnlaceNavegacion } from "@/components/enlace-navegacion";

const ENLACES = [
  { href: "/admin", etiqueta: "Productos", icono: <Package aria-hidden className="size-5" />, exacto: true },
  {
    href: "/admin/categorias",
    etiqueta: "Categorías",
    icono: <LayoutGrid aria-hidden className="size-5" />,
    exacto: false,
  },
];

export function NavegacionAdminSuperior() {
  return (
    <nav aria-label="Administración" className="hidden gap-1 md:flex">
      {ENLACES.map((enlace) => (
        <EnlaceNavegacion key={enlace.href} {...enlace} />
      ))}
    </nav>
  );
}

export function NavegacionAdminInferior() {
  return (
    <nav
      aria-label="Administración móvil"
      className="bg-card/95 fixed inset-x-0 bottom-0 z-20 flex border-t px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {ENLACES.map((enlace) => (
        <EnlaceNavegacion key={enlace.href} {...enlace} apilado />
      ))}
    </nav>
  );
}
