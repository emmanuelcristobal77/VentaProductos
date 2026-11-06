import { CatalogoBuscable } from "@/components/cliente/catalogo-buscable";
import { FiltroCategorias } from "@/components/filtro-categorias";
import { TAMANO_CATALOGO } from "@/consultas/busqueda";
import { listarCatalogo } from "@/consultas/publicas";
import { telefonoNegocio } from "@/lib/contacto";
import { listarCategorias } from "@/servicios/categorias";

export const dynamic = "force-dynamic";

export default async function PaginaCatalogo({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; subcategoria?: string }>;
}) {
  const { categoria, subcategoria } = await searchParams;
  // La primera parte se dibuja en el servidor; las búsquedas y «Ver más» van a /api/catalogo.
  const inicial = listarCatalogo({
    categoriaId: categoria,
    subcategoriaId: subcategoria,
    limite: TAMANO_CATALOGO,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Nuestro catálogo</h1>
        <p className="text-muted-foreground mt-1">Juguetes, ropa y otros artículos.</p>
      </div>

      <CatalogoBuscable
        inicial={inicial}
        filtro={{ categoria, subcategoria }}
        tamano={TAMANO_CATALOGO}
        telefono={telefonoNegocio()}
      >
        <FiltroCategorias
          categorias={listarCategorias()}
          rutaBase="/"
          categoriaId={categoria}
          subcategoriaId={subcategoria}
        />
      </CatalogoBuscable>
    </div>
  );
}
