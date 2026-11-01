import { TarjetaProducto } from "@/components/cliente/tarjeta-producto";
import { FiltroCategorias } from "@/components/filtro-categorias";
import { listarCatalogo } from "@/consultas/publicas";
import { listarCategorias } from "@/servicios/categorias";

export const dynamic = "force-dynamic";

export default async function PaginaCatalogo({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; subcategoria?: string }>;
}) {
  const { categoria, subcategoria } = await searchParams;
  const productos = listarCatalogo({ categoriaId: categoria, subcategoriaId: subcategoria });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Nuestro catálogo</h1>
        <p className="text-muted-foreground mt-1">Juguetes, ropa y otros artículos.</p>
      </div>

      <FiltroCategorias
        categorias={listarCategorias()}
        rutaBase="/"
        categoriaId={categoria}
        subcategoriaId={subcategoria}
      />

      {productos.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border p-8 text-center">
          No hay productos en esta categoría por ahora.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {productos.map((producto) => (
            <TarjetaProducto key={producto.id} producto={producto} />
          ))}
        </div>
      )}
    </div>
  );
}
