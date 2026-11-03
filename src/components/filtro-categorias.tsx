import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CategoriaConSubcategorias } from "@/servicios/categorias";

function Opcion({ href, activa, children }: { href: string; activa: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={activa ? "true" : undefined}
      className={cn(
        "focus-visible:ring-ring inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-2",
        activa
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-primary/40 text-primary hover:bg-accent shadow-xs",
      )}
    >
      {children}
    </Link>
  );
}

export function FiltroCategorias({
  categorias,
  rutaBase,
  categoriaId,
  subcategoriaId,
}: {
  categorias: CategoriaConSubcategorias[];
  rutaBase: string;
  categoriaId?: string;
  subcategoriaId?: string;
}) {
  const seleccionada = categorias.find((c) => c.id === categoriaId);

  return (
    <nav aria-label="Filtrar por categoría" className="flex flex-col gap-2">
      {/* En la prueba con personas (SC-009), una no notó los botones sin un texto que los anunciara. */}
      <p className="text-sm font-medium">Elige una categoría</p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Opcion href={rutaBase} activa={!seleccionada}>
          Todos los productos
        </Opcion>
        {categorias.map((categoria) => (
          <Opcion
            key={categoria.id}
            href={`${rutaBase}?categoria=${categoria.id}`}
            activa={categoria.id === categoriaId}
          >
            {categoria.nombre}
          </Opcion>
        ))}
      </div>
      {seleccionada && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Opcion href={`${rutaBase}?categoria=${seleccionada.id}`} activa={!subcategoriaId}>
            Todos
          </Opcion>
          {seleccionada.subcategorias.map((sub) => (
            <Opcion
              key={sub.id}
              href={`${rutaBase}?categoria=${seleccionada.id}&subcategoria=${sub.id}`}
              activa={sub.id === subcategoriaId}
            >
              {sub.nombre}
            </Opcion>
          ))}
        </div>
      )}
    </nav>
  );
}
