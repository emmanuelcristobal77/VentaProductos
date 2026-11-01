import { notFound } from "next/navigation";
import { FormularioProducto } from "@/components/admin/formulario-producto";
import { obtenerProductoAdmin } from "@/consultas/admin";
import { precioParaCaptura } from "@/dominio/dinero";
import { listarCategorias } from "@/servicios/categorias";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar producto" };

export default async function PaginaEditarProducto({ params }: { params: Promise<{ id: string }> }) {
  const producto = obtenerProductoAdmin((await params).id);
  if (!producto) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Editar producto</h1>
      <FormularioProducto
        categorias={listarCategorias()}
        producto={producto}
        valores={{
          precioCompra: precioParaCaptura(producto.precioCompraCentavos),
          precioVenta: precioParaCaptura(producto.precioVentaCentavos),
        }}
      />
    </div>
  );
}
