import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatearPrecio } from "@/dominio/dinero";
import { LEYENDA_DEVOLUCIONES, textoDisponible } from "./leyenda-producto";
import type { ProductoPublico } from "@/consultas/publicas";

export function TarjetaProducto({
  producto,
  prioritaria = false,
}: {
  producto: ProductoPublico;
  prioritaria?: boolean;
}) {
  return (
    <article className="bg-card flex flex-col overflow-hidden rounded-2xl border shadow-xs transition-shadow hover:shadow-md">
      <Link href={`/producto/${producto.id}`} className="focus-visible:ring-ring outline-none focus-visible:ring-2">
        <div className="bg-muted relative aspect-square">
          {producto.fotos[0] && (
            <Image
              src={`/api/fotos/${producto.fotos[0]}`}
              alt={producto.nombre}
              fill
              priority={prioritaria}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
          )}
        </div>
        <div className="flex flex-col gap-1 p-3">
          <h2 className="line-clamp-2 leading-snug font-medium">{producto.nombre}</h2>
          <p className="text-muted-foreground line-clamp-2 text-sm">{producto.descripcion}</p>
          <p className="text-muted-foreground text-xs">
            {producto.categoria}
            {producto.subcategoria && ` · ${producto.subcategoria}`}
          </p>
          <p className="mt-1 font-semibold">{formatearPrecio(producto.precioVentaCentavos)}</p>
          {producto.agotado ? (
            <Badge variant="secondary" className="h-auto whitespace-normal">
              Agotado, disponible por encargo
            </Badge>
          ) : (
            <p className="text-exito text-sm font-medium">{textoDisponible(producto.disponible)}</p>
          )}
          <p className="text-muted-foreground mt-1 text-xs">{LEYENDA_DEVOLUCIONES}</p>
        </div>
      </Link>
    </article>
  );
}
