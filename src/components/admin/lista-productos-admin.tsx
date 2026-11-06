"use client";

import { BotonVerMas } from "@/components/boton-ver-mas";
import { BuscadorProductos } from "@/components/buscador-productos";
import { useListaPaginada, type FiltroLista, type ParteLista } from "@/lib/usar-lista-paginada";
import { TarjetaProductoAdmin } from "./tarjeta-producto-admin";
import type { ProductoAdmin } from "@/consultas/admin";

/** Lista de productos del panel con buscador y «Ver más» (spec 002). */
export function ListaProductosAdmin({
  inicial,
  filtro,
  tamano,
  children,
}: {
  inicial: ParteLista<ProductoAdmin>;
  filtro: FiltroLista;
  tamano: number;
  /** Los filtros de categoría, que van debajo del buscador (FR-001). */
  children: React.ReactNode;
}) {
  const { refBuscador, ...lista } = useListaPaginada({ lista: "panel", ruta: "/api/admin/productos", filtro, inicial, tamano });

  return (
    <>
      <BuscadorProductos texto={lista.texto} alCambiar={lista.setTexto} anuncio={lista.anuncio} ref={refBuscador} />

      {children}

      {lista.productos.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border p-8 text-center">
          {lista.textoBuscado
            ? `No hay productos que coincidan con «${lista.textoBuscado.trim()}».`
            : "No hay productos en esta selección."}
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {lista.productos.map((producto) => (
            <TarjetaProductoAdmin key={producto.id} producto={producto} />
          ))}
        </ul>
      )}

      <BotonVerMas siguiente={lista.siguiente} estado={lista.estado} alPulsar={lista.verMas} />
    </>
  );
}
