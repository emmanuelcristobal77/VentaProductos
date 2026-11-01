"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { guardarProducto } from "@/acciones/productos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectorFotos } from "./selector-fotos";
import type { ProductoAdmin } from "@/consultas/admin";
import type { CategoriaConSubcategorias } from "@/servicios/categorias";

const NUEVA = "__nueva__";
const CLASE_SELECT =
  "border-input bg-card focus-visible:ring-ring h-11 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2";

function Campo({
  id,
  etiqueta,
  error,
  children,
}: {
  id: string;
  etiqueta: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormularioProducto({
  categorias,
  producto,
  valores,
}: {
  categorias: CategoriaConSubcategorias[];
  producto?: ProductoAdmin;
  valores?: { precioCompra: string; precioVenta: string };
}) {
  const router = useRouter();
  const [estado, accion, enviando] = useActionState(guardarProducto, null);
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [categoria, setCategoria] = useState(producto?.categoriaId ?? "");
  const [subcategoria, setSubcategoria] = useState(producto?.subcategoriaId ?? "");

  useEffect(() => {
    if (estado?.ok) {
      toast.success("Producto guardado.");
      router.push("/admin");
    } else if (estado && !estado.campos) {
      toast.error(estado.mensaje);
    }
  }, [estado, router]);

  const errores = estado && !estado.ok ? (estado.campos ?? {}) : {};
  const errorFotos = estado && !estado.ok && estado.codigo === "FOTO_REQUERIDA" ? estado.mensaje : undefined;
  const subcategorias = categorias.find((c) => c.id === categoria)?.subcategorias ?? [];

  return (
    <form action={accion} className="flex max-w-2xl flex-col gap-5">
      {producto && <input type="hidden" name="id" value={producto.id} />}

      <Campo id="nombre" etiqueta="Nombre" error={errores.nombre}>
        <Input
          id="nombre"
          name="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="h-11"
        />
      </Campo>

      <Campo id="descripcion" etiqueta="Descripción" error={errores.descripcion}>
        <Textarea id="descripcion" name="descripcion" defaultValue={producto?.descripcion} required />
      </Campo>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="categoria" etiqueta="Categoría" error={errores.categoria}>
          <select
            id="categoria"
            name="categoria"
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value);
              setSubcategoria("");
            }}
            required
            className={CLASE_SELECT}
          >
            <option value="">Elige una categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
            <option value={NUEVA}>Nueva categoría…</option>
          </select>
        </Campo>

        <Campo id="subcategoria" etiqueta="Subcategoría (opcional)" error={errores.subcategoria}>
          <select
            id="subcategoria"
            name="subcategoria"
            value={subcategoria}
            onChange={(e) => setSubcategoria(e.target.value)}
            disabled={!categoria}
            className={CLASE_SELECT}
          >
            <option value="">Sin subcategoría</option>
            {subcategorias.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
            <option value={NUEVA}>Nueva subcategoría…</option>
          </select>
        </Campo>

        {categoria === NUEVA && (
          <Campo id="categoriaNueva" etiqueta="Nombre de la categoría nueva" error={errores.nombre}>
            <Input id="categoriaNueva" name="categoriaNueva" required className="h-11" />
          </Campo>
        )}
        {subcategoria === NUEVA && (
          <Campo id="subcategoriaNueva" etiqueta="Nombre de la subcategoría nueva">
            <Input id="subcategoriaNueva" name="subcategoriaNueva" required className="h-11" />
          </Campo>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Campo id="existencia" etiqueta="Cantidad existente" error={errores.existencia}>
          <Input
            id="existencia"
            name="existencia"
            type="number"
            min={0}
            step={1}
            defaultValue={producto?.existencia}
            required
            className="h-11"
          />
        </Campo>
        <Campo id="precioCompra" etiqueta="Precio de compra" error={errores.precioCompra}>
          <Input
            id="precioCompra"
            name="precioCompra"
            inputMode="decimal"
            defaultValue={valores?.precioCompra}
            required
            className="h-11"
          />
        </Campo>
        <Campo id="precioVenta" etiqueta="Precio de venta" error={errores.precioVenta}>
          <Input
            id="precioVenta"
            name="precioVenta"
            inputMode="decimal"
            defaultValue={valores?.precioVenta}
            required
            className="h-11"
          />
        </Campo>
      </div>

      <SelectorFotos iniciales={producto?.fotos} nombreProducto={nombre} error={errorFotos} />

      {estado && !estado.ok && estado.campos && (
        <p role="alert" className="text-destructive text-sm">
          {estado.mensaje}
        </p>
      )}

      <Button type="submit" disabled={enviando} className="h-11 sm:w-fit">
        {enviando ? "Guardando…" : "Guardar producto"}
      </Button>
    </form>
  );
}
