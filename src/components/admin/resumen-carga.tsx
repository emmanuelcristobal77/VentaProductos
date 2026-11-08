"use client";

import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  armarReporte,
  hayQueRevisar,
  nombreReporte,
  type Decision,
  type RenglonConMotivo,
  type ResumenCarga,
} from "@/dominio/carga-masiva";
import { formatearFecha, formatearHora } from "@/dominio/fechas";
import { descargarTexto } from "./descargar-texto";
import { ListaExistentes } from "./lista-existentes";

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-lg font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function ListaRenglones({ renglones }: { renglones: RenglonConMotivo[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {renglones.map((r) => (
        <li key={r.numero} className="bg-card rounded-lg border p-3 text-sm">
          <p className="font-medium">
            Renglón {r.numero}
            {r.campos[0] && ` · ${r.campos[0]}`}
          </p>
          <p className="text-muted-foreground">{r.motivo}</p>
        </li>
      ))}
    </ul>
  );
}

/** Estado «Resumen» de la carga masiva (FR-013, contracts/interfaz.md). */
export function ResumenCargaMasiva({ resumen, alReiniciar }: { resumen: ResumenCarga; alReiniciar: () => void }) {
  const [decisiones, setDecisiones] = useState<Record<string, Decision>>({});
  const { cantidades } = resumen;
  const tarjetas = [
    ["Productos nuevos", cantidades.nuevos],
    ["Nuevos sin foto", cantidades.sinFoto],
    ["Ya existen con cambios", cantidades.existentes],
    ["Sin cambios", cantidades.sinCambios],
    ["Renglones rechazados", cantidades.rechazados],
    ["Fotos no usadas", cantidades.fotosNoUsadas],
  ] as const;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <p>
        Carga del {formatearFecha(resumen.fecha)}, {formatearHora(resumen.fecha)}
      </p>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tarjetas.map(([texto, cantidad]) => (
          <li key={texto} className="bg-card flex flex-col rounded-xl border p-3">
            <span className="text-2xl font-semibold">{cantidad}</span>
            <span className="text-muted-foreground text-sm">{texto}</span>
          </li>
        ))}
      </ul>

      {hayQueRevisar(resumen) ? (
        <div>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => descargarTexto(armarReporte(resumen, decisiones), nombreReporte(resumen.fecha))}
          >
            <Download aria-hidden />
            Descargar reporte
          </Button>
        </div>
      ) : (
        <p className="font-medium">No hay nada que revisar.</p>
      )}

      {resumen.sinFoto.length > 0 && (
        <Seccion id="sin-foto" titulo="Productos nuevos sin foto">
          <p className="text-muted-foreground text-sm">
            No se registraron. Súbelos en otra carga con su foto.
          </p>
          <ListaRenglones renglones={resumen.sinFoto} />
        </Seccion>
      )}

      {resumen.existentes.length > 0 && (
        <Seccion id="existentes" titulo="Productos que ya existen">
          <p className="text-muted-foreground text-sm">
            No cambian hasta que los marques y confirmes. La existencia se reemplaza por la del archivo y las
            fotos nuevas se agregan sin quitar ninguna.
          </p>
          <ListaExistentes existentes={resumen.existentes} decisiones={decisiones} alDecidir={setDecisiones} />
        </Seccion>
      )}

      {resumen.rechazados.length > 0 && (
        <Seccion id="rechazados" titulo="Renglones rechazados">
          <ListaRenglones renglones={resumen.rechazados} />
        </Seccion>
      )}

      {resumen.avisosFotos.length > 0 && (
        <Seccion id="avisos-fotos" titulo="Avisos de fotos">
          <ul className="flex flex-col gap-2">
            {resumen.avisosFotos.map((a) => (
              <li key={a.numero} className="bg-card rounded-lg border p-3 text-sm">
                <p className="font-medium">
                  Renglón {a.numero} · {a.nombre}
                </p>
                <ul className="text-aviso">
                  {a.avisos.map((aviso) => (
                    <li key={aviso}>{aviso}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-11" onClick={alReiniciar}>
          Hacer otra carga
        </Button>
        <Button asChild className="h-11">
          <Link href="/admin">Ir a productos</Link>
        </Button>
      </div>
    </div>
  );
}
