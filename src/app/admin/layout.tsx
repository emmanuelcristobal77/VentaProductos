import { Toaster } from "sonner";

// Los avisos solo se usan en la administración; así el catálogo no descarga la librería.
export default function LayoutAdminRaiz({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-center" />
    </>
  );
}
