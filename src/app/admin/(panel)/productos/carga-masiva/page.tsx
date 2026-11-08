import { CargaMasiva } from "@/components/admin/carga-masiva";

export const metadata = { title: "Carga masiva" };

export default function PaginaCargaMasiva() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Carga masiva de productos</h1>
      <CargaMasiva />
    </div>
  );
}
