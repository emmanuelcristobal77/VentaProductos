import { ClipboardList, LayoutGrid, Megaphone, Package, PackagePlus, Search } from "lucide-react";
import { EnlaceNavegacion } from "@/components/enlace-navegacion";

const ENLACES = [
  { href: "/admin", etiqueta: "Productos", icono: <Package aria-hidden className="size-5" />, exacto: true },
  {
    href: "/admin/categorias",
    etiqueta: "Categorías",
    icono: <LayoutGrid aria-hidden className="size-5" />,
    exacto: false,
  },
  {
    href: "/admin/operaciones",
    etiqueta: "Operaciones",
    icono: <Search aria-hidden className="size-5" />,
    exacto: false,
  },
  {
    href: "/admin/encargos",
    etiqueta: "Encargos",
    icono: <ClipboardList aria-hidden className="size-5" />,
    exacto: false,
  },
  {
    href: "/admin/articulos-encargo",
    etiqueta: "Artículos",
    icono: <PackagePlus aria-hidden className="size-5" />,
    exacto: false,
  },
];

/**
 * Spec 005, research 7: «Promoción» va solo en la navegación superior. En el celular va como botón
 * en el encabezado, porque en la barra inferior no caben 6 etiquetas.
 */
const ENLACES_SUPERIORES = [
  ...ENLACES,
  {
    href: "/admin/promocion",
    etiqueta: "Promoción",
    icono: <Megaphone aria-hidden className="size-5" />,
    exacto: false,
  },
];

export function NavegacionAdminSuperior() {
  return (
    <nav aria-label="Administración" className="hidden gap-1 md:flex">
      {ENLACES_SUPERIORES.map((enlace) => (
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
