import { registrarNavegacion } from "@/lib/estado-listas";

/** Avisa a las listas de productos si se navegó con atrás o adelante (spec 002, FR-008a). */
export function onRouterTransitionStart(url: string, navigationType: "push" | "replace" | "traverse") {
  registrarNavegacion(url, navigationType);
}
