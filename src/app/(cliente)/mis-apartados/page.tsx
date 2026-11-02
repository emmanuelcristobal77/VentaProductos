import { ConsultaApartados } from "@/components/cliente/consulta-apartados";

// El layout lee el teléfono del negocio, que solo existe al ejecutar, no al compilar la imagen.
export const dynamic = "force-dynamic";

export default function PaginaMisApartados() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Mis apartados</h1>
        <p className="text-muted-foreground mt-1">
          Escribe tu nombre y teléfono para ver tus apartados y encargos.
        </p>
      </div>
      <ConsultaApartados />
    </div>
  );
}
