import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NoEncontrado() {
  return (
    <div className="bg-card flex flex-col items-center gap-4 rounded-xl border p-8 text-center">
      <h1 className="text-xl font-semibold">No encontramos este registro</h1>
      <Button asChild className="h-11">
        <Link href="/admin">Ir a productos</Link>
      </Button>
    </div>
  );
}
