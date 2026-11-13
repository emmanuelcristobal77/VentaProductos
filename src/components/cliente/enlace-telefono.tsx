"use client";

import { EVENTO_INTERES, paginaActual } from "@/lib/estadisticas";

/**
 * Enlace al teléfono del negocio que cuenta un interesado (spec 006, FR-006, research 5).
 * No cancela ni espera nada: la llamada se abre igual aunque el servicio de estadísticas falle.
 */
export function EnlaceTelefono({
  enlace,
  producto,
  className,
  children,
}: {
  enlace: string;
  /** Nombre visible del producto o artículo por encargo, si el teléfono está en su ficha. */
  producto?: string;
  className?: string;
  children: React.ReactNode;
}) {
  function contarInteres() {
    try {
      const pagina = paginaActual(window.location.pathname);
      window.umami?.track(EVENTO_INTERES, producto ? { pagina, producto } : { pagina });
    } catch {
      // FR-005: un fallo de la medición nunca afecta la llamada.
    }
  }

  return (
    <a href={enlace} className={className} onClick={contarInteres}>
      {children}
    </a>
  );
}
