import { GestorCategorias } from "@/components/admin/gestor-categorias";
import { listarCategorias } from "@/servicios/categorias";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categorías" };

export default function PaginaCategorias() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
      <GestorCategorias categorias={listarCategorias()} />
    </div>
  );
}
