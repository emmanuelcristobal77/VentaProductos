import { FormularioEntrar } from "@/components/admin/formulario-entrar";

export const metadata = { title: "Entrar" };

export default function PaginaEntrar() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="bg-card w-full max-w-sm rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Productos Eli&apos;s</h1>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">Entra para administrar tu catálogo.</p>
        <FormularioEntrar />
      </div>
    </main>
  );
}
