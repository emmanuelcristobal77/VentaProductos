import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, Megaphone } from "lucide-react";
import { cerrarSesion } from "@/acciones/sesion";
import { NavegacionAdminInferior, NavegacionAdminSuperior } from "@/components/admin/navegacion";
import { Button } from "@/components/ui/button";
import { haySesion } from "@/lib/sesion";

export const metadata = { title: "Administración" };

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  if (!(await haySesion())) redirect("/admin/entrar");

  async function salir() {
    "use server";
    await cerrarSesion();
    redirect("/admin/entrar");
  }

  return (
    <div className="flex min-h-dvh flex-col pb-20 md:pb-0">
      <header className="bg-background/90 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/admin" className="font-semibold tracking-tight">
            Productos Eli&apos;s
            <span className="text-muted-foreground ml-2 hidden text-sm font-normal sm:inline">Administración</span>
          </Link>
          <div className="flex items-center gap-2">
            <NavegacionAdminSuperior />
            {/* Spec 005, research 7: en el celular, «Promoción» va aquí y no en la barra inferior. */}
            <Button asChild variant="ghost" size="sm" className="md:hidden">
              <Link href="/admin/promocion">
                <Megaphone aria-hidden />
                Promoción
              </Link>
            </Button>
            <form action={salir}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut aria-hidden />
                Salir
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-8">{children}</main>
      <NavegacionAdminInferior />
    </div>
  );
}
