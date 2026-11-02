import { Skeleton } from "@/components/ui/skeleton";

export default function Cargando() {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}
