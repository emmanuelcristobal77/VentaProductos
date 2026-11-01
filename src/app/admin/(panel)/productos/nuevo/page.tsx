import { FormularioProducto } from "@/components/admin/formulario-producto";
import { listarCategorias } from "@/servicios/categorias";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo producto" };

export default function PaginaNuevoProducto() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo producto</h1>
      <FormularioProducto categorias={listarCategorias()} />
    </div>
  );
}
