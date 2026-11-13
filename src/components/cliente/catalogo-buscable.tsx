"use client";

import Link from "next/link";
import { BotonVerMas } from "@/components/boton-ver-mas";
import { BuscadorProductos } from "@/components/buscador-productos";
import { useListaPaginada, type FiltroLista, type ParteLista } from "@/lib/usar-lista-paginada";
import { EnlaceTelefono } from "./enlace-telefono";
import { TarjetaProducto } from "./tarjeta-producto";
import type { ProductoPublico } from "@/consultas/publicas";

/** Tarjetas visibles sin desplazarse en un móvil: sus fotos se cargan primero. */
const PRIMERA_VISTA = 4;

/** Lista del catálogo con buscador y «Ver más» (spec 002). */
export function CatalogoBuscable({
  inicial,
  filtro,
  tamano,
  telefono,
  children,
}: {
  inicial: ParteLista<ProductoPublico>;
  filtro: FiltroLista;
  tamano: number;
  telefono: { enlace: string; texto: string };
  /** Los filtros de categoría, que van debajo del buscador (FR-001). */
  children: React.ReactNode;
}) {
  const { refBuscador, ...lista } = useListaPaginada({ lista: "catalogo", ruta: "/api/catalogo", filtro, inicial, tamano });

  return (
    <>
      <BuscadorProductos texto={lista.texto} alCambiar={lista.setTexto} anuncio={lista.anuncio} ref={refBuscador} />

      {children}

      {lista.productos.length === 0 ? (
        lista.textoBuscado ? (
          // FR-005: sin coincidencias, se invita a ver los artículos por encargo o a llamar.
          <p className="text-muted-foreground bg-card rounded-xl border p-8 text-center">
            No encontramos productos con «{lista.textoBuscado.trim()}». Revisa los{" "}
            <Link href="/encargos" className="text-primary font-medium underline underline-offset-4">
              artículos por encargo
            </Link>{" "}
            o llámanos al{" "}
            <EnlaceTelefono
              enlace={telefono.enlace}
              className="text-primary font-medium whitespace-nowrap underline underline-offset-4"
            >
              {telefono.texto}
            </EnlaceTelefono>
            .
          </p>
        ) : (
          <p className="text-muted-foreground bg-card rounded-xl border p-8 text-center">
            No hay productos en esta categoría por ahora.
          </p>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {lista.productos.map((producto, indice) => (
            <TarjetaProducto key={producto.id} producto={producto} prioritaria={indice < PRIMERA_VISTA} />
          ))}
        </div>
      )}

      <BotonVerMas siguiente={lista.siguiente} estado={lista.estado} alPulsar={lista.verMas} />
    </>
  );
}
