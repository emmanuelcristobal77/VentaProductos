"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { palabrasDeBusqueda } from "@/dominio/normalizacion";
import type { Resultado } from "./resultado";
import {
  guardarDesplazamiento,
  guardarEstado,
  terminarRegreso,
  tomarEstadoAlRegresar,
  type NombreLista,
} from "./estado-listas";

/*
 * Lógica de navegador de las listas de productos (spec 002): búsqueda mientras se escribe,
 * «Ver más», regreso con atrás y reacción a los cambios que dibuja el servidor.
 */

export interface ParteLista<P> {
  productos: P[];
  siguiente: string | null;
  total: number;
}

export type EstadoCarga = "listo" | "buscando" | "cargandoMas" | "error";

export interface FiltroLista {
  categoria?: string;
  subcategoria?: string;
}

/** Espera desde la última tecla antes de buscar (research 5). */
const ESPERA_MS = 250;
const INTERVALO_DESPLAZAMIENTO_MS = 100;
/** El mismo máximo de contracts/rutas.md. */
const LIMITE_MAXIMO = 200;

const claveDeFiltro = (filtro: FiltroLista) => `${filtro.categoria ?? ""}|${filtro.subcategoria ?? ""}`;
const hayBusqueda = (texto: string) => palabrasDeBusqueda(texto).length > 0;

export const textoEncontrados = (total: number) =>
  total === 1 ? "1 producto encontrado" : `${total} productos encontrados`;
export const textoAgregados = (cantidad: number) =>
  cantidad === 1 ? "Se agregó 1 producto" : `Se agregaron ${cantidad} productos`;

class ErrorCarga extends Error {
  constructor(readonly codigo?: string) {
    super(codigo ?? "SIN_RESPUESTA");
  }
}

async function pedirParte<P>(
  ruta: string,
  parametros: Record<string, string | number | null | undefined>,
  signal: AbortSignal,
): Promise<ParteLista<P>> {
  const busqueda = new URLSearchParams();
  for (const [nombre, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== "") busqueda.set(nombre, String(valor));
  }
  const respuesta = await fetch(`${ruta}?${busqueda}`, { signal, cache: "no-store" });
  let cuerpo: Resultado<ParteLista<P>>;
  try {
    cuerpo = await respuesta.json();
  } catch {
    throw new ErrorCarga();
  }
  if (!cuerpo.ok) throw new ErrorCarga(cuerpo.codigo);
  return cuerpo.datos;
}

/** Una petición desde el principio: una búsqueda o un refresco sin perder el lugar. */
interface Peticion {
  texto: string;
  filtro: FiltroLista;
  limite?: number;
  espera: number;
  anunciar: boolean;
}

interface Datos<P> extends ParteLista<P> {
  /** El texto al que corresponden estos productos; «Ver más» continúa esa misma búsqueda. */
  texto: string;
}

