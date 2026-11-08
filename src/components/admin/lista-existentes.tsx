"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { confirmarActualizaciones } from "@/acciones/carga-masiva";
import { Button } from "@/components/ui/button";
import { formatearPrecio } from "@/dominio/dinero";
import {
  RESULTADO,
  textoActualizados,
  type Cambio,
  type DatosComparables,
  type Decision,
  type ExistenteConCambios,
} from "@/dominio/carga-masiva";

const FILAS: { cambio: Cambio; etiqueta: string; valor: (d: DatosComparables) => string }[] = [
  { cambio: "nombre", etiqueta: "Nombre", valor: (d) => d.nombre },
  { cambio: "descripcion", etiqueta: "Descripción", valor: (d) => d.descripcion },
  { cambio: "categoria", etiqueta: "Categoría", valor: (d) => d.categoria },
  { cambio: "subcategoria", etiqueta: "Subcategoría", valor: (d) => d.subcategoria ?? "Sin subcategoría" },
  { cambio: "existencia", etiqueta: "Existencia", valor: (d) => String(d.existencia) },
  { cambio: "precioCompra", etiqueta: "Precio de compra", valor: (d) => formatearPrecio(d.precioCompraCentavos) },
  { cambio: "precioVenta", etiqueta: "Precio de venta", valor: (d) => formatearPrecio(d.precioVentaCentavos) },
];

function TextoDecision({ decision }: { decision: Decision }) {
  if (decision.tipo === "pendiente") return null;
  const clase =
    decision.tipo === "actualizado" ? "text-exito" : decision.tipo === "error" ? "text-destructive" : "text-muted-foreground";
  return (
    <p className={`text-sm font-semibold ${clase}`}>
      {RESULTADO[decision.tipo]}
      {decision.tipo === "error" && `: ${decision.motivo}`}
    </p>
  );
}

/** Lista «Productos que ya existen» con su comparación y confirmación (FR-014 a FR-017, research 11). */
export function ListaExistentes({
  existentes,
  decisiones,
  alDecidir,
}: {
  existentes: ExistenteConCambios[];
  decisiones: Record<string, Decision>;
  alDecidir: (decisiones: Record<string, Decision>) => void;
}) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const confirmado = existentes.some((e) => decisiones[e.productoId] && decisiones[e.productoId].tipo !== "pendiente");

  useEffect(() => {
    if (confirmado || existentes.length === 0) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [confirmado, existentes.length]);

  const alternar = (id: string, marcar: boolean) =>
    setMarcados((actuales) => {
      const nuevos = new Set(actuales);
      if (marcar) nuevos.add(id);
      else nuevos.delete(id);
      return nuevos;
    });

  async function confirmar() {
    setEnviando(true);
    const elegidos = existentes.filter((e) => marcados.has(e.productoId));
    const respuesta = await confirmarActualizaciones(
      elegidos.map((e) => ({ productoId: e.productoId, campos: e.campos, fotosNuevas: e.fotosNuevas })),
    ).catch(() => null);
    setEnviando(false);

    if (!respuesta || !respuesta.ok) {
      toast.error(respuesta?.mensaje ?? "No se pudo actualizar. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    const nuevas: Record<string, Decision> = {};
    for (const e of existentes) nuevas[e.productoId] = { tipo: "noActualizado" };
    for (const r of respuesta.datos.resultados) {
      nuevas[r.productoId] = r.ok ? { tipo: "actualizado" } : { tipo: "error", motivo: r.motivo };
    }
    alDecidir(nuevas);
    toast.success(textoActualizados(respuesta.datos.resultados.filter((r) => r.ok).length));
  }

  return (
    <div className="flex flex-col gap-4">
      {!confirmado && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => setMarcados(new Set(existentes.map((e) => e.productoId)))}
          >
            Marcar todos
          </Button>
          <Button type="button" variant="outline" className="h-11" onClick={() => setMarcados(new Set())}>
            Desmarcar todos
          </Button>
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {existentes.map((e) => {
          const decision = decisiones[e.productoId] ?? { tipo: "pendiente" };
          const idCasilla = `actualizar-${e.productoId}`;
          return (
            <li key={e.productoId} className="bg-card flex flex-col gap-3 rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <input
                  id={idCasilla}
                  type="checkbox"
                  className="mt-0.5 size-6 shrink-0"
                  checked={marcados.has(e.productoId)}
                  disabled={confirmado || enviando}
                  onChange={(ev) => alternar(e.productoId, ev.target.checked)}
                />
                <label htmlFor={idCasilla} className="font-medium">
                  Actualizar «{e.actual.nombre}»
                  <span className="text-muted-foreground block text-sm font-normal">Renglón {e.numero}</span>
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Datos de {e.actual.nombre}: ahora y en el archivo</caption>
                  <thead>
                    <tr className="text-left">
                      <th scope="col" className="py-1 pr-2 font-medium">Dato</th>
                      <th scope="col" className="py-1 pr-2 font-medium">Ahora</th>
                      <th scope="col" className="py-1 font-medium">En el archivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FILAS.map(({ cambio, etiqueta, valor }) => {
                      const cambia = e.cambios.includes(cambio);
                      return (
                        <tr key={cambio} className={cambia ? "bg-accent text-accent-foreground" : undefined}>
                          <th scope="row" className="py-1 pr-2 align-top font-normal">
                            {etiqueta}
                            {cambia && <span className="font-semibold"> · Cambia</span>}
                          </th>
                          <td className="py-1 pr-2 align-top break-words">{valor(e.actual)}</td>
                          <td className="py-1 align-top break-words">{valor(e.archivo)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {e.fotosNuevas.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">Fotos nuevas · Cambia</p>
                  <ul className="flex flex-wrap gap-2">
                    {e.fotosNuevas.map((f, i) => (
                      <li key={f.archivo} className="bg-muted relative size-20 overflow-hidden rounded-lg">
                        <Image
                          src={`/api/fotos/${f.archivo}`}
                          alt={`Foto nueva ${i + 1} de ${e.archivo.nombre}`}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {e.fotosFaltantes.length > 0 && (
                <ul className="text-aviso text-sm">
                  {e.fotosFaltantes.map((aviso) => (
                    <li key={aviso}>{aviso}</li>
                  ))}
                </ul>
              )}
              {e.archivo.existencia < e.actual.apartadas && (
                <p className="text-aviso text-sm">
                  Tiene {e.actual.apartadas} apartadas; no se podrá actualizar
                </p>
              )}
              <TextoDecision decision={decision} />
            </li>
          );
        })}
      </ul>

      <div>
        <Button type="button" className="h-11" disabled={confirmado || enviando} onClick={confirmar}>
          Actualizar marcados ({marcados.size})
        </Button>
      </div>
    </div>
  );
}
