import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Productos Eli's", template: "%s | Productos Eli's" },
  description: "Catálogo de juguetes, ropa y otros artículos de Productos Eli's.",
};

export const viewport: Viewport = { themeColor: "#fbf8f3" };

// Solo el subconjunto latino (incluye ñ y acentos): pesa menos de la mitad que la fuente completa.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={geist.variable}>
      <body className="min-h-dvh font-sans">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
