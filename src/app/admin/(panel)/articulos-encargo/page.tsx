import Link from "next/link";
import { darDeBajaArticuloEncargo } from "@/acciones/articulos-encargo";
import { BotonConfirmar } from "@/components/admin/boton-confirmar";
import { FormularioArticulo } from "@/components/admin/formulario-articulo";
import { HojaEncargo } from "@/components/admin/hoja-encargo";
import { Button } from "@/components/ui/button";
import { listarArticulosAdmin } from "@/consultas/admin";
import { formatearPrecio } from "@/dominio/dinero";

export const dynamic = "force-dynamic";

export default async function PaginaArticulos({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string }>;
}) {
  const { editar } = await searchParams;
  const articulos = listarArticulosAdmin();
  const enEdicion = articulos.find((articulo) => articulo.id === editar);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Artículos por encargo</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <FormularioArticulo key={enEdicion?.id ?? "nuevo"} articulo={enEdicion} />

        {articulos.length === 0 ? (
          <p className="text-muted-foreground bg-card rounded-xl border p-8 text-center">
            Todavía no hay artículos por encargo.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {articulos.map((articulo) => (
              <li key={articulo.id} className="bg-card flex flex-col gap-2 rounded-xl border p-3">
                <div>
                  <h2 className="font-medium">{articulo.nombre}</h2>
                  <p className="text-muted-foreground text-sm">{articulo.descripcion}</p>
                  <p className="font-semibold">{formatearPrecio(articulo.precioCentavos)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <HojaEncargo
                    origen={{
                      campo: "articuloEncargoId",
                      id: articulo.id,
                      nombre: articulo.nombre,
                      precioCentavos: articulo.precioCentavos,
                    }}
                  />
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/articulos-encargo?editar=${articulo.id}`}>
                      Editar<span className="sr-only"> {articulo.nombre}</span>
                    </Link>
                  </Button>
                  <BotonConfirmar
                    etiqueta={
                      <>
                        Dar de baja<span className="sr-only"> {articulo.nombre}</span>
                      </>
                    }
                    titulo="Dar de baja artículo"
                    descripcion={`${articulo.nombre} dejará de mostrarse a los clientes.`}
                    accion={darDeBajaArticuloEncargo.bind(null, articulo.id)}
                    exito="Artículo dado de baja."
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
