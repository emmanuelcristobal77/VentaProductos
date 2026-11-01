import { PackageSearch, Store } from "lucide-react";
import { EnlaceNavegacion } from "@/components/enlace-navegacion";

const ENLACES = [
  { href: "/", etiqueta: "Catálogo", icono: <Store aria-hidden className="size-5" />, exacto: true },
  {
    href: "/encargos",
    etiqueta: "Por encargo",
    icono: <PackageSearch aria-hidden className="size-5" />,
    exacto: false,
  },
];

export function NavegacionSuperior() {
  return (
    <nav aria-label="Principal" className="hidden gap-1 md:flex">
      {ENLACES.map((enlace) => (
        <EnlaceNavegacion key={enlace.href} {...enlace} />
      ))}
    </nav>
  );
}

export function NavegacionInferior() {
  return (
    <nav
      aria-label="Principal móvil"
      className="bg-card/95 fixed inset-x-0 bottom-0 z-20 flex border-t px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {ENLACES.map((enlace) => (
        <EnlaceNavegacion key={enlace.href} {...enlace} apilado />
      ))}
    </nav>
  );
}
