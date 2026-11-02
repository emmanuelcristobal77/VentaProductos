"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { guardarArticuloEncargo } from "@/acciones/articulos-encargo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ArticuloAdmin } from "@/consultas/admin";
import { precioParaCaptura } from "@/dominio/dinero";
import { SelectorFotos } from "./selector-fotos";

export function FormularioArticulo({ articulo }: { articulo?: ArticuloAdmin }) {
  const router = useRouter();
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(0);
  const [nombre, setNombre] = useState(articulo?.nombre ?? "");
  const [enviando, iniciar] = useTransition();

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    iniciar(async () => {
      const resultado = await guardarArticuloEncargo(datos);
      if (resultado.ok) {
        toast.success("Artículo guardado.");
        setErrores({});
        setNombre("");
        setVersion((v) => v + 1);
        if (articulo) router.push("/admin/articulos-encargo");
      } else {
        setErrores(resultado.campos ?? {});
        if (!resultado.campos) toast.error(resultado.mensaje);
      }
    });
  }

  return (
    <form key={version} onSubmit={enviar} noValidate className="bg-card flex flex-col gap-4 rounded-xl border p-4">
      {articulo && <input type="hidden" name="id" value={articulo.id} />}
      <div className="flex flex-col gap-2">
        <Label htmlFor="articulo-nombre">Nombre</Label>
        <Input
          id="articulo-nombre"
          name="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          aria-invalid={Boolean(errores.nombre)}
        />
        {errores.nombre && <p className="text-destructive text-sm">{errores.nombre}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="articulo-descripcion">Descripción</Label>
        <Textarea
          id="articulo-descripcion"
          name="descripcion"
          defaultValue={articulo?.descripcion}
          aria-invalid={Boolean(errores.descripcion)}
        />
        {errores.descripcion && <p className="text-destructive text-sm">{errores.descripcion}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="articulo-precio">Precio</Label>
        <Input
          id="articulo-precio"
          name="precio"
          inputMode="decimal"
          defaultValue={articulo && precioParaCaptura(articulo.precioCentavos)}
          aria-invalid={Boolean(errores.precio)}
        />
        {errores.precio && <p className="text-destructive text-sm">{errores.precio}</p>}
      </div>
      <SelectorFotos iniciales={articulo?.fotos} nombreProducto={nombre || "Artículo"} />
      <Button type="submit" disabled={enviando} className="h-11">
        {enviando ? "Guardando…" : "Guardar artículo"}
      </Button>
    </form>
  );
}
