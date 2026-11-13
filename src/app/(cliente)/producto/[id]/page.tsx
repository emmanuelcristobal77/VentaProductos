import Image from "next/image";
import { notFound } from "next/navigation";
import { LeyendaProducto, textoDisponible } from "@/components/cliente/leyenda-producto";
import { Badge } from "@/components/ui/badge";
import { obtenerProducto } from "@/consultas/publicas";
import { formatearPrecio } from "@/dominio/dinero";

export const dynamic = "force-dynamic";

export default async function PaginaProducto({ params }: { params: Promise<{ id: string }> }) {
  const producto = obtenerProducto((await params).id);
  if (!producto) notFound();

  return (
    <article className="grid gap-6 md:grid-cols-2 md:gap-10">
      <div className="grid grid-cols-2 gap-2">
        {producto.fotos.map((archivo, indice) => (
          <div
            key={archivo}
            className={`bg-muted relative aspect-square overflow-hidden rounded-2xl ${indice === 0 ? "col-span-2" : ""}`}
          >
            <Image
              src={`/api/fotos/${archivo}`}
              alt={`${producto.nombre}, foto ${indice + 1}`}
              fill
              priority={indice === 0}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          {producto.categoria}
          {producto.subcategoria && ` · ${producto.subcategoria}`}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{producto.nombre}</h1>
        <p className="text-2xl font-semibold">{formatearPrecio(producto.precioVentaCentavos)}</p>
        {producto.agotado ? (
          <Badge variant="secondary" className="h-auto w-fit whitespace-normal">
            Agotado, disponible por encargo
          </Badge>
        ) : (
          <p className="text-exito font-medium">{textoDisponible(producto.disponible)}</p>
        )}
        <p className="whitespace-pre-line">{producto.descripcion}</p>
        <LeyendaProducto producto={producto.nombre} />
      </div>
    </article>
  );
}