export function useListaPaginada<P extends { id: string }>({
  lista,
  ruta,
  filtro,
  inicial,
  tamano,
}: {
  lista: NombreLista;
  ruta: string;
  filtro: FiltroLista;
  inicial: ParteLista<P>;
  /** Tamaño de la parte de esta lista (20 o 50); sirve para pedir más al refrescar. */
  tamano: number;
}) {
  const clave = claveDeFiltro(filtro);

  // Se inicia de forma síncrona, para que la lista ya esté completa cuando se restaure el desplazamiento.
  const [inicio] = useState(() => {
    const guardado = tomarEstadoAlRegresar<P>(lista, clave);
    if (guardado) return { ...guardado, restaurado: true };
    return { ...inicial, texto: "", desplazamiento: 0, restaurado: false };
  });

  const [texto, setTextoEscrito] = useState(inicio.texto);
  const [datos, setDatos] = useState<Datos<P>>({
    productos: inicio.productos,
    siguiente: inicio.siguiente,
    total: inicio.total,
    texto: inicio.texto,
  });
  const [estado, setEstado] = useState<EstadoCarga>("listo");
  const [anuncio, setAnuncio] = useState("");
  const [peticion, setPeticion] = useState<Peticion | null>(null);
  const [subirAlBuscador, setSubirAlBuscador] = useState(0);
  const [previo, setPrevio] = useState({ inicial, clave });

  const refBuscador = useRef<HTMLDivElement>(null);
  const controladorMas = useRef<AbortController | null>(null);
  const desplazamiento = useRef(inicio.desplazamiento);

  const limiteParaRefrescar = (mostrados: number) =>
    mostrados > tamano ? Math.min(mostrados, LIMITE_MAXIMO) : undefined;

  // El servidor volvió a dibujar la página: cambió el filtro de la URL, o hubo una venta,
  // un apartado, un encargo, una baja o una edición (revalidatePath de la spec 001).
  if (previo.inicial !== inicial || previo.clave !== clave) {
    const cambioFiltro = previo.clave !== clave;
    setPrevio({ inicial, clave });

    if (hayBusqueda(texto)) {
      // FR-004, FR-014: se conserva el texto y se vuelve a pedir desde el principio.
      setPeticion({
        texto,
        filtro,
        espera: 0,
        anunciar: true,
        limite: cambioFiltro ? undefined : limiteParaRefrescar(datos.productos.length),
      });
      setEstado("buscando");
    } else if (!cambioFiltro && datos.productos.length > inicial.productos.length) {
      // Había partes extra con «Ver más»: se piden de nuevo tantas como se mostraban (research 7).
      setPeticion({
        texto: "",
        filtro,
        espera: 0,
        anunciar: false,
        limite: limiteParaRefrescar(datos.productos.length),
      });
    } else {
      setPeticion(null);
      setDatos({ ...inicial, texto: "" });
      setEstado("listo");
    }
    if (cambioFiltro) setSubirAlBuscador((n) => n + 1);
  }

  const setTexto = useCallback(
    (nuevo: string) => {
      setTextoEscrito(nuevo);
      if (hayBusqueda(nuevo)) {
        setPeticion({ texto: nuevo, filtro, espera: ESPERA_MS, anunciar: true });
        setEstado("buscando");
        setAnuncio("Buscando…");
      } else {
        // US1-7: al borrar el texto se vuelve a la lista sin búsqueda.
        controladorMas.current?.abort();
        setPeticion(null);
        setDatos({ ...inicial, texto: "" });
        setEstado("listo");
        setAnuncio("");
      }
    },
    [filtro, inicial],
  );

  // Búsquedas y refrescos desde el principio. Cada petición nueva cancela la anterior,
  // así nunca se muestran resultados de un texto anterior (caso límite "Escritura rápida").
  useEffect(() => {
    if (!peticion) return;
    controladorMas.current?.abort();
    const controlador = new AbortController();
    const temporizador = setTimeout(async () => {
      try {
        const parte = await pedirParte<P>(
          ruta,
          { texto: peticion.texto, ...peticion.filtro, limite: peticion.limite },
          controlador.signal,
        );
        if (controlador.signal.aborted) return;
        setDatos({ ...parte, texto: peticion.texto });
        setEstado("listo");
        if (peticion.anunciar) setAnuncio(textoEncontrados(parte.total));
      } catch {
        if (controlador.signal.aborted) return;
        setEstado("error");
        setAnuncio("");
      }
    }, peticion.espera);
    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [peticion, ruta]);

  const verMas = useCallback(async () => {
    if (!datos.siguiente || estado === "cargandoMas" || estado === "buscando") return;
    const controlador = new AbortController();
    controladorMas.current = controlador;
    setEstado("cargandoMas");
    try {
      const parte = await pedirParte<P>(
        ruta,
        { texto: datos.texto, ...filtro, cursor: datos.siguiente },
        controlador.signal,
      );
      if (controlador.signal.aborted) return;
      const ids = new Set(datos.productos.map((p) => p.id));
      const nuevos = parte.productos.filter((p) => !ids.has(p.id));
      setDatos({
        productos: [...datos.productos, ...nuevos],
        siguiente: parte.siguiente,
        total: parte.total,
        texto: datos.texto,
      });
      setEstado("listo");
      setAnuncio(textoAgregados(nuevos.length));
    } catch (error) {
      if (controlador.signal.aborted) return;
      if (error instanceof ErrorCarga && error.codigo === "CURSOR_INVALIDO") {
        // research 3: con un cursor no válido la lista vuelve a empezar.
        setPeticion({ texto: datos.texto, filtro, espera: 0, anunciar: false });
        return;
      }
      // FR-015: se conservan los productos y el mismo botón permite intentarlo de nuevo.
      setEstado("error");
    }
  }, [datos, estado, filtro, ruta]);

  // Guarda el estado para el regreso con atrás (FR-008a).
  useEffect(() => {
    guardarEstado(lista, {
      texto: datos.texto,
      filtro: clave,
      productos: datos.productos,
      siguiente: datos.siguiente,
      total: datos.total,
      desplazamiento: desplazamiento.current,
    });
  }, [lista, clave, datos]);

  // Guarda el desplazamiento, uno cada 100 ms. Es un efecto de diseño para que su limpieza
  // corra antes de que Next.js suba la página nueva al navegar.
  useLayoutEffect(() => {
    let pendiente: ReturnType<typeof setTimeout> | null = null;
    const alDesplazar = () => {
      desplazamiento.current = window.scrollY;
      if (pendiente) return;
      pendiente = setTimeout(() => {
        pendiente = null;
        guardarDesplazamiento(lista, desplazamiento.current);
      }, INTERVALO_DESPLAZAMIENTO_MS);
    };
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => {
      window.removeEventListener("scroll", alDesplazar);
      if (pendiente) clearTimeout(pendiente);
      guardarDesplazamiento(lista, desplazamiento.current);
    };
  }, [lista]);

  // Al regresar con atrás, vuelve al mismo lugar de la lista.
  useLayoutEffect(() => {
    if (inicio.restaurado) window.scrollTo(0, inicio.desplazamiento);
    terminarRegreso();
  }, [inicio]);

  // Al cambiar el filtro, si el buscador quedó fuera de la vista, la página sube hasta él (FR-014).
  // Mientras se escribe la página no se mueve.
  useLayoutEffect(() => {
    if (subirAlBuscador === 0) return;
    terminarRegreso();
    const buscador = refBuscador.current;
    if (buscador && buscador.getBoundingClientRect().top < 0) buscador.scrollIntoView({ block: "start" });
  }, [subirAlBuscador]);

  // Al desmontar se cancela cualquier «Ver más» pendiente.
  useEffect(() => () => controladorMas.current?.abort(), []);

  return {
    texto,
    setTexto,
    /** El texto al que corresponden los productos mostrados. */
    textoBuscado: datos.texto,
    productos: datos.productos,
    siguiente: datos.siguiente,
    total: datos.total,
    estado,
    anuncio,
    verMas,
    refBuscador,
  };
}
