"use client";

import { useState } from "react";
import type { ResumenCarga } from "@/dominio/carga-masiva";
import { CargadorMasivo } from "./cargador-masivo";
import { ResumenCargaMasiva } from "./resumen-carga";

/** Alterna entre «Subir» y «Resumen»; la carga solo vive en el navegador (research 7). */
export function CargaMasiva() {
  const [resumen, setResumen] = useState<ResumenCarga | null>(null);

  if (!resumen) return <CargadorMasivo alTerminar={setResumen} />;
  return <ResumenCargaMasiva key={resumen.fecha} resumen={resumen} alReiniciar={() => setResumen(null)} />;
}
