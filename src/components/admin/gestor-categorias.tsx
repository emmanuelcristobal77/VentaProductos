"use client";

import { useActionState, useEffect, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  darDeBajaCategoria,
  darDeBajaSubcategoria,
  guardarCategoria,
  guardarSubcategoria,
} from "@/acciones/categorias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BotonConfirmar } from "./boton-confirmar";
import type { Resultado } from "@/lib/resultado";
import type { CategoriaConSubcategorias } from "@/servicios/categorias";

type Accion = (anterior: Resultado<null> | null, formulario: FormData) => Promise<Resultado<null>>;

function FormularioNombre({
  accion,
  etiqueta,
  boton,
  id,
  categoriaId,
  valor,
}: {
  accion: Accion;
  etiqueta: string;
  boton: React.ReactNode;
  id?: string;
  categoriaId?: string;
  valor?: string;
}) {
  const [estado, enviar, enviando] = useActionState(accion, null);
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok && !id) formulario.current?.reset();
    if (estado?.ok) toast.success("Guardado.");
  }, [estado, id]);

  const error = estado && !estado.ok ? (estado.campos?.nombre ?? estado.mensaje) : undefined;

  return (
    <form ref={formulario} action={enviar} className="flex flex-1 flex-col gap-1">
      {id && <input type="hidden" name="id" value={id} />}
      {categoriaId && <input type="hidden" name="categoriaId" value={categoriaId} />}
      <div className="flex gap-2">
        <Input name="nombre" aria-label={etiqueta} defaultValue={valor} required className="h-10" />
        <Button type="submit" variant="outline" disabled={enviando} className="h-10 shrink-0">
          {boton}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </form>
  );
}

const Baja = ({ nombre }: { nombre: string }) => (
  <>
    <Trash2 aria-hidden />
    <span className="sr-only">Dar de baja {nombre}</span>
  </>
);

const Renombrar = ({ nombre }: { nombre: string }) => (
  <>
    <Pencil aria-hidden />
    <span className="sr-only">Renombrar {nombre}</span>
  </>
);

export function GestorCategorias({ categorias }: { categorias: CategoriaConSubcategorias[] }) {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <section className="bg-card rounded-xl border p-4">
        <h2 className="mb-3 font-medium">Nueva categoría</h2>
        <FormularioNombre accion={guardarCategoria} etiqueta="Nombre de la categoría" boton="Agregar" />
      </section>

      {categorias.map((categoria) => (
        <section key={categoria.id} aria-label={categoria.nombre} className="bg-card rounded-xl border p-4">
          <div className="flex items-start gap-2">
            <FormularioNombre
              accion={guardarCategoria}
              etiqueta={`Nombre de ${categoria.nombre}`}
              boton={<Renombrar nombre={categoria.nombre} />}
              id={categoria.id}
              valor={categoria.nombre}
            />
            <BotonConfirmar
              etiqueta={<Baja nombre={categoria.nombre} />}
              titulo={`Dar de baja ${categoria.nombre}`}
              descripcion="También se darán de baja sus subcategorías."
              accion={() => darDeBajaCategoria(categoria.id)}
              exito="Categoría dada de baja."
            />
          </div>

          <ul className="mt-3 flex flex-col gap-2 border-l-2 pl-3">
            {categoria.subcategorias.map((sub) => (
              <li key={sub.id} className="flex items-start gap-2">
                <FormularioNombre
                  accion={guardarSubcategoria}
                  etiqueta={`Nombre de ${sub.nombre}`}
                  boton={<Renombrar nombre={sub.nombre} />}
                  id={sub.id}
                  valor={sub.nombre}
                />
                <BotonConfirmar
                  etiqueta={<Baja nombre={sub.nombre} />}
                  titulo={`Dar de baja ${sub.nombre}`}
                  descripcion="Dejará de estar disponible para nuevos productos."
                  accion={() => darDeBajaSubcategoria(sub.id)}
                  exito="Subcategoría dada de baja."
                />
              </li>
            ))}
            <li>
              <FormularioNombre
                accion={guardarSubcategoria}
                etiqueta={`Nueva subcategoría de ${categoria.nombre}`}
                boton="Agregar"
                categoriaId={categoria.id}
              />
            </li>
          </ul>
        </section>
      ))}
    </div>
  );
}
