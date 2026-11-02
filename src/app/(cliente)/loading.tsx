import { Skeleton } from "@/components/ui/skeleton";

export default function Cargando() {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4"
    >
      {Array.from({ length: 8 }, (_, indice) => (
        <Skeleton key={indice} className="aspect-square rounded-2xl" />
      ))}
    </div>
  );
}
