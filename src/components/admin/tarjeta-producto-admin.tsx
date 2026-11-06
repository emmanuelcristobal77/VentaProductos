"use client";

import Image from "next/image";
import Link from "next/link";
import { BotonBajaProducto } from "@/components/admin/boton-baja-producto";
import { HojaApartado } from "@/components/admin/hoja-apartado";
import { HojaEncargo } from "@/components/admin/hoja-encargo";
import { HojaVenta } from "@/components/admin/hoja-venta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatearPrecio } from "@/dominio/dinero";
import type { ProductoAdmin } from "@/consultas/admin";

/*
 * Tarjeta de la lista del panel. Es de cliente porque la lista crece en el navegador
 * (spec 002, research 7). La URL de la foto se arma aquí y no con urlFoto de src/lib/fotos.ts,
 * que importa sharp y no puede llegar al navegador.
 */
export function TarjetaProductoAdmin({ producto }: { producto: ProductoAdmin }) {
  return (
    <li className="bg-card flex gap-4 rounded-xl border p-3">
      <div className="bg-muted relative size-24 shrink-0 overflow-hidden rounded-lg">
        {producto.fotos[0] && (
          <Image
            src={`/api/fotos/${producto.fotos[0]}`}
            alt={producto.nombre}
            fill
            sizes="96px"
            className="object-cover"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="truncate font-medium">{producto.nombre}</h2>
          {producto.disponible <= 0 && <Badge variant="secondary">Agotado</Badge>}
        </div>
        <p className="text-muted-foreground text-sm">
          {producto.categoria}
          {producto.subcategoria && ` · ${producto.subcategoria}`}
        </p>
        <dl className="grid grid-cols-2 gap-x-3 text-sm">
          <div>
            <dt className="text-muted-foreground inline">Compra: </dt>
            <dd className="inline">{formatearPrecio(producto.precioCompraCentavos)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground inline">Venta: </dt>
            <dd className="inline">{formatearPrecio(producto.precioVentaCentavos)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground inline">Existencia: </dt>
            <dd className="inline">{producto.existencia}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground inline">Disponible: </dt>
            <dd className="inline">{producto.disponible}</dd>
          </div>
        </dl>
        <div className="mt-1 flex flex-wrap gap-2">
          {producto.disponible > 0 ? (
            <>
              <HojaVenta producto={producto} />
              <HojaApartado producto={producto} />
            </>
          ) : (
            <HojaEncargo
              origen={{
                campo: "productoId",
                id: producto.id,
                nombre: producto.nombre,
                precioCentavos: producto.precioVentaCentavos,
              }}
            />
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/productos/${producto.id}`}>
              Editar<span className="sr-only"> {producto.nombre}</span>
            </Link>
          </Button>
          <BotonBajaProducto id={producto.id} nombre={producto.nombre} />
        </div>
      </div>
    </li>
  );
}
