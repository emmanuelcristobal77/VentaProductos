import Image from "next/image";
import { LeyendaProducto } from "@/components/cliente/leyenda-producto";
import { listarArticulosEncargo } from "@/consultas/publicas";
import { formatearPrecio } from "@/dominio/dinero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Por encargo" };

export default function PaginaEncargos() {
  const articulos = listarArticulosEncargo();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Artículos por encargo</h1>
        <p className="text-muted-foreground mt-1">
          Estos artículos no están en existencia: se piden especialmente para ti.
        </p>
      </div>

      {articulos.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border p-8 text-center">
          Por ahora no hay artículos por encargo.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {articulos.map((articulo) => (
            <li key={articulo.id} className="bg-card flex flex-col gap-3 rounded-2xl border p-4">
              {articulo.fotos[0] && (
                <div className="bg-muted relative aspect-video overflow-hidden rounded-xl">
                  <Image
                    src={`/api/fotos/${articulo.fotos[0]}`}
                    alt={articulo.nombre}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
              )}
              <h2 className="text-lg font-medium">{articulo.nombre}</h2>
              <p className="text-muted-foreground text-sm whitespace-pre-line">{articulo.descripcion}</p>
              <p className="font-semibold">{formatearPrecio(articulo.precioCentavos)}</p>
              <LeyendaProducto producto={articulo.nombre} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
