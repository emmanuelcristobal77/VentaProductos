import { FormularioPromocion } from "@/components/admin/formulario-promocion";
import { ETIQUETAS_PROMOCION } from "@/dominio/promocion";
import { obtenerSello } from "@/servicios/promocion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promoción" };

export default function PaginaPromocion() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{ETIQUETAS_PROMOCION.titulo}</h1>
      <FormularioPromocion sello={obtenerSello()} />
    </div>
  );
}
