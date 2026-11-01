"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAXIMO = 10 * 1024 * 1024;
const LADO_MAXIMO = 1600;
const RECHAZADO = "La foto debe ser JPEG, PNG o WebP de hasta 10 MB.";

/** Reduce la foto en el navegador; si no se puede, sube la original. */
async function reducir(archivo: File): Promise<Blob> {
  try {
    const imagen = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d")?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    const reducida = await new Promise<Blob | null>((listo) => lienzo.toBlob(listo, "image/webp", 0.82));
    return reducida && reducida.size < archivo.size ? reducida : archivo;
  } catch {
    return archivo;
  }
}

export function SelectorFotos({
  iniciales = [],
  nombreProducto,
  error,
}: {
  iniciales?: string[];
  nombreProducto: string;
  error?: string;
}) {
  const [fotos, setFotos] = useState(iniciales);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState("");
  const entrada = useRef<HTMLInputElement>(null);

  async function subir(archivos: FileList | null) {
    if (!archivos?.length) return;
    setAviso("");
    setSubiendo(true);

    for (const archivo of Array.from(archivos)) {
      if (!TIPOS.includes(archivo.type) || archivo.size > TAMANO_MAXIMO) {
        setAviso(RECHAZADO);
        continue;
      }
      const respuesta = await fetch("/api/fotos", { method: "POST", body: await reducir(archivo) });
      const resultado = await respuesta.json();
      if (resultado.ok) setFotos((actuales) => [...actuales, resultado.datos.archivo]);
      else setAviso(resultado.mensaje);
    }

    setSubiendo(false);
    if (entrada.current) entrada.current.value = "";
  }

  const mensaje = aviso || error;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">Fotos</legend>
      {fotos.map((archivo) => (
        <input key={archivo} type="hidden" name="fotos" value={archivo} />
      ))}
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {fotos.map((archivo, indice) => (
          <li key={archivo} className="bg-muted relative aspect-square overflow-hidden rounded-lg">
            <Image
              src={`/api/fotos/${archivo}`}
              alt={`Foto ${indice + 1} de ${nombreProducto || "el producto"}`}
              fill
              sizes="160px"
              className="object-cover"
            />
            <button
              type="button"
              aria-label={`Quitar foto ${indice + 1}`}
              onClick={() => setFotos((actuales) => actuales.filter((f) => f !== archivo))}
              className="bg-background/90 absolute top-1 right-1 flex size-8 items-center justify-center rounded-full shadow"
            >
              <X aria-hidden className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <input
        ref={entrada}
        id="agregar-fotos"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        aria-label="Agregar fotos"
        onChange={(evento) => subir(evento.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        disabled={subiendo}
        onClick={() => entrada.current?.click()}
        className="h-11 w-fit"
      >
        <ImagePlus aria-hidden />
        {subiendo ? "Subiendo…" : "Agregar fotos"}
      </Button>
      {mensaje && (
        <p role="alert" className="text-destructive text-sm">
          {mensaje}
        </p>
      )}
    </fieldset>
  );
}
