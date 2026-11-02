import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { BotonBajaProducto } from "@/components/admin/boton-baja-producto";
import { HojaApartado } from "@/components/admin/hoja-apartado";
import { HojaEncargo } from "@/components/admin/hoja-encargo";
import { HojaVenta } from "@/components/admin/hoja-venta";
import { FiltroCategorias } from "@/components/filtro-categorias";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listarProductosAdmin } from "@/consultas/admin";
import { formatearPrecio } from "@/dominio/dinero";
import { urlFoto } from "@/lib/fotos";
import { listarCategorias } from "@/servicios/categorias";

export const dynamic = "force-dynamic";

export default async function PaginaProductos({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; subcategoria?: string }>;
}) {
  const { categoria, subcategoria } = await searchParams;
  const productos = listarProductosAdmin({ categoriaId: categoria, subcategoriaId: subcategoria });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
        <Button asChild className="h-11">
          <Link href="/admin/productos/nuevo">
            <Plus aria-hidden />
            Nuevo producto
          </Link>
        </Button>
      </div>

      <FiltroCategorias
        categorias={listarCategorias()}
        rutaBase="/admin"
        categoriaId={categoria}
        subcategoriaId={subcategoria}
      />

      {productos.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border p-8 text-center">
          No hay productos en esta selección.
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {productos.map((producto) => (
            <li key={producto.id} className="bg-card flex gap-4 rounded-xl border p-3">
              <div className="bg-muted relative size-24 shrink-0 overflow-hidden rounded-lg">
                {producto.fotos[0] && (
                  <Image
                    src={urlFoto(producto.fotos[0])}
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
          ))}
        </ul>
      )}
    </div>
  );
}
