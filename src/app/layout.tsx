import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Productos Eli's", template: "%s | Productos Eli's" },
  description: "Catálogo de juguetes, ropa y otros artículos de Productos Eli's.",
};

export const viewport: Viewport = { themeColor: "#fbf8f3" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={GeistSans.variable}>
      <body className="min-h-dvh font-sans">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
