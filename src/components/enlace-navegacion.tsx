"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function EnlaceNavegacion({
  href,
  etiqueta,
  icono,
  exacto = false,
  apilado = false,
}: {
  href: string;
  etiqueta: string;
  icono: React.ReactNode;
  exacto?: boolean;
  apilado?: boolean;
}) {
  const ruta = usePathname();
  const activo = exacto ? ruta === href : ruta.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "focus-visible:ring-ring flex items-center rounded-lg font-medium outline-none transition-colors focus-visible:ring-2",
        apilado ? "min-h-14 flex-1 flex-col justify-center gap-1 text-xs" : "gap-2 px-3 py-2 text-sm",
        activo ? "text-primary" : "text-muted-foreground hover:text-foreground",
        activo && !apilado && "bg-accent",
      )}
    >
      {icono}
      {etiqueta}
    </Link>
  );
}
