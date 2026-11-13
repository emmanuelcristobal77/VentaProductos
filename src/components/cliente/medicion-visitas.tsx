"use client";

import Script from "next/script";
import { antesDeEnviarUmami, NOMBRE_FILTRO, UMAMI } from "@/lib/estadisticas";

// Spec 006, research 4: el filtro debe existir antes de que el script lo busque. Este módulo se
// evalúa al hidratar, y `afterInteractive` inserta el script después.
if (typeof window !== "undefined") window.antesDeEnviarUmami = antesDeEnviarUmami;

/** Medición anónima de visitas, solo en la sección de cliente (FR-001, FR-002, FR-011). */
export function MedicionVisitas() {
  return (
    <Script
      src={UMAMI.script}
      strategy="afterInteractive"
      data-website-id={UMAMI.idSitio}
      data-domains={UMAMI.dominios}
      data-before-send={NOMBRE_FILTRO}
    />
  );
}
