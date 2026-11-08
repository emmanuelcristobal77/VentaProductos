"use client";

import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  COLUMNAS,
  LIMITE_BYTES,
  NOMBRE_EJEMPLO,
  RECHAZO,
  RENGLON_EJEMPLO,
  textoEjemplo,
  type ResumenCarga,
} from "@/dominio/carga-masiva";
import type { Resultado } from "@/lib/resultado";
import { descargarTexto } from "./descargar-texto";

const FORMATOS: Record<(typeof COLUMNAS)[number], string> = {
  nombre: "Obligatorio. Si ya existe un producto con ese nombre, se te pregunta si lo actualizas.",
  descripcion: "Obligatoria.",
  categoria: "Obligatoria. Si no existe, se crea.",
  subcategoria: "Opcional; puede ir vacía.",
  existencia: "Número entero de 0 en adelante.",
  precio_compra: "Mayor a cero, con punto decimal, sin $ ni comas. Ejemplo: 1250.00",
  precio_venta: "Igual que el precio de compra.",
  fotos: "Nombres de las fotos separados por coma; la primera es la principal.",
};

type Estado = { tipo: "listo" } | { tipo: "subiendo"; avance: number } | { tipo: "procesando" };

function subir(archivo: File, alAvanzar: (avance: number) => void): Promise<Resultado<ResumenCarga>> {
  return new Promise((resolver, rechazar) => {
    const solicitud = new XMLHttpRequest();
    solicitud.open("POST", "/api/admin/cargas");
    solicitud.setRequestHeader("Content-Type", "application/zip");
    solicitud.responseType = "json";
    solicitud.upload.onprogress = (e) => {
      if (e.lengthComputable) alAvanzar(Math.round((e.loaded / e.total) * 100));
    };
    solicitud.upload.onload = () => alAvanzar(100);
    solicitud.onload = () => {
      if (solicitud.response && typeof solicitud.response === "object") resolver(solicitud.response);
      else rechazar(new Error("Respuesta vacía"));
    };
    solicitud.onerror = () => rechazar(new Error("Sin conexión"));
    solicitud.send(archivo);
  });
}

/** Estado «Subir» de la carga masiva (contracts/interfaz.md, research 8). */
export function CargadorMasivo({ alTerminar }: { alTerminar: (resumen: ResumenCarga) => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: "listo" });
  const [error, setError] = useState<string | null>(null);
  const ocupado = estado.tipo !== "listo";

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);
    if (!archivo) return setError("Elige el comprimido .zip con tus productos y fotos.");
    if (!archivo.name.toLowerCase().endsWith(".zip")) return setError(RECHAZO.noEsZip);
    if (archivo.size > LIMITE_BYTES) return setError(RECHAZO.muyGrande);

    setEstado({ tipo: "subiendo", avance: 0 });
    try {
      const resultado = await subir(archivo, (avance) =>
        setEstado(avance >= 100 ? { tipo: "procesando" } : { tipo: "subiendo", avance }),
      );
      if (resultado.ok) alTerminar(resultado.datos);
      else setError(resultado.mensaje);
    } catch {
      setError("No se pudo subir el archivo. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEstado({ tipo: "listo" });
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <section aria-labelledby="como-preparar" className="flex flex-col gap-3">
        <h2 id="como-preparar" className="text-lg font-semibold">
          Cómo preparar el archivo
        </h2>
        <p>
          Mete en un comprimido .zip un archivo de texto (.txt) con un renglón por producto y las fotos de esos
          productos. Las columnas van separadas por «|» y en este orden, con un primer renglón de encabezado.
        </p>
        <ul className="text-muted-foreground list-disc pl-5 text-sm">
          <li>Hasta 200 productos y un comprimido de hasta 50 MB.</li>
          <li>Fotos JPEG, PNG o WebP de hasta 10 MB cada una.</li>
          <li>Guarda el archivo de texto con codificación UTF-8, la que usa el Bloc de notas.</li>
          <li>Ningún dato puede llevar el carácter «|».</li>
        </ul>
        <ol className="flex flex-col gap-2 text-sm">
          {COLUMNAS.map((columna, i) => (
            <li key={columna} className="flex flex-col sm:flex-row sm:gap-2">
              <code className="font-semibold">
                {i + 1}. {columna}
              </code>
              <span className="text-muted-foreground">{FORMATOS[columna]}</span>
            </li>
          ))}
        </ol>
        <p className="text-sm font-medium">Renglón de ejemplo:</p>
        <pre className="bg-muted overflow-x-auto rounded-md p-3 text-sm whitespace-pre-wrap break-all">
          {RENGLON_EJEMPLO}
        </pre>
        <div>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => descargarTexto(textoEjemplo(), NOMBRE_EJEMPLO)}
          >
            <Download aria-hidden />
            Descargar archivo de ejemplo
          </Button>
        </div>
      </section>

      <form onSubmit={enviar} className="bg-card flex flex-col gap-4 rounded-xl border p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="comprimido">Comprimido .zip con productos y fotos</Label>
          <input
            id="comprimido"
            type="file"
            accept=".zip,application/zip"
            disabled={ocupado}
            aria-describedby={error ? "comprimido-error" : undefined}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setArchivo(e.target.files?.[0] ?? null);
              setError(null);
            }}
            className="file:bg-secondary file:text-secondary-foreground min-h-11 text-sm file:mr-3 file:h-11 file:rounded-md file:border-0 file:px-4 file:font-medium"
          />
          {error && (
            <p id="comprimido-error" className="text-destructive text-sm whitespace-pre-line">
              {error}
            </p>
          )}
        </div>

        <div aria-live="polite" className="flex flex-col gap-2 text-sm">
          {estado.tipo === "subiendo" && (
            <>
              <progress value={estado.avance} max={100} className="w-full" aria-label="Avance de la subida" />
              <span>Subiendo… {estado.avance} %</span>
            </>
          )}
          {estado.tipo === "procesando" && <span>Procesando los productos…</span>}
        </div>

        <div>
          <Button type="submit" className="h-11" disabled={ocupado}>
            <Upload aria-hidden />
            Subir y procesar
          </Button>
        </div>
      </form>
    </div>
  );
}
