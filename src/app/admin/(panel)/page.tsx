import Link from "next/link";
import { Plus } from "lucide-react";
import { ListaProductosAdmin } from "@/components/admin/lista-productos-admin";
import { FiltroCategorias } from "@/components/filtro-categorias";
import { Button } from "@/components/ui/button";
import { listarProductosAdmin } from "@/consultas/admin";
import { TAMANO_PANEL } from "@/consultas/busqueda";
import { listarCategorias } from "@/servicios/categorias";

export const dynamic = "force-dynamic";

export default async function PaginaProductos({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; subcategoria?: string }>;
}) {
  const { categoria, subcategoria } = await searchParams;
  // La primera parte se dibuja en el servidor; las búsquedas y «Ver más» van a /api/admin/productos.
  const inicial = listarProductosAdmin({
    categoriaId: categoria,
    subcategoriaId: subcategoria,
    limite: TAMANO_PANEL,
  });

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

      <ListaProductosAdmin inicial={inicial} filtro={{ categoria, subcategoria }} tamano={TAMANO_PANEL}>
        <FiltroCategorias
          categorias={listarCategorias()}
          rutaBase="/admin"
          categoriaId={categoria}
          subcategoriaId={subcategoria}
        />
      </ListaProductosAdmin>
    </div>
  );
}
